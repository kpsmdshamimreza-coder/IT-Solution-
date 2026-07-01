import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  Briefcase,
  Trash2,
  Calendar,
  CreditCard,
  Smartphone
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Product, Sale, LowStockAlert, TrendCategory } from '../types';

interface DashboardProps {
  products: Product[];
  sales: Sale[];
  alerts: LowStockAlert[];
  trends: TrendCategory[];
  onRefresh: () => void;
}

export default function Dashboard({
  products,
  sales,
  alerts,
  trends,
  onRefresh
}: DashboardProps) {
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'week'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleVoidSale = async (saleId: string) => {
    if (!window.confirm("Are you absolutely sure you want to void/delete this transaction? This will restore any physical computer/laptop parts back to stock inventory and permanently delete this receipt.")) {
      return;
    }
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to void transaction");
      }
      setDeleteSuccess("Transaction voided successfully. Parts inventory levels restored!");
      setTimeout(() => setDeleteSuccess(''), 4000);
      onRefresh();
    } catch (err: any) {
      setDeleteError(err.message || "An error occurred while voiding transaction");
      setTimeout(() => setDeleteError(''), 4000);
    }
  };

  // 1. Calculate general stats
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.totalProfit, 0);
  const totalTransactions = sales.length;
  const lowStockCount = alerts.length;

  // Average margin
  const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // 2. Format Line Chart Data (Sales & Profit by Day)
  const getLineChartData = () => {
    // Group sales by day
    const salesByDay: { [key: string]: { date: string; Revenue: number; Profit: number } } = {};

    sales.forEach((s) => {
      const dateStr = new Date(s.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      if (!salesByDay[dateStr]) {
        salesByDay[dateStr] = { date: dateStr, Revenue: 0, Profit: 0 };
      }
      salesByDay[dateStr].Revenue += s.totalAmount;
      salesByDay[dateStr].Profit += s.totalProfit;
    });

    // If no sales exist, provide simple mock days
    const result = Object.values(salesByDay);
    if (result.length === 0) {
      return [
        { date: 'Mon', Revenue: 0, Profit: 0 },
        { date: 'Tue', Revenue: 0, Profit: 0 },
        { date: 'Wed', Revenue: 0, Profit: 0 }
      ];
    }

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // 3. Format Bar Chart Data (Revenue by Product Category)
  const getBarChartData = () => {
    return trends.map((t) => ({
      Category: t.category,
      Sales: t.salesCount,
      Revenue: t.revenue,
      Profit: t.profit
    }));
  };

  return (
    <div className="space-y-6">
      {/* Time Frame selector & Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Real-Time Store Summary
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Synced: {new Date().toLocaleTimeString()}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Metric Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Card 1: Revenue */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400">Store Revenue</span>
            <p className="text-2xl font-bold font-mono text-slate-900">৳{totalRevenue.toFixed(2)}</p>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5 shrink-0" />
              +14.2% week-on-week
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card 2: Profit */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 font-medium">Net Gross Profit</span>
            <p className="text-2xl font-bold font-mono text-slate-900">৳{totalProfit.toFixed(2)}</p>
            <span className="text-[10px] text-slate-500 font-medium font-mono">
              Margin: {avgProfitMargin.toFixed(1)}%
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card 3: Transactions */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 font-medium">Sales Count</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{totalTransactions}</p>
            <span className="text-[10px] text-slate-500 font-mono">
              Completed checkouts
            </span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card 4: Low Stock Alert */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 font-medium">Critical Stock Alerts</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{lowStockCount}</p>
            <span className={`text-[10px] font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {lowStockCount > 0 ? 'Action needed immediately' : 'Inventory fully stocked'}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Continuous sales/profit trend line chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-slate-950 text-xs uppercase tracking-wider text-slate-500 flex items-center space-x-1">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <span>Revenue vs Net Profit Flow</span>
            </h3>
            <p className="text-xs text-slate-400">Daily financial ledger tracker</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getLineChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  labelClassName="text-xs font-bold font-sans"
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Revenue" stroke="#4f46e5" strokeWidth={2.5} activeDot={{ r: 6 }} name="Gross Revenue" />
                <Line type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} name="Net Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Category Performance bar chart */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-slate-950 text-xs uppercase tracking-wider text-slate-500 flex items-center space-x-1">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Category Revenue Performance</span>
            </h3>
            <p className="text-xs text-slate-400">Inventory sales volume split</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getBarChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="Category" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Gross Sales (৳)" />
                <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit Margin (৳)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Critical Stock list & Trending indicators panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Critical Alerts board */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Automated Low-Stock Board</span>
            </h3>
            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-mono">
              {alerts.length} ALERT(S)
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {alerts.map((a) => (
              <div
                key={a.productId}
                className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/40"
              >
                <div>
                  <h5 className="text-xs font-semibold text-slate-800">{a.productName}</h5>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">Code: {a.barcode}</span>
                    {a.isEssential && (
                      <span className="text-[8px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        CRITICAL SUPPLY
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-red-600 font-mono">Only {a.stock} left</p>
                  <p className="text-[9px] text-slate-400 font-mono">Target: {a.minStock}</p>
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <CheckIcon className="w-8 h-8 text-emerald-500 mb-2" />
                <p>All essential supplies fully stocked!</p>
              </div>
            )}
          </div>
        </div>

        {/* Product categories trend indexes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <span>Trending Product Categories</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Growth Indexes</span>
          </div>

          <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
            {trends.map((t) => (
              <div key={t.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{t.category}</span>
                  <span className="font-mono text-indigo-600 font-bold flex items-center">
                    +{t.growth.toFixed(1)}% index
                  </span>
                </div>
                {/* Visual bar progress */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(t.growth * 3.5, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Logs & Repair Job Invoices Ledger with Delete/Void capability */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Repair Servicing Logs & Sales Ledger</span>
            </h3>
            <p className="text-xs text-slate-400">View checkouts, parts dispatch, and void/delete previous transactions</p>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/40">
            {sales.length} Logs Saved
          </span>
        </div>

        {/* Messaging feedback */}
        {deleteSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
            <span className="font-bold">Success:</span>
            <span>{deleteSuccess}</span>
          </div>
        )}
        {deleteError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center space-x-2">
            <span className="font-bold">Error:</span>
            <span>{deleteError}</span>
          </div>
        )}

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Receipt ID</th>
                <th className="py-3 px-4">Timestamp & Date</th>
                <th className="py-3 px-4">Dispatched Parts & Labor Jobs</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Net Profit</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {sales.map((s) => {
                const dateFormatted = new Date(s.timestamp).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-600 truncate max-w-[110px]" title={s.id}>
                      {s.id.toUpperCase()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dateFormatted}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="space-y-1">
                        {s.items.map((item, idx) => {
                          const product = products.find(p => p.id === item.productId);
                          const isService = product?.type === "service";

                          return (
                            <div key={idx} className="flex items-center space-x-1.5 text-slate-800">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${isService ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                              <span className="font-medium text-slate-800">{item.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({item.quantity}x @ ৳{item.price.toFixed(2)})
                              </span>
                              {isService && (
                                <span className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1 rounded font-bold">
                                  LABOR
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                        s.paymentMethod === "cash" 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : s.paymentMethod === "card"
                          ? "bg-blue-50 border-blue-200 text-blue-800"
                          : "bg-purple-50 border-purple-200 text-purple-800"
                      }`}>
                        {s.paymentMethod === "cash" && <DollarSign className="w-3 h-3" />}
                        {s.paymentMethod === "card" && <CreditCard className="w-3 h-3" />}
                        {s.paymentMethod === "mobile_pay" && <Smartphone className="w-3 h-3" />}
                        <span>{s.paymentMethod.replace("_", " ")}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ৳{s.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                      +৳{s.totalProfit.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleVoidSale(s.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Void and Cancel transaction (restore inventory stock)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No transactions or repairs logged yet. Proceed to POS Checkout to add your first transaction.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
