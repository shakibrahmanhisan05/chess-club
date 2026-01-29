import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Users, Trophy, Target, TrendingUp, 
  RefreshCw, Award, Building, Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { ErrorState } from '../components/LoadingStates';

export default function StatisticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStatistics();
      setStats(data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getRatingBarWidth = (count, maxCount) => {
    if (!maxCount || !count) return '0%';
    return `${(count / maxCount) * 100}%`;
  };

  const getMaxRatingCount = () => {
    if (!stats?.rating_distribution?.rapid) return 0;
    return Math.max(...Object.values(stats.rating_distribution.rapid));
  };

  return (
    <div className="min-h-screen py-8 sm:py-20" data-testid="statistics-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Club Statistics</h1>
                <p className="text-sm sm:text-base text-neutral-400">Insights and analytics</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
              className="rounded-full border-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <ErrorState 
            message={error.message || "Failed to load statistics"} 
            onRetry={fetchStats}
            isNetworkError={error.isNetworkError}
            className="mb-8"
          />
        )}

        {/* Loading State */}
        {loading && !stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-6 animate-pulse">
                <div className="h-8 w-8 bg-white/5 rounded mb-4" />
                <div className="h-8 w-16 bg-white/5 rounded mb-2" />
                <div className="h-4 w-24 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Stats Content */}
        {stats && (
          <>
            {/* Overview Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
            >
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <Users className="w-8 h-8 text-violet-500 mb-4" />
                <p className="text-2xl sm:text-3xl font-bold text-white mono">{stats.overview?.total_members || 0}</p>
                <p className="text-sm text-neutral-400">Total Members</p>
              </div>
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <Trophy className="w-8 h-8 text-yellow-500 mb-4" />
                <p className="text-2xl sm:text-3xl font-bold text-white mono">{stats.overview?.total_tournaments || 0}</p>
                <p className="text-sm text-neutral-400">Tournaments</p>
              </div>
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <Target className="w-8 h-8 text-cyan-500 mb-4" />
                <p className="text-2xl sm:text-3xl font-bold text-white mono">{stats.overview?.total_matches || 0}</p>
                <p className="text-sm text-neutral-400">Matches Played</p>
              </div>
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <TrendingUp className="w-8 h-8 text-green-500 mb-4" />
                <p className="text-2xl sm:text-3xl font-bold text-white mono">{stats.overview?.average_rapid_rating || 0}</p>
                <p className="text-sm text-neutral-400">Avg Rapid Rating</p>
              </div>
            </motion.div>

            {/* Highest Ratings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8"
            >
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-white">Highest Rapid Rating</h3>
                </div>
                <p className="text-4xl font-bold text-white mono">{stats.overview?.highest_rapid || '—'}</p>
              </div>
              <div className="glass-card rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-6 h-6 text-orange-500" />
                  <h3 className="text-lg font-semibold text-white">Highest Blitz Rating</h3>
                </div>
                <p className="text-4xl font-bold text-white mono">{stats.overview?.highest_blitz || '—'}</p>
              </div>
            </motion.div>

            {/* Rating Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card rounded-xl p-4 sm:p-6 mb-8"
            >
              <h3 className="text-lg font-semibold text-white mb-6">Rating Distribution (Rapid)</h3>
              <div className="space-y-4">
                {stats.rating_distribution?.rapid && Object.entries(stats.rating_distribution.rapid).map(([range, count]) => (
                  <div key={range} className="flex items-center gap-4">
                    <span className="text-sm text-neutral-400 w-24 sm:w-32 shrink-0">{range}</span>
                    <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: getRatingBarWidth(count, getMaxRatingCount()) }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full bg-gradient-to-r from-violet-600 to-cyan-500"
                      />
                    </div>
                    <span className="text-sm font-medium text-white w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Department Distribution */}
            {stats.departments && Object.keys(stats.departments).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card rounded-xl p-4 sm:p-6 mb-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Building className="w-6 h-6 text-violet-500" />
                  <h3 className="text-lg font-semibold text-white">Members by Department</h3>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(stats.departments)
                    .sort((a, b) => b[1] - a[1])
                    .map(([dept, count]) => (
                      <div key={dept} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <span className="text-sm text-neutral-300 truncate mr-3">{dept}</span>
                        <span className="text-sm font-medium text-white shrink-0">{count}</span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* Most Active Members */}
            {stats.most_active && stats.most_active.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-card rounded-xl p-4 sm:p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                  <h3 className="text-lg font-semibold text-white">Most Active Members</h3>
                </div>
                <div className="space-y-3">
                  {stats.most_active.map((member, idx) => {
                    const totalGames = (member.wins || 0) + (member.losses || 0) + (member.draws || 0);
                    return (
                      <div key={member.id || idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-white">{member.name || 'Unknown'}</p>
                            <p className="text-xs text-neutral-500">{member.department}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">{totalGames} games</p>
                          <p className="text-xs text-neutral-500">
                            <span className="text-green-400">{member.wins || 0}W</span>
                            {' / '}
                            <span className="text-red-400">{member.losses || 0}L</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
