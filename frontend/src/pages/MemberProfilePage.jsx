import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, ExternalLink, Trophy, Clock, Zap, Target, 
  Mail, Phone, Building 
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';

export default function MemberProfilePage() {
  const { memberId } = useParams();
  const [member, setMember] = useState(null);
  const [chessComData, setChessComData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const memberData = await api.getMember(memberId);
        setMember(memberData);
        
        if (memberData.chess_com_username) {
          try {
            const chessData = await api.getChessComStats(memberData.chess_com_username);
            setChessComData(chessData);
          } catch (err) {
            console.log('Could not fetch Chess.com data');
          }
        }
      } catch (err) {
        console.error('Error fetching member:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [memberId]);

  const getRatingColor = (rating) => {
    if (!rating) return 'text-neutral-500';
    if (rating >= 2000) return 'text-red-500';
    if (rating >= 1800) return 'text-orange-500';
    if (rating >= 1600) return 'text-yellow-500';
    if (rating >= 1400) return 'text-green-500';
    return 'text-cyan-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-white/5 rounded w-32 mb-8" />
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-24 h-24 rounded-2xl bg-white/5" />
                <div>
                  <div className="h-8 bg-white/5 rounded w-48 mb-2" />
                  <div className="h-5 bg-white/5 rounded w-32" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="h-32 bg-white/5 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Member Not Found</h2>
          <Link to="/members">
            <Button>Back to Members</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statsCards = [
    { 
      label: 'Rapid', 
      rating: member.rapid_rating, 
      icon: Clock,
      chessComData: chessComData?.stats?.chess_rapid
    },
    { 
      label: 'Blitz', 
      rating: member.blitz_rating, 
      icon: Zap,
      chessComData: chessComData?.stats?.chess_blitz
    },
    { 
      label: 'Bullet', 
      rating: member.bullet_rating, 
      icon: Target,
      chessComData: chessComData?.stats?.chess_bullet
    },
  ];

  return (
    <div className="min-h-screen py-20" data-testid="member-profile-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link to="/members">
            <Button variant="ghost" className="text-neutral-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Members
            </Button>
          </Link>
        </motion.div>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-4xl font-bold text-white">
              {member.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{member.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-neutral-400">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span>{member.department}</span>
                </div>
                <a
                  href={`https://www.chess.com/member/${member.chess_com_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
                >
                  @{member.chess_com_username}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {member.email && (
                <a href={`mailto:${member.email}`} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <Mail className="w-5 h-5 text-neutral-400" />
                </a>
              )}
              {member.phone && (
                <a href={`tel:${member.phone}`} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <Phone className="w-5 h-5 text-neutral-400" />
                </a>
              )}
            </div>
          </div>

          {/* Rating Stats */}
          <div className="grid sm:grid-cols-3 gap-4">
            {statsCards.map((stat, idx) => {
              const Icon = stat.icon;
              const record = stat.chessComData?.record;
              
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white/5 rounded-2xl p-6 text-center stat-card"
                >
                  <Icon className="w-8 h-8 mx-auto mb-3 text-neutral-400" />
                  <p className={`text-4xl font-bold mono mb-2 ${getRatingColor(stat.rating)}`}>
                    {stat.rating || '—'}
                  </p>
                  <p className="text-sm text-neutral-500 mb-4">{stat.label} Rating</p>
                  
                  {record && (
                    <div className="flex justify-center gap-4 text-xs">
                      <span className="text-green-500">{record.win || 0}W</span>
                      <span className="text-red-500">{record.loss || 0}L</span>
                      <span className="text-neutral-400">{record.draw || 0}D</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Chess.com Profile Info */}
        {chessComData?.profile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-violet-500" />
              Chess.com Profile
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {chessComData.profile.name && (
                <div>
                  <span className="text-neutral-500">Name:</span>
                  <span className="text-white ml-2">{chessComData.profile.name}</span>
                </div>
              )}
              {chessComData.profile.title && (
                <div>
                  <span className="text-neutral-500">Title:</span>
                  <span className="text-yellow-500 ml-2 font-bold">{chessComData.profile.title}</span>
                </div>
              )}
              {chessComData.profile.country && (
                <div>
                  <span className="text-neutral-500">Country:</span>
                  <span className="text-white ml-2">{chessComData.profile.country}</span>
                </div>
              )}
              {chessComData.profile.followers !== undefined && (
                <div>
                  <span className="text-neutral-500">Followers:</span>
                  <span className="text-white ml-2">{chessComData.profile.followers}</span>
                </div>
              )}
              {chessComData.profile.joined && (
                <div>
                  <span className="text-neutral-500">Joined:</span>
                  <span className="text-white ml-2">
                    {new Date(chessComData.profile.joined * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
