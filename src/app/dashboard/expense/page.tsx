'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowUpRight, FolderOpen, ChevronRight, Wallet, ArrowDownRight } from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';

// --- FRAMER MOTION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function ExpensePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenseProfiles, setExpenseProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [profileId, setProfileId] = useState('');
  const [method, setMethod] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [methods, setMethods] = useState([
    { label: 'Cash', value: 'Cash' }, { label: 'Bank', value: 'Bank' }, 
    { label: 'bKash', value: 'bKash' }, { label: 'Nagad', value: 'Nagad' },
  ]);

  const fetchData = async () => {
    setIsLoading(true);
    const [txRes, profRes] = await Promise.all([
      fetch('/api/transactions?type=EXPENSE,LEND,BORROW_REPAYMENT'),
      fetch('/api/expense-profiles')
    ]);
    if (txRes.ok) setTransactions((await txRes.json()).transactions);
    if (profRes.ok) setExpenseProfiles((await profRes.json()).profiles.map((p: any) => ({ label: p.name, value: p.id })));
    setIsLoading(false);
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
    const res = await fetch('/api/expense-profiles', { method: 'POST', body: JSON.stringify({ name }) });
    if (res.ok) {
      const data = await res.json();
      setExpenseProfiles(p => [...p, { label: data.profile.name, value: data.profile.id }]);
      setProfileId(data.profile.id);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = {
      type: 'EXPENSE', amount: parseFloat(amount), method, date, description,
      source: profileId === 'NONE' ? 'General Expense' : expenseProfiles.find(p => p.value === profileId)?.label,
      profileId: profileId !== 'NONE' ? profileId : null,
    };
    const res = await fetch('/api/transactions', { method: 'POST', body: JSON.stringify(payload) });
    if (res.ok) {
      setShowModal(false);
      setAmount(''); setDescription(''); setProfileId('');
      fetchData();
    }
    setIsSaving(false);
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
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-red-100">
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
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors gap-4">
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
              <p className="font-bold text-red-600 shrink-0 whitespace-nowrap">-৳{Number(tx.amount).toLocaleString()}</p>
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
                onClick={() => setShowModal(false)} 
              />
              
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col max-h-[85vh]"
              >
                <h3 className="text-xl font-bold mb-4 shrink-0">Add Expense</h3>
                
                <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                  <div className="space-y-4 overflow-y-auto px-1 pb-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (৳)</label>
                      <input 
                        type="number" 
                        required 
                        min="0" 
                        step="0.01" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        className="w-full h-14 px-4 text-xl font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white placeholder:text-slate-400" 
                        placeholder="0.00" 
                      />
                    </div>
                    
                    <div className="relative z-[60]">
                      <CustomDropdown label="Expense Ledger Profile" options={profileOptions} value={profileId} onChange={setProfileId} onAdd={handleAddProfile} addLabel="Create ledger" />
                    </div>
                    
                    <div className="relative z-[50]">
                      <CustomDropdown label="Method" options={methods} value={method} onChange={setMethod} onAdd={handleAddMethod} addLabel="Add method" />
                    </div>
                    
                    <div className="relative z-[40]">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                      <input 
                        type="date" 
                        required 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        className="w-full h-14 px-4 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" 
                      />
                    </div>
                    
                    <div className="relative z-[30]">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (Optional)</label>
                      <input 
                        type="text" 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white placeholder:text-slate-400" 
                        placeholder="e.g. Electric Bill May" 
                      />
                    </div>
                  </div>

                  <div className="pt-2 mt-auto shrink-0 bg-white">
                    <button type="submit" disabled={isSaving || !profileId || !method} className="w-full h-14 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isSaving ? 'Saving...' : 'Save Expense'}
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