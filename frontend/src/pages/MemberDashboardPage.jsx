import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Crown, LogOut, Trophy, Clock, Target, Zap,
  TrendingUp, Award, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { ErrorState } from '../components/LoadingStates';

export default function MemberDashboardPage() {
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chessStats, setChessStats] = useState(null);

  const fetchMemberData = useCallback(async () => {
    const token = localStorage.getItem('memberToken');
    if (!token) {
      navigate('/member/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.getMemberMe(token);
      setMember(data);

      // Also fetch Chess.com stats
      if (data.chess_com_username) {
        const stats = await api.getChessComStats(data.chess_com_username);
        if (!stats.error) {
          setChessStats(stats.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching member data:', err);
      if (err.status === 401) {
        localStorage.removeItem('memberToken');
        localStorage.removeItem('memberData');
        navigate('/member/login');
        return;
      }
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchMemberData();
  }, [fetchMemberData]);

  const handleLogout = () => {
    localStorage.removeItem('memberToken');
    localStorage.removeItem('memberData');
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 bg-[#050505]" data-testid="member-dashboard-loading">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-white/5 rounded-2xl" />
            <div className="grid md:grid-cols-3 gap-6">
              <div className="h-40 bg-white/5 rounded-xl" />
              <div className="h-40 bg-white/5 rounded-xl" />
              <div className="h-40 bg-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-8 bg-[#050505]" data-testid="member-dashboard-error">
        <div className="max-w-6xl mx-auto px-4">
          <ErrorState
            message={error.message || "Failed to load your profile"}
            onRetry={fetchMemberData}
            isNetworkError={error.isNetworkError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-[#050505]" data-testid="member-dashboard-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 sm:p-8 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {member?.avatar_url ? (
                <img 
                  src={member.avatar_url} 
                  alt={member.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white">
                  {member?.name?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">{member?.name}</h1>
                <p className="text-violet-400">@{member?.chess_com_username}</p>
                <p className="text-sm text-neutral-400">{member?.department}</p>
              </div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Link to="/" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full border-white/20">
                  <Crown className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex-1 sm:flex-none border-white/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Rating Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-6"
        >
          {[
            { label: 'Rapid', icon: Clock, rating: member?.rapid_rating, key: 'chess_rapid', color: 'from-blue-500 to-cyan-500' },
            { label: 'Blitz', icon: Zap, rating: member?.blitz_rating, key: 'chess_blitz', color: 'from-yellow-500 to-orange-500' },
            { label: 'Bullet', icon: Target, rating: member?.bullet_rating, key: 'chess_bullet', color: 'from-red-500 to-pink-500' },
          ].map((type) => {
            const stats = chessStats?.[type.key];
            return (
              <div 
                key={type.label}
                className="glass-card rounded-xl p-4 sm:p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                    <type.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs text-neutral-500">{type.label}</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white mono mb-1">
                  {type.rating || '—'}
                </p>
                {stats?.record && (
                  <div className="text-xs text-neutral-400">
                    <span className="text-green-400">{stats.record.win}W</span>
                    {' / '}
                    <span className="text-red-400">{stats.record.loss}L</span>
                    {' / '}
                    <span className="text-neutral-400">{stats.record.draw}D</span>
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <Award className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-white">{member?.wins || 0}</p>
              <p className="text-xs text-neutral-400">Total Wins</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-white">{member?.losses || 0}</p>
              <p className="text-xs text-neutral-400">Total Losses</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <Target className="w-8 h-8 text-cyan-500" />
            <div>
              <p className="text-2xl font-bold text-white">{member?.draws || 0}</p>
              <p className="text-xs text-neutral-400">Total Draws</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-violet-500" />
            <div>
              <p className="text-2xl font-bold text-white">{member?.tournaments?.length || 0}</p>
              <p className="text-xs text-neutral-400">Tournaments</p>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Matches */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-xl p-4 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Matches</h2>
              <Link to="/tournaments" className="text-violet-400 hover:text-violet-300 text-sm flex items-center">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            {member?.match_history?.length > 0 ? (
              <div className="space-y-3">
                {member.match_history.slice(0, 5).map((match) => {
                  const isPlayer1 = match.player1_id === member.id;
                  const opponentName = isPlayer1 ? match.player2_name : match.player1_name;
                  const won = (isPlayer1 && match.result === '1-0') || (!isPlayer1 && match.result === '0-1');
                  const lost = (isPlayer1 && match.result === '0-1') || (!isPlayer1 && match.result === '1-0');
                  
                  return (
                    <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          won ? 'bg-green-500/20 text-green-400' : 
                          lost ? 'bg-red-500/20 text-red-400' : 
                          'bg-neutral-500/20 text-neutral-400'
                        }`}>
                          {won ? 'W' : lost ? 'L' : 'D'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">vs {opponentName}</p>
                          <p className="text-xs text-neutral-500">
                            {new Date(match.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-neutral-400 mono">{match.result}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm text-center py-8">No matches recorded yet</p>
            )}
          </motion.div>

          {/* Tournaments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-xl p-4 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Your Tournaments</h2>
              <Link to="/tournaments" className="text-violet-400 hover:text-violet-300 text-sm flex items-center">
                Browse <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            {member?.tournaments?.length > 0 ? (
              <div className="space-y-3">
                {member.tournaments.slice(0, 5).map((tournament) => (
                  <div key={tournament.id} className="p-3 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white">{tournament.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        tournament.status === 'ongoing' ? 'bg-green-500/20 text-green-400' :
                        tournament.status === 'completed' ? 'bg-neutral-500/20 text-neutral-400' :
                        'bg-violet-500/20 text-violet-400'
                      }`}>
                        {tournament.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {new Date(tournament.start_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm text-center py-8">No tournament participation yet</p>
            )}
          </motion.div>
        </div>

        {/* Profile Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 glass-card rounded-xl p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Profile Info</h2>
            {/* Could add edit functionality here */}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Email</p>
              <p className="text-white">{member?.email}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Phone</p>
              <p className="text-white">{member?.phone || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Chess.com Profile</p>
              <a 
                href={`https://www.chess.com/member/${member?.chess_com_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300"
              >
                @{member?.chess_com_username}
              </a>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-1">Member Since</p>
              <p className="text-white">
                {member?.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            {member?.bio && (
              <div className="sm:col-span-2">
                <p className="text-xs text-neutral-500 mb-1">Bio</p>
                <p className="text-neutral-300">{member.bio}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
