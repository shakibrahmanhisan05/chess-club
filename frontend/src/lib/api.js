// frontend/src/lib/api.js
// Robust single-read fetch helper + API helpers used across the app.
// Reads the response body exactly once (via res.text()) then parses JSON if possible.
// This prevents "body stream already read" errors.

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

async function parseResponseOnce(res) {
  const text = await res.text(); // read the stream exactly once
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text; // not JSON, return raw text
  }
  return { ok: res.ok, status: res.status, data };
}

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const { ok, status, data } = await parseResponseOnce(res);

  if (!ok) {
    const msg = data && (data.message || data.error || data.detail) ? (data.message || data.error || data.detail) : `Request failed (${status})`;
    const err = new Error(msg);
    err.status = status;
    err.payload = data;
    throw err;
  }

  return data;
}

export const api = {
  // auth headers builder
  authHeaders: (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }),

  // Public endpoints
  getMembers: () => request(`${API_BASE}/members`),
  getMember: (id) => request(`${API_BASE}/members/${id}`),
  getLeaderboard: (timeControl = 'rapid') => request(`${API_BASE}/leaderboard?time_control=${timeControl}`),
  getChessComStats: (username) => request(`${API_BASE}/chess-com/${username}`),
  getTournaments: () => request(`${API_BASE}/tournaments`),
  getTournament: (id) => request(`${API_BASE}/tournaments/${id}`),
  getMatches: () => request(`${API_BASE}/matches`),
  getNews: () => request(`${API_BASE}/news`),
  getNewsItem: (id) => request(`${API_BASE}/news/${id}`),

  // Auth endpoints
  // login(username, password) returns whatever backend returns (expected: { token, admin })
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

  // Admin endpoints (require token)
  getAdminStats: (token) => request(`${API_BASE}/admin/stats`, { headers: api.authHeaders(token) }),

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

  // Refresh ratings
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
  })
};

