'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, UserCircle2, ChevronRight, Phone, Edit, Trash2, ShieldAlert, Plus } from 'lucide-react';

type Person = {
  id: string;
  name: string;
  phone?: string;
  netBalance: number;
};

// --- FRAMER MOTION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function LedgerHubPage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Modal States - Now includes 'add'
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'delete' | 'reset' | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    setMounted(true);
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    setIsLoading(true);
    const res = await fetch('/api/people');
    if (res.ok) {
      const data = await res.json();
      setPeople(data.people);
    }
    setIsLoading(false);
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    
    setIsAdding(true);
    const res = await fetch('/api/people', {
      method: 'POST',
      body: JSON.stringify({ name: newPersonName.trim(), phone: newPersonPhone.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setPeople([data.person, ...people]);
      setNewPersonName('');
      setNewPersonPhone('');
      closeModal();
    }
    setIsAdding(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsProcessing(true);
    
    const res = await fetch(`/api/people/${selectedPerson?.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: editName, phone: editPhone, password: modalPassword }),
    });

    if (res.ok) {
      closeModal();
      fetchPeople();
    } else {
      const data = await res.json();
      setModalError(data.error || 'Failed to update');
    }
    setIsProcessing(false);
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsProcessing(true);
    
    const res = await fetch(`/api/people/${selectedPerson?.id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password: modalPassword }),
    });

    if (res.ok) {
      closeModal();
      fetchPeople();
    } else {
      const data = await res.json();
      setModalError(data.error || 'Failed to delete');
    }
    setIsProcessing(false);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsProcessing(true);
    
    const res = await fetch(`/api/people/reset`, {
      method: 'POST',
      body: JSON.stringify({ password: modalPassword }),
    });

    if (res.ok) {
      closeModal();
      fetchPeople();
    } else {
      const data = await res.json();
      setModalError(data.error || 'Failed to reset');
    }
    setIsProcessing(false);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedPerson(null);
    setModalPassword('');
    setModalError('');
    setNewPersonName('');
    setNewPersonPhone('');
  };

  const totalOwesMe = people.filter(p => p.netBalance > 0).reduce((sum, p) => sum + p.netBalance, 0);
  const totalIOwe = people.filter(p => p.netBalance < 0).reduce((sum, p) => sum + Math.abs(p.netBalance), 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 sticky top-0 z-10 flex justify-between items-center"
      >
        <h1 className="text-xl font-bold text-slate-900">Lend & Borrow</h1>
        <div className="flex gap-2">
          {/* Add & Reset Buttons Top Right */}
          <button onClick={() => setActiveModal('reset')} className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-red-100 transition-colors">
            <ShieldAlert className="h-4 w-4" /> Reset
          </button>
          <button onClick={() => setActiveModal('add')} className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-blue-100 transition-colors">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </motion.header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1"
      >
        <motion.div variants={itemVariants} className="p-6 grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex flex-col justify-center shadow-sm">
            <span className="text-xs text-green-700 font-medium mb-1">Total Owed to You</span>
            <span className="text-lg font-bold text-green-700">৳{totalOwesMe.toLocaleString()}</span>
          </div>
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex flex-col justify-center shadow-sm">
            <span className="text-xs text-red-700 font-medium mb-1">Total You Owe</span>
            <span className="text-lg font-bold text-red-700">৳{totalIOwe.toLocaleString()}</span>
          </div>
        </motion.div>

        <div className="px-6 pb-24 space-y-8">
          {/* People List */}
          <div className="space-y-3">
            <motion.h3 variants={itemVariants} className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Active Accounts</motion.h3>
            {isLoading ? (
              <p className="text-center text-slate-400 text-sm py-8">Loading profiles...</p>
            ) : people.length === 0 ? (
              <motion.div variants={itemVariants} className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <UserCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No profiles created yet.</p>
              </motion.div>
            ) : (
              people.map((person) => (
                <motion.div 
                  variants={itemVariants}
                  key={person.id} 
                  onClick={() => router.push(`/dashboard/ledger/${person.id}`)}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl active:bg-slate-50 transition-colors shadow-sm cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-lg font-bold text-slate-600 shrink-0">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 leading-tight">{person.name}</h3>
                      {person.phone && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {person.phone}
                        </p>
                      )}
                      <div className="mt-1">
                        {person.netBalance > 0 && <p className="text-sm font-bold text-green-600">Owes you ৳{person.netBalance.toLocaleString()}</p>}
                        {person.netBalance < 0 && <p className="text-sm font-bold text-red-600">You owe ৳{Math.abs(person.netBalance).toLocaleString()}</p>}
                        {person.netBalance === 0 && <p className="text-sm font-bold text-slate-400">Settled up</p>}
                      </div>
                    </div>
                  </div>

                  {/* Edit & Delete Action Icons */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => { setSelectedPerson(person); setEditName(person.name); setEditPhone(person.phone || ''); setActiveModal('edit'); }} 
                      className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-full transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => { setSelectedPerson(person); setActiveModal('delete'); }} 
                      className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronRight className="h-5 w-5 text-slate-300 ml-1" />
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
          {activeModal && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
                onClick={closeModal} 
              />
              
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full"
              >
                
                {/* ADD PERSON MODAL */}
                {activeModal === 'add' && (
                  <form onSubmit={handleAddPerson} className="space-y-4">
                    <h3 className="text-xl font-bold mb-4 text-slate-900 flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-blue-600" /> Add New Person
                    </h3>
                    <input
                      type="text" required value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)}
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Name *"
                    />
                    <input
                      type="tel" value={newPersonPhone} onChange={(e) => setNewPersonPhone(e.target.value)}
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Phone Number (Optional)"
                    />
                    <button
                      type="submit" disabled={isAdding || !newPersonName.trim()}
                      className="w-full h-14 mt-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isAdding ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </form>
                )}

                {/* EDIT MODAL */}
                {activeModal === 'edit' && (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <h3 className="text-xl font-bold mb-4 text-slate-900 flex items-center gap-2">
                      <Edit className="h-5 w-5 text-blue-600" /> Edit Profile
                    </h3>
                    <input 
                      type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} 
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder:text-slate-400" 
                      placeholder="Name" 
                    />
                    <input 
                      type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} 
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder:text-slate-400" 
                      placeholder="Phone (Optional)" 
                    />
                    <input 
                      type="password" required value={modalPassword} onChange={(e) => setModalPassword(e.target.value)} 
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 placeholder:text-slate-400" 
                      placeholder="Enter your password to confirm" 
                    />
                    {modalError && <p className="text-red-500 text-sm font-semibold">{modalError}</p>}
                    <button type="submit" disabled={isProcessing || !modalPassword} className="w-full h-14 mt-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isProcessing ? 'Updating...' : 'Save Changes'}
                    </button>
                  </form>
                )}

                {/* DELETE MODAL */}
                {activeModal === 'delete' && (
                  <form onSubmit={handleDeleteSubmit} className="space-y-4">
                    <h3 className="text-xl font-bold mb-2 text-red-600 flex items-center gap-2">
                      <Trash2 className="h-6 w-6" /> Delete Person
                    </h3>
                    <p className="text-slate-600 text-sm mb-4">
                      Are you sure you want to delete <strong className="text-slate-900">{selectedPerson?.name}</strong>? This will permanently erase their profile and automatically adjust your calculations.
                    </p>
                    <input 
                      type="password" required value={modalPassword} onChange={(e) => setModalPassword(e.target.value)} 
                      className="w-full h-14 px-4 rounded-xl border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50 text-slate-900 placeholder:text-red-400" 
                      placeholder="Enter your password to confirm" 
                    />
                    {modalError && <p className="text-red-500 text-sm font-semibold">{modalError}</p>}
                    <button type="submit" disabled={isProcessing || !modalPassword} className="w-full h-14 mt-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">
                      {isProcessing ? 'Deleting...' : 'Confirm Deletion'}
                    </button>
                  </form>
                )}

                {/* FULL RESET MODAL */}
                {activeModal === 'reset' && (
                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    <h3 className="text-xl font-bold mb-2 text-red-600 flex items-center gap-2">
                      <ShieldAlert className="h-6 w-6" /> EXTREME DANGER
                    </h3>
                    <p className="text-slate-600 text-sm mb-4">
                      This action will <strong className="text-red-600">PERMANENTLY DELETE ALL PEOPLE</strong> and completely wipe out all Loan/Installment calculations. This is used to fix ghost transaction issues. It cannot be undone.
                    </p>
                    <input 
                      type="password" required value={modalPassword} onChange={(e) => setModalPassword(e.target.value)} 
                      className="w-full h-14 px-4 rounded-xl border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50 text-slate-900 font-bold placeholder:text-red-400" 
                      placeholder="Enter your password to verify" 
                    />
                    {modalError && <p className="text-red-500 text-sm font-semibold">{modalError}</p>}
                    <button type="submit" disabled={isProcessing || !modalPassword} className="w-full h-14 mt-4 bg-red-600 text-white rounded-xl font-extrabold hover:bg-red-700 disabled:opacity-50 transition-colors">
                      {isProcessing ? 'Wiping Database...' : 'YES, WIPE ALL DATA'}
                    </button>
                  </form>
                )}

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}