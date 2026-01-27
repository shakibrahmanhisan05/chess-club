const API_BASE = process.env.REACT_APP_BACKEND_URL + '/api';

export const api = {
  // Helper for authenticated requests
  authHeaders: (token) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }),

  // Public endpoints
  async getMembers() {
    const res = await fetch(`${API_BASE}/members`);
    if (!res.ok) throw new Error('Failed to fetch members');
    return res.json();
  },

  async getMember(id) {
    const res = await fetch(`${API_BASE}/members/${id}`);
    if (!res.ok) throw new Error('Failed to fetch member');
    return res.json();
  },

  async getLeaderboard(timeControl = 'rapid') {
    const res = await fetch(`${API_BASE}/leaderboard?time_control=${timeControl}`);
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return res.json();
  },

  async getChessComStats(username) {
    const res = await fetch(`${API_BASE}/chess-com/${username}`);
    if (!res.ok) throw new Error('Failed to fetch Chess.com stats');
    return res.json();
  },

  async getTournaments() {
    const res = await fetch(`${API_BASE}/tournaments`);
    if (!res.ok) throw new Error('Failed to fetch tournaments');
    return res.json();
  },

  async getTournament(id) {
    const res = await fetch(`${API_BASE}/tournaments/${id}`);
    if (!res.ok) throw new Error('Failed to fetch tournament');
    return res.json();
  },

  async getMatches() {
    const res = await fetch(`${API_BASE}/matches`);
    if (!res.ok) throw new Error('Failed to fetch matches');
    return res.json();
  },

  async getNews() {
    const res = await fetch(`${API_BASE}/news`);
    if (!res.ok) throw new Error('Failed to fetch news');
    return res.json();
  },

  async getNewsItem(id) {
    const res = await fetch(`${API_BASE}/news/${id}`);
    if (!res.ok) throw new Error('Failed to fetch news item');
    return res.json();
  },

  // Auth endpoints
  async login(username, password) {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  async register(username, password, email) {
    const res = await fetch(`${API_BASE}/admin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  // Admin endpoints
  async getAdminStats(token) {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: this.authHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async createMember(token, data) {
    const res = await fetch(`${API_BASE}/admin/members`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create member');
    }
    return res.json();
  },

  async updateMember(token, id, data) {
    const res = await fetch(`${API_BASE}/admin/members/${id}`, {
      method: 'PUT',
      headers: this.authHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update member');
    }
    return res.json();
  },

  async deleteMember(token, id) {
    const res = await fetch(`${API_BASE}/admin/members/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to delete member');
    return res.json();
  },

  async refreshRatings(token) {
    const res = await fetch(`${API_BASE}/admin/members/refresh-ratings`, {
      method: 'POST',
      headers: this.authHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to refresh ratings');
    return res.json();
  },

  async createMatch(token, data) {
    const res = await fetch(`${API_BASE}/admin/matches`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create match');
    }
    return res.json();
  },

  async deleteMatch(token, id) {
    const res = await fetch(`${API_BASE}/admin/matches/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to delete match');
    return res.json();
  },

  async createTournament(token, data) {
    const res = await fetch(`${API_BASE}/admin/tournaments`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create tournament');
    }
    return res.json();
  },

  async updateTournament(token, id, data) {
    const res = await fetch(`${API_BASE}/admin/tournaments/${id}`, {
      method: 'PUT',
      headers: this.authHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update tournament');
    }
    return res.json();
  },

  async deleteTournament(token, id) {
    const res = await fetch(`${API_BASE}/admin/tournaments/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to delete tournament');
    return res.json();
  },

  async createNews(token, data) {
    const res = await fetch(`${API_BASE}/admin/news`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create news');
    }
    return res.json();
  },

  async updateNews(token, id, data) {
    const res = await fetch(`${API_BASE}/admin/news/${id}`, {
      method: 'PUT',
      headers: this.authHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update news');
    }
    return res.json();
  },

  async deleteNews(token, id) {
    const res = await fetch(`${API_BASE}/admin/news/${id}`, {
      method: 'DELETE',
      headers: this.authHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to delete news');
    return res.json();
  }
};
