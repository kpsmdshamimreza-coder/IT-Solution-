import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Store,
  Github,
  CheckCircle,
  Activity,
  History
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import Checkout from './components/Checkout';
import Inventory from './components/Inventory';
import AISmartInsights from './components/AISmartInsights';
import SalesHistory from './components/SalesHistory';
import { Product, Sale, LowStockAlert, TrendCategory } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'checkout' | 'inventory' | 'ai_insights' | 'sales_history'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [trends, setTrends] = useState<TrendCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);

  // Synchronize state from database Express API
  const refreshAllState = async () => {
    try {
      const [prodRes, salesRes, alertRes, trendRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/sales'),
        fetch('/api/alerts'),
        fetch('/api/trends')
      ]);

      if (!prodRes.ok || !salesRes.ok || !alertRes.ok || !trendRes.ok) {
        throw new Error('Database synchronizer returned an invalid response code');
      }

      const [prodData, salesData, alertData, trendData] = await Promise.all([
        prodRes.json(),
        salesRes.json(),
        alertRes.json(),
        trendRes.json()
      ]);

      setProducts(prodData);
      setSales(salesData);
      setAlerts(alertData);
      setTrends(trendData);
      setError('');
    } catch (err: any) {
      console.error('State sync failure:', err);
      setError('Connection to store server database failed. Please ensure dev server is fully active.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAllState();
  }, []);

  const handleSaleCompleted = () => {
    // Automatically re-fetch all statistics and quantities when a checkout completes
    refreshAllState();
  };

  const handleProductChanged = () => {
    // Re-fetch when products are added, edited, or deleted in catalog
    refreshAllState();
  };

  const handleRestockSelected = (categoryOrProduct: string) => {
    setActiveTab('inventory');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500/10 selection:text-indigo-900">
      {/* Visual background atmospheric dots grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Primary Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and store status details */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 p-1.5 flex items-center justify-center shadow-md">
                <img 
                  src="/icon.svg" 
                  alt="Akta Inventory Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h1 className="font-bold text-slate-950 text-base tracking-tight">Akta Inventory</h1>
                  <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded-full font-mono uppercase">
                    v1.0
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-400">Retail POS & Inventory Manager</p>
              </div>
            </div>

            {/* Live Database status heartbeat panel */}
            <div className="hidden md:flex items-center space-x-4 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200/55">
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-[ping_1.5s_infinite]" />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Live DB Synchronized
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="text-[11px] text-slate-500 font-mono">
                {products.length} Products Cataloged
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Core Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-6 relative z-10">
         {/* Navigation Tab rail - touch-optimized horizontal swiping scroll for mobile */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm overflow-hidden w-full">
          <div className="flex flex-1 overflow-x-auto scrollbar-none space-x-1 py-0.5 -my-0.5">
            {/* Dashboard Tab */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Reporting Dashboard</span>
            </button>

            {/* POS Checkout Tab */}
            <button
              onClick={() => setActiveTab('checkout')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'checkout'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Checkout POS</span>
            </button>

            {/* Inventory Tab */}
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Catalog & Stocks</span>
            </button>

            {/* AI Advisor Tab */}
            <button
              onClick={() => setActiveTab('ai_insights')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer relative overflow-hidden shrink-0 whitespace-nowrap ${
                activeTab === 'ai_insights'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Advisor</span>
              {alerts.length > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse border border-white" />
              )}
            </button>

            {/* Sales History Tab */}
            <button
              onClick={() => setActiveTab('sales_history')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'sales_history'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Sales History</span>
            </button>
          </div>

          {/* Quick Critical stock indicators bar for quick view */}
          {alerts.length > 0 && (
            <div className="hidden xl:flex items-center space-x-2 bg-amber-50 text-amber-800 px-3.5 py-2 rounded-xl border border-amber-100 text-[11px] font-semibold animate-pulse">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{alerts.length} Essential Supply Low Alerts</span>
            </div>
          )}
        </div>

        {/* Global connection or DB syncer errors */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-medium flex items-center space-x-2 shadow-sm shadow-red-100">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic View Rendering */}
        <div className="flex-1">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 w-16 h-16 bg-slate-900/5 rounded-full animate-ping opacity-60" />
                <Store className="w-10 h-10 text-slate-800 animate-pulse relative z-10" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-850">Initialising IT Solutions Database Engine...</p>
                <p className="text-xs text-slate-400 font-mono">Loading schema configurations & transactions ledger</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {activeTab === 'dashboard' && (
                  <Dashboard
                    products={products}
                    sales={sales}
                    alerts={alerts}
                    trends={trends}
                    onRefresh={refreshAllState}
                  />
                )}
                {activeTab === 'checkout' && (
                  <Checkout
                    products={products}
                    onSaleCompleted={handleSaleCompleted}
                  />
                )}
                {activeTab === 'inventory' && (
                  <Inventory
                    products={products}
                    onProductChanged={handleProductChanged}
                  />
                )}
                {activeTab === 'ai_insights' && (
                  <AISmartInsights onRestockSelected={handleRestockSelected} />
                )}
                {activeTab === 'sales_history' && (
                  <SalesHistory
                    sales={sales}
                    onRefresh={refreshAllState}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Footer copyright info */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p className="font-medium text-slate-500">IT Solutions &copy; 2026. Premium Retail Inventory Software.</p>
          <p className="font-mono text-[10px]">Optimized with Google Gemini &bull; Secure Server Operations</p>
        </div>
      </footer>
    </div>
  );
}
