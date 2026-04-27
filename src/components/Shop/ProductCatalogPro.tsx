/**
 * ALLO BETON - CATALOGUE PRODUITS - Modern Clean Design 2026
 * Search, category filter, sort, pagination, grid/list toggle, quick view modal
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, SlidersHorizontal, Grid3X3, List, X,
  ShoppingCart, Package, Eye, ChevronLeft, ChevronRight,
  Filter, Tag, Minus, Plus, ArrowRight, CheckCircle, Scale,
} from 'lucide-react';
import { productsAPI, Product, Category } from '../../services/ecommerce-api';
import { useEcommerce } from '../../contexts/EcommerceContext';
import { useToast } from './Toast';

type View = 'home' | 'catalog' | 'product' | 'cart' | 'checkout' | 'success' | 'login' | 'dashboard';

interface Props {
  onNavigate: (view: View, data?: any) => void;
  initialCategoryId?: string;
  initialSearch?: string;
}

/* ------------------------------------------------------------------ */
/*  GRID CARD                                                         */
/* ------------------------------------------------------------------ */
const GridCard: React.FC<{
  product: Product;
  onNavigate: (v: View, d?: any) => void;
  formatPrice: (n: number) => string;
  onAddToCart: (id: string) => void;
  adding: string | null;
  onQuickView: (p: Product) => void;
  onToggleCompare?: (p: Product) => void;
  isComparing?: boolean;
}> = ({ product, onNavigate, formatPrice, onAddToCart, adding, onQuickView, onToggleCompare, isComparing }) => {
  const discount =
    product.compare_price && product.compare_price > product.price
      ? Math.round((1 - product.price / product.compare_price) * 100)
      : null;

  return (
    <div
      className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-lg"
    >
      {/* Image area */}
      <div
        className="relative aspect-[4/3] bg-gray-100 overflow-hidden cursor-pointer"
        onClick={() => onNavigate('product', { id: product.slug || product.id })}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <Package className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Discount badge */}
        {discount && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-red-500 text-white text-[11px] font-bold rounded-lg">
            -{discount}%
          </span>
        )}

        {/* Quick view button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickView(product);
          }}
          className="absolute top-3 right-3 w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-md opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-gray-50"
        >
          <Eye className="w-4 h-4 text-gray-600" />
        </button>

        {/* #10 Compare checkbox */}
        {onToggleCompare && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCompare(product); }}
            className={`absolute top-3 right-14 w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 hover:bg-gray-50 ${
              isComparing ? 'bg-orange-600 opacity-100' : 'bg-white opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
            }`}
            title="Comparer"
          >
            <Scale className={`w-4 h-4 ${isComparing ? 'text-white' : 'text-gray-600'}`} />
          </button>
        )}

        {/* Hover add-to-cart button */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product.id);
            }}
            disabled={adding === product.id || product.stock_status === 'out_of_stock'}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {adding === product.id ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                Ajouter
              </>
            )}
          </button>
        </div>
      </div>

      {/* Card body */}
      <div
        className="p-4 flex flex-col flex-1 cursor-pointer"
        onClick={() => onNavigate('product', { id: product.slug || product.id })}
      >
        {product.category_name && (
          <p className="text-xs font-medium text-orange-600 mb-1">{product.category_name}</p>
        )}

        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-auto">
          {product.name}
        </h3>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-extrabold text-gray-900 leading-none">
                {formatPrice(product.price)}
              </p>
              {product.compare_price && product.compare_price > product.price && (
                <p className="text-xs text-gray-400 line-through mt-0.5">
                  {formatPrice(product.compare_price)}
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-0.5">/ {product.unit}</p>
            </div>

            {/* Stock indicator */}
            {product.stock_status === 'out_of_stock' ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Rupture
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                En stock
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  LIST CARD                                                         */
/* ------------------------------------------------------------------ */
const ListCard: React.FC<{
  product: Product;
  onNavigate: (v: View, d?: any) => void;
  formatPrice: (n: number) => string;
  onAddToCart: (id: string) => void;
  adding: string | null;
}> = ({ product, onNavigate, formatPrice, onAddToCart, adding }) => {
  const discount =
    product.compare_price && product.compare_price > product.price
      ? Math.round((1 - product.price / product.compare_price) * 100)
      : null;

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col sm:flex-row transition-shadow duration-300 hover:shadow-lg cursor-pointer"
      onClick={() => onNavigate('product', { id: product.slug || product.id })}
    >
      {/* Image */}
      <div className="sm:w-52 md:w-60 aspect-[4/3] sm:aspect-auto bg-gray-100 overflow-hidden flex-shrink-0 relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
        )}
        {discount && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-red-500 text-white text-[11px] font-bold rounded-lg">
            -{discount}%
          </span>
        )}
      </div>

      {/* Info center */}
      <div className="flex-1 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          {product.category_name && (
            <p className="text-xs font-medium text-orange-600 mb-1">{product.category_name}</p>
          )}
          <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1">{product.name}</h3>
          {product.short_description && (
            <p className="text-gray-400 text-xs line-clamp-2">{product.short_description}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {product.stock_status === 'out_of_stock' ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Rupture
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                En stock
              </span>
            )}
            <span className="text-[11px] text-gray-400">/ {product.unit}</span>
          </div>
        </div>

        {/* Price + button right */}
        <div className="flex sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xl font-extrabold text-gray-900">{formatPrice(product.price)}</p>
            {product.compare_price && product.compare_price > product.price && (
              <p className="text-xs text-gray-400 line-through">{formatPrice(product.compare_price)}</p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product.id);
            }}
            disabled={adding === product.id || product.stock_status === 'out_of_stock'}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {adding === product.id ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                Ajouter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  QUICK VIEW MODAL                                                  */
/* ------------------------------------------------------------------ */
const QuickViewModal: React.FC<{
  product: Product;
  formatPrice: (n: number) => string;
  onClose: () => void;
  onNavigate: (v: View, d?: any) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  onAddToCart: (id: string, qty?: number) => void;
  adding: string | null;
}> = ({ product, formatPrice, onClose, onNavigate, quantity, setQuantity, onAddToCart, adding }) => {
  const discount =
    product.compare_price && product.compare_price > product.price
      ? Math.round((1 - product.price / product.compare_price) * 100)
      : null;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Image left */}
          <div className="aspect-square bg-gray-100 overflow-hidden md:rounded-l-2xl">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <Package className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>

          {/* Info right */}
          <div className="p-6 sm:p-8 flex flex-col">
            {product.category_name && (
              <p className="text-xs font-medium text-orange-600 mb-2">{product.category_name}</p>
            )}

            <h2 className="text-xl font-extrabold text-gray-900 mb-2">{product.name}</h2>

            {product.short_description && (
              <p className="text-gray-500 text-sm mb-4 line-clamp-3">{product.short_description}</p>
            )}

            {/* Stock */}
            <div className="mb-4">
              {product.stock_status === 'out_of_stock' ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Rupture de stock
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  En stock
                </span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-2xl font-extrabold text-gray-900">
                {formatPrice(product.price)}
              </span>
              {product.compare_price && product.compare_price > product.price && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(product.compare_price)}
                </span>
              )}
              {discount && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-[11px] font-bold rounded-md">
                  -{discount}%
                </span>
              )}
            </div>

            {product.unit && (
              <p className="text-xs text-gray-400 mb-4">
                Prix par {product.unit}
              </p>
            )}

            {/* Quantity selector */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm font-semibold text-gray-700">Quantite :</span>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <Minus className="w-4 h-4 text-gray-500" />
                </button>
                <span className="w-12 text-center font-bold text-sm text-gray-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-3">
              <button
                onClick={() => onAddToCart(product.id, quantity)}
                disabled={adding === product.id || product.stock_status === 'out_of_stock'}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {adding === product.id ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Ajouter au panier
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  onClose();
                  onNavigate('product', { id: product.slug || product.id });
                }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Voir les details
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================================================================== */
/*  MAIN COMPONENT                                                    */
/* ================================================================== */
export const ProductCatalogPro: React.FC<Props> = ({
  onNavigate: rawOnNavigate,
  initialCategoryId,
  initialSearch,
}) => {
  const { addToCart, formatPrice } = useEcommerce();
  const { toast } = useToast();

  /* --- State --- */
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  /* Restauration de l'état si retour récent depuis une fiche produit */
  const restored = (() => {
    if (initialSearch || initialCategoryId) return null;
    try {
      const raw = sessionStorage.getItem('allo_catalog_state');
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (Date.now() - (s.savedAt || 0) > 30 * 60 * 1000) return null; // 30 min
      return s;
    } catch { return null; }
  })();

  // Filters
  const [searchTerm, setSearchTerm] = useState(initialSearch || restored?.searchTerm || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId || restored?.selectedCategory || '');
  const [sort, setSort] = useState(restored?.sort || 'name_asc');
  const [inStockOnly, setInStockOnly] = useState(restored?.inStockOnly || false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(restored?.viewMode || 'grid');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(restored?.page || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Quick View
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [qvQuantity, setQvQuantity] = useState(1);

  // #10 Compare
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // #15 Price range
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000000);

  // #16 Infinite scroll
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search debounce
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch || '');

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchTerm]);

  /* --- Data loading --- */
  useEffect(() => {
    loadCategories();
  }, []);

  /* Sauvegarde de l'état avant de quitter (vers fiche produit) + scroll restore */
  useEffect(() => {
    if (restored?.scrollY && !loading) {
      // Restore scroll après le 1er render des produits
      const t = setTimeout(() => window.scrollTo({ top: restored.scrollY, behavior: 'auto' }), 50);
      return () => clearTimeout(t);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Wrapper de la prop onNavigate : persiste l'état du catalogue avant d'ouvrir une fiche produit */
  const onNavigate = (view: View, data?: any) => {
    if (view === 'product') {
      try {
        sessionStorage.setItem('allo_catalog_state', JSON.stringify({
          searchTerm, selectedCategory, sort, inStockOnly, viewMode, page,
          scrollY: window.scrollY,
          savedAt: Date.now(),
        }));
      } catch { /* silent */ }
    } else if (view === 'catalog') {
      try { sessionStorage.removeItem('allo_catalog_state'); } catch { /* */ }
    }
    rawOnNavigate(view, data);
  };

  useEffect(() => {
    setPage(1);
    setAllProducts([]);
    setHasMore(true);
  }, [debouncedSearch, selectedCategory, sort, inStockOnly, priceMin, priceMax]);

  useEffect(() => {
    loadProducts();
  }, [page, debouncedSearch, selectedCategory, sort, inStockOnly]);

  const loadCategories = async () => {
    try {
      const res = await productsAPI.getCategories();
      setCategories(res?.data || res || []);
    } catch {
      /* ignored */
    }
  };

  const loadProducts = async () => {
    try {
      if (page === 1) setLoading(true); else setLoadingMore(true);
      const [sortField, sortDir] = sort.split('_');
      const params: any = { page, limit: 12, sort: sortField, order: sortDir };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedCategory) params.category = selectedCategory;
      if (inStockOnly) params.in_stock = true;
      const res = await productsAPI.getAll(params);
      const data = res?.data || res;
      const newProducts = data?.products || data || [];
      // Apply client-side price filter
      const filtered = newProducts.filter((p: Product) => p.price >= priceMin && p.price <= priceMax);
      if (page === 1) {
        setAllProducts(filtered);
        setProducts(filtered);
      } else {
        setAllProducts(prev => [...prev, ...filtered]);
        setProducts(prev => [...prev, ...filtered]);
      }
      setTotalPages(data?.pagination?.totalPages || 1);
      setTotalProducts(data?.pagination?.total || 0);
      setHasMore(page < (data?.pagination?.totalPages || 1));
    } catch {
      /* ignored */
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // #16 Infinite scroll observer
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
        setPage((p: number) => p + 1);
      }
    }, { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  // #10 Compare toggle
  const toggleCompare = (product: Product) => {
    setCompareList(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      if (prev.length >= 3) return prev;
      return [...prev, product];
    });
  };

  const handleAddToCart = useCallback(
    async (productId: string, qty = 1) => {
      const product = products.find(p => p.id === productId);
      try {
        setAddingToCart(productId);
        await addToCart(productId, qty);
        toast.success(
          product ? `${product.name} ajouté au panier` : 'Produit ajouté au panier',
          {
            description: qty > 1 ? `${qty} unités · ${formatPrice((product?.price || 0) * qty)}` : undefined,
            duration: 3500,
            id: `add-${productId}`,
          }
        );
      } catch (e: any) {
        toast.error('Impossible d\'ajouter au panier', {
          description: e?.message || 'Veuillez réessayer.',
          duration: 5000,
        });
      } finally {
        setTimeout(() => setAddingToCart(null), 400);
      }
    },
    [addToCart, products, toast, formatPrice]
  );

  const activeFilterCount = [
    selectedCategory ? true : false,
    inStockOnly,
    debouncedSearch ? true : false,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setInStockOnly(false);
    setSort('name_asc');
  };

  /* --- Active filter tags --- */
  const activeFilterTags: { label: string; onRemove: () => void }[] = [];
  if (selectedCategory) {
    const cat = categories.find((c) => String(c.id) === String(selectedCategory));
    if (cat) {
      activeFilterTags.push({
        label: cat.name,
        onRemove: () => setSelectedCategory(''),
      });
    }
  }
  if (inStockOnly) {
    activeFilterTags.push({
      label: 'En stock',
      onRemove: () => setInStockOnly(false),
    });
  }
  if (debouncedSearch) {
    activeFilterTags.push({
      label: `"${debouncedSearch}"`,
      onRemove: () => setSearchTerm(''),
    });
  }

  /* --- Pagination helper --- */
  const getPaginationPages = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============================================================ */}
      {/*  HEADER - slate-900 gradient                                 */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-white transition-colors"
            >
              Accueil
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-medium">Catalogue</span>
          </div>

          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Catalogue
              </h1>
              {totalProducts > 0 && (
                <p className="text-slate-400 text-sm mt-1">
                  {totalProducts} produit{totalProducts > 1 ? 's' : ''} disponible
                  {totalProducts > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Search bar */}
            <div className="w-full sm:w-96">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="w-full pl-11 pr-10 py-3 bg-transparent border border-white/20 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-white/50 transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  FILTER BAR - white                                          */}
      {/* ============================================================ */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left: filter button + category pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  showFilters
                    ? 'bg-slate-50 text-orange-700 border-slate-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtres
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="w-px h-6 bg-gray-200 flex-shrink-0 hidden md:block" />

              {/* Category pills */}
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    !selectedCategory
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tout
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      setSelectedCategory(
                        String(c.id) === selectedCategory ? '' : String(c.id)
                      )
                    }
                    className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      String(c.id) === selectedCategory
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: sort + view toggle */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-300 cursor-pointer"
              >
                <option value="name_asc">A - Z</option>
                <option value="name_desc">Z - A</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix decroissant</option>
                <option value="created_at_desc">Plus recent</option>
              </select>

              <div className="hidden sm:flex items-center bg-gray-100 rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ACTIVE FILTER TAGS                                          */}
      {/* ============================================================ */}
      {activeFilterTags.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            {activeFilterTags.map((tag) => (
              <span
                key={tag.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-orange-800 text-xs font-medium rounded-lg border border-slate-100"
              >
                <Tag className="w-3 h-3" />
                {tag.label}
                <button
                  onClick={tag.onRemove}
                  className="ml-0.5 hover:text-orange-900 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Tout effacer
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  MAIN CONTENT AREA                                           */}
      {/* ============================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* -------------------------------------------------------- */}
          {/*  SIDEBAR FILTERS                                         */}
          {/* -------------------------------------------------------- */}
          {/* Mobile bottom-sheet (filtres) */}
          {showFilters && (
            <div className="md:hidden fixed inset-0 z-[55]" role="dialog" aria-label="Filtres">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setShowFilters(false)} />
              <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Handle */}
                <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
                  <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
                  <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-orange-600" />
                    Filtres
                    {activeFilterCount > 0 && (
                      <span className="w-5 h-5 bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </h3>
                  <button onClick={() => setShowFilters(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Fermer">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                {/* Body scrollable */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Catégories */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Catégories</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory('')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          !selectedCategory ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Tout
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCategory(String(c.id) === selectedCategory ? '' : String(c.id))}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            String(c.id) === selectedCategory ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Disponibilité */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Disponibilité</p>
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        inStockOnly ? 'bg-orange-600 border-orange-600' : 'border-gray-300'
                      }`}>
                        {inStockOnly && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <input type="checkbox" className="sr-only" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                      <span className="text-sm text-gray-700 font-medium">En stock uniquement</span>
                    </label>
                  </div>

                  {/* Prix */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Fourchette de prix</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={priceMin || ''}
                          onChange={e => setPriceMin(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                        />
                        <span className="text-gray-300 text-xs font-bold">—</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={priceMax >= 1000000 ? '' : priceMax}
                          onChange={e => setPriceMax(parseInt(e.target.value) || 1000000)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={500000}
                        step={5000}
                        value={priceMax >= 1000000 ? 500000 : priceMax}
                        onChange={e => setPriceMax(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                      />
                    </div>
                  </div>

                  {/* Tri */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Trier par</p>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-orange-500"
                    >
                      <option value="name_asc">Nom A → Z</option>
                      <option value="name_desc">Nom Z → A</option>
                      <option value="price_asc">Prix croissant</option>
                      <option value="price_desc">Prix décroissant</option>
                      <option value="created_at_desc">Plus récents</option>
                    </select>
                  </div>
                </div>
                {/* Footer actions */}
                <div className="flex gap-2 p-4 border-t border-gray-100 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <button
                    onClick={() => { clearFilters(); }}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                  >
                    Réinitialiser
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="flex-[1.5] py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl transition-colors"
                  >
                    Voir {totalProducts > 0 ? `${totalProducts} produit${totalProducts > 1 ? 's' : ''}` : 'résultats'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showFilters && (
            <aside className="hidden md:block w-64 flex-shrink-0 space-y-4">
              {/* Categories */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-orange-600" />
                  Categories
                </h3>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between ${
                      !selectedCategory
                        ? 'bg-slate-50 text-orange-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 font-medium'
                    }`}
                  >
                    Toutes les categories
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        setSelectedCategory(
                          String(c.id) === selectedCategory ? '' : String(c.id)
                        )
                      }
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between ${
                        String(c.id) === selectedCategory
                          ? 'bg-slate-50 text-orange-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 font-medium'
                      }`}
                    >
                      <span>{c.name}</span>
                      {c.product_count !== undefined && (
                        <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                          {c.product_count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock toggle */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Disponibilite</h3>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      inStockOnly
                        ? 'bg-orange-600 border-orange-600'
                        : 'border-gray-300 group-hover:border-gray-400'
                    }`}
                  >
                    {inStockOnly && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-sm text-gray-600 font-medium">En stock uniquement</span>
                </label>
              </div>

              {/* #15 Price range slider */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-600" />
                  Fourchette de prix
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceMin || ''}
                      onChange={e => setPriceMin(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-slate-400 text-xs font-bold">—</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceMax >= 1000000 ? '' : priceMax}
                      onChange={e => setPriceMax(parseInt(e.target.value) || 1000000)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={500000}
                    step={5000}
                    value={priceMax >= 1000000 ? 500000 : priceMax}
                    onChange={e => setPriceMax(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                    <span>0 FCFA</span>
                    <span>500 000+ FCFA</span>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* -------------------------------------------------------- */}
          {/*  PRODUCT AREA                                            */}
          {/* -------------------------------------------------------- */}
          <div className="flex-1 min-w-0">
            {/* Loading skeleton */}
            {loading ? (
              <div
                className={`grid gap-4 ${
                  viewMode === 'grid'
                    ? showFilters
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    : 'grid-cols-1'
                }`}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[4/3] bg-gray-100" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                      <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                      <div className="h-5 bg-gray-100 rounded-full w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              /* Empty state */
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Package className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun produit trouve</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                  Essayez de modifier vos filtres ou d'effectuer une autre recherche.
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                  Reinitialiser les filtres
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid view */
              <div
                className={`grid gap-4 ${
                  showFilters
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                }`}
              >
                {products.map((p) => (
                  <GridCard
                    key={p.id}
                    product={p}
                    onNavigate={onNavigate}
                    formatPrice={formatPrice}
                    onAddToCart={handleAddToCart}
                    adding={addingToCart}
                    onQuickView={setQuickViewProduct}
                    onToggleCompare={toggleCompare}
                    isComparing={!!compareList.find(c => c.id === p.id)}
                  />
                ))}
              </div>
            ) : (
              /* List view */
              <div className="space-y-3">
                {products.map((p) => (
                  <ListCard
                    key={p.id}
                    product={p}
                    onNavigate={onNavigate}
                    formatPrice={formatPrice}
                    onAddToCart={handleAddToCart}
                    adding={addingToCart}
                  />
                ))}
              </div>
            )}

            {/* ====================================================== */}
            {/*  #16 INFINITE SCROLL TRIGGER                            */}
            {/* ====================================================== */}
            {hasMore && !loading && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-10">
                {loadingMore && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-orange-600 rounded-full animate-spin" />
                    <span className="text-sm text-slate-400 font-medium">Chargement...</span>
                  </div>
                )}
              </div>
            )}
            {!hasMore && products.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400 font-medium">✔ Tous les produits sont affich\u00e9s ({products.length})</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  QUICK VIEW MODAL                                            */}
      {/* ============================================================ */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          formatPrice={formatPrice}
          onClose={() => {
            setQuickViewProduct(null);
            setQvQuantity(1);
          }}
          onNavigate={onNavigate}
          quantity={qvQuantity}
          setQuantity={setQvQuantity}
          onAddToCart={handleAddToCart}
          adding={addingToCart}
        />
      )}

      {/* #10 Compare floating bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-orange-500 shadow-2xl shadow-black/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-bold text-slate-800">Comparer ({compareList.length}/3)</span>
              <div className="flex items-center gap-2">
                {compareList.map(cp => (
                  <div key={cp.id} className="relative">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-white">
                      {cp.image_url ? <img src={cp.image_url} alt={cp.name} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-slate-300 m-auto mt-3" />}
                    </div>
                    <button onClick={() => toggleCompare(cp)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCompareList([])} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-600">
                Effacer
              </button>
              <button onClick={() => setShowCompare(true)} disabled={compareList.length < 2}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50">
                Comparer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* #10 Compare modal */}
      {showCompare && compareList.length >= 2 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => setShowCompare(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Scale className="w-5 h-5 text-orange-600" /> Comparatif produits</h3>
              <button onClick={() => setShowCompare(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-2 text-slate-500 font-medium">Crit\u00e8re</th>
                    {compareList.map(cp => (
                      <th key={cp.id} className="py-3 px-2 text-center">
                        <div className="w-20 h-20 rounded-lg overflow-hidden mx-auto mb-2 bg-slate-100">
                          {cp.image_url ? <img src={cp.image_url} alt={cp.name} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-slate-300 mx-auto mt-6" />}
                        </div>
                        <p className="font-bold text-slate-800 text-xs line-clamp-2">{cp.name}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Prix', render: (p: Product) => formatPrice(p.price) },
                    { label: 'Cat\u00e9gorie', render: (p: Product) => p.category_name || '--' },
                    { label: 'Unit\u00e9', render: (p: Product) => p.unit || '--' },
                    { label: 'Stock', render: (p: Product) => p.stock_status === 'out_of_stock' ? '\u274c Rupture' : '\u2705 En stock' },
                    { label: 'Note', render: (p: Product) => `${p.rating_avg?.toFixed(1) || '4.0'}/5 (${p.rating_count || 0} avis)` },
                  ].map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                      <td className="py-3 px-2 font-bold text-slate-700">{row.label}</td>
                      {compareList.map(cp => (
                        <td key={cp.id} className="py-3 px-2 text-center text-slate-600">{row.render(cp)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalogPro;
