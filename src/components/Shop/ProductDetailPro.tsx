/**
 * ALLO BETON -- DETAIL PRODUIT PRO -- MODERN DESIGN 2026
 * Clean, conversion-focused product detail page
 * Image zoom, tabs, trust badges, related products, sticky mobile bar
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight,
  Star,
  ShoppingCart,
  Package,
  Heart,
  Share2,
  Minus,
  Plus,
  Shield,
  Truck,
  Headphones,
  CheckCircle,
  ArrowRight,
  ZoomIn,
  Copy,
  Tag,
  Info,
  MessageSquare,
  ClipboardList,
  ChevronDown,
  MessageCircle,
  Clock,
  Flame,
  TrendingUp,
  Gift,
  Eye,
} from 'lucide-react';
import { productsAPI, Product } from '../../services/ecommerce-api';
import { useEcommerce } from '../../contexts/EcommerceContext';
import { buildWhatsAppLink, buildProductInquiryMessage } from './siteConfig';
import ProductReviews from './ProductReviews';
import PricingTiers from './PricingTiers';

/* ================================================================
   TYPES
   ================================================================ */

type View =
  | 'home'
  | 'catalog'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'success'
  | 'login'
  | 'dashboard';

interface Props {
  productId?: string;
  onNavigate: (view: View, data?: any) => void;
}

/* ================================================================
   useReveal -- Intersection Observer scroll-reveal hook
   ================================================================ */

const useReveal = (threshold = 0.1) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
};

/* ================================================================
   RelatedProductCard -- standalone card to avoid hook-in-loop issues
   ================================================================ */

const RelatedProductCard: React.FC<{
  product: Product;
  index: number;
  onNavigate: (view: View, data?: any) => void;
  formatPrice: (n: number) => string;
}> = ({ product, index, onNavigate, formatPrice }) => {
  const { ref, visible } = useReveal(0.08);
  const [imgLoaded, setImgLoaded] = useState(false);

  const discount =
    product.compare_price && product.compare_price > product.price
      ? Math.round((1 - product.price / product.compare_price) * 100)
      : null;

  return (
    <div
      ref={ref}
      onClick={() => onNavigate('product', { id: product.slug || product.id })}
      className={`
        group bg-white rounded-2xl overflow-hidden border border-slate-100
        hover:border-slate-200 cursor-pointer
        hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]
        transition-all duration-500 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
      `}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Image */}
      <div className="aspect-square bg-slate-50 overflow-hidden relative">
        {product.image_url ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-orange-600 rounded-full animate-spin" />
              </div>
            )}
            <img
              src={product.image_url}
              alt={product.name}
              className={`
                w-full h-full object-cover
                group-hover:scale-110 transition-transform duration-700 ease-out
                ${imgLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
            <Package className="w-12 h-12 text-slate-200" />
          </div>
        )}

        {/* Discount badge */}
        {discount && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-red-500 text-white text-[11px] font-extrabold rounded-lg shadow-lg shadow-red-500/20">
            -{discount}%
          </span>
        )}

        {/* Quick view overlay */}
        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300" />
      </div>

      {/* Content */}
      <div className="p-4">
        {product.category_name && (
          <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest mb-1.5">
            {product.category_name}
          </p>
        )}
        <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-3 group-hover:text-orange-700 transition-colors duration-200">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-black text-slate-900">
            {formatPrice(product.price)}
          </span>
          {product.compare_price && product.compare_price > product.price && (
            <span className="text-xs text-slate-400 line-through">
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   MAIN COMPONENT -- ProductDetailPro
   ================================================================ */

export const ProductDetailPro: React.FC<Props> = ({ productId, onNavigate }) => {
  const { addToCart, formatPrice } = useEcommerce();

  /* ---- State ---- */
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState<'desc' | 'specs' | 'avis'>('desc');
  const [isFav, setIsFav] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showMobileQty, setShowMobileQty] = useState(false);

  /* ---- Marketing: social proof & promo timer ---- */
  const [viewerCount] = useState(() => Math.floor(Math.random() * 15) + 5);
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  /* ---- Image zoom ---- */
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  /* ---- Scroll reveal for sections ---- */
  const trustReveal = useReveal(0.1);
  const tabsReveal = useReveal(0.05);
  const relatedReveal = useReveal(0.05);

  /* ---- Derived values (computed early so hooks can depend on them) ---- */
  const discount =
    product?.compare_price && product.compare_price > product.price
      ? Math.round((1 - product.price / product.compare_price) * 100)
      : null;

  /* ---- Promo countdown timer ---- */
  useEffect(() => {
    if (!discount) return;
    const key = `promo_timer_${productId}`;
    let endTime = parseInt(sessionStorage.getItem(key) || '0');
    if (!endTime || endTime < Date.now()) {
      endTime = Date.now() + (Math.floor(Math.random() * 4) + 1) * 3600000 + Math.floor(Math.random() * 50) * 60000;
      sessionStorage.setItem(key, String(endTime));
    }
    const tick = () => {
      const diff = Math.max(0, endTime - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [productId, discount]);

  /* ---- Recently viewed: save to localStorage ---- */
  useEffect(() => {
    if (!product) return;
    try {
      const key = 'allo_recently_viewed';
      const saved: any[] = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = saved.filter((p: any) => p.id !== product.id).slice(0, 9);
      filtered.unshift({ id: product.id, slug: product.slug, name: product.name, image_url: product.image_url, price: product.price, unit: product.unit });
      localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
    } catch { /* silent */ }
  }, [product]);

  /* ---- Load product ---- */
  useEffect(() => {
    if (productId) {
      loadProduct();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setAdded(false);
      setQuantity(1);
      setTab('desc');
      const res = await productsAPI.getBySlug(productId!);
      const p: Product = res?.data || res;
      setProduct(p);

      // Load related products from same category
      if (p?.category_id) {
        try {
          const rRes = await productsAPI.getAll({
            category: p.category_id,
            limit: 5,
          });
          const arr =
            rRes?.data?.products || rRes?.products || rRes?.data || [];
          setRelated(
            arr.filter((r: Product) => r.id !== p.id).slice(0, 4)
          );
        } catch {
          /* silent */
        }
      }
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  /* ---- Add to cart ---- */
  const handleAdd = useCallback(async () => {
    if (!product) return;
    try {
      setAdding(true);
      await addToCart(product.id, quantity);
      setAdded(true);
    } catch {
      /* silent */
    } finally {
      setAdding(false);
      setTimeout(() => setAdded(false), 3000);
    }
  }, [product, quantity, addToCart]);

  /* ---- Image zoom handler ---- */
  const handleZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  /* ---- Share handler ---- */
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: product?.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  /* ---- Derived values (discount is computed above, before hooks) ---- */

  const step = product?.min_quantity || 1;
  const inStock = product?.stock_status !== 'out_of_stock';

  /* ==============================================================
     LOADING STATE
     ============================================================== */
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 border-[3px] border-slate-100 rounded-full" />
            <div className="absolute inset-0 border-[3px] border-transparent border-t-orange-600 rounded-full animate-spin" />
          </div>
          <p className="text-slate-400 text-sm font-semibold tracking-wide">
            Chargement du produit...
          </p>
        </div>
      </div>
    );
  }

  /* ==============================================================
     NOT FOUND STATE
     ============================================================== */
  if (!product) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white px-5">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            Produit introuvable
          </h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Ce produit n'existe pas ou a ete retire du catalogue.
          </p>
          <button
            onClick={() => onNavigate('catalog')}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-orange-600/20"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Retour au catalogue
          </button>
        </div>
      </div>
    );
  }

  /* ==============================================================
     MAIN RENDER
     ============================================================== */
  return (
    <div className="bg-white min-h-screen pb-24 lg:pb-0">
      {/* ──────────────────────────────────────────────
          BREADCRUMB
          ────────────────────────────────────────────── */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-3.5 flex items-center gap-3">
          {/* Bouton "Retour aux résultats" (visible si état du catalogue persisté) */}
          {(() => {
            try {
              const raw = sessionStorage.getItem('allo_catalog_state');
              if (!raw) return null;
              const s = JSON.parse(raw);
              if (Date.now() - (s.savedAt || 0) > 30 * 60 * 1000) return null;
              return (
                <button
                  onClick={() => onNavigate('catalog')}
                  className="hidden sm:inline-flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 text-xs font-bold text-orange-700 bg-white hover:bg-orange-50 border border-orange-200 rounded-lg transition-colors"
                  aria-label="Retour aux résultats"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  Retour aux résultats
                </button>
              );
            } catch { return null; }
          })()}
          <nav className="flex items-center gap-1.5 text-sm overflow-x-auto scrollbar-hide flex-1">
            <button
              onClick={() => onNavigate('home')}
              className="text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap font-medium"
            >
              Accueil
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            <button
              onClick={() => onNavigate('catalog')}
              className="text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap font-medium"
            >
              Catalogue
            </button>
            {product.category_name && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                <button
                  onClick={() =>
                    onNavigate('catalog', { categoryId: product.category_id })
                  }
                  className="text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap font-medium"
                >
                  {product.category_name}
                </button>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            <span className="text-slate-700 font-semibold truncate max-w-[220px]">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          MAIN PRODUCT SECTION (2-column grid)
          ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-14">
        <div className="grid lg:grid-cols-2 gap-8 xl:gap-14">
          {/* ════════════════════════════════════════════
              LEFT COLUMN -- Image with zoom
              ════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div
              ref={imgRef}
              className="relative aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 cursor-crosshair group"
              onMouseMove={handleZoom}
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
            >
              {product.image_url ? (
                <>
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className={`
                      w-full h-full object-cover transition-transform duration-300 ease-out
                      ${hovering ? 'scale-[1.8]' : 'scale-100'}
                    `}
                    style={
                      hovering
                        ? {
                            transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                          }
                        : undefined
                    }
                    draggable={false}
                  />

                  {/* Zoom hint */}
                  <div
                    className={`
                      absolute bottom-4 right-4 px-3 py-2 bg-white/90 backdrop-blur-sm
                      rounded-lg text-xs font-semibold text-slate-500
                      flex items-center gap-1.5 shadow-sm
                      transition-all duration-300
                      ${hovering ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
                    `}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    Survoler pour zoomer
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                  <Package className="w-24 h-24 text-slate-200" />
                </div>
              )}

              {/* Badges (discount + featured) */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                {discount && (
                  <span className="px-3 py-1.5 bg-red-500 text-white text-xs font-extrabold rounded-lg shadow-lg shadow-red-500/25">
                    -{discount}%
                  </span>
                )}
                {product.is_featured && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs font-extrabold rounded-lg shadow-lg shadow-orange-600/25">
                    <Star className="w-3 h-3 fill-white" />
                    Vedette
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════
              RIGHT COLUMN -- Product info
              ════════════════════════════════════════════ */}
          <div className="flex flex-col">
            {/* Category badge */}
            {product.category_name && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full self-start mb-4">
                <Tag className="w-3 h-3 text-orange-600" />
                <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">
                  {product.category_name}
                </span>
              </span>
            )}

            {/* Product name */}
            <h1 className="text-3xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">
              {product.name}
            </h1>

            {/* SKU */}
            {product.sku && (
              <p className="text-xs text-slate-400 font-medium mb-4">
                REF : {product.sku}
              </p>
            )}

            {/* Star rating */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-[18px] h-[18px] ${
                      i <= Math.round(product.rating_avg || 4)
                        ? 'text-orange-500 fill-orange-500'
                        : 'text-slate-200 fill-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-slate-400 font-medium">
                {product.rating_avg?.toFixed(1) || '4.0'} ({product.rating_count || 0} avis)
              </span>
            </div>

            {/* ──── Social proof: viewers ──── */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl mb-6 animate-pulse-slow">
              <Eye className="w-4 h-4 text-orange-700" />
              <span className="text-xs font-bold text-orange-800">
                🔥 {viewerCount} personnes regardent ce produit en ce moment
              </span>
            </div>

            {/* ──── Price box ──── */}
            <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 mb-6 border border-slate-100">
              <div className="flex items-baseline flex-wrap gap-3">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {formatPrice(product.price)}
                </span>
                {product.compare_price &&
                  product.compare_price > product.price && (
                    <span className="text-base text-slate-400 line-through font-medium">
                      {formatPrice(product.compare_price)}
                    </span>
                  )}
                {discount && (
                  <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-extrabold rounded-md">
                    -{discount}%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Prix HT / {product.unit || 'unite'} &middot; TVA 18% incluse au checkout
              </p>
              {discount && product.compare_price && (
                <p className="text-xs text-emerald-600 font-bold mt-2.5 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Economisez {formatPrice(product.compare_price - product.price)} par{' '}
                  {product.unit || 'unite'}
                </p>
              )}
            </div>

            {/* ──── Stock status with animated dot ──── */}
            <div className="flex items-center gap-2.5 mb-3">
              {inStock ? (
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-emerald-600 font-bold">En stock</span>
                  {product.stock_quantity != null && product.stock_quantity > 0 && (
                    <span className="text-slate-400 font-medium">
                      &middot; {product.stock_quantity} disponibles
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-red-500 font-bold">Rupture de stock</span>
                </div>
              )}
            </div>

            {/* ──── #2 Urgence stock limité ──── */}
            {inStock && product.stock_quantity != null && product.stock_quantity > 0 && product.stock_quantity <= 20 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl mb-3">
                <Flame className="w-4 h-4 text-red-500 animate-bounce" />
                <span className="text-xs font-bold text-red-600">
                  ⚡ Il ne reste que {product.stock_quantity} {product.unit || 'unités'} — Commandez vite !
                </span>
              </div>
            )}

            {/* ──── #4 Timer promo flash ──── */}
            {discount && (timeLeft.h > 0 || timeLeft.m > 0 || timeLeft.s > 0) && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl mb-6 shadow-lg shadow-red-500/20">
                <Clock className="w-5 h-5 text-white flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Offre flash expire dans</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {[{ v: timeLeft.h, l: 'h' }, { v: timeLeft.m, l: 'm' }, { v: timeLeft.s, l: 's' }].map(({ v, l }) => (
                      <span key={l} className="inline-flex items-center gap-0.5">
                        <span className="bg-white/20 backdrop-blur-sm text-white font-black text-sm px-2 py-1 rounded-lg min-w-[32px] text-center">
                          {String(v).padStart(2, '0')}
                        </span>
                        <span className="text-white/70 text-xs font-bold">{l}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-white font-extrabold text-lg">-{discount}%</span>
              </div>
            )}

            {/* ──── #6 Remise volume ──── */}
            <div className="bg-gradient-to-br from-orange-50 to-indigo-50 border border-orange-100 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Remises volume</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { qty: '10+', pct: '3%', bg: 'bg-orange-100' },
                  { qty: '50+', pct: '7%', bg: 'bg-orange-200' },
                  { qty: '100+', pct: '12%', bg: 'bg-orange-300' },
                ].map(tier => (
                  <div key={tier.qty} className={`${tier.bg} rounded-xl p-2.5 text-center`}>
                    <p className="text-sm font-black text-orange-900">{tier.pct}</p>
                    <p className="text-[10px] font-bold text-orange-600">à partir de {tier.qty}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-orange-500 mt-2 font-medium">💰 Contactez-nous pour un devis personnalisé sur les grandes quantités</p>
            </div>

            {/* ──── Quantity selector + Add to cart ──── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
              {/* Quantity */}
              <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden self-start">
                <button
                  onClick={() => setQuantity((q) => Math.max(step, q - step))}
                  className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  aria-label="Diminuer la quantite"
                >
                  <Minus className="w-4 h-4 text-slate-500" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  min={step}
                  step={step}
                  onChange={(e) =>
                    setQuantity(Math.max(step, parseInt(e.target.value) || step))
                  }
                  className="w-16 text-center font-bold text-sm border-x border-slate-200 h-12 bg-transparent focus:outline-none focus:bg-slate-50/50 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setQuantity((q) => q + step)}
                  className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  aria-label="Augmenter la quantite"
                >
                  <Plus className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Add to cart button */}
              <button
                onClick={handleAdd}
                disabled={adding || !inStock}
                className={`
                  flex-1 min-w-[220px] h-12 font-bold text-sm rounded-xl
                  transition-all duration-300 ease-out
                  flex items-center justify-center gap-2.5
                  active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    added
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/25 hover:shadow-orange-600/35'
                  }
                `}
              >
                {adding ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : added ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Ajoute !
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Ajouter au panier
                  </>
                )}
              </button>
            </div>

            {/* ──── WhatsApp order ──── */}
            <a
              href={buildWhatsAppLink(
                buildProductInquiryMessage({
                  productName: product?.name || '',
                  sku: product?.sku,
                  quantity,
                  unit: product?.unit,
                  price: product?.price,
                  url: typeof window !== 'undefined' ? window.location.href : undefined,
                })
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="shop-shine flex items-center justify-center gap-2.5 w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.97] text-white font-bold text-sm rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:-translate-y-0.5 transition-all mb-5"
            >
              <MessageCircle className="w-5 h-5" />
              Commander via WhatsApp
            </a>

            {/* ──── Secondary actions ──── */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setIsFav((f) => !f)}
                className={`
                  flex items-center gap-2 text-sm font-semibold transition-colors
                  ${isFav ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}
                `}
              >
                <Heart
                  className={`w-[18px] h-[18px] transition-all ${
                    isFav ? 'fill-red-500 scale-110' : ''
                  }`}
                />
                Favoris
              </button>
              <span className="w-px h-4 bg-slate-200" />
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-orange-600 transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Copy className="w-[18px] h-[18px]" />
                    Lien copie !
                  </>
                ) : (
                  <>
                    <Share2 className="w-[18px] h-[18px]" />
                    Partager
                  </>
                )}
              </button>
            </div>

            {/* ──── Tarifs dégressifs B2B ──── */}
            <PricingTiers
              productId={product.id}
              quantity={quantity}
              basePrice={product.price}
              unit={product.unit}
            />

            {/* ──── Trust badges ──── */}
            <div
              ref={trustReveal.ref}
              className={`
                grid grid-cols-3 gap-3 pt-7 border-t border-slate-100
                transition-all duration-700
                ${trustReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
              `}
            >
              {[
                {
                  icon: Truck,
                  title: 'Livraison 24-48h',
                  sub: 'Dakar et environs',
                  bg: 'bg-teal-50',
                  iconColor: 'text-teal-600',
                  border: 'border-teal-100',
                },
                {
                  icon: Shield,
                  title: 'Qualite NF',
                  sub: 'Materiaux certifies',
                  bg: 'bg-orange-50',
                  iconColor: 'text-orange-600',
                  border: 'border-orange-100',
                },
                {
                  icon: Headphones,
                  title: 'Support 7j/7',
                  sub: 'Experts BTP',
                  bg: 'bg-violet-50',
                  iconColor: 'text-violet-600',
                  border: 'border-violet-100',
                },
              ].map((badge) => (
                <div key={badge.title} className="text-center group/badge">
                  <div
                    className={`
                      w-11 h-11 rounded-xl ${badge.bg} border ${badge.border}
                      flex items-center justify-center mx-auto mb-2.5
                      group-hover/badge:scale-110 transition-transform duration-300
                    `}
                  >
                    <badge.icon className={`w-5 h-5 ${badge.iconColor}`} />
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {badge.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{badge.sub}</p>
                </div>
              ))}
            </div>

            {/* ──── #5 Bundle "Souvent achetés ensemble" ──── */}
            {related.length >= 2 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-bold text-slate-800">Souvent achetés ensemble</span>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {/* Current product */}
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-purple-300 bg-white">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-slate-300" /></div>
                      )}
                    </div>
                    <Plus className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    {related.slice(0, 2).map((rp) => (
                      <React.Fragment key={rp.id}>
                        <div
                          className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-purple-200 bg-white cursor-pointer hover:border-purple-400 transition-colors"
                          onClick={() => onNavigate('product', { id: rp.slug || rp.id })}
                        >
                          {rp.image_url ? (
                            <img src={rp.image_url} alt={rp.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-slate-300" /></div>
                          )}
                        </div>
                        <Plus className="w-4 h-4 text-purple-300 flex-shrink-0 last:hidden" />
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-600 font-bold">Pack complet — Economisez 5%</p>
                      <p className="text-lg font-black text-purple-900">
                        {formatPrice(Math.round((product.price + related.slice(0, 2).reduce((s, r) => s + r.price, 0)) * 0.95))}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        for (const rp of [product, ...related.slice(0, 2)]) {
                          await addToCart(rp.id, 1).catch(() => {});
                        }
                      }}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-colors flex items-center gap-2"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Ajouter le pack
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ──────────────────────────────────────────────
            TABS SECTION
            ────────────────────────────────────────────── */}
        <div
          ref={tabsReveal.ref}
          className={`
            mt-16 lg:mt-20 border-t border-slate-100 pt-10
            transition-all duration-700
            ${tabsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          {/* Tab buttons */}
          <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1 scrollbar-hide">
            {(
              [
                { key: 'desc' as const, label: 'Description', icon: Info },
                { key: 'specs' as const, label: 'Caracteristiques', icon: ClipboardList },
                {
                  key: 'avis' as const,
                  label: `Avis (${product.rating_count || 0})`,
                  icon: MessageSquare,
                },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                  transition-all duration-200 whitespace-nowrap
                  ${
                    tab === t.key
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }
                `}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="min-h-[200px]">
            {/* ── Description tab ── */}
            {tab === 'desc' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 animate-in fade-in duration-300">
                <div className="prose prose-sm prose-slate max-w-none">
                  {product.description ? (
                    <div className="text-slate-600 leading-relaxed whitespace-pre-line text-[15px]">
                      {product.description}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">
                      Aucune description disponible pour ce produit.
                    </p>
                  )}
                </div>

                {/* Short description if available */}
                {product.short_description && product.description && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Resume
                    </p>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {product.short_description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Specs tab ── */}
            {tab === 'specs' && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-in fade-in duration-300">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['Reference', product.sku || '--'],
                      ['Categorie', product.category_name || '--'],
                      ['Unite', product.unit || '--'],
                      [
                        'Poids',
                        (product as any).weight
                          ? `${(product as any).weight} kg`
                          : '--',
                      ],
                      [
                        'Commande minimum',
                        product.min_quantity
                          ? `${product.min_quantity} ${product.unit || 'unites'}`
                          : '1',
                      ],
                      [
                        'Stock',
                        product.stock_quantity != null
                          ? `${product.stock_quantity} ${product.unit || 'unites'}`
                          : '--',
                      ],
                      [
                        'Ventes',
                        product.sold_count
                          ? `${product.sold_count} vendus`
                          : '--',
                      ],
                    ]
                      .concat(
                        // Append dynamic specs if available
                        product.specifications
                          ? Object.entries(product.specifications).map(
                              ([key, val]) => [
                                key.charAt(0).toUpperCase() + key.slice(1),
                                String(val),
                              ]
                            )
                          : []
                      )
                      .map(([label, value], i) => (
                        <tr
                          key={label}
                          className={`
                            border-b border-slate-50 last:border-b-0
                            ${i % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'}
                          `}
                        >
                          <td className="px-6 py-4 font-bold text-slate-700 w-2/5">
                            {label}
                          </td>
                          <td className="px-6 py-4 text-slate-500">{value}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Reviews tab (dynamique avec API) ── */}
            {tab === 'avis' && (
              <ProductReviews productId={product.id} productName={product.name} />
            )}
          </div>
        </div>

        {/* ──────────────────────────────────────────────
            RELATED PRODUCTS
            ────────────────────────────────────────────── */}
        {related.length > 0 && (
          <div
            ref={relatedReveal.ref}
            className={`
              mt-16 lg:mt-20
              transition-all duration-700
              ${relatedReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
            `}
          >
            {/* Section header */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full mb-3">
                  <Package className="w-3 h-3 text-orange-600" />
                  <span className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">
                    Similaires
                  </span>
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Produits associes
                </h2>
              </div>
              <button
                onClick={() =>
                  onNavigate('catalog', { categoryId: product.category_id })
                }
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-orange-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 group/btn"
              >
                Voir tout
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {related.map((p, i) => (
                <RelatedProductCard
                  key={p.id}
                  product={p}
                  index={i}
                  onNavigate={onNavigate}
                  formatPrice={formatPrice}
                />
              ))}
            </div>

            {/* Mobile "see all" link */}
            <div className="sm:hidden mt-6 text-center">
              <button
                onClick={() =>
                  onNavigate('catalog', { categoryId: product.category_id })
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-orange-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100"
              >
                Voir tous les produits
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────
          STICKY MOBILE BAR
          ────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Price */}
            <div className="flex-shrink-0">
              <p className="text-lg font-black text-slate-900 leading-tight">
                {formatPrice(product.price)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                / {product.unit || 'unite'}
              </p>
            </div>

            {/* Mobile quantity dropdown */}
            <button
              onClick={() => setShowMobileQty(!showMobileQty)}
              className="flex items-center gap-1 px-3 h-10 border border-slate-200 rounded-lg bg-white text-sm font-bold text-slate-700"
            >
              x{quantity}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  showMobileQty ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Add to cart */}
            <button
              onClick={handleAdd}
              disabled={adding || !inStock}
              className={`
                flex-1 h-11 font-bold text-sm rounded-xl
                transition-all duration-300 ease-out
                flex items-center justify-center gap-2
                active:scale-[0.97] disabled:opacity-50
                ${
                  added
                    ? 'bg-emerald-500 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20'
                }
              `}
            >
              {adding ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : added ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Ajoute !
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Ajouter au panier
                </>
              )}
            </button>
          </div>

          {/* Expandable mobile quantity selector */}
          {showMobileQty && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">Quantite :</span>
              <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(step, q - step))}
                  className="w-10 h-9 flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 text-slate-500" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  min={step}
                  step={step}
                  onChange={(e) =>
                    setQuantity(Math.max(step, parseInt(e.target.value) || step))
                  }
                  className="w-14 text-center font-bold text-sm border-x border-slate-200 h-9 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setQuantity((q) => q + step)}
                  className="w-10 h-9 flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {product.unit || 'unites'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPro;
