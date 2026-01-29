import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Trophy, Target, Zap, Clock, 
  ExternalLink, Mail, Phone, Star, TrendingUp, 
  Award, Calendar, Gamepad2, Sword
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { api } from '../lib/api';
import { PageLoader, ErrorState, SkeletonCard } from '../components/LoadingStates';

export default function MemberProfilePage() {
  const { memberId } = useParams();
  const [member, setMember] = useState(null);
  const [chessComData, setChessComData] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chessComLoading, setChessComLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMember = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getMember(memberId);
        setMember(data);
        
        // Fetch Chess.com data in parallel
        if (data.chess_com_username) {
          fetchChessComData(data.chess_com_username);
        }
      } catch (err) {
        console.error('Error fetching member:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [memberId]);

  const fetchChessComData = async (username) => {
    setChessComLoading(true);
    try {
      const [statsData, gamesData] = await Promise.all([
        api.getChessComStats(username),
        api.getChessComGames(username)
      ]);
      setChessComData(statsData);
      setRecentGames(gamesData.games?.slice(0, 10) || []);
    } catch (err) {
      console.error('Error fetching Chess.com data:', err);
    } finally {
      setChessComLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    if (!rating) return 'text-neutral-500';
    if (rating >= 2000) return 'text-red-400';
    if (rating >= 1800) return 'text-orange-400';
    if (rating >= 1600) return 'text-yellow-400';
    if (rating >= 1400) return 'text-green-400';
    if (rating >= 1200) return 'text-cyan-400';
    return 'text-neutral-400';
  };

  const getRatingTier = (rating) => {
    if (!rating) return 'Unrated';
    if (rating >= 2200) return 'Master';
    if (rating >= 2000) return 'Expert';
    if (rating >= 1800) return 'Class A';
    if (rating >= 1600) return 'Class B';
    if (rating >= 1400) return 'Class C';
    if (rating >= 1200) return 'Class D';
    return 'Beginner';
  };

  const formatGameResult = (game, username) => {
    const isWhite = game.white?.username?.toLowerCase() === username.toLowerCase();
    const result = isWhite ? game.white?.result : game.black?.result;
    if (result === 'win') return { text: 'Won', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (result === 'checkmated' || result === 'timeout' || result === 'resigned' || result === 'abandoned') 
      return { text: 'Lost', color: 'text-red-400', bg: 'bg-red-500/20' };
    return { text: 'Draw', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
  };

  if (loading) {
    return <PageLoader message="Loading member profile..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/members" className="inline-flex items-center text-neutral-400 hover:text-white mb-8">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Members
          </Link>
          <ErrorState 
            message={error.message || "Failed to load member profile"} 
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  if (!member) return null;

  const winRate = member.wins + member.losses + member.draws > 0
    ? Math.round((member.wins / (member.wins + member.losses + member.draws)) * 100)
    : 0;

  return (
    <div className="min-h-screen py-8" data-testid="member-profile-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link 
          to="/members" 
          className="inline-flex items-center text-neutral-400 hover:text-white mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Members
        </Link>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 sm:p-8 mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            {member.avatar_url ? (
              <img 
                src={member.avatar_url} 
                alt={member.name}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover mx-auto sm:mx-0"
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-4xl font-bold text-white mx-auto sm:mx-0">
                {member.name.charAt(0)}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{member.name}</h1>
              <p className="text-neutral-400 mb-2">{member.department}</p>
              
              <a 
                href={`https://chess.com/member/${member.chess_com_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors"
              >
                @{member.chess_com_username}
                <ExternalLink className="w-4 h-4" />
              </a>

              {member.bio && (
                <p className="mt-4 text-neutral-300">{member.bio}</p>
              )}

              <div className="flex flex-wrap gap-4 mt-4 justify-center sm:justify-start">
                {member.email && (
                  <a 
                    href={`mailto:${member.email}`}
                    className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
                  >
                    <Mail className="w-4 h-4" />
                    {member.email}
                  </a>
                )}
                {member.phone && (
                  <span className="flex items-center gap-2 text-sm text-neutral-400">
                    <Phone className="w-4 h-4" />
                    {member.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="text-center p-4 rounded-xl bg-white/5">
              <p className={`text-2xl sm:text-3xl font-bold mono ${getRatingColor(member.rapid_rating)}`}>
                {member.rapid_rating || '—'}
              </p>
              <p className="text-sm text-neutral-400">Rapid</p>
              <p className="text-xs text-neutral-500">{getRatingTier(member.rapid_rating)}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5">
              <p className={`text-2xl sm:text-3xl font-bold mono ${getRatingColor(member.blitz_rating)}`}>
                {member.blitz_rating || '—'}
              </p>
              <p className="text-sm text-neutral-400">Blitz</p>
              <p className="text-xs text-neutral-500">{getRatingTier(member.blitz_rating)}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5">
              <p className={`text-2xl sm:text-3xl font-bold mono ${getRatingColor(member.bullet_rating)}`}>
                {member.bullet_rating || '—'}
              </p>
              <p className="text-sm text-neutral-400">Bullet</p>
              <p className="text-xs text-neutral-500">{getRatingTier(member.bullet_rating)}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5">
              <p className="text-2xl sm:text-3xl font-bold mono text-white">{winRate}%</p>
              <p className="text-sm text-neutral-400">Win Rate</p>
              <p className="text-xs text-neutral-500">{member.wins}W {member.losses}L {member.draws}D</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="glass rounded-full p-1 w-full flex">
            <TabsTrigger value="stats" className="flex-1 rounded-full data-[state=active]:bg-violet-600">
              <Trophy className="w-4 h-4 mr-2" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex-1 rounded-full data-[state=active]:bg-violet-600">
              <Sword className="w-4 h-4 mr-2" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="games" className="flex-1 rounded-full data-[state=active]:bg-violet-600">
              <Gamepad2 className="w-4 h-4 mr-2" />
              Games
            </TabsTrigger>
          </TabsList>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Chess.com Stats */}
              {chessComLoading ? (
                <div className="space-y-4">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : chessComData?.stats ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Rapid Stats */}
                  {chessComData.stats.chess_rapid && (
                    <div className="glass-card rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-6 h-6 text-violet-400" />
                        <h3 className="text-lg font-semibold text-white">Rapid</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Current Rating</span>
                          <span className={`font-bold mono ${getRatingColor(chessComData.stats.chess_rapid.last?.rating)}`}>
                            {chessComData.stats.chess_rapid.last?.rating || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Best Rating</span>
                          <span className="font-bold mono text-yellow-400">
                            {chessComData.stats.chess_rapid.best?.rating || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Games Played</span>
                          <span className="font-bold mono text-white">
                            {(chessComData.stats.chess_rapid.record?.win || 0) + 
                             (chessComData.stats.chess_rapid.record?.loss || 0) + 
                             (chessComData.stats.chess_rapid.record?.draw || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Blitz Stats */}
                  {chessComData.stats.chess_blitz && (
                    <div className="glass-card rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Zap className="w-6 h-6 text-cyan-400" />
                        <h3 className="text-lg font-semibold text-white">Blitz</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Current Rating</span>
                          <span className={`font-bold mono ${getRatingColor(chessComData.stats.chess_blitz.last?.rating)}`}>
                            {chessComData.stats.chess_blitz.last?.rating || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Best Rating</span>
                          <span className="font-bold mono text-yellow-400">
                            {chessComData.stats.chess_blitz.best?.rating || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Games Played</span>
                          <span className="font-bold mono text-white">
                            {(chessComData.stats.chess_blitz.record?.win || 0) + 
                             (chessComData.stats.chess_blitz.record?.loss || 0) + 
                             (chessComData.stats.chess_blitz.record?.draw || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-card rounded-xl p-8 text-center">
                  <Star className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-400">Chess.com stats not available</p>
                </div>
              )}

              {/* Additional Info */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Player Info</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {member.favorite_opening && (
                    <div>
                      <p className="text-sm text-neutral-400">Favorite Opening</p>
                      <p className="text-white">{member.favorite_opening}</p>
                    </div>
                  )}
                  {member.playing_style && (
                    <div>
                      <p className="text-sm text-neutral-400">Playing Style</p>
                      <p className="text-white">{member.playing_style}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-neutral-400">Member Since</p>
                    <p className="text-white">{new Date(member.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400">Last Updated</p>
                    <p className="text-white">{new Date(member.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Club Matches Tab */}
          <TabsContent value="matches">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {member.recent_matches && member.recent_matches.length > 0 ? (
                <div className="space-y-3">
                  {member.recent_matches.map((match) => {
                    const isPlayer1 = match.player1_id === memberId;
                    const opponentName = isPlayer1 ? match.player2_name : match.player1_name;
                    const isWin = (isPlayer1 && match.result === '1-0') || (!isPlayer1 && match.result === '0-1');
                    const isDraw = match.result === '1/2-1/2';
                    
                    return (
                      <div key={match.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isWin ? 'bg-green-500/20 text-green-400' :
                            isDraw ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {isWin ? 'W' : isDraw ? 'D' : 'L'}
                          </div>
                          <div>
                            <p className="text-white font-medium">vs {opponentName || 'Unknown'}</p>
                            <p className="text-sm text-neutral-400">
                              {match.tournament_name || 'Club Match'} • {new Date(match.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded bg-white/5 font-mono text-white">
                          {match.result}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-card rounded-xl p-8 text-center">
                  <Sword className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-400">No club matches recorded yet</p>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Chess.com Games Tab */}
          <TabsContent value="games">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {chessComLoading ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : recentGames.length > 0 ? (
                <div className="space-y-3">
                  {recentGames.map((game, idx) => {
                    const result = formatGameResult(game, member.chess_com_username);
                    const isWhite = game.white?.username?.toLowerCase() === member.chess_com_username.toLowerCase();
                    const opponent = isWhite ? game.black : game.white;
                    
                    return (
                      <a
                        key={idx}
                        href={game.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-card rounded-xl p-4 flex items-center justify-between card-hover block"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${result.bg} ${result.color}`}>
                            {result.text.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              vs {opponent?.username || 'Unknown'} 
                              <span className="text-neutral-500 ml-2">({opponent?.rating || '?'})</span>
                            </p>
                            <p className="text-sm text-neutral-400">
                              {game.time_class} • {new Date(game.end_time * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded ${result.bg} ${result.color}`}>
                            {result.text}
                          </span>
                          <ExternalLink className="w-4 h-4 text-neutral-500" />
                        </div>
                      </a>
                    );
                  })}
                  
                  <a
                    href={`https://www.chess.com/member/${member.chess_com_username}/games`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center py-4 text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    View all games on Chess.com
                    <ExternalLink className="w-4 h-4 inline ml-2" />
                  </a>
                </div>
              ) : (
                <div className="glass-card rounded-xl p-8 text-center">
                  <Gamepad2 className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-400">No recent games found</p>
                  <a
                    href={`https://www.chess.com/member/${member.chess_com_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 text-violet-400 hover:text-violet-300"
                  >
                    View profile on Chess.com
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
