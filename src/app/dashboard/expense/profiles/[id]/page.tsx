'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ArrowLeft, FolderOpen, Calendar, Edit, Trash2, X, AlertTriangle } from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';

// --- TYPESCRIPT DEFINITIONS ---
type Transaction = {
  id: string;
  amount: number | string;
  date: string;
  transaction_method: string;
  description?: string;
};

// --- FRAMER MOTION VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 } 
  }
};

export default function ProfileHistoryPage() {
  const router = useRouter();
  const params = useParams();
  
  const [profile, setProfile] = useState<{ id: string, name: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Filter state
  const [filter, setFilter] = useState<'week' | 'month' | 'year' | 'all'>('month');

  // --- PROFILE EDIT/DELETE MODAL STATE ---
  const [showProfileModal, setShowProfileModal] = useState<'edit' | 'delete' | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [isProcessingProfile, setIsProcessingProfile] = useState(false);

  // --- TRANSACTION EDIT MODAL STATE ---
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('');
  const [description, setDescription] = useState('');
  const [isSavingTx, setIsSavingTx] = useState(false);

  const [methods, setMethods] = useState([
    { label: 'Cash', value: 'Cash' }, { label: 'Bank', value: 'Bank' }, 
    { label: 'bKash', value: 'bKash' }, { label: 'Nagad', value: 'Nagad' },
  ]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/expense-profiles/${params.id}?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setTransactions(data.transactions);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch profile history", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, filter]);

  // --- PROFILE ACTIONS ---
  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileName.trim()) return;
    setIsProcessingProfile(true);

    try {
      const res = await fetch(`/api/expense-profiles/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editProfileName.trim() }),
      });
      if (res.ok) {
        alert("Ledger updated successfully!");
        setShowProfileModal(null);
        fetchHistory();
      } else {
        alert("Failed to update ledger.");
      }
    } catch (error) {
      alert("Error updating ledger.");
    } finally {
      setIsProcessingProfile(false);
    }
  };

  const handleDeleteProfile = async () => {
    setIsProcessingProfile(true);
    try {
      const res = await fetch(`/api/expense-profiles/${params.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Ledger deleted successfully!");
        router.push('/dashboard/expense/profiles');
      } else {
        alert("Failed to delete ledger.");
        setIsProcessingProfile(false);
      }
    } catch (error) {
      alert("Error deleting ledger.");
      setIsProcessingProfile(false);
    }
  };

  // --- TRANSACTION ACTIONS ---
  const handleAddMethod = (val: string) => {
    setMethods(p => [...p, { label: val, value: val }]);
    setMethod(val);
  };

  const handleEditTxClick = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setAmount(tx.amount.toString());
    setMethod(tx.transaction_method);
    setDate(tx.date);
    setDescription(tx.description || '');
    setShowTxModal(true);
  };

  const handleDeleteTxClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Expense record deleted!");
        fetchHistory();
      } else {
        alert("Failed to delete record.");
      }
    } catch (error) {
      alert("Error deleting record.");
    }
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTx(true);
    
    const payload = { 
      type: 'EXPENSE', 
      amount: parseFloat(amount), 
      method, 
      date, 
      description,
      profileId: profile?.id,
      source: profile?.name
    };

    try {
      const res = await fetch(`/api/transactions/${editingTxId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Expense updated successfully!");
        setShowTxModal(false);
        fetchHistory();
      } else {
        alert("Failed to update expense.");
      }
    } catch (error) {
      alert("Error saving expense.");
    } finally {
      setIsSavingTx(false);
    }
  };

  if (!profile && !isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Ledger not found</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors shrink-0">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 truncate">{profile?.name || 'Loading...'}</h1>
        </div>
        
        {/* Ledger Profile Actions */}
        {profile && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button 
              onClick={() => { setEditProfileName(profile.name); setShowProfileModal('edit'); }} 
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setShowProfileModal('delete')} 
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </motion.header>

      {/* Filter Tabs */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white px-4 py-3 border-b border-slate-100 sticky top-[73px] z-10 overflow-x-auto whitespace-nowrap hide-scrollbar"
      >
        <div className="flex gap-2">
          {['week', 'month', 'year', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as 'week' | 'month' | 'year' | 'all')}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                filter === f 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : f === 'year' ? 'This Year' : 'All Time'}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 pb-24 space-y-6"
      >
        {/* Total Summary Card */}
        <motion.div variants={itemVariants} className="bg-red-50 border border-red-100 rounded-3xl p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-red-800/70 uppercase tracking-wider mb-1">
            Total Spent ({filter === 'all' ? 'Lifetime' : `This ${filter}`})
          </p>
          <h2 className="text-4xl font-extrabold text-red-700">
            ৳{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </motion.div>

        {/* Transactions List */}
        <div>
          <motion.h3 variants={itemVariants} className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Transaction History</motion.h3>
          <div className="space-y-3">
            {isLoading ? (
              <motion.p variants={itemVariants} className="text-center text-slate-400 py-8">Loading history...</motion.p>
            ) : transactions.length === 0 ? (
              <motion.div variants={itemVariants} className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No expenses found for this period.</p>
              </motion.div>
            ) : (
              transactions.map((tx) => (
                <motion.div variants={itemVariants} key={tx.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm group hover:border-slate-200 transition-colors gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shrink-0">
                      <FolderOpen className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{tx.description || profile?.name}</p>
                      <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()} • {tx.transaction_method}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="font-bold text-red-600 whitespace-nowrap">-৳{Number(tx.amount).toLocaleString()}</p>
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditTxClick(tx)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteTxClick(tx.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* --- MODALS (Teleported to Root) --- */}
      {mounted && createPortal(
        <AnimatePresence>
          {/* PROFILE EDIT MODAL */}
          {showProfileModal === 'edit' && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowProfileModal(null)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Edit className="h-5 w-5 text-blue-600" /> Rename Ledger</h3>
                  <button onClick={() => setShowProfileModal(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={handleEditProfile} className="space-y-4">
                  <input type="text" required value={editProfileName} onChange={(e) => setEditProfileName(e.target.value)} className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="New Ledger Name" />
                  <button type="submit" disabled={isProcessingProfile || !editProfileName.trim()} className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {isProcessingProfile ? 'Updating...' : 'Save Changes'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}

          {/* PROFILE DELETE MODAL */}
          {showProfileModal === 'delete' && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowProfileModal(null)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-red-600 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Delete Ledger</h3>
                  <button onClick={() => setShowProfileModal(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 bg-red-50 p-4 rounded-xl border border-red-100">
                    Are you sure you want to permanently delete the <strong>{profile?.name}</strong> ledger? This will erase all associated expenses. This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowProfileModal(null)} className="flex-1 h-14 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                    <button onClick={handleDeleteProfile} disabled={isProcessingProfile} className="flex-[1.5] h-14 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">
                      {isProcessingProfile ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* TRANSACTION EDIT MODAL */}
          {showTxModal && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowTxModal(false)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Edit className="h-5 w-5 text-blue-600" /> Edit Expense</h3>
                  <button onClick={() => setShowTxModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="h-5 w-5" /></button>
                </div>
                
                <form onSubmit={handleSaveTx} className="flex flex-col flex-1 overflow-hidden">
                  <div className="space-y-4 overflow-y-auto px-1 pb-32 flex-1 overscroll-contain">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (৳)</label>
                      <input 
                        type="number" required min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} 
                        className="w-full h-14 px-4 text-xl font-bold text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                    <div className="relative z-[50]">
                      <CustomDropdown label="Method" options={methods} value={method} onChange={setMethod} onAdd={handleAddMethod} addLabel="Add method" />
                    </div>
                    <div className="relative z-[40]">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                      <input 
                        type="date" required value={date} onChange={(e) => setDate(e.target.value)} 
                        className="w-full h-14 px-4 bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                    <div className="relative z-[30]">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (Optional)</label>
                      <input 
                        type="text" value={description} onChange={(e) => setDescription(e.target.value)} 
                        className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g. Electric Bill May" 
                      />
                    </div>
                  </div>
                  <div className="pt-4 mt-auto shrink-0 bg-white border-t border-slate-100">
                    <button type="submit" disabled={isSavingTx || !method} className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isSavingTx ? 'Updating...' : 'Update Record'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}