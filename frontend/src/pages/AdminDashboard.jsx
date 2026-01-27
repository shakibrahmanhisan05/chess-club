import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Crown, Users, Trophy, Newspaper, Clock, LogOut, Plus, Trash2, 
  RefreshCw, Edit, Home, ChevronRight, X, Calendar, Target
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { token, admin, logout, isAuthenticated, isLoading } = useAuth();
  
  const [stats, setStats] = useState({ members: 0, tournaments: 0, matches: 0, news: 0 });
  const [members, setMembers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingRatings, setRefreshingRatings] = useState(false);

  // Modal states
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [tournamentModalOpen, setTournamentModalOpen] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [memberForm, setMemberForm] = useState({
    name: '', department: '', chess_com_username: '', email: '', phone: ''
  });
  const [tournamentForm, setTournamentForm] = useState({
    name: '', description: '', start_date: '', end_date: '', status: 'upcoming', participants: []
  });
  const [matchForm, setMatchForm] = useState({
    player1_id: '', player2_id: '', result: '1-0', date: '', tournament_name: ''
  });
  const [newsForm, setNewsForm] = useState({
    title: '', content: '', image_url: ''
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, isLoading, navigate]);
// eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsData, membersData, tournamentsData, matchesData, newsData] = await Promise.all([
        api.getAdminStats(token),
        api.getMembers(),
        api.getTournaments(),
        api.getMatches(),
        api.getNews()
      ]);
      setStats(statsData);
      setMembers(membersData);
      setTournaments(tournamentsData);
      setMatches(matchesData);
      setNews(newsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      if (err.message.includes('401') || err.message.includes('token')) {
        logout();
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshRatings = async () => {
    setRefreshingRatings(true);
    try {
      await api.refreshRatings(token);
      toast.success('Ratings refreshed successfully!');
      fetchAllData();
    } catch (err) {
      toast.error('Failed to refresh ratings');
    } finally {
      setRefreshingRatings(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  // Member handlers
  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.updateMember(token, editingItem.id, memberForm);
        toast.success('Member updated!');
      } else {
        await api.createMember(token, memberForm);
        toast.success('Member added!');
      }
      setMemberModalOpen(false);
      resetMemberForm();
      fetchAllData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    try {
      await api.deleteMember(token, id);
      toast.success('Member deleted');
      fetchAllData();
    } catch (err) {
      toast.error('Failed to delete member');
    }
  };

  const resetMemberForm = () => {
    setMemberForm({ name: '', department: '', chess_com_username: '', email: '', phone: '' });
    setEditingItem(null);
  };

  // Tournament handlers
  const handleTournamentSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...tournamentForm,
        start_date: new Date(tournamentForm.start_date).toISOString(),
        end_date: tournamentForm.end_date ? new Date(tournamentForm.end_date).toISOString() : null
      };
      if (editingItem) {
        await api.updateTournament(token, editingItem.id, data);
        toast.success('Tournament updated!');
      } else {
        await api.createTournament(token, data);
        toast.success('Tournament created!');
      }
      setTournamentModalOpen(false);
      resetTournamentForm();
      fetchAllData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteTournament = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tournament?')) return;
    try {
      await api.deleteTournament(token, id);
      toast.success('Tournament deleted');
      fetchAllData();
    } catch (err) {
      toast.error('Failed to delete tournament');
    }
  };

  const resetTournamentForm = () => {
    setTournamentForm({ name: '', description: '', start_date: '', end_date: '', status: 'upcoming', participants: [] });
    setEditingItem(null);
  };

  // Match handlers
  const handleMatchSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...matchForm,
        date: new Date(matchForm.date).toISOString()
      };
      await api.createMatch(token, data);
      toast.success('Match recorded!');
      setMatchModalOpen(false);
      resetMatchForm();
      fetchAllData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteMatch = async (id) => {
    if (!window.confirm('Are you sure you want to delete this match?')) return;
    try {
      await api.deleteMatch(token, id);
      toast.success('Match deleted');
      fetchAllData();
    } catch (err) {
      toast.error('Failed to delete match');
    }
  };

  const resetMatchForm = () => {
    setMatchForm({ player1_id: '', player2_id: '', result: '1-0', date: '', tournament_name: '' });
  };

  // News handlers
  const handleNewsSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.updateNews(token, editingItem.id, newsForm);
        toast.success('News updated!');
      } else {
        await api.createNews(token, newsForm);
        toast.success('News published!');
      }
      setNewsModalOpen(false);
      resetNewsForm();
      fetchAllData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteNews = async (id) => {
    if (!window.confirm('Are you sure you want to delete this news item?')) return;
    try {
      await api.deleteNews(token, id);
      toast.success('News deleted');
      fetchAllData();
    } catch (err) {
      toast.error('Failed to delete news');
    }
  };

  const resetNewsForm = () => {
    setNewsForm({ title: '', content: '', image_url: '' });
    setEditingItem(null);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="admin-dashboard">
      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Admin Dashboard</h1>
                <p className="text-xs text-neutral-400">Welcome, {admin?.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                  <Home className="w-4 h-4 mr-2" />
                  View Site
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="border-white/20"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Members', value: stats.members, icon: Users, color: 'violet' },
            { label: 'Tournaments', value: stats.tournaments, icon: Trophy, color: 'cyan' },
            { label: 'Matches', value: stats.matches, icon: Target, color: 'violet' },
            { label: 'News Posts', value: stats.news, icon: Newspaper, color: 'cyan' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4">
              <stat.icon className={`w-6 h-6 mb-2 ${stat.color === 'violet' ? 'text-violet-500' : 'text-cyan-500'}`} />
              <p className="text-2xl font-bold text-white mono">{loading ? '...' : stat.value}</p>
              <p className="text-xs text-neutral-400">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Refresh Ratings Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Button
            onClick={handleRefreshRatings}
            disabled={refreshingRatings}
            className="btn-primary"
            data-testid="refresh-ratings-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshingRatings ? 'animate-spin' : ''}`} />
            {refreshingRatings ? 'Refreshing Ratings...' : 'Refresh All Ratings from Chess.com'}
          </Button>
        </motion.div>

        {/* Content Tabs */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="glass rounded-full p-1 w-full sm:w-auto flex overflow-x-auto">
            <TabsTrigger value="members" className="rounded-full px-4 py-2 data-[state=active]:bg-violet-600 whitespace-nowrap">
              <Users className="w-4 h-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="rounded-full px-4 py-2 data-[state=active]:bg-violet-600 whitespace-nowrap">
              <Trophy className="w-4 h-4 mr-2" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger value="matches" className="rounded-full px-4 py-2 data-[state=active]:bg-violet-600 whitespace-nowrap">
              <Clock className="w-4 h-4 mr-2" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="news" className="rounded-full px-4 py-2 data-[state=active]:bg-violet-600 whitespace-nowrap">
              <Newspaper className="w-4 h-4 mr-2" />
              News
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Manage Members</h2>
              <Dialog open={memberModalOpen} onOpenChange={setMemberModalOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary" onClick={resetMemberForm} data-testid="add-member-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-white/10 sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Member' : 'Add New Member'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleMemberSubmit} className="space-y-4 mt-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={memberForm.name}
                        onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                        className="bg-white/5 border-white/10"
                        required
                        data-testid="member-name-input"
                      />
                    </div>
                    <div>
                      <Label>Department *</Label>
                      <Input
                        value={memberForm.department}
                        onChange={(e) => setMemberForm({ ...memberForm, department: e.target.value })}
                        className="bg-white/5 border-white/10"
                        placeholder="e.g., Computer Science"
                        required
                        data-testid="member-department-input"
                      />
                    </div>
                    <div>
                      <Label>Chess.com Username *</Label>
                      <Input
                        value={memberForm.chess_com_username}
                        onChange={(e) => setMemberForm({ ...memberForm, chess_com_username: e.target.value })}
                        className="bg-white/5 border-white/10"
                        required
                        data-testid="member-chesscom-input"
                      />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={memberForm.email}
                        onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                        className="bg-white/5 border-white/10"
                        required
                        data-testid="member-email-input"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={memberForm.phone}
                        onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                        className="bg-white/5 border-white/10"
                        data-testid="member-phone-input"
                      />
                    </div>
                    <Button type="submit" className="w-full btn-primary" data-testid="save-member-btn">
                      {editingItem ? 'Update Member' : 'Add Member'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                    <div className="h-12 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <Users className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-400">No members yet. Add your first member!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="glass-card rounded-xl p-4 flex items-center justify-between" data-testid={`member-row-${member.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center text-violet-400 font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{member.name}</p>
                        <p className="text-sm text-neutral-400">{member.department} • @{member.chess_com_username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm mono text-violet-400">{member.rapid_rating || '—'}</p>
                        <p className="text-xs text-neutral-500">Rapid</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingItem(member);
                          setMemberForm({
                            name: member.name,
                            department: member.department,
                            chess_com_username: member.chess_com_username,
                            email: member.email,
                            phone: member.phone || ''
                          });
                          setMemberModalOpen(true);
                        }}
                        data-testid={`edit-member-${member.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleDeleteMember(member.id)}
                        data-testid={`delete-member-${member.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Manage Tournaments</h2>
              <Dialog open={tournamentModalOpen} onOpenChange={setTournamentModalOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary" onClick={resetTournamentForm} data-testid="add-tournament-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tournament
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-white/10 sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Tournament' : 'Create Tournament'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTournamentSubmit} className="space-y-4 mt-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={tournamentForm.name}
                        onChange={(e) => setTournamentForm({ ...tournamentForm, name: e.target.value })}
                        className="bg-white/5 border-white/10"
                        required
                        data-testid="tournament-name-input"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={tournamentForm.description}
                        onChange={(e) => setTournamentForm({ ...tournamentForm, description: e.target.value })}
                        className="bg-white/5 border-white/10"
                        data-testid="tournament-description-input"
                      />
                    </div>
                    <div>
                      <Label>Start Date *</Label>
                      <Input
                        type="datetime-local"
                        value={tournamentForm.start_date}
                        onChange={(e) => setTournamentForm({ ...tournamentForm, start_date: e.target.value })}
                        className="bg-white/5 border-white/10"
                        required
                        data-testid="tournament-startdate-input"
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="datetime-local"
                        value={tournamentForm.end_date}
                        onChange={(e) => setTournamentForm({ ...tournamentForm, end_date: e.target.value })}
                        className="bg-white/5 border-white/10"
                        data-testid="tournament-enddate-input"
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select 
                        value={tournamentForm.status} 
                        onValueChange={(v) => setTournamentForm({ ...tournamentForm, status: v })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10" data-testid="tournament-status-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full btn-primary" data-testid="save-tournament-btn">
                      {editingItem ? 'Update Tournament' : 'Create Tournament'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                    <div className="h-16 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : tournaments.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <Trophy className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-400">No tournaments yet. Create your first tournament!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tournaments.map((tournament) => (
                  <div key={tournament.id} className="glass-card rounded-xl p-4 flex items-center justify-between" data-testid={`tournament-row-${tournament.id}`}>
                    <div>
                      <p className="font-medium text-white">{tournament.name}</p>
                      <p className="text-sm text-neutral-400">
                        {new Date(tournament.start_date).toLocaleDateString()} • 
                        <span className={`ml-2 ${
                          tournament.status === 'ongoing' ? 'text-green-400' :
                          tournament.status === 'completed' ? 'text-neutral-500' : 'text-violet-400'
                        }`}>
                          {tournament.status}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingItem(tournament);
                          setTournamentForm({
                            name: tournament.name,
                            description: tournament.description || '',
                            start_date: tournament.start_date ? new Date(tournament.start_date).toISOString().slice(0, 16) : '',
                            end_date: tournament.end_date ? new Date(tournament.end_date).toISOString().slice(0, 16) : '',
                            status: tournament.status,
                            participants: tournament.participants || []
                          });
                          setTournamentModalOpen(true);
                        }}
                        data-testid={`edit-tournament-${tournament.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400"
                        onClick={() => handleDeleteTournament(tournament.id)}
                        data-testid={`delete-tournament-${tournament.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Match History</h2>
              <Dialog open={matchModalOpen} onOpenChange={setMatchModalOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary" onClick={resetMatchForm} data-testid="add-match-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Record Match
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-white/10 sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record Match</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleMatchSubmit} className="space-y-4 mt-4">
                    <div>
                      <Label>Player 1 (White) *</Label>
                      <Select 
                        value={matchForm.player1_id} 
                        onValueChange={(v) => setMatchForm({ ...matchForm, player1_id: v })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10" data-testid="match-player1-select">
                          <SelectValue placeholder="Select player" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Player 2 (Black) *</Label>
                      <Select 
                        value={matchForm.player2_id} 
                        onValueChange={(v) => setMatchForm({ ...matchForm, player2_id: v })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10" data-testid="match-player2-select">
                          <SelectValue placeholder="Select player" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Result *</Label>
                      <Select 
                        value={matchForm.result} 
                        onValueChange={(v) => setMatchForm({ ...matchForm, result: v })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10" data-testid="match-result-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-0">1-0 (White wins)</SelectItem>
                          <SelectItem value="0-1">0-1 (Black wins)</SelectItem>
                          <SelectItem value="1/2-1/2">1/2-1/2 (Draw)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date *</Label>
                      <Input
                        type="datetime-local"
                        value={matchForm.date}
                        onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })}
                        className="bg-white/5 border-white/10"
                        required
                        data-testid="match-date-input"
                      />
                    </div>
                    <div>
                      <Label>Tournament (optional)</Label>
                      <Input
                        value={matchForm.tournament_name}
                        onChange={(e) => setMatchForm({ ...matchForm, tournament_name: e.target.value })}
                        className="bg-white/5 border-white/10"
                        placeholder="Tournament name"
                        data-testid="match-tournament-input"
                      />
                    </div>
                    <Button type="submit" className="w-full btn-primary" data-testid="save-match-btn">
                      Record Match
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                    <div className="h-12 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : matches.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <Clock className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-400">No matches recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <div key={match.id} className="glass-card rounded-xl p-4 flex items-center justify-between" data-testid={`match-row-${match.id}`}>
                    <div className="flex items-center gap-4">
                      <span className={match.result === '1-0' ? 'text-green-400' : match.result === '0-1' ? 'text-red-400' : 'text-neutral-400'}>
                        {match.player1_name || 'Player 1'}
                      </span>
                      <span className="px-3 py-1 rounded bg-white/5 font-mono text-white">{match.result}</span>
                      <span className={match.result === '0-1' ? 'text-green-400' : match.result === '1-0' ? 'text-red-400' : 'text-neutral-400'}>
                        {match.player2_name || 'Player 2'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-neutral-500">{new Date(match.date).toLocaleDateString()}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400"
                        onClick={() => handleDeleteMatch(match.id)}
                        data-testid={`delete-match-${match.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Manage News</h2>
              <Dialog open={newsModalOpen} onOpenChange={setNewsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary" onClick={resetNewsForm} data-testid="add-news-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add News
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-white/10 sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit News' : 'Publish News'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleNewsSubmit} className="space-y-4 mt-4">
                    <div>
                      <Label>Title *</Label>
                      <Input
                        value={newsForm.title}
                        onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                        className="bg-white/5 border-white/10"
                        required
                        data-testid="news-title-input"
                      />
                    </div>
                    <div>
                      <Label>Content *</Label>
                      <Textarea
                        value={newsForm.content}
                        onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                        className="bg-white/5 border-white/10 min-h-[150px]"
                        required
                        data-testid="news-content-input"
                      />
                    </div>
                    <div>
                      <Label>Image URL</Label>
                      <Input
                        value={newsForm.image_url}
                        onChange={(e) => setNewsForm({ ...newsForm, image_url: e.target.value })}
                        className="bg-white/5 border-white/10"
                        placeholder="https://..."
                        data-testid="news-image-input"
                      />
                    </div>
                    <Button type="submit" className="w-full btn-primary" data-testid="save-news-btn">
                      {editingItem ? 'Update News' : 'Publish News'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                    <div className="h-16 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <Newspaper className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-400">No news published yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {news.map((item) => (
                  <div key={item.id} className="glass-card rounded-xl p-4 flex items-center justify-between" data-testid={`news-row-${item.id}`}>
                    <div>
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-sm text-neutral-400 line-clamp-1">{item.content}</p>
                      <p className="text-xs text-neutral-500 mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingItem(item);
                          setNewsForm({
                            title: item.title,
                            content: item.content,
                            image_url: item.image_url || ''
                          });
                          setNewsModalOpen(true);
                        }}
                        data-testid={`edit-news-${item.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400"
                        onClick={() => handleDeleteNews(item.id)}
                        data-testid={`delete-news-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
