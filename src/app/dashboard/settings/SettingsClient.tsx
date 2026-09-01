'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, Variants } from 'framer-motion';
import { 
  LogOut, Key, ShieldCheck, UserCircle, 
  Database, Download, AlertTriangle, UploadCloud, ShieldAlert, CheckCircle2 
} from 'lucide-react';

// --- TYPESCRIPT INTERFACES ---
export interface UserData {
  username?: string;
  fullName?: string;
  isGodMode?: boolean;
  [key: string]: any;
}

// --- ANIMATION VARIANTS ---
// FIX: Added 'Variants' type and 'as const' to resolve Framer Motion TypeScript errors
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 } 
  }
};

export default function SettingsClient({ user }: { user: UserData }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Existing States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // New Data Management States
  const [activeModal, setActiveModal] = useState<'wipe' | 'restore' | null>(null);
  const [wipeStep, setWipeStep] = useState<1 | 2>(1);
  const [modalUsername, setModalUsername] = useState(user?.username || '');
  const [modalPassword, setModalPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  useEffect(() => { setMounted(true); }, []);

  // --- PASSWORD & LOGOUT HANDLERS ---
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/users/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      setSuccess('Password updated successfully!');
      setOldPassword(''); setNewPassword('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  // --- DATA MANAGEMENT HANDLERS ---
  const closeModal = () => {
    setActiveModal(null);
    setWipeStep(1);
    setModalPassword('');
    setFile(null);
    setModalError('');
    setModalSuccess('');
  };

  const handleBackupAndWipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsProcessing(true);

    try {
      if (wipeStep === 1) {
        const res = await fetch('/api/settings/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: modalUsername, password: modalPassword })
        });
        const data = await res.json();

        if (res.ok) {
          const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `Ledger_Backup_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setWipeStep(2);
        } else {
          setModalError(data.error || 'Verification failed');
        }
      } else if (wipeStep === 2) {
        const res = await fetch('/api/settings/data', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: modalUsername, password: modalPassword })
        });
        if (res.ok) {
          setModalSuccess('All data has been permanently deleted.');
          setTimeout(closeModal, 2000);
        } else {
          const data = await res.json();
          setModalError(data.error || 'Failed to delete data');
        }
      }
    } catch (err: unknown) {
      setModalError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setModalError('Please select a backup file');
    setModalError(''); setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') throw new Error('Invalid file format');
        
        const payload = JSON.parse(result);
        const res = await fetch('/api/settings/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: modalUsername, password: modalPassword, payload })
        });
        
        if (res.ok) {
          setModalSuccess('Data restored successfully!');
          setTimeout(() => { closeModal(); window.location.reload(); }, 2000);
        } else {
          const data = await res.json();
          setModalError(data.error || 'Restore failed');
        }
      } catch (err: unknown) {
        setModalError('Invalid JSON backup file or network error');
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.onerror = () => {
      setModalError('Failed to read the file');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-6 -mt-4 pb-24"
    >
      {/* Profile Summary */}
      <motion.section variants={itemVariants} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4 relative z-10">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
          <UserCircle className="h-10 w-10" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-900 truncate">{user.fullName}</h2>
          <p className="text-sm text-slate-500 font-medium truncate">@{user.username}</p>
          {user.isGodMode && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-md">
              <ShieldCheck className="h-3 w-3" /> God Mode Active
            </span>
          )}
        </div>
      </motion.section>

      {/* Change Password Form */}
      <motion.section variants={itemVariants} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <Key className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">{error}</div>}
          {success && <div className="p-3 text-sm text-green-700 bg-green-50 rounded-xl border border-green-100">{success}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
            <input type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter current password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter new password" />
          </div>
          <button type="submit" disabled={isUpdating || !oldPassword || !newPassword} className="w-full h-12 mt-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isUpdating ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </motion.section>

      {/* Data Management Section */}
      <motion.section variants={itemVariants} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative z-10">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <Database className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-bold text-slate-900">Data Management</h2>
        </div>
        <div className="space-y-4">
          <button onClick={() => setActiveModal('restore')} className="w-full h-14 bg-blue-50 text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
            <UploadCloud className="h-5 w-5" /> Restore Data from Backup
          </button>
          <button onClick={() => setActiveModal('wipe')} className="w-full h-14 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
            <AlertTriangle className="h-5 w-5" /> Clear All Data
          </button>
          <p className="text-xs text-slate-400 text-center px-4">
            Clearing data will automatically generate and download a backup file first for your safety.
          </p>
        </div>
      </motion.section>

      {/* Logout Button */}
      <motion.button
        variants={itemVariants}
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full h-14 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors relative z-10"
      >
        <LogOut className="h-5 w-5" />
        {isLoggingOut ? 'Signing out...' : 'Sign Out'}
      </motion.button>

      {/* --- MODALS --- */}
      {activeModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closeModal} />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative bg-white rounded-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col"
          >
            {modalSuccess ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900">{modalSuccess}</h3>
              </div>
            ) : (
              <>
                {/* WIPE MODAL */}
                {activeModal === 'wipe' && (
                  <form onSubmit={handleBackupAndWipe} className="space-y-4">
                    {wipeStep === 1 ? (
                      <>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
                          <Download className="h-6 w-6 text-blue-600" /> Verify Identity
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                          To protect your data, please enter your credentials. We will download a secure backup file before proceeding.
                        </p>
                        <input type="text" required value={modalUsername} onChange={e => setModalUsername(e.target.value)} className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" placeholder="Username" />
                        <input type="password" required value={modalPassword} onChange={e => setModalPassword(e.target.value)} className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" placeholder="Password" />
                        
                        {modalError && <p className="text-red-500 text-sm font-semibold">{modalError}</p>}
                        
                        <div className="flex gap-3 mt-2">
                          <button type="button" onClick={closeModal} className="flex-1 h-14 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">Cancel</button>
                          <button type="submit" disabled={isProcessing} className="flex-1 h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                            {isProcessing ? 'Verifying...' : 'Download Backup'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold text-red-600 flex items-center gap-2 mb-2">
                          <ShieldAlert className="h-6 w-6" /> Final Confirmation
                        </h3>
                        <p className="text-sm text-slate-700 mb-4 font-medium bg-red-50 p-4 rounded-xl border border-red-100">
                          Your backup has been downloaded. Are you absolutely sure you want to permanently delete ALL your transactions, ledgers, and expenses? This cannot be undone.
                        </p>
                        
                        {modalError && <p className="text-red-500 text-sm font-semibold">{modalError}</p>}
                        
                        <div className="flex gap-3 mt-4">
                          <button type="button" onClick={closeModal} className="flex-1 h-14 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">
                            Cancel
                          </button>
                          <button type="submit" disabled={isProcessing} className="flex-[2] h-14 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50">
                            {isProcessing ? 'Wiping...' : 'Yes, Wipe It All'}
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}

                {/* RESTORE MODAL */}
                {activeModal === 'restore' && (
                  <form onSubmit={handleRestore} className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
                      <UploadCloud className="h-6 w-6 text-blue-600" /> Restore Data
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Uploading a backup will replace your current data. Please verify your identity.
                    </p>
                    
                    <input type="text" required value={modalUsername} onChange={e => setModalUsername(e.target.value)} className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" placeholder="Username" />
                    <input type="password" required value={modalPassword} onChange={e => setModalPassword(e.target.value)} className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" placeholder="Password" />
                    
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
                      <input 
                        type="file" 
                        accept=".json" 
                        required
                        onChange={e => setFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
                      />
                    </div>
                    
                    {modalError && <p className="text-red-500 text-sm font-semibold">{modalError}</p>}
                    
                    <div className="flex gap-3 mt-2">
                      <button type="button" onClick={closeModal} className="flex-1 h-14 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">Cancel</button>
                      <button type="submit" disabled={isProcessing || !file} className="flex-1 h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                        {isProcessing ? 'Restoring...' : 'Restore Data'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}