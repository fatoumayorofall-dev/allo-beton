/**
 * ALLO BÉTON — PANIER — WORLD-CLASS 2026
 * Free shipping progress, cross-sell, coupon, premium empty state
 */

import React, { useState, useEffect } from 'react';
import {
  Trash2, Minus, Plus, Package, ArrowRight,
  ChevronRight, Truck, Shield, Tag, Gift, Sparkles,
  ArrowLeft, ShoppingBag, Percent, Star, MessageCircle,
} from 'lucide-react';
import { productsAPI, Product } from '../../services/ecommerce-api';
import { useEcommerce, ECOMMERCE_CONFIG } from '../../contexts/EcommerceContext';
import { SITE_CONFIG } from './siteConfig';

type View = 'home' | 'catalog' | 'product' | 'cart' | 'checkout' | 'success' | 'login' | 'dashboard';
interface Props { onNavigate: (view: View, data?: any) => void; }

const { FREE_SHIPPING_THRESHOLD, TAX_RATE } = ECOMMERCE_CONFIG;

export const ShoppingCartPro: React.FC<Props> = ({ onNavigate }) => {
  const { cart, updateCartItem, removeFromCart, formatPrice, applyCoupon, removeCoupon } = useEcommerce();
  const [removing, setRemoving] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const shippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  useEffect(() => { loadSuggestions(); }, []);

  const loadSuggestions = async () => {
    try {
      const res = await productsAPI.getBestsellers(4);
      setSuggestions(res?.data || res?.products || []);
    } catch { /* ignored */ }
  };

  const handleRemove = async (itemId: string) => {
    try { setRemoving(itemId); await removeFromCart(itemId); }
    catch { /* ignored */ }
    finally { setTimeout(() => setRemoving(null), 400); }
  };

  const handleCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponMessage({ type: 'error', text: 'Veuillez entrer un code promo' });
      return;
    }
    try {
      setCouponLoading(true);
      setCouponMessage(null);
      const success = await applyCoupon(couponCode.trim());
      if (success) {
        setCouponMessage({ type: 'success', text: 'Code promo appliqué avec succès !' });
        setCouponCode('');
      } else {
        setCouponMessage({ type: 'error', text: 'Code promo invalide ou expiré' });
      }
    } catch (err: any) {
      setCouponMessage({ type: 'error', text: err.message || 'Erreur lors de l\'application du code' });
    } finally {
      setCouponLoading(false);
      // Effacer le message après 5 secondes
      setTimeout(() => setCouponMessage(null), 5000);
    }
  };

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-5">
        <div className="text-center max-w-md mx-auto">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-slate-100 rounded-3xl rotate-6" />
            <div className="absolute inset-0 bg-slate-50 rounded-3xl -rotate-3" />
            <div className="relative w-full h-full bg-white rounded-3xl border border-slate-100 flex items-center justify-center shadow-lg shadow-slate-100/50">
              <ShoppingBag className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Votre panier est vide</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Explorez notre catalogue de matériaux de construction professionnels et trouvez tout ce qu'il faut pour vos chantiers.
          </p>
          <button onClick={() => onNavigate('catalog')}
            className="group px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-600 active:scale-[0.97] text-white font-bold text-sm rounded-2xl shadow-[0_8px_30px_rgba(37,99,235,0.3)] transition-all flex items-center gap-2.5 mx-auto">
            Découvrir le catalogue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-14 text-left">
              <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-600" /> Nos recommandations
              </p>
              <div className="grid grid-cols-2 gap-3">
                {suggestions.slice(0, 4).map(p => (
                  <div key={p.id} onClick={() => onNavigate('product', { id: p.slug || p.id })}
                    className="group bg-white rounded-xl border border-gray-100 p-3 cursor-pointer hover:border-slate-200 hover:shadow-md transition-all">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-50 mb-2">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-gray-200" /></div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-orange-700 transition-colors">{p.name}</p>
                    <p className="text-sm font-black text-gray-900 mt-0.5">{formatPrice(p.price)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/30 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <button onClick={() => onNavigate('home')} className="hover:text-gray-600 transition-colors">Accueil</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-700 font-semibold">Mon panier</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Mon panier <span className="text-gray-300 text-lg font-bold">({items.length})</span>
            </h1>
            <button onClick={() => onNavigate('catalog')}
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-orange-700 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Continuer mes achats
            </button>
          </div>
        </div>
      </div>

      {/* Free shipping bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${freeShipping ? 'bg-emerald-50' : 'bg-slate-50'}`}>
              <Truck className={`w-4 h-4 ${freeShipping ? 'text-emerald-500' : 'text-orange-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 mb-1.5">
                {freeShipping
                  ? '🎉 Livraison gratuite débloquée !'
                  : `Plus que ${formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} pour la livraison gratuite`}
              </p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ease-out relative ${freeShipping ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-500 to-orange-700'}`}
                  style={{ width: `${shippingProgress}%` }}>
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item: any) => (
              <div key={item.id}
                className={`bg-white rounded-xl border border-gray-100 p-4 sm:p-5 transition-all duration-300 hover:shadow-md ${removing === item.id ? 'opacity-40 scale-[0.98]' : ''}`}>
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 cursor-pointer"
                    onClick={() => onNavigate('product', { id: item.product_slug || item.product_id })}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-gray-200" /></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm leading-snug cursor-pointer hover:text-orange-700 transition-colors"
                          onClick={() => onNavigate('product', { id: item.product_slug || item.product_id })}>
                          {item.product_name}
                        </h3>
                        {item.sku && <p className="text-[10px] text-gray-400 mt-0.5">Réf : {item.sku}</p>}
                      </div>
                      <button onClick={() => handleRemove(item.id)}
                        className="p-2 rounded-lg hover:bg-rose-50 text-gray-300 hover:text-rose-500 transition-all flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-3 mt-3">
                      {/* Quantity */}
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button onClick={() => item.quantity > 1 && updateCartItem(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors">
                          <Minus className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <span className="w-10 text-center font-bold text-sm border-x border-gray-200">{item.quantity}</span>
                        <button onClick={() => updateCartItem(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors">
                          <Plus className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-base font-black text-gray-900">{formatPrice(item.total_price || item.subtotal || (item.unit_price || 0) * item.quantity)}</p>
                        <p className="text-[10px] text-gray-400">{formatPrice(item.unit_price || 0)} / {item.unit || 'unité'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Continue shopping */}
            <button onClick={() => onNavigate('catalog')}
              className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-orange-700 mt-2 transition-colors sm:hidden">
              <ArrowLeft className="w-4 h-4" /> Continuer mes achats
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-24">
              <div className="px-5 sm:px-6 py-5 border-b border-gray-50">
                <h2 className="text-lg font-black text-gray-900">Récapitulatif</h2>
              </div>

              <div className="px-5 sm:px-6 py-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Sous-total ({items.length} article{items.length > 1 ? 's' : ''})</span>
                  <span className="text-sm font-bold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">TVA ({TAX_RATE * 100}%)</span>
                  <span className="text-sm font-bold text-gray-900">{formatPrice(subtotal * TAX_RATE)}</span>
                </div>
                {cart?.discount_amount && cart.discount_amount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600">
                    <span className="text-sm flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Remise
                      {cart.coupon_code && (
                        <button onClick={() => removeCoupon()} className="text-[10px] text-gray-400 hover:text-rose-500 underline">(retirer)</button>
                      )}
                    </span>
                    <span className="text-sm font-bold">-{formatPrice(cart.discount_amount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Livraison
                  </span>
                  <span className={`text-sm font-bold ${freeShipping ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {freeShipping ? 'Gratuite' : 'Calculée au checkout'}
                  </span>
                </div>
              </div>

              {/* Coupon */}
              <div className="px-5 sm:px-6 py-4 border-t border-gray-50">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleCoupon()}
                      placeholder="Code promo"
                      aria-label="Entrez votre code promo"
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-600/30 focus:border-orange-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    aria-label="Appliquer le code promo"
                    className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
                  >
                    {couponLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Appliquer'}
                  </button>
                </div>
                {couponMessage && (
                  <p className={`mt-2 text-xs font-medium ${couponMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {couponMessage.text}
                  </p>
                )}
              </div>

              {/* Total */}
              <div className="px-5 sm:px-6 py-5 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base font-bold text-gray-900">Total TTC</span>
                  <span className="text-2xl font-black text-gray-900 tracking-tight">
                    {formatPrice((cart?.total || subtotal * 1.18) - (cart?.discount_amount || 0))}
                  </span>
                </div>
                <button onClick={() => onNavigate('checkout')}
                  className="group w-full py-4 bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-600 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/25 transition-all flex items-center justify-center gap-2.5">
                  Passer la commande <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* WhatsApp order button */}
                <a
                  href={`https://wa.me/${SITE_CONFIG.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `🛒 *Commande Allo Béton*\n\n` +
                    items.map((item: any) => `• ${item.product_name} — Qté: ${item.quantity} × ${formatPrice(item.unit_price || 0)} = ${formatPrice(item.total_price || (item.unit_price || 0) * item.quantity)}`).join('\n') +
                    `\n\n📋 *Récapitulatif*\nSous-total: ${formatPrice(subtotal)}\nTVA (18%): ${formatPrice(subtotal * TAX_RATE)}\n*Total TTC: ${formatPrice((cart?.total || subtotal * 1.18) - (cart?.discount_amount || 0))}*\n\nMerci de confirmer ma commande !`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2.5"
                >
                  <MessageCircle className="w-5 h-5" />
                  Commander via WhatsApp
                </a>
              </div>

              {/* Trust */}
              <div className="px-5 sm:px-6 py-4 border-t border-gray-100 space-y-2">
                {[
                  { icon: Shield, text: 'Paiement 100% sécurisé', color: 'text-emerald-500' },
                  { icon: Truck, text: 'Livraison express 24-48h', color: 'text-teal-500' },
                  { icon: Gift, text: 'Livraison gratuite dès 500K FCFA', color: 'text-orange-600' },
                ].map(t => (
                  <div key={t.text} className="flex items-center gap-2.5 text-xs text-gray-500">
                    <t.icon className={`w-3.5 h-3.5 ${t.color} flex-shrink-0`} />
                    {t.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Cross-sell / Suggestions ═══ */}
        {suggestions.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center gap-2 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                <Star className="w-3 h-3 text-orange-700" />
                <span className="text-[11px] font-bold text-orange-700 uppercase tracking-[0.1em]">Pour compléter</span>
              </div>
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-6">Vous pourriez aussi aimer</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {suggestions.slice(0, 4).map(p => (
                <div key={p.id} onClick={() => onNavigate('product', { id: p.slug || p.id })}
                  className="group bg-white rounded-[1.25rem] overflow-hidden border border-gray-100 hover:border-slate-200/60 cursor-pointer hover:shadow-lg transition-all">
                  <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.08] transition-transform duration-700" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-gray-200" /></div>
                    )}
                  </div>
                  <div className="p-4">
                    {p.category_name && <p className="text-[10px] font-bold text-teal-600 uppercase tracking-[0.1em] mb-1">{p.category_name}</p>}
                    <h3 className="font-bold text-gray-900 text-[13px] leading-snug line-clamp-2 group-hover:text-orange-700 transition-colors">{p.name}</h3>
                    <p className="text-base font-black text-gray-900 mt-2">{formatPrice(p.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default ShoppingCartPro;
