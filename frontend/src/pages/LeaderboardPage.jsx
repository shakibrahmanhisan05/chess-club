import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Clock, Zap, Target, RefreshCw, Crown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { ErrorState, EmptyState } from '../components/LoadingStates';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeControl, setTimeControl] = useState('rapid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async (tc) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLeaderboard(tc);
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(timeControl);
  }, [timeControl, fetchLeaderboard]);

  const getRatingColor = (rating) => {
    if (!rating) return 'text-neutral-500';
    if (rating >= 2000) return 'text-red-500';
    if (rating >= 1800) return 'text-orange-500';
    if (rating >= 1600) return 'text-yellow-500';
    if (rating >= 1400) return 'text-green-500';
    return 'text-cyan-500';
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-500 to-amber-600 text-black';
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-black';
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-700 text-black';
    return 'bg-white/10 text-white';
  };

  const timeControls = [
    { value: 'rapid', label: 'Rapid', icon: Clock, description: '15+ min games' },
    { value: 'blitz', label: 'Blitz', icon: Zap, description: '3-5 min games' },
    { value: 'bullet', label: 'Bullet', icon: Target, description: '1-2 min games' },
  ];

  return (
    <div className="min-h-screen py-8 sm:py-20" data-testid="leaderboard-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-10"
        >
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Leaderboard</h1>
              <p className="text-sm sm:text-base text-neutral-400">Live rankings from Chess.com</p>
            </div>
          </div>
        </motion.div>

        {/* Time Control Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={timeControl} onValueChange={setTimeControl} className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList className="glass rounded-full p-1 flex-wrap">
                {timeControls.map((tc) => (
                  <TabsTrigger
                    key={tc.value}
                    value={tc.value}
                    className="rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                    data-testid={`tab-${tc.value}`}
                  >
                    <tc.icon className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{tc.label}</span>
                    <span className="sm:hidden">{tc.label.substring(0, 3)}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLeaderboard(timeControl)}
                disabled={loading}
                className="rounded-full border-white/20 w-full sm:w-auto"
                data-testid="refresh-leaderboard"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Error State */}
            {error && (
              <div className="mt-8">
                <ErrorState 
                  message={error.message || "Failed to load leaderboard"} 
                  onRetry={() => fetchLeaderboard(timeControl)}
                  isNetworkError={error.isNetworkError}
                />
              </div>
            )}

            {/* Leaderboard Content */}
            {!error && timeControls.map((tc) => (
              <TabsContent key={tc.value} value={tc.value} className="mt-6 sm:mt-8">
                {loading ? (
                  <div className="space-y-3 sm:space-y-4">
                    {Array(10).fill(0).map((_, i) => (
                      <div key={i} className="glass-card rounded-xl p-3 sm:p-4 animate-pulse">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/5" />
                          <div className="flex-1">
                            <div className="h-4 sm:h-5 bg-white/5 rounded w-1/3 mb-2" />
                            <div className="h-3 sm:h-4 bg-white/5 rounded w-1/4" />
                          </div>
                          <div className="h-6 sm:h-8 w-16 sm:w-20 bg-white/5 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : leaderboard.length === 0 ? (
                  <EmptyState
                    icon={Crown}
                    title="No Rankings Yet"
                    description="Add members with Chess.com usernames to see the leaderboard"
                  />
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {leaderboard.map((player, idx) => {
                      const ratingKey = `${tc.value}_rating`;
                      const rating = player[ratingKey];
                      
                      return (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          <Link
                            to={`/members/${player.id}`}
                            className="glass-card rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 card-hover block group"
                            data-testid={`leaderboard-row-${idx + 1}`}
                          >
                            {/* Rank */}
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-base sm:text-lg ${getRankStyle(player.rank)}`}>
                              {player.rank}
                            </div>

                            {/* Player Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base text-white group-hover:text-violet-400 transition-colors truncate">
                                {player.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-neutral-400 truncate">{player.department}</p>
                            </div>

                            {/* Chess.com username */}
                            <div className="hidden md:block text-xs sm:text-sm text-cyan-400">
                              @{player.chess_com_username}
                            </div>

                            {/* Rating */}
                            <div className="text-right">
                              <p className={`text-xl sm:text-2xl font-bold mono ${getRatingColor(rating)}`}>
                                {rating || '—'}
                              </p>
                              <p className="text-xs text-neutral-500">Elo</p>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 sm:mt-12 glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6"
        >
          <h3 className="font-semibold text-white mb-4">Rating Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            {[
              { range: '2000+', color: 'text-red-500', label: 'Master' },
              { range: '1800-1999', color: 'text-orange-500', label: 'Expert' },
              { range: '1600-1799', color: 'text-yellow-500', label: 'Class A' },
              { range: '1400-1599', color: 'text-green-500', label: 'Class B' },
              { range: '<1400', color: 'text-cyan-500', label: 'Class C' },
            ].map((cat) => (
              <div key={cat.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${cat.color.replace('text-', 'bg-')}`} />
                <div>
                  <p className={`font-medium text-sm sm:text-base ${cat.color}`}>{cat.label}</p>
                  <p className="text-xs text-neutral-500">{cat.range}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
