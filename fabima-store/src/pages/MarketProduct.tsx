import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, CreditCard, Globe2, MessageCircle, Minus, PackageCheck, Plus, ShoppingBag, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildProductWhatsAppMessage, buildWhatsAppLink } from '../config/site';
import { discountPercent, formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { delayLabel, marketAsProduct, useMarket } from '../utils/market';
import { ProductImage } from '../components/ProductImage';
import { MarketCard } from '../components/MarketCard';

/** Fiche d'un produit du Marché (dropshipping). */
export const MarketProduct: React.FC = () => {
  const { slug = '' } = useParams();
  const { products, loading } = useMarket();
  const { addToCart, setCartOpen } = useStore();
  const product = products?.find(p => p.slug === slug) ?? null;
  usePageTitle(product?.name ?? 'Le Marché', product ? `${product.name} — ${formatPrice(product.price)}, livré chez vous en ${delayLabel(product.delayMin, product.delayMax)}.` : undefined);
  const [img, setImg] = useState(0);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [missing, setMissing] = useState('');

  const related = useMemo(() => (products ?? []).filter(p => p.id !== product?.id && p.category === product?.category).slice(0, 4), [products, product]);

  if (loading) return <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-10"><div className="aspect-[4/5] max-w-xl rounded-[2.5rem] bg-blush/30 animate-pulse" /></div>;
  if (!product) {
    return (
      <div className="text-center py-32 px-5">
        <Globe2 className="w-10 h-10 mx-auto text-gold" strokeWidth={1.2} />
        <h1 className="font-display text-4xl mt-4">Article introuvable</h1>
        <p className="text-ink/55 mt-2">Il n'est peut-être plus proposé au Marché.</p>
        <Link to="/marche" className="btn-dark mt-8">Retour au Marché</Link>
      </div>
    );
  }

  const off = discountPercent(product.price, product.oldPrice);
  const variant = product.options.map(o => choice[o.name] && `${o.name} : ${choice[o.name]}`).filter(Boolean).join(' · ');
  const add = (buyNow = false) => {
    const lacking = product.options.find(o => !choice[o.name]);
    if (lacking) { setMissing(lacking.name); return; }
    const ok = addToCart(marketAsProduct(product), { color: variant || undefined, quantity: qty, market: { delayMin: product.delayMin, delayMax: product.delayMax } });
    if (ok && buyNow) setCartOpen(true);
  };
  const wa = buildWhatsAppLink(buildProductWhatsAppMessage({ name: `${product.name} (Marché)`, price: product.price, color: variant || undefined, url: window.location.href }));

  return (
    <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-8">
      <nav className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-ink/45 mb-6" aria-label="Fil d'Ariane">
        <Link to="/" className="hover:text-ink">Accueil</Link><ChevronRight className="w-3 h-3" />
        <Link to="/marche" className="hover:text-ink">Le Marché</Link><ChevronRight className="w-3 h-3" />
        <span className="text-ink/70 truncate">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        {/* Photos */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 min-w-0">
          {product.images.length > 1 && (
            <div className="flex sm:flex-col gap-2 overflow-x-auto no-scrollbar">
              {product.images.map((src, i) => (
                <button key={src} onClick={() => setImg(i)} aria-label={`Photo ${i + 1}`}
                  className={`w-16 h-20 sm:w-20 sm:h-24 shrink-0 rounded-2xl overflow-hidden border-2 ${img === i ? 'border-ink' : 'border-transparent opacity-70'}`}>
                  <ProductImage src={src} alt="" label="" className="w-full h-full" />
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1 min-w-0 aspect-[4/5] bg-ivory-deep rounded-[2.5rem] overflow-hidden">
            <ProductImage src={product.images[img] ?? product.images[0]} alt={product.name} className="w-full h-full" />
            {off > 0 && <span className="absolute top-4 left-4 px-3 py-1 bg-wine text-white text-[10px] uppercase tracking-[0.2em] font-semibold rounded-full">-{off}%</span>}
          </div>
        </div>

        {/* Infos */}
        <div className="lg:sticky lg:top-40">
          <p className="eyebrow inline-flex items-center gap-2"><Globe2 className="w-3.5 h-3.5" /> Le Marché · {product.category}</p>
          <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mt-3">{product.name}</h1>
          <p className="flex items-baseline gap-3 mt-5">
            <span className={`font-display text-4xl ${off ? 'text-wine' : ''}`}>{formatPrice(product.price)}</span>
            {product.oldPrice && <span className="text-ink/35 line-through">{formatPrice(product.oldPrice)}</span>}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-full bg-blush/50 text-sm" data-testid="market-delay">
            <Truck className="w-4 h-4 text-wine" /> Livré chez vous en <strong>{delayLabel(product.delayMin, product.delayMax)}</strong>
          </p>

          {product.options.map(o => (
            <div key={o.name} className="mt-7">
              <p className="field-label">{o.name}{choice[o.name] && <span className="normal-case tracking-normal font-normal text-ink/60"> — {choice[o.name]}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {o.values.map(v => (
                  <button key={v} onClick={() => { setChoice(c => ({ ...c, [o.name]: v })); setMissing(''); }}
                    className={`min-w-12 h-11 px-4 rounded-full border text-sm transition-colors ${choice[o.name] === v ? 'bg-ink text-ivory border-ink' : 'border-ink/15 hover:border-ink'}`}>{v}</button>
                ))}
              </div>
            </div>
          ))}
          {missing && <p className="mt-3 text-sm text-wine" role="alert">Choisissez : {missing.toLowerCase()}</p>}

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="flex items-center h-[52px] rounded-full border border-ink/15">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Moins" className="w-12 h-full grid place-items-center"><Minus className="w-4 h-4" /></button>
              <span className="w-8 text-center tabular-nums" aria-live="polite">{qty}</span>
              <button onClick={() => setQty(q => Math.min(20, q + 1))} aria-label="Plus" className="w-12 h-full grid place-items-center"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={() => add(true)} className="btn-dark flex-1 min-w-[12rem]"><ShoppingBag className="w-4 h-4" /> Ajouter au panier</button>
          </div>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 w-full inline-flex items-center justify-center gap-2 h-12 rounded-full border border-[#1f8f4e] text-[#1f8f4e] text-sm font-semibold">
            <MessageCircle className="w-4 h-4" /> Une question ? WhatsApp
          </a>

          <ul className="mt-8 grid gap-2 text-sm">
            {[
              { Icon: PackageCheck, t: 'Commandé pour vous', d: 'Chez notre partenaire, dès votre paiement.' },
              { Icon: CreditCard, t: 'Paiement à la commande', d: 'Wave, Orange Money, Free Money ou carte.' },
              { Icon: Globe2, t: 'Suivi à chaque étape', d: 'Commandé, en route, arrivé à Dakar, livré : message WhatsApp à chaque étape.' },
            ].map(({ Icon, t, d }) => (
              <li key={t} className="flex gap-3 p-4 rounded-2xl bg-white border border-ink/[0.06]">
                <Icon className="w-5 h-5 text-wine shrink-0" strokeWidth={1.5} />
                <span><strong className="font-semibold">{t}</strong><span className="block text-ink/55">{d}</span></span>
              </li>
            ))}
          </ul>

          {product.description && <div className="mt-8 text-[15px] text-ink/70 leading-relaxed whitespace-pre-line">{product.description}</div>}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="font-display text-4xl mb-8">Au Marché, dans la même catégorie</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">{related.map(p => <MarketCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
};

export default MarketProduct;
