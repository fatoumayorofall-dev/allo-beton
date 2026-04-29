/**
 * ALLO BÉTON — ADMINISTRATION E-COMMERCE — 2026
 * Dashboard admin complet avec gestion produits, commandes, statistiques
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Package, ShoppingBag, CreditCard, Users,
  TrendingUp, DollarSign, Clock, CheckCircle, XCircle, Eye, Edit,
  Trash2, Plus, Search, RefreshCw, AlertCircle, Truck, FileText,
  ArrowUpRight, ArrowDownRight, Tag, Layers, Settings, BarChart3,
  ChevronRight, Save, X, Image, FolderOpen
} from 'lucide-react';
import { ModuleAnalytics } from '../../Analytics/ModuleAnalytics';
import { productsAPI, ordersAPI, invoicesAPI, Product, Category } from '../../../services/ecommerce-api';
import { PromotionsTab, CustomersTab, ReviewsTab, PaymentsTab } from './AdminTabs';
import { DeliveryTab } from './DeliveryTab';
import { SettingsTab } from './SettingsTab';
import { Star } from 'lucide-react';

type Tab = 'dashboard' | 'products' | 'categories' | 'orders' | 'customers' | 'promotions' | 'reviews' | 'payments' | 'analytics' | 'settings' | 'delivery';

const EcommerceAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [pendingOrderCount, setPendingOrderCount] = useState(0);

  // Polling léger pour le badge "Commandes en attente" dans la nav
  useEffect(() => {
    const checkPending = async () => {
      try {
        const res = await ordersAPI.adminList({ limit: 100, status: 'pending' });
        setPendingOrderCount((res.data || []).length);
      } catch { /* silencieux */ }
    };
    checkPending();
    const id = setInterval(checkPending, 30000);
    return () => clearInterval(id);
  }, []);

  const tabs = [
    { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { key: 'products', label: 'Produits', icon: Package },
    { key: 'categories', label: 'Catégories', icon: FolderOpen },
    { key: 'orders', label: 'Commandes', icon: ShoppingBag },
    { key: 'customers', label: 'Clients', icon: Users },
    { key: 'promotions', label: 'Promotions', icon: Tag },
    { key: 'reviews', label: 'Avis', icon: Star },
    { key: 'payments', label: 'Paiements', icon: CreditCard },
    { key: 'delivery', label: 'Livraisons', icon: Truck },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Administration E-commerce</h1>
              <p className="text-slate-400 text-sm">Gérez votre boutique Allo Béton</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — scrollables avec indicateurs latéraux */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto relative">
          {/* Fade gauche */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 lg:hidden" />
          {/* Fade droit */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 lg:hidden" />

          <nav className="flex gap-0.5 overflow-x-auto scrollbar-hide px-3 sm:px-6 snap-x snap-mandatory">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              const isOrders = tab.key === 'orders';
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key as Tab); if (isOrders) setPendingOrderCount(0); }}
                  className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-5 py-3.5 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 snap-start flex-shrink-0 ${
                    active
                      ? 'border-orange-600 text-orange-700 bg-orange-50/40'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  aria-current={active ? 'page' : undefined}
                  title={tab.label}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className={`${active ? 'inline' : 'hidden sm:inline'}`}>{tab.label}</span>
                  {isOrders && pendingOrderCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow">
                      {pendingOrderCount > 99 ? '99+' : pendingOrderCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'promotions' && <PromotionsTab />}
        {activeTab === 'reviews' && <ReviewsTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'delivery' && <DeliveryTab />}
        {activeTab === 'analytics' && <ModuleAnalytics module="ecommerce" title="Analytics E-commerce" />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════
const DashboardTab: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        ordersAPI.getStats().catch(() => ({ success: false })),
        ordersAPI.adminList({ limit: 5 }).catch(() => ({ success: false, data: [] }))
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (ordersRes.success) setRecentOrders(ordersRes.data || []);
    } catch (err) {
      console.error('Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (n: number) => new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-orange-100 text-orange-700',
    processing: 'bg-indigo-100 text-indigo-700',
    shipped: 'bg-cyan-100 text-cyan-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  const global = stats?.global || {};

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { icon: DollarSign, label: 'Chiffre d\'affaires', value: formatPrice(global.total_revenue || 0), trend: '+12%', up: true, color: 'amber' },
          { icon: ShoppingBag, label: 'Commandes', value: global.total_orders || 0, trend: '+8%', up: true, color: 'blue' },
          { icon: CheckCircle, label: 'Complétées', value: global.completed_orders || 0, color: 'emerald' },
          { icon: Clock, label: 'En attente', value: stats?.status_breakdown?.find((s: any) => s.status === 'pending')?.count || 0, color: 'orange' },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${card.color}-100`}>
                  <Icon className={`w-6 h-6 text-${card.color}-600`} />
                </div>
                {card.trend && (
                  <span className={`flex items-center gap-1 text-xs font-bold ${card.up ? 'text-emerald-600' : 'text-red-500'}`}>
                    {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {card.trend}
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-gray-900">{card.value}</p>
              <p className="text-gray-500 text-sm mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="font-bold text-gray-900">Dernières commandes</h2>
          </div>
          <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune commande pour le moment</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Commande</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-sm">{order.order_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.first_name} {order.last_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 font-bold text-sm">{formatPrice(order.total)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTS TAB
// ═══════════════════════════════════════════════════════════════
const ProductsTab: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        productsAPI.getAll({ limit: 100 }),
        productsAPI.getCategories()
      ]);
      setProducts(prodRes.data || prodRes.products || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await productsAPI.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erreur suppression');
    }
  };

  const formatPrice = (n: number) => new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all text-sm"
          />
        </div>
        <button
          onClick={() => { setEditingProduct(null); setShowForm(true); }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-600/20 hover:shadow-xl hover:shadow-orange-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nouveau produit
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Produit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Catégorie</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Prix</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                          {product.is_featured && (
                            <span className="text-[10px] font-bold text-orange-700 bg-slate-50 px-2 py-0.5 rounded">VEDETTE</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{product.sku || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.category_name || '-'}</td>
                    <td className="px-6 py-4 font-bold text-sm">{formatPrice(product.price)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        product.stock_status === 'in_stock' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {product.stock_status === 'in_stock' ? 'En stock' : 'Rupture'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingProduct(product); setShowForm(true); }}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onClose={() => { setShowForm(false); setEditingProduct(null); }}
          onSaved={() => { setShowForm(false); setEditingProduct(null); loadData(); }}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PRODUCT FORM MODAL
// ═══════════════════════════════════════════════════════════════
const ProductFormModal: React.FC<{
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ product, categories, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    description: product?.description || '',
    price: product?.price || 0,
    compare_at_price: product?.compare_price || 0,
    category_id: product?.category_id || '',
    unit: product?.unit || 'm³',
    stock_quantity: product?.stock_quantity || 0,
    stock_status: product?.stock_status || 'in_stock',
    image_url: product?.image_url || '',
    is_featured: product?.is_featured || false,
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      setError('Nom et prix requis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (product) {
        await productsAPI.update(product.id, form);
      } else {
        await productsAPI.create(form);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {product ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Nom */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nom du produit *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
              placeholder="Ex: Béton B25 Standard"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all resize-none"
              placeholder="Description du produit..."
            />
          </div>

          {/* Prix & SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Prix (FCFA) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Ancien prix</label>
              <input
                type="number"
                value={form.compare_at_price}
                onChange={(e) => setForm({ ...form, compare_at_price: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
                min="0"
                placeholder="Pour afficher une réduction"
              />
            </div>
          </div>

          {/* Catégorie & Unité */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
              >
                <option value="">Sélectionner...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Unité</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
              >
                <option value="m³">m³ (mètre cube)</option>
                <option value="tonne">Tonne</option>
                <option value="kg">Kilogramme</option>
                <option value="sac">Sac</option>
                <option value="unité">Unité</option>
              </select>
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Quantité en stock</label>
              <input
                type="number"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Statut stock</label>
              <select
                value={form.stock_status}
                onChange={(e) => setForm({ ...form, stock_status: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
              >
                <option value="in_stock">En stock</option>
                <option value="out_of_stock">Rupture</option>
                <option value="on_backorder">Sur commande</option>
              </select>
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">URL de l'image</label>
            <div className="flex gap-3">
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
                placeholder="https://..."
              />
              {form.image_url && (
                <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
              />
              <span className="text-sm font-medium text-gray-700">Produit vedette</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-600/20 hover:shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save className="w-4 h-4" /> Enregistrer</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ═══════════════════════════════════════════════════════════════
const CategoriesTab: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await productsAPI.getCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return;
    try {
      await productsAPI.deleteCategory(id);
      loadCategories();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Catégories ({categories.length})</h2>
        <button
          onClick={() => { setEditingCat(null); setShowForm(true); }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-600/20"
        >
          <Plus className="w-4 h-4" /> Nouvelle catégorie
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {cat.image_url ? (
                    <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900">{cat.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{cat.product_count || 0} produits</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                <button
                  onClick={() => { setEditingCat(cat); setShowForm(true); }}
                  className="flex-1 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="flex-1 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Form Modal */}
      {showForm && (
        <CategoryFormModal
          category={editingCat}
          onClose={() => { setShowForm(false); setEditingCat(null); }}
          onSaved={() => { setShowForm(false); setEditingCat(null); loadCategories(); }}
        />
      )}
    </div>
  );
};

const CategoryFormModal: React.FC<{
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ category, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    image_url: category?.image_url || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    setLoading(true);
    try {
      if (category) {
        await productsAPI.updateCategory(category.id, form);
      } else {
        await productsAPI.createCategory(form);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{category ? 'Modifier' : 'Nouvelle catégorie'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nom *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Image URL</label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
              placeholder="https://..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl font-semibold">Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold disabled:opacity-50">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ORDERS TAB
// ═══════════════════════════════════════════════════════════════
const POLL_INTERVAL = 30000; // 30 secondes

const OrdersTab: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newOrderToast, setNewOrderToast] = useState<string | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await ordersAPI.adminList({ limit: 50, status: statusFilter || undefined });
      const fetched: any[] = res.data || [];

      // Détection nouvelles commandes (polling silencieux uniquement)
      if (silent && knownIdsRef.current.size > 0) {
        const newOnes = fetched.filter(o => !knownIdsRef.current.has(o.id) && o.status === 'pending');
        if (newOnes.length > 0) {
          const first = newOnes[0];
          setNewOrderToast(`Nouvelle commande ${first.order_number} — ${first.first_name} ${first.last_name}`);
          setTimeout(() => setNewOrderToast(null), 6000);
        }
      }

      knownIdsRef.current = new Set(fetched.map(o => o.id));
      setOrders(fetched);
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter]);

  // Chargement initial + reset polling quand filtre change
  useEffect(() => {
    loadOrders(false);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadOrders(true), POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadOrders]);

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await ordersAPI.updateStatus(orderId, status);
      loadOrders(true);
    } catch (err: any) {
      alert(err.message || 'Erreur');
    }
  };

  const formatPrice = (n: number) => new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);

  const statuses = [
    { value: '', label: 'Tous' },
    { value: 'pending', label: 'En attente' },
    { value: 'confirmed', label: 'Confirmée' },
    { value: 'processing', label: 'En préparation' },
    { value: 'shipped', label: 'Expédiée' },
    { value: 'delivered', label: 'Livrée' },
    { value: 'completed', label: 'Complétée' },
    { value: 'cancelled', label: 'Annulée' },
  ];

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-orange-100 text-orange-700',
    processing: 'bg-indigo-100 text-indigo-700',
    shipped: 'bg-cyan-100 text-cyan-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Toast nouvelle commande */}
      {newOrderToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-4 bg-orange-600 text-white rounded-2xl shadow-2xl shadow-orange-900/30 animate-bounce-in max-w-sm">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm">Nouvelle commande !</p>
            <p className="text-xs text-orange-100 truncate">{newOrderToast}</p>
          </div>
          <button onClick={() => setNewOrderToast(null)} className="ml-2 opacity-70 hover:opacity-100 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm font-semibold"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button onClick={() => loadOrders(false)} className="px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-semibold">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
        <span className="text-xs text-gray-400 ml-1">Auto-actualisation toutes les 30s</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune commande</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Commande</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-sm">{order.order_number}</td>
                    <td className="px-6 py-4 text-sm">
                      <p className="font-medium text-gray-900">{order.first_name} {order.last_name}</p>
                      <p className="text-gray-500 text-xs">{order.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 font-bold text-sm">{formatPrice(order.total)}</td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border-0 cursor-pointer ${statusColors[order.status] || 'bg-gray-100'}`}
                      >
                        {statuses.filter(s => s.value).map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
};

const OrderDetailModal: React.FC<{ order: any; onClose: () => void }> = ({ order, onClose }) => {
  const formatPrice = (n: number) => new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [sendLoading, setSendLoading] = React.useState(false);
  const [sendMsg, setSendMsg] = React.useState<string | null>(null);

  const handleDownloadPdf = async () => {
    try {
      setPdfLoading(true);
      // Trouver la facture liée à cette commande
      const res = await invoicesAPI.adminList({ search: order.order_number, limit: 1 });
      const invList = res?.data?.invoices || res?.data || [];
      const inv = invList.find((i: any) => i.order_id === order.id) || invList[0];
      if (!inv) {
        alert('Aucune facture générée pour cette commande.');
        return;
      }
      await invoicesAPI.adminDownloadPdf(inv.id, inv.invoice_number);
    } catch (e: any) {
      alert(e.message || 'Erreur téléchargement PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!order.email) {
      alert('Ce client n\'a pas d\'email enregistré.');
      return;
    }
    try {
      setSendLoading(true);
      setSendMsg(null);
      const res = await invoicesAPI.adminList({ search: order.order_number, limit: 1 });
      const invList = res?.data?.invoices || res?.data || [];
      const inv = invList.find((i: any) => i.order_id === order.id) || invList[0];
      if (!inv) {
        alert('Aucune facture générée pour cette commande.');
        return;
      }
      const result = await invoicesAPI.send(inv.id);
      setSendMsg(result.simulated ? 'Email simulé (Gmail non configuré)' : `Envoyé à ${order.email}`);
    } catch (e: any) {
      alert(e.message || 'Erreur envoi email');
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">Commande {order.order_number}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              {pdfLoading ? '...' : 'PDF'}
            </button>
            {order.email && (
              <button
                onClick={handleSendEmail}
                disabled={sendLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Truck className="w-3.5 h-3.5" />
                {sendLoading ? '...' : 'Envoyer'}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
        {sendMsg && (
          <div className="px-6 py-2 bg-emerald-50 text-emerald-700 text-xs font-medium border-b border-emerald-100">
            ✓ {sendMsg}
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Client Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Client</p>
              <p className="font-semibold">{order.first_name} {order.last_name}</p>
              <p className="text-sm text-gray-500">{order.email}</p>
              <p className="text-sm text-gray-500">{order.phone}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Date</p>
              <p className="font-semibold">
                {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-semibold">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">TVA ({order.tax_rate}%)</span>
              <span className="font-semibold">{formatPrice(order.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Livraison</span>
              <span className="font-semibold">{order.shipping_amount > 0 ? formatPrice(order.shipping_amount) : 'Gratuit'}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Réduction</span>
                <span>-{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black pt-3 border-t border-gray-200">
              <span>Total</span>
              <span className="text-orange-700">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EcommerceAdmin;
