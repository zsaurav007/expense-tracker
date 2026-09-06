'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { UserPlus, UserCircle2, ChevronRight, Phone, Edit, Trash2, ShieldAlert, Plus, X, SlidersHorizontal, Bell, CalendarClock, CalendarDays } from 'lucide-react';
import { TopControls, PaginationControls } from '@/components/ListControls';

// --- TYPESCRIPT DEFINITIONS ---
type Person = {
  id: string;
  name: string;
  phone?: string;
  netBalance: number;
  created_at?: string; 
  profile_type?: 'LEND_BORROW' | 'PAY_LATER';
  total_loan?: number; 
  total_paid?: number; 
  due_date?: string | null;
  notify_days_before?: number | null;
  installment_day?: number | null; // NEW: Day of the month for installments (1-31)
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

export default function LedgerHubPage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [newProfileType, setNewProfileType] = useState<'LEND_BORROW' | 'PAY_LATER'>('LEND_BORROW');
  
  // --- ADD PERSON REMINDER STATES ---
  const [isNewHasDueDate, setIsNewHasDueDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotifyDays, setNewNotifyDays] = useState('3');
  const [newInstallmentDay, setNewInstallmentDay] = useState(''); // NEW

  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // --- TAB STATE ---
  const [activeTab, setActiveTab] = useState<'LEND_BORROW' | 'PAY_LATER'>('LEND_BORROW');

  // --- LIST CONTROLS STATE (Search, Filter, Sort, Date, Pagination) ---
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const filterOptions = [
    { label: 'All Accounts', value: 'ALL' },
    { label: 'Loan Receivable', value: 'OWES_ME' },
    { label: 'Loan Payable', value: 'I_OWE' },
    { label: 'Settled Up', value: 'SETTLED' },
  ];

  const sortOptions = [
    { label: 'Name (A-Z)', value: 'name-asc' },
    { label: 'Name (Z-A)', value: 'name-desc' },
    { label: 'Highest Balance', value: 'balance-desc' },
    { label: 'Lowest Balance', value: 'balance-asc' },
  ];

  const dateFilterOptions = [
    { label: 'All Time', value: 'all' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Custom Range', value: 'custom' },
  ];

  // --- MODAL STATES ---
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'delete' | 'reset' | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  
  // --- EDIT PERSON STATES ---
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editIsHasDueDate, setEditIsHasDueDate] = useState(false);
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotifyDays, setEditNotifyDays] = useState('3');
  const [editInstallmentDay, setEditInstallmentDay] = useState(''); // NEW

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
      body: JSON.stringify({ 
        name: newPersonName.trim(), 
        phone: newPersonPhone.trim(),
        profile_type: newProfileType,
        due_date: isNewHasDueDate && newDueDate ? newDueDate : null,
        notify_days_before: isNewHasDueDate ? parseInt(newNotifyDays) : null,
        installment_day: isNewHasDueDate && newInstallmentDay ? parseInt(newInstallmentDay) : null
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setPeople([data.person, ...people]);
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
      body: JSON.stringify({ 
        name: editName, 
        phone: editPhone, 
        password: modalPassword,
        due_date: editIsHasDueDate && editDueDate ? editDueDate : null,
        notify_days_before: editIsHasDueDate ? parseInt(editNotifyDays) : null,
        installment_day: editIsHasDueDate && editInstallmentDay ? parseInt(editInstallmentDay) : null
      }),
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
    setNewProfileType('LEND_BORROW');
    
    setIsNewHasDueDate(false);
    setNewDueDate('');
    setNewNotifyDays('3');
    setNewInstallmentDay('');
  };

  // Filter people strictly by the active tab
  const currentTabPeople = people.filter(p => (p.profile_type || 'LEND_BORROW') === activeTab);
  
  // Totals for top cards
  const totalOwesMe = currentTabPeople.filter(p => p.netBalance > 0).reduce((sum, p) => sum + p.netBalance, 0);
  const totalIOwe = currentTabPeople.filter(p => p.netBalance < 0).reduce((sum, p) => sum + Math.abs(p.netBalance), 0);
  const totalPayLaterLoan = currentTabPeople.reduce((sum, p) => sum + (p.total_loan || 0), 0);

  // --- DATA PROCESSING (Search, Filter, Sort, Pagination) ---
  const processedPeople = useMemo(() => {
    let result = [...currentTabPeople];

    // 1. Date Filter
    if (dateFilter === 'custom') {
      if (customStartDate) result = result.filter(p => p.created_at && p.created_at.split('T')[0] >= customStartDate);
      if (customEndDate) result = result.filter(p => p.created_at && p.created_at.split('T')[0] <= customEndDate);
    } else if (dateFilter !== 'all') {
      const startDate = getStartDate(dateFilter);
      if (startDate) result = result.filter(p => p.created_at && p.created_at.split('T')[0] >= startDate);
    }

    // 2. Filter by Type
    if (filterType === 'OWES_ME') result = result.filter(p => p.netBalance > 0);
    if (filterType === 'I_OWE') result = result.filter(p => p.netBalance < 0);
    if (filterType === 'SETTLED') result = result.filter(p => p.netBalance === 0);

    // 3. Search Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(lowerTerm) || 
        (p.phone && p.phone.toLowerCase().includes(lowerTerm))
      );
    }

    // 4. Sort
    result.sort((a, b) => {
      if (sortOrder === 'name-asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'name-desc') return b.name.localeCompare(a.name);
      if (sortOrder === 'balance-desc') return b.netBalance - a.netBalance;
      if (sortOrder === 'balance-asc') return a.netBalance - b.netBalance;
      return 0;
    });

    return result;
  }, [currentTabPeople, searchTerm, filterType, sortOrder, dateFilter, customStartDate, customEndDate]);

  const totalPages = Math.ceil(processedPeople.length / itemsPerPage) || 1;
  const paginatedPeople = processedPeople.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 sticky top-0 z-40 flex justify-between items-center"
      >
        <h1 className="text-xl font-bold text-slate-900">Ledger Hub</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          <button onClick={() => setActiveModal('reset')} className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-red-100 transition-colors">
            <ShieldAlert className="h-4 w-4" /> Reset
          </button>
          <button onClick={() => setActiveModal('add')} className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-blue-100 transition-colors">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </motion.header>

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
                searchPlaceholder="Search accounts by name or phone..."
                dateFilter={dateFilter}
                setDateFilter={(val) => { setDateFilter(val); setCurrentPage(1); }}
                dateOptions={dateFilterOptions}
              />

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
        className="flex-1 relative z-0"
      >
        <motion.div variants={itemVariants} className="px-6 mt-6 mb-2">
          <div className="flex bg-slate-200/60 p-1.5 rounded-xl">
            <button
              onClick={() => { setActiveTab('LEND_BORROW'); setCurrentPage(1); setFilterType('ALL'); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'LEND_BORROW' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Lend & Borrow
            </button>
            <button
              onClick={() => { setActiveTab('PAY_LATER'); setCurrentPage(1); setFilterType('ALL'); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'PAY_LATER' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Pay Later (Credit)
            </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="p-6 grid grid-cols-2 gap-4">
          <div 
            onClick={() => { 
              if (activeTab === 'PAY_LATER') return;
              setFilterType(filterType === 'OWES_ME' ? 'ALL' : 'OWES_ME'); 
              setCurrentPage(1); 
            }}
            className={`bg-green-50 border p-4 rounded-2xl flex flex-col justify-center shadow-sm transition-all ${activeTab !== 'PAY_LATER' ? 'cursor-pointer hover:shadow-md active:scale-95' : ''} ${filterType === 'OWES_ME' ? 'border-green-400 ring-2 ring-green-200' : 'border-green-100 hover:border-green-300'}`}
          >
            <span className="text-xs text-green-700 font-medium mb-1">
              {activeTab === 'PAY_LATER' ? 'Total Credit' : 'Loan Receivable'}
            </span>
            <span className="text-lg font-bold text-green-700">
              ৳{activeTab === 'PAY_LATER' ? totalPayLaterLoan.toLocaleString() : totalOwesMe.toLocaleString()}
            </span>
          </div>
          <div 
            onClick={() => { 
              setFilterType(filterType === 'I_OWE' ? 'ALL' : 'I_OWE'); 
              setCurrentPage(1); 
            }}
            className={`bg-red-50 border p-4 rounded-2xl flex flex-col justify-center shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95 ${filterType === 'I_OWE' ? 'border-red-400 ring-2 ring-red-200' : 'border-red-100 hover:border-red-300'}`}
          >
            <span className="text-xs text-red-700 font-medium mb-1">
              {activeTab === 'PAY_LATER' ? 'Credit Payable' : 'Loan Payable'}
            </span>
            <span className="text-lg font-bold text-red-700">৳{totalIOwe.toLocaleString()}</span>
          </div>
        </motion.div>

        <div className="px-6 pb-24 space-y-8">
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <motion.h3 variants={itemVariants} className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Accounts</motion.h3>
              {filterType !== 'ALL' && (
                <button onClick={() => { setFilterType('ALL'); setCurrentPage(1); }} className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors">
                  Clear Filter
                </button>
              )}
            </div>
            
            {isLoading ? (
              <p className="text-center text-slate-400 text-sm py-8">Loading profiles...</p>
            ) : paginatedPeople.length === 0 ? (
              <motion.div variants={itemVariants} className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <UserCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No profiles found.</p>
              </motion.div>
            ) : (
              paginatedPeople.map((person) => (
                <motion.div 
                  variants={itemVariants}
                  key={person.id} 
                  onClick={() => router.push(`/dashboard/ledger/${person.id}`)}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl active:bg-slate-50 transition-colors shadow-sm cursor-pointer hover:shadow-md group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-lg font-bold text-slate-600 shrink-0">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{person.name}</h3>
                      {person.phone && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {person.phone}
                        </p>
                      )}
                      
                      {/* DUE DATE & INSTALLMENT INDICATORS */}
                      <div className="flex flex-col gap-0.5 mt-1.5">
                        {person.due_date && (
                          <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1 uppercase tracking-wider">
                            <CalendarClock className="h-3 w-3" /> Final Due: {new Date(person.due_date).toLocaleDateString()}
                          </p>
                        )}
                        {person.installment_day && (
                          <p className="text-[10px] text-indigo-500 font-bold flex items-center gap-1 uppercase tracking-wider">
                            <CalendarDays className="h-3 w-3" /> Installments: {person.installment_day}{
                              // Add ordinal suffix (st, nd, rd, th)
                              [1, 21, 31].includes(person.installment_day) ? 'st' :
                              [2, 22].includes(person.installment_day) ? 'nd' :
                              [3, 23].includes(person.installment_day) ? 'rd' : 'th'
                            } of month
                          </p>
                        )}
                      </div>

                      <div className="mt-1.5">
                        {person.netBalance > 0 && <p className="text-sm font-bold text-green-600">{activeTab === 'PAY_LATER' ? 'Credit Receivable' : 'Loan Receivable'} ৳{person.netBalance.toLocaleString()}</p>}
                        {person.netBalance < 0 && <p className="text-sm font-bold text-red-600">{activeTab === 'PAY_LATER' ? 'Credit Payable' : 'Loan Payable'} ৳{Math.abs(person.netBalance).toLocaleString()}</p>}
                        {person.netBalance === 0 && <p className="text-sm font-bold text-slate-400">Settled up</p>}
                        
                        <div className="flex gap-3 mt-1.5 text-[10px] text-slate-400 font-medium tracking-wide">
                          <span>{activeTab === 'PAY_LATER' ? 'Total Credit' : 'Total Loan'}: ৳{person.total_loan?.toLocaleString() || 0}</span>
                          <span>
                            {activeTab === 'PAY_LATER' 
                              ? 'Paid' 
                              : (person.netBalance < 0 
                                  ? 'Paid' 
                                  : (person.netBalance > 0 ? 'Recv' : 'Paid/Recv'))
                            }: ৳{person.total_paid?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => { 
                        setSelectedPerson(person); 
                        setEditName(person.name); 
                        setEditPhone(person.phone || ''); 
                        if (person.due_date || person.installment_day) {
                          setEditIsHasDueDate(true);
                          setEditDueDate(person.due_date || '');
                          setEditNotifyDays((person.notify_days_before || 3).toString());
                          setEditInstallmentDay(person.installment_day ? person.installment_day.toString() : '');
                        } else {
                          setEditIsHasDueDate(false);
                          setEditDueDate('');
                          setEditNotifyDays('3');
                          setEditInstallmentDay('');
                        }
                        setActiveModal('edit'); 
                      }} 
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
                    <ChevronRight className="h-5 w-5 text-slate-300 ml-1 md:hidden" />
                  </div>
                </motion.div>
              ))
            )}

            {!isLoading && (
              <motion.div variants={itemVariants}>
                <PaginationControls 
                   currentPage={currentPage} 
                   totalPages={totalPages} 
                   itemsPerPage={itemsPerPage} 
                   setItemsPerPage={setItemsPerPage} 
                   setCurrentPage={setCurrentPage} 
                   totalItems={processedPeople.length}
                />
              </motion.div>
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
                className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full max-h-[90vh] overflow-y-auto"
              >
                
                {/* ADD PERSON MODAL */}
                {activeModal === 'add' && (
                  <form onSubmit={handleAddPerson} className="space-y-4">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-blue-600" /> Add New Account
                      </h3>
                      <button type="button" onClick={closeModal} className="p-2 -mr-2 -mt-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex gap-2 mb-4 bg-slate-100 p-1.5 rounded-xl shrink-0">
                      <button 
                        type="button"
                        onClick={() => setNewProfileType('LEND_BORROW')} 
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${newProfileType === 'LEND_BORROW' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Lend / Borrow
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewProfileType('PAY_LATER')} 
                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${newProfileType === 'PAY_LATER' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Pay Later (Shop)
                      </button>
                    </div>

                    <input
                      type="text" required value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)}
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Account Name *"
                    />
                    <input
                      type="tel" value={newPersonPhone} onChange={(e) => setNewPersonPhone(e.target.value)}
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Phone Number (Optional)"
                    />

                    {/* DUAL DATE REMINDERS FOR NEW ACCOUNT */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mt-2">
                      <button 
                        type="button" 
                        onClick={() => setIsNewHasDueDate(!isNewHasDueDate)} 
                        className={`text-sm flex items-center gap-2 transition-colors font-bold ${isNewHasDueDate ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <Bell className="h-4 w-4" />
                        {isNewHasDueDate ? 'Payment Reminders Active' : 'Configure Payment Reminders'}
                      </button>

                      <AnimatePresence>
                        {isNewHasDueDate && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden space-y-3"
                          >
                            {/* ALIGNED GRID FOR DATE AND NOTIFY */}
                            <div className="flex items-end gap-3">
                              <div className="flex-[2]">
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 truncate">Final Due Date (Optional)</label>
                                <input 
                                  type="date"
                                  value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} 
                                  className="w-full h-12 px-3 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 truncate">Notify (Days)</label>
                                <input 
                                  type="number" min="1" max="30"
                                  value={newNotifyDays} onChange={(e) => setNewNotifyDays(e.target.value)} 
                                  className="w-full h-12 px-3 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                                />
                              </div>
                            </div>
                            
                            {/* INSTALLMENT DAY DROPDOWN */}
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 truncate">Monthly Installment Day (Optional)</label>
                              <select 
                                value={newInstallmentDay} 
                                onChange={(e) => setNewInstallmentDay(e.target.value)}
                                className="w-full h-12 px-3 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              >
                                <option value="">No monthly installments</option>
                                {[...Array(31)].map((_, i) => (
                                  <option key={i + 1} value={i + 1}>{i + 1} of every month</option>
                                ))}
                              </select>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      type="submit" disabled={isAdding || !newPersonName.trim()}
                      className="w-full h-14 mt-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isAdding ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </form>
                )}

                {/* EDIT MODAL */}
                {activeModal === 'edit' && (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Edit className="h-5 w-5 text-blue-600" /> Edit Profile
                      </h3>
                      <button type="button" onClick={closeModal} className="p-2 -mr-2 -mt-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
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

                    {/* DUAL DATE REMINDERS FOR EDIT ACCOUNT */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mt-2">
                      <button 
                        type="button" 
                        onClick={() => setEditIsHasDueDate(!editIsHasDueDate)} 
                        className={`text-sm flex items-center gap-2 transition-colors font-bold ${editIsHasDueDate ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <Bell className="h-4 w-4" />
                        {editIsHasDueDate ? 'Payment Reminders Active' : 'Configure Payment Reminders'}
                      </button>

                      <AnimatePresence>
                        {editIsHasDueDate && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden space-y-3"
                          >
                            {/* ALIGNED GRID FOR DATE AND NOTIFY */}
                            <div className="flex items-end gap-3">
                              <div className="flex-[2]">
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 truncate">Final Due Date (Optional)</label>
                                <input 
                                  type="date"
                                  value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} 
                                  className="w-full h-12 px-3 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 truncate">Notify (Days)</label>
                                <input 
                                  type="number" min="1" max="30"
                                  value={editNotifyDays} onChange={(e) => setEditNotifyDays(e.target.value)} 
                                  className="w-full h-12 px-3 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                                />
                              </div>
                            </div>
                            
                            {/* INSTALLMENT DAY DROPDOWN */}
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 truncate">Monthly Installment Day (Optional)</label>
                              <select 
                                value={editInstallmentDay} 
                                onChange={(e) => setEditInstallmentDay(e.target.value)}
                                className="w-full h-12 px-3 text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              >
                                <option value="">No monthly installments</option>
                                {[...Array(31)].map((_, i) => (
                                  <option key={i + 1} value={i + 1}>{i + 1} of every month</option>
                                ))}
                              </select>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <input 
                      type="password" required value={modalPassword} onChange={(e) => setModalPassword(e.target.value)} 
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-900 placeholder:text-slate-400" 
                      placeholder="Enter your password to confirm" 
                    />
                    
                    {modalError && <p className="text-red-500 text-sm font-semibold">{modalError}</p>}
                    
                    <button type="submit" disabled={isProcessing || !modalPassword} className="w-full h-14 mt-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isProcessing ? 'Updating...' : 'Save Changes'}
                    </button>
                  </form>
                )}

                {/* DELETE MODAL */}
                {activeModal === 'delete' && (
                  <form onSubmit={handleDeleteSubmit} className="space-y-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                        <Trash2 className="h-6 w-6" /> Delete Person
                      </h3>
                      <button type="button" onClick={closeModal} className="p-2 -mr-2 -mt-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
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
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6" /> EXTREME DANGER
                      </h3>
                      <button type="button" onClick={closeModal} className="p-2 -mr-2 -mt-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
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