import { delayLabel } from '../utils/market';
import { PREORDER_MAX } from '../utils/stock';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShieldCheck, Tag, Truck, X, PackageCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PROMO_CODES } from '../config/site';
import { formatPrice, pricesHidden, shownPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { ProductImage } from '../components/ProductImage';
import { GiftWrapOption } from '../components/CartDrawer';
import { BrandMark } from '../components/Logo';
import { ProductCard } from '../components/ProductCard';
import { ForeignPrice } from '../components/CurrencySwitch';
import { startWhatsAppOrder } from '../utils/whatsappOrder';
import { WhatsAppGlyph } from '../components/BrandLogos';

export const PromoBox: React.FC = () => {
  const { promoCode, applyPromo, removePromo, notify, computeTotals } = useStore();
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);
  const shortfall = computeTotals(0).promoShortfall;

  if (promoCode) {
    return (
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 text-sm border rounded-2xl ${shortfall ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}
      >
        <span className="flex items-start gap-2.5">
          <Tag className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.5} />
          <span>
            <strong>{promoCode}</strong> — {PROMO_CODES[promoCode].label}
            {shortfall > 0 && (
              <span className="block text-xs mt-0.5">
                {pricesHidden()
                  ? "Il s'appliquera si votre commande atteint le montant prévu."
                  : `Encore ${formatPrice(shortfall)} d'achat pour l'activer.`}
              </span>
            )}
          </span>
        </span>
        <button onClick={removePromo} aria-label="Retirer le code" className="shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap text-[11px] uppercase tracking-[0.2em] font-semibold link-luxe inline-flex items-center gap-2"
      >
        <Tag className="w-3.5 h-3.5" strokeWidth={1.5} /> J'ai un code promo
      </button>
    );
  }
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        const r = applyPromo(code);
        notify(r.message, r.ok ? 'success' : 'error');
        if (r.ok) setCode('');
      }}
      className="flex gap-2 animate-fade-in"
    >
      <input
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="Code promo"
        aria-label="Code promo"
        autoFocus
        className="field uppercase text-sm"
      />
      <button className="btn-dark !h-[52px] !px-6 shrink-0">Appliquer</button>
    </form>
  );
};

export const Cart: React.FC = () => {
  usePageTitle('Mon panier');
  const { cart, updateQuantity, removeFromCart, computeTotals, getProduct, clearCart, products, savedCustomer } =
    useStore();
  const t = computeTotals(0);
  // « Complétez votre look » : d'abord l'autre univers (un sac pour des souliers…), puis les coups de cœur
  const suggestions = useMemo(() => {
    const inCart = new Set(cart.map(i => i.productId));
    const cats = new Set(cart.map(i => products.find(p => p.id === i.productId)?.category));
    return products
      .filter(p => !inCart.has(p.id) && p.stock > 0)
      .sort(
        (a, b) =>
          Number(cats.has(a.category)) - Number(cats.has(b.category)) ||
          Number(!!b.isBestseller) - Number(!!a.isBestseller),
      )
      .slice(0, 4);
  }, [cart, products]);

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-40 px-5">
        <BrandMark shine className="h-28 w-auto mx-auto motion-safe:animate-hover" />
        <h1 className="font-display text-5xl mt-6">Votre panier est vide</h1>
        <p className="text-ink/75 mt-4">Nos nouveautés n'attendent que vous.</p>
        <Link to="/boutique?tri=nouveautes" className="btn-dark mt-10">
          Découvrir les nouveautés
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-12">
      <div className="flex items-end justify-between mb-10 pb-8 border-b border-ink/10">
        <div>
          <p className="eyebrow">
            {t.itemCount} pièce{t.itemCount > 1 ? 's' : ''}
          </p>
          <h1 className="font-display text-5xl sm:text-6xl mt-2">Votre panier</h1>
        </div>
        <button
          onClick={clearCart}
          className="tap text-[11px] uppercase tracking-[0.2em] text-ink/70 hover:text-wine link-luxe"
        >
          Tout retirer
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 items-start">
        <div className="min-w-0">
          <ul className="divide-y divide-ink/10">
            {cart.map(item => {
              const product = getProduct(item.productId);
              const stock = item.market || item.preorder ? PREORDER_MAX : (product?.stock ?? item.quantity);
              return (
                <li key={item.key} className="flex gap-5 sm:gap-8 py-7 first:pt-0">
                  <Link to={product ? `/produit/${product.slug}` : '#'} className="shrink-0">
                    <ProductImage
                      src={item.image}
                      alt={item.name}
                      label=""
                      className="w-28 h-36 sm:w-36 sm:h-48 rounded-3xl"
                    />
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between gap-4">
                      <div>
                        {product && <p className="eyebrow !text-ink/70">{product.subcategory}</p>}
                        <Link
                          to={product ? `/produit/${product.slug}` : '#'}
                          className="font-display text-2xl leading-tight mt-1 block hover:text-gold-dark"
                        >
                          {item.name}
                        </Link>
                        <p className="text-sm text-ink/70 mt-2">
                          {[item.color, item.size && `Taille ${item.size}`].filter(Boolean).join(' · ')}
                        </p>
                        {item.market && (
                          <p
                            className="text-[10px] uppercase tracking-[0.14em] text-gold-dark mt-1"
                            data-testid="cart-market"
                          >
                            Le Marché · livré en {delayLabel(item.market.delayMin, item.market.delayMax)}
                          </p>
                        )}
                        {item.preorder && (
                          <p
                            className="text-[10px] uppercase tracking-[0.14em] text-gold-dark mt-1"
                            data-testid="cart-preorder"
                          >
                            Sur commande · livré en {delayLabel(item.preorder.days, item.preorder.days)}
                          </p>
                        )}
                      </div>
                      <span className="font-semibold whitespace-nowrap">
                        {pricesHidden() ? shownPrice(item.price) : formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <div className="flex items-center border border-ink/15 h-10 rounded-full overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          aria-label="Diminuer"
                          className="w-10 h-full grid place-items-center hover:bg-ink/5"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          disabled={item.quantity >= stock}
                          aria-label="Augmenter"
                          className="w-10 h-full grid place-items-center hover:bg-ink/5 disabled:opacity-25"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.key)}
                        className="tap text-[10px] uppercase tracking-[0.2em] text-ink/70 hover:text-wine link-luxe"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="bg-white border border-ink/[0.06] rounded-[2rem] p-7 sm:p-9 space-y-6 lg:sticky lg:top-36">
          <h2 className="font-display text-3xl">Récapitulatif</h2>
          <GiftWrapOption />
          <PromoBox />
          {pricesHidden() ? (
            <p
              className="text-sm text-ink/80 border-t border-ink/10 pt-6 leading-relaxed"
              data-testid="price-on-whatsapp"
            >
              <strong className="text-ink">Prix exact sur WhatsApp.</strong> Nous vérifions chaque pièce chez notre
              fournisseur, puis nous vous donnons le prix et le total (livraison selon votre quartier).
            </p>
          ) : (
            <>
              <dl className="space-y-3 text-sm border-t border-ink/10 pt-6">
                <div className="flex justify-between">
                  <dt className="text-ink/75">Sous-total</dt>
                  <dd>{formatPrice(t.subtotal)}</dd>
                </div>
                {t.discount > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <dt>Réduction</dt>
                    <dd>-{formatPrice(t.discount)}</dd>
                  </div>
                )}
                {t.giftFee > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-ink/75">Emballage cadeau</dt>
                    <dd>{formatPrice(t.giftFee)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-ink/75">Livraison</dt>
                  <dd className="text-ink/75">Selon votre zone</dd>
                </div>
              </dl>
              <div className="flex justify-between items-baseline border-t border-ink/10 pt-6">
                <span className="text-[11px] uppercase tracking-[0.22em] font-semibold">Total</span>
                <span className="text-right">
                  <span className="block font-display text-4xl">
                    {formatPrice(t.subtotal - t.discount + t.giftFee)}
                  </span>
                  <ForeignPrice
                    amount={t.subtotal - t.discount + t.giftFee}
                    className="block text-[11px] text-ink/65"
                  />
                </span>
              </div>
            </>
          )}
          <button
            onClick={() =>
              startWhatsAppOrder(
                cart.map(i => ({
                  productId: i.productId,
                  name: i.name,
                  price: i.price,
                  image: i.image,
                  size: i.size,
                  color: i.color,
                  quantity: i.quantity,
                })),
                savedCustomer,
              )
            }
            data-testid="cart-whatsapp"
            className="w-full h-[56px] rounded-full bg-[#177a41] hover:bg-[#12663a] text-white text-[12px] uppercase tracking-[0.2em] font-semibold inline-flex items-center justify-center gap-2.5 transition-colors"
          >
            <WhatsAppGlyph className="w-5 h-5" /> Commander sur WhatsApp
          </button>
          <p className="text-[11px] text-ink/70 text-center leading-relaxed">
            Nous vérifions la disponibilité de chaque pièce, puis vous envoyons le lien pour finaliser (livraison,
            paiement).
          </p>
          <Link
            to="/boutique"
            className="block py-3 -my-3 text-center text-[11px] uppercase tracking-[0.2em] text-ink/75 hover:text-ink"
          >
            Continuer mes achats
          </Link>
          <ul className="border-t border-ink/10 pt-6 space-y-3 text-xs text-ink/75">
            {[
              { Icon: Truck, t: 'Livraison 24 h à Dakar', d: '48 à 72 h dans les régions' },
              { Icon: PackageCheck, t: 'Contrôlée avant envoi', d: 'À vérifier à la réception, devant le livreur' },
              { Icon: ShieldCheck, t: 'Pièces authentiques', d: 'Étiquette vérifiable en ligne' },
            ].map(({ Icon, t: title, d }) => (
              <li key={title} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gold-dark shrink-0" strokeWidth={1.5} />
                <span>
                  <strong className="text-ink font-semibold">{title}</strong> · {d}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {suggestions.length > 0 && (
        <section className="mt-24" aria-labelledby="look-titre" data-testid="cart-suggestions">
          <p className="eyebrow">Pour aller avec</p>
          <h2 id="look-titre" className="font-display text-4xl sm:text-5xl mt-2 mb-8">
            Complétez votre <em className="text-gold-dark text-magic">look</em>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-12">
            {suggestions.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
