'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Plus, ArrowUpRight, FolderOpen, ChevronRight, Wallet, Edit, Trash2, X, SlidersHorizontal } from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';
import { TopControls, PaginationControls } from '@/components/ListControls';

// --- TYPESCRIPT DEFINITIONS ---
interface TransactionFunding {
  person_id: string;
  amount: number | string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number | string;
  date: string;
  source_or_method: string;
  transaction_method: string;
  description?: string;
  person_id?: string;
  expense_profile_id?: string;
  people_profiles?: { name: string };
  expense_profiles?: { name: string };
  transaction_fundings?: TransactionFunding[];
}

interface ProfileOption {
  label: string;
  value: string;
}

interface FundingSource {
  id: string;
  personId: string;
  amount: string;
}

// --- UTILITIES ---
const formatDate = (dateInput: string | Date): string => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getLocalToday = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

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

export default function ExpensePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenseProfiles, setExpenseProfiles] = useState<ProfileOption[]>([]);
  const [peopleOptions, setPeopleOptions] = useState<ProfileOption[]>([]);
  const [personMaxLimits, setPersonMaxLimits] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // --- LIST CONTROLS STATE (Search, Filter, Sort, Pagination) ---
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
    { label: 'General Expenses', value: 'EXPENSE' },
    { label: 'Loans Given', value: 'LEND' },
    { label: 'Installments Paid', value: 'BORROW_REPAYMENT' },
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
  
  const todayDate = getLocalToday();
  const [date, setDate] = useState(todayDate);
  
  const [profileId, setProfileId] = useState('');
  const [oneTimeName, setOneTimeName] = useState(''); 
  const [method, setMethod] = useState('');
  const [description, setDescription] = useState('');
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [methods, setMethods] = useState([
    { label: 'Cash', value: 'Cash' }, { label: 'Bank', value: 'Bank' }, 
    { label: 'bKash', value: 'bKash' }, { label: 'Nagad', value: 'Nagad' },
  ]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [txRes, profRes, peopleRes] = await Promise.all([
        fetch('/api/transactions?type=EXPENSE,LEND,BORROW,BORROW_REPAYMENT,LEND_REPAYMENT'),
        fetch('/api/expense-profiles'),
        fetch('/api/people')
      ]);
      
      let allTxs: Transaction[] = [];
      if (txRes.ok) {
        const data = await txRes.json();
        allTxs = data.transactions || [];
        
        // PERFECT FIX: We only visually display money going OUT (Expense, Give Loan, Pay Installment).
        const visibleTxs = allTxs.filter(tx => ['EXPENSE', 'LEND', 'BORROW_REPAYMENT'].includes(tx.type));
        setTransactions(visibleTxs);
      }
      
      if (profRes.ok) {
        const data = await profRes.json();
        setExpenseProfiles((data.profiles || []).map((p: any) => ({ label: p.name, value: p.id })));
      }

      if (peopleRes.ok) {
        const data = await peopleRes.json();
        const rawPeople = data.people || [];
        setPeopleOptions(rawPeople.map((p: any) => ({ label: p.name, value: p.id })));

        // Calculate precise unspent loan limit per person using ALL transactions
        const limits: Record<string, number> = {};
        rawPeople.forEach((p: any) => {
          let totalBorrowed = 0;
          let totalRepaid = 0;
          let totalSpentFromPerson = 0;

          allTxs.forEach(tx => {
            if (tx.person_id === p.id) {
              const amt = Number(tx.amount);
              if (tx.type === 'BORROW') totalBorrowed += amt;
              if (tx.type === 'BORROW_REPAYMENT') totalRepaid += amt;
            }
            if (tx.transaction_fundings) {
              tx.transaction_fundings.forEach(f => {
                if (f.person_id === p.id) {
                  // If editing, exclude the current transaction's contribution so you can reuse/modify it safely
                  if (!editingTxId || tx.id !== editingTxId) {
                    totalSpentFromPerson += Number(f.amount);
                  }
                }
              });
            }
          });

          limits[p.id] = Math.max(0, (totalBorrowed - totalRepaid) - totalSpentFromPerson);
        });
        setPersonMaxLimits(limits);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    setMounted(true);
    fetchData(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTxId]);

  const handleAddMethod = (val: string) => {
    setMethods(p => [...p, { label: val, value: val }]);
    setMethod(val);
  };

  const handleAddProfile = async (name: string) => {
    try {
      const res = await fetch('/api/expense-profiles', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }) 
      });
      if (res.ok) {
        const data = await res.json();
        setExpenseProfiles(p => [...p, { label: data.profile.name, value: data.profile.id }]);
        setProfileId(data.profile.id);
      } else {
        alert("Failed to create new ledger profile.");
      }
    } catch (error) {
      alert("An error occurred while creating the ledger.");
    }
  };

  // --- FUNDING SPLIT ACTIONS ---
  const addFundingSource = () => {
    setFundingSources([...fundingSources, { id: Math.random().toString(36).substring(2, 9), personId: '', amount: '' }]);
  };

  const removeFundingSource = (id: string) => {
    setFundingSources(fundingSources.filter(f => f.id !== id));
  };

  const updateFundingSource = (id: string, field: 'personId' | 'amount', value: string) => {
    setFundingSources(prev => prev.map(f => {
      if (f.id === id) {
        // If the person is changed, reset the amount to 0/empty to prevent accidental over-drafting
        if (field === 'personId' && f.personId !== value) {
          return { ...f, personId: value, amount: '' };
        }
        return { ...f, [field]: value };
      }
      return f;
    }));
  };

  const totalFunded = fundingSources.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
  const isOverFunded = parseFloat(amount || '0') > 0 && totalFunded > parseFloat(amount || '0');

  const hasExceededPersonLimit = fundingSources.some(f => {
    if (!f.personId) return false;
    const limit = personMaxLimits[f.personId] ?? 0;
    return parseFloat(f.amount || '0') > limit;
  });

  const hasEmptySource = fundingSources.some(f => !f.personId || !f.amount);

  const resetForm = () => {
    setEditingTxId(null);
    setAmount('');
    setMethod('');
    setDescription('');
    setDate(todayDate);
    setProfileId('');
    setOneTimeName('');
    setFundingSources([]);
  };

  // --- CRUD ACTIONS ---
  const handleEditClick = (tx: Transaction, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setEditingTxId(tx.id);
    setAmount(tx.amount.toString());
    setMethod(tx.transaction_method);
    setDate(tx.date);
    setDescription(tx.description || '');
    setProfileId(tx.expense_profile_id || 'NONE');
    setOneTimeName(!tx.expense_profile_id && tx.type === 'EXPENSE' ? tx.source_or_method : '');
    
    if (tx.transaction_fundings && tx.transaction_fundings.length > 0) {
      setFundingSources(tx.transaction_fundings.map(f => ({
        id: Math.random().toString(36).substring(2, 9),
        personId: f.person_id,
        amount: f.amount.toString()
      })));
    } else {
      setFundingSources([]);
    }

    setShowModal(true);
  };

  const handleDeleteClick = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this expense record? (This will also release any split funds back to the lenders.)")) return;
    
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to delete the record.");
      }
    } catch (error) {
      alert("An error occurred while deleting.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverFunded) {
      alert("The total funded amount cannot exceed the total expense amount!");
      return;
    }
    if (hasExceededPersonLimit) {
      alert("One or more funding amounts exceed the selected person's available unspent loan balance!");
      return;
    }

    setIsSaving(true);
    
    const validFundings = fundingSources
      .filter(f => f.personId && f.amount && parseFloat(f.amount) > 0)
      .map(f => ({ personId: f.personId, amount: parseFloat(f.amount) }));

    const payload = {
      type: 'EXPENSE', 
      amount: parseFloat(amount), 
      method, 
      date, 
      description,
      source: profileId === 'NONE' ? (oneTimeName.trim() || 'General Expense') : expenseProfiles.find(p => p.value === profileId)?.label,
      profileId: profileId !== 'NONE' ? profileId : null,
      fundingSources: validFundings
    };
    
    try {
      let res;
      if (editingTxId) {
        res = await fetch(`/api/transactions/${editingTxId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/transactions', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) 
        });
      }

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        alert("Failed to save the record.");
      }
    } catch (error) {
      alert("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const profileOptions = [{ label: 'No Profile (One-time)', value: 'NONE' }, ...expenseProfiles];

  // --- DATA PROCESSING (Search, Filter, Sort, Date, Pagination) ---
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
        tx.expense_profiles?.name?.toLowerCase().includes(lowerTerm) ||
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
        className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex flex-col gap-4 sticky top-0 z-40"
      >
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
          <div className="flex items-center gap-2">
            {/* FILTER TOGGLE BUTTON */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-red-100 transition-colors">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>
        <Link href="/dashboard/expense/profiles" className="w-full h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center gap-2 font-medium hover:bg-slate-200 transition-colors">
          <FolderOpen className="h-4 w-4" /> Manage Expense Ledgers
        </Link>
      </motion.header>

      {/* DYNAMIC TOTAL SUMMARY BOX */}
      <motion.div variants={itemVariants} initial="hidden" animate="show" className="px-6 pt-6 relative z-10">
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex flex-col justify-center shadow-sm">
          <span className="text-xs text-red-700 font-medium mb-1">Total Expense (Filtered)</span>
          <span className="text-2xl font-bold text-red-700">৳{totalFilteredAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                searchPlaceholder="Search expense records..."
                dateFilter={dateFilter}
                setDateFilter={(val) => { setDateFilter(val); setCurrentPage(1); }}
                dateOptions={dateFilterOptions}
              />
              
              {/* Custom Date Inputs */}
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
         paginatedTransactions.length === 0 ? <p className="text-center text-slate-400 py-8 bg-white rounded-2xl border border-dashed border-slate-200">No expense records found.</p> :
         paginatedTransactions.map((tx) => {
         
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
         
         const isFunded = tx.transaction_fundings && tx.transaction_fundings.length > 0;
         let funderNames = '';

         if (isFunded) {
           const names = tx.transaction_fundings!.map(f => {
             const p = peopleOptions.find(opt => opt.value === f.person_id);
             return p ? p.label : 'Unknown';
           });
           funderNames = `Funded by: ${names.join(', ')}`;
         }
         
         const CardContent = (
           <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors gap-4 group">
             <div className="flex items-center gap-3 flex-1 min-w-0">
               <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center border border-red-100 shrink-0 relative">
                 <Icon className="h-5 w-5 text-red-600" />
                 {isFunded && <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 border-2 border-white rounded-full"></div>}
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-start gap-1">
                   <p className="font-semibold text-slate-900 leading-tight break-words">{displayName}</p>
                   {(tx.expense_profile_id || tx.person_id) && <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />}
                 </div>
                 <p className="text-xs text-slate-500 mt-1 break-words leading-snug">{formatDate(tx.date)} • {subText}</p>
                 {isFunded && (
                   <p className="text-[11px] font-medium text-blue-600 mt-0.5 leading-snug truncate">
                     {funderNames}
                   </p>
                 )}
               </div>
             </div>
             
             <div className="flex flex-col items-end gap-2 shrink-0">
               <p className="font-bold text-red-600 whitespace-nowrap">-৳{Number(tx.amount).toLocaleString()}</p>
               
               {tx.type === 'EXPENSE' && (
                 <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={(e) => handleEditClick(tx, e)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                     <Edit className="h-4 w-4" />
                   </button>
                   <button onClick={(e) => handleDeleteClick(tx.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                     <Trash2 className="h-4 w-4" />
                   </button>
                 </div>
               )}
             </div>
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
                className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col max-h-[92vh]"
              >
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                    {editingTxId ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                    {editingTxId ? 'Edit Expense' : 'Add Expense'}
                  </h3>
                  <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                  <div className="space-y-4 overflow-y-auto px-1 pb-48 flex-1 overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (৳)</label>
                      <input 
                        type="number" required min="0" step="0.01" 
                        value={amount} onChange={(e) => setAmount(e.target.value)} 
                        className={`w-full h-14 px-4 text-xl font-bold rounded-xl border focus:outline-none focus:ring-2 transition-all bg-white text-slate-900 placeholder:text-slate-400 ${isOverFunded ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'}`}
                        placeholder="0.00" 
                      />
                      {isOverFunded && <p className="text-xs text-red-500 mt-1.5 font-medium">Funded amount exceeds expense total!</p>}
                    </div>
                    
                    <div className="relative z-50">
                      <CustomDropdown label="Asset Category / Profile" options={profileOptions} value={profileId} onChange={setProfileId} onAdd={handleAddProfile} addLabel="Create category" />
                    </div>

                    <AnimatePresence>
                      {profileId === 'NONE' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                          animate={{ opacity: 1, height: 'auto', marginTop: 16 }} 
                          exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                          className="overflow-hidden relative z-40"
                        >
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Asset Name (One-time)</label>
                          <input 
                            type="text" required 
                            value={oneTimeName} onChange={(e) => setOneTimeName(e.target.value)} 
                            className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                            placeholder="e.g. Gaming PC" 
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="relative z-30">
                      <CustomDropdown label="Payment Method" options={methods} value={method} onChange={setMethod} onAdd={handleAddMethod} addLabel="Add new method" />
                    </div>
                    
                    <div className="relative z-20">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                      <input 
                        type="date" required max={todayDate}
                        value={date} onChange={(e) => setDate(e.target.value)} 
                        className="w-full h-14 px-4 bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                      />
                    </div>
                    
                    <div className="relative z-10">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (Optional)</label>
                      <input 
                        type="text" 
                        value={description} onChange={(e) => setDescription(e.target.value)} 
                        className="w-full h-14 px-4 text-slate-900 bg-white placeholder:text-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                        placeholder="e.g. Additional remarks" 
                      />
                    </div>

                    <div className="pt-6 mt-4 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-900">Funded By (Optional)</label>
                          <p className="text-[10px] text-slate-500 mt-0.5">Split expense across loans you've taken</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={addFundingSource} 
                          disabled={hasEmptySource}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${hasEmptySource ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                        >
                          <Plus className="h-3.5 w-3.5"/> Add Source
                        </button>
                      </div>

                      {fundingSources.map((source) => {
                        const availablePeople = peopleOptions.filter(p => 
                          p.value === source.personId || !fundingSources.some(f => f.personId === p.value)
                        );

                        const maxLimitForPerson = source.personId ? (personMaxLimits[source.personId] ?? 0) : null;
                        const isThisExceeded = maxLimitForPerson !== null && parseFloat(source.amount || '0') > maxLimitForPerson;

                        return (
                          <div key={source.id} className="mb-3">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <CustomDropdown 
                                  options={availablePeople} 
                                  value={source.personId} 
                                  onChange={(val) => updateFundingSource(source.id, 'personId', val)} 
                                  label="" 
                                />
                              </div>
                              <div className="w-1/3 shrink-0">
                                <input 
                                  type="number" min="0" step="0.01" required placeholder="Amount"
                                  max={maxLimitForPerson !== null ? maxLimitForPerson : undefined}
                                  value={source.amount} onChange={(e) => updateFundingSource(source.id, 'amount', e.target.value)} 
                                  className={`w-full h-14 px-3 text-sm rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${isThisExceeded ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'}`}
                                />
                              </div>
                              <button type="button" onClick={() => removeFundingSource(source.id)} className="h-14 w-10 flex items-center justify-center text-slate-400 hover:text-red-500 bg-slate-50 rounded-xl shrink-0 transition-colors">
                                <X className="h-5 w-5"/>
                              </button>
                            </div>
                            {maxLimitForPerson !== null && (
                              <p className={`text-[11px] mt-1 font-medium ${isThisExceeded ? 'text-red-500' : 'text-slate-500'}`}>
                                {isThisExceeded ? `Exceeds max available: ৳${maxLimitForPerson.toLocaleString()}` : `Max available: ৳${maxLimitForPerson.toLocaleString()}`}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>

                  <div className="pt-4 mt-auto shrink-0 bg-white border-t border-slate-100">
                    <button 
                      type="submit" 
                      disabled={isSaving || !profileId || !method || (profileId === 'NONE' && !oneTimeName.trim()) || isOverFunded || hasExceededPersonLimit || hasEmptySource} 
                      className="w-full h-14 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? 'Processing...' : editingTxId ? 'Update Record' : 'Save Expense'}
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