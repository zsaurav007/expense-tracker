'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { ArrowLeft, FolderOpen, Calendar } from 'lucide-react';

// --- FRAMER MOTION VARIANTS ---
// FIX: Added 'Variants' type and 'as const' to resolve Framer Motion TypeScript errors
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
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter state (defaults to 'month' per your request)
  const [filter, setFilter] = useState<'week' | 'month' | 'year' | 'all'>('month');

  const fetchHistory = async () => {
    setIsLoading(true);
    const res = await fetch(`/api/expense-profiles/${params.id}?filter=${filter}`);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setTransactions(data.transactions);
      setTotal(data.total);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, filter]);

  if (!profile && !isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Ledger not found</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 sticky top-0 z-20"
      >
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-slate-700" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 truncate flex-1">{profile?.name || 'Loading...'}</h1>
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
                <motion.div variants={itemVariants} key={tx.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                      <FolderOpen className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{tx.description || profile?.name}</p>
                      <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()} • {tx.transaction_method}</p>
                    </div>
                  </div>
                  <p className="font-bold text-red-600">-৳{Number(tx.amount).toLocaleString()}</p>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}