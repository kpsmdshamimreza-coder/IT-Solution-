import React, { useState, useRef } from 'react';
import { ShoppingCart, Search, Plus, Minus, Trash2, CreditCard, DollarSign, Smartphone, Barcode, HelpCircle, CheckCircle, Printer, Phone, MapPin, Globe } from 'lucide-react';
import { Product, SaleItem } from '../types';
import BarcodeScannerModal from './BarcodeScannerModal';

interface CheckoutProps {
  products: Product[];
  onSaleCompleted: () => void;
}

export default function Checkout({ products, onSaleCompleted }: CheckoutProps) {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_pay'>('cash');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Categories extraction
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const handleScanBarcode = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode);
    if (!product) {
      setErrorMessage(`Barcode "${barcode}" not recognized. Add this product in the Inventory tab first!`);
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }
    addToCart(product);
  };

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleScanBarcode(manualBarcode.trim());
    setManualBarcode('');
  };

  const addToCart = (product: Product) => {
    const isService = product.type === 'service';
    if (!isService && product.stock <= 0) {
      setErrorMessage(`Cannot add "${product.name}" to cart. Out of stock!`);
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (!isService && existing.quantity >= product.stock) {
          setErrorMessage(`Cannot add more. Exceeds available stock of ${product.stock} units.`);
          setTimeout(() => setErrorMessage(''), 4000);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          quantity: 1,
          price: product.price,
          cost: product.cost
        }
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const isService = product.type === 'service';

    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (!isService && newQty > product.stock) {
              setErrorMessage(`Only ${product.stock} units available in stock.`);
              setTimeout(() => setErrorMessage(''), 4000);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as SaleItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 0.0825; // 8.25% retail sales tax
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setErrorMessage('');

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          paymentMethod
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Checkout failed');
      }

      const result = await response.json();
      setLastSaleReceipt({
        saleId: result.sale.id,
        items: result.sale.items,
        subtotal,
        tax,
        total,
        paymentMethod: result.sale.paymentMethod,
        timestamp: result.sale.timestamp
      });
      setIsCheckoutSuccess(true);
      setCart([]);
      onSaleCompleted();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during checkout');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Product Catalog Pane */}
      <div className="lg:col-span-7 space-y-4">
        {/* Actions & Filters Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name/barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Barcode Quick Scan Inputs */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <form onSubmit={handleManualBarcodeSubmit} className="flex-1 sm:flex-none flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500">
              <input
                type="text"
                placeholder="Type Barcode..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="pl-3 pr-1 py-2 w-28 sm:w-36 text-xs focus:outline-none font-mono"
              />
              <button
                type="submit"
                className="px-2.5 py-2 text-indigo-600 hover:bg-slate-50 border-l border-slate-100 transition"
                title="Submit barcode code"
              >
                <Barcode className="w-4 h-4" />
              </button>
            </form>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl flex items-center space-x-1.5 shadow-sm shadow-indigo-500/10 transition cursor-pointer shrink-0"
            >
              <Barcode className="w-4 h-4" />
              <span>Camera Scan</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Error alert toast */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2 animate-pulse">
            <span className="font-bold">Error:</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.map((p) => {
            const isService = p.type === 'service';
            const isOutOfStock = p.stock <= 0 && !isService;
            const isLowStock = p.stock <= p.minStock && p.stock > 0 && !isService;
            const cartItem = cart.find((item) => item.productId === p.id);
            const qtyInCart = cartItem?.quantity || 0;

            return (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={isOutOfStock}
                className={`flex flex-col justify-between bg-white border p-3 rounded-xl hover:shadow-md transition text-left cursor-pointer relative ${
                  isOutOfStock
                    ? 'opacity-55 border-slate-200 hover:shadow-none'
                    : qtyInCart > 0
                    ? 'border-indigo-600 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {qtyInCart > 0 && (
                  <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center animate-bounce">
                    {qtyInCart}
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    <span>{p.category}</span>
                    {isService && (
                      <span className="bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded text-[8px] font-bold">
                        SERVICE
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-slate-800 text-xs line-clamp-2 leading-tight">
                    {p.name}
                  </h4>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {p.barcode}
                  </div>
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    ৳{p.price.toFixed(2)}
                  </span>
                  <div className="text-right shrink-0">
                    {isService ? (
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.5 rounded">
                        Labor / N/A
                      </span>
                    ) : isOutOfStock ? (
                      <span className="text-[9px] bg-red-50 text-red-600 font-semibold px-1.5 py-0.5 rounded">
                        Sold Out
                      </span>
                    ) : isLowStock ? (
                      <span className="text-[9px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded">
                        Only {p.stock} left
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-mono">
                        Stock: {p.stock}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <ShoppingCart className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">No matching products found</p>
              <p className="text-xs text-slate-400">Add them under the inventory list tab</p>
            </div>
          )}
        </div>
      </div>

      {/* POS Basket Pane */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sticky top-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900 text-sm">Shopping Basket</h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-slate-400 hover:text-red-600 transition"
            >
              Clear Basket
            </button>
          )}
        </div>

        {/* Cart Item list */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl"
            >
              <div className="truncate flex-1 pr-3">
                <h5 className="text-xs font-medium text-slate-800 truncate">{item.name}</h5>
                <span className="text-[10px] text-slate-400 font-mono">৳{item.price.toFixed(2)} each</span>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="flex items-center border border-slate-200 rounded-lg bg-white">
                  <button
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="p-1 hover:text-indigo-600 transition"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-semibold px-2 w-6 text-center text-slate-800 font-mono">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="p-1 hover:text-indigo-600 transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <ShoppingCart className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-xs">Your basket is empty</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">
                Scan a barcode, select a catalog item, or enter a barcode code above.
              </p>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        {cart.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Payment Method
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 border rounded-xl flex flex-col items-center justify-center text-xs font-medium transition cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-4 h-4 mb-1" />
                <span>Cash</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-3 border rounded-xl flex flex-col items-center justify-center text-xs font-medium transition cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1" />
                <span>Card</span>
              </button>
              <button
                onClick={() => setPaymentMethod('mobile_pay')}
                className={`py-2 px-3 border rounded-xl flex flex-col items-center justify-center text-xs font-medium transition cursor-pointer ${
                  paymentMethod === 'mobile_pay'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1" />
                <span>Mobile</span>
              </button>
            </div>
          </div>
        )}

        {/* Cost Summary Ledger */}
        {cart.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <span className="font-mono font-medium">৳{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Sales Tax (8.25%)</span>
              <span className="font-mono font-medium">৳{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-slate-900 pt-1 border-t border-dashed border-slate-200">
              <span>Total Amount</span>
              <span className="font-mono text-base">৳{total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className={`w-full py-3 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 shadow-sm transition ${
            cart.length > 0
              ? 'bg-slate-950 hover:bg-slate-900 text-white shadow-slate-900/15 cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Process & Finalize Checkout</span>
        </button>
      </div>

      {/* Checkout Success Confirmation Dialog */}
      {isCheckoutSuccess && lastSaleReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-2xl max-w-2xl w-full space-y-4 my-8 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Sale Processed!</h3>
                  <p className="text-[10px] text-slate-500">Invoice successfully recorded.</p>
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
                  onClick={() => setIsCheckoutSuccess(false)}
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
                  <p><span className="font-sans text-slate-400 font-medium">Invoice ID:</span> #{lastSaleReceipt.saleId.slice(5).toUpperCase()}</p>
                  <p><span className="font-sans text-slate-400 font-medium">Date:</span> {new Date(lastSaleReceipt.timestamp).toLocaleDateString()}</p>
                  <p><span className="font-sans text-slate-400 font-medium">Time:</span> {new Date(lastSaleReceipt.timestamp).toLocaleTimeString()}</p>
                  <p><span className="font-sans text-slate-400 font-medium">Payment:</span> <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[9px] font-bold font-sans uppercase">{lastSaleReceipt.paymentMethod.replace('_', ' ')}</span></p>
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
                      {lastSaleReceipt.items.map((item: any) => (
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

              {/* Invoice Bottom Half: Services We Provide (Left) + Totals & QR Code (Right) */}
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
                      <span className="font-semibold text-slate-800">৳{lastSaleReceipt.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (8.25%)</span>
                      <span className="font-semibold text-slate-800">৳{lastSaleReceipt.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-900 pt-1.5 border-t border-dashed border-slate-300">
                      <span className="font-sans">Grand Total</span>
                      <span>৳{lastSaleReceipt.total.toFixed(2)}</span>
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

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                onClick={() => setIsCheckoutSuccess(false)}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1"
              >
                <span>Complete Transaction & Continue</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Active Scan Modality Overlay */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanBarcode}
        products={products}
      />
    </div>
  );
}
