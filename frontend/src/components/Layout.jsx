import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, Users, Trophy, Newspaper, Info, Menu, X, 
  LogIn, ChevronRight, BarChart3, User
} from 'lucide-react';
import { Button } from './ui/button';

const navLinks = [
  { path: '/', label: 'Home', icon: Crown },
  { path: '/members', label: 'Members', icon: Users },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/tournaments', label: 'Tournaments', icon: Trophy },
  { path: '/statistics', label: 'Stats', icon: BarChart3 },
  { path: '/news', label: 'News', icon: Newspaper },
  { path: '/about', label: 'About', icon: Info },
];

export const Layout = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if member is logged in
  const memberToken = localStorage.getItem('memberToken');
  const isLoggedIn = !!memberToken;

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group" data-testid="nav-logo">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                <Crown className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-white leading-tight">CU EChess</h1>
                <p className="text-xs text-neutral-400">Society</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    data-testid={`nav-${link.label.toLowerCase()}`}
                    className={`px-3 xl:px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                      isActive 
                        ? 'bg-violet-600/20 text-violet-400' 
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Auth Links */}
            <div className="flex items-center gap-2 sm:gap-4">
              {isLoggedIn ? (
                <Link to="/member/dashboard" data-testid="nav-member-dashboard">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="hidden sm:flex items-center gap-2 rounded-full border-violet-500/50 text-violet-400 hover:bg-violet-600/20"
                  >
                    <User className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/member/login" data-testid="nav-member-login">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="hidden sm:flex items-center gap-2 rounded-full border-white/20 hover:bg-white/5"
                    >
                      <User className="w-4 h-4" />
                      Login
                    </Button>
                  </Link>
                  <Link to="/admin/login" data-testid="nav-admin-login">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="hidden md:flex items-center gap-2 text-neutral-500 hover:text-neutral-300"
                    >
                      <LogIn className="w-4 h-4" />
                      Admin
                    </Button>
                  </Link>
                </>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/5"
                data-testid="mobile-menu-toggle"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden glass border-t border-white/10"
            >
              <div className="px-4 py-4 space-y-2">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                        isActive 
                          ? 'bg-violet-600/20 text-violet-400' 
                          : 'text-neutral-400 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{link.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  );
                })}
                
                {/* Divider */}
                <div className="border-t border-white/10 my-2" />
                
                {/* Auth links for mobile */}
                {isLoggedIn ? (
                  <Link
                    to="/member/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg text-violet-400 hover:bg-violet-600/20"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5" />
                      <span className="font-medium">My Dashboard</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/member/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-lg text-neutral-400 hover:bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5" />
                        <span className="font-medium">Member Login</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/admin/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-lg text-neutral-400 hover:bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <LogIn className="w-5 h-5" />
                        <span className="font-medium">Admin Login</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="pt-14 sm:pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 sm:py-8 mt-12 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm text-neutral-400">
                Chittagong University EChess Society
              </p>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500">
              © {new Date().getFullYear()} All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
