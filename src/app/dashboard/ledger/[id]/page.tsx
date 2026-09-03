'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  ArrowLeft, ArrowUpRight, ArrowDownRight, CheckCircle2, 
  Wallet, HandCoins, FileSpreadsheet, Printer, ChevronDown, Edit, Trash2, ShoppingBag, X, SlidersHorizontal 
} from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';
import { TopControls, PaginationControls } from '@/components/ListControls';

// --- TYPESCRIPT INTERFACES ---
type TxType = 'LEND' | 'BORROW' | 'LEND_REPAYMENT' | 'BORROW_REPAYMENT' | 'ASSET_PURCHASE' | 'EXPENSE';

interface Transaction {
  id: string;
  type: TxType;
  amount: number | string;
  date: string;
  transaction_method: string;
  description?: string;
  person_id?: string;
}

interface DisplayTransaction extends Transaction {
  index: number;
  displayType: string;
  given: string;
  taken: string;
  shortBalanceText: string;
  fullBalanceText: string;
  runningBalanceAmt: number;
}

interface ProfileOption {
  label: string;
  value: string;
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
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export default function PersonLedgerPage() {
  const router = useRouter();
  const params = useParams();
  
  const [person, setPerson] = useState<{ id: string, name: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenseProfiles, setExpenseProfiles] = useState<ProfileOption[]>([]);
  const [netBalance, setNetBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

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
    { label: 'All Transactions', value: 'ALL' },
    { label: 'Loan Given', value: 'LEND' },
    { label: 'Loan Taken', value: 'BORROW' },
    { label: 'Received Installment', value: 'LEND_REPAYMENT' },
    { label: 'Paid Installment', value: 'BORROW_REPAYMENT' },
    { label: 'Asset Purchases', value: 'ASSET_PURCHASE' },
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

  // Modal & Edit State
  const [showModal, setShowModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<TxType>('LEND');
  const [repayMode, setRepayMode] = useState<'REPAYMENT' | 'ASSET'>('REPAYMENT');
  const [amount, setAmount] = useState('');
  const [originalAmount, setOriginalAmount] = useState(0); 
  const [method, setMethod] = useState('');
  
  const todayDate = getLocalToday();
  const [date, setDate] = useState(todayDate); 
  const [description, setDescription] = useState('');
  
  // Asset Purchase Specific State
  const [profileId, setProfileId] = useState('');
  const [oneTimeName, setOneTimeName] = useState('');
  const [fullExpenseAmount, setFullExpenseAmount] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  
  const [methods, setMethods] = useState([
    { label: 'Cash', value: 'Cash' }, { label: 'Bank', value: 'Bank' },
    { label: 'bKash', value: 'bKash' }, { label: 'Nagad', value: 'Nagad' },
  ]);

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const [ledgerRes, profilesRes] = await Promise.all([
        fetch(`/api/people/${params.id as string}`),
        fetch('/api/expense-profiles')
      ]);

      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setPerson(data.person);
        setTransactions(data.transactions || []);
        setNetBalance(data.netBalance || 0);
      }
      if (profilesRes.ok) {
        const pData = await profilesRes.json();
        setExpenseProfiles((pData.profiles || []).map((p: any) => ({ label: p.name, value: p.id })));
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  useEffect(() => { 
    setMounted(true);
    fetchLedger(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleAddMethod = (newMethod: string) => {
    setMethods((prev) => [...prev, { label: newMethod, value: newMethod }]);
    setMethod(newMethod);
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

  const resetForm = () => {
    setEditingTxId(null);
    setAmount('');
    setOriginalAmount(0);
    setMethod('');
    setDescription('');
    setDate(todayDate);
    setProfileId('');
    setOneTimeName('');
    setFullExpenseAmount(0);
  };

  const handleActionClick = (type: TxType) => {
    resetForm();
    setTxType(type);
    setRepayMode('REPAYMENT'); 
    setShowModal(true);
  };

  const fetchFullTx = async (txId: string) => {
    try {
      const res = await fetch(`/api/transactions`); 
      const data = await res.json();
      return (data.transactions || []).find((t: any) => String(t.id) === String(txId));
    } catch (err) {
      console.error("Failed to fetch full transaction", err);
      return null;
    }
  };

  const handleEditClick = async (tx: Transaction, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    
    if (tx.type === 'ASSET_PURCHASE') {
      setIsLoading(true);
      const fullTx = await fetchFullTx(tx.id);
      setIsLoading(false);
      
      if (!fullTx) return alert("Original transaction not found.");
      
      resetForm();
      setEditingTxId(tx.id);
      setTxType('BORROW_REPAYMENT');
      setRepayMode('ASSET');
      setAmount(tx.amount.toString()); 
      setOriginalAmount(Number(tx.amount));
      setFullExpenseAmount(Number(fullTx.amount));
      setMethod(fullTx.transaction_method);
      setDate(fullTx.date);
      setDescription((fullTx.description || '').replace('(Edited)', '').trim());
      setProfileId(fullTx.expense_profile_id || 'NONE');
      setOneTimeName(!fullTx.expense_profile_id ? fullTx.source_or_method : '');
      setShowModal(true);
    } else {
      resetForm();
      setEditingTxId(tx.id);
      setTxType(tx.type);
      setRepayMode('REPAYMENT'); 
      setAmount(tx.amount.toString());
      setOriginalAmount(Number(tx.amount));
      setMethod(tx.transaction_method);
      setDate(tx.date); 
      setDescription((tx.description || '').replace('(Edited)', '').trim());
      setShowModal(true);
    }
  };

  const handleDeleteClick = async (tx: Transaction, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();

    if (tx.type === 'ASSET_PURCHASE') {
      setIsLoading(true);
      const fullTx = await fetchFullTx(tx.id);
      setIsLoading(false);
      
      if (!fullTx) return alert("Original transaction not found.");
      
      const otherFundings = (fullTx.transaction_fundings || []).filter((f: any) => String(f.person_id) !== String(params.id));
      
      let confirmMsg = 'Are you sure you want to remove your funding from this asset?';
      if (otherFundings.length > 0) {
        confirmMsg = `This asset was also funded by others. Deleting this will ONLY remove ${person?.name}'s contribution. The rest of the asset will remain intact. Continue?`;
      } else {
        confirmMsg = `This will delete the entire asset purchase since ${person?.name} is the only funder. Continue?`;
      }
      
      if (!window.confirm(confirmMsg)) return;

      if (otherFundings.length === 0) {
        await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' });
      } else {
        const newTotalExpenseAmount = Number(fullTx.amount) - Number(tx.amount);
        const payload = {
          type: 'EXPENSE',
          amount: newTotalExpenseAmount > 0 ? newTotalExpenseAmount : Number(fullTx.amount),
          method: fullTx.transaction_method,
          date: fullTx.date,
          description: fullTx.description,
          source: fullTx.source_or_method,
          profileId: fullTx.expense_profile_id,
          fundingSources: otherFundings.map((f: any) => ({ personId: f.person_id, amount: f.amount }))
        };
        await fetch(`/api/transactions/${tx.id}`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
      }
      setExpandedTxId(null);
      fetchLedger();
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this transaction? All balances will be automatically adjusted.')) return;
    
    const res = await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' });
    if (res.ok) {
      setExpandedTxId(null);
      fetchLedger(); 
    }
  };

  // --- STRICT VALIDATION LOGIC FOR UNSPENT LOANS ---
  let totalAssetPurchases = 0;
  transactions.forEach(tx => {
    if (tx.type === 'ASSET_PURCHASE') totalAssetPurchases += Number(tx.amount);
  });

  // Calculate the absolute active loan balance (works for both Borrow and Lend)
  const activeLoanTotal = Math.abs(netBalance);
  const unspentLoanFromPerson = Math.max(0, activeLoanTotal - totalAssetPurchases);

  let maxAllowed: number | null = null;
  if (txType === 'LEND_REPAYMENT') {
    maxAllowed = Number((editingTxId ? netBalance + originalAmount : netBalance).toFixed(2));
  } else if (txType === 'BORROW_REPAYMENT') {
    if (repayMode === 'ASSET') {
      maxAllowed = Number((editingTxId ? unspentLoanFromPerson + originalAmount : unspentLoanFromPerson).toFixed(2));
    } else {
      maxAllowed = Number((editingTxId ? Math.abs(netBalance) + originalAmount : Math.abs(netBalance)).toFixed(2));
    }
  }

  const numericAmount = parseFloat(amount) || 0;
  const isAmountExceeded = maxAllowed !== null && numericAmount > maxAllowed;

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAmountExceeded) {
      alert("Amount exceeds the allowed limit!");
      return;
    }
    
    setIsSaving(true);

    let payload: any = {
      type: txType,
      amount: numericAmount,
      method,
      date,
      description,
      personId: params.id as string,
      source: person?.name || 'Ledger', 
    };

    if (txType === 'BORROW_REPAYMENT' && repayMode === 'ASSET') {
      const sourceName = profileId === 'NONE' ? (oneTimeName.trim() || 'General Expense') : expenseProfiles.find(p => p.value === profileId)?.label;
      
      if (!editingTxId) {
        payload = {
          type: 'EXPENSE',
          amount: numericAmount,
          method,
          date,
          description: description,
          source: sourceName,
          profileId: profileId !== 'NONE' ? profileId : null,
          fundingSources: [{ 
            personId: params.id as string, 
            person_id: params.id as string, 
            amount: numericAmount 
          }]
        };
      } else {
        setIsLoading(true);
        const fullTx = await fetchFullTx(editingTxId);
        setIsLoading(false);

        const otherFundings = (fullTx?.transaction_fundings || []).filter((f: any) => String(f.person_id) !== String(params.id));
        const newTotalExpenseAmount = fullExpenseAmount - originalAmount + numericAmount;

        payload = {
          type: 'EXPENSE',
          amount: newTotalExpenseAmount > 0 ? newTotalExpenseAmount : numericAmount,
          method,
          date,
          description: description,
          source: sourceName,
          profileId: profileId !== 'NONE' ? profileId : null,
          fundingSources: [
            ...otherFundings.map((f: any) => ({ personId: f.person_id, amount: f.amount })),
            { personId: params.id as string, amount: numericAmount }
          ]
        };
      }
    }

    let url = '/api/transactions';
    let methodType = 'POST';

    if (editingTxId) {
      url = `/api/transactions/${editingTxId}`;
      methodType = 'PUT';
    }

    const res = await fetch(url, {
      method: methodType,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowModal(false);
      resetForm();
      fetchLedger(); 
    } else {
      alert("Failed to save transaction.");
    }
    setIsSaving(false);
  };

  // --- DATA CALCULATION FOR UI & REPORTS ---
  let runningBalance = 0;
  let totalGiven = 0;
  let totalTaken = 0;
  
  const chronologicalTxs: DisplayTransaction[] = [...transactions].reverse().map((tx, index) => {
    let displayType = '';
    let given = '';
    let taken = '';
    const amt = Number(tx.amount);

    if (tx.type === 'LEND') { 
      displayType = 'Loan Given (ঋণ দেওয়া)'; given = amt.toString(); totalGiven += amt; runningBalance += amt;
    } else if (tx.type === 'BORROW') { 
      displayType = 'Loan Taken (ঋণ নেওয়া)'; taken = amt.toString(); totalTaken += amt; runningBalance -= amt;
    } else if (tx.type === 'LEND_REPAYMENT') { 
      displayType = 'Received Installment (কিস্তি গ্রহণ)'; taken = amt.toString(); totalTaken += amt; runningBalance -= amt;
    } else if (tx.type === 'BORROW_REPAYMENT') { 
      displayType = 'Paid Installment (কিস্তি প্রদান)'; given = amt.toString(); totalGiven += amt; runningBalance += amt;
    } else if (tx.type === 'ASSET_PURCHASE') {
      displayType = 'Asset Purchase (সম্পদ ক্রয়)'; given = '-'; taken = '-'; 
    }

    let shortBalanceText = 'Settled';
    let fullBalanceText = 'Accounts Settled (হিসাব সম্পন্ন)';
    
    if (runningBalance > 0) {
      shortBalanceText = `Loan Receivable ৳${Math.abs(runningBalance).toLocaleString()}`;
      fullBalanceText = `Loan Receivable ৳${Math.abs(runningBalance).toLocaleString()} (তারা আপনার কাছে ঋণী ৳${Math.abs(runningBalance).toLocaleString()})`;
    } else if (runningBalance < 0) {
      shortBalanceText = `Loan Payable ৳${Math.abs(runningBalance).toLocaleString()}`;
      fullBalanceText = `Loan Payable ৳${Math.abs(runningBalance).toLocaleString()} (আপনি তাদের কাছে ঋণী ৳${Math.abs(runningBalance).toLocaleString()})`;
    }

    return { 
      ...tx, index, displayType, given, taken, shortBalanceText, fullBalanceText, runningBalanceAmt: runningBalance 
    };
  });

  const displayTxs = [...chronologicalTxs].reverse();

  // --- DATA PROCESSING (Search, Filter, Sort, Pagination) ---
  const processedTransactions = useMemo(() => {
    let result = [...displayTxs];

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
        tx.description?.toLowerCase().includes(lowerTerm) ||
        tx.transaction_method?.toLowerCase().includes(lowerTerm) ||
        tx.displayType.toLowerCase().includes(lowerTerm)
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
  }, [displayTxs, searchTerm, filterType, sortOrder, dateFilter, customStartDate, customEndDate]);

  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = processedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatNumericBalance = (balance: number) => {
    if (balance > 0) return `+${balance}`;
    if (balance < 0) return `${balance}`; 
    return `0`;
  };

  const finalBalanceText = netBalance > 0 
    ? `Loan Receivable ৳${Math.abs(netBalance).toLocaleString()} (তারা আপনার কাছে ঋণী ৳${Math.abs(netBalance).toLocaleString()})` 
    : netBalance < 0 
      ? `Loan Payable ৳${Math.abs(netBalance).toLocaleString()} (আপনি তাদের কাছে ঋণী ৳${Math.abs(netBalance).toLocaleString()})` 
      : 'Accounts Settled (হিসাব সম্পন্ন)';

  const downloadCSV = () => {
    if (!person || chronologicalTxs.length === 0) return;
    
    let csvContent = `Ledger Report For (খতিয়ান রিপোর্ট):,${person.name}\n`;
    csvContent += `Generated On (তারিখ):,${formatDate(new Date())}\n\n`;

    csvContent += "SL (ক্রমিক),Date (তারিখ),Type (ধরন),Remarks (মন্তব্য),Method (মাধ্যম),Taken (গ্রহণ),Given (প্রদান),Balance (জের)\n";
    
    chronologicalTxs.forEach(row => {
      let cleanRemarks = row.description 
        ? row.description.replace('(Edited)', '').replace(/^Funded Asset:\s*/i, '').trim() 
        : '-';
      if (!cleanRemarks) cleanRemarks = '-';

      const safeRemarks = `"${cleanRemarks.replace(/"/g, '""')}"`;
      csvContent += `${row.index + 1},${formatDate(row.date)},"${row.displayType}",${safeRemarks},${row.transaction_method || '-'},${row.taken},${row.given},${formatNumericBalance(row.runningBalanceAmt)}\n`;
    });

    csvContent += `\n,,,,,Overall Taken (মোট গ্রহণ),Overall Given (মোট প্রদান),Adjusted Balance (সমন্বয়কৃত জের)\n`;
    csvContent += `,,,,,${totalTaken},${totalGiven},${formatNumericBalance(netBalance)}\n`;

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${person.name}_Ledger_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    window.print(); 
  };

  const canLend = netBalance >= 0; 
  const canBorrow = netBalance <= 0;
  const canReceiveInstallment = netBalance > 0;
  const canPayInstallment = netBalance < 0;

  const profileOptions = [{ label: 'No Profile (One-time)', value: 'NONE' }, ...expenseProfiles];

  const getActionDetails = () => {
    switch(txType) {
      case 'LEND': return { title: `Give Loan to ${person?.name}`, bg: "bg-red-50", color: "text-red-600" };
      case 'BORROW': return { title: `Take Loan from ${person?.name}`, bg: "bg-green-50", color: "text-green-600" };
      case 'LEND_REPAYMENT': return { title: `Receive Installment from ${person?.name}`, bg: "bg-green-50", color: "text-green-600" };
      case 'BORROW_REPAYMENT': 
        return { 
          title: repayMode === 'ASSET' ? `Buy Asset via ${person?.name}'s Loan` : `Pay Installment to ${person?.name}`, 
          bg: repayMode === 'ASSET' ? "bg-blue-50" : "bg-red-50", 
          color: repayMode === 'ASSET' ? "text-blue-600" : "text-red-600" 
        };
      default: return { title: '', bg: '', color: '' };
    }
  };

  // Determine active click filters
  const loanFilterTarget = netBalance > 0 ? 'LEND' : 'BORROW';
  const isLoanFilterActive = filterType === loanFilterTarget;
  const isAssetFilterActive = filterType === 'ASSET_PURCHASE';

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading ledger...</div>;
  if (!person) return <div className="min-h-screen flex items-center justify-center text-slate-400">Person not found</div>;

  const actionInfo = getActionDetails();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      
      {/* CRITICAL PDF PRINT STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          html, body, main { 
            max-width: 100% !important; width: 100% !important; 
            margin: 0 !important; padding: 0 !important; background: white !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          nav { display: none !important; }
          .print\\:hidden { display: none !important; }
          .print-wrapper { display: block !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; }
          table { width: 100% !important; table-layout: auto !important; }
        }
      `}} />

      {/* --- INTERACTIVE APP UI --- */}
      <div className="print:hidden">
        <motion.header 
          initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 sticky top-0 z-40"
        >
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 truncate flex-1">{person.name}</h1>
          
          <div className="flex gap-2">
            {/* FILTER TOGGLE BUTTON */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <button onClick={downloadCSV} className="p-2 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors" title="Download Excel">
              <FileSpreadsheet className="h-5 w-5" />
            </button>
            <button onClick={downloadPDF} className="p-2 bg-red-50 text-red-700 rounded-full hover:bg-red-100 transition-colors" title="Download PDF">
              <Printer className="h-5 w-5" />
            </button>
          </div>
        </motion.header>

        {/* REUSABLE LIST CONTROLS WITH SMOOTH TOGGLE & OVERFLOW FIX */}
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
                  searchPlaceholder="Search records..."
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

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-0">
          <motion.div variants={itemVariants} className="p-6 pb-2">
            <div className={`p-8 rounded-3xl text-center shadow-sm border transition-colors duration-500 ${
              netBalance > 0 ? 'bg-green-600 border-green-700 text-white' : 
              netBalance < 0 ? 'bg-red-600 border-red-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <p className="text-sm font-medium mb-2 opacity-90">
                {netBalance > 0 ? `Loan Receivable from ${person.name}` : netBalance < 0 ? `Loan Payable to ${person.name}` : 'Accounts Settled'}
              </p>
              <h2 className="text-5xl font-extrabold tracking-tight">৳{Math.abs(netBalance).toLocaleString()}</h2>
            </div>
          </motion.div>

          {/* INTERACTIVE METRIC CARDS WITH TOGGLE FILTERS */}
          <motion.div variants={itemVariants} className="px-6 mb-4 grid grid-cols-3 gap-3">
            <div 
              onClick={() => { 
                setFilterType(isLoanFilterActive ? 'ALL' : loanFilterTarget); 
                setCurrentPage(1); 
              }}
              className={`bg-white border p-3 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-all active:scale-95 ${isLoanFilterActive ? 'border-slate-400 ring-2 ring-slate-200' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Loan Total</span>
              <span className="text-sm font-bold text-slate-800">৳{activeLoanTotal.toLocaleString()}</span>
            </div>
            <div 
              onClick={() => { 
                setFilterType(isAssetFilterActive ? 'ALL' : 'ASSET_PURCHASE'); 
                setCurrentPage(1); 
              }}
              className={`bg-blue-50 border p-3 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-all active:scale-95 ${isAssetFilterActive ? 'border-blue-400 ring-2 ring-blue-200' : 'border-blue-100 hover:border-blue-300'}`}
            >
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Asset Total</span>
              <span className="text-sm font-bold text-blue-700">৳{totalAssetPurchases.toLocaleString()}</span>
            </div>
            <div className="bg-orange-50 border border-orange-100 p-3 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1">Cash in Hand</span>
              <span className="text-sm font-bold text-orange-700">৳{unspentLoanFromPerson.toLocaleString()}</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="px-6 py-4 mx-6 mb-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Overall Loan Given:</span>
              <span className="font-bold text-red-600">৳{totalGiven.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Overall Loan Taken:</span>
              <span className="font-bold text-green-600">৳{totalTaken.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-1">
              <span className="text-slate-700 font-bold">Adjusted Balance:</span>
              <span className={`font-bold ${netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {netBalance > 0 ? `Loan Receivable ৳${Math.abs(netBalance).toLocaleString()}` : netBalance < 0 ? `Loan Payable ৳${Math.abs(netBalance).toLocaleString()}` : 'Settled'}
              </span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="px-6 pb-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleActionClick('LEND')} disabled={!canLend} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm">
                <ArrowUpRight className="h-6 w-6 text-red-500" />
                <span className="text-sm font-semibold text-slate-700">Give Loan</span>
              </button>
              
              <button onClick={() => handleActionClick('BORROW')} disabled={!canBorrow} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm">
                <ArrowDownRight className="h-6 w-6 text-green-500" />
                <span className="text-sm font-semibold text-slate-700">Take Loan</span>
              </button>
              
              <button onClick={() => handleActionClick('LEND_REPAYMENT')} disabled={!canReceiveInstallment} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm">
                <HandCoins className="h-6 w-6 text-green-500" />
                <span className="text-sm font-semibold text-slate-700 text-center">Receive Installment</span>
              </button>
              
              <button onClick={() => handleActionClick('BORROW_REPAYMENT')} disabled={!canPayInstallment} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm">
                <Wallet className="h-6 w-6 text-red-500" />
                <span className="text-sm font-semibold text-slate-700 text-center">Pay Installment / Buy Asset</span>
              </button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="px-6 pb-24">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ledger History</h3>
              {filterType !== 'ALL' && (
                <button onClick={() => { setFilterType('ALL'); setCurrentPage(1); }} className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors">
                  Clear Filter
                </button>
              )}
            </div>

            <div className="space-y-3">
              {paginatedTransactions.length === 0 ? (
                <p className="text-center text-slate-400 py-8 bg-white rounded-2xl border border-dashed border-slate-200">No transactions match your filters.</p>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isExpanded = expandedTxId === tx.id;
                  const isAsset = tx.type === 'ASSET_PURCHASE';
                  
                  let cleanRemarks = tx.description 
                    ? tx.description.replace('(Edited)', '').replace(/^Funded Asset:\s*/i, '').trim() 
                    : '-';
                  if (!cleanRemarks) cleanRemarks = '-';
                  
                  return (
                    <motion.div 
                      key={tx.id} 
                      variants={itemVariants}
                      className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${isAsset ? 'border-blue-100' : 'border-slate-100'}`}
                    >
                      <div className="flex items-start justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}>
                        <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                          <div className={`h-10 w-10 mt-0.5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                            isAsset ? 'bg-blue-50 border-blue-100' :
                            ['LEND', 'BORROW_REPAYMENT'].includes(tx.type) ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
                          }`}>
                            {tx.type === 'LEND' && <ArrowUpRight className="h-5 w-5 text-red-600" />}
                            {tx.type === 'BORROW' && <ArrowDownRight className="h-5 w-5 text-green-600" />}
                            {tx.type === 'LEND_REPAYMENT' && <HandCoins className="h-5 w-5 text-green-600" />}
                            {tx.type === 'BORROW_REPAYMENT' && <Wallet className="h-5 w-5 text-red-600" />}
                            {tx.type === 'ASSET_PURCHASE' && <ShoppingBag className="h-5 w-5 text-blue-600" />}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-semibold text-slate-900 leading-tight truncate">
                                {tx.type === 'LEND' && 'Loan Given'}
                                {tx.type === 'BORROW' && 'Loan Taken'}
                                {tx.type === 'LEND_REPAYMENT' && 'Received Installment'}
                                {tx.type === 'BORROW_REPAYMENT' && 'Paid Installment'}
                                {tx.type === 'ASSET_PURCHASE' && 'Asset Purchase'}
                              </p>
                              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{formatDate(tx.date)} • {tx.transaction_method || '-'}</p>
                            
                            {!isExpanded && (
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 h-[32px] leading-[16px] whitespace-normal">
                                {cleanRemarks !== '-' ? cleanRemarks : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end shrink-0">
                          <p className={`font-bold ${isAsset ? 'text-blue-600' : ['LEND', 'BORROW_REPAYMENT'].includes(tx.type) ? 'text-red-600' : 'text-green-600'}`}>
                            {isAsset ? '' : ['LEND', 'BORROW_REPAYMENT'].includes(tx.type) ? '-' : '+'}৳{Number(tx.amount).toLocaleString()}
                          </p>
                          
                          {/* Hide 'Funded by Loan' if unexpanded */}
                          {!(isAsset && !isExpanded) && (
                            <p className={`text-[11px] font-bold mt-0.5 ${isAsset ? 'text-slate-400' : tx.runningBalanceAmt === 0 ? 'text-slate-400' : tx.runningBalanceAmt > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {isAsset ? 'Funded by Loan' : tx.shortBalanceText}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="px-4 pb-4 pt-2 bg-slate-50/50 border-t border-slate-100 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-slate-500 font-medium text-xs mb-1">Method</p>
                              <p className="text-slate-900">{tx.transaction_method || '-'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-medium text-xs mb-1">Remarks</p>
                              <p className={`text-slate-900 ${tx.description?.includes('(Edited)') ? 'italic' : ''}`}>{cleanRemarks}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                            <button onClick={(e) => handleEditClick(tx, e)} className="flex-1 py-2 flex items-center justify-center gap-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button onClick={(e) => handleDeleteClick(tx, e)} className="flex-1 py-2 flex items-center justify-center gap-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

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
        </motion.div>

        {/* Action / Edit Modal */}
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
                  
                  <div className="flex justify-between items-start mb-4 shrink-0">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold w-fit ${actionInfo.bg} ${actionInfo.color}`}>
                      {txType === 'BORROW_REPAYMENT' && repayMode === 'ASSET' ? <ShoppingBag className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} 
                      {editingTxId ? 'Edit Record:' : ''} {actionInfo.title}
                    </div>
                    <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 -mr-2 -mt-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* DUAL ACTION TOGGLE FOR BORROW REPAYMENT */}
                  {txType === 'BORROW_REPAYMENT' && !editingTxId && (
                    <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl shrink-0">
                      <button 
                        type="button"
                        onClick={() => { setRepayMode('REPAYMENT'); setAmount(''); }} 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${repayMode === 'REPAYMENT' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Pay Installment
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setRepayMode('ASSET'); setAmount(''); }} 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${repayMode === 'ASSET' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Buy Asset
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSaveTransaction} className="flex flex-col flex-1 overflow-hidden">
                    <div className="space-y-4 overflow-y-auto px-1 pb-48 flex-1 overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          {repayMode === 'ASSET' ? (editingTxId ? 'Your Adjusted Contribution (৳)' : 'Asset Price / Spent Amount (৳)') : 'Amount (৳)'}
                        </label>
                        <input
                          type="number" required min="0.01" step="0.01" 
                          max={maxAllowed !== null ? maxAllowed : undefined}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className={`w-full h-14 px-4 text-xl font-bold rounded-xl border focus:outline-none focus:ring-2 transition-all text-slate-900 bg-white placeholder:text-slate-400 ${
                            isAmountExceeded ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                          }`}
                          placeholder="0.00"
                        />
                        {maxAllowed !== null && (
                          <p className={`text-xs mt-1.5 font-medium ${isAmountExceeded ? 'text-red-500' : 'text-slate-500'}`}>
                            {isAmountExceeded 
                              ? `Cannot exceed allowed limit (৳${maxAllowed.toLocaleString()})` 
                              : repayMode === 'ASSET' 
                                ? `Max unspent loan available: ৳${maxAllowed.toLocaleString()}` 
                                : `Max outstanding debt: ৳${maxAllowed.toLocaleString()}`
                            }
                          </p>
                        )}
                      </div>

                      {/* CONDITIONAL ASSET PURCHASE FIELDS */}
                      {repayMode === 'ASSET' && (
                        <AnimatePresence>
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="space-y-4"
                          >
                            <div className="relative z-[90] focus-within:z-[999] hover:z-[999]">
                              <CustomDropdown label="Asset Category / Profile" options={profileOptions} value={profileId} onChange={setProfileId} onAdd={handleAddProfile} addLabel="Create category" />
                            </div>

                            <AnimatePresence>
                              {profileId === 'NONE' && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 16 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                                  className="overflow-hidden"
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
                          </motion.div>
                        </AnimatePresence>
                      )}

                      <div className="relative z-[80] focus-within:z-[999] hover:z-[999]">
                        <CustomDropdown label="Payment Method" options={methods} value={method} onChange={setMethod} onAdd={handleAddMethod} addLabel="Add new method" />
                      </div>

                      <div className="relative z-[70]">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                        <input
                          type="date" required 
                          max={todayDate}
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full h-14 px-4 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 transition-all"
                        />
                      </div>

                      <div className="relative z-[60]">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Description (Optional)
                        </label>
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full h-14 px-4 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 transition-all"
                          placeholder="e.g. Additional remarks"
                        />
                      </div>
                    </div>

                    <div className="pt-4 mt-auto shrink-0 bg-white border-t border-slate-100">
                      <button 
                        type="submit" 
                        disabled={isSaving || !amount || !method || isAmountExceeded || (repayMode === 'ASSET' && !profileId) || (repayMode === 'ASSET' && profileId === 'NONE' && !oneTimeName.trim())} 
                        className={`w-full h-14 text-white rounded-xl font-medium flex items-center justify-center disabled:opacity-50 transition-colors ${repayMode === 'ASSET' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        {isSaving ? 'Processing...' : editingTxId ? 'Update Record' : 'Confirm Action'}
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

      {/* --- PRINTABLE PDF REPORT (Visible ONLY during print) --- */}
      <div className="hidden print:block print-wrapper bg-white text-black font-sans min-h-screen pt-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Ledger Report (খতিয়ান রিপোর্ট)</h1>
          <h2 className="text-xl text-slate-700 font-medium">Account: {person.name}</h2>
          <p className="text-sm text-slate-500 mt-1">Generated on: {formatDate(new Date())}</p>
        </div>
        
        <table className="w-full border-collapse border border-slate-300 text-sm mb-6 text-left table-auto">
          <thead>
            <tr>
              <th className="border border-slate-300 px-4 py-3 bg-slate-100 text-slate-800 font-semibold whitespace-nowrap">SL (ক্রমিক)</th>
              <th className="border border-slate-300 px-4 py-3 bg-blue-50 text-blue-800 font-semibold whitespace-nowrap">Date (তারিখ)</th>
              <th className="border border-slate-300 px-4 py-3 bg-purple-50 text-purple-800 font-semibold whitespace-nowrap">Type (ধরন)</th>
              <th className="border border-slate-300 px-4 py-3 bg-yellow-50 text-yellow-800 font-semibold w-[20%]">Remarks (মন্তব্য)</th>
              <th className="border border-slate-300 px-4 py-3 bg-teal-50 text-teal-800 font-semibold whitespace-nowrap">Method (মাধ্যম)</th>
              <th className="border border-slate-300 px-4 py-3 bg-green-50 text-green-800 font-semibold whitespace-nowrap">Taken (গ্রহণ)</th>
              <th className="border border-slate-300 px-4 py-3 bg-red-50 text-red-800 font-semibold whitespace-nowrap">Given (প্রদান)</th>
              <th className="border border-slate-300 px-4 py-3 bg-orange-50 text-orange-800 font-semibold whitespace-nowrap">Balance (জের)</th>
            </tr>
          </thead>
          <tbody>
            {chronologicalTxs.map((row) => (
              <tr key={row.index} className="hover:bg-slate-50 break-inside-avoid">
                <td className="border border-slate-300 px-4 py-3 text-center">{row.index + 1}</td>
                <td className="border border-slate-300 px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                <td className="border border-slate-300 px-4 py-3 font-medium whitespace-nowrap">{row.displayType}</td>
                <td className="border border-slate-300 px-4 py-3 break-words min-w-[150px]">
                  {row.description ? row.description.replace('(Edited)', '').replace(/^Funded Asset:\s*/i, '').trim() : '-'}
                </td>
                <td className="border border-slate-300 px-4 py-3 whitespace-nowrap">{row.transaction_method || '-'}</td>
                <td className="border border-slate-300 px-4 py-3 text-green-700 font-medium whitespace-nowrap">{row.taken}</td>
                <td className="border border-slate-300 px-4 py-3 text-red-700 font-medium whitespace-nowrap">{row.given}</td>
                {/* Numeric Balance specifically formatted per prompt request */}
                <td className="border border-slate-300 px-4 py-3 font-bold whitespace-nowrap">
                  {formatNumericBalance(row.runningBalanceAmt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="flex justify-end mt-6 break-inside-avoid">
          {/* Summary Box */}
          <div className="min-w-[450px] bg-slate-50 border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex justify-between mb-3 text-sm text-slate-600">
              <span>Overall Taken (মোট গ্রহণ):</span>
              <span className="font-bold text-slate-900 text-base">৳{totalTaken.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-4 text-sm text-slate-600">
              <span>Overall Given (মোট প্রদান):</span>
              <span className="font-bold text-slate-900 text-base">৳{totalGiven.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-4 text-base">
              <span className="font-semibold text-slate-900">Adjusted Balance (সমন্বয়কৃত জের):</span>
              <span className={`font-bold text-lg text-right ml-4 ${netBalance > 0 ? 'text-green-700' : netBalance < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                {formatNumericBalance(netBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}