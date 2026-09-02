'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Plus, ArrowUpRight, FolderOpen, ChevronRight, Wallet, ArrowDownRight, Edit, Trash2, X } from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';

// --- TYPESCRIPT DEFINITIONS ---
type Transaction = {
  id: string;
  type: string;
  amount: number | string;
  date: string;
  source_or_method: string;
  transaction_method: string;
  description?: string;
  person_id?: string;
  expense_profile_id?: string;
  people_profiles?: { name: string };
  expense_profiles?: { name: string };
};

type ProfileOption = {
  label: string;
  value: string;
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

export default function ExpensePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenseProfiles, setExpenseProfiles] = useState<ProfileOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // --- MODAL & FORM STATE ---
  const [showModal, setShowModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [profileId, setProfileId] = useState('');
  const [oneTimeName, setOneTimeName] = useState(''); // Tracks the custom name for 'No Profile'
  const [method, setMethod] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [methods, setMethods] = useState([
    { label: 'Cash', value: 'Cash' }, { label: 'Bank', value: 'Bank' }, 
    { label: 'bKash', value: 'bKash' }, { label: 'Nagad', value: 'Nagad' },
  ]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [txRes, profRes] = await Promise.all([
        fetch('/api/transactions?type=EXPENSE,LEND,BORROW_REPAYMENT'),
        fetch('/api/expense-profiles')
      ]);
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions);
      }
      if (profRes.ok) {
        const data = await profRes.json();
        setExpenseProfiles(data.profiles.map((p: any) => ({ label: p.name, value: p.id })));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    setMounted(true);
    fetchData(); 
  }, []);

  const handleAddMethod = (val: string) => {
    setMethods(p => [...p, { label: val, value: val }]);
    setMethod(val);
  };

  const handleAddProfile = async (name: string) => {
    try {
      const res = await fetch('/api/expense-profiles', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }) 
      });
      if (res.ok) {
        const data = await res.json();
        setExpenseProfiles(p => [...p, { label: data.profile.name, value: data.profile.id }]);
        setProfileId(data.profile.id);
      } else {
        alert("Failed to create new ledger profile.");
      }
    } catch (error) {
      alert("An error occurred while creating the ledger.");
    }
  };

  const resetForm = () => {
    setEditingTxId(null);
    setAmount('');
    setMethod('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setProfileId('');
    setOneTimeName('');
  };

  // --- ACTIONS ---
  const handleEditClick = (tx: Transaction, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setEditingTxId(tx.id);
    setAmount(tx.amount.toString());
    setMethod(tx.transaction_method);
    setDate(tx.date);
    setDescription(tx.description || '');
    setProfileId(tx.expense_profile_id || 'NONE');
    setOneTimeName(!tx.expense_profile_id && tx.type === 'EXPENSE' ? tx.source_or_method : '');
    setShowModal(true);
  };

  const handleDeleteClick = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Expense record deleted successfully!");
        fetchData();
      } else {
        alert("Failed to delete the record.");
      }
    } catch (error) {
      alert("An error occurred while deleting.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const payload = {
      type: 'EXPENSE', 
      amount: parseFloat(amount), 
      method, 
      date, 
      description,
      source: profileId === 'NONE' ? (oneTimeName.trim() || 'General Expense') : expenseProfiles.find(p => p.value === profileId)?.label,
      profileId: profileId !== 'NONE' ? profileId : null,
    };
    
    try {
      let res;
      if (editingTxId) {
        res = await fetch(`/api/transactions/${editingTxId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/transactions', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) 
        });
      }

      if (res.ok) {
        alert(editingTxId ? "Expense updated successfully!" : "Expense added successfully!");
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        alert("Failed to save the record.");
      }
    } catch (error) {
      alert("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const profileOptions = [{ label: 'No Profile (One-time)', value: 'NONE' }, ...expenseProfiles];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex flex-col gap-4 sticky top-0 z-10"
      >
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-red-100 transition-colors">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        <Link href="/dashboard/expense/profiles" className="w-full h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center gap-2 font-medium hover:bg-slate-200 transition-colors">
          <FolderOpen className="h-4 w-4" /> Manage Expense Ledgers
        </Link>
      </motion.header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 pb-24 space-y-3"
      >
        {isLoading ? <p className="text-center text-slate-400 py-8">Loading...</p> : 
         transactions.length === 0 ? <p className="text-center text-slate-400 py-8 bg-white rounded-2xl border border-dashed border-slate-200">No expense records yet.</p> :
         transactions.map((tx) => {
          
          let Icon = ArrowUpRight;
          let displayName = tx.expense_profiles?.name || tx.source_or_method;
          let subText = tx.description ? `${tx.description} • ${tx.transaction_method}` : tx.transaction_method;

          if (tx.type === 'LEND') {
            Icon = ArrowUpRight;
            displayName = `Loan Given to ${tx.people_profiles?.name || tx.source_or_method}`;
          } else if (tx.type === 'BORROW_REPAYMENT') {
            Icon = Wallet;
            displayName = `Installment Paid to ${tx.people_profiles?.name || tx.source_or_method}`;
          }
          
          const CardContent = (
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors gap-4 group">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center border border-red-100 shrink-0">
                  <Icon className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1">
                    <p className="font-semibold text-slate-900 leading-tight break-words">{displayName}</p>
                    {(tx.expense_profile_id || tx.person_id) && <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 break-words leading-snug">{new Date(tx.date).toLocaleDateString()} • {subText}</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="font-bold text-red-600 whitespace-nowrap">-৳{Number(tx.amount).toLocaleString()}</p>
                
                {/* Only allow edit/delete for explicit EXPENSE records here */}
                {tx.type === 'EXPENSE' && (
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleEditClick(tx, e)} 
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteClick(tx.id, e)} 
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );

          if (tx.type === 'EXPENSE' && tx.expense_profile_id) {
            return <motion.div key={tx.id} variants={itemVariants}><Link href={`/dashboard/expense/profiles/${tx.expense_profile_id}`} className="block">{CardContent}</Link></motion.div>;
          } else if (['LEND', 'BORROW_REPAYMENT'].includes(tx.type) && tx.person_id) {
            return <motion.div key={tx.id} variants={itemVariants}><Link href={`/dashboard/ledger/${tx.person_id}`} className="block">{CardContent}</Link></motion.div>;
          } else {
            return <motion.div key={tx.id} variants={itemVariants}>{CardContent}</motion.div>;
          }
         })}
      </motion.div>

      {/* --- ANIMATED MODAL --- */}
      {mounted && createPortal(
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
                onClick={() => { setShowModal(false); resetForm(); }} 
              />
              
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                    {editingTxId ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                    {editingTxId ? 'Edit Expense' : 'Add Expense'}
                  </h3>
                  <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                  {/* Hides scrollbar completely but allows scrolling */}
                  <div className="space-y-4 overflow-y-auto px-1 pb-24 flex-1 overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (৳)</label>
                      <input 
                        type="number" required min="0" step="0.01" 
                        value={amount} onChange={(e) => setAmount(e.target.value)} 
                        className="w-full h-14 px-4 text-xl font-bold text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                        placeholder="0.00" 
                      />
                    </div>
                    
                    <div className="relative z-[60]">
                      <CustomDropdown label="Expense Ledger Profile" options={profileOptions} value={profileId} onChange={setProfileId} onAdd={handleAddProfile} addLabel="Create ledger" />
                    </div>

                    <AnimatePresence>
                      {profileId === 'NONE' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                          animate={{ opacity: 1, height: 'auto', marginTop: 16 }} 
                          exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                          className="relative z-[55] overflow-hidden"
                        >
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Expense Title (One-time)</label>
                          <input 
                            type="text" required 
                            value={oneTimeName} onChange={(e) => setOneTimeName(e.target.value)} 
                            className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                            placeholder="e.g. Gold Purchase" 
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="relative z-[50]">
                      <CustomDropdown label="Method" options={methods} value={method} onChange={setMethod} onAdd={handleAddMethod} addLabel="Add method" />
                    </div>
                    
                    <div className="relative z-[40]">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                      <input 
                        type="date" required 
                        value={date} onChange={(e) => setDate(e.target.value)} 
                        className="w-full h-14 px-4 bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                      />
                    </div>
                    
                    <div className="relative z-[30]">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (Optional)</label>
                      <input 
                        type="text" 
                        value={description} onChange={(e) => setDescription(e.target.value)} 
                        className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                        placeholder="e.g. For Mother's Gift" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 mt-auto shrink-0 bg-white border-t border-slate-100">
                    <button 
                      type="submit" 
                      disabled={isSaving || !profileId || !method || (profileId === 'NONE' && !oneTimeName.trim())} 
                      className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? 'Processing...' : editingTxId ? 'Update Record' : 'Save Expense'}
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