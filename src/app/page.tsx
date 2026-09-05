'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { LogIn, User, Lock, UserPlus, Clock, MessageCircle, Mail, UserCircle } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// --- Animation Variants ---
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: 'spring', stiffness: 300, damping: 24 } 
  },
};

const pulseGlow: Variants = {
  initial: { boxShadow: '0 0 0 0 rgba(37, 99, 235, 0.4)' },
  animate: { 
    boxShadow: '0 0 0 15px rgba(37, 99, 235, 0)',
    transition: { repeat: Infinity, duration: 2 } 
  }
};

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check if the specific pending error was returned
        if (data.error === 'PENDING_APPROVAL') {
          setIsPendingApproval(true);
          return;
        }
        throw new Error(data.error || 'Login failed');
      }

      router.push('/dashboard');
      router.refresh(); 
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 bg-slate-50 relative overflow-hidden font-sans">
      
      {/* --- Floating Animated Background Orbs --- */}
      <motion.div 
        animate={{ 
          x: [0, 40, 0], 
          y: [0, -40, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[100px] pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          x: [0, -40, 0], 
          y: [0, 40, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-indigo-300/20 rounded-full blur-[120px] pointer-events-none" 
      />

      <div className="w-full max-w-md mx-auto relative z-10">
        <AnimatePresence mode="wait">
          {!isPendingApproval ? (
            <motion.div 
              key="login-form" 
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }} 
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} 
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              
              {/* Header Section */}
              <div className="text-center mb-8">
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex items-center justify-center gap-3 mb-6"
                >
                  <motion.div 
                    variants={pulseGlow}
                    initial="initial"
                    animate="animate"
                    className="relative h-16 w-16 rounded-2xl overflow-hidden shadow-xl shadow-blue-500/10 border border-white bg-white flex items-center justify-center"
                  >
                    <Image src="/paonika.png" alt="Paonika Logo" width={48} height={48} className="object-contain w-auto h-auto" priority />
                  </motion.div>
                  <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-700 to-indigo-600 tracking-tight pb-1">
                    Paonika
                  </span>
                </motion.div>
                <motion.h1 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="text-3xl font-bold tracking-tight text-slate-900"
                >
                  Welcome Back
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="text-slate-500 mt-2 text-sm font-medium"
                >
                  Securely log in to manage your ledgers
                </motion.p>
              </div>

              {/* Form Section */}
              <motion.form 
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                onSubmit={handleLogin} 
                className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-white"
              >
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, mb: 0 }} 
                      animate={{ opacity: 1, height: 'auto', mb: 20 }} 
                      exit={{ opacity: 0, height: 0, mb: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 text-sm text-red-600 bg-red-50/80 rounded-2xl border border-red-100 font-semibold flex items-center gap-2">
                        <XCircle className="h-5 w-5 shrink-0" />
                        {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-5">
                  <motion.div variants={fadeUpItem} className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-600">
                      <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 text-slate-900 placeholder-slate-400 font-medium focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all hover:border-slate-200"
                      placeholder="Username or Email"
                      autoCapitalize="none"
                    />
                  </motion.div>

                  <motion.div variants={fadeUpItem} className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-600">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 text-slate-900 placeholder-slate-400 font-medium focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all hover:border-slate-200"
                      placeholder="Password"
                    />
                  </motion.div>
                </div>

                <motion.div variants={fadeUpItem} className="mt-8">
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className="w-full h-14 flex justify-center items-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70 transition-all shadow-lg shadow-blue-600/25 border border-blue-500/20"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Authenticating...</span>
                      </div>
                    ) : (
                      <>
                        Sign In <LogIn className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </motion.button>
                </motion.div>

                <motion.div variants={fadeUpItem} className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-slate-500 text-sm font-medium mb-4">Don&apos;t have an account yet?</p>
                  <Link href="/register">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full h-14 bg-white hover:bg-slate-50 border-2 border-slate-100 hover:border-slate-200 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                      <UserPlus className="h-5 w-5 text-slate-400" /> Create an Account
                    </motion.div>
                  </Link>
                </motion.div>
              </motion.form>
            </motion.div>

          ) : (

            /* --- PENDING APPROVAL / CONTACT ADMIN CARD --- */
            <motion.div 
              key="pending-card" 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white p-8 md:p-10 text-center relative overflow-hidden"
            >
              {/* Subtle top background highlight */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-amber-500" />

              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                className="h-24 w-24 bg-gradient-to-br from-orange-50 to-amber-100 border-4 border-white shadow-lg rounded-full flex items-center justify-center mx-auto mb-6 relative"
              >
                <Clock className="h-10 w-10 text-orange-500 absolute animate-pulse" />
              </motion.div>
              
              <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Approval Required</h2>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                Your account is currently <strong className="text-orange-500 font-bold bg-orange-50 px-2 py-0.5 rounded-md">Pending</strong>. You cannot log in yet. Please contact the administrator to activate your account.
              </p>

              <div className="bg-slate-50/80 p-5 rounded-2xl text-left border border-slate-100 mb-8 space-y-3">
                <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3 mb-3">
                  <div className="bg-slate-200 p-2 rounded-lg">
                    <UserCircle className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Admin</p>
                    <span className="text-sm font-bold text-slate-800">Zulkarnain Saurav</span>
                  </div>
                </div>
                
                <motion.a 
                  whileHover={{ scale: 1.02, backgroundColor: '#dcfce7' }}
                  whileTap={{ scale: 0.98 }}
                  href="https://wa.me/8801615201545" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-3 text-sm font-bold text-emerald-700 bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 transition-all shadow-sm"
                >
                  <MessageCircle className="h-5 w-5" /> WhatsApp: +8801615201545
                </motion.a>
                
                <motion.a 
                  whileHover={{ scale: 1.02, backgroundColor: '#dbeafe' }}
                  whileTap={{ scale: 0.98 }}
                  href="mailto:zulkarnain.saurav@gmail.com" 
                  className="flex items-center gap-3 text-sm font-bold text-blue-700 bg-blue-50 p-3.5 rounded-xl border border-blue-100 transition-all shadow-sm"
                >
                  <Mail className="h-5 w-5" /> zulkarnain.saurav@gmail.com
                </motion.a>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsPendingApproval(false)} 
                className="inline-flex items-center justify-center w-full h-14 bg-slate-900 text-white rounded-2xl font-bold transition-all shadow-lg hover:bg-slate-800 hover:shadow-slate-900/20"
              >
                Return to Login
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}