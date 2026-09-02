'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  ArrowLeft, ArrowUpRight, ArrowDownRight, CheckCircle2, 
  Wallet, HandCoins, FileSpreadsheet, Printer, ChevronDown, Edit, Trash2 
} from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';

// --- TYPESCRIPT INTERFACES ---
type TxType = 'LEND' | 'BORROW' | 'LEND_REPAYMENT' | 'BORROW_REPAYMENT';

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

// --- UTILITIES ---
// Safely formats date to strictly DD/MM/YYYY
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

// Gets precise local date to prevent timezone offset bugs
const getLocalToday = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
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
  const [netBalance, setNetBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Modal & Edit State
  const [showModal, setShowModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<TxType>('LEND');
  const [amount, setAmount] = useState('');
  const [originalAmount, setOriginalAmount] = useState(0); 
  const [method, setMethod] = useState('');
  
  const todayDate = getLocalToday();
  const [date, setDate] = useState(todayDate); 
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [methods, setMethods] = useState([
    { label: 'Cash', value: 'Cash' }, { label: 'Bank', value: 'Bank' },
    { label: 'bKash', value: 'bKash' }, { label: 'Nagad', value: 'Nagad' },
  ]);

  const fetchLedger = async () => {
    const res = await fetch(`/api/people/${params.id as string}`);
    if (res.ok) {
      const data = await res.json();
      setPerson(data.person);
      setTransactions(data.transactions);
      setNetBalance(data.netBalance);
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

  const handleActionClick = (type: TxType) => {
    setEditingTxId(null);
    setTxType(type);
    setAmount('');
    setOriginalAmount(0);
    setMethod('');
    setDescription('');
    setDate(todayDate);
    setShowModal(true);
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setTxType(tx.type);
    setAmount(tx.amount.toString());
    setOriginalAmount(Number(tx.amount));
    setMethod(tx.transaction_method);
    setDate(tx.date); 
    setDescription((tx.description || '').replace('(Edited)', '').trim());
    setShowModal(true);
  };

  const handleDeleteClick = async (txId: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction? All balances will be automatically adjusted.')) return;
    
    const res = await fetch(`/api/transactions/${txId}`, { method: 'DELETE' });
    if (res.ok) {
      setExpandedTxId(null);
      fetchLedger(); 
    }
  };

  // --- VALIDATION LOGIC FOR INSTALLMENTS ---
  let maxAllowed: number | null = null;
  if (txType === 'LEND_REPAYMENT') {
    maxAllowed = editingTxId ? netBalance + originalAmount : netBalance;
    maxAllowed = Number(maxAllowed.toFixed(2));
  } else if (txType === 'BORROW_REPAYMENT') {
    maxAllowed = editingTxId ? Math.abs(netBalance) + originalAmount : Math.abs(netBalance);
    maxAllowed = Number(maxAllowed.toFixed(2));
  }

  const numericAmount = parseFloat(amount) || 0;
  const isAmountExceeded = maxAllowed !== null && numericAmount > maxAllowed;

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAmountExceeded) {
      alert("Installment amount exceeds the outstanding balance!");
      return;
    }
    
    setIsSaving(true);

    const payload = {
      type: txType,
      amount: numericAmount,
      method,
      date,
      description,
      personId: params.id as string,
      source: person?.name || 'Ledger', 
    };

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
    }

    let shortBalanceText = 'Settled';
    let fullBalanceText = 'Accounts Settled (হিসাব সম্পন্ন)';
    
    if (runningBalance > 0) {
      shortBalanceText = `They owe ৳${Math.abs(runningBalance).toLocaleString()}`;
      fullBalanceText = `They owe you ৳${Math.abs(runningBalance).toLocaleString()} (তারা আপনার কাছে ঋণী ৳${Math.abs(runningBalance).toLocaleString()})`;
    } else if (runningBalance < 0) {
      shortBalanceText = `You owe ৳${Math.abs(runningBalance).toLocaleString()}`;
      fullBalanceText = `You owe them ৳${Math.abs(runningBalance).toLocaleString()} (আপনি তাদের কাছে ঋণী ৳${Math.abs(runningBalance).toLocaleString()})`;
    }

    return { 
      ...tx, index, displayType, given, taken, shortBalanceText, fullBalanceText, runningBalanceAmt: runningBalance 
    };
  });

  const displayTxs = [...chronologicalTxs].reverse();

  const finalBalanceText = netBalance > 0 
    ? `They owe you ৳${Math.abs(netBalance).toLocaleString()} (তারা আপনার কাছে ঋণী ৳${Math.abs(netBalance).toLocaleString()})` 
    : netBalance < 0 
      ? `You owe them ৳${Math.abs(netBalance).toLocaleString()} (আপনি তাদের কাছে ঋণী ৳${Math.abs(netBalance).toLocaleString()})` 
      : 'Accounts Settled (হিসাব সম্পন্ন)';

  const downloadCSV = () => {
    if (!person || transactions.length === 0) return;
    
    let csvContent = `Ledger Report For (খতিয়ান রিপোর্ট):,${person.name}\n`;
    csvContent += `Generated On (তারিখ):,${formatDate(new Date())}\n\n`;

    csvContent += "SL (ক্রমিক),Date (তারিখ),Type (ধরন),Remarks (মন্তব্য),Method (মাধ্যম),Taken (গ্রহণ),Given (প্রদান),Balance (জের)\n";
    
    chronologicalTxs.forEach(row => {
      const safeRemarks = `"${(row.description || '').replace(/"/g, '""')}"`;
      csvContent += `${row.index + 1},${formatDate(row.date)},"${row.displayType}",${safeRemarks},${row.transaction_method},${row.taken},${row.given},"${row.fullBalanceText}"\n`;
    });

    csvContent += `\n,,,,,Overall Taken (মোট গ্রহণ),Overall Given (মোট প্রদান),Adjusted Balance (সমন্বয়কৃত জের)\n`;
    csvContent += `,,,,,${totalTaken},${totalGiven},"${finalBalanceText}"\n`;

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

  const getActionDetails = () => {
    switch(txType) {
      case 'LEND': return { title: `Give Loan to ${person?.name}`, bg: "bg-red-50", color: "text-red-600" };
      case 'BORROW': return { title: `Take Loan from ${person?.name}`, bg: "bg-green-50", color: "text-green-600" };
      case 'LEND_REPAYMENT': return { title: `Receive Installment from ${person?.name}`, bg: "bg-green-50", color: "text-green-600" };
      case 'BORROW_REPAYMENT': return { title: `Pay Installment to ${person?.name}`, bg: "bg-red-50", color: "text-red-600" };
    }
  };

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
          className="px-6 pt-8 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 sticky top-0 z-10"
        >
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 truncate flex-1">{person.name}</h1>
          
          <div className="flex gap-2">
            <button onClick={downloadCSV} className="p-2 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors" title="Download Excel">
              <FileSpreadsheet className="h-5 w-5" />
            </button>
            <button onClick={downloadPDF} className="p-2 bg-red-50 text-red-700 rounded-full hover:bg-red-100 transition-colors" title="Download PDF">
              <Printer className="h-5 w-5" />
            </button>
          </div>
        </motion.header>

        <motion.div variants={containerVariants} initial="hidden" animate="show">
          <motion.div variants={itemVariants} className="p-6 pb-2">
            <div className={`p-8 rounded-3xl text-center shadow-sm border transition-colors duration-500 ${
              netBalance > 0 ? 'bg-green-600 border-green-700 text-white' : 
              netBalance < 0 ? 'bg-red-600 border-red-700 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <p className="text-sm font-medium mb-2 opacity-90">
                {netBalance > 0 ? `${person.name} owes you` : netBalance < 0 ? `You owe ${person.name}` : 'Accounts Settled'}
              </p>
              <h2 className="text-5xl font-extrabold tracking-tight">৳{Math.abs(netBalance).toLocaleString()}</h2>
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
                {netBalance > 0 ? `They owe ৳${Math.abs(netBalance).toLocaleString()}` : netBalance < 0 ? `You owe ৳${Math.abs(netBalance).toLocaleString()}` : 'Settled'}
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
                <span className="text-sm font-semibold text-slate-700 text-center">Pay Installment</span>
              </button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="px-6 pb-24">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Ledger History</h3>
            <div className="space-y-3">
              {displayTxs.length === 0 ? (
                <p className="text-center text-slate-400 py-8 bg-white rounded-2xl border border-dashed border-slate-200">No transactions recorded yet.</p>
              ) : (
                displayTxs.map((tx) => {
                  const isExpanded = expandedTxId === tx.id;
                  
                  return (
                    <motion.div 
                      key={tx.id} 
                      variants={itemVariants}
                      className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300"
                    >
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}>
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                            ['LEND', 'BORROW_REPAYMENT'].includes(tx.type) ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
                          }`}>
                            {tx.type === 'LEND' && <ArrowUpRight className="h-5 w-5 text-red-600" />}
                            {tx.type === 'BORROW' && <ArrowDownRight className="h-5 w-5 text-green-600" />}
                            {tx.type === 'LEND_REPAYMENT' && <HandCoins className="h-5 w-5 text-green-600" />}
                            {tx.type === 'BORROW_REPAYMENT' && <Wallet className="h-5 w-5 text-red-600" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="font-semibold text-slate-900 leading-tight">
                                {tx.type === 'LEND' && 'Loan Given'}
                                {tx.type === 'BORROW' && 'Loan Taken'}
                                {tx.type === 'LEND_REPAYMENT' && 'Received Installment'}
                                {tx.type === 'BORROW_REPAYMENT' && 'Paid Installment'}
                              </p>
                              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            {/* FIX: Applied the strict formatDate() here for the UI cards */}
                            <p className="text-xs text-slate-500 mt-0.5">{formatDate(tx.date)}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className={`font-bold ${['LEND', 'BORROW_REPAYMENT'].includes(tx.type) ? 'text-red-600' : 'text-green-600'}`}>
                            {['LEND', 'BORROW_REPAYMENT'].includes(tx.type) ? '-' : '+'}৳{Number(tx.amount).toLocaleString()}
                          </p>
                          <p className={`text-[11px] font-bold mt-0.5 ${tx.runningBalanceAmt === 0 ? 'text-slate-400' : tx.runningBalanceAmt > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.shortBalanceText}
                          </p>
                        </div>
                      </div>

                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="px-4 pb-4 pt-2 bg-slate-50/50 border-t border-slate-100 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-slate-500 font-medium text-xs mb-1">Method</p>
                              <p className="text-slate-900">{tx.transaction_method}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-medium text-xs mb-1">Remarks / Reason</p>
                              <p className={`text-slate-900 ${tx.description?.includes('(Edited)') ? 'italic' : ''}`}>{tx.description || 'None provided'}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                            <button onClick={() => handleEditClick(tx)} className="flex-1 py-2 flex items-center justify-center gap-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button onClick={() => handleDeleteClick(tx.id)} className="flex-1 py-2 flex items-center justify-center gap-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
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
                  onClick={() => setShowModal(false)} 
                />
                <motion.div 
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="relative bg-white rounded-t-3xl p-6 pb-8 shadow-2xl max-w-md mx-auto w-full flex flex-col max-h-[92vh]"
                >
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6 w-fit ${actionInfo.bg} ${actionInfo.color}`}>
                    <CheckCircle2 className="h-4 w-4" /> {editingTxId ? 'Edit Record:' : ''} {actionInfo.title}
                  </div>

                  <form onSubmit={handleSaveTransaction} className="flex flex-col flex-1 overflow-hidden">
                    <div className="space-y-4 overflow-y-auto px-1 pb-48 flex-1 overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (৳)</label>
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
                        {/* Dynamic Validation Warning Message */}
                        {maxAllowed !== null && (
                          <p className={`text-xs mt-1.5 font-medium ${isAmountExceeded ? 'text-red-500' : 'text-slate-500'}`}>
                            {isAmountExceeded 
                              ? `Cannot exceed outstanding balance (৳${maxAllowed.toLocaleString()})` 
                              : `Maximum allowed: ৳${maxAllowed.toLocaleString()}`}
                          </p>
                        )}
                      </div>

                      <div className="relative z-[60]">
                        <CustomDropdown label="Payment Method" options={methods} value={method} onChange={setMethod} onAdd={handleAddMethod} addLabel="Add new method" />
                      </div>

                      <div className="relative z-[50]">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                        <input
                          type="date" required 
                          max={todayDate} // FIX: Prevents future date selection globally
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full h-14 px-4 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 transition-all"
                        />
                      </div>

                      <div className="relative z-[40]">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Remarks / Reason</label>
                        <input
                          type="text" value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full h-14 px-4 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 transition-all"
                          placeholder="e.g. For medical bills"
                        />
                      </div>
                    </div>

                    <div className="pt-4 mt-auto shrink-0 bg-white border-t border-slate-100">
                      <button 
                        type="submit" 
                        disabled={isSaving || !amount || !method || isAmountExceeded} 
                        className="w-full h-14 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors"
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

      {/* --- PRINTABLE PDF REPORT --- */}
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
                {/* APPLIED formatDate HERE */}
                <td className="border border-slate-300 px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                <td className="border border-slate-300 px-4 py-3 font-medium whitespace-nowrap">{row.displayType}</td>
                <td className="border border-slate-300 px-4 py-3 break-words min-w-[150px]">{row.description}</td>
                <td className="border border-slate-300 px-4 py-3 whitespace-nowrap">{row.transaction_method}</td>
                <td className="border border-slate-300 px-4 py-3 text-green-700 font-medium whitespace-nowrap">{row.taken}</td>
                <td className="border border-slate-300 px-4 py-3 text-red-700 font-medium whitespace-nowrap">{row.given}</td>
                <td className="border border-slate-300 px-4 py-3 font-bold whitespace-nowrap">{row.fullBalanceText}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="flex justify-end mt-6 break-inside-avoid">
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
                {finalBalanceText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}