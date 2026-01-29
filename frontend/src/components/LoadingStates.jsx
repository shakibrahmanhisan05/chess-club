import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './ui/button';

// Full page loading spinner
export const PageLoader = ({ message = "Loading..." }) => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center"
    >
      <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
      <p className="text-neutral-400">{message}</p>
    </motion.div>
  </div>
);

// Inline loading spinner
export const InlineLoader = ({ size = "md", className = "" }) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };
  return (
    <Loader2 className={`${sizes[size]} text-violet-500 animate-spin ${className}`} />
  );
};

// Skeleton card for loading states
export const SkeletonCard = ({ className = "" }) => (
  <div className={`glass-card rounded-xl p-4 animate-pulse ${className}`}>
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-white/10 rounded-lg" />
      <div className="flex-1">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  </div>
);

// Skeleton list
export const SkeletonList = ({ count = 3, className = "" }) => (
  <div className={`space-y-3 ${className}`}>
    {Array(count).fill(0).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

// Skeleton table row
export const SkeletonTableRow = ({ columns = 4 }) => (
  <tr className="animate-pulse">
    {Array(columns).fill(0).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-white/10 rounded w-full" />
      </td>
    ))}
  </tr>
);

// Skeleton grid for cards
export const SkeletonGrid = ({ count = 6, columns = 3 }) => (
  <div className={`grid md:grid-cols-${columns} gap-6`}>
    {Array(count).fill(0).map((_, i) => (
      <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="h-40 bg-white/10 rounded-lg mb-4" />
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
    ))}
  </div>
);

// Error state with retry
export const ErrorState = ({ 
  message = "Something went wrong", 
  onRetry,
  isNetworkError = false,
  className = "" 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`glass-card rounded-xl p-8 text-center ${className}`}
  >
    {isNetworkError ? (
      <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
    ) : (
      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
    )}
    <h3 className="text-lg font-semibold text-white mb-2">
      {isNetworkError ? "Connection Error" : "Error Loading Data"}
    </h3>
    <p className="text-neutral-400 mb-6">{message}</p>
    {onRetry && (
      <Button onClick={onRetry} className="btn-primary">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    )}
  </motion.div>
);

// Empty state
export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  actionLabel,
  className = "" 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`glass-card rounded-xl p-8 text-center ${className}`}
  >
    {Icon && <Icon className="w-12 h-12 text-neutral-600 mx-auto mb-4" />}
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    {description && <p className="text-neutral-400 mb-6">{description}</p>}
    {action && actionLabel && (
      <Button onClick={action} className="btn-primary">
        {actionLabel}
      </Button>
    )}
  </motion.div>
);

// Progress bar for long operations
export const ProgressBar = ({ progress, label }) => (
  <div className="w-full">
    {label && <p className="text-sm text-neutral-400 mb-2">{label}</p>}
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
        className="h-full bg-gradient-to-r from-violet-500 to-cyan-500"
      />
    </div>
    <p className="text-xs text-neutral-500 mt-1 text-right">{progress}%</p>
  </div>
);

// Loading overlay for modals/forms
export const LoadingOverlay = ({ message = "Processing..." }) => (
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
    <div className="text-center">
      <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-2" />
      <p className="text-sm text-neutral-300">{message}</p>
    </div>
  </div>
);

// Data loading wrapper hook
export const useDataLoader = (fetchFn, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    load();
  }, [...deps, load]);

  return { data, loading, error, refetch: load };
};

export default {
  PageLoader,
  InlineLoader,
  SkeletonCard,
  SkeletonList,
  SkeletonTableRow,
  SkeletonGrid,
  ErrorState,
  EmptyState,
  ProgressBar,
  LoadingOverlay,
  useDataLoader
};
