import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, Calendar, ChevronRight, RefreshCw, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { ErrorState, EmptyState } from '../components/LoadingStates';

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNews();
      setNews(data.news || data || []);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return (
    <div className="min-h-screen py-8 sm:py-20" data-testid="news-page">
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
                <Newspaper className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">News & Updates</h1>
                <p className="text-sm sm:text-base text-neutral-400">Latest announcements from the club</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNews}
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
            message={error.message || "Failed to load news"} 
            onRetry={fetchNews}
            isNetworkError={error.isNetworkError}
            className="mb-8"
          />
        )}

        {/* News Grid */}
        {!error && (
          loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="glass-card rounded-xl sm:rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-36 sm:h-48 bg-white/5" />
                  <div className="p-4 sm:p-6">
                    <div className="h-5 sm:h-6 bg-white/5 rounded w-3/4 mb-3" />
                    <div className="h-3 sm:h-4 bg-white/5 rounded w-full mb-2" />
                    <div className="h-3 sm:h-4 bg-white/5 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : news.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="No News Yet"
              description="Check back later for updates and announcements"
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {news.map((item, idx) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card rounded-xl sm:rounded-2xl overflow-hidden card-hover group cursor-pointer"
                  onClick={() => setSelectedNews(item)}
                  data-testid={`news-item-${item.id}`}
                >
                  <div className="h-36 sm:h-48 bg-gradient-to-br from-violet-600/30 to-cyan-600/30 relative overflow-hidden">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Newspaper className="w-12 h-12 sm:w-16 sm:h-16 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 news-card-overlay" />
                  </div>
                  
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 mb-2 sm:mb-3">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2 group-hover:text-violet-400 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    
                    <p className="text-neutral-400 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-4">
                      {item.content}
                    </p>
                    
                    <div className="flex items-center text-violet-400 text-xs sm:text-sm font-medium">
                      Read more <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )
        )}

        {/* News Modal */}
        <AnimatePresence>
          {selectedNews && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
              onClick={() => setSelectedNews(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card rounded-xl sm:rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                {selectedNews.image_url && (
                  <div className="h-48 sm:h-64 relative">
                    <img 
                      src={selectedNews.image_url} 
                      alt={selectedNews.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 news-card-overlay" />
                  </div>
                )}
                
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(selectedNews.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">{selectedNews.title}</h2>
                  
                  <div className="text-neutral-300 whitespace-pre-wrap text-sm sm:text-base">
                    {selectedNews.content}
                  </div>
                  
                  <button
                    onClick={() => setSelectedNews(null)}
                    className="mt-6 px-6 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-sm sm:text-base"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
