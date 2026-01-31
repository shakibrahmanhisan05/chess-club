// frontend/src/lib/api.js
// Robust API client with error handling, retry logic, and loading states

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Custom error class for API errors
export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.isNetworkError = status === 0 || status === undefined;
    this.isRateLimited = status === 429;
    this.isAuthError = status === 401 || status === 403;
    this.isNotFound = status === 404;
    this.isServerError = status >= 500;
  }
}

// Sleep helper for retry delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Parse response safely
async function parseResponseOnce(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

// Main request function with retry logic
async function request(url, options = {}, retries = 0) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const { ok, status, data } = await parseResponseOnce(res);

    if (!ok) {
      // Handle token expiration - clear stored tokens
      if (status === 401) {
        const msg = data && (data.message || data.error || data.detail) 
          ? (data.message || data.error || data.detail) 
          : 'Session expired. Please login again.';
        
        // Clear admin token if expired
        if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('token')) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          localStorage.removeItem('memberToken');
          localStorage.removeItem('memberData');
        }
        
        throw new ApiError(msg, status, data);
      }

      // Handle rate limiting with retry
      if (status === 429 && retries < MAX_RETRIES) {
        const retryAfter = parseInt(res.headers.get('Retry-After')) || RETRY_DELAY * (retries + 1);
        await sleep(retryAfter);
        return request(url, options, retries + 1);
      }

      const msg = data && (data.message || data.error || data.detail) 
        ? (data.message || data.error || data.detail) 
        : getErrorMessage(status);
      
      throw new ApiError(msg, status, data);
    }

    return data;
  } catch (error) {
    // Network error or timeout - retry
    if (error.name === 'AbortError') {
      throw new ApiError('Request timeout. Please check your connection and try again.', 408);
    }
    
    if (error instanceof ApiError) {
      throw error;
    }

    // Network error - retry
    if (retries < MAX_RETRIES && !error.status) {
      await sleep(RETRY_DELAY * (retries + 1));
      return request(url, options, retries + 1);
    }

    throw new ApiError(
      'Unable to connect to server. Please check your internet connection.',
      0
    );
  }
}

// User-friendly error messages
function getErrorMessage(status) {
  const messages = {
    400: 'Invalid request. Please check your input.',
    401: 'Please log in to continue.',
    403: 'You don\'t have permission to do this.',
    404: 'The requested item was not found.',
    408: 'Request timeout. Please try again.',
    429: 'Too many requests. Please wait a moment.',
    500: 'Server error. Please try again later.',
    502: 'Server is temporarily unavailable.',
    503: 'Service unavailable. Please try again later.',
  };
  return messages[status] || `Request failed (${status})`;
}

export const api = {
  // Auth headers builder
  authHeaders: (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }),

  // ============= PUBLIC ENDPOINTS =============

  // Members
  getMembers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.department) query.append('department', params.department);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_order) query.append('sort_order', params.sort_order);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryStr = query.toString();
    return request(`${API_BASE}/members${queryStr ? '?' + queryStr : ''}`);
  },
  
  getMember: (id) => request(`${API_BASE}/members/${id}`),
  
  // Leaderboard
  getLeaderboard: (timeControl = 'rapid', limit = 50) => 
    request(`${API_BASE}/leaderboard?time_control=${timeControl}&limit=${limit}`),
  
  // Chess.com
  getChessComStats: (username) => request(`${API_BASE}/chess-com/${username}`),
  getChessComGames: (username, year, month) => {
    let url = `${API_BASE}/chess-com/${username}/games`;
    if (year && month) {
      url += `?year=${year}&month=${month}`;
    }
    return request(url);
  },
  
  // Tournaments
  getTournaments: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryStr = query.toString();
    return request(`${API_BASE}/tournaments${queryStr ? '?' + queryStr : ''}`);
  },
  getTournament: (id) => request(`${API_BASE}/tournaments/${id}`),
  
  // Matches
  getMatches: (params = {}) => {
    const query = new URLSearchParams();
    if (params.tournament) query.append('tournament', params.tournament);
    if (params.player_id) query.append('player_id', params.player_id);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryStr = query.toString();
    return request(`${API_BASE}/matches${queryStr ? '?' + queryStr : ''}`);
  },
  
  // News
  getNews: (page = 1, limit = 10) => 
    request(`${API_BASE}/news?page=${page}&limit=${limit}`),
  getNewsItem: (id) => request(`${API_BASE}/news/${id}`),
  
  // Events
  getEvents: (params = {}) => {
    const query = new URLSearchParams();
    if (params.upcoming_only) query.append('upcoming_only', 'true');
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryStr = query.toString();
    return request(`${API_BASE}/events${queryStr ? '?' + queryStr : ''}`);
  },
  getEventsCalendar: (year, month) => 
    request(`${API_BASE}/events/calendar?year=${year}&month=${month}`),
  
  // Gallery
  getGallery: (params = {}) => {
    const query = new URLSearchParams();
    if (params.event_id) query.append('event_id', params.event_id);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryStr = query.toString();
    return request(`${API_BASE}/gallery${queryStr ? '?' + queryStr : ''}`);
  },
  
  // Statistics
  getStatistics: () => request(`${API_BASE}/statistics`),

  // ============= MEMBER AUTH =============
  
  memberRegister: (data) => request(`${API_BASE}/member/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  
  memberLogin: (email, password) => request(`${API_BASE}/member/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }),
  
  getMemberMe: (token) => request(`${API_BASE}/member/me`, {
    headers: api.authHeaders(token)
  }),
  
  updateMemberMe: (token, data) => request(`${API_BASE}/member/me`, {
    method: 'PUT',
    headers: api.authHeaders(token),
    body: JSON.stringify(data)
  }),

  // ============= ADMIN AUTH =============

  login: (username, password) =>
    request(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }),

  register: (username, password, email) =>
    request(`${API_BASE}/admin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    }),
  
  requestPasswordReset: (email) =>
    request(`${API_BASE}/admin/password-reset-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }),
  
  resetPassword: (token, newPassword) =>
    request(`${API_BASE}/admin/password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword })
    }),

  // ============= ADMIN ENDPOINTS =============

  getAdminStats: (token) => request(`${API_BASE}/admin/stats`, { 
    headers: api.authHeaders(token) 
  }),
  
  getAuditLogs: (token, params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.resource_type) query.append('resource_type', params.resource_type);
    const queryStr = query.toString();
    return request(`${API_BASE}/admin/audit-logs${queryStr ? '?' + queryStr : ''}`, {
      headers: api.authHeaders(token)
    });
  },

  // Members (admin)
  createMember: (token, payload) => request(`${API_BASE}/admin/members`, {
    method: 'POST', headers: api.authHeaders(token), body: JSON.stringify(payload)
  }),
  updateMember: (token, id, payload) => request(`${API_BASE}/admin/members/${id}`, {
    method: 'PUT', headers: api.authHeaders(token), body: JSON.stringify(payload)
  }),
  deleteMember: (token, id) => request(`${API_BASE}/admin/members/${id}`, {
    method: 'DELETE', headers: api.authHeaders(token)
  }),
  refreshRatings: (token) => request(`${API_BASE}/admin/members/refresh-ratings`, {
    method: 'POST', headers: api.authHeaders(token)
  }),

  // Matches (admin)
  createMatch: (token, payload) => request(`${API_BASE}/admin/matches`, {
    method: 'POST', headers: api.authHeaders(token), body: JSON.stringify(payload)
  }),
  deleteMatch: (token, id) => request(`${API_BASE}/admin/matches/${id}`, {
    method: 'DELETE', headers: api.authHeaders(token)
  }),

  // Tournaments (admin)
  createTournament: (token, payload) => request(`${API_BASE}/admin/tournaments`, {
    method: 'POST', headers: api.authHeaders(token), body: JSON.stringify(payload)
  }),
  updateTournament: (token, id, payload) => request(`${API_BASE}/admin/tournaments/${id}`, {
    method: 'PUT', headers: api.authHeaders(token), body: JSON.stringify(payload)
  }),
  updateTournamentBracket: (token, id, bracket) => request(`${API_BASE}/admin/tournaments/${id}/bracket`, {
    method: 'PUT', headers: api.authHeaders(token), body: JSON.stringify(bracket)
  }),
  deleteTournament: (token, id) => request(`${API_BASE}/admin/tournaments/${id}`, {
    method: 'DELETE', headers: api.authHeaders(token)
  }),

  // News (admin)
  createNews: (token, payload) => request(`${API_BASE}/admin/news`, {
    method: 'POST', headers: api.authHeaders(token), body: JSON.stringify(payload)
  }),
  updateNews: (token, id, payload) => request(`${API_BASE}/admin/news/${id}`, {
    method: 'PUT', headers: api.authHeaders(token), body: JSON.stringify(payload)
  }),
  deleteNews: (token, id) => request(`${API_BASE}/admin/news/${id}`, {
    method: 'DELETE', headers: api.authHeaders(token)
  }),
  
  // Events (admin)
  createEvent: (token, payload) => request(`${API_BASE}/admin/events`, {
    method: 'POST', headers: api.authHeaders(token), body: JSON.stringify(payload)
  }),
  updateEvent: (token, id, payload) => request(`${API_BASE}/admin/events/${id}`, {
    method: 'PUT', headers: api.authHeaders(token), body: JSON.stringify(payload)
  }),
  deleteEvent: (token, id) => request(`${API_BASE}/admin/events/${id}`, {
    method: 'DELETE', headers: api.authHeaders(token)
  }),
  
  // Gallery (admin)
  addGalleryImage: (token, url, caption, eventId) => {
    const params = new URLSearchParams();
    params.append('url', url);
    if (caption) params.append('caption', caption);
    if (eventId) params.append('event_id', eventId);
    return request(`${API_BASE}/admin/gallery?${params.toString()}`, {
      method: 'POST', headers: api.authHeaders(token)
    });
  },
  deleteGalleryImage: (token, id) => request(`${API_BASE}/admin/gallery/${id}`, {
    method: 'DELETE', headers: api.authHeaders(token)
  })
};
