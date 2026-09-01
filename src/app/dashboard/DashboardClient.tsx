'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { 
  Bell, ArrowUpRight, ArrowDownRight, Wallet, 
  HandCoins, History, Activity, Users, Download, FileSpreadsheet, Printer, LogOut 
} from 'lucide-react';
import DashboardCharts from '@/components/DashboardCharts';
import CustomDropdown from '@/components/CustomDropdown';

// --- TYPESCRIPT INTERFACES ---
export interface Transaction {
  id: string | number;
  amount: number | string;
  type: string;
  date: string;
  person_id?: string | null;
  people_profiles?: { name: string } | null;
  expense_profiles?: { name: string } | null;
  source_or_method?: string;
  description?: string;
  transaction_method?: string;
  [key: string]: any;
}

// --- ANIMATION CHOREOGRAPHY VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function DashboardClient({ 
  sessionName, 
  transactions, 
  isGodMode 
}: { 
  sessionName: string; 
  transactions: Transaction[]; 
  isGodMode?: boolean;
}) {
  const router = useRouter();

  // --- STATE ---
  const [chartFilter, setChartFilter] = useState('month');
  const [reportFilter, setReportFilter] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const timeOptions = [
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last 3 Months', value: '3months' },
    { label: 'This Year', value: 'year' },
  ];

  const reportOptions = [
    ...timeOptions,
    { label: 'Custom Date Range', value: 'custom' }
  ];

  // --- EXIT GOD MODE ---
  const handleExitGodMode = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }); // Clears the sub-user session cookie
    router.push('/master/dashboard'); // Sends you straight back to the admin panel
  };

  // --- HELPER: GET START DATE ---
  const getStartDate = (filter: string) => {
    const now = new Date();
    if (filter === 'week') {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay()); 
      return d.toISOString().split('T')[0];
    }
    if (filter === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    if (filter === '3months') return new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
    if (filter === 'year') return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    return null;
  };

  // --- CORE ALL-TIME METRICS ---
  let totalBalance = 0;
  const peopleBalances: Record<string, { id: string, name: string, balance: number }> = {};

  transactions.forEach((tx) => {
    const amt = Number(tx.amount);
    if (['INCOME', 'BORROW', 'LEND_REPAYMENT'].includes(tx.type)) totalBalance += amt;
    if (['EXPENSE', 'LEND', 'BORROW_REPAYMENT'].includes(tx.type)) totalBalance -= amt;

    if (tx.person_id && tx.people_profiles) {
      if (!peopleBalances[tx.person_id]) peopleBalances[tx.person_id] = { id: tx.person_id, name: tx.people_profiles.name, balance: 0 };
      if (tx.type === 'LEND') peopleBalances[tx.person_id].balance += amt;
      if (tx.type === 'LEND_REPAYMENT') peopleBalances[tx.person_id].balance -= amt;
      if (tx.type === 'BORROW') peopleBalances[tx.person_id].balance -= amt;
      if (tx.type === 'BORROW_REPAYMENT') peopleBalances[tx.person_id].balance += amt;
    }
  });

  const owesYou = Object.values(peopleBalances).filter(p => p.balance > 0);
  const youOwe = Object.values(peopleBalances).filter(p => p.balance < 0);
  const recentTransactions = [...transactions].reverse().slice(0, 3);

  // --- CHART & STATS FILTERING ---
  const chartStartDate = getStartDate(chartFilter);
  const chartTxs = chartStartDate ? transactions.filter(t => t.date >= chartStartDate) : transactions;

  let filteredIncome = 0;
  let filteredExpense = 0;
  let filteredVolume = 0;

  chartTxs.forEach((tx) => {
    const amt = Number(tx.amount);
    if (['INCOME', 'BORROW', 'LEND_REPAYMENT'].includes(tx.type)) filteredIncome += amt;
    if (['EXPENSE', 'LEND', 'BORROW_REPAYMENT'].includes(tx.type)) filteredExpense += amt;
    filteredVolume += amt;
  });

  const prepareChartData = () => {
    const map: Record<string, { month: string; income: number; expense: number }> = {};
    
    chartTxs.forEach(tx => {
      let key = '';
      let label = '';
      const d = new Date(tx.date);

      if (chartFilter === 'week') {
        key = tx.date;
        label = d.toLocaleDateString('default', { weekday: 'short' });
      } else if (chartFilter === 'month') {
        const weekNum = Math.ceil(d.getDate() / 7);
        key = `W${weekNum}`;
        label = `Week ${weekNum}`;
      } else {
        key = tx.date.substring(0, 7);
        label = d.toLocaleString('default', { month: 'short' });
      }

      if (!map[key]) map[key] = { month: label, income: 0, expense: 0 };
      if (['INCOME', 'BORROW', 'LEND_REPAYMENT'].includes(tx.type)) map[key].income += Number(tx.amount);
      if (['EXPENSE', 'LEND', 'BORROW_REPAYMENT'].includes(tx.type)) map[key].expense += Number(tx.amount);
    });
    return Object.values(map);
  };

  const categoryMap: Record<string, number> = {};
  chartTxs.forEach((tx) => {
    if (tx.type === 'EXPENSE') {
      const cat = tx.expense_profiles?.name || 'General';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(tx.amount);
    }
  });

  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const chartLabel = timeOptions.find(o => o.value === chartFilter)?.label || 'This Month';

  // --- REPORT FILTERING ---
  const reportTxs = transactions.filter(t => {
    if (reportFilter === 'custom') {
      if (customStart && t.date < customStart) return false;
      if (customEnd && t.date > customEnd) return false;
      return true;
    }
    const rStart = getStartDate(reportFilter);
    return rStart ? t.date >= rStart : true;
  }).reverse(); 

  let repIncome = 0, repExpense = 0, repLend = 0, repBorrow = 0;
  reportTxs.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === 'INCOME') repIncome += amt;
    if (t.type === 'EXPENSE') repExpense += amt;
    if (['LEND', 'BORROW_REPAYMENT'].includes(t.type)) repLend += amt;
    if (['BORROW', 'LEND_REPAYMENT'].includes(t.type)) repBorrow += amt;
  });

  const formatType = (type: string) => {
    if (type === 'LEND') return 'Loan Given';
    if (type === 'BORROW') return 'Loan Taken';
    if (type === 'LEND_REPAYMENT') return 'Installment Received';
    if (type === 'BORROW_REPAYMENT') return 'Installment Paid';
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  const downloadCSV = () => {
    let csv = `Financial Report\nGenerated on:,${new Date().toLocaleDateString()}\n\n`;
    csv += "SL,Date,Category/Person,Type,Remarks,Method,Amount\n";
    
    reportTxs.forEach((tx, i) => {
      const name = tx.expense_profiles?.name || tx.people_profiles?.name || tx.source_or_method || 'Unknown';
      const remarks = `"${(tx.description || '').replace(/"/g, '""')}"`;
      const amtPrefix = ['EXPENSE', 'LEND', 'BORROW_REPAYMENT'].includes(tx.type) ? '-' : '+';
      csv += `${i + 1},${new Date(tx.date).toLocaleDateString()},"${name}",${formatType(tx.type)},${remarks},${tx.transaction_method || ''},${amtPrefix}${tx.amount}\n`;
    });

    csv += `\n,,,,,Total Income,${repIncome}\n,,,,,Total Expense,-${repExpense}\n,,,,,Money Out (Loans/Payments),-${repLend}\n,,,,,Money In (Loans/Received),+${repBorrow}\n`;

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Financial_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
      
      {/* PDF PRINT STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          html, body, main { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, header, .print\\:hidden { display: none !important; }
          .print-wrapper { display: block !important; width: 100% !important; }
          table { width: 100% !important; table-layout: auto !important; }
        }
      `}} />

      {/* --- DASHBOARD UI --- */}
      <div className="print:hidden">
        
        {/* Animated Header */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="px-6 pt-10 pb-6 flex justify-between items-center bg-blue-600 text-white rounded-b-[2rem] shadow-md"
        >
          <div>
            <p className="text-blue-100 text-sm font-medium">Hello,</p>
            <h1 className="text-2xl font-bold text-white break-words leading-tight">{sessionName}</h1>
          </div>
          <div className="flex items-center gap-3">
            {isGodMode && (
              <button 
                onClick={handleExitGodMode}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-full shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Exit
              </button>
            )}
            <button className="p-2.5 bg-blue-500/40 rounded-full hover:bg-blue-500 transition-colors">
              <Bell className="h-5 w-5 text-white" />
            </button>
          </div>
        </motion.header>

        {/* --- STAGGERED CONTENT CHOREOGRAPHY --- */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="p-6 space-y-6 -mt-4 pb-36"
        >
          {/* Main Balance */}
          <motion.section variants={itemVariants} className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet className="h-24 w-24" /></div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1 z-10">Current Cash Balance</p>
            <h2 className="text-4xl font-extrabold text-slate-900 z-10">
              ৳{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </motion.section>

          {/* Timeframe Filter Dropdown */}
          <motion.div variants={itemVariants} className="flex items-center justify-between border-b border-slate-200 pb-2 relative z-50">
            <h3 className="font-bold text-slate-800">Overview Metrics</h3>
            <div className="w-40">
              <CustomDropdown options={timeOptions} value={chartFilter} onChange={setChartFilter} />
            </div>
          </motion.div>

          {/* Dynamic Stats Cards */}
          <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center shrink-0"><ArrowDownRight className="h-5 w-5 text-green-600" /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider break-words">Income ({chartLabel})</p>
                <p className="text-sm font-bold text-slate-900 break-words">৳{filteredIncome.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0"><ArrowUpRight className="h-5 w-5 text-red-600" /></div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider break-words">Expense ({chartLabel})</p>
                <p className="text-sm font-bold text-slate-900 break-words">৳{filteredExpense.toLocaleString()}</p>
              </div>
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between shadow-sm relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Activity className="h-5 w-5" /></div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{chartLabel} Activity</p>
                <p className="text-sm font-semibold text-slate-900">{chartTxs.length} Transactions</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-400">Volume</p>
              <p className="text-base font-bold text-blue-700">৳{filteredVolume.toLocaleString()}</p>
            </div>
          </motion.section>

          {/* Conditional Ledger Sections */}
          {(owesYou.length > 0 || youOwe.length > 0) && (
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 relative z-10">
              {owesYou.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-green-600" /><h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">They Owe You</h3></div>
                  <div className="space-y-2">
                    {owesYou.map(p => (
                      <Link key={p.id} href={`/dashboard/ledger/${p.id}`} className="flex justify-between items-center group">
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 break-words pr-2">{p.name}</span>
                        <span className="text-sm font-bold text-green-600 whitespace-nowrap">৳{p.balance.toLocaleString()}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              {youOwe.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-red-600" /><h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">You Owe Them</h3></div>
                  <div className="space-y-2">
                    {youOwe.map(p => (
                      <Link key={p.id} href={`/dashboard/ledger/${p.id}`} className="flex justify-between items-center group">
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 break-words pr-2">{p.name}</span>
                        <span className="text-sm font-bold text-red-600 whitespace-nowrap">৳{Math.abs(p.balance).toLocaleString()}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {/* Charts */}
          <motion.div variants={itemVariants} className="relative z-10">
            <DashboardCharts monthlyData={prepareChartData()} categoryData={categoryData} />
          </motion.div>

          {/* Recent Transactions */}
          <motion.section variants={itemVariants} className="relative z-10">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4 mt-2"><History className="h-4 w-4" /> Recent Transactions</h3>
            <div className="space-y-3">
              {recentTransactions.length === 0 ? <p className="text-center text-slate-400 py-6 bg-white rounded-2xl border border-dashed border-slate-200">No recent activity.</p> :
                recentTransactions.map((tx) => {
                  let Icon: any = ArrowDownRight;
                  let colorClass = 'text-green-600';
                  let bgClass = 'bg-green-50 border-green-100';
                  let isPositive = true;
                  let route = '/dashboard';
                  let displayName = tx.source_or_method || 'Unknown';

                  if (['EXPENSE', 'LEND', 'BORROW_REPAYMENT'].includes(tx.type)) { 
                    colorClass = 'text-red-600'; 
                    bgClass = 'bg-red-50 border-red-100'; 
                    isPositive = false; 
                  }
                  
                  if (tx.type === 'EXPENSE') { 
                    Icon = ArrowUpRight; 
                    displayName = tx.expense_profiles?.name || tx.source_or_method || 'Expense'; 
                    route = '/dashboard/expense'; 
                  } 
                  else if (tx.type === 'INCOME') { 
                    route = '/dashboard/income'; 
                  } 
                  else if (tx.type === 'LEND') { 
                    Icon = ArrowUpRight; 
                    displayName = `Loan to ${tx.people_profiles?.name || 'Unknown'}`; 
                    route = `/dashboard/ledger/${tx.person_id}`; 
                  } 
                  else if (tx.type === 'BORROW') { 
                    displayName = `Borrowed from ${tx.people_profiles?.name || 'Unknown'}`; 
                    route = `/dashboard/ledger/${tx.person_id}`; 
                  } 
                  else if (tx.type === 'LEND_REPAYMENT') { 
                    Icon = HandCoins; 
                    displayName = `Received from ${tx.people_profiles?.name || 'Unknown'}`; 
                    route = `/dashboard/ledger/${tx.person_id}`; 
                  } 
                  else if (tx.type === 'BORROW_REPAYMENT') { 
                    Icon = Wallet; 
                    displayName = `Paid back ${tx.people_profiles?.name || 'Unknown'}`; 
                    route = `/dashboard/ledger/${tx.person_id}`; 
                  }

                  return (
                    <Link key={tx.id} href={route} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center border shrink-0 ${bgClass}`}><Icon className={`h-5 w-5 ${colorClass}`} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 leading-tight break-words">{displayName}</p>
                          <p className="text-xs text-slate-500 mt-1 break-words">{new Date(tx.date).toLocaleDateString()} • {tx.transaction_method || 'Unknown'}</p>
                        </div>
                      </div>
                      <p className={`font-bold shrink-0 whitespace-nowrap pl-2 ${colorClass}`}>{isPositive ? '+' : '-'}৳{Number(tx.amount).toLocaleString()}</p>
                    </Link>
                  );
                })
              }
            </div>
          </motion.section>

          {/* --- REPORT GENERATOR SECTION --- */}
          <motion.section variants={itemVariants} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8 relative z-20">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Download className="h-5 w-5 text-blue-600" /> Generate Reports
            </h3>
            <div className="space-y-4">
              
              <div className="relative z-[60]">
                <CustomDropdown label="Select Timeframe" options={reportOptions} value={reportFilter} onChange={setReportFilter} />
              </div>

              {reportFilter === 'custom' && (
                <div className="grid grid-cols-2 gap-4 relative z-40">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">From</label>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 relative z-10">
                <button onClick={downloadCSV} className="h-12 bg-green-50 text-green-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition-colors">
                  <FileSpreadsheet className="h-5 w-5" /> Export Excel
                </button>
                <button onClick={() => window.print()} className="h-12 bg-red-50 text-red-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                  <Printer className="h-5 w-5" /> Print PDF
                </button>
              </div>
            </div>
          </motion.section>

        </motion.div>
      </div>

      {/* --- HIDDEN PDF REPORT TEMPLATE --- */}
      <div className="hidden print:block print-wrapper bg-white text-black font-sans min-h-screen pt-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Comprehensive Financial Report</h1>
          <p className="text-sm text-slate-500 mt-1">Generated on: {new Date().toLocaleDateString()}</p>
          <p className="text-sm font-bold text-blue-600 mt-1 uppercase">Filter: {reportOptions.find(o => o.value === reportFilter)?.label || ''} {reportFilter === 'custom' && `(${customStart} to ${customEnd})`}</p>
        </div>
        
        <table className="w-full border-collapse border border-slate-300 text-sm mb-6 text-left table-auto">
          <thead>
            <tr>
              <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold">SL</th>
              <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold">Date</th>
              <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold">Category / Person</th>
              <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold">Type</th>
              <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold w-[20%]">Remarks</th>
              <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold">Method</th>
              <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {reportTxs.map((tx, index) => {
              const name = tx.expense_profiles?.name || tx.people_profiles?.name || tx.source_or_method || 'Unknown';
              const isOut = ['EXPENSE', 'LEND', 'BORROW_REPAYMENT'].includes(tx.type);
              return (
                <tr key={tx.id} className="hover:bg-slate-50 break-inside-avoid">
                  <td className="border border-slate-300 px-4 py-3 text-center">{index + 1}</td>
                  <td className="border border-slate-300 px-4 py-3 whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="border border-slate-300 px-4 py-3 font-medium">{name}</td>
                  <td className="border border-slate-300 px-4 py-3">{formatType(tx.type)}</td>
                  <td className="border border-slate-300 px-4 py-3 break-words min-w-[150px]">{tx.description}</td>
                  <td className="border border-slate-300 px-4 py-3 whitespace-nowrap">{tx.transaction_method}</td>
                  <td className={`border border-slate-300 px-4 py-3 font-bold text-right whitespace-nowrap ${isOut ? 'text-red-700' : 'text-green-700'}`}>
                    {isOut ? '-' : '+'}৳{Number(tx.amount).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Report Summary */}
        <div className="flex flex-col items-end mt-8 break-inside-avoid">
          <div className="w-[450px] bg-slate-50 border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3">Report Summary</h3>
            <div className="flex justify-between mb-2 text-sm"><span>Total Income:</span><span className="font-bold text-green-700">+৳{repIncome.toLocaleString()}</span></div>
            <div className="flex justify-between mb-2 text-sm"><span>Total Expense:</span><span className="font-bold text-red-700">-৳{repExpense.toLocaleString()}</span></div>
            <div className="flex justify-between mb-2 text-sm"><span>Money In (Loans Taken / Rcvd):</span><span className="font-bold text-blue-700">+৳{repBorrow.toLocaleString()}</span></div>
            <div className="flex justify-between mb-4 text-sm"><span>Money Out (Loans Given / Paid):</span><span className="font-bold text-orange-700">-৳{repLend.toLocaleString()}</span></div>
            
            <div className="flex justify-between border-t border-slate-300 pt-3 text-base">
              <span className="font-semibold text-slate-900">Net Cash Flow (This Period):</span>
              <span className={`font-bold text-lg text-right ${(repIncome + repBorrow) - (repExpense + repLend) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {((repIncome + repBorrow) - (repExpense + repLend)) >= 0 ? '+' : '-'}৳{Math.abs((repIncome + repBorrow) - (repExpense + repLend)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}