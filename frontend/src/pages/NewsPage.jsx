import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Calendar, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await api.getNews();
        setNews(data);
      } catch (err) {
        console.error('Error fetching news:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  return (
    <div className="min-h-screen py-20" data-testid="news-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Newspaper className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">News & Updates</h1>
              <p className="text-neutral-400">Latest announcements from the club</p>
            </div>
          </div>
        </motion.div>

        {/* News Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl overflow-hidden animate-pulse">
                <div className="h-48 bg-white/5" />
                <div className="p-6">
                  <div className="h-6 bg-white/5 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-white/5 rounded w-full mb-2" />
                  <div className="h-4 bg-white/5 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-12 text-center"
          >
            <Newspaper className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No News Yet</h3>
            <p className="text-neutral-400">Check back later for updates and announcements</p>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item, idx) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card rounded-2xl overflow-hidden card-hover group cursor-pointer"
                onClick={() => setSelectedNews(item)}
                data-testid={`news-item-${item.id}`}
              >
                <div className="h-48 bg-gradient-to-br from-violet-600/30 to-cyan-600/30 relative overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="w-16 h-16 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 news-card-overlay" />
                </div>
                
                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-violet-400 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  
                  <p className="text-neutral-400 text-sm line-clamp-3 mb-4">
                    {item.content}
                  </p>
                  
                  <div className="flex items-center text-violet-400 text-sm font-medium">
                    Read more <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {/* News Modal */}
        {selectedNews && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setSelectedNews(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedNews.image_url && (
                <div className="h-64 relative">
                  <img 
                    src={selectedNews.image_url} 
                    alt={selectedNews.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 news-card-overlay" />
                </div>
              )}
              
              <div className="p-8">
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(selectedNews.created_at).toLocaleDateString()}</span>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-4">{selectedNews.title}</h2>
                
                <div className="text-neutral-300 whitespace-pre-wrap">
                  {selectedNews.content}
                </div>
                
                <button
                  onClick={() => setSelectedNews(null)}
                  className="mt-6 px-6 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
