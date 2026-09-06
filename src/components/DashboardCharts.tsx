'use client';

import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine 
} from 'recharts';

// --- TYPESCRIPT DEFINITIONS ---
interface ChartProps {
  // Time-series data
  monthlyData?: { month: string; income: number; expense: number; netBalance: number }[];
  
  // Categorical Data
  expenseCategoryData?: { name: string; value: number }[];
  incomeSourceData?: { name: string; value: number }[];
  
  // Ratio Data
  cashVsCreditData?: { name: string; value: number }[];
  earnedVsBorrowedData?: { name: string; value: number }[];
  
  // Matrix Data
  loanMatrixData?: { name: string; owesMe: number; iOwe: number }[]; 
}

const CATEGORY_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

// Custom Tooltip Formatter to handle absolute values (so negative debt doesn't show as "-500")
const currencyFormatter = (value: any) => `৳${Math.abs(Number(value)).toLocaleString()}`;

// --- HELPER: Top 4 + Others Grouping ---
const processTop4 = (data: { name: string; value: number }[]) => {
  if (!data || data.length <= 5) return data;
  
  // Sort descending
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top4 = sorted.slice(0, 4);
  
  // Sum everything from index 4 onwards into "Others"
  const othersValue = sorted.slice(4).reduce((sum, item) => sum + item.value, 0);
  
  return [...top4, { name: 'Others', value: othersValue }];
};

// --- HELPER: Top 4 + Others for Ledger Matrix ---
const processMatrixTop4 = (data: { name: string; owesMe: number; iOwe: number }[]) => {
  if (!data || data.length <= 5) return data;
  
  // Sort by highest absolute involvement (biggest debts either way)
  const sorted = [...data].sort((a, b) => (b.owesMe + Math.abs(b.iOwe)) - (a.owesMe + Math.abs(a.iOwe)));
  const top4 = sorted.slice(0, 4);
  
  // Combine the rest into a single "Others" ledger bar
  const others = sorted.slice(4).reduce((acc, curr) => ({
    name: 'Others',
    owesMe: acc.owesMe + curr.owesMe,
    iOwe: acc.iOwe + curr.iOwe
  }), { name: 'Others', owesMe: 0, iOwe: 0 });

  return [...top4, others];
};

export default function DashboardCharts({ 
  monthlyData = [], 
  expenseCategoryData = [], 
  incomeSourceData = [],
  cashVsCreditData = [],
  earnedVsBorrowedData = [],
  loanMatrixData = []
}: ChartProps) {
  
  // Totals for Bar Chart
  const totalIncome = monthlyData.reduce((acc, curr) => acc + curr.income, 0);
  const totalExpense = monthlyData.reduce((acc, curr) => acc + curr.expense, 0);
  
  // Totals for Ledger Matrix
  const totalReceivable = loanMatrixData.reduce((acc, curr) => acc + curr.owesMe, 0);
  const totalPayable = loanMatrixData.reduce((acc, curr) => acc + Math.abs(curr.iOwe), 0);

  // Apply Top 4 grouping
  const displayIncomeSources = processTop4(incomeSourceData);
  const displayExpenseCategories = processTop4(expenseCategoryData);
  const displayLoanMatrix = processMatrixTop4(loanMatrixData);

  return (
    <div className="space-y-6">
      
      {/* =========================================
          SECTION 1: OVERVIEW TRENDS (FULL WIDTH)
          ========================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Cash Flow Bar Chart */}
        <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Cash Flow (Income vs Expense)</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={10} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={currencyFormatter} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#10b981]"></span><span className="text-slate-600 font-medium">Income: ৳{totalIncome.toLocaleString()}</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ef4444]"></span><span className="text-slate-600 font-medium">Expense: ৳{totalExpense.toLocaleString()}</span></div>
          </div>
        </section>

        {/* Net Worth / Balance Trend Line Chart */}
        <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Net Balance Trajectory</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={10} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={currencyFormatter} />
                <Line type="monotone" dataKey="netBalance" name="Net Balance" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center mt-6 text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#8b5cf6]"></span><span className="text-slate-600 font-medium">Overall Financial Health</span></div>
          </div>
        </section>
      </div>

      {/* =========================================
          SECTION 2: BREAKDOWNS (HALF WIDTH)
          ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Source Donut */}
        <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Income Sources</h3>
          {displayIncomeSources.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-10">No income data</div>
          ) : (
            <>
              <div className="h-48 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={displayIncomeSources} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                      {displayIncomeSources.map((_, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={currencyFormatter} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs">
                {displayIncomeSources.map((entry, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}></span>
                    <span className="text-slate-600 font-medium">{entry.name}: ৳{entry.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Expense Category Donut */}
        <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Where Your Money Goes</h3>
          {displayExpenseCategories.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-10">No expense data</div>
          ) : (
            <>
              <div className="h-48 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={displayExpenseCategories} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                      {displayExpenseCategories.map((_, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={currencyFormatter} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs">
                {displayExpenseCategories.map((entry, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}></span>
                    <span className="text-slate-600 font-medium">{entry.name}: ৳{entry.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* =========================================
          SECTION 3: RATIOS (HALF WIDTH)
          ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cash vs Credit Ratio */}
        <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Expense: Cash vs Pay Later</h3>
          {cashVsCreditData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-10">No data available</div>
          ) : (
            <>
              <div className="h-40 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cashVsCreditData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                      {cashVsCreditData.map((entry, index) => {
                        const isCash = entry.name === 'Upfront (Cash/Bank)';
                        return <Cell key={`cell-${index}`} fill={isCash ? '#3b82f6' : '#f59e0b'} />;
                      })}
                    </Pie>
                    <Tooltip formatter={currencyFormatter} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-xs">
                {cashVsCreditData.map((entry, index) => {
                  const isCash = entry.name === 'Upfront (Cash/Bank)';
                  const color = isCash ? '#3b82f6' : '#f59e0b';
                  return (
                    <div key={`legend-${index}`} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                      <span className="text-slate-600 font-medium">{entry.name}: ৳{entry.value.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Earned vs Borrowed Income */}
        <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Inflow: Earned vs Borrowed</h3>
          {earnedVsBorrowedData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-10">No data available</div>
          ) : (
            <>
              <div className="h-40 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={earnedVsBorrowedData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                      {earnedVsBorrowedData.map((entry, index) => {
                        const isEarned = entry.name === 'Earned Income';
                        return <Cell key={`cell-${index}`} fill={isEarned ? '#10b981' : '#ef4444'} />;
                      })}
                    </Pie>
                    <Tooltip formatter={currencyFormatter} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-xs">
                {earnedVsBorrowedData.map((entry, index) => {
                  const isEarned = entry.name === 'Earned Income';
                  const color = isEarned ? '#10b981' : '#ef4444';
                  return (
                    <div key={`legend-${index}`} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                      <span className="text-slate-600 font-medium">{entry.name}: ৳{entry.value.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* =========================================
          SECTION 4: DEBT MATRIX (FULL WIDTH)
          ========================================= */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Ledger Health (Who owes whom)</h3>
        {displayLoanMatrix.length === 0 ? (
           <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Your ledger is completely settled!</div>
        ) : (
          <>
            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayLoanMatrix} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} width={80} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={currencyFormatter} />
                  <ReferenceLine x={0} stroke="#cbd5e1" />
                  <Bar dataKey="owesMe" name="They Owe Me" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                  <Bar dataKey="iOwe" name="I Owe Them" stackId="a" fill="#ef4444" radius={[4, 0, 0, 4]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0 bg-[#10b981]"></span>
                <span className="text-slate-600 font-medium">Loan Receivable: ৳{totalReceivable.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0 bg-[#ef4444]"></span>
                <span className="text-slate-600 font-medium">Loan Payable: ৳{totalPayable.toLocaleString()}</span>
              </div>
            </div>
          </>
        )}
      </section>

    </div>
  );
}