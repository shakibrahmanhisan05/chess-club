import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, User, Building, Gamepad2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { api } from '../lib/api';
import { toast } from 'sonner';

export default function MemberRegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingUsername, setVerifyingUsername] = useState(false);
  const [usernameValid, setUsernameValid] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    chess_com_username: '',
    department: '',
    phone: '',
    bio: ''
  });

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('memberToken');
    if (token) {
      navigate('/member/dashboard');
    }
  }, [navigate]);

  // Verify Chess.com username
  const verifyChessUsername = async (username) => {
    if (!username || username.length < 3) {
      setUsernameValid(null);
      return;
    }

    setVerifyingUsername(true);
    try {
      const data = await api.getChessComStats(username);
      setUsernameValid(!data.error);
    } catch {
      setUsernameValid(false);
    } finally {
      setVerifyingUsername(false);
    }
  };

  const handleUsernameChange = (e) => {
    const username = e.target.value;
    setFormData({ ...formData, chess_com_username: username });
    
    // Debounce verification
    clearTimeout(window.usernameTimeout);
    window.usernameTimeout = setTimeout(() => {
      verifyChessUsername(username);
    }, 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      // Basic validation for step 1
      if (!formData.name || !formData.email || !formData.password) {
        setError('Please fill in all required fields');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      setError('');
      setStep(2);
      return;
    }

    // Step 2 - Submit
    if (!formData.chess_com_username || !formData.department) {
      setError('Please fill in all required fields');
      return;
    }

    if (usernameValid === false) {
      setError('Please enter a valid Chess.com username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.memberRegister(formData);
      
      if (data.token) {
        localStorage.setItem('memberToken', data.token);
        localStorage.setItem('memberData', JSON.stringify({ id: data.member_id }));
        toast.success('Registration successful! Welcome to CU EChess Society!');
        navigate('/member/dashboard');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8" data-testid="member-register-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Join the Club</h1>
            <p className="text-neutral-400 text-sm">Create your CU EChess Society account</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-violet-600 text-white' : 'bg-white/10 text-neutral-500'
            }`}>
              1
            </div>
            <div className={`w-12 h-1 rounded ${step >= 2 ? 'bg-violet-600' : 'bg-white/10'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-violet-600 text-white' : 'bg-white/10 text-neutral-500'
            }`}>
              2
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6"
            >
              <p className="text-red-400 text-sm text-center">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                {/* Step 1: Basic Info */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm text-neutral-300">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <Input
                      id="name"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10 bg-white/5 border-white/10 focus:border-violet-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-neutral-300">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10 bg-white/5 border-white/10 focus:border-violet-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-neutral-300">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-10 pr-10 bg-white/5 border-white/10 focus:border-violet-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full btn-primary">
                  Continue
                </Button>
              </>
            ) : (
              <>
                {/* Step 2: Chess Info */}
                <div className="space-y-2">
                  <Label htmlFor="chess_com_username" className="text-sm text-neutral-300">Chess.com Username *</Label>
                  <div className="relative">
                    <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <Input
                      id="chess_com_username"
                      placeholder="Your Chess.com username"
                      value={formData.chess_com_username}
                      onChange={handleUsernameChange}
                      className={`pl-10 pr-10 bg-white/5 border-white/10 focus:border-violet-500 ${
                        usernameValid === true ? 'border-green-500' : usernameValid === false ? 'border-red-500' : ''
                      }`}
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {verifyingUsername ? (
                        <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
                      ) : usernameValid === true ? (
                        <span className="text-green-500 text-xs">✓ Valid</span>
                      ) : usernameValid === false ? (
                        <span className="text-red-500 text-xs">✗ Invalid</span>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500">We'll fetch your ratings automatically</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm text-neutral-300">Department *</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <Input
                      id="department"
                      placeholder="e.g., Computer Science"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="pl-10 bg-white/5 border-white/10 focus:border-violet-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm text-neutral-300">Phone (optional)</Label>
                  <Input
                    id="phone"
                    placeholder="Your phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white/5 border-white/10 focus:border-violet-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm text-neutral-300">Bio (optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="bg-white/5 border-white/10 focus:border-violet-500 resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 border-white/20"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 btn-primary"
                    disabled={loading || usernameValid === false}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-neutral-400 text-sm">
              Already have an account?{' '}
              <Link to="/member/login" className="text-violet-400 hover:text-violet-300 font-medium">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
