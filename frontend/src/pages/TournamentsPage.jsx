import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Users, Clock, CheckCircle, PlayCircle, Circle, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { ErrorState, EmptyState, SkeletonCard } from '../components/LoadingStates';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tournamentsData, matchesData] = await Promise.all([
        api.getTournaments(),
        api.getMatches()
      ]);
      setTournaments(tournamentsData.tournaments || tournamentsData || []);
      setMatches(matchesData.matches || matchesData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTournaments = filter === 'all' 
    ? tournaments 
    : tournaments.filter(t => t.status === filter);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ongoing': return <PlayCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ongoing': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'completed': return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
      default: return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    }
  };

  return (
    <div className="min-h-screen py-8 sm:py-20" data-testid="tournaments-page">
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
                <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Tournaments</h1>
                <p className="text-sm sm:text-base text-neutral-400">Club events and competitions</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
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
            message={error.message || "Failed to load tournaments"} 
            onRetry={fetchData}
            isNetworkError={error.isNetworkError}
            className="mb-8"
          />
        )}

        {!error && (
          <Tabs defaultValue="tournaments" className="space-y-6 sm:space-y-8">
            <TabsList className="glass rounded-full p-1 w-full sm:w-auto flex">
              <TabsTrigger
                value="tournaments"
                className="flex-1 sm:flex-none rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                data-testid="tab-tournaments"
              >
                <Trophy className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Tournaments</span>
                <span className="sm:hidden">Events</span>
              </TabsTrigger>
              <TabsTrigger
                value="matches"
                className="flex-1 sm:flex-none rounded-full px-4 sm:px-6 py-2 text-sm sm:text-base data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                data-testid="tab-matches"
              >
                <Clock className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Match History</span>
                <span className="sm:hidden">Matches</span>
              </TabsTrigger>
            </TabsList>

            {/* Tournaments Tab */}
            <TabsContent value="tournaments">
              {/* Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 mb-6 sm:mb-8"
              >
                {['all', 'upcoming', 'ongoing', 'completed'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                      filter === f 
                        ? 'bg-violet-600 text-white' 
                        : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                    }`}
                    data-testid={`filter-${f}`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </motion.div>

              {/* Tournaments Grid */}
              {loading ? (
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 animate-pulse">
                      <div className="h-5 sm:h-6 bg-white/5 rounded w-2/3 mb-4" />
                      <div className="h-3 sm:h-4 bg-white/5 rounded w-full mb-2" />
                      <div className="h-3 sm:h-4 bg-white/5 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : filteredTournaments.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="No Tournaments"
                  description={filter === 'all' 
                    ? 'No tournaments have been scheduled yet' 
                    : `No ${filter} tournaments`}
                />
              ) : (
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  {filteredTournaments.map((tournament, idx) => (
                    <motion.div
                      key={tournament.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 card-hover"
                      data-testid={`tournament-card-${tournament.id}`}
                    >
                      <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                        <h3 className="text-lg sm:text-xl font-bold text-white line-clamp-1">{tournament.name}</h3>
                        <Badge className={`${getStatusColor(tournament.status)} border shrink-0`}>
                          {getStatusIcon(tournament.status)}
                          <span className="ml-1 capitalize text-xs sm:text-sm">{tournament.status}</span>
                        </Badge>
                      </div>

                      {tournament.description && (
                        <p className="text-sm text-neutral-400 mb-3 sm:mb-4 line-clamp-2">{tournament.description}</p>
                      )}

                      <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-neutral-400">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{tournament.participants?.length || 0} participants</span>
                        </div>
                      </div>
                      
                      {tournament.format && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <span className="text-xs text-violet-400 capitalize">Format: {tournament.format}</span>
                          {tournament.rounds && (
                            <span className="text-xs text-neutral-500 ml-3">{tournament.rounds} rounds</span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Matches Tab */}
            <TabsContent value="matches">
              {loading ? (
                <div className="space-y-3 sm:space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : matches.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No Matches Recorded"
                  description="Match history will appear here"
                />
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {matches.map((match, idx) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass-card rounded-xl p-3 sm:p-4"
                      data-testid={`match-${match.id}`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
                        {/* Players */}
                        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                          <div className="flex-1 text-right min-w-0">
                            <p className={`font-semibold text-sm sm:text-base truncate ${
                              match.result === '1-0' ? 'text-green-400' : 
                              match.result === '0-1' ? 'text-red-400' : 'text-neutral-400'
                            }`}>
                              {match.player1_name || 'Player 1'}
                            </p>
                          </div>
                          
                          <div className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg bg-white/5 shrink-0">
                            <span className="font-bold mono text-sm sm:text-base text-white">{match.result}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm sm:text-base truncate ${
                              match.result === '0-1' ? 'text-green-400' : 
                              match.result === '1-0' ? 'text-red-400' : 'text-neutral-400'
                            }`}>
                              {match.player2_name || 'Player 2'}
                            </p>
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="text-right text-xs sm:text-sm text-neutral-500 shrink-0">
                          <p>{new Date(match.date).toLocaleDateString()}</p>
                          {match.tournament_name && (
                            <p className="text-violet-400 truncate max-w-[120px] sm:max-w-none">{match.tournament_name}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
