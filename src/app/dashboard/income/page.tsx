'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Plus, ArrowDownRight, HandCoins, ChevronRight, Edit, Trash2, X, SlidersHorizontal } from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';
import { TopControls, PaginationControls } from '@/components/ListControls';

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
  people_profiles?: { name: string };
};

// --- UTILITIES ---
const getLocalISODate = (dateObj: Date) => {
  const offset = dateObj.getTimezoneOffset() * 60000;
  return new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
};

const getStartDate = (filter: string) => {
  const now = new Date();
  if (filter === 'week') {
    now.setDate(now.getDate() - now.getDay()); 
    return getLocalISODate(now);
  }
  if (filter === 'month') {
    now.setDate(1);
    return getLocalISODate(now);
  }
  return null;
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

export default function IncomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // --- LIST CONTROLS STATE ---
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const filterOptions = [
    { label: 'All Types', value: 'ALL' },
    { label: 'General Income', value: 'INCOME' },
    { label: 'Loans Taken', value: 'BORROW' },
    { label: 'Installments Received', value: 'LEND_REPAYMENT' },
  ];

  const sortOptions = [
    { label: 'Newest First', value: 'date-desc' },
    { label: 'Oldest First', value: 'date-asc' },
    { label: 'Highest Amount', value: 'amount-desc' },
    { label: 'Lowest Amount', value: 'amount-asc' },
  ];

  const dateFilterOptions = [
    { label: 'All Time', value: 'all' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Custom Range', value: 'custom' },
  ];
  
  // --- MODAL & FORM STATE ---
  const [showModal, setShowModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState('');
  const [method, setMethod] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [sources, setSources] = useState([
    { label: 'Salary', value: 'Salary' },
    { label: 'Business', value: 'Business' },
    { label: 'Freelancing', value: 'Freelancing' },
  ]);
  const [methods, setMethods] = useState([
    { label: 'Cash', value: 'Cash' }, { label: 'Bank', value: 'Bank' }, 
    { label: 'bKash', value: 'bKash' }, { label: 'Nagad', value: 'Nagad' },
  ]);

  const fetchIncome = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/transactions?type=INCOME,BORROW,LEND_REPAYMENT');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Failed to fetch income", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    setMounted(true);
    fetchIncome(); 
  }, []);

  const handleAddSource = (val: string) => {
    setSources(p => [...p, { label: val, value: val }]);
    setSource(val);
  };
  const handleAddMethod = (val: string) => {
    setMethods(p => [...p, { label: val, value: val }]);
    setMethod(val);
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSource('');
    setMethod('');
    setDate(new Date().toISOString().split('T')[0]);
    setEditingTxId(null);
  };

  const handleEditClick = (tx: Transaction, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setEditingTxId(tx.id);
    setAmount(tx.amount.toString());
    setSource(tx.source_or_method);
    setMethod(tx.transaction_method);
    setDate(tx.date);
    setDescription(tx.description || '');
    setShowModal(true);
  };

  const handleDeleteClick = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this income record?")) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchIncome();
      else alert("Failed to delete the record.");
    } catch (error) {
      alert("An error occurred while deleting.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = { type: 'INCOME', amount: parseFloat(amount), source, method, date, description };

    try {
      const res = await fetch(editingTxId ? `/api/transactions/${editingTxId}` : '/api/transactions', {
        method: editingTxId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchIncome();
      } else {
        alert("Failed to save the record.");
      }
    } catch (error) {
      alert("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- DATA PROCESSING (Search, Filter, Sort, Pagination) ---
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // 1. Date Filter
    if (dateFilter === 'custom') {
      if (customStartDate) result = result.filter(tx => tx.date.split('T')[0] >= customStartDate);
      if (customEndDate) result = result.filter(tx => tx.date.split('T')[0] <= customEndDate);
    } else if (dateFilter !== 'all') {
      const startDate = getStartDate(dateFilter);
      if (startDate) result = result.filter(tx => tx.date.split('T')[0] >= startDate);
    }

    // 2. Type Filter
    if (filterType !== 'ALL') {
      result = result.filter(tx => tx.type === filterType);
    }

    // 3. Search Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(tx => 
        tx.source_or_method?.toLowerCase().includes(lowerTerm) ||
        tx.description?.toLowerCase().includes(lowerTerm) ||
        tx.transaction_method?.toLowerCase().includes(lowerTerm) ||
        tx.people_profiles?.name?.toLowerCase().includes(lowerTerm)
      );
    }

    // 4. Sort
    result.sort((a, b) => {
      if (sortOrder === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortOrder === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortOrder === 'amount-desc') return Number(b.amount) - Number(a.amount);
      if (sortOrder === 'amount-asc') return Number(a.amount) - Number(b.amount);
      return 0;
    });

    return result;
  }, [transactions, searchTerm, filterType, sortOrder, dateFilter, customStartDate, customEndDate]);

  const totalFilteredAmount = processedTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = processedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-40"
      >
        <h1 className="text-xl font-bold text-slate-900">Income</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          
          <button 
            onClick={() => { resetForm(); setShowModal(true); }} 
            className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-blue-100 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </motion.header>

      {/* DYNAMIC TOTAL SUMMARY BOX */}
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="px-6 pt-6 relative z-10">
        <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex flex-col justify-center shadow-sm">
          <span className="text-xs text-green-700 font-medium mb-1">Total Income (Filtered)</span>
          <span className="text-2xl font-bold text-green-700">৳{totalFilteredAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </motion.div>

      {/* REUSABLE LIST CONTROLS WITH SMOOTH TOGGLE & NO CLIPPING */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10, display: 'none' }}
            animate={{ opacity: 1, y: 0, display: 'block' }}
            exit={{ opacity: 0, y: -10, transitionEnd: { display: 'none' } }}
            transition={{ duration: 0.2 }}
            className="bg-slate-50 relative z-30"
          >
            <div className="pb-4">
              <TopControls 
                searchTerm={searchTerm} 
                setSearchTerm={(val) => { setSearchTerm(val); setCurrentPage(1); }} 
                filterType={filterType} 
                setFilterType={(val) => { setFilterType(val); setCurrentPage(1); }} 
                filterOptions={filterOptions} 
                sortOrder={sortOrder} 
                setSortOrder={(val) => { setSortOrder(val); setCurrentPage(1); }} 
                sortOptions={sortOptions} 
                searchPlaceholder="Search income records..."
                dateFilter={dateFilter}
                setDateFilter={(val) => { setDateFilter(val); setCurrentPage(1); }}
                dateOptions={dateFilterOptions}
              />
              
              {/* Custom Date Inputs - Kept completely visible */}
              {dateFilter === 'custom' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="px-6 mt-3 relative z-20"
                >
                  <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">From</label>
                      <input 
                        type="date" 
                        value={customStartDate} 
                        onChange={e => { setCustomStartDate(e.target.value); setCurrentPage(1); }} 
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm focus:outline-none bg-slate-50" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">To</label>
                      <input 
                        type="date" 
                        value={customEndDate} 
                        onChange={e => { setCustomEndDate(e.target.value); setCurrentPage(1); }} 
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm focus:outline-none bg-slate-50" 
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 pb-24 space-y-3 relative z-0"
      >
        {isLoading ? <p className="text-center text-slate-400 py-8">Loading...</p> : 
         paginatedTransactions.length === 0 ? <p className="text-center text-slate-400 py-8 bg-white rounded-2xl border border-dashed border-slate-200">No income records found.</p> :
         paginatedTransactions.map((tx) => {
           
           let Icon = ArrowDownRight;
           let displayName = tx.source_or_method;
           let subText = tx.description ? `${tx.description} • ${tx.transaction_method}` : tx.transaction_method;

           if (tx.type === 'BORROW') {
             Icon = ArrowDownRight;
             displayName = `Loan Taken from ${tx.people_profiles?.name || tx.source_or_method}`;
           } else if (tx.type === 'LEND_REPAYMENT') {
             Icon = HandCoins;
             displayName = `Installment Received from ${tx.people_profiles?.name || tx.source_or_method}`;
           }

           const CardContent = (
             <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors gap-4 group">
               <div className="flex items-center gap-3 flex-1 min-w-0">
                 <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center border border-green-100 shrink-0">
                   <Icon className="h-5 w-5 text-green-600" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-start gap-1">
                     <p className="font-semibold text-slate-900 leading-tight break-words">{displayName}</p>
                     {tx.person_id && <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />}
                   </div>
                   <p className="text-xs text-slate-500 mt-1 break-words leading-snug">{new Date(tx.date).toLocaleDateString()} • {subText}</p>
                 </div>
               </div>
               
               <div className="flex flex-col items-end gap-2 shrink-0">
                 <p className="font-bold text-green-600 whitespace-nowrap">+৳{Number(tx.amount).toLocaleString()}</p>
                 
                 {tx.type === 'INCOME' && (
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

           const isLedgerLink = ['BORROW', 'LEND_REPAYMENT'].includes(tx.type) && tx.person_id;

           return (
             <motion.div key={tx.id} variants={itemVariants}>
               {isLedgerLink ? (
                 <Link href={`/dashboard/ledger/${tx.person_id}`} className="block">
                   {CardContent}
                 </Link>
               ) : (
                 <div>{CardContent}</div>
               )}
             </motion.div>
           );
         })}

         {/* REUSABLE PAGINATION CONTROLS */}
         {!isLoading && (
           <motion.div variants={itemVariants}>
             <PaginationControls 
                currentPage={currentPage} 
                totalPages={totalPages} 
                itemsPerPage={itemsPerPage} 
                setItemsPerPage={setItemsPerPage} 
                setCurrentPage={setCurrentPage} 
                totalItems={processedTransactions.length}
             />
           </motion.div>
         )}
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
                    {editingTxId ? 'Edit Income' : 'Add Income'}
                  </h3>
                  <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                  <div className="space-y-4 overflow-y-auto px-1 pb-32 flex-1 overscroll-contain">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (৳)</label>
                      <input 
                        type="number" required min="0" step="0.01" 
                        value={amount} onChange={(e) => setAmount(e.target.value)} 
                        className="w-full h-14 px-4 text-xl font-bold text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="0.00" 
                      />
                    </div>
                    
                    <div className="relative z-50">
                      <CustomDropdown label="Source" options={sources} value={source} onChange={setSource} onAdd={handleAddSource} addLabel="Add source" />
                    </div>
                    
                    <div className="relative z-40">
                      <CustomDropdown label="Method" options={methods} value={method} onChange={setMethod} onAdd={handleAddMethod} addLabel="Add method" />
                    </div>
                    
                    <div className="relative z-30">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                      <input 
                        type="date" required 
                        value={date} onChange={(e) => setDate(e.target.value)} 
                        className="w-full h-14 px-4 bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                    
                    <div className="relative z-20">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (Optional)</label>
                      <input 
                        type="text" 
                        value={description} onChange={(e) => setDescription(e.target.value)} 
                        className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g. Bonus" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 mt-auto shrink-0 bg-white border-t border-slate-100">
                    <button type="submit" disabled={isSaving || !source || !method} className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isSaving ? 'Processing...' : editingTxId ? 'Update Record' : 'Save Income'}
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