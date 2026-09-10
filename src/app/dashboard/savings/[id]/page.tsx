'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, CalendarDays, Trash2, X, CheckCircle2, Clock, AlertCircle, Edit, Settings } from 'lucide-react';
import { createPortal } from 'react-dom';
import CustomDropdown from '@/components/CustomDropdown';

export default function SavingsProfileDetails() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Modals
  const [showAddTx, setShowAddTx] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Profile Edit State
  const [editName, setEditName] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editInstallment, setEditInstallment] = useState('');
  const [editDay, setEditDay] = useState('');
  const [editNotify, setEditNotify] = useState('');

  // Tx Form State
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [originalAmount, setOriginalAmount] = useState(0); // Helps with limit math when editing
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('');
  const [description, setDescription] = useState('');
  const [methods, setMethods] = useState([{ label: 'Bank', value: 'Bank' }, { label: 'Cash', value: 'Cash' }]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    const res = await fetch(`/api/savings/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSaved = profile?.transactions?.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0) || 0;

  // --- TRANSACTION SAVE ---
  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict Target Amount Limit Math
    if (profile?.target_amount) {
      const requestedAmt = parseFloat(amount);
      const remainingLimit = profile.target_amount - totalSaved + (editingTxId ? originalAmount : 0);
      
      if (requestedAmt > remainingLimit) {
        alert(`Cannot exceed target! You can only add up to ৳${remainingLimit.toLocaleString()}`);
        return;
      }
    }

    setIsSaving(true);
    
    const url = editingTxId ? `/api/transactions/${editingTxId}` : `/api/savings/${params.id}/transactions`;
    const httpMethod = editingTxId ? 'PUT' : 'POST';
    const payload = editingTxId ? 
      { type: 'SAVING', amount: parseFloat(amount), method, date, description } : 
      { amount: parseFloat(amount), date, method, description };

    const res = await fetch(url, {
      method: httpMethod,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      setShowAddTx(false);
      fetchProfile();
    } else {
      alert("Failed to save deposit.");
    }
    setIsSaving(false);
  };

  const handleEditTxClick = (tx: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTxId(tx.id);
    setAmount(tx.amount.toString());
    setOriginalAmount(Number(tx.amount));
    setMethod(tx.transaction_method);
    setDate(tx.date);
    setDescription(tx.description || '');
    setShowAddTx(true);
  };

  const handleDeleteTx = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this deposit?")) return;
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProfile();
  };

  const resetTxForm = () => {
    setEditingTxId(null);
    setOriginalAmount(0);
    setAmount(profile?.monthly_installment ? profile.monthly_installment.toString() : '');
    setDate(new Date().toISOString().split('T')[0]);
    setMethod('');
    setDescription('');
  };

  // --- PROFILE SAVE & DELETE ---
  const handleEditProfileClick = () => {
    setEditName(profile.name);
    setEditTarget(profile.target_amount?.toString() || '');
    setEditInstallment(profile.monthly_installment?.toString() || '');
    setEditDay(profile.installment_day?.toString() || '');
    setEditNotify(profile.notify_days_before?.toString() || '');
    setShowEditProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = {
      name: editName,
      target_amount: editTarget ? parseFloat(editTarget) : null,
      monthly_installment: editInstallment ? parseFloat(editInstallment) : null,
      installment_day: editDay ? parseInt(editDay) : null,
      notify_days_before: editNotify ? parseInt(editNotify) : null
    };

    const res = await fetch(`/api/savings/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setShowEditProfile(false);
      fetchProfile();
    } else {
      alert("Failed to update profile.");
    }
    setIsSaving(false);
  };

  const handleDeleteProfile = async () => {
    if(!confirm("Are you sure you want to permanently delete this savings goal and all its records?")) return;
    const res = await fetch(`/api/savings/${params.id}`, { method: 'DELETE' });
    if(res.ok) router.push('/dashboard/savings');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Loading ledger...</div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Profile not found</div>;

  const progress = profile.target_amount ? Math.min(100, (totalSaved / profile.target_amount) * 100) : 0;

  const getStatus = () => {
    if (!profile.monthly_installment || !profile.installment_day) return { text: 'No Schedule', color: 'text-slate-500', bg: 'bg-slate-100', icon: Clock };
    const today = new Date();
    const savedThisMonth = profile.transactions
      .filter((tx:any) => new Date(tx.date).getMonth() === today.getMonth() && new Date(tx.date).getFullYear() === today.getFullYear())
      .reduce((sum:number, tx:any) => sum + Number(tx.amount), 0);

    if (savedThisMonth >= profile.monthly_installment) return { text: 'Paid this month', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 };
    if (today.getDate() > profile.installment_day) return { text: 'Installment Missed', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle };
    return { text: `Due by ${profile.installment_day}th`, color: 'text-blue-600', bg: 'bg-blue-100', icon: CalendarDays };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <motion.header 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/savings" className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors shrink-0">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900 truncate">{profile.name}</h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleEditProfileClick} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors shrink-0">
            <Settings className="h-5 w-5" />
          </button>
          <button onClick={handleDeleteProfile} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors shrink-0">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </motion.header>

      <div className="p-6 space-y-6">
        {/* Detailed Breakdown Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Saved</p>
              <h2 className="text-4xl font-extrabold text-blue-600">৳{totalSaved.toLocaleString()}</h2>
            </div>
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.color}`}>
              <StatusIcon className="h-4 w-4" /> <span className="hidden sm:inline">{status.text}</span>
            </span>
          </div>
          
          {profile.target_amount && (
            <div className="mb-4">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Progress</span>
                <span>{progress.toFixed(1)}% of ৳{profile.target_amount.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-100 pt-4 mt-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Monthly Target</p>
              <p className="text-sm font-bold text-slate-800">{profile.monthly_installment ? `৳${profile.monthly_installment.toLocaleString()}` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Due Date</p>
              <p className="text-sm font-bold text-slate-800">{profile.installment_day ? `${profile.installment_day}th of month` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Reminder</p>
              <p className="text-sm font-bold text-slate-800">{profile.notify_days_before ? `${profile.notify_days_before} days before` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Deposits</p>
              <p className="text-sm font-bold text-slate-800">{profile.transactions?.length || 0}</p>
            </div>
          </div>
        </div>

        <button onClick={() => { resetTxForm(); setShowAddTx(true); }} className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-sm transition-colors">
          <Plus className="h-5 w-5" /> Add Savings Deposit
        </button>

        {/* History List */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Deposit History</h3>
          <div className="space-y-3 pb-20">
            {profile.transactions.length === 0 ? (
               <p className="text-center text-slate-400 py-10 bg-white rounded-2xl border border-dashed border-slate-200">No deposits yet.</p>
            ) : (
              profile.transactions.sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors gap-4 group">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{tx.description || 'Savings Deposit'}</p>
                      <p className="text-xs text-slate-500 truncate">{new Date(tx.date).toLocaleDateString()} • {tx.transaction_method}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="font-bold text-blue-600">+৳{Number(tx.amount).toLocaleString()}</p>
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleEditTxClick(tx, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit className="h-4 w-4" /></button>
                      <button onClick={(e) => handleDeleteTx(tx.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {/* TX MODAL */}
          {showAddTx && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddTx(false)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                    {editingTxId ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                    {editingTxId ? 'Edit Deposit' : 'Add Deposit'}
                  </h3>
                  <button onClick={() => setShowAddTx(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={handleSaveTx} className="flex flex-col flex-1 overflow-hidden">
                  <div className="space-y-4 overflow-y-auto px-1 pb-32 flex-1 overscroll-contain">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (৳)</label>
                      <input 
                        type="number" required min="0" step="0.01" 
                        value={amount} onChange={e => setAmount(e.target.value)} 
                        className="w-full h-14 px-4 text-xl font-bold text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="0.00" 
                      />
                    </div>
                    <div className="relative z-50">
                       <CustomDropdown label="Method" options={methods} value={method} onChange={setMethod} onAdd={v => setMethods([...methods, {label:v, value:v}])} addLabel="Add method" />
                    </div>
                    <div className="relative z-40">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                      <input 
                        type="date" required 
                        value={date} onChange={e => setDate(e.target.value)} 
                        className="w-full h-14 px-4 bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                    <div className="relative z-30">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Remarks (Optional)</label>
                      <input 
                        type="text" 
                        value={description} onChange={e => setDescription(e.target.value)} 
                        className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g. September Installment" 
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 mt-auto shrink-0 bg-white border-t border-slate-100">
                    <button type="submit" disabled={isSaving || !method} className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isSaving ? 'Processing...' : 'Save Deposit'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* EDIT PROFILE MODAL */}
          {showEditProfile && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditProfile(false)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                    <Settings className="h-5 w-5 text-blue-600" /> Edit Goal Settings
                  </h3>
                  <button onClick={() => setShowEditProfile(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                </div>
                
                <form onSubmit={handleSaveProfile} className="flex flex-col flex-1 overflow-hidden">
                  <div className="space-y-4 overflow-y-auto px-1 pb-10 flex-1 overscroll-contain">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Goal Name</label>
                      <input required type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Amount (৳)</label>
                      <input type="number" value={editTarget} onChange={e => setEditTarget(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly Installment (৳)</label>
                      <input type="number" value={editInstallment} onChange={e => setEditInstallment(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Installment Day</label>
                        <input type="number" min="1" max="31" value={editDay} onChange={e => setEditDay(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1-31" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Remind (Days before)</label>
                        <input type="number" value={editNotify} onChange={e => setEditNotify(e.target.value)} className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 3" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-auto shrink-0 bg-white border-t border-slate-100">
                    <button type="submit" disabled={isSaving} className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isSaving ? 'Processing...' : 'Save Changes'}
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