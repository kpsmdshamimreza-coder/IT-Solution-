import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, AlertTriangle, ShieldCheck, Check, X, Barcode, Eye } from 'lucide-react';
import { Product } from '../types';

interface InventoryProps {
  products: Product[];
  onProductChanged: () => void;
}

export default function Inventory({ products, onProductChanged }: InventoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showEssentialOnly, setShowEssentialOnly] = useState(false);
  
  // Dialog / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    isEssential: false,
    type: 'part' as 'part' | 'service',
    description: '',
    warranty: 'No Warranty'
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected product for barcode visual generation
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<Product | null>(null);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      name: '',
      barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString(), // auto-generate a valid-length EAN barcode
      category: 'Laptop',
      price: '',
      cost: '',
      stock: '',
      minStock: '',
      isEssential: false,
      type: 'part',
      description: '',
      warranty: '1 Year Warranty'
    });
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setIsEditing(true);
    setCurrentId(product.id);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      isEssential: product.isEssential,
      type: product.type || 'part',
      description: product.description || '',
      warranty: product.warranty || 'No Warranty'
    });
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this product? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      setSuccessMsg('Product successfully removed');
      setTimeout(() => setSuccessMsg(''), 3000);
      onProductChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const { name, barcode, category, price, cost, stock, minStock, isEssential, type, description, warranty } = formData;
    if (!name.trim() || !barcode.trim() || !category.trim()) {
      setErrorMsg('Please fill in all required fields (Name, Barcode, Category).');
      return;
    }

    const payload = {
      name: name.trim(),
      barcode: barcode.trim(),
      category: category.trim(),
      price: Number(price) || 0,
      cost: Number(cost) || 0,
      stock: type === "service" ? 9999 : (parseInt(stock) || 0),
      minStock: type === "service" ? 0 : (parseInt(minStock) || 0),
      isEssential: type === "service" ? false : Boolean(isEssential),
      type: type,
      description: description.trim(),
      warranty: warranty.trim()
    };

    try {
      const url = isEditing ? `/api/products/${currentId}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Server validation failed');
      }

      setSuccessMsg(isEditing ? 'Product updated successfully' : 'Product added successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      setIsFormOpen(false);
      onProductChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving product details');
    }
  };

  // Barcode graphics generator canvas
  const BarcodeCanvas = ({ code }: { code: string }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw custom EAN-like barcode stripes
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f172a'; // slate-900

      const padLeft = 15;
      const height = 65;
      const width = 2;

      // Seed standard sequence based on digits
      let currentX = padLeft;
      ctx.fillRect(currentX, 10, 3, height); // start guard
      currentX += 4;
      ctx.fillRect(currentX, 10, 3, height);
      currentX += 6;

      for (let i = 0; i < code.length; i++) {
        const digit = parseInt(code[i]) || 0;
        // Generate pseudo-stripe pattern based on digit
        const pattern = [
          [1, 2, 1, 1],
          [2, 1, 2, 1],
          [1, 1, 3, 1],
          [3, 1, 1, 1],
          [1, 3, 1, 2],
          [1, 2, 3, 1],
          [1, 1, 1, 4],
          [1, 4, 1, 1],
          [1, 1, 4, 1],
          [2, 2, 1, 1]
        ][digit];

        pattern.forEach((w, idx) => {
          if (idx % 2 === 0) {
            ctx.fillRect(currentX, 10, w * width, height);
          }
          currentX += w * width + 2;
        });
      }

      ctx.fillRect(currentX, 10, 3, height); // end guard
      currentX += 4;
      ctx.fillRect(currentX, 10, 3, height);

      // Label
      ctx.font = '12px Courier New, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(code, canvas.width / 2, 90);
    }, [code]);

    return <canvas ref={canvasRef} width="320" height="110" className="mx-auto border border-slate-100 bg-white rounded-xl shadow-inner p-2" />;
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesLowStock = !showLowStockOnly || p.stock <= p.minStock;
    const matchesEssential = !showEssentialOnly || p.isEssential;
    return matchesSearch && matchesCategory && matchesLowStock && matchesEssential;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Header bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:flex-none min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by name, barcode, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="focus:outline-none bg-transparent font-medium text-slate-700"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Toggle buttons */}
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition flex items-center space-x-1 ${
              showLowStockOnly
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Alerts</span>
          </button>

          <button
            onClick={() => setShowEssentialOnly(!showEssentialOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition flex items-center space-x-1 ${
              showEssentialOnly
                ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Essential Supplies</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl flex items-center space-x-1 shadow-sm transition ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Messaging alerts */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 animate-pulse">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid / Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Barcode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">Retail Price</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-center">Indicators</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock <= p.minStock && p.stock > 0;
                const isService = p.type === 'service';

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-start space-x-2">
                        {isService ? (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" title="Labor Service" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" title="Physical Part Upgrade" />
                        )}
                        <div className="truncate">
                          <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                          {p.description && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5" title={p.description}>
                              {p.description}
                            </p>
                          )}
                          {p.warranty && p.warranty !== 'No Warranty' && (
                            <span className="inline-block text-[9px] bg-amber-50 text-amber-800 border border-amber-100 font-medium px-1.5 py-0.2 rounded mt-1">
                              🛡️ {p.warranty}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {p.barcode}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md text-[10px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                      ৳{p.cost.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                      ৳{p.price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium">
                      {isService ? (
                        <span className="text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full text-[10px]">
                          Labor/Unlimited
                        </span>
                      ) : (
                        <>
                          <span className={isOutOfStock ? 'text-red-600 font-bold' : isLowStock ? 'text-amber-600 font-semibold' : 'text-slate-800'}>
                            {p.stock}
                          </span>
                          <span className="text-slate-400 text-[10px]"> / {p.minStock} min</span>
                        </>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isService ? (
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            REPAIR SERVICE
                          </span>
                        ) : (
                          <>
                            {p.isEssential && (
                              <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-bold px-1.5 py-0.5 rounded" title="Essential store supply item">
                                ESSENTIAL
                              </span>
                            )}
                            {isOutOfStock ? (
                              <span className="bg-red-50 text-red-700 border border-red-100 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                OUT OF STOCK
                              </span>
                            ) : isLowStock ? (
                              <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                LOW ALERT
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                HEALTHY
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setSelectedBarcodeProduct(p)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="Generate printable barcode sticker"
                        >
                          <Barcode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No matching products in catalog
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Form Modal Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-950 text-sm">
                {isEditing ? 'Modify Catalog Product' : 'Register New Catalog Product'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <p className="p-2.5 bg-red-50 text-red-700 text-[11px] rounded-lg border border-red-200">
                {errorMsg}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Product/Service Type Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Item Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'part' })}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
                      formData.type === 'part'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    💻 Physical Upgrade Part
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'service' })}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
                      formData.type === 'service'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🔧 Repair / Labor Service
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={formData.type === 'service' ? "e.g. Broken Screen Hinge Welding Service" : "e.g. Kingston 512GB NVMe M.2 SSD"}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Barcode / SKU EAN *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. srv_repair..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Monitor">Monitor</option>
                    <option value="HDD">HDD</option>
                    <option value="SSD">SSD</option>
                    <option value="Motherboard">Motherboard</option>
                    <option value="Desktop Casing">Desktop Casing</option>
                    <option value="Power Supply">Power Supply</option>
                    <option value="Speaker">Speaker</option>
                    <option value="Storage & RAM">Storage & RAM</option>
                    <option value="Screens & Displays">Screens & Displays</option>
                    <option value="Power & Battery">Power & Battery</option>
                    <option value="Supplies & Cooling">Supplies & Cooling</option>
                    <option value="Servicing & Labor">Servicing & Labor</option>
                    <option value="Keyboards & Mice">Keyboards & Mice</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Wholesale Cost (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Retail Price (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Warranty and Description */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Warranty Period / Details
                  </label>
                  <input
                    type="text"
                    value={formData.warranty}
                    onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                    placeholder="e.g. 1 Year Warranty, 3 Years, No Warranty, Lifetime"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Product/Service Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide hardware specifications, conditions, or service details..."
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              {formData.type === 'part' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Initial Stock Count *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Min alert Stock level *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[11px] text-indigo-700">
                  <p className="font-semibold mb-0.5">💡 Unlimited Stock Level for Labor</p>
                  <p className="text-[10px] text-indigo-600/80">Labor or software diagnostics services do not track physical inventory quantities. Stock level is treated as unlimited.</p>
                </div>
              )}

              {/* Essential Supply Checkbox - Only show for physical parts */}
              {formData.type === 'part' && (
                <label className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isEssential}
                    onChange={(e) => setFormData({ ...formData, isEssential: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Critical Part Alert</p>
                    <p className="text-[10px] text-slate-400">Marking items as critical triggers early restock notifications on dashboard.</p>
                  </div>
                </label>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                {isEditing ? 'Apply Changes' : 'Register Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Visualizer sticker dialog */}
      {selectedBarcodeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="font-semibold text-slate-950 text-sm">Printable Barcode Tag</span>
              <button
                onClick={() => setSelectedBarcodeProduct(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl">
              <p className="text-xs font-bold text-slate-800 tracking-wide mb-1 uppercase">
                {selectedBarcodeProduct.name}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mb-3">
                Price: <span className="text-slate-900 font-bold">৳{selectedBarcodeProduct.price.toFixed(2)}</span>
              </p>
              <BarcodeCanvas code={selectedBarcodeProduct.barcode} />
            </div>

            <button
              onClick={() => {
                window.print();
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <span>Print Barcode Label</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
