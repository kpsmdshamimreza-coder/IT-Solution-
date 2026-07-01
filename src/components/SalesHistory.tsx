import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  Receipt, 
  Printer, 
  MapPin, 
  Phone, 
  Globe, 
  ArrowLeft, 
  CheckCircle,
  TrendingUp,
  CreditCard,
  DollarSign,
  Smartphone,
  Info,
  Trash2,
  Edit3,
  Save,
  Plus,
  Minus,
  X,
  AlertTriangle
} from 'lucide-react';
import { Sale, SaleItem } from '../types';

interface SalesHistoryProps {
  sales: Sale[];
  onRefresh: () => void;
}

export default function SalesHistory({ sales, onRefresh }: SalesHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Edit & Delete State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'card' | 'mobile_pay'>('cash');
  const [isSaving, setIsSaving] = useState(false);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const startEdit = (sale: Sale) => {
    setEditingSale(sale);
    setEditItems(sale.items.map(item => ({ ...item })));
    setEditPaymentMethod(sale.paymentMethod);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleQuantityChange = (productId: string, newQty: number) => {
    if (newQty < 1) return;
    setEditItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handlePriceChange = (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setEditItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, price: newPrice };
      }
      return item;
    }));
  };

  const handleRemoveItem = (productId: string) => {
    if (editItems.length <= 1) {
      setErrorMessage("An invoice must contain at least one item. To delete the entire invoice, use the Delete option instead.");
      return;
    }
    setEditItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleSaveEdit = async () => {
    if (!editingSale) return;
    setIsSaving(true);
    setErrorMessage('');
    try {
      const response = await fetch(`/api/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: editPaymentMethod,
          items: editItems
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update sale transaction');
      }

      setSuccessMessage('Invoice updated successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        setEditingSale(null);
      }, 1500);

      onRefresh();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to update invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    setIsDeleting(true);
    setErrorMessage('');
    try {
      const response = await fetch(`/api/sales/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete sale transaction');
      }

      setSuccessMessage('Invoice deleted successfully. Stocks reverted.');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      if (selectedSale?.id === id) {
        setSelectedSale(null);
      }
      setConfirmDeleteId(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to delete invoice.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculations for summarized stats of filtered edit totals
  const editSubtotal = editItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const editTax = editSubtotal * 0.0825;
  const editTotal = editSubtotal + editTax;

  // Filter and search logic
  const filteredSales = sales.filter((sale) => {
    // Search query matching items or sale ID
    const matchesSearch = 
      sale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Payment method filter
    const matchesPayment = paymentFilter === 'all' || sale.paymentMethod === paymentFilter;

    return matchesSearch && matchesPayment;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Calculations for summarized stats of filtered list
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalProfit = filteredSales.reduce((acc, s) => acc + s.totalProfit, 0);
  const totalItemsCount = filteredSales.reduce((acc, s) => acc + s.items.reduce((sum, item) => sum + item.quantity, 0), 0);

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border border-emerald-100">
            <DollarSign className="w-3 h-3" /> Cash
          </span>
        );
      case 'card':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border border-blue-100">
            <CreditCard className="w-3 h-3" /> Card
          </span>
        );
      case 'mobile_pay':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border border-purple-100">
            <Smartphone className="w-3 h-3" /> Mobile Pay
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border border-slate-150">
            {method}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Sales Ledger History</h2>
            <p className="text-xs text-slate-400">View, search, and reprint invoice receipts for completed transactions.</p>
          </div>
          <button 
            onClick={onRefresh}
            className="self-start sm:self-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Sync Ledger State
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search by Sale ID or Product Name */}
          <div className="md:col-span-8 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Invoice ID or Product/Service name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Payment method filter */}
          <div className="md:col-span-4">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash Only</option>
              <option value="card">Card Payments</option>
              <option value="mobile_pay">Mobile Pay</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Summary Widget for current filters */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtered Revenue</p>
            <p className="text-lg font-black text-slate-900">৳{totalRevenue.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transactions Count</p>
            <p className="text-lg font-black text-slate-900">{filteredSales.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-3.5">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Items Sold</p>
            <p className="text-lg font-black text-slate-900">{totalItemsCount} units</p>
          </div>
        </div>
      </div>

      {/* Ledger sales table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Invoice / Time</th>
                <th className="py-3 px-4">Purchased Items</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-750">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                    <p className="font-semibold text-slate-600">No matching transactions found</p>
                    <p className="text-[11px] text-slate-400">Try adjusting your filters or search criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const qtySum = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-mono font-bold text-slate-900">#{sale.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(sale.timestamp).toLocaleString()}</p>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="space-y-0.5">
                          {sale.items.map((item, index) => (
                            <p key={index} className="truncate text-slate-700 font-medium">
                              {item.name} <span className="text-[10px] text-slate-400 font-mono">({item.quantity}x)</span>
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                        {qtySum}
                      </td>
                      <td className="py-3 px-4">
                        {getPaymentBadge(sale.paymentMethod)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                        ৳{sale.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setSelectedSale(sale)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center space-x-1"
                            title="View Invoice"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                          <button
                            onClick={() => startEdit(sale)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center space-x-1"
                            title="Edit Invoice"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(sale.id)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center space-x-1"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal Dialog */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-2xl max-w-2xl w-full space-y-4 my-8 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition mr-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Invoice Details</h3>
                  <p className="text-[10px] text-slate-500">Transaction ID: #{selectedSale.id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Invoice Container */}
            <div className="printable-invoice-container bg-white border border-slate-200 rounded-xl p-6 text-slate-800 space-y-5 shadow-sm text-xs relative">
              
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-100">
                
                {/* Logo & Info */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-150 bg-slate-50 shrink-0 p-1 flex items-center justify-center">
                    <img 
                      src="/input_file_0.png" 
                      alt="IT Solutions Logo" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">IT Solutions</h1>
                    <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-widest">Sales • Service • Training</p>
                    <div className="mt-2 text-[10px] text-slate-500 space-y-0.5 leading-relaxed">
                      <p className="flex items-center"><MapPin className="w-3 h-3 mr-1 text-slate-400" /> Dhaka, Bangladesh</p>
                      <p className="flex items-center"><Phone className="w-3 h-3 mr-1 text-slate-400" /> IT Support: 01303-618946</p>
                      <p className="flex items-center"><Globe className="w-3 h-3 mr-1 text-slate-400" /> Hotline: +880 9638-600706</p>
                    </div>
                  </div>
                </div>

                {/* Receipt Meta */}
                <div className="text-left sm:text-right space-y-1 font-mono text-[10px] text-slate-600 shrink-0">
                  <h2 className="text-xs font-bold text-slate-800 tracking-wider font-sans">RETAIL INVOICE</h2>
                  <p><span className="font-sans text-slate-400 font-medium">Invoice ID:</span> #{selectedSale.id.slice(0, 14).toUpperCase()}</p>
                  <p><span className="font-sans text-slate-400 font-medium">Date:</span> {new Date(selectedSale.timestamp).toLocaleDateString()}</p>
                  <p><span className="font-sans text-slate-400 font-medium">Time:</span> {new Date(selectedSale.timestamp).toLocaleTimeString()}</p>
                  <p><span className="font-sans text-slate-400 font-medium">Payment:</span> <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[9px] font-bold font-sans uppercase">{selectedSale.paymentMethod.replace('_', ' ')}</span></p>
                </div>
              </div>

              {/* Items List Table */}
              <div className="space-y-2">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Purchased Items & Services</span>
                <div className="border border-slate-150 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="py-2 px-3">Item Name & Details</th>
                        <th className="py-2 px-3 text-center w-14">Qty</th>
                        <th className="py-2 px-3 text-right w-24">Price</th>
                        <th className="py-2 px-3 text-right w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-[11px] text-slate-700">
                      {selectedSale.items.map((item: SaleItem) => (
                        <tr key={item.productId} className="hover:bg-slate-50/20">
                          <td className="py-2.5 px-3 max-w-xs">
                            <p className="font-semibold text-slate-900 leading-tight">{item.name}</p>
                            {item.description && (
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">{item.description}</p>
                            )}
                            {item.warranty && item.warranty !== "No Warranty" && (
                              <span className="inline-block bg-amber-50 text-amber-800 border border-amber-100 text-[8px] font-semibold px-1.5 py-0.2 rounded mt-1 font-mono">
                                🛡️ {item.warranty} Warranty
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">৳{item.price.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">৳{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoice Bottom Half */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-3 border-t border-slate-100">
                
                {/* Left Side: Services provided info */}
                <div className="md:col-span-7 bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                  <h3 className="text-[9px] font-bold text-slate-900 tracking-wider uppercase border-b border-slate-250 pb-1">We Provide</h3>
                  <ul className="text-[10px] text-slate-600 space-y-1 list-disc list-inside leading-snug font-medium">
                    <li>Laptop & Desktop Sales</li>
                    <li>All Types of Laptop & Desktop Repair & Servicing</li>
                    <li>Genuine Laptop & Desktop Parts</li>
                    <li>Importer & Sub Dealer of Computer Parts</li>
                    <li>IT Training & Technical Support</li>
                  </ul>
                  <p className="text-[9px] text-amber-800 bg-amber-50/50 p-1.5 rounded border border-amber-100/30 leading-snug">
                    <strong>Warranty Terms:</strong> Warranty claims require showing this physical/digital invoice. Physical damage, liquid contact, or self-tempering voids warranty.
                  </p>
                </div>

                {/* Right Side: Financial ledger and QR Code */}
                <div className="md:col-span-5 flex flex-col justify-between space-y-3.5">
                  {/* Ledger */}
                  <div className="space-y-1.5 text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-800">৳{(selectedSale.totalAmount / 1.0825).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (8.25%)</span>
                      <span className="font-semibold text-slate-800">৳{(selectedSale.totalAmount - (selectedSale.totalAmount / 1.0825)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-900 pt-1.5 border-t border-dashed border-slate-300">
                      <span className="font-sans">Grand Total</span>
                      <span>৳{selectedSale.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* WhatsApp/Invoice Contact QR Code */}
                  <div className="flex items-center space-x-2.5 p-2 border border-slate-150 rounded-xl bg-white">
                    <div className="w-12 h-12 shrink-0 border border-slate-100 rounded-lg overflow-hidden bg-slate-50 p-0.5 flex items-center justify-center">
                      <img 
                        src="/input_file_1.png" 
                        alt="QR Code" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-800 uppercase tracking-tight leading-none">Scan QR Code</p>
                      <p className="text-[8px] text-slate-500 mt-1 leading-tight">Get in touch directly via WhatsApp or get IT Training Support.</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Thank you note */}
              <div className="text-center pt-3 border-t border-slate-100 text-[10px] text-indigo-600 font-bold tracking-wide">
                THANK YOU FOR YOUR BUSINESS • IT SOLUTIONS Dhaka
              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    startEdit(selectedSale);
                    setSelectedSale(null);
                  }}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Invoice</span>
                </button>
                <button
                  onClick={() => {
                    setConfirmDeleteId(selectedSale.id);
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Invoice</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Close Invoice View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 animate-bounce text-xs font-bold animate-[slideIn_0.2s_ease-out]">
          <CheckCircle className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
              <h3 className="font-bold text-sm uppercase tracking-wide">Void / Delete Sale Invoice?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to void and delete the sale invoice <strong className="text-slate-900 font-mono">#{confirmDeleteId.slice(0, 8).toUpperCase()}</strong>? 
              This action will delete the transaction from the ledger and automatically revert all physical parts back to inventory stock.
            </p>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-150 text-red-700 rounded-xl text-[11px] font-medium">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setConfirmDeleteId(null);
                  setErrorMessage('');
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSale(confirmDeleteId)}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Yes, Delete & Revert Stock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-2xl max-w-2xl w-full space-y-4 my-8 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase">Edit Sale Transaction</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Invoice ID: #{editingSale.id.slice(0, 12).toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSale(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editing Form Fields */}
            <div className="space-y-4 text-xs">
              {/* Payment Method */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'card', 'mobile_pay'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setEditPaymentMethod(method)}
                      className={`py-2 px-3 border rounded-xl flex items-center justify-center space-x-2 text-xs font-semibold capitalize transition cursor-pointer ${
                        editPaymentMethod === method
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {method === 'cash' && <DollarSign className="w-3.5 h-3.5" />}
                      {method === 'card' && <CreditCard className="w-3.5 h-3.5" />}
                      {method === 'mobile_pay' && <Smartphone className="w-3.5 h-3.5" />}
                      <span>{method.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List inside invoice */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Edit Invoice Items (Quantities & Prices)
                </label>
                <div className="border border-slate-150 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="py-2 px-3">Item Details</th>
                        <th className="py-2 px-3 text-center w-24">Price (৳)</th>
                        <th className="py-2 px-3 text-center w-32">Quantity</th>
                        <th className="py-2 px-3 text-right w-24">Total</th>
                        <th className="py-2 px-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editItems.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50/20">
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-800 leading-tight">{item.name}</p>
                            <span className="text-[9px] text-slate-400 font-mono">Barcode: {item.barcode}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => handlePriceChange(item.productId, Number(e.target.value))}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-center text-xs focus:ring-1 focus:ring-indigo-500/20 font-mono font-bold"
                              min="0"
                              step="any"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                                className="p-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-slate-800">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                className="p-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ৳{(item.price * item.quantity).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Remove Item"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error and Preview Section */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-150 text-red-700 rounded-xl text-[11px] font-medium leading-relaxed">
                  {errorMessage}
                </div>
              )}

              {/* Updated Totals Summary */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Totals Preview</span>
                <div className="flex items-baseline space-x-4">
                  <div className="text-right text-xs">
                    <span className="text-slate-500 font-mono">Subtotal: ৳{editSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="text-right font-bold text-slate-900 text-sm">
                    <span>Total: ৳{editTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingSale(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                disabled={isSaving}
              >
                Discard
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5"
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
