'use client';

import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

interface ChartProps {
  monthlyData: { month: string; income: number; expense: number }[];
  categoryData: { name: string; value: number }[];
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export default function DashboardCharts({ monthlyData, categoryData }: ChartProps) {
  // Calculate totals to display in the Bar Chart legend
  const totalIncome = monthlyData.reduce((acc, curr) => acc + curr.income, 0);
  const totalExpense = monthlyData.reduce((acc, curr) => acc + curr.expense, 0);

  return (
    <div className="space-y-6">
      {/* Income vs Expense Bar Chart */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Cash Flow</h3>
        <div className="h-64 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={10} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => `৳${Number(value).toLocaleString()}`}
              />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Custom Legend for Bar Chart */}
        <div className="flex items-center justify-center gap-6 mt-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
            <span className="text-slate-600 font-medium">Income: ৳{totalIncome.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
            <span className="text-slate-600 font-medium">Expense: ৳{totalExpense.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* Expense Breakdown Donut Chart */}
      <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm mb-6">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Where your money goes</h3>
        {categoryData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No expenses this month</div>
        ) : (
          <>
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `৳${Number(value).toLocaleString()}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Legend for Pie Chart (Replaces standard Recharts Legend) */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs">
              {categoryData.map((entry, index) => (
                <div key={`legend-${index}`} className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></span>
                  <span className="text-slate-600 font-medium">
                    {entry.name}: ৳{entry.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}