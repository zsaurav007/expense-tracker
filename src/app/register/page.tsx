'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, User, Mail, Phone, Lock, ArrowLeft, 
  AlertCircle, Clock, Loader2, CheckCircle2, XCircle,
  UserCircle, MessageCircle 
} from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Username checking states
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Debounced Username Check
  useEffect(() => {
    const checkUsername = async () => {
      const username = formData.username.trim();
      if (!username) {
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus('checking');

      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = await res.json();
          setUsernameStatus(data.available ? 'available' : 'taken');
        } else {
          setUsernameStatus('idle');
        }
      } catch (err) {
        setUsernameStatus('idle');
      }
    };

    // Wait 500ms after user stops typing before making the request
    const timeoutId = setTimeout(() => {
      checkUsername();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side Validation
    if (usernameStatus === 'taken') {
      return setError('Please choose a different username before submitting.');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters long.');
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('A network error occurred. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 relative z-10"
      >
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
                  <UserPlus className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Account</h1>
                <p className="text-slate-500 mt-2 text-sm">Join the platform to manage your finances</p>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-red-700 leading-tight">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      name="fullName" 
                      required 
                      value={formData.fullName} 
                      onChange={handleChange} 
                      className="w-full h-14 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                      placeholder="Full Name" 
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-bold ml-1">@</span>
                    </div>
                    <input 
                      type="text" 
                      name="username" 
                      required 
                      value={formData.username} 
                      onChange={handleChange} 
                      className={`w-full h-14 pl-11 pr-12 bg-slate-50 border rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                        usernameStatus === 'taken' 
                          ? 'border-red-400 focus:ring-red-500' 
                          : usernameStatus === 'available' 
                            ? 'border-green-400 focus:ring-green-500' 
                            : 'border-slate-200 focus:ring-blue-500'
                      }`} 
                      placeholder="Username" 
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      {usernameStatus === 'checking' && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                      {usernameStatus === 'available' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {usernameStatus === 'taken' && <XCircle className="h-5 w-5 text-red-500" />}
                    </div>
                  </div>
                  {usernameStatus === 'taken' && (
                    <p className="text-xs text-red-500 mt-1.5 ml-1 font-medium">This username is already taken.</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      type="email" 
                      name="email" 
                      required 
                      value={formData.email} 
                      onChange={handleChange} 
                      className="w-full h-14 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                      placeholder="Email Address" 
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                      type="tel" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleChange} 
                      className="w-full h-14 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                      placeholder="Mobile Number (Optional)" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                      type="password" 
                      name="password" 
                      required 
                      value={formData.password} 
                      onChange={handleChange} 
                      className="w-full h-14 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                      placeholder="Password" 
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CheckCircle2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                      type="password" 
                      name="confirmPassword" 
                      required 
                      value={formData.confirmPassword} 
                      onChange={handleChange} 
                      className={`w-full h-14 pl-9 pr-3 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                        formData.confirmPassword && formData.password !== formData.confirmPassword 
                          ? 'border-red-400 focus:ring-red-500' 
                          : 'border-slate-200 focus:ring-blue-500'
                      }`} 
                      placeholder="Retype Pass" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading || usernameStatus === 'checking' || usernameStatus === 'taken'} 
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-md shadow-blue-600/20 mt-4"
                >
                  {isLoading ? 'Submitting...' : 'Register Account'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-blue-600 flex items-center justify-center gap-1 transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </Link>
              </div>
            </motion.div>
          ) : (
            /* SUCCESS / PENDING APPROVAL STATE */
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="h-24 w-24 bg-orange-50 border-4 border-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <Clock className="h-10 w-10 text-orange-500 absolute animate-pulse" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Registration Successful!</h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                Your account has been securely created but is currently <strong className="text-orange-500">Pending</strong>. Please contact the administrator below to review and approve your account.
              </p>
              
              <div className="bg-slate-50 p-5 rounded-2xl text-left border border-slate-200 mb-8 space-y-3">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-3">
                  <UserCircle className="h-6 w-6 text-slate-500" />
                  <span className="text-sm font-bold text-slate-800">Admin: Zulkarnain Saurav</span>
                </div>
                <a href="https://wa.me/8801615201545" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100 p-3 rounded-xl border border-emerald-200 transition-colors">
                  <MessageCircle className="h-5 w-5" /> WhatsApp: +8801615201545
                </a>
                <a href="mailto:zulkarnain.saurav@gmail.com" className="flex items-center gap-3 text-sm font-bold text-blue-700 hover:text-blue-800 bg-blue-100 p-3 rounded-xl border border-blue-200 transition-colors">
                  <Mail className="h-5 w-5" /> zulkarnain.saurav@gmail.com
                </a>
              </div>

              <Link href="/" className="inline-flex items-center justify-center w-full h-14 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-all">
                Return to Login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}