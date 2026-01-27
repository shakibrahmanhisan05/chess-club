from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
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

# Chess.com API
CHESS_COM_API = "https://api.chess.com/pub"

# Create the main app
app = FastAPI(title="Chittagong University EChess Society API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# ============= MODELS =============

class AdminCreate(BaseModel):
    username: str
    password: str
    email: EmailStr

class AdminLogin(BaseModel):
    username: str
    password: str

class Admin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MemberCreate(BaseModel):
    name: str
    department: str
    chess_com_username: str
    email: EmailStr
    phone: Optional[str] = None

class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    department: str
    chess_com_username: str
    email: str
    phone: Optional[str] = None
    rapid_rating: Optional[int] = None
    blitz_rating: Optional[int] = None
    bullet_rating: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MatchCreate(BaseModel):
    player1_id: str
    player2_id: str
    result: str  # "1-0", "0-1", "1/2-1/2"
    date: datetime
    tournament_name: Optional[str] = None

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TournamentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    status: str = "upcoming"  # upcoming, ongoing, completed
    participants: List[str] = []

class Tournament(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    status: str = "upcoming"
    participants: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NewsCreate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None

class News(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(admin_id: str, username: str) -> str:
    payload = {
        "sub": admin_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============= CHESS.COM API =============

async def fetch_chess_com_stats(username: str):
    """Fetch player stats from Chess.com API"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            headers = {"User-Agent": "ChittagongUniversityEChessSociety/1.0"}
            response = await client.get(f"{CHESS_COM_API}/player/{username}/stats", headers=headers)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logging.error(f"Chess.com API error for {username}: {e}")
            return None

async def fetch_chess_com_profile(username: str):
    """Fetch player profile from Chess.com API"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            headers = {"User-Agent": "ChittagongUniversityEChessSociety/1.0"}
            response = await client.get(f"{CHESS_COM_API}/player/{username}", headers=headers)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logging.error(f"Chess.com profile API error for {username}: {e}")
            return None

# ============= PUBLIC ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "Chittagong University EChess Society API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Members - Public Read
@api_router.get("/members", response_model=List[Member])
async def get_members():
    members = await db.members.find({}, {"_id": 0}).to_list(1000)
    for m in members:
        if isinstance(m.get('created_at'), str):
            m['created_at'] = datetime.fromisoformat(m['created_at'])
        if isinstance(m.get('updated_at'), str):
            m['updated_at'] = datetime.fromisoformat(m['updated_at'])
    return members

@api_router.get("/members/{member_id}", response_model=Member)
async def get_member(member_id: str):
    member = await db.members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if isinstance(member.get('created_at'), str):
        member['created_at'] = datetime.fromisoformat(member['created_at'])
    if isinstance(member.get('updated_at'), str):
        member['updated_at'] = datetime.fromisoformat(member['updated_at'])
    return member

# Leaderboard
@api_router.get("/leaderboard")
async def get_leaderboard(time_control: str = "rapid"):
    members = await db.members.find({}, {"_id": 0}).to_list(1000)
    
    # Sort by rating
    rating_key = f"{time_control}_rating"
    ranked = [m for m in members if m.get(rating_key)]
    ranked.sort(key=lambda x: x.get(rating_key, 0), reverse=True)
    
    # Add rank
    for i, m in enumerate(ranked, 1):
        m['rank'] = i
    
    return {"leaderboard": ranked, "time_control": time_control}

# Chess.com stats proxy
@api_router.get("/chess-com/{username}")
async def get_chess_com_stats(username: str):
    stats = await fetch_chess_com_stats(username)
    profile = await fetch_chess_com_profile(username)
    
    if not stats and not profile:
        raise HTTPException(status_code=404, detail="Player not found on Chess.com")
    
    return {
        "stats": stats,
        "profile": profile
    }

# Tournaments - Public Read
@api_router.get("/tournaments", response_model=List[Tournament])
async def get_tournaments():
    tournaments = await db.tournaments.find({}, {"_id": 0}).to_list(100)
    for t in tournaments:
        if isinstance(t.get('start_date'), str):
            t['start_date'] = datetime.fromisoformat(t['start_date'])
        if isinstance(t.get('end_date'), str):
            t['end_date'] = datetime.fromisoformat(t['end_date']) if t.get('end_date') else None
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    return tournaments

@api_router.get("/tournaments/{tournament_id}", response_model=Tournament)
async def get_tournament(tournament_id: str):
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if isinstance(tournament.get('start_date'), str):
        tournament['start_date'] = datetime.fromisoformat(tournament['start_date'])
    if isinstance(tournament.get('end_date'), str):
        tournament['end_date'] = datetime.fromisoformat(tournament['end_date']) if tournament.get('end_date') else None
    if isinstance(tournament.get('created_at'), str):
        tournament['created_at'] = datetime.fromisoformat(tournament['created_at'])
    return tournament

# Matches - Public Read
@api_router.get("/matches", response_model=List[Match])
async def get_matches():
    matches = await db.matches.find({}, {"_id": 0}).to_list(500)
    for m in matches:
        if isinstance(m.get('date'), str):
            m['date'] = datetime.fromisoformat(m['date'])
        if isinstance(m.get('created_at'), str):
            m['created_at'] = datetime.fromisoformat(m['created_at'])
    return matches

# News - Public Read
@api_router.get("/news", response_model=List[News])
async def get_news():
    news = await db.news.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    for n in news:
        if isinstance(n.get('created_at'), str):
            n['created_at'] = datetime.fromisoformat(n['created_at'])
    return news

@api_router.get("/news/{news_id}", response_model=News)
async def get_news_item(news_id: str):
    news = await db.news.find_one({"id": news_id}, {"_id": 0})
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    if isinstance(news.get('created_at'), str):
        news['created_at'] = datetime.fromisoformat(news['created_at'])
    return news

# ============= AUTH ROUTES =============

@api_router.post("/admin/register")
async def register_admin(admin_data: AdminCreate):
    # Check if admin exists
    existing = await db.admins.find_one({"username": admin_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists")
    
    admin = Admin(
        username=admin_data.username,
        email=admin_data.email
    )
    
    doc = admin.model_dump()
    doc['password_hash'] = hash_password(admin_data.password)
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.admins.insert_one(doc)
    
    return {"message": "Admin registered successfully", "admin_id": admin.id}

@api_router.post("/admin/login")
async def login_admin(login_data: AdminLogin):
    admin = await db.admins.find_one({"username": login_data.username})
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, admin['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(admin['id'], admin['username'])
    
    return {
        "token": token,
        "admin": {
            "id": admin['id'],
            "username": admin['username'],
            "email": admin['email']
        }
    }

@api_router.get("/admin/me")
async def get_current_admin(payload: dict = Depends(verify_token)):
    admin = await db.admins.find_one({"id": payload['sub']}, {"_id": 0, "password_hash": 0})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    return admin

# ============= ADMIN ROUTES (Protected) =============

# Members CRUD
@api_router.post("/admin/members", response_model=Member)
async def create_member(member_data: MemberCreate, payload: dict = Depends(verify_token)):
    # Fetch initial ratings from Chess.com
    stats = await fetch_chess_com_stats(member_data.chess_com_username)
    
    rapid_rating = None
    blitz_rating = None
    bullet_rating = None
    
    if stats:
        rapid_rating = stats.get('chess_rapid', {}).get('last', {}).get('rating')
        blitz_rating = stats.get('chess_blitz', {}).get('last', {}).get('rating')
        bullet_rating = stats.get('chess_bullet', {}).get('last', {}).get('rating')
    
    member = Member(
        name=member_data.name,
        department=member_data.department,
        chess_com_username=member_data.chess_com_username,
        email=member_data.email,
        phone=member_data.phone,
        rapid_rating=rapid_rating,
        blitz_rating=blitz_rating,
        bullet_rating=bullet_rating
    )
    
    doc = member.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.members.insert_one(doc)
    return member

@api_router.put("/admin/members/{member_id}", response_model=Member)
async def update_member(member_id: str, member_data: MemberCreate, payload: dict = Depends(verify_token)):
    existing = await db.members.find_one({"id": member_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Fetch updated ratings
    stats = await fetch_chess_com_stats(member_data.chess_com_username)
    
    update_data = member_data.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if stats:
        update_data['rapid_rating'] = stats.get('chess_rapid', {}).get('last', {}).get('rating')
        update_data['blitz_rating'] = stats.get('chess_blitz', {}).get('last', {}).get('rating')
        update_data['bullet_rating'] = stats.get('chess_bullet', {}).get('last', {}).get('rating')
    
    await db.members.update_one({"id": member_id}, {"$set": update_data})
    
    updated = await db.members.find_one({"id": member_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return updated

@api_router.delete("/admin/members/{member_id}")
async def delete_member(member_id: str, payload: dict = Depends(verify_token)):
    result = await db.members.delete_one({"id": member_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted successfully"}

# Refresh all member ratings
@api_router.post("/admin/members/refresh-ratings")
async def refresh_all_ratings(payload: dict = Depends(verify_token)):
    members = await db.members.find({}, {"_id": 0}).to_list(1000)
    updated_count = 0
    
    for member in members:
        stats = await fetch_chess_com_stats(member['chess_com_username'])
        if stats:
            update_data = {
                'rapid_rating': stats.get('chess_rapid', {}).get('last', {}).get('rating'),
                'blitz_rating': stats.get('chess_blitz', {}).get('last', {}).get('rating'),
                'bullet_rating': stats.get('chess_bullet', {}).get('last', {}).get('rating'),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            await db.members.update_one({"id": member['id']}, {"$set": update_data})
            updated_count += 1
    
    return {"message": f"Updated ratings for {updated_count} members"}

# Matches CRUD
@api_router.post("/admin/matches", response_model=Match)
async def create_match(match_data: MatchCreate, payload: dict = Depends(verify_token)):
    # Get player names
    player1 = await db.members.find_one({"id": match_data.player1_id})
    player2 = await db.members.find_one({"id": match_data.player2_id})
    
    match = Match(
        player1_id=match_data.player1_id,
        player1_name=player1['name'] if player1 else None,
        player2_id=match_data.player2_id,
        player2_name=player2['name'] if player2 else None,
        result=match_data.result,
        date=match_data.date,
        tournament_name=match_data.tournament_name
    )
    
    doc = match.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.matches.insert_one(doc)
    return match

@api_router.delete("/admin/matches/{match_id}")
async def delete_match(match_id: str, payload: dict = Depends(verify_token)):
    result = await db.matches.delete_one({"id": match_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"message": "Match deleted successfully"}

# Tournaments CRUD
@api_router.post("/admin/tournaments", response_model=Tournament)
async def create_tournament(tournament_data: TournamentCreate, payload: dict = Depends(verify_token)):
    tournament = Tournament(
        name=tournament_data.name,
        description=tournament_data.description,
        start_date=tournament_data.start_date,
        end_date=tournament_data.end_date,
        status=tournament_data.status,
        participants=tournament_data.participants
    )
    
    doc = tournament.model_dump()
    doc['start_date'] = doc['start_date'].isoformat()
    doc['end_date'] = doc['end_date'].isoformat() if doc['end_date'] else None
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.tournaments.insert_one(doc)
    return tournament

@api_router.put("/admin/tournaments/{tournament_id}", response_model=Tournament)
async def update_tournament(tournament_id: str, tournament_data: TournamentCreate, payload: dict = Depends(verify_token)):
    existing = await db.tournaments.find_one({"id": tournament_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    update_data = tournament_data.model_dump()
    update_data['start_date'] = update_data['start_date'].isoformat()
    update_data['end_date'] = update_data['end_date'].isoformat() if update_data['end_date'] else None
    
    await db.tournaments.update_one({"id": tournament_id}, {"$set": update_data})
    
    updated = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if isinstance(updated.get('start_date'), str):
        updated['start_date'] = datetime.fromisoformat(updated['start_date'])
    if isinstance(updated.get('end_date'), str):
        updated['end_date'] = datetime.fromisoformat(updated['end_date']) if updated.get('end_date') else None
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/admin/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str, payload: dict = Depends(verify_token)):
    result = await db.tournaments.delete_one({"id": tournament_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"message": "Tournament deleted successfully"}

# News CRUD
@api_router.post("/admin/news", response_model=News)
async def create_news(news_data: NewsCreate, payload: dict = Depends(verify_token)):
    news = News(
        title=news_data.title,
        content=news_data.content,
        image_url=news_data.image_url
    )
    
    doc = news.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.news.insert_one(doc)
    return news

@api_router.put("/admin/news/{news_id}", response_model=News)
async def update_news(news_id: str, news_data: NewsCreate, payload: dict = Depends(verify_token)):
    existing = await db.news.find_one({"id": news_id})
    if not existing:
        raise HTTPException(status_code=404, detail="News not found")
    
    await db.news.update_one({"id": news_id}, {"$set": news_data.model_dump()})
    
    updated = await db.news.find_one({"id": news_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/admin/news/{news_id}")
async def delete_news(news_id: str, payload: dict = Depends(verify_token)):
    result = await db.news.delete_one({"id": news_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    return {"message": "News deleted successfully"}

# Dashboard Stats
@api_router.get("/admin/stats")
async def get_admin_stats(payload: dict = Depends(verify_token)):
    members_count = await db.members.count_documents({})
    tournaments_count = await db.tournaments.count_documents({})
    matches_count = await db.matches.count_documents({})
    news_count = await db.news.count_documents({})
    
    return {
        "members": members_count,
        "tournaments": tournaments_count,
        "matches": matches_count,
        "news": news_count
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
