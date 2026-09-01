'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  UserPlus, Users, LogOut, Key, Shield, UserCircle, 
  Activity, Clock, ChevronRight, ShieldCheck, X, Edit, Trash2 
} from 'lucide-react';

type AppUser = {
  id: string;
  full_name: string;
  username: string;
  created_at: string;
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function MasterDashboard() {
  const router = useRouter();
  const [masterUserId, setMasterUserId] = useState<string | null>(null);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  
  // Create Form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // God Mode state
  const [activeGodModeId, setActiveGodModeId] = useState<string | null>(null);

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<AppUser | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Edit User Modal State
  const [editModalUser, setEditModalUser] = useState<AppUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Delete User Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<AppUser | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  useEffect(() => {
    const checkAuthAndFetchUsers = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/master/login');
        return;
      }
      
      setMasterUserId(session.user.id);
      await fetchUsers();
      setIsLoading(false);
    };

    checkAuthAndFetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, full_name, username, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAppUsers(data as AppUser[]);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, password, masterUserId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setSuccess(`User @${data.user.username} created successfully.`);
      setFullName('');
      setUsername('');
      setPassword('');
      fetchUsers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setIsResetting(true);
    setResetError('');
    setResetSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active master session');

      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: resetModalUser.id, newPassword: newResetPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setResetSuccess(`Password updated successfully for @${resetModalUser.username}`);
      setNewResetPassword('');
      setTimeout(() => {
        setResetModalUser(null);
        setResetSuccess('');
      }, 1500);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsResetting(false);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;
    setIsEditing(true);
    setEditError('');
    setEditSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active master session');

      const res = await fetch('/api/users/update', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: editModalUser.id, fullName: editFullName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setEditSuccess(`User full name updated successfully.`);
      fetchUsers();
      setTimeout(() => {
        setEditModalUser(null);
        setEditSuccess('');
      }, 1500);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModalUser) return;
    setIsDeleting(true);
    setDeleteError('');
    setDeleteSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active master session');

      const res = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: deleteModalUser.id, masterPassword: deletePassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user. Check your password.');

      setDeleteSuccess(`User @${deleteModalUser.username} has been deleted.`);
      setDeletePassword('');
      fetchUsers();
      setTimeout(() => {
        setDeleteModalUser(null);
        setDeleteSuccess('');
      }, 1500);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGodMode = async (userId: string) => {
    setActiveGodModeId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active master session');

      const res = await fetch('/api/auth/god-mode', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to enter God Mode');
      }

      window.location.href = '/dashboard';
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
      setActiveGodModeId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/master/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
        <Shield className="h-10 w-10 text-indigo-500 animate-pulse" />
        <p className="font-medium text-sm tracking-widest uppercase">Initializing Secure Console</p>
      </div>
    );
  }

  const newUsersThisWeek = appUsers.filter(u => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return new Date(u.created_at) >= oneWeekAgo;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans relative">
      
      {/* Navbar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-40"
      >
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-indigo-600 p-2 rounded-md">
            <ShieldCheck className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold leading-tight">Master Control Console</h1>
            <p className="hidden md:block text-xs font-medium text-slate-500 tracking-wider uppercase">System Administrator</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-all border border-transparent hover:border-red-100"
        >
          <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign Out</span>
        </button>
      </motion.nav>

      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto px-4 md:px-6 mt-6 md:mt-8 space-y-6"
      >
        
        {/* Analytics Top Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Active Users</p>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900">{appUsers.length}</h3>
            </div>
            <div className="h-10 w-10 md:h-12 md:w-12 bg-indigo-50 rounded-md flex items-center justify-center text-indigo-600">
              <Users className="h-5 w-5 md:h-6 md:w-6" />
            </div>
          </div>
          
          <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">New This Week</p>
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900">+{newUsersThisWeek}</h3>
            </div>
            <div className="h-10 w-10 md:h-12 md:w-12 bg-emerald-50 rounded-md flex items-center justify-center text-emerald-600">
              <Activity className="h-5 w-5 md:h-6 md:w-6" />
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-lg shadow-sm flex items-center justify-between text-white relative overflow-hidden sm:col-span-2 lg:col-span-1">
            <div className="relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">System Status</p>
              <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span> All Systems Operational
              </h3>
            </div>
            <Clock className="h-24 w-24 absolute -right-4 -bottom-4 text-slate-800 opacity-50 pointer-events-none" />
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create User Form Section */}
          <motion.section variants={itemVariants} className="lg:col-span-1 bg-white p-5 md:p-6 rounded-lg shadow-sm border border-slate-200 h-fit order-2 lg:order-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h2 className="text-base font-bold text-slate-900">Provision New User</h2>
              <UserPlus className="h-4 w-4 text-indigo-600" />
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100 font-medium">{error}</div>}
              {success && <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-md border border-emerald-100 font-medium">{success}</div>}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Unique Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="e.g. johndoe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Initial Password</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Strong password required"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 mt-2 flex justify-center items-center rounded-md bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
              >
                {isSubmitting ? 'Provisioning Account...' : 'Provision Account'}
              </button>
            </form>
          </motion.section>

          {/* Existing Users List Section */}
          <motion.section variants={itemVariants} className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col order-1 lg:order-2">
            <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">User Directory</h2>
                <p className="text-xs text-slate-500 mt-1">Manage and access sub-user environments.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="overflow-y-auto max-h-[600px] min-w-[600px]">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="px-6 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">User Profile</th>
                      <th className="px-6 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs hidden sm:table-cell">Joined</th>
                      <th className="px-6 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appUsers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                          No active users in the directory.
                        </td>
                      </tr>
                    ) : (
                      appUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold uppercase shrink-0 border border-indigo-100">
                                {user.full_name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{user.full_name}</p>
                                <p className="text-xs text-slate-500">@{user.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden sm:table-cell text-slate-500">
                            {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            {/* Actions always visible on mobile, visible on hover on lg */}
                            <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                              <button 
                                onClick={() => {
                                  setEditModalUser(user);
                                  setEditFullName(user.full_name);
                                  setEditError('');
                                  setEditSuccess('');
                                }}
                                title="Edit Name"
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md border border-slate-200 transition-all flex items-center justify-center"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => {
                                  setResetModalUser(user);
                                  setNewResetPassword('');
                                  setResetError('');
                                  setResetSuccess('');
                                }}
                                title="Reset Password"
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md border border-slate-200 transition-all flex items-center justify-center"
                              >
                                <Key className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => {
                                  setDeleteModalUser(user);
                                  setDeletePassword('');
                                  setDeleteError('');
                                  setDeleteSuccess('');
                                }}
                                title="Delete User"
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md border border-slate-200 transition-all flex items-center justify-center"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => handleGodMode(user.id)}
                                disabled={activeGodModeId === user.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-bold hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                              >
                                <Shield className="h-3 w-3" /> 
                                <span className="hidden sm:inline">{activeGodModeId === user.id ? 'Connecting...' : 'God Mode'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>

        </div>
      </motion.main>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {/* 1. Reset Password Modal */}
        {resetModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setResetModalUser(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-6 z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-md text-indigo-600"><Key className="h-4 w-4" /></div>
                  <div><h3 className="text-base font-bold text-slate-900">Reset Password</h3><p className="text-xs text-slate-500">For user: @{resetModalUser.username}</p></div>
                </div>
                <button onClick={() => setResetModalUser(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                {resetError && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100 font-medium">{resetError}</div>}
                {resetSuccess && <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-md border border-emerald-100 font-medium">{resetSuccess}</div>}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">New Secure Password</label>
                  <input type="text" required value={newResetPassword} onChange={(e) => setNewResetPassword(e.target.value)} className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Enter new password" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setResetModalUser(null)} className="flex-1 h-10 rounded-md border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 text-sm">Cancel</button>
                  <button type="submit" disabled={isResetting || !newResetPassword} className="flex-1 h-10 rounded-md bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 text-sm">{isResetting ? 'Updating...' : 'Confirm Reset'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. Edit User Modal */}
        {editModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditModalUser(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-6 z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-md text-blue-600"><Edit className="h-4 w-4" /></div>
                  <div><h3 className="text-base font-bold text-slate-900">Edit User Profile</h3><p className="text-xs text-slate-500">Update details for @{editModalUser.username}</p></div>
                </div>
                <button onClick={() => setEditModalUser(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleEditUserSubmit} className="space-y-4">
                {editError && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100 font-medium">{editError}</div>}
                {editSuccess && <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-md border border-emerald-100 font-medium">{editSuccess}</div>}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Username (Read-Only)</label>
                  <input type="text" disabled value={editModalUser.username} className="w-full h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Full Name</label>
                  <input type="text" required value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Update full name" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditModalUser(null)} className="flex-1 h-10 rounded-md border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 text-sm">Cancel</button>
                  <button type="submit" disabled={isEditing || !editFullName} className="flex-1 h-10 rounded-md bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 text-sm">{isEditing ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. Delete User Modal */}
        {deleteModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteModalUser(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white rounded-lg shadow-xl border border-red-200 max-w-md w-full p-6 z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-red-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 rounded-md text-red-600"><Trash2 className="h-4 w-4" /></div>
                  <div><h3 className="text-base font-bold text-red-600">Delete User Account</h3></div>
                </div>
                <button onClick={() => setDeleteModalUser(null)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleDeleteUserSubmit} className="space-y-4">
                <p className="text-sm text-slate-600 mb-4 font-medium bg-red-50 p-4 rounded-md border border-red-100">
                  You are about to permanently delete <strong className="text-slate-900">@{deleteModalUser.username}</strong> and all associated data. This action cannot be undone.
                </p>
                {deleteError && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100 font-medium">{deleteError}</div>}
                {deleteSuccess && <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-md border border-emerald-100 font-medium">{deleteSuccess}</div>}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Enter Master Password to Confirm</label>
                  <input type="password" required value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full h-10 px-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" placeholder="••••••••" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setDeleteModalUser(null)} className="flex-1 h-10 rounded-md border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 text-sm">Cancel</button>
                  <button type="submit" disabled={isDeleting || !deletePassword} className="flex-[1.5] h-10 rounded-md bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 text-sm">{isDeleting ? 'Deleting...' : 'Yes, Permanently Delete'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}