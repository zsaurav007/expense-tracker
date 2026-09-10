'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, PiggyBank, ArrowLeft, CalendarDays, AlertCircle, CheckCircle2, Clock, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SavingsProfile {
  id: string;
  name: string;
  target_amount: number | null;
  monthly_installment: number | null;
  installment_day: number | null;
  notify_days_before: number | null;
  transactions: { amount: number, date: string, description?: string }[];
}

export default function SavingsPage() {
  const [profiles, setProfiles] = useState<SavingsProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [installment, setInstallment] = useState('');
  const [day, setDay] = useState('');
  const [notify, setNotify] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfiles = async () => {
    setIsLoading(true);
    const res = await fetch('/api/savings');
    if (res.ok) {
      const data = await res.json();
      setProfiles(data.profiles || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    fetchProfiles();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = {
      name,
      target_amount: target ? parseFloat(target) : null,
      monthly_installment: installment ? parseFloat(installment) : null,
      installment_day: day ? parseInt(day) : null,
      notify_days_before: notify ? parseInt(notify) : null
    };

    const res = await fetch('/api/savings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setShowAddModal(false);
      setName(''); setTarget(''); setInstallment(''); setDay(''); setNotify('');
      fetchProfiles();
    }
    setIsSaving(false);
  };

  const totalSavedAcrossAll = profiles.reduce((sum, p) => 
    sum + p.transactions.reduce((tSum, tx) => tSum + Number(tx.amount), 0), 0
  );

  const getStatus = (profile: SavingsProfile) => {
    if (!profile.monthly_installment || !profile.installment_day) return { text: 'No Schedule', color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock };
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const savedThisMonth = profile.transactions
      .filter(tx => new Date(tx.date).getMonth() === currentMonth && new Date(tx.date).getFullYear() === currentYear)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    if (savedThisMonth >= profile.monthly_installment) return { text: 'Paid this month', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 };
    if (today.getDate() > profile.installment_day) return { text: 'Installment Missed', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle };
    return { text: `Due by ${profile.installment_day}th`, color: 'text-blue-600', bg: 'bg-blue-100', icon: CalendarDays };
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <motion.header 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20"
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Savings Goals</h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-blue-100 transition-colors">
          <Plus className="h-4 w-4" /> Add Goal
        </button>
      </motion.header>

      <div className="p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-600 rounded-3xl p-6 shadow-md text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><PiggyBank className="h-32 w-32" /></div>
          <p className="text-sm font-bold text-blue-200 uppercase tracking-wider mb-1">Cumulative Saved</p>
          <h2 className="text-4xl font-extrabold">৳{totalSavedAcrossAll.toLocaleString()}</h2>
        </motion.div>

        <div className="space-y-4 pb-20">
          {isLoading ? <p className="text-center text-slate-400 py-10">Loading...</p> : 
            profiles.length === 0 ? <p className="text-center text-slate-400 py-10 bg-white rounded-2xl border border-dashed border-slate-200">No savings profiles created yet.</p> :
            profiles.map(profile => {
              const saved = profile.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
              const progress = profile.target_amount ? Math.min(100, (saved / profile.target_amount) * 100) : 0;
              const status = getStatus(profile);
              const StatusIcon = status.icon;

              return (
                <Link key={profile.id} href={`/dashboard/savings/${profile.id}`}>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:border-blue-200 transition-colors cursor-pointer flex flex-col group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{profile.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.color}`}>
                            <StatusIcon className="h-3 w-3" /> {status.text}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-blue-600">৳{saved.toLocaleString()}</p>
                        {profile.target_amount && <p className="text-xs text-slate-400 font-medium">of ৳{profile.target_amount.toLocaleString()}</p>}
                      </div>
                    </div>
                    
                    {profile.target_amount && (
                      <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 mt-auto">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Monthly</p>
                        <p className="text-xs font-bold text-slate-700">{profile.monthly_installment ? `৳${profile.monthly_installment.toLocaleString()}` : 'N/A'}</p>
                      </div>
                      <div className="text-center border-l border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Due Date</p>
                        <p className="text-xs font-bold text-slate-700">{profile.installment_day ? `${profile.installment_day}th` : 'N/A'}</p>
                      </div>
                      <div className="text-right border-l border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Deposits</p>
                        <p className="text-xs font-bold text-slate-700">{profile.transactions?.length || 0}</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })
          }
        </div>
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                    <Plus className="h-5 w-5 text-blue-600" /> Create Savings Goal
                  </h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                </div>
                
                <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                  <div className="space-y-4 overflow-y-auto px-1 pb-10 flex-1 overscroll-contain">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Goal Name</label>
                      <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Emergency Fund" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Amount (৳) - Optional</label>
                      <input type="number" value={target} onChange={e => setTarget(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly Installment (৳) - Optional</label>
                      <input type="number" value={installment} onChange={e => setInstallment(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Installment Day</label>
                        <input type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1-31" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Remind (Days before)</label>
                        <input type="number" value={notify} onChange={e => setNotify(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 3" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-auto shrink-0 bg-white border-t border-slate-100">
                    <button type="submit" disabled={isSaving} className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isSaving ? 'Processing...' : 'Create Goal'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>, document.body
      )}
    </div>
  );
}