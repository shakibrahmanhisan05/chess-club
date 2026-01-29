import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Crown, Users, Trophy, Newspaper, ArrowRight, 
  Zap, Target, Star, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { SkeletonCard, SkeletonGrid, ErrorState } from '../components/LoadingStates';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function HomePage() {
  const [topPlayers, setTopPlayers] = useState([]);
  const [latestNews, setLatestNews] = useState([]);
  const [stats, setStats] = useState({ members: 0, tournaments: 0, matches: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [leaderboard, newsData, membersData, tournamentsData, matchesData] = await Promise.all([
        api.getLeaderboard('rapid', 5),
        api.getNews(1, 3),
        api.getMembers({ limit: 1 }),
        api.getTournaments({ limit: 1 }),
        api.getMatches({ limit: 1 })
      ]);
      setTopPlayers(leaderboard.leaderboard || []);
      setLatestNews(newsData.news || []);
      setStats({
        members: membersData.total || 0,
        tournaments: tournamentsData.total || 0,
        matches: matchesData.total || 0
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center hero-gradient chess-pattern overflow-hidden">
        {/* Floating Chess Pieces */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-[10%] text-violet-500/20 text-8xl"
          >
            ♔
          </motion.div>
          <motion.div
            animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-40 right-[15%] text-cyan-500/20 text-7xl"
          >
            ♕
          </motion.div>
          <motion.div
            animate={{ y: [-15, 15, -15] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-40 left-[20%] text-violet-500/10 text-6xl"
          >
            ♘
          </motion.div>
          <motion.div
            animate={{ y: [15, -15, 15] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-20 right-[25%] text-cyan-500/10 text-5xl"
          >
            ♗
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="max-w-3xl"
          >
            <motion.div variants={fadeUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-violet-400">
                <Zap className="w-4 h-4" />
                Welcome to CU EChess Society
              </span>
            </motion.div>

            <motion.h1 
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight"
            >
              <span className="text-white">Chittagong University</span>
              <br />
              <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
                EChess Society
              </span>
            </motion.h1>

            <motion.p 
              variants={fadeUp}
              className="text-lg sm:text-xl text-neutral-400 mb-8 max-w-xl"
            >
              Join the elite chess community. Compete, learn, and grow with fellow 
              chess enthusiasts from Chittagong University.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <Link to="/leaderboard" data-testid="hero-leaderboard-btn">
                <Button className="btn-primary group">
                  View Leaderboard
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/members" data-testid="hero-members-btn">
                <Button className="btn-secondary">
                  Explore Members
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {[
              { label: 'Members', value: stats.members, icon: Users, color: 'violet' },
              { label: 'Tournaments', value: stats.tournaments, icon: Trophy, color: 'cyan' },
              { label: 'Matches Played', value: stats.matches, icon: Target, color: 'violet' },
              { label: 'Active Players', value: stats.members, icon: Star, color: 'cyan' },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card rounded-2xl p-6 card-hover"
                data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}
              >
                <stat.icon className={`w-8 h-8 mb-4 ${stat.color === 'violet' ? 'text-violet-500' : 'text-cyan-500'}`} />
                {loading ? (
                  <div className="h-10 w-16 bg-white/10 rounded animate-pulse mb-1" />
                ) : (
                  <p className="text-3xl sm:text-4xl font-bold text-white mb-1 mono">
                    {stat.value}
                  </p>
                )}
                <p className="text-sm text-neutral-400">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400">
                  {error.message || "Failed to load some data. Please try again."}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchData}
                className="text-red-400 hover:text-red-300"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Top Players Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Top Ranked Players</h2>
              <p className="text-neutral-400">Live rankings from Chess.com</p>
            </div>
            <Link to="/leaderboard" data-testid="view-all-leaderboard">
              <Button variant="ghost" className="text-violet-400 hover:text-violet-300">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </motion.div>

          <div className="space-y-4">
            {loading ? (
              // Loading skeletons
              Array(5).fill(0).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            ) : topPlayers.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <Users className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-400">No players yet. Add members to see rankings!</p>
              </div>
            ) : (
              topPlayers.map((player, idx) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link 
                    to={`/members/${player.id}`}
                    className="glass-card rounded-xl p-4 flex items-center gap-4 card-hover block"
                    data-testid={`top-player-${idx + 1}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                      idx === 0 ? 'bg-gradient-to-br from-yellow-500 to-amber-600 text-black' :
                      idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                      idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-black' :
                      'bg-white/10 text-white'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{player.name}</h3>
                      <p className="text-sm text-neutral-400 truncate">{player.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold mono text-violet-400">
                        {player.rapid_rating || '—'}
                      </p>
                      <p className="text-xs text-neutral-500">Rapid</p>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Latest News Section */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Latest News</h2>
              <p className="text-neutral-400">Updates and announcements</p>
            </div>
            <Link to="/news" data-testid="view-all-news">
              <Button variant="ghost" className="text-violet-400 hover:text-violet-300">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {loading ? (
              // Loading skeletons
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-40 bg-white/10" />
                  <div className="p-6">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/10 rounded w-full mb-1" />
                    <div className="h-3 bg-white/10 rounded w-2/3" />
                  </div>
                </div>
              ))
            ) : latestNews.length === 0 ? (
              <div className="md:col-span-3 glass-card rounded-2xl p-8 text-center">
                <Newspaper className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-400">No news yet. Check back later!</p>
              </div>
            ) : (
              latestNews.map((news, idx) => (
                <motion.div
                  key={news.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card rounded-2xl overflow-hidden card-hover group"
                  data-testid={`news-card-${idx}`}
                >
                  <div className="h-40 bg-gradient-to-br from-violet-600/20 to-cyan-600/20 relative">
                    {news.image_url && (
                      <img 
                        src={news.image_url} 
                        alt={news.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 news-card-overlay" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold text-white mb-2 group-hover:text-violet-400 transition-colors line-clamp-2">
                      {news.title}
                    </h3>
                    <p className="text-sm text-neutral-400 line-clamp-2">{news.content}</p>
                    <p className="text-xs text-neutral-500 mt-4">
                      {new Date(news.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="gradient-border rounded-3xl overflow-hidden"
          >
            <div className="bg-[#0a0a0a] p-8 sm:p-12 lg:p-16 text-center">
              <Crown className="w-16 h-16 text-violet-500 mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                Ready to Join the Battle?
              </h2>
              <p className="text-neutral-400 mb-8 max-w-xl mx-auto">
                Connect with fellow chess players, participate in tournaments, and climb the leaderboard.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/member/register" data-testid="cta-join">
                  <Button className="btn-primary">
                    Join Now
                  </Button>
                </Link>
                <Link to="/about" data-testid="cta-learn-more">
                  <Button className="btn-secondary">
                    Learn More About Us
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
