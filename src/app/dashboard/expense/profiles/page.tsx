'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, FolderPlus, FolderOpen } from 'lucide-react';

// --- FRAMER MOTION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function ExpenseProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setIsLoading(true);
    const res = await fetch('/api/expense-profiles');
    if (res.ok) {
      const data = await res.json();
      setProfiles(data.profiles);
    }
    setIsLoading(false);
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    
    setIsAdding(true);
    const res = await fetch('/api/expense-profiles', {
      method: 'POST',
      body: JSON.stringify({ name: newProfileName.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setProfiles((prev) => [...prev, data.profile].sort((a, b) => a.name.localeCompare(b.name)));
      setNewProfileName('');
    }
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
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
                className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm"
              >
                <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900">{profile.name}</h3>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}