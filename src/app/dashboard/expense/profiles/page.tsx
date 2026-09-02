'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ArrowLeft, FolderPlus, FolderOpen, Edit, Trash2, X, AlertTriangle } from 'lucide-react';

// --- TYPESCRIPT INTERFACES ---
export interface Profile {
  id: string | number;
  name: string;
  [key: string]: any;
}

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
  const [newProfileName, setNewProfileName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // --- EDIT & DELETE MODAL STATES ---
  const [editModalProfile, setEditModalProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
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
      const res = await fetch('/api/expense-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProfileName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfiles((prev) => [...prev, data.profile].sort((a, b) => a.name.localeCompare(b.name)));
        setNewProfileName('');
      } else {
        alert("Failed to create ledger.");
      }
    } catch (error) {
      alert("Error creating ledger.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalProfile || !editName.trim()) return;
    setIsEditing(true);

    try {
      const res = await fetch(`/api/expense-profiles/${editModalProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        alert("Ledger updated successfully!");
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
        alert("Ledger deleted successfully!");
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
        <motion.form variants={itemVariants} onSubmit={handleAddProfile} className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FolderPlus className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            required
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            className="block w-full h-14 pl-12 pr-24 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            placeholder="E.g., Grocery, Rent, Electricity..."
          />
          <button
            type="submit"
            disabled={isAdding || !newProfileName.trim()}
            className="absolute inset-y-1.5 right-1.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isAdding ? 'Creating...' : 'Create'}
          </button>
        </motion.form>

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
                  <h3 className="font-semibold text-slate-900">{profile.name}</h3>
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => { setEditModalProfile(profile); setEditName(profile.name); }} 
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
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Edit className="h-5 w-5 text-blue-600" /> Rename Ledger</h3>
                  <button onClick={() => setEditModalProfile(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="New Ledger Name" />
                  <button type="submit" disabled={isEditing || !editName.trim()} className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {isEditing ? 'Updating...' : 'Save Changes'}
                  </button>
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