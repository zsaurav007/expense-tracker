'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { LogIn, User, Lock, UserPlus, Clock, MessageCircle, Mail, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
      // FIXED: Safely handle the error type for strict TypeScript
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
    <main className="min-h-screen flex flex-col justify-center px-6 bg-slate-50 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md mx-auto space-y-8 relative z-10">
        
        <AnimatePresence mode="wait">
          {!isPendingApproval ? (
            <motion.div key="login" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="relative h-14 w-14 rounded-2xl overflow-hidden shadow-md border border-slate-100 bg-white flex items-center justify-center">
                    <Image src="/paonika.png" alt="Paonika Logo" width={40} height={40} className="object-contain" priority />
                  </div>
                  <span className="text-4xl font-extrabold text-blue-600 tracking-tight">Paonika</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
                <p className="text-slate-500 mt-2 text-sm">Enter your credentials to access your ledger</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5 bg-white p-8 mt-8 rounded-3xl shadow-xl border border-slate-100">
                {error && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100 font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full h-14 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Username or Email"
                      autoCapitalize="none"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full h-14 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 flex justify-center items-center rounded-xl border border-transparent bg-blue-600 text-white text-base font-bold hover:bg-blue-700 disabled:opacity-70 transition-all shadow-md shadow-blue-600/20"
                >
                  {isLoading ? 'Signing in...' : (
                    <>
                      Sign In <LogIn className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  {/* FIXED: Escaped the apostrophe in "Don't" */}
                  <p className="text-slate-500 text-sm mb-4">Don&apos;t have an account yet?</p>
                  <Link href="/register" className="w-full h-14 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                    <UserPlus className="h-5 w-5 text-slate-500" /> Create an Account
                  </Link>
                </div>
              </form>
            </motion.div>
          ) : (
            /* --- PENDING APPROVAL / CONTACT ADMIN CARD --- */
            <motion.div key="pending" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 text-center">
              <div className="h-24 w-24 bg-orange-50 border-4 border-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <Clock className="h-10 w-10 text-orange-500 absolute animate-pulse" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Approval Required!</h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                Your account is currently <strong className="text-orange-500">Pending</strong>. You cannot log in yet. Please contact the administrator below to approve your account.
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

              <button onClick={() => setIsPendingApproval(false)} className="inline-flex items-center justify-center w-full h-14 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-all">
                Return to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}