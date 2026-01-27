import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Users, ExternalLink, ChevronRight } from 'lucide-react';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await api.getMembers();
        setMembers(data);
        setFilteredMembers(data);
      } catch (err) {
        console.error('Error fetching members:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = members.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.department.toLowerCase().includes(query) ||
      m.chess_com_username.toLowerCase().includes(query)
    );
    setFilteredMembers(filtered);
  }, [searchQuery, members]);

  const getRatingColor = (rating) => {
    if (!rating) return 'text-neutral-500';
    if (rating >= 2000) return 'text-red-500';
    if (rating >= 1800) return 'text-orange-500';
    if (rating >= 1600) return 'text-yellow-500';
    if (rating >= 1400) return 'text-green-500';
    return 'text-cyan-500';
  };

  return (
    <div className="min-h-screen py-20" data-testid="members-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Club Members</h1>
          <p className="text-neutral-400">Meet the chess enthusiasts of CU EChess Society</p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <Input
              type="text"
              placeholder="Search members by name, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-white/5 border-white/10 focus:border-violet-500 rounded-full"
              data-testid="member-search-input"
            />
          </div>
        </motion.div>

        {/* Members Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-white/5" />
                  <div className="flex-1">
                    <div className="h-5 bg-white/5 rounded mb-2 w-3/4" />
                    <div className="h-4 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-20 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-12 text-center"
          >
            <Users className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Members Found</h3>
            <p className="text-neutral-400">
              {searchQuery ? 'Try adjusting your search query' : 'No members have been added yet'}
            </p>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member, idx) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  to={`/members/${member.id}`}
                  className="glass-card rounded-2xl p-6 block card-hover group"
                  data-testid={`member-card-${member.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-600/30 flex items-center justify-center text-2xl font-bold text-white">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-violet-400 transition-colors">
                          {member.name}
                        </h3>
                        <p className="text-sm text-neutral-400">{member.department}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-violet-400 transition-colors" />
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <a
                      href={`https://www.chess.com/member/${member.chess_com_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      @{member.chess_com_username}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className={`text-lg font-bold mono ${getRatingColor(member.rapid_rating)}`}>
                        {member.rapid_rating || '—'}
                      </p>
                      <p className="text-xs text-neutral-500">Rapid</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className={`text-lg font-bold mono ${getRatingColor(member.blitz_rating)}`}>
                        {member.blitz_rating || '—'}
                      </p>
                      <p className="text-xs text-neutral-500">Blitz</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className={`text-lg font-bold mono ${getRatingColor(member.bullet_rating)}`}>
                        {member.bullet_rating || '—'}
                      </p>
                      <p className="text-xs text-neutral-500">Bullet</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
