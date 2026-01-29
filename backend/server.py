from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import asyncio
import jwt
import bcrypt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'chess_club_secret_key_2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24
MEMBER_JWT_EXPIRATION_HOURS = 168  # 7 days for members

# Chess.com API
CHESS_COM_API = "https://api.chess.com/pub"

# Rate limiting storage (in production, use Redis)
rate_limit_storage: Dict[str, List[datetime]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 30  # requests per window
LOGIN_RATE_LIMIT = 5  # login attempts per window

# Cache for Chess.com API responses (in production, use Redis)
chess_com_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes cache

# Create the main app
app = FastAPI(title="Chittagong University EChess Society API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= MODELS =============

class AdminCreate(BaseModel):
    username: str
    password: str
    email: EmailStr
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if len(v) < 3 or len(v) > 30:
            raise ValueError('Username must be 3-30 characters')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        return v.lower()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class AdminLogin(BaseModel):
    username: str
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class Admin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Member Authentication Models
class MemberRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    chess_com_username: str
    department: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        return v.strip()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v
    
    @field_validator('chess_com_username')
    @classmethod
    def validate_chess_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Invalid Chess.com username format')
        return v.lower()

class MemberLogin(BaseModel):
    email: EmailStr
    password: str

class MemberCreate(BaseModel):
    name: str
    department: str
    chess_com_username: str
    email: EmailStr
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    favorite_opening: Optional[str] = None
    playing_style: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        # Basic sanitization
        return re.sub(r'[<>"\';]', '', v.strip())
    
    @field_validator('chess_com_username')
    @classmethod
    def validate_chess_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Invalid Chess.com username format')
        return v.lower()

class MemberUpdate(BaseModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    favorite_opening: Optional[str] = None
    playing_style: Optional[str] = None
    phone: Optional[str] = None

class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    department: str
    chess_com_username: str
    email: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    favorite_opening: Optional[str] = None
    playing_style: Optional[str] = None
    rapid_rating: Optional[int] = None
    blitz_rating: Optional[int] = None
    bullet_rating: Optional[int] = None
    wins: int = 0
    losses: int = 0
    draws: int = 0
    has_account: bool = False  # True if member has login credentials
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MatchCreate(BaseModel):
    player1_id: str
    player2_id: str
    result: str  # "1-0", "0-1", "1/2-1/2"
    date: datetime
    tournament_name: Optional[str] = None
    time_control: str = "rapid"  # rapid, blitz, bullet
    
    @field_validator('result')
    @classmethod
    def validate_result(cls, v):
        if v not in ["1-0", "0-1", "1/2-1/2"]:
            raise ValueError('Result must be "1-0", "0-1", or "1/2-1/2"')
        return v

class Match(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player1_id: str
    player1_name: Optional[str] = None
    player2_id: str
    player2_name: Optional[str] = None
    result: str
    date: datetime
    tournament_name: Optional[str] = None
    time_control: str = "rapid"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TournamentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    status: str = "upcoming"  # upcoming, ongoing, completed
    participants: List[str] = []
    format: str = "swiss"  # swiss, knockout, round_robin
    rounds: int = 5
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v not in ["upcoming", "ongoing", "completed"]:
            raise ValueError('Status must be "upcoming", "ongoing", or "completed"')
        return v

class Tournament(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    status: str = "upcoming"
    participants: List[str] = []
    format: str = "swiss"
    rounds: int = 5
    bracket: Optional[Dict] = None  # Tournament bracket data
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NewsCreate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if len(v.strip()) < 3:
            raise ValueError('Title must be at least 3 characters')
        return v.strip()

class News(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: datetime
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    event_type: str = "general"  # tournament, meetup, workshop, general

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    date: datetime
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    event_type: str = "general"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GalleryImage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    caption: Optional[str] = None
    event_id: Optional[str] = None
    event_name: Optional[str] = None
    uploaded_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    admin_username: str
    action: str  # create, update, delete
    resource_type: str  # member, tournament, match, news, event, gallery
    resource_id: str
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============= RATE LIMITING =============

def check_rate_limit(identifier: str, max_requests: int = RATE_LIMIT_MAX_REQUESTS) -> bool:
    """Check if request should be rate limited"""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    
    # Clean old entries
    rate_limit_storage[identifier] = [
        ts for ts in rate_limit_storage[identifier] 
        if ts > window_start
    ]
    
    # Check limit
    if len(rate_limit_storage[identifier]) >= max_requests:
        return False
    
    # Record request
    rate_limit_storage[identifier].append(now)
    return True

async def get_client_ip(request: Request) -> str:
    """Get client IP from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, username: str, role: str = "admin", hours: int = JWT_EXPIRATION_HOURS) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=hours)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify that token belongs to an admin"""
    payload = await verify_token(credentials)
    if payload.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload

async def verify_member_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify that token belongs to a member (or admin)"""
    payload = await verify_token(credentials)
    return payload

async def optional_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Optional token verification - returns None if no token"""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except:
        return None

# ============= AUDIT LOGGING =============

async def log_admin_action(admin_id: str, admin_username: str, action: str, 
                          resource_type: str, resource_id: str, details: str = None):
    """Log admin actions for audit trail"""
    log = AuditLog(
        admin_id=admin_id,
        admin_username=admin_username,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details
    )
    doc = log.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.audit_logs.insert_one(doc)
    logger.info(f"AUDIT: {admin_username} {action} {resource_type} {resource_id}")

# ============= CHESS.COM API WITH CACHING =============

async def fetch_chess_com_stats(username: str, use_cache: bool = True) -> Dict:
    """Fetch player stats from Chess.com API with caching"""
    cache_key = f"stats_{username.lower()}"
    
    # Check cache
    if use_cache and cache_key in chess_com_cache:
        cached = chess_com_cache[cache_key]
        if datetime.now(timezone.utc) - cached['timestamp'] < timedelta(seconds=CACHE_TTL_SECONDS):
            return cached['data']
    
    async with httpx.AsyncClient(timeout=15.0) as http_client:
        try:
            headers = {"User-Agent": "ChittagongUniversityEChessSociety/2.0"}
            response = await http_client.get(f"{CHESS_COM_API}/player/{username}/stats", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                chess_com_cache[cache_key] = {
                    'data': data,
                    'timestamp': datetime.now(timezone.utc)
                }
                return data
            elif response.status_code == 404:
                return {"error": "Player not found on Chess.com", "status": 404}
            elif response.status_code == 429:
                return {"error": "Chess.com rate limit exceeded. Please try again later.", "status": 429}
            else:
                return {"error": f"Chess.com API error (status {response.status_code})", "status": response.status_code}
        except httpx.TimeoutException:
            return {"error": "Chess.com API timeout. Please try again.", "status": 408}
        except Exception as e:
            logger.error(f"Chess.com API error for {username}: {e}")
            return {"error": f"Failed to fetch Chess.com data: {str(e)}", "status": 500}

async def fetch_chess_com_profile(username: str, use_cache: bool = True) -> Dict:
    """Fetch player profile from Chess.com API with caching"""
    cache_key = f"profile_{username.lower()}"
    
    # Check cache
    if use_cache and cache_key in chess_com_cache:
        cached = chess_com_cache[cache_key]
        if datetime.now(timezone.utc) - cached['timestamp'] < timedelta(seconds=CACHE_TTL_SECONDS):
            return cached['data']
    
    async with httpx.AsyncClient(timeout=15.0) as http_client:
        try:
            headers = {"User-Agent": "ChittagongUniversityEChessSociety/2.0"}
            response = await http_client.get(f"{CHESS_COM_API}/player/{username}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                chess_com_cache[cache_key] = {
                    'data': data,
                    'timestamp': datetime.now(timezone.utc)
                }
                return data
            elif response.status_code == 404:
                return {"error": "Player not found on Chess.com", "status": 404}
            else:
                return {"error": f"Chess.com API error (status {response.status_code})", "status": response.status_code}
        except httpx.TimeoutException:
            return {"error": "Chess.com API timeout. Please try again.", "status": 408}
        except Exception as e:
            logger.error(f"Chess.com profile API error for {username}: {e}")
            return {"error": f"Failed to fetch Chess.com profile: {str(e)}", "status": 500}

async def fetch_chess_com_games(username: str, year: int = None, month: int = None) -> Dict:
    """Fetch recent games from Chess.com API"""
    if not year:
        now = datetime.now(timezone.utc)
        year = now.year
        month = now.month
    
    cache_key = f"games_{username.lower()}_{year}_{month}"
    
    if cache_key in chess_com_cache:
        cached = chess_com_cache[cache_key]
        if datetime.now(timezone.utc) - cached['timestamp'] < timedelta(seconds=CACHE_TTL_SECONDS):
            return cached['data']
    
    async with httpx.AsyncClient(timeout=15.0) as http_client:
        try:
            headers = {"User-Agent": "ChittagongUniversityEChessSociety/2.0"}
            url = f"{CHESS_COM_API}/player/{username}/games/{year}/{month:02d}"
            response = await http_client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                chess_com_cache[cache_key] = {
                    'data': data,
                    'timestamp': datetime.now(timezone.utc)
                }
                return data
            else:
                return {"error": f"Failed to fetch games (status {response.status_code})", "games": []}
        except Exception as e:
            logger.error(f"Chess.com games API error for {username}: {e}")
            return {"error": str(e), "games": []}

async def verify_chess_com_username(username: str) -> bool:
    """Verify that a Chess.com username exists"""
    profile = await fetch_chess_com_profile(username, use_cache=False)
    return "error" not in profile

# ============= HELPER FUNCTIONS =============

def parse_datetime(dt):
    """Parse datetime from string if needed"""
    if isinstance(dt, str):
        return datetime.fromisoformat(dt.replace('Z', '+00:00'))
    return dt

def serialize_datetime(dt):
    """Serialize datetime to ISO string"""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

# ============= PUBLIC ROUTES =============

@api_router.get("/")
async def root():
    return {
        "message": "Chittagong University EChess Society API", 
        "version": "2.0.0",
        "features": ["caching", "rate-limiting", "member-auth", "audit-logs"]
    }

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Members - Public Read with Search/Filter/Pagination
@api_router.get("/members")
async def get_members(
    request: Request,
    search: Optional[str] = None,
    department: Optional[str] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    limit: int = 20
):
    # Rate limiting
    client_ip = await get_client_ip(request)
    if not check_rate_limit(f"members_{client_ip}"):
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    
    # Build query
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"chess_com_username": {"$regex": search, "$options": "i"}},
            {"department": {"$regex": search, "$options": "i"}}
        ]
    if department:
        query["department"] = {"$regex": department, "$options": "i"}
    
    # Count total
    total = await db.members.count_documents(query)
    
    # Sort direction
    sort_dir = 1 if sort_order == "asc" else -1
    
    # Fetch with pagination
    skip = (page - 1) * limit
    members = await db.members.find(query, {"_id": 0, "password_hash": 0}).sort(sort_by, sort_dir).skip(skip).limit(limit).to_list(limit)
    
    # Parse dates
    for m in members:
        m['created_at'] = parse_datetime(m.get('created_at'))
        m['updated_at'] = parse_datetime(m.get('updated_at'))
    
    return {
        "members": members,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/members/{member_id}")
async def get_member(member_id: str, request: Request):
    client_ip = await get_client_ip(request)
    if not check_rate_limit(f"member_{client_ip}"):
        raise HTTPException(status_code=429, detail="Too many requests")
    
    member = await db.members.find_one({"id": member_id}, {"_id": 0, "password_hash": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    member['created_at'] = parse_datetime(member.get('created_at'))
    member['updated_at'] = parse_datetime(member.get('updated_at'))
    
    # Fetch match history for this member
    matches = await db.matches.find({
        "$or": [{"player1_id": member_id}, {"player2_id": member_id}]
    }, {"_id": 0}).sort("date", -1).limit(20).to_list(20)
    
    for m in matches:
        m['date'] = parse_datetime(m.get('date'))
        m['created_at'] = parse_datetime(m.get('created_at'))
    
    member['recent_matches'] = matches
    
    return member

# Leaderboard with caching
@api_router.get("/leaderboard")
async def get_leaderboard(
    request: Request,
    time_control: str = "rapid",
    limit: int = 50
):
    client_ip = await get_client_ip(request)
    if not check_rate_limit(f"leaderboard_{client_ip}"):
        raise HTTPException(status_code=429, detail="Too many requests")
    
    members = await db.members.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    # Sort by rating
    rating_key = f"{time_control}_rating"
    ranked = [m for m in members if m.get(rating_key)]
    ranked.sort(key=lambda x: x.get(rating_key, 0), reverse=True)
    
    # Add rank and limit
    for i, m in enumerate(ranked[:limit], 1):
        m['rank'] = i
    
    return {
        "leaderboard": ranked[:limit], 
        "time_control": time_control,
        "total_ranked": len(ranked)
    }

# Chess.com stats proxy with caching
@api_router.get("/chess-com/{username}")
async def get_chess_com_stats_route(username: str, request: Request):
    client_ip = await get_client_ip(request)
    if not check_rate_limit(f"chesscom_{client_ip}", max_requests=10):
        raise HTTPException(status_code=429, detail="Too many Chess.com API requests. Please wait.")
    
    stats = await fetch_chess_com_stats(username)
    profile = await fetch_chess_com_profile(username)
    
    # Check for errors
    if "error" in stats and "error" in profile:
        raise HTTPException(
            status_code=stats.get("status", 500), 
            detail=stats.get("error", "Failed to fetch Chess.com data")
        )
    
    return {
        "stats": stats if "error" not in stats else None,
        "profile": profile if "error" not in profile else None,
        "cached": True  # Indicate this might be cached data
    }

@api_router.get("/chess-com/{username}/games")
async def get_chess_com_games_route(
    username: str, 
    request: Request,
    year: Optional[int] = None,
    month: Optional[int] = None
):
    client_ip = await get_client_ip(request)
    if not check_rate_limit(f"chesscom_games_{client_ip}", max_requests=5):
        raise HTTPException(status_code=429, detail="Too many requests")
    
    games = await fetch_chess_com_games(username, year, month)
    return games

# Tournaments - Public Read
@api_router.get("/tournaments")
async def get_tournaments(
    request: Request,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    query = {}
    if status:
        query["status"] = status
    
    total = await db.tournaments.count_documents(query)
    skip = (page - 1) * limit
    
    tournaments = await db.tournaments.find(query, {"_id": 0}).sort("start_date", -1).skip(skip).limit(limit).to_list(limit)
    
    for t in tournaments:
        t['start_date'] = parse_datetime(t.get('start_date'))
        t['end_date'] = parse_datetime(t.get('end_date'))
        t['created_at'] = parse_datetime(t.get('created_at'))
    
    return {
        "tournaments": tournaments,
        "total": total,
        "page": page,
        "limit": limit
    }

@api_router.get("/tournaments/{tournament_id}")
async def get_tournament(tournament_id: str):
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    tournament['start_date'] = parse_datetime(tournament.get('start_date'))
    tournament['end_date'] = parse_datetime(tournament.get('end_date'))
    tournament['created_at'] = parse_datetime(tournament.get('created_at'))
    
    # Get participant details
    if tournament.get('participants'):
        participants = await db.members.find(
            {"id": {"$in": tournament['participants']}}, 
            {"_id": 0, "password_hash": 0}
        ).to_list(100)
        tournament['participant_details'] = participants
    
    # Get tournament matches
    matches = await db.matches.find(
        {"tournament_name": tournament['name']}, 
        {"_id": 0}
    ).sort("date", 1).to_list(500)
    
    for m in matches:
        m['date'] = parse_datetime(m.get('date'))
    
    tournament['matches'] = matches
    
    return tournament

# Matches - Public Read
@api_router.get("/matches")
async def get_matches(
    request: Request,
    tournament: Optional[str] = None,
    player_id: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    query = {}
    if tournament:
        query["tournament_name"] = tournament
    if player_id:
        query["$or"] = [{"player1_id": player_id}, {"player2_id": player_id}]
    
    total = await db.matches.count_documents(query)
    skip = (page - 1) * limit
    
    matches = await db.matches.find(query, {"_id": 0}).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    
    for m in matches:
        m['date'] = parse_datetime(m.get('date'))
        m['created_at'] = parse_datetime(m.get('created_at'))
    
    return {
        "matches": matches,
        "total": total,
        "page": page,
        "limit": limit
    }

# News - Public Read
@api_router.get("/news")
async def get_news(page: int = 1, limit: int = 10):
    total = await db.news.count_documents({})
    skip = (page - 1) * limit
    
    news = await db.news.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for n in news:
        n['created_at'] = parse_datetime(n.get('created_at'))
    
    return {
        "news": news,
        "total": total,
        "page": page,
        "limit": limit
    }

@api_router.get("/news/{news_id}")
async def get_news_item(news_id: str):
    news = await db.news.find_one({"id": news_id}, {"_id": 0})
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    news['created_at'] = parse_datetime(news.get('created_at'))
    return news

# Events - Public Read
@api_router.get("/events")
async def get_events(
    upcoming_only: bool = False,
    page: int = 1,
    limit: int = 20
):
    query = {}
    if upcoming_only:
        query["date"] = {"$gte": datetime.now(timezone.utc).isoformat()}
    
    total = await db.events.count_documents(query)
    skip = (page - 1) * limit
    
    events = await db.events.find(query, {"_id": 0}).sort("date", 1).skip(skip).limit(limit).to_list(limit)
    
    for e in events:
        e['date'] = parse_datetime(e.get('date'))
        e['end_date'] = parse_datetime(e.get('end_date'))
        e['created_at'] = parse_datetime(e.get('created_at'))
    
    return {
        "events": events,
        "total": total,
        "page": page,
        "limit": limit
    }

@api_router.get("/events/calendar")
async def get_events_calendar(year: int, month: int):
    """Get events for calendar view"""
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    
    events = await db.events.find({
        "date": {
            "$gte": start_date.isoformat(),
            "$lt": end_date.isoformat()
        }
    }, {"_id": 0}).sort("date", 1).to_list(100)
    
    # Also get tournaments in this period
    tournaments = await db.tournaments.find({
        "start_date": {
            "$gte": start_date.isoformat(),
            "$lt": end_date.isoformat()
        }
    }, {"_id": 0}).to_list(100)
    
    # Combine into calendar items
    calendar_items = []
    for e in events:
        calendar_items.append({
            "id": e['id'],
            "title": e['title'],
            "date": parse_datetime(e['date']),
            "type": e.get('event_type', 'event'),
            "category": "event"
        })
    
    for t in tournaments:
        calendar_items.append({
            "id": t['id'],
            "title": t['name'],
            "date": parse_datetime(t['start_date']),
            "type": "tournament",
            "category": "tournament",
            "status": t.get('status')
        })
    
    calendar_items.sort(key=lambda x: x['date'])
    
    return {
        "year": year,
        "month": month,
        "items": calendar_items
    }

# Gallery - Public Read
@api_router.get("/gallery")
async def get_gallery(
    event_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    query = {}
    if event_id:
        query["event_id"] = event_id
    
    total = await db.gallery.count_documents(query)
    skip = (page - 1) * limit
    
    images = await db.gallery.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for img in images:
        img['created_at'] = parse_datetime(img.get('created_at'))
    
    return {
        "images": images,
        "total": total,
        "page": page,
        "limit": limit
    }

# Statistics - Public
@api_router.get("/statistics")
async def get_club_statistics():
    """Get club-wide statistics for dashboard"""
    # Get counts
    members_count = await db.members.count_documents({})
    tournaments_count = await db.tournaments.count_documents({})
    matches_count = await db.matches.count_documents({})
    
    # Get all members for rating analysis
    members = await db.members.find({}, {"_id": 0, "rapid_rating": 1, "blitz_rating": 1, "bullet_rating": 1, "department": 1, "wins": 1, "losses": 1, "draws": 1, "created_at": 1}).to_list(1000)
    
    # Calculate rating distribution
    rapid_ratings = [m['rapid_rating'] for m in members if m.get('rapid_rating')]
    blitz_ratings = [m['blitz_rating'] for m in members if m.get('blitz_rating')]
    
    def get_rating_distribution(ratings):
        if not ratings:
            return {}
        ranges = {
            "0-800": 0,
            "800-1000": 0,
            "1000-1200": 0,
            "1200-1400": 0,
            "1400-1600": 0,
            "1600-1800": 0,
            "1800-2000": 0,
            "2000+": 0
        }
        for r in ratings:
            if r < 800: ranges["0-800"] += 1
            elif r < 1000: ranges["800-1000"] += 1
            elif r < 1200: ranges["1000-1200"] += 1
            elif r < 1400: ranges["1200-1400"] += 1
            elif r < 1600: ranges["1400-1600"] += 1
            elif r < 1800: ranges["1600-1800"] += 1
            elif r < 2000: ranges["1800-2000"] += 1
            else: ranges["2000+"] += 1
        return ranges
    
    # Department breakdown
    dept_counts = {}
    for m in members:
        dept = m.get('department', 'Unknown')
        dept_counts[dept] = dept_counts.get(dept, 0) + 1
    
    # Most active members (by total games)
    active_members = sorted(
        [m for m in members if m.get('wins', 0) + m.get('losses', 0) + m.get('draws', 0) > 0],
        key=lambda x: x.get('wins', 0) + x.get('losses', 0) + x.get('draws', 0),
        reverse=True
    )[:10]
    
    # Average ratings
    avg_rapid = sum(rapid_ratings) / len(rapid_ratings) if rapid_ratings else 0
    avg_blitz = sum(blitz_ratings) / len(blitz_ratings) if blitz_ratings else 0
    
    return {
        "overview": {
            "total_members": members_count,
            "total_tournaments": tournaments_count,
            "total_matches": matches_count,
            "average_rapid_rating": round(avg_rapid),
            "average_blitz_rating": round(avg_blitz),
            "highest_rapid": max(rapid_ratings) if rapid_ratings else 0,
            "highest_blitz": max(blitz_ratings) if blitz_ratings else 0
        },
        "rating_distribution": {
            "rapid": get_rating_distribution(rapid_ratings),
            "blitz": get_rating_distribution(blitz_ratings)
        },
        "departments": dept_counts,
        "most_active": active_members[:5]
    }

# ============= MEMBER AUTH ROUTES =============

@api_router.post("/member/register")
async def register_member(data: MemberRegister, request: Request):
    """Register a new member account"""
    client_ip = await get_client_ip(request)
    if not check_rate_limit(f"member_register_{client_ip}", max_requests=5):
        raise HTTPException(status_code=429, detail="Too many registration attempts")
    
    # Check if email already exists
    existing_email = await db.members.find_one({"email": data.email})
    if existing_email and existing_email.get('has_account'):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Verify Chess.com username
    if not await verify_chess_com_username(data.chess_com_username):
        raise HTTPException(status_code=400, detail="Chess.com username not found. Please verify your username.")
    
    # Check if chess.com username already exists
    existing_chess = await db.members.find_one({"chess_com_username": data.chess_com_username.lower()})
    
    # Fetch Chess.com stats
    stats = await fetch_chess_com_stats(data.chess_com_username)
    rapid_rating = stats.get('chess_rapid', {}).get('last', {}).get('rating') if "error" not in stats else None
    blitz_rating = stats.get('chess_blitz', {}).get('last', {}).get('rating') if "error" not in stats else None
    bullet_rating = stats.get('chess_bullet', {}).get('last', {}).get('rating') if "error" not in stats else None
    
    if existing_chess:
        # Update existing member to add account
        if existing_chess.get('has_account'):
            raise HTTPException(status_code=400, detail="This Chess.com username is already registered")
        
        update_data = {
            "password_hash": hash_password(data.password),
            "has_account": True,
            "bio": data.bio,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.members.update_one({"id": existing_chess['id']}, {"$set": update_data})
        member_id = existing_chess['id']
    else:
        # Create new member
        member = Member(
            name=data.name,
            department=data.department,
            chess_com_username=data.chess_com_username.lower(),
            email=data.email,
            phone=data.phone,
            bio=data.bio,
            rapid_rating=rapid_rating,
            blitz_rating=blitz_rating,
            bullet_rating=bullet_rating,
            has_account=True
        )
        
        doc = member.model_dump()
        doc['password_hash'] = hash_password(data.password)
        doc['created_at'] = serialize_datetime(doc['created_at'])
        doc['updated_at'] = serialize_datetime(doc['updated_at'])
        
        await db.members.insert_one(doc)
        member_id = member.id
    
    # Create token
    token = create_token(member_id, data.email, role="member", hours=MEMBER_JWT_EXPIRATION_HOURS)
    
    return {
        "message": "Registration successful",
        "token": token,
        "member_id": member_id
    }

@api_router.post("/member/login")
async def login_member(data: MemberLogin, request: Request):
    """Login for members"""
    client_ip = await get_client_ip(request)
    if not check_rate_limit(f"member_login_{client_ip}", max_requests=LOGIN_RATE_LIMIT):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please wait.")
    
    member = await db.members.find_one({"email": data.email, "has_account": True})
    if not member:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not member.get('password_hash') or not verify_password(data.password, member['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(member['id'], member['email'], role="member", hours=MEMBER_JWT_EXPIRATION_HOURS)
    
    return {
        "token": token,
        "member": {
            "id": member['id'],
            "name": member['name'],
            "email": member['email'],
            "chess_com_username": member['chess_com_username'],
            "avatar_url": member.get('avatar_url')
        }
    }

@api_router.get("/member/me")
async def get_current_member(payload: dict = Depends(verify_member_token)):
    """Get current logged-in member's profile"""
    member = await db.members.find_one({"id": payload['sub']}, {"_id": 0, "password_hash": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    member['created_at'] = parse_datetime(member.get('created_at'))
    member['updated_at'] = parse_datetime(member.get('updated_at'))
    
    # Get match history
    matches = await db.matches.find({
        "$or": [{"player1_id": payload['sub']}, {"player2_id": payload['sub']}]
    }, {"_id": 0}).sort("date", -1).limit(50).to_list(50)
    
    for m in matches:
        m['date'] = parse_datetime(m.get('date'))
    
    member['match_history'] = matches
    
    # Get tournament participations
    tournaments = await db.tournaments.find(
        {"participants": payload['sub']},
        {"_id": 0}
    ).sort("start_date", -1).to_list(20)
    
    for t in tournaments:
        t['start_date'] = parse_datetime(t.get('start_date'))
    
    member['tournaments'] = tournaments
    
    return member

@api_router.put("/member/me")
async def update_current_member(data: MemberUpdate, payload: dict = Depends(verify_member_token)):
    """Update current member's profile"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.members.update_one({"id": payload['sub']}, {"$set": update_data})
    
    return {"message": "Profile updated successfully"}

# ============= ADMIN AUTH ROUTES =============

@api_router.post("/admin/register")
async def register_admin(admin_data: AdminCreate, request: Request):
    client_ip = await get_client_ip(request)
    if not check_rate_limit(f"admin_register_{client_ip}", max_requests=3):
        raise HTTPException(status_code=429, detail="Too many registration attempts")
    
    # Check if admin exists
    existing = await db.admins.find_one({"$or": [
        {"username": admin_data.username.lower()},
        {"email": admin_data.email}
    ]})
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists with this username or email")
    
    admin = Admin(
        username=admin_data.username.lower(),
        email=admin_data.email
    )
    
    doc = admin.model_dump()
    doc['password_hash'] = hash_password(admin_data.password)
    doc['created_at'] = serialize_datetime(doc['created_at'])
    
    await db.admins.insert_one(doc)
    
    # Log action
    await log_admin_action(admin.id, admin.username, "create", "admin", admin.id, "Self-registration")
    
    return {"message": "Admin registered successfully", "admin_id": admin.id}

@api_router.post("/admin/login")
async def login_admin(login_data: AdminLogin, request: Request):
    client_ip = await get_client_ip(request)
    if not check_rate_limit(f"admin_login_{client_ip}", max_requests=LOGIN_RATE_LIMIT):
        raise HTTPException(status_code=429, detail="Too many login attempts. Please wait 1 minute.")
    
    admin = await db.admins.find_one({"username": login_data.username.lower()})
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, admin['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(admin['id'], admin['username'], role="admin")
    
    return {
        "token": token,
        "admin": {
            "id": admin['id'],
            "username": admin['username'],
            "email": admin['email']
        }
    }

@api_router.post("/admin/password-reset-request")
async def request_password_reset(data: PasswordResetRequest, request: Request):
    """Request password reset - generates a token"""
    client_ip = await get_client_ip(request)
    if not check_rate_limit(f"password_reset_{client_ip}", max_requests=3):
        raise HTTPException(status_code=429, detail="Too many requests")
    
    admin = await db.admins.find_one({"email": data.email})
    if not admin:
        # Don't reveal if email exists
        return {"message": "If the email exists, a reset link will be sent."}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_resets.insert_one({
        "token": reset_token,
        "admin_id": admin['id'],
        "email": data.email,
        "expires_at": expiry.isoformat(),
        "used": False
    })
    
    # In production, send email with reset link
    # For now, return the token (only for development)
    logger.info(f"Password reset requested for {data.email}. Token: {reset_token}")
    
    return {
        "message": "If the email exists, a reset link will be sent.",
        "dev_token": reset_token  # Remove in production!
    }

@api_router.post("/admin/password-reset")
async def reset_password(data: PasswordReset, request: Request):
    """Reset password using token"""
    client_ip = await get_client_ip(request)
    if not check_rate_limit(f"password_reset_confirm_{client_ip}", max_requests=5):
        raise HTTPException(status_code=429, detail="Too many requests")
    
    reset = await db.password_resets.find_one({
        "token": data.token,
        "used": False
    })
    
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiry
    expiry = parse_datetime(reset['expires_at'])
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    new_hash = hash_password(data.new_password)
    await db.admins.update_one(
        {"id": reset['admin_id']},
        {"$set": {"password_hash": new_hash}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

@api_router.get("/admin/me")
async def get_current_admin(payload: dict = Depends(verify_admin_token)):
    admin = await db.admins.find_one({"id": payload['sub']}, {"_id": 0, "password_hash": 0})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin

# ============= ADMIN ROUTES (Protected) =============

# Members CRUD
@api_router.post("/admin/members")
async def create_member(member_data: MemberCreate, payload: dict = Depends(verify_admin_token)):
    # Verify Chess.com username exists
    profile = await fetch_chess_com_profile(member_data.chess_com_username)
    if "error" in profile and profile.get("status") == 404:
        raise HTTPException(status_code=400, detail="Chess.com username not found. Please verify the username.")
    
    # Check if member already exists
    existing = await db.members.find_one({
        "$or": [
            {"email": member_data.email},
            {"chess_com_username": member_data.chess_com_username.lower()}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Member with this email or Chess.com username already exists")
    
    # Fetch initial ratings from Chess.com
    stats = await fetch_chess_com_stats(member_data.chess_com_username)
    
    rapid_rating = None
    blitz_rating = None
    bullet_rating = None
    
    if "error" not in stats:
        rapid_rating = stats.get('chess_rapid', {}).get('last', {}).get('rating')
        blitz_rating = stats.get('chess_blitz', {}).get('last', {}).get('rating')
        bullet_rating = stats.get('chess_bullet', {}).get('last', {}).get('rating')
    
    member = Member(
        name=member_data.name,
        department=member_data.department,
        chess_com_username=member_data.chess_com_username.lower(),
        email=member_data.email,
        phone=member_data.phone,
        bio=member_data.bio,
        avatar_url=member_data.avatar_url,
        favorite_opening=member_data.favorite_opening,
        playing_style=member_data.playing_style,
        rapid_rating=rapid_rating,
        blitz_rating=blitz_rating,
        bullet_rating=bullet_rating
    )
    
    doc = member.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    doc['updated_at'] = serialize_datetime(doc['updated_at'])
    
    await db.members.insert_one(doc)
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "create", "member", member.id, f"Added member: {member.name}")
    
    return member

@api_router.put("/admin/members/{member_id}")
async def update_member(member_id: str, member_data: MemberCreate, payload: dict = Depends(verify_admin_token)):
    existing = await db.members.find_one({"id": member_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Fetch updated ratings if username changed
    stats = await fetch_chess_com_stats(member_data.chess_com_username)
    
    update_data = member_data.model_dump()
    update_data['chess_com_username'] = member_data.chess_com_username.lower()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if "error" not in stats:
        update_data['rapid_rating'] = stats.get('chess_rapid', {}).get('last', {}).get('rating')
        update_data['blitz_rating'] = stats.get('chess_blitz', {}).get('last', {}).get('rating')
        update_data['bullet_rating'] = stats.get('chess_bullet', {}).get('last', {}).get('rating')
    
    await db.members.update_one({"id": member_id}, {"$set": update_data})
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "update", "member", member_id, f"Updated member: {member_data.name}")
    
    updated = await db.members.find_one({"id": member_id}, {"_id": 0, "password_hash": 0})
    updated['created_at'] = parse_datetime(updated.get('created_at'))
    updated['updated_at'] = parse_datetime(updated.get('updated_at'))
    return updated

@api_router.delete("/admin/members/{member_id}")
async def delete_member(member_id: str, payload: dict = Depends(verify_admin_token)):
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    result = await db.members.delete_one({"id": member_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "delete", "member", member_id, f"Deleted member: {member.get('name')}")
    
    return {"message": "Member deleted successfully"}

# Refresh all member ratings
@api_router.post("/admin/members/refresh-ratings")
async def refresh_all_ratings(payload: dict = Depends(verify_admin_token)):
    members = await db.members.find({}, {"_id": 0}).to_list(1000)
    updated_count = 0
    errors = []
    
    for member in members:
        stats = await fetch_chess_com_stats(member['chess_com_username'], use_cache=False)
        if "error" not in stats:
            update_data = {
                'rapid_rating': stats.get('chess_rapid', {}).get('last', {}).get('rating'),
                'blitz_rating': stats.get('chess_blitz', {}).get('last', {}).get('rating'),
                'bullet_rating': stats.get('chess_bullet', {}).get('last', {}).get('rating'),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            await db.members.update_one({"id": member['id']}, {"$set": update_data})
            updated_count += 1
        else:
            errors.append(f"{member['name']}: {stats.get('error')}")
        
        # Small delay to avoid Chess.com rate limiting
        await asyncio.sleep(0.5)
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "update", "members", "all", f"Refreshed ratings for {updated_count} members")
    
    return {
        "message": f"Updated ratings for {updated_count} members",
        "errors": errors if errors else None
    }

# Matches CRUD
@api_router.post("/admin/matches")
async def create_match(match_data: MatchCreate, payload: dict = Depends(verify_admin_token)):
    # Get player names
    player1 = await db.members.find_one({"id": match_data.player1_id})
    player2 = await db.members.find_one({"id": match_data.player2_id})
    
    if not player1 or not player2:
        raise HTTPException(status_code=400, detail="One or both players not found")
    
    if match_data.player1_id == match_data.player2_id:
        raise HTTPException(status_code=400, detail="Player cannot play against themselves")
    
    match = Match(
        player1_id=match_data.player1_id,
        player1_name=player1['name'],
        player2_id=match_data.player2_id,
        player2_name=player2['name'],
        result=match_data.result,
        date=match_data.date,
        tournament_name=match_data.tournament_name,
        time_control=match_data.time_control
    )
    
    doc = match.model_dump()
    doc['date'] = serialize_datetime(doc['date'])
    doc['created_at'] = serialize_datetime(doc['created_at'])
    
    await db.matches.insert_one(doc)
    
    # Update win/loss/draw counts
    if match_data.result == "1-0":
        await db.members.update_one({"id": match_data.player1_id}, {"$inc": {"wins": 1}})
        await db.members.update_one({"id": match_data.player2_id}, {"$inc": {"losses": 1}})
    elif match_data.result == "0-1":
        await db.members.update_one({"id": match_data.player1_id}, {"$inc": {"losses": 1}})
        await db.members.update_one({"id": match_data.player2_id}, {"$inc": {"wins": 1}})
    else:  # Draw
        await db.members.update_one({"id": match_data.player1_id}, {"$inc": {"draws": 1}})
        await db.members.update_one({"id": match_data.player2_id}, {"$inc": {"draws": 1}})
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "create", "match", match.id, f"{player1['name']} vs {player2['name']}: {match_data.result}")
    
    return match

@api_router.delete("/admin/matches/{match_id}")
async def delete_match(match_id: str, payload: dict = Depends(verify_admin_token)):
    match = await db.matches.find_one({"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Reverse the win/loss/draw counts
    if match['result'] == "1-0":
        await db.members.update_one({"id": match['player1_id']}, {"$inc": {"wins": -1}})
        await db.members.update_one({"id": match['player2_id']}, {"$inc": {"losses": -1}})
    elif match['result'] == "0-1":
        await db.members.update_one({"id": match['player1_id']}, {"$inc": {"losses": -1}})
        await db.members.update_one({"id": match['player2_id']}, {"$inc": {"wins": -1}})
    else:
        await db.members.update_one({"id": match['player1_id']}, {"$inc": {"draws": -1}})
        await db.members.update_one({"id": match['player2_id']}, {"$inc": {"draws": -1}})
    
    result = await db.matches.delete_one({"id": match_id})
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "delete", "match", match_id, f"Deleted: {match.get('player1_name')} vs {match.get('player2_name')}")
    
    return {"message": "Match deleted successfully"}

# Tournaments CRUD
@api_router.post("/admin/tournaments")
async def create_tournament(tournament_data: TournamentCreate, payload: dict = Depends(verify_admin_token)):
    tournament = Tournament(
        name=tournament_data.name,
        description=tournament_data.description,
        start_date=tournament_data.start_date,
        end_date=tournament_data.end_date,
        status=tournament_data.status,
        participants=tournament_data.participants,
        format=tournament_data.format,
        rounds=tournament_data.rounds
    )
    
    doc = tournament.model_dump()
    doc['start_date'] = serialize_datetime(doc['start_date'])
    doc['end_date'] = serialize_datetime(doc['end_date']) if doc['end_date'] else None
    doc['created_at'] = serialize_datetime(doc['created_at'])
    
    await db.tournaments.insert_one(doc)
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "create", "tournament", tournament.id, f"Created: {tournament.name}")
    
    return tournament

@api_router.put("/admin/tournaments/{tournament_id}")
async def update_tournament(tournament_id: str, tournament_data: TournamentCreate, payload: dict = Depends(verify_admin_token)):
    existing = await db.tournaments.find_one({"id": tournament_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    update_data = tournament_data.model_dump()
    update_data['start_date'] = serialize_datetime(update_data['start_date'])
    update_data['end_date'] = serialize_datetime(update_data['end_date']) if update_data['end_date'] else None
    
    await db.tournaments.update_one({"id": tournament_id}, {"$set": update_data})
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "update", "tournament", tournament_id, f"Updated: {tournament_data.name}")
    
    updated = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    updated['start_date'] = parse_datetime(updated.get('start_date'))
    updated['end_date'] = parse_datetime(updated.get('end_date'))
    updated['created_at'] = parse_datetime(updated.get('created_at'))
    return updated

@api_router.put("/admin/tournaments/{tournament_id}/bracket")
async def update_tournament_bracket(tournament_id: str, bracket: Dict, payload: dict = Depends(verify_admin_token)):
    """Update tournament bracket data"""
    existing = await db.tournaments.find_one({"id": tournament_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    await db.tournaments.update_one({"id": tournament_id}, {"$set": {"bracket": bracket}})
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "update", "tournament", tournament_id, "Updated bracket")
    
    return {"message": "Bracket updated successfully"}

@api_router.delete("/admin/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str, payload: dict = Depends(verify_admin_token)):
    tournament = await db.tournaments.find_one({"id": tournament_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    result = await db.tournaments.delete_one({"id": tournament_id})
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "delete", "tournament", tournament_id, f"Deleted: {tournament.get('name')}")
    
    return {"message": "Tournament deleted successfully"}

# News CRUD
@api_router.post("/admin/news")
async def create_news(news_data: NewsCreate, payload: dict = Depends(verify_admin_token)):
    news = News(
        title=news_data.title,
        content=news_data.content,
        image_url=news_data.image_url
    )
    
    doc = news.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    
    await db.news.insert_one(doc)
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "create", "news", news.id, f"Published: {news.title}")
    
    return news

@api_router.put("/admin/news/{news_id}")
async def update_news(news_id: str, news_data: NewsCreate, payload: dict = Depends(verify_admin_token)):
    existing = await db.news.find_one({"id": news_id})
    if not existing:
        raise HTTPException(status_code=404, detail="News not found")
    
    await db.news.update_one({"id": news_id}, {"$set": news_data.model_dump()})
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "update", "news", news_id, f"Updated: {news_data.title}")
    
    updated = await db.news.find_one({"id": news_id}, {"_id": 0})
    updated['created_at'] = parse_datetime(updated.get('created_at'))
    return updated

@api_router.delete("/admin/news/{news_id}")
async def delete_news(news_id: str, payload: dict = Depends(verify_admin_token)):
    news = await db.news.find_one({"id": news_id})
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    
    result = await db.news.delete_one({"id": news_id})
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "delete", "news", news_id, f"Deleted: {news.get('title')}")
    
    return {"message": "News deleted successfully"}

# Events CRUD
@api_router.post("/admin/events")
async def create_event(event_data: EventCreate, payload: dict = Depends(verify_admin_token)):
    event = Event(
        title=event_data.title,
        description=event_data.description,
        date=event_data.date,
        end_date=event_data.end_date,
        location=event_data.location,
        event_type=event_data.event_type
    )
    
    doc = event.model_dump()
    doc['date'] = serialize_datetime(doc['date'])
    doc['end_date'] = serialize_datetime(doc['end_date']) if doc['end_date'] else None
    doc['created_at'] = serialize_datetime(doc['created_at'])
    
    await db.events.insert_one(doc)
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "create", "event", event.id, f"Created: {event.title}")
    
    return event

@api_router.put("/admin/events/{event_id}")
async def update_event(event_id: str, event_data: EventCreate, payload: dict = Depends(verify_admin_token)):
    existing = await db.events.find_one({"id": event_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = event_data.model_dump()
    update_data['date'] = serialize_datetime(update_data['date'])
    update_data['end_date'] = serialize_datetime(update_data['end_date']) if update_data['end_date'] else None
    
    await db.events.update_one({"id": event_id}, {"$set": update_data})
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "update", "event", event_id, f"Updated: {event_data.title}")
    
    updated = await db.events.find_one({"id": event_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/events/{event_id}")
async def delete_event(event_id: str, payload: dict = Depends(verify_admin_token)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.events.delete_one({"id": event_id})
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "delete", "event", event_id, f"Deleted: {event.get('title')}")
    
    return {"message": "Event deleted successfully"}

# Gallery CRUD
@api_router.post("/admin/gallery")
async def add_gallery_image(
    url: str,
    caption: Optional[str] = None,
    event_id: Optional[str] = None,
    payload: dict = Depends(verify_admin_token)
):
    event_name = None
    if event_id:
        event = await db.events.find_one({"id": event_id})
        if event:
            event_name = event.get('title')
    
    image = GalleryImage(
        url=url,
        caption=caption,
        event_id=event_id,
        event_name=event_name,
        uploaded_by=payload['username']
    )
    
    doc = image.model_dump()
    doc['created_at'] = serialize_datetime(doc['created_at'])
    
    await db.gallery.insert_one(doc)
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "create", "gallery", image.id, f"Added image: {caption or 'No caption'}")
    
    return image

@api_router.delete("/admin/gallery/{image_id}")
async def delete_gallery_image(image_id: str, payload: dict = Depends(verify_admin_token)):
    image = await db.gallery.find_one({"id": image_id})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    await db.gallery.delete_one({"id": image_id})
    
    # Log action
    await log_admin_action(payload['sub'], payload['username'], "delete", "gallery", image_id, f"Deleted image")
    
    return {"message": "Image deleted successfully"}

# Dashboard Stats
@api_router.get("/admin/stats")
async def get_admin_stats(payload: dict = Depends(verify_admin_token)):
    members_count = await db.members.count_documents({})
    tournaments_count = await db.tournaments.count_documents({})
    matches_count = await db.matches.count_documents({})
    news_count = await db.news.count_documents({})
    events_count = await db.events.count_documents({})
    gallery_count = await db.gallery.count_documents({})
    
    # Recent activity
    recent_logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(10).to_list(10)
    for log in recent_logs:
        log['timestamp'] = parse_datetime(log.get('timestamp'))
    
    return {
        "members": members_count,
        "tournaments": tournaments_count,
        "matches": matches_count,
        "news": news_count,
        "events": events_count,
        "gallery": gallery_count,
        "recent_activity": recent_logs
    }

# Audit Logs
@api_router.get("/admin/audit-logs")
async def get_audit_logs(
    payload: dict = Depends(verify_admin_token),
    page: int = 1,
    limit: int = 50,
    resource_type: Optional[str] = None
):
    query = {}
    if resource_type:
        query["resource_type"] = resource_type
    
    total = await db.audit_logs.count_documents(query)
    skip = (page - 1) * limit
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    for log in logs:
        log['timestamp'] = parse_datetime(log.get('timestamp'))
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Startup event to create indexes
@app.on_event("startup")
async def startup_db_client():
    # Create indexes for better performance
    try:
        await db.members.create_index("email", unique=True, sparse=True)
        await db.members.create_index("chess_com_username")
        await db.members.create_index("name")
        await db.members.create_index("department")
        await db.admins.create_index("username", unique=True)
        await db.admins.create_index("email", unique=True)
        await db.tournaments.create_index("start_date")
        await db.tournaments.create_index("status")
        await db.matches.create_index("date")
        await db.matches.create_index([("player1_id", 1), ("player2_id", 1)])
        await db.audit_logs.create_index("timestamp")
        await db.events.create_index("date")
        await db.gallery.create_index("event_id")
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Error creating indexes: {e}")
