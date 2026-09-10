'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, PiggyBank, ArrowLeft, CalendarDays, AlertCircle, CheckCircle2, Clock, X, Edit, Trash2, SlidersHorizontal } from 'lucide-react';
import { createPortal } from 'react-dom';
import { TopControls, PaginationControls } from '@/components/ListControls';

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
  const [mounted, setMounted] = useState(false);

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [installment, setInstallment] = useState('');
  const [day, setDay] = useState('');
  const [notify, setNotify] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // List Control State
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const filterOptions = [{ label: 'All Goals', value: 'ALL' }];
  const sortOptions = [
    { label: 'Name (A-Z)', value: 'name-asc' },
    { label: 'Highest Target', value: 'target-desc' },
    { label: 'Most Saved', value: 'saved-desc' },
    { label: 'Highest Progress', value: 'progress-desc' },
  ];

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

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setTarget('');
    setInstallment('');
    setDay('');
    setNotify('');
  };

  const handleEditClick = (profile: SavingsProfile) => {
    setEditingId(profile.id);
    setName(profile.name);
    setTarget(profile.target_amount ? profile.target_amount.toString() : '');
    setInstallment(profile.monthly_installment ? profile.monthly_installment.toString() : '');
    setDay(profile.installment_day ? profile.installment_day.toString() : '');
    setNotify(profile.notify_days_before ? profile.notify_days_before.toString() : '');
    setShowModal(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this savings goal? All its deposit records will also be erased.")) return;
    const res = await fetch(`/api/savings/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProfiles();
  };

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

    const url = editingId ? `/api/savings/${editingId}` : '/api/savings';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setShowModal(false);
      resetForm();
      fetchProfiles();
    }
    setIsSaving(false);
  };

  const totalSavedAcrossAll = profiles.reduce((sum, p) => 
    sum + (p.transactions || []).reduce((tSum, tx) => tSum + Number(tx.amount), 0), 0
  );

  const getStatus = (profile: SavingsProfile) => {
    if (!profile.monthly_installment || !profile.installment_day) return { text: 'No Schedule', color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock };
    const today = new Date();
    const savedThisMonth = (profile.transactions || [])
      .filter(tx => new Date(tx.date).getMonth() === today.getMonth() && new Date(tx.date).getFullYear() === today.getFullYear())
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    if (savedThisMonth >= profile.monthly_installment) return { text: 'Paid this month', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 };
    if (today.getDate() > profile.installment_day) return { text: 'Installment Missed', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle };
    return { text: `Due by ${profile.installment_day}th`, color: 'text-blue-600', bg: 'bg-blue-100', icon: CalendarDays };
  };

  const processedProfiles = useMemo(() => {
    let result = profiles.map(p => {
      const saved = (p.transactions || []).reduce((sum, tx) => sum + Number(tx.amount), 0);
      const progress = p.target_amount ? Math.min(100, (saved / p.target_amount) * 100) : 0;
      return { ...p, saved, progress };
    });

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(lower));
    }

    result.sort((a, b) => {
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'target-desc') return (b.target_amount || 0) - (a.target_amount || 0);
      if (sortOrder === 'saved-desc') return b.saved - a.saved;
      if (sortOrder === 'progress-desc') return b.progress - a.progress;
      return 0;
    });

    return result;
  }, [profiles, searchTerm, sortOrder]);

  const totalPages = Math.ceil(processedProfiles.length / itemsPerPage) || 1;
  const paginatedProfiles = processedProfiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <motion.header 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-40"
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Savings Goals</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-blue-100 transition-colors">
            <Plus className="h-4 w-4" /> Add Goal
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, y: -10, display: 'none' }} animate={{ opacity: 1, y: 0, display: 'block' }} exit={{ opacity: 0, y: -10, transitionEnd: { display: 'none' } }} className="bg-slate-50 relative z-30">
            <div className="pb-4">
              <TopControls searchTerm={searchTerm} setSearchTerm={val => { setSearchTerm(val); setCurrentPage(1); }} filterType={filterType} setFilterType={val => { setFilterType(val); setCurrentPage(1); }} filterOptions={filterOptions} sortOrder={sortOrder} setSortOrder={val => { setSortOrder(val); setCurrentPage(1); }} sortOptions={sortOptions} searchPlaceholder="Search goals..." />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-600 rounded-3xl p-6 shadow-md text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><PiggyBank className="h-32 w-32" /></div>
          <p className="text-sm font-bold text-blue-200 uppercase tracking-wider mb-1">Cumulative Saved</p>
          <h2 className="text-4xl font-extrabold">৳{totalSavedAcrossAll.toLocaleString()}</h2>
        </motion.div>

        <div className="space-y-4 pb-20">
          {isLoading ? <p className="text-center text-slate-400 py-10">Loading...</p> : 
            paginatedProfiles.length === 0 ? <p className="text-center text-slate-400 py-10 bg-white rounded-2xl border border-dashed border-slate-200">No savings profiles found.</p> :
            paginatedProfiles.map(profile => {
              const status = getStatus(profile);
              const StatusIcon = status.icon;

              return (
                <Link key={profile.id} href={`/dashboard/savings/${profile.id}`}>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:border-blue-200 transition-colors cursor-pointer flex flex-col group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{profile.name}</h3>
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditClick(profile); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit className="h-4 w-4" /></button>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteClick(profile.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.color}`}>
                            <StatusIcon className="h-3 w-3" /> {status.text}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-extrabold text-blue-600">৳{profile.saved.toLocaleString()}</p>
                        {profile.target_amount && <p className="text-xs text-slate-400 font-medium">of ৳{profile.target_amount.toLocaleString()}</p>}
                      </div>
                    </div>
                    
                    {profile.target_amount && (
                      <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${profile.progress}%` }}></div>
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
          {!isLoading && <PaginationControls currentPage={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} setCurrentPage={setCurrentPage} totalItems={processedProfiles.length} />}
        </div>
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                    {editingId ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />} 
                    {editingId ? 'Edit Savings Goal' : 'Create Savings Goal'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                </div>
                
                <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                  <div className="space-y-4 overflow-y-auto px-1 pb-10 flex-1 overscroll-contain">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Goal Name</label>
                      <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Emergency Fund" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Amount (৳) - Optional</label>
                      <input type="number" min="0" step="0.01" value={target} onChange={e => setTarget(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly Installment (৳) - Optional</label>
                      <input type="number" min="0" step="0.01" value={installment} onChange={e => setInstallment(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Installment Day</label>
                        <input type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1-31" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Remind (Days before)</label>
                        <input type="number" min="1" max="30" value={notify} onChange={e => setNotify(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 3" />
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 mt-auto shrink-0 bg-white border-t border-slate-100">
                    <button type="submit" disabled={isSaving} className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isSaving ? 'Processing...' : editingId ? 'Update Goal' : 'Create Goal'}
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