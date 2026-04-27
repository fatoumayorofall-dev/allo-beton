import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, AlertTriangle, Package, Edit, RotateCcw,
  Layers, RefreshCw, Trash2, DollarSign, Archive,
  Download, Clock, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, ArrowUpRight, ArrowDownRight, Settings2,
  Zap, ListChecks, History
} from 'lucide-react';
import { Product, StockMovement } from '../../types';
import { useDataContext } from '../../contexts/DataContext';
import { productsAPI } from '../../services/mysql-api';
import { StockMovementsTab } from './StockMovementsTab';

interface InventoryListProps {
  onCreateProduct: () => void;
  onEditProduct: (product: Product) => void;
  onRestockProduct: (product: Product) => void;
}

const ITEMS_PER_PAGE = 20;
type TabType = 'products' | 'movements' | 'init';

type StockStatus = 'out' | 'low' | 'medium' | 'good';

const stockStatusStyles: Record<StockStatus, { badge: string; dot: string; label: string; text: string; row?: string }> = {
  out: { badge: 'bg-red-50 text-red-700 border-red-200/60', dot: 'bg-red-500', label: 'Rupture', text: 'text-red-600', row: 'border-l-[3px] border-l-red-400' },
  low: { badge: 'bg-amber-50 text-amber-700 border-amber-200/60', dot: 'bg-amber-500', label: 'Stock faible', text: 'text-amber-600', row: 'border-l-[3px] border-l-amber-400' },
  medium: { badge: 'bg-yellow-50 text-yellow-700 border-yellow-200/60', dot: 'bg-yellow-500', label: 'Stock moyen', text: 'text-yellow-600' },
  good: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', dot: 'bg-emerald-500', label: 'Stock OK', text: 'text-emerald-600' },
};

const productTypeBadge: Record<string, string> = {
  beton: 'bg-orange-50 text-orange-700 border-orange-200/60',
  carriere: 'bg-amber-50 text-amber-700 border-amber-200/60',
  autre: 'bg-gray-50 text-gray-500 border-gray-200/60',
};

const productTypeAvatarGradient: Record<string, string> = {
  beton: 'from-orange-500 to-indigo-600',
  carriere: 'from-amber-500 to-orange-600',
  autre: 'from-gray-400 to-slate-500',
};

export const InventoryList: React.FC<InventoryListProps> = ({ onCreateProduct, onEditProduct, onRestockProduct }) => {
  const { products, loading, refreshProducts } = useDataContext();

  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showMovements, setShowMovements] = useState(false);
  const [selectedProductForMovements, setSelectedProductForMovements] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [initResult, setInitResult] = useState<{ success: boolean; message: string } | null>(null);

  // Helpers
  const getStock = (p: Product) => Number(p.stock ?? p.inventory?.quantity ?? 0) || 0;
  const getMinStock = (p: Product) => Number(p.minStock ?? p.min_stock ?? p.inventory?.min_stock_level ?? 0) || 0;
  const getPrice = (p: Product) => Number(p.price ?? p.selling_price ?? 0) || 0;
  const getCostPrice = (p: Product) => Number(p.cost_price ?? (getPrice(p) * 0.8)) || 0;
  const getCategoryName = (p: Product) => {
    if (typeof p.category === 'object' && p.category?.name) return p.category.name;
    return '';
  };
  const getProductType = (p: Product) => p.productType || p.product_type || 'autre';

  const getStockStatus = useCallback((p: Product): StockStatus => {
    const stock = getStock(p);
    const min = getMinStock(p);
    if (stock === 0) return 'out';
    if (min > 0 && stock <= min) return 'low';
    if (min > 0 && stock <= min * 2) return 'medium';
    return 'good';
  }, []);

  const formatMoney = (v: number) => v.toLocaleString('fr-FR') + ' FCFA';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // Categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      const name = getCategoryName(p);
      if (name) cats.add(name);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Stats
  const stats = useMemo(() => {
    let totalValue = 0, totalStock = 0, lowStockCount = 0, outOfStockCount = 0;
    products.forEach(p => {
      const stock = getStock(p);
      totalStock += stock;
      totalValue += stock * getCostPrice(p);
      const status = getStockStatus(p);
      if (status === 'low' || status === 'medium') lowStockCount++;
      if (status === 'out') outOfStockCount++;
    });
    return { totalProducts: products.length, totalValue, totalStock, lowStockCount, outOfStockCount };
  }, [products, getStockStatus]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        getCategoryName(p).toLowerCase().includes(term)
      );
    }
    if (categoryFilter !== 'all') {
      result = result.filter(p => getCategoryName(p) === categoryFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter(p => getProductType(p) === typeFilter);
    }
    if (stockFilter !== 'all') {
      result = result.filter(p => {
        const status = getStockStatus(p);
        if (stockFilter === 'good') return status === 'good';
        if (stockFilter === 'medium') return status === 'medium';
        if (stockFilter === 'low') return status === 'low' || status === 'out';
        return true;
      });
    }
    return result;
  }, [products, searchTerm, categoryFilter, typeFilter, stockFilter, getStockStatus]);

  const lowStockProducts = useMemo(() => products.filter(p => {
    const s = getStockStatus(p);
    return s === 'low' || s === 'out';
  }), [products, getStockStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Delete
  const handleDelete = (product: Product) => {
    setConfirmDelete(product);
    setDeleteError('');
  };

  const confirmDeleteProduct = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await productsAPI.delete(confirmDelete.id);
      await refreshProducts();
      setConfirmDelete(null);
    } catch (e: any) {
      setDeleteError(e?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Movements
  const handleViewMovements = async (product: Product) => {
    setSelectedProductForMovements(product);
    setShowMovements(true);
    setMovementsLoading(true);
    try {
      const result = await productsAPI.getMovements(product.id, 50);
      if (result.success) {
        setMovements(result.data.movements || []);
      }
    } catch (e) {
      console.error('Erreur chargement mouvements:', e);
    } finally {
      setMovementsLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['N°', 'Nom', 'Catégorie', 'Type', 'SKU', 'Prix Vente (FCFA)', 'Prix Achat (FCFA)', 'Stock', 'Stock Min', 'Unité', 'Statut', 'Valeur Stock (FCFA)'];
    const csvData = filteredProducts.map((p, i) => [
      i + 1, p.name, getCategoryName(p), getProductType(p), p.sku || '',
      getPrice(p), p.cost_price || '', getStock(p), getMinStock(p), p.unit || 'm³',
      stockStatusStyles[getStockStatus(p)].label,
      getCostPrice(p) * getStock(p)
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventaire_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Initialisation des produits par défaut
  const handleInitialize = async () => {
    setInitLoading(true);
    setInitResult(null);
    try {
      const result = await productsAPI.initialize();
      if (result.success) {
        setInitResult({ success: true, message: result.message || 'Produits initialisés avec succès' });
        await refreshProducts();
      } else {
        setInitResult({ success: false, message: result.error || 'Erreur lors de l\'initialisation' });
      }
    } catch (e: any) {
      setInitResult({ success: false, message: e.message || 'Erreur lors de l\'initialisation' });
    } finally {
      setInitLoading(false);
    }
  };

  // Tabs config
  const tabs = [
    { id: 'products' as TabType, label: 'Produits', icon: Package, count: products.length },
    { id: 'movements' as TabType, label: 'Mouvements', icon: History, count: null },
    { id: 'init' as TabType, label: 'Initialisation', icon: Zap, count: null },
  ];

  // Filter buttons config
  const stockFilterBtns = [
    { value: 'all', label: 'Tous', active: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200/30' },
    { value: 'good', label: 'OK', active: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/30' },
    { value: 'medium', label: 'Moyen', active: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-md shadow-yellow-200/30' },
    { value: 'low', label: 'Faible', active: 'bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-md shadow-red-200/30' },
  ];

  const typeFilterBtns = [
    { value: 'all', label: 'Tous Types', active: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200/30' },
    { value: 'beton', label: 'Béton', active: 'bg-gradient-to-r from-orange-500 to-indigo-500 text-white shadow-md shadow-orange-200/30' },
    { value: 'carriere', label: 'Carrière', active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/30' },
    { value: 'autre', label: 'Autre', active: 'bg-gradient-to-r from-gray-400 to-slate-500 text-white shadow-md shadow-gray-200/30' },
  ];

  // KPI config
  const kpis = [
    {
      label: 'Produits', value: stats.totalProducts.toString(), sub: 'Produits actifs',
      icon: Layers, fill: 'bg-gradient-to-br from-orange-50/70 to-indigo-50/40', border: 'border-l-orange-400',
      iconBg: 'bg-orange-100', iconClr: 'text-orange-600', ring: 'border-orange-200/50', valClr: 'text-gray-900'
    },
    {
      label: 'Valeur Stock', value: formatMoney(stats.totalValue), sub: 'Valorisation au coût',
      icon: DollarSign, fill: 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40', border: 'border-l-emerald-400',
      iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', ring: 'border-emerald-200/50', valClr: 'text-emerald-700'
    },
    {
      label: 'Unités en Stock', value: stats.totalStock.toLocaleString('fr-FR'), sub: 'Total unités',
      icon: Archive, fill: 'bg-gradient-to-br from-violet-50/70 to-purple-50/40', border: 'border-l-violet-400',
      iconBg: 'bg-violet-100', iconClr: 'text-violet-600', ring: 'border-violet-200/50', valClr: 'text-gray-900'
    },
    {
      label: 'Alertes Stock', value: (stats.lowStockCount + stats.outOfStockCount).toString(), sub: `${stats.outOfStockCount} en rupture · ${stats.lowStockCount} faible`,
      icon: AlertTriangle,
      fill: (stats.lowStockCount + stats.outOfStockCount) > 0 ? 'bg-gradient-to-br from-red-50/70 to-rose-50/40' : 'bg-gradient-to-br from-gray-50/70 to-slate-50/40',
      border: (stats.lowStockCount + stats.outOfStockCount) > 0 ? 'border-l-red-400' : 'border-l-gray-300',
      iconBg: (stats.lowStockCount + stats.outOfStockCount) > 0 ? 'bg-red-100' : 'bg-gray-100',
      iconClr: (stats.lowStockCount + stats.outOfStockCount) > 0 ? 'text-red-600' : 'text-gray-500',
      ring: (stats.lowStockCount + stats.outOfStockCount) > 0 ? 'border-red-200/50' : 'border-gray-200/50',
      valClr: (stats.lowStockCount + stats.outOfStockCount) > 0 ? 'text-red-700' : 'text-gray-900'
    },
  ];

  return (
    <div className="space-y-5">

      {/* ── Delete Confirmation Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-red-400 via-rose-400 to-pink-400" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-rose-100 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Supprimer ce produit ?</h3>
                  <p className="text-sm text-gray-500">Cette action est irréversible</p>
                </div>
              </div>
              <div className="bg-red-50/50 rounded-xl p-3 border border-red-100/60 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>{confirmDelete.name}</strong>
                  {confirmDelete.sku && <span className="text-gray-400 ml-2">({confirmDelete.sku})</span>}
                </p>
                <p className="text-xs text-gray-400 mt-1">Stock: {getStock(confirmDelete)} {confirmDelete.unit || 'm³'} · Valeur: {formatMoney(getStock(confirmDelete) * getCostPrice(confirmDelete))}</p>
              </div>
              {deleteError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200/60 rounded-lg text-xs text-red-700">{deleteError}</div>
              )}
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200/60 rounded-xl hover:bg-gray-100 transition-colors">
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteProduct}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 rounded-xl hover:from-red-600 hover:to-rose-700 disabled:opacity-50 transition-all shadow-md shadow-red-200/30"
                >
                  {deleteLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock Movements Modal ── */}
      {showMovements && selectedProductForMovements && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-200/30">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Historique des Mouvements</h3>
                  <p className="text-[11px] text-gray-400">{selectedProductForMovements.name}</p>
                </div>
              </div>
              <button onClick={() => { setShowMovements(false); setSelectedProductForMovements(null); }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {movementsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-violet-100 border-t-violet-500 rounded-full animate-spin" />
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl flex items-center justify-center ring-1 ring-violet-100/50 mx-auto">
                    <Clock className="w-6 h-6 text-violet-400" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-700 mt-4">Aucun mouvement enregistré</h4>
                  <p className="text-xs text-gray-400 mt-1">L'historique des mouvements de stock apparaîtra ici</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {movements.map((m) => {
                    const isIn = m.movement_type === 'in';
                    const isAdj = m.movement_type === 'adjustment';
                    return (
                      <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100/80 hover:border-gray-200 transition-colors">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isIn ? 'bg-emerald-50' : isAdj ? 'bg-amber-50' : 'bg-red-50'}`}>
                          {isIn ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : isAdj ? <Settings2 className="w-4 h-4 text-amber-600" /> : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${isIn ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : isAdj ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 'bg-red-50 text-red-700 border-red-200/60'}`}>
                                {isIn ? 'Entrée' : isAdj ? 'Ajustement' : 'Sortie'}
                              </span>
                              <span className={`text-sm font-bold ${isIn ? 'text-emerald-600' : isAdj ? 'text-amber-600' : 'text-red-600'}`}>
                                {isIn ? '+' : isAdj ? '±' : '-'}{m.quantity} {selectedProductForMovements.unit || 'm³'}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">{formatDate(m.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {m.previous_stock != null && m.new_stock != null && (
                              <span className="text-[10px] text-gray-500">{m.previous_stock} → {m.new_stock}</span>
                            )}
                            {m.supplier_name && <span className="text-[10px] text-gray-400">· {m.supplier_name}</span>}
                            {m.unit_cost && <span className="text-[10px] text-gray-400">· {Number(m.unit_cost).toLocaleString('fr-FR')} FCFA/u</span>}
                            {m.notes && <span className="text-[10px] text-gray-400">· {m.notes}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header Card with Tabs ── */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(139,92,246,0.08)] overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 absolute top-0 left-0" />
        <div className="p-5 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200/40">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Stock & Inventaire</h1>
                <p className="text-sm text-gray-400 mt-0.5">Gestion des produits et du stock — {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            {activeTab === 'products' && (
              <div className="flex items-center gap-2.5">
                <button onClick={() => refreshProducts()} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                  <RefreshCw className="w-4 h-4" />Actualiser
                </button>
                <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                  <Download className="w-4 h-4" />CSV
                </button>
                <button onClick={onCreateProduct} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-md shadow-violet-200/30">
                  <Plus className="w-4 h-4" />Nouveau Produit
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-5 border-b border-gray-100 -mx-5 px-5">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all relative ${
                    isActive
                      ? 'text-violet-700'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== null && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${isActive ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-600 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'movements' ? (
        <StockMovementsTab />
      ) : activeTab === 'init' ? (
        /* ── Initialisation Tab ── */
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200/40">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Initialisation du Catalogue</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Créez automatiquement les produits Béton et Carrière standard</p>
                </div>
              </div>

              {initResult && (
                <div className={`mb-5 p-4 rounded-xl border ${initResult.success ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-800' : 'bg-red-50/60 border-red-200/60 text-red-800'}`}>
                  <p className="text-sm font-medium">{initResult.message}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-orange-50/60 to-indigo-50/30 rounded-xl border border-orange-200/40 p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-orange-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">Produits Béton</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-orange-100/50">
                      <span className="text-sm text-gray-700 font-medium">Béton 3/8</span>
                      <span className="text-sm font-bold text-orange-600">70 000 FCFA/m³</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-orange-100/50">
                      <span className="text-sm text-gray-700 font-medium">Béton 8/16</span>
                      <span className="text-sm font-bold text-orange-600">65 000 FCFA/m³</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/30 rounded-xl border border-amber-200/40 p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Layers className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">Produits Carrière</h3>
                  </div>
                  <div className="space-y-2">
                    {['Gravier 5/15', 'Gravier 15/25', 'Sable fin', 'Sable grossier', 'Tout-venant', 'Latérite', 'Basalte'].map(v => (
                      <div key={v} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-amber-100/50">
                        <span className="text-sm text-gray-700 font-medium">{v}</span>
                        <span className="text-xs text-amber-600 font-bold">Carrière</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleInitialize}
                  disabled={initLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md shadow-violet-200/30"
                >
                  {initLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {initLoading ? 'Initialisation...' : 'Initialiser les Produits'}
                </button>
                <p className="text-xs text-gray-400">Les produits existants ne seront pas dupliqués</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Products Tab ── */
        <>
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`rounded-xl ${kpi.fill} border-l-4 ${kpi.border} border ${kpi.ring} p-4 shadow-sm hover:shadow-md transition-all duration-200`}>
              <div className="flex items-start justify-between mb-2">
                <div className={`w-10 h-10 ${kpi.iconBg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.iconClr}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${kpi.valClr} leading-tight`}>{kpi.value}</p>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1">{kpi.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Low Stock Alert ── */}
      {lowStockProducts.length > 0 && (
        <div className="bg-gradient-to-br from-red-50/60 to-rose-50/30 border border-red-200/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="font-bold text-red-800 text-sm">{lowStockProducts.length} produit(s) en alerte stock</h3>
            <span className="px-2.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm">{lowStockProducts.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.slice(0, 6).map(p => (
              <button
                key={p.id}
                onClick={() => onRestockProduct(p)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 border border-red-200/60 rounded-lg text-xs font-medium text-red-700 hover:bg-red-100/60 transition-all shadow-sm"
              >
                <RotateCcw className="w-3 h-3" />
                {p.name} <span className="text-red-500 font-bold">({getStock(p)} {p.unit || 'm³'})</span>
              </button>
            ))}
            {lowStockProducts.length > 6 && (
              <span className="flex items-center px-3 py-1.5 text-xs text-red-500 font-medium">+{lowStockProducts.length - 6} autre(s)</span>
            )}
          </div>
        </div>
      )}

      {/* ── Search & Filters ── */}
      <div className="bg-white rounded-xl border border-gray-100/80 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit, SKU, catégorie..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-800 bg-white/80 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/25 focus:border-violet-300 hover:border-gray-300 transition-all shadow-sm shadow-gray-100/50"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="px-3.5 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/25 focus:border-violet-300 transition-all shadow-sm"
            >
              <option value="all">Toutes catégories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mr-1">Stock:</span>
            {stockFilterBtns.map(btn => (
              <button
                key={btn.value}
                onClick={() => { setStockFilter(btn.value); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  stockFilter === btn.value ? btn.active : 'bg-gray-50 text-gray-500 border border-gray-200/60 hover:bg-gray-100'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mr-1">Type:</span>
            {typeFilterBtns.map(btn => (
              <button
                key={btn.value}
                onClick={() => { setTypeFilter(btn.value); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  typeFilter === btn.value ? btn.active : 'bg-gray-50 text-gray-500 border border-gray-200/60 hover:bg-gray-100'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto flex items-center">
            <span className="px-3 py-1.5 bg-violet-50/60 border border-violet-200/50 rounded-xl text-sm font-bold text-violet-700">
              {filteredProducts.length} produit(s)
            </span>
          </div>
        </div>
      </div>

      {/* ── Products Table ── */}
      <div className="bg-white rounded-xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(139,92,246,0.06)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg flex items-center justify-center border border-violet-200/40">
              <Package className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Liste des Produits</h3>
              <p className="text-[11px] text-gray-400">Inventaire Allo Béton</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-violet-100 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-4">Chargement des produits...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl flex items-center justify-center ring-1 ring-violet-100/50">
              <Package className="w-7 h-7 text-violet-400" />
            </div>
            <h4 className="text-sm font-bold text-gray-700 mt-4">Aucun produit trouvé</h4>
            <p className="text-xs text-gray-400 mt-1">
              {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all' || typeFilter !== 'all'
                ? 'Modifiez vos filtres de recherche'
                : 'Commencez par ajouter votre premier produit'}
            </p>
            {!searchTerm && categoryFilter === 'all' && stockFilter === 'all' && typeFilter === 'all' && (
              <button onClick={onCreateProduct} className="mt-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-xs font-bold hover:from-violet-600 hover:to-purple-700 transition-all shadow-md shadow-violet-200/30">
                <Plus className="w-3.5 h-3.5" />Nouveau Produit
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200/60">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Produit</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Prix Vente</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Valeur</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedProducts.map((product, index) => {
                    const status = getStockStatus(product);
                    const style = stockStatusStyles[status];
                    const stock = getStock(product);
                    const minStk = getMinStock(product);
                    const price = getPrice(product);
                    const pType = getProductType(product);
                    const stockPercent = minStk > 0 ? Math.min(100, (stock / (minStk * 3)) * 100) : (stock > 0 ? 100 : 0);
                    const avatarGradient = productTypeAvatarGradient[pType] || productTypeAvatarGradient.autre;

                    return (
                      <tr key={product.id} className={`hover:bg-gray-50/60 transition-colors ${style.row || ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] text-gray-300 font-medium w-5 text-right">
                              {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                            </span>
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                              <span className="text-white text-xs font-bold">{(product.name || 'P')[0].toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-gray-800 text-sm block truncate">{product.name}</span>
                              <div className="flex items-center gap-1.5">
                                {product.sku && <span className="text-[10px] text-gray-400">{product.sku}</span>}
                                {getCategoryName(product) && <span className="text-[10px] text-gray-300">· {getCategoryName(product)}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${productTypeBadge[pType] || productTypeBadge.autre}`}>
                            {pType === 'beton' ? 'Béton' : pType === 'carriere' ? 'Carrière' : 'Autre'}
                          </span>
                          {product.variant && <p className="text-[10px] text-gray-400 mt-0.5">{product.variant}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-gray-900">{price.toLocaleString('fr-FR')}</span>
                          <p className="text-[10px] text-gray-400">FCFA/{product.unit || 'm³'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-center">
                            <span className={`font-bold ${style.text}`}>{stock}</span>
                            <span className="text-[10px] text-gray-400 ml-1">{product.unit || 'm³'}</span>
                            {minStk > 0 && (
                              <p className="text-[10px] text-gray-400">Min: {minStk}</p>
                            )}
                          </div>
                          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                status === 'out' ? 'bg-red-400' :
                                status === 'low' ? 'bg-gradient-to-r from-amber-400 to-orange-400' :
                                status === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-amber-400' :
                                'bg-gradient-to-r from-emerald-400 to-teal-500'
                              }`}
                              style={{ width: `${stockPercent}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full border ${style.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {style.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-emerald-700">{(getCostPrice(product) * stock).toLocaleString('fr-FR')}</span>
                          <p className="text-[10px] text-gray-400">FCFA</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleViewMovements(product)} title="Historique" className="w-7 h-7 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 flex items-center justify-center transition-all">
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onEditProduct(product)} title="Modifier" className="w-7 h-7 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-all">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onRestockProduct(product)} title="Réapprovisionner" className="w-7 h-7 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-all">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(product)} title="Supprimer" className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50/50 to-slate-50/30 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <strong>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredProducts.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</strong> sur <strong>{filteredProducts.length}</strong>
                {' '}· Valeur page: <strong className="text-violet-700">
                  {paginatedProducts.reduce((acc, p) => acc + getCostPrice(p) * getStock(p), 0).toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-all">
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1.5 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200/50 rounded-lg">
                    {currentPage} / {totalPages}
                  </span>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-all">
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
        </>
      )}
    </div>
  );
};
