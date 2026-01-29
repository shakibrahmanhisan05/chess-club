import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
  X, SlidersHorizontal
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { api } from '../lib/api';
import { SkeletonCard, ErrorState, EmptyState } from '../components/LoadingStates';
import { useDebounce } from '../hooks/useDebounce';

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters and pagination
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  const debouncedSearch = useDebounce(search, 300);
  
  // Unique departments for filter
  const [departments, setDepartments] = useState([]);
  
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMembers({
        search: debouncedSearch,
        department,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit: 12
      });
      setMembers(data.members || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
      
      // Extract unique departments
      if (!department && data.members) {
        const depts = [...new Set(data.members.map(m => m.department).filter(Boolean))];
        setDepartments(prev => {
          const allDepts = [...new Set([...prev, ...depts])];
          return allDepts.sort();
        });
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, department, sortBy, sortOrder, page]);
  
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);
  
  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, department, sortBy, sortOrder]);
  
  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    setSortBy('name');
    setSortOrder('asc');
    setPage(1);
  };
  
  const hasActiveFilters = search || department || sortBy !== 'name' || sortOrder !== 'asc';
  
  const getRatingColor = (rating) => {
    if (!rating) return 'text-neutral-500';
    if (rating >= 2000) return 'text-red-400';
    if (rating >= 1800) return 'text-orange-400';
    if (rating >= 1600) return 'text-yellow-400';
    if (rating >= 1400) return 'text-green-400';
    if (rating >= 1200) return 'text-cyan-400';
    return 'text-neutral-400';
  };

  return (
    <div className="min-h-screen py-8" data-testid="members-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Club Members</h1>
          <p className="text-neutral-400">
            {loading ? 'Loading...' : `${total} chess enthusiasts`}
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-4 mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <Input
                placeholder="Search by name, username, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
                data-testid="search-input"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Filter Toggle (Mobile) */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden border-white/20"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 w-2 h-2 bg-violet-500 rounded-full" />
              )}
            </Button>
            
            {/* Desktop Filters */}
            <div className="hidden sm:flex gap-4">
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px] bg-white/5 border-white/10">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="rapid_rating">Rapid Rating</SelectItem>
                  <SelectItem value="blitz_rating">Blitz Rating</SelectItem>
                  <SelectItem value="created_at">Join Date</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="border-white/20"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-transform`} />
              </Button>
              
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-neutral-400 hover:text-white"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          
          {/* Mobile Filters Dropdown */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:hidden mt-4 pt-4 border-t border-white/10 space-y-4"
            >
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-full bg-white/5 border-white/10">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex gap-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1 bg-white/5 border-white/10">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="rapid_rating">Rapid Rating</SelectItem>
                    <SelectItem value="blitz_rating">Blitz Rating</SelectItem>
                    <SelectItem value="created_at">Join Date</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-[120px] bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full border-white/20"
                >
                  Clear All Filters
                </Button>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Error State */}
        {error && (
          <ErrorState 
            message={error.message} 
            onRetry={fetchMembers}
            isNetworkError={error.isNetworkError}
            className="mb-8"
          />
        )}

        {/* Members Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <SkeletonCard key={i} className="h-48" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search || department ? "No members found" : "No members yet"}
            description={
              search || department 
                ? "Try adjusting your search or filters"
                : "Be the first to join the club!"
            }
            action={hasActiveFilters ? clearFilters : undefined}
            actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
          />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map((member, idx) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    to={`/members/${member.id}`}
                    className="glass-card rounded-xl p-6 block card-hover h-full"
                    data-testid={`member-card-${member.id}`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.name}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-xl font-bold text-white">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{member.name}</h3>
                        <p className="text-sm text-neutral-400 truncate">{member.department}</p>
                        <p className="text-xs text-violet-400 truncate">@{member.chess_com_username}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-white/5">
                        <p className={`text-lg font-bold mono ${getRatingColor(member.rapid_rating)}`}>
                          {member.rapid_rating || '—'}
                        </p>
                        <p className="text-xs text-neutral-500">Rapid</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5">
                        <p className={`text-lg font-bold mono ${getRatingColor(member.blitz_rating)}`}>
                          {member.blitz_rating || '—'}
                        </p>
                        <p className="text-xs text-neutral-500">Blitz</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5">
                        <p className={`text-lg font-bold mono ${getRatingColor(member.bullet_rating)}`}>
                          {member.bullet_rating || '—'}
                        </p>
                        <p className="text-xs text-neutral-500">Bullet</p>
                      </div>
                    </div>
                    
                    {member.bio && (
                      <p className="mt-4 text-sm text-neutral-400 line-clamp-2">{member.bio}</p>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-4 mt-8"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-white/20"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={page === pageNum ? "bg-violet-600" : "border-white/20"}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-white/20"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
