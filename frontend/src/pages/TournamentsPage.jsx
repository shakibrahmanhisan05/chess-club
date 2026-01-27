import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Users, Clock, CheckCircle, PlayCircle, Circle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { api } from '../lib/api';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tournamentsData, matchesData] = await Promise.all([
          api.getTournaments(),
          api.getMatches()
        ]);
        setTournaments(tournamentsData);
        setMatches(matchesData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
    <div className="min-h-screen py-20" data-testid="tournaments-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Tournaments</h1>
              <p className="text-neutral-400">Club events and competitions</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="tournaments" className="space-y-8">
          <TabsList className="glass rounded-full p-1">
            <TabsTrigger
              value="tournaments"
              className="rounded-full px-6 py-2 data-[state=active]:bg-violet-600 data-[state=active]:text-white"
              data-testid="tab-tournaments"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Tournaments
            </TabsTrigger>
            <TabsTrigger
              value="matches"
              className="rounded-full px-6 py-2 data-[state=active]:bg-violet-600 data-[state=active]:text-white"
              data-testid="tab-matches"
            >
              <Clock className="w-4 h-4 mr-2" />
              Match History
            </TabsTrigger>
          </TabsList>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments">
            {/* Filter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 mb-8"
            >
              {['all', 'upcoming', 'ongoing', 'completed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
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
              <div className="grid md:grid-cols-2 gap-6">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
                    <div className="h-6 bg-white/5 rounded w-2/3 mb-4" />
                    <div className="h-4 bg-white/5 rounded w-full mb-2" />
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : filteredTournaments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card rounded-2xl p-12 text-center"
              >
                <Trophy className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Tournaments</h3>
                <p className="text-neutral-400">
                  {filter === 'all' 
                    ? 'No tournaments have been scheduled yet' 
                    : `No ${filter} tournaments`}
                </p>
              </motion.div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredTournaments.map((tournament, idx) => (
                  <motion.div
                    key={tournament.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-card rounded-2xl p-6 card-hover"
                    data-testid={`tournament-card-${tournament.id}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">{tournament.name}</h3>
                      <Badge className={`${getStatusColor(tournament.status)} border`}>
                        {getStatusIcon(tournament.status)}
                        <span className="ml-1 capitalize">{tournament.status}</span>
                      </Badge>
                    </div>

                    {tournament.description && (
                      <p className="text-neutral-400 mb-4 line-clamp-2">{tournament.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{tournament.participants?.length || 0} participants</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches">
            {loading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                    <div className="h-16 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : matches.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card rounded-2xl p-12 text-center"
              >
                <Clock className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Matches Recorded</h3>
                <p className="text-neutral-400">Match history will appear here</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {matches.map((match, idx) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass-card rounded-xl p-4"
                    data-testid={`match-${match.id}`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      {/* Players */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-1 text-right">
                          <p className={`font-semibold truncate ${
                            match.result === '1-0' ? 'text-green-400' : 
                            match.result === '0-1' ? 'text-red-400' : 'text-neutral-400'
                          }`}>
                            {match.player1_name || 'Player 1'}
                          </p>
                        </div>
                        
                        <div className="px-4 py-2 rounded-lg bg-white/5">
                          <span className="font-bold mono text-white">{match.result}</span>
                        </div>
                        
                        <div className="flex-1">
                          <p className={`font-semibold truncate ${
                            match.result === '0-1' ? 'text-green-400' : 
                            match.result === '1-0' ? 'text-red-400' : 'text-neutral-400'
                          }`}>
                            {match.player2_name || 'Player 2'}
                          </p>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="text-right text-sm text-neutral-500">
                        <p>{new Date(match.date).toLocaleDateString()}</p>
                        {match.tournament_name && (
                          <p className="text-violet-400">{match.tournament_name}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
