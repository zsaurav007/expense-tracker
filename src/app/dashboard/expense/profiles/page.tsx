'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ArrowLeft, FolderPlus, FolderOpen, Edit, Trash2, X, AlertTriangle, Bell, CalendarClock } from 'lucide-react';

// --- TYPESCRIPT INTERFACES ---
export interface Profile {
  id: string | number;
  name: string;
  billing_day?: number | null;
  notify_days_before?: number | null;
  [key: string]: any;
}

// --- UTILITIES ---
const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
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

export default function ExpenseProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // --- CREATE STATES ---
  const [newProfileName, setNewProfileName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [billingDay, setBillingDay] = useState<string>('1');
  const [notifyDays, setNotifyDays] = useState<string>('3');

  // --- EDIT & DELETE MODAL STATES ---
  const [editModalProfile, setEditModalProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editBillingDay, setEditBillingDay] = useState<string>('1');
  const [editNotifyDays, setEditNotifyDays] = useState<string>('3');
  const [isEditing, setIsEditing] = useState(false);

  const [deleteModalProfile, setDeleteModalProfile] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/expense-profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles);
      }
    } catch (error) {
      console.error("Failed to fetch profiles", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    
    setIsAdding(true);
    try {
      const payload = { 
        name: newProfileName.trim(),
        billing_day: isRecurring ? parseInt(billingDay) : null,
        notify_days_before: isRecurring ? parseInt(notifyDays) : null
      };

      const res = await fetch('/api/expense-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setProfiles((prev) => [...prev, data.profile].sort((a, b) => a.name.localeCompare(b.name)));
        
        // Reset form
        setNewProfileName('');
        setIsRecurring(false);
        setBillingDay('1');
        setNotifyDays('3');
      } else {
        alert("Failed to create ledger.");
      }
    } catch (error) {
      alert("Error creating ledger.");
    } finally {
      setIsAdding(false);
    }
  };

  const openEditModal = (profile: Profile) => {
    setEditModalProfile(profile);
    setEditName(profile.name);
    if (profile.billing_day) {
      setEditIsRecurring(true);
      setEditBillingDay(profile.billing_day.toString());
      setEditNotifyDays((profile.notify_days_before || 3).toString());
    } else {
      setEditIsRecurring(false);
      setEditBillingDay('1');
      setEditNotifyDays('3');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalProfile || !editName.trim()) return;
    setIsEditing(true);

    try {
      const payload = { 
        name: editName.trim(),
        billing_day: editIsRecurring ? parseInt(editBillingDay) : null,
        notify_days_before: editIsRecurring ? parseInt(editNotifyDays) : null
      };

      const res = await fetch(`/api/expense-profiles/${editModalProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditModalProfile(null);
        fetchProfiles();
      } else {
        alert("Failed to update ledger.");
      }
    } catch (error) {
      alert("Error updating ledger.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteModalProfile) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/expense-profiles/${deleteModalProfile.id}`, { 
        method: 'DELETE' 
      });
      if (res.ok) {
        setDeleteModalProfile(null);
        fetchProfiles();
      } else {
        alert("Failed to delete ledger.");
      }
    } catch (error) {
      alert("Error deleting ledger.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 sticky top-0 z-10"
      >
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 truncate">Expense Ledgers</h1>
      </motion.header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="px-6 py-6 space-y-6 pb-24"
      >
        {/* Create Profile Form */}
        <motion.div variants={itemVariants} className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300">
          <form onSubmit={handleAddProfile}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FolderPlus className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="block w-full h-14 pl-12 pr-24 rounded-xl bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
                placeholder="E.g., Grocery, Rent, Electricity..."
              />
              <button
                type="submit"
                disabled={isAdding || !newProfileName.trim()}
                className="absolute inset-y-2 right-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isAdding ? 'Creating...' : 'Create'}
              </button>
            </div>

            {/* Monthly Reminder Toggle */}
            <div className="px-4 pb-2">
              <button 
                type="button" 
                onClick={() => setIsRecurring(!isRecurring)} 
                className={`text-xs flex items-center gap-1.5 transition-colors font-bold ${isRecurring ? 'text-orange-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Bell className="h-3.5 w-3.5" />
                {isRecurring ? 'Remove monthly reminder' : 'Set monthly reminder (e.g. Bills)'}
              </button>

              <AnimatePresence>
                {isRecurring && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-3 bg-orange-50 p-3 rounded-xl border border-orange-100/50">
                      <div className="flex-1">
                        <label className="block text-[10px] font-extrabold text-orange-800/70 uppercase tracking-wider mb-1">Billing Day (1-31)</label>
                        <input 
                          type="number" min="1" max="31" required
                          value={billingDay} onChange={(e) => setBillingDay(e.target.value)} 
                          className="w-full h-10 px-3 text-sm bg-white rounded-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-extrabold text-orange-800/70 uppercase tracking-wider mb-1">Notify (Days Before)</label>
                        <input 
                          type="number" min="1" max="30" required
                          value={notifyDays} onChange={(e) => setNotifyDays(e.target.value)} 
                          className="w-full h-10 px-3 text-sm bg-white rounded-lg border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </motion.div>

        {/* Profiles List */}
        <div className="space-y-3">
          <motion.h2 variants={itemVariants} className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 mt-8">Your Active Ledgers</motion.h2>
          
          {isLoading ? (
            <motion.p variants={itemVariants} className="text-center text-slate-400 text-sm py-8">Loading ledgers...</motion.p>
          ) : profiles.length === 0 ? (
            <motion.div variants={itemVariants} className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No expense ledgers created yet.</p>
            </motion.div>
          ) : (
            profiles.map((profile) => (
              <motion.div 
                variants={itemVariants}
                key={profile.id} 
                onClick={() => router.push(`/dashboard/expense/profiles/${profile.id}`)}
                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm cursor-pointer group hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100 shrink-0">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-slate-900 leading-tight">{profile.name}</h3>
                    {/* Shows bell badge if it's a recurring bill */}
                    {profile.billing_day && (
                      <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1 mt-0.5 uppercase tracking-wider">
                        <CalendarClock className="h-3 w-3" /> Due on {getOrdinal(profile.billing_day)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => openEditModal(profile)} 
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteModalProfile(profile)} 
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* --- MODALS (Teleported to Root) --- */}
      {mounted && createPortal(
        <AnimatePresence>
          {/* EDIT PROFILE MODAL */}
          {editModalProfile && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditModalProfile(null)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Edit className="h-5 w-5 text-blue-600" /> Edit Ledger</h3>
                  <button onClick={() => setEditModalProfile(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="h-5 w-5" /></button>
                </div>
                
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Ledger Name</label>
                    <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="New Ledger Name" />
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <button 
                      type="button" 
                      onClick={() => setEditIsRecurring(!editIsRecurring)} 
                      className={`text-sm flex items-center gap-2 transition-colors font-bold ${editIsRecurring ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Bell className="h-4 w-4" />
                      {editIsRecurring ? 'Monthly Reminder Active' : 'Enable Monthly Reminder'}
                    </button>

                    <AnimatePresence>
                      {editIsRecurring && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Billing Day (1-31)</label>
                              <input 
                                type="number" min="1" max="31" required
                                value={editBillingDay} onChange={(e) => setEditBillingDay(e.target.value)} 
                                className="w-full h-12 px-3 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Notify (Days Before)</label>
                              <input 
                                type="number" min="1" max="30" required
                                value={editNotifyDays} onChange={(e) => setEditNotifyDays(e.target.value)} 
                                className="w-full h-12 px-3 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="pt-2">
                    <button type="submit" disabled={isEditing || !editName.trim()} className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isEditing ? 'Updating...' : 'Save Changes'}
                    </button>
                  </div>
                </form>

              </motion.div>
            </div>
          )}

          {/* DELETE PROFILE MODAL */}
          {deleteModalProfile && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteModalProfile(null)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-red-600 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Delete Ledger</h3>
                  <button onClick={() => setDeleteModalProfile(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 bg-red-50 p-4 rounded-xl border border-red-100">
                    Are you sure you want to permanently delete the <strong>{deleteModalProfile.name}</strong> ledger? This will erase all associated expenses. This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setDeleteModalProfile(null)} className="flex-1 h-14 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                    <button onClick={handleDeleteSubmit} disabled={isDeleting} className="flex-[1.5] h-14 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">
                      {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}