import { canBuy, isPreorder } from '../utils/stock';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Banknote, Check, ChevronLeft, Home, MessageCircle, Phone, RefreshCw, ShoppingBag, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import type { Product } from '../data/types';
import { discountPercent, formatPrice } from '../utils/format';
import { findByCode, productCode, shortLink } from '../utils/share';
import { usePageTitle } from '../utils/usePageTitle';
import { getShowcase, trackVisit, type VisitSource } from '../services/api';
import { ProductImage } from '../components/ProductImage';
import { ProductVideo } from '../components/ProductVideo';
import { ListenButton } from '../components/ListenButton';
import { BrandMark, Wordmark } from '../components/Logo';

/** En-tête minimal des pages « statut » : logo + retour à la boutique. */
export const SimpleHeader: React.FC<{ back?: string }> = ({ back }) => (
  <header className="sticky top-0 z-40 bg-ivory/95 backdrop-blur border-b border-ink/[0.06]">
    <div className="max-w-md mx-auto h-16 px-4 grid grid-cols-[48px_1fr_48px] items-center">
      {back
        ? <Link to={back} aria-label="Retour" className="w-12 h-12 rounded-full bg-white grid place-items-center shadow-sm"><ChevronLeft className="w-6 h-6" /></Link>
        : <span />}
      <Link to="/" className="flex items-center justify-center gap-2 text-ink" aria-label="Fabima Store"><BrandMark compact className="h-9 w-auto" /><Wordmark className="h-6 w-auto" /></Link>
      <Link to="/" aria-label="Toute la boutique" className="w-12 h-12 rounded-full bg-white grid place-items-center shadow-sm"><Home className="w-5 h-5" /></Link>
    </div>
  </header>
);

/** Petite carte d'une autre pièce (grande photo + prix), réutilisée par la vitrine. */
export const SimpleCard: React.FC<{ product: Product; source?: VisitSource }> = ({ product, source }) => (
  <Link to={`/p/${productCode(product)}${source ? `?s=${source}` : ''}`} className="block rounded-[1.75rem] bg-white overflow-hidden shadow-sm active:scale-[.98] transition-transform">
    <div className="relative">
      <ProductImage src={product.images[0]} alt={product.name} className="w-full aspect-[4/5]" />
      {product.video && <ProductVideo src={product.video} className="absolute inset-0 w-full h-full" />}
      {!canBuy(product) && <span className="absolute inset-x-0 bottom-0 py-1.5 bg-ink/80 text-ivory text-center text-xs font-bold">ÉPUISÉ</span>}
    </div>
    <div className="p-3 text-center">
      <p className="text-xl font-extrabold text-wine">{formatPrice(product.price)}</p>
      <div className="flex justify-center gap-1 mt-1.5">
        {product.colors.slice(0, 5).map(c => <span key={c.name} className="w-4 h-4 rounded-full border border-black/10" style={{ background: c.hex }} />)}
      </div>
    </div>
  </Link>
);

export const SimpleProduct: React.FC = () => {
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const { products, addToCart, setCartOpen, notify } = useStore();
  const product = findByCode(products, code);
  const [imageIdx, setImageIdx] = useState(0);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [others, setOthers] = useState<Product[]>([]);
  const sizesRef = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  usePageTitle(product?.name, product ? `${product.name} — ${formatPrice(product.price)}. Voir les photos, les couleurs et commander sur WhatsApp.` : undefined, { image: product?.images[0], canonicalPath: product ? `/produit/${product.slug}` : undefined });

  useEffect(() => {
    if (!product) return;
    setColor(product.colors[0]?.name ?? '');
    setSize('');
    setImageIdx(0);
    scroller.current?.scrollTo({ left: 0 });
    const s = params.get('s');
    trackVisit(product.slug, s === 'partage' || s === 'vitrine' ? s : 'statut');
    window.scrollTo({ top: 0 });
  }, [product?.id]);
  // Une vidéo arrive avec le catalogue du serveur : on revient au début pour la montrer en premier
  useEffect(() => { setImageIdx(0); scroller.current?.scrollTo({ left: 0 }); }, [product?.video]);

  // « Autres modèles » : la vitrine du statut, sinon les nouveautés
  useEffect(() => {
    getShowcase().then(items => {
      const fromShowcase = (items ?? []).map(i => products.find(p => p.slug === i.slug)).filter((p): p is Product => !!p);
      const pool = fromShowcase.length ? fromShowcase : [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setOthers(pool.filter(p => p.id !== product?.id).slice(0, 6));
    });
  }, [products, product?.id]);

  const whatsappOrder = useMemo(() => {
    if (!product) return '';
    const lines = [
      'Bonjour Fabima 🌸 Je veux commander :',
      `*${product.name}*`,
      `💰 ${formatPrice(product.price)}`,
    ];
    if (color) lines.push(`🎨 Couleur : ${color}`);
    if (product.sizes.length) lines.push(`📏 Taille : ${size || 'je ne sais pas encore'}`);
    lines.push(`🔗 ${shortLink(product)}`);
    return buildWhatsAppLink(lines.join('\n'));
  }, [product, color, size]);

  if (!product) {
    return (
      <div className="min-h-screen bg-petal">
        <SimpleHeader />
        <div className="max-w-md mx-auto px-5 py-20 text-center">
          <p className="text-6xl">🔍</p>
          <p className="font-display text-3xl mt-4">Cette pièce n'est plus disponible</p>
          <Link to="/s" className="mt-8 inline-flex h-14 px-8 items-center rounded-full bg-ink text-ivory font-bold">Voir les nouveautés</Link>
        </div>
      </div>
    );
  }

  const off = discountPercent(product.price, product.oldPrice);
  const outOfStock = !canBuy(product);

  const addToBasket = () => {
    if (product.sizes.length && !size) {
      sizesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sizesRef.current?.classList.add('animate-pulse');
      setTimeout(() => sizesRef.current?.classList.remove('animate-pulse'), 1500);
      notify('Touchez votre taille 👇', 'info');
      return;
    }
    if (addToCart(product, { size, color, silent: true })) setCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-petal pb-40">
      <SimpleHeader back="/s" />

      <main className="max-w-md mx-auto px-4 pt-4">
        {/* Photos : on glisse avec le doigt */}
        <div className="relative rounded-[2rem] overflow-hidden bg-ivory-deep shadow-soft">
          <div ref={scroller} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
            onScroll={e => setImageIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
            {product.video && (
              <div className="relative w-full shrink-0 snap-center aspect-square">
                <ProductImage src={product.images[0]} alt={product.name} className="w-full h-full" />
                <ProductVideo src={product.video} className="absolute inset-0 w-full h-full" label={`Vidéo — ${product.name}`} />
              </div>
            )}
            {product.images.map(img => (
              <ProductImage key={img} src={img} alt={product.name} className="w-full shrink-0 snap-center aspect-square" />
            ))}
          </div>
          {off > 0 && <span className="absolute top-4 left-4 px-4 py-2 rounded-full bg-wine text-white text-lg font-extrabold">-{off}%</span>}
          <ListenButton product={product} big className="absolute bottom-3 right-3" />
          {product.images.length + (product.video ? 1 : 0) > 1 && (
            <div className="absolute bottom-5 left-5 flex gap-2">
              {[...(product.video ? [product.video] : []), ...product.images].map((m, i) => <span key={m} className={`h-2.5 rounded-full transition-all ${i === imageIdx ? 'w-7 bg-white' : 'w-2.5 bg-white/60'}`} />)}
            </div>
          )}
        </div>

        {/* Nom + prix en très gros */}
        <h1 className="font-display text-3xl leading-tight mt-4 text-center">{product.name}</h1>
        <div className="mt-2 text-center">
          <p className={`text-5xl font-extrabold tracking-tight ${off ? 'text-wine' : 'text-ink'}`}>{formatPrice(product.price)}</p>
          {product.oldPrice && <p className="text-lg text-ink/70 line-through mt-1">{formatPrice(product.oldPrice)}</p>}
        </div>
        <p className={`mt-3 mx-auto w-fit px-4 py-2 rounded-full text-base font-bold flex items-center gap-2 ${outOfStock ? 'bg-ink/10 text-ink/75' : 'bg-emerald-100 text-emerald-800'}`}>
          {outOfStock ? '❌ Épuisé' : isPreorder(product) ? <>⏳ Sur commande · {product.preorderDays} jours</> : <><Check className="w-5 h-5" /> Disponible</>}
        </p>

        {/* Couleurs : gros ronds */}
        {product.colors.length > 0 && (
          <section className="mt-7 bg-white rounded-[1.75rem] p-5">
            <p className="text-center text-lg font-bold">🎨 {product.colors.length > 1 ? `${product.colors.length} couleurs` : 'Couleur'}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {product.colors.map(c => (
                <button key={c.name} onClick={() => setColor(c.name)} aria-pressed={color === c.name} aria-label={c.name} className="flex flex-col items-center gap-1.5 w-20">
                  <span className={`relative w-16 h-16 rounded-full border-4 transition-all ${color === c.name ? 'border-ink scale-110' : 'border-white shadow'}`} style={{ background: c.hex }}>
                    {color === c.name && <Check className="absolute inset-0 m-auto w-7 h-7 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.6)]" strokeWidth={3} />}
                  </span>
                  <span className="text-xs text-center leading-tight">{c.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Tailles : gros boutons */}
        {product.sizes.length > 0 && (
          <section ref={sizesRef} className="mt-4 bg-white rounded-[1.75rem] p-5">
            <p className="text-center text-lg font-bold">📏 Taille</p>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {product.sizes.map(s => (
                <button key={s} onClick={() => setSize(s)} aria-pressed={size === s}
                  className={`h-16 rounded-2xl text-2xl font-extrabold transition-colors ${size === s ? 'bg-ink text-ivory' : 'bg-ivory-deep text-ink'}`}>{s}</button>
              ))}
            </div>
            <Link to="/faq#tailles" className="block text-center text-sm text-ink/70 mt-3 underline">Je ne connais pas ma taille</Link>
          </section>
        )}

        {/* Pictogrammes : livraison, paiement, échange */}
        <section className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { Icon: Truck, t: 'Livraison 24h' },
            { Icon: Banknote, t: 'Payer à la livraison' },
            { Icon: RefreshCw, t: 'Échange 7 jours' },
          ].map(({ Icon, t }) => (
            <div key={t} className="bg-white rounded-3xl py-4 px-2">
              <Icon className="w-8 h-8 mx-auto text-gold-dark" strokeWidth={1.6} />
              <p className="text-xs font-semibold mt-2 leading-tight">{t}</p>
            </div>
          ))}
        </section>

        <details className="mt-4 bg-white rounded-[1.75rem] p-5 text-sm text-ink/75">
          <summary className="font-bold text-base cursor-pointer">📖 Plus d'informations</summary>
          <p className="mt-3 leading-relaxed">{product.description}</p>
          <p className="mt-2"><strong>Matière :</strong> {product.material}</p>
          <Link to={`/produit/${product.slug}`} className="inline-block mt-3 underline">Voir la fiche complète</Link>
        </details>

        {/* Autres modèles */}
        {others.length > 0 && (
          <section className="mt-10">
            <p className="text-center text-xl font-bold">👗 Autres modèles</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {others.map(p => <SimpleCard key={p.id} product={p} source="vitrine" />)}
            </div>
            <Link to="/s" className="mt-5 flex h-14 items-center justify-center rounded-full bg-white font-bold shadow-sm">Voir tout</Link>
          </section>
        )}
      </main>

      {/* Actions fixes en bas de l'écran */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-ivory/95 backdrop-blur border-t border-ink/[0.06] pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto px-4 py-3 space-y-2">
          <a href={whatsappOrder} target="_blank" rel="noopener noreferrer"
            className="flex h-16 items-center justify-center gap-3 rounded-full bg-[#1f8f4e] text-white text-lg font-extrabold shadow-luxe active:scale-[.98] transition-transform">
            <MessageCircle className="w-7 h-7" strokeWidth={2} /> Commander sur WhatsApp
          </a>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={addToBasket} disabled={outOfStock} className="flex h-12 items-center justify-center gap-2 rounded-full bg-white border border-ink/10 font-bold disabled:opacity-40">
              <ShoppingBag className="w-5 h-5" /> Panier
            </button>
            <a href={`tel:${SITE_CONFIG.phoneRaw}`} className="flex h-12 items-center justify-center gap-2 rounded-full bg-white border border-ink/10 font-bold">
              <Phone className="w-5 h-5" /> Appeler
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
