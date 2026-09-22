import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Heart, MessageCircle, Minus, Plus, RefreshCw, Ruler, Share2, ShieldCheck, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/catalog';
import { SITE_CONFIG, buildProductWhatsAppMessage, buildWhatsAppLink } from '../config/site';
import { discountPercent, formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { useInView } from '../utils/hooks';
import { ProductImage } from '../components/ProductImage';
import { ColorSwatch } from '../components/ColorSwatch';
import { Stars } from '../components/Stars';
import { ProductCard } from '../components/ProductCard';
import { Reveal } from '../components/Reveal';

/** Image principale avec zoom qui suit le curseur (desktop). */
const ZoomImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [origin, setOrigin] = useState('50% 50%');
  const [zoom, setZoom] = useState(false);
  return (
    <div className="relative w-full h-full overflow-hidden cursor-zoom-in"
      onMouseEnter={() => setZoom(true)} onMouseLeave={() => setZoom(false)}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
      }}>
      <div className="w-full h-full transition-transform duration-300 ease-out" style={{ transform: zoom ? 'scale(1.8)' : 'scale(1)', transformOrigin: origin }}>
        <ProductImage src={src} alt={alt} className="w-full h-full" />
      </div>
    </div>
  );
};

const Accordion: React.FC<{ title: string; open: boolean; onToggle: () => void; children: React.ReactNode; id?: string }> = ({ title, open, onToggle, children, id }) => (
  <div className="border-b border-ink/10" id={id}>
    <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center justify-between py-5 text-[11px] uppercase tracking-[0.22em] font-semibold">
      {title}<ChevronDown className={`w-4 h-4 transition-transform duration-500 ${open ? 'rotate-180' : ''}`} strokeWidth={1.5} />
    </button>
    <div className={`grid transition-all duration-500 ease-luxe ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
      <div className="overflow-hidden"><div className="pb-6 text-sm text-ink/70 leading-relaxed">{children}</div></div>
    </div>
  </div>
);

const ReviewForm: React.FC<{ onSubmit: (r: { author: string; rating: number; comment: string }) => void }> = ({ onSubmit }) => {
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  if (!open) return <button onClick={() => setOpen(true)} className="btn-outline !h-11 !px-6 mt-2">Donner mon avis</button>;
  return (
    <form className="space-y-3 mt-2 p-5 bg-ivory-deep/60" onSubmit={e => {
      e.preventDefault();
      if (!author.trim() || comment.trim().length < 10) return;
      onSubmit({ author: author.trim(), rating, comment: comment.trim() });
      setOpen(false); setAuthor(''); setComment(''); setRating(5);
    }}>
      <div className="flex items-center justify-between"><span className="field-label !mb-0">Votre note</span><Stars rating={rating} size={18} onRate={setRating} /></div>
      <input required value={author} onChange={e => setAuthor(e.target.value)} placeholder="Prénom et initiale (ex : Awa D.)" aria-label="Votre nom" maxLength={40} className="field" />
      <textarea required minLength={10} value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={400} placeholder="Qualité, taille, confort… (10 caractères minimum)" aria-label="Votre avis" className="field resize-none" />
      <div className="flex gap-2"><button type="button" onClick={() => setOpen(false)} className="btn-outline !h-11 flex-1">Annuler</button><button className="btn-dark !h-11 flex-1">Publier</button></div>
    </form>
  );
};

export const ProductDetail: React.FC = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { getProduct, products, addToCart, toggleWishlist, isInWishlist, markViewed, setCartOpen, notify, addReview } = useStore();
  const product = getProduct(slug);

  const [imageIdx, setImageIdx] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [openSection, setOpenSection] = useState<string | null>('details');
  const [sizeError, setSizeError] = useState(false);
  const sizeRef = useRef<HTMLDivElement>(null);
  const { ref: buyRef, inView: buyVisible } = useInView<HTMLDivElement>('0px');
  const [pastBuy, setPastBuy] = useState(false);

  usePageTitle(product?.name);

  useEffect(() => {
    if (!product) return;
    markViewed(product.id);
    setImageIdx(0);
    setSize('');
    setColor(product.colors[0]?.name ?? '');
    setQty(1);
    setSizeError(false);
  }, [product?.id]);

  // Barre d'achat mobile : visible une fois les boutons principaux dépassés
  useEffect(() => {
    const onScroll = () => {
      const el = buyRef.current;
      if (el) setPastBuy(el.getBoundingClientRect().bottom < 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [buyRef]);

  const complete = useMemo(() => {
    if (!product) return [];
    return products.filter(p => p.category !== product.category && p.stock > 0 && (p.gender === product.gender || p.gender === 'unisexe' || product.gender === 'unisexe'))
      .sort((a, b) => b.rating - a.rating).slice(0, 4);
  }, [products, product]);

  if (!product) {
    return (
      <div className="max-w-xl mx-auto text-center py-40 px-5">
        <p className="eyebrow">Article introuvable</p>
        <h1 className="font-display text-5xl mt-4">Cette pièce s'est envolée</h1>
        <p className="text-ink/60 mt-4">Elle n'est plus disponible ou a été retirée de la boutique.</p>
        <Link to="/boutique" className="btn-dark mt-10">Retour à la boutique</Link>
      </div>
    );
  }

  const category = CATEGORIES.find(c => c.id === product.category);
  const off = discountPercent(product.price, product.oldPrice);
  const liked = isInWishlist(product.id);
  const outOfStock = product.stock <= 0;
  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  const validate = () => {
    if (product.sizes.length > 0 && !size) {
      setSizeError(true);
      sizeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      notify('Veuillez choisir une taille', 'error');
      return false;
    }
    return true;
  };
  const handleAdd = () => { if (validate() && addToCart(product, { size, color, quantity: qty, silent: true })) setCartOpen(true); };
  const handleBuyNow = () => { if (validate() && addToCart(product, { size, color, quantity: qty, silent: true })) navigate('/commande'); };

  const share = async () => {
    const data = { title: product.name, text: `${product.name} — ${formatPrice(product.price)} chez Fabima Store`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(window.location.href); notify('Lien copié dans le presse-papiers', 'info'); }
    } catch { /* partage annulé */ }
  };

  const waLink = buildWhatsAppLink(buildProductWhatsAppMessage({
    name: product.name, price: product.price, size: size || undefined, color: color || undefined, url: window.location.href,
  }));
  const toggle = (id: string) => setOpenSection(s => (s === id ? null : id));

  return (
    <div>
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-6">
        <nav className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-ink/45 mb-6 flex-wrap" aria-label="Fil d'Ariane">
          <Link to="/" className="hover:text-ink">Accueil</Link><ChevronRight className="w-3 h-3" />
          <Link to={`/boutique/${product.category}`} className="hover:text-ink">{category?.name}</Link><ChevronRight className="w-3 h-3" />
          <span className="text-ink line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-20 items-start">
          {/* Galerie */}
          <div className="lg:flex lg:items-start lg:gap-4 min-w-0">
            {product.images.length > 1 && (
              <div className="hidden lg:flex flex-col gap-3 w-20 shrink-0">
                {product.images.map((img, i) => (
                  <button key={img} onClick={() => setImageIdx(i)} aria-label={`Image ${i + 1}`}
                    className={`aspect-[3/4] overflow-hidden transition-opacity ${i === imageIdx ? 'ring-1 ring-ink ring-offset-2 ring-offset-ivory' : 'opacity-50 hover:opacity-100'}`}>
                    <ProductImage src={img} alt="" className="w-full h-full" />
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1 min-w-0 aspect-[4/5] bg-ivory-deep">
              <div key={imageIdx} className="absolute inset-0 animate-fade-in"><ZoomImage src={product.images[imageIdx]} alt={product.name} /></div>
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none">
                {off > 0 && <span className="px-3 py-1.5 bg-wine text-white text-[9px] uppercase tracking-[0.2em] font-semibold">-{off}%</span>}
                {product.isNew && <span className="px-3 py-1.5 bg-ivory text-ink text-[9px] uppercase tracking-[0.2em] font-semibold">Nouveau</span>}
              </div>
              {product.images.length > 1 && (
                <div className="lg:hidden absolute bottom-4 inset-x-0 flex justify-center gap-2">
                  {product.images.map((img, i) => (
                    <button key={img} onClick={() => setImageIdx(i)} aria-label={`Image ${i + 1}`} className={`h-[2px] transition-all ${i === imageIdx ? 'w-8 bg-ink' : 'w-4 bg-ink/30'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Informations */}
          <div className="lg:sticky lg:top-36 lg:self-start">
            <div className="flex items-start justify-between gap-4">
              <p className="eyebrow">{product.subcategory} · {product.gender === 'unisexe' ? 'Mixte' : product.gender === 'femme' ? 'Femme' : 'Homme'}</p>
              <button onClick={share} aria-label="Partager" className="w-9 h-9 -mt-2 grid place-items-center rounded-full hover:bg-ink/5"><Share2 className="w-4 h-4" strokeWidth={1.5} /></button>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl mt-3 leading-[0.98]">{product.name}</h1>
            <button onClick={() => { setOpenSection('avis'); document.getElementById('avis')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
              className="mt-4 flex items-center gap-2 text-xs text-ink/55 hover:text-ink">
              <Stars rating={product.rating} /> <span>{product.rating.toFixed(1)} · {product.reviewCount} avis</span>
            </button>

            <div className="mt-7 flex items-baseline gap-4">
              <span className={`text-2xl font-semibold ${off ? 'text-wine' : ''}`}>{formatPrice(product.price)}</span>
              {product.oldPrice && <span className="text-ink/35 line-through">{formatPrice(product.oldPrice)}</span>}
            </div>
            <p className="text-[11px] text-ink/45 mt-1">TTC · ou payez en toute sérénité à la livraison</p>

            <p className="mt-7 text-[15px] text-ink/70 leading-relaxed">{product.description}</p>

            <div className="hairline my-8" />

            {product.colors.length > 0 && (
              <div>
                <p className="field-label">Couleur — <span className="normal-case tracking-normal font-normal text-ink">{color}</span></p>
                <div className="flex gap-1.5">{product.colors.map(c => <ColorSwatch key={c.name} color={c} size={28} selected={color === c.name} onClick={() => setColor(c.name)} />)}</div>
              </div>
            )}

            {product.sizes.length > 0 && (
              <div className="mt-7" ref={sizeRef}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`field-label !mb-0 ${sizeError ? '!text-wine' : ''}`}>{sizeError ? 'Choisissez votre taille' : 'Taille'}</p>
                  <Link to="/faq#tailles" className="text-[11px] flex items-center gap-1.5 link-luxe text-ink/60"><Ruler className="w-3.5 h-3.5" strokeWidth={1.5} /> Guide des tailles</Link>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {product.sizes.map(s => (
                    <button key={s} onClick={() => { setSize(s); setSizeError(false); }} aria-pressed={size === s}
                      className={`h-12 text-sm border transition-colors duration-300 ${
                        size === s ? 'bg-ink text-ivory border-ink' : sizeError ? 'border-wine/50 hover:border-wine' : 'border-ink/15 hover:border-ink'}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            <p className={`mt-6 text-xs flex items-center gap-2 ${outOfStock ? 'text-wine' : product.stock <= 5 ? 'text-amber-800' : 'text-emerald-800'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${outOfStock ? 'bg-wine' : product.stock <= 5 ? 'bg-amber-600 animate-pulse' : 'bg-emerald-600'}`} />
              {outOfStock ? 'Épuisé — bientôt de retour' : product.stock <= 5 ? `Plus que ${product.stock} pièce${product.stock > 1 ? 's' : ''} disponible${product.stock > 1 ? 's' : ''}` : 'En stock — expédié sous 24h'}
            </p>

            <div ref={buyRef} className="mt-5 flex gap-2">
              <div className="flex items-center border border-ink/15 h-[52px]">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Diminuer" className="w-11 h-full grid place-items-center hover:bg-ink/5"><Minus className="w-3.5 h-3.5" /></button>
                <span className="w-8 text-center" aria-live="polite">{qty}</span>
                <button onClick={() => setQty(q => Math.min(Math.max(1, product.stock), q + 1))} aria-label="Augmenter" className="w-11 h-full grid place-items-center hover:bg-ink/5"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <button onClick={handleAdd} disabled={outOfStock} className="btn-dark flex-1">{outOfStock ? 'Épuisé' : 'Ajouter au panier'}</button>
              <button onClick={() => toggleWishlist(product.id)} aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className="w-[52px] h-[52px] border border-ink/15 grid place-items-center hover:border-ink transition-colors shrink-0">
                <Heart className={`w-4 h-4 ${liked ? 'fill-wine text-wine' : ''}`} strokeWidth={1.5} />
              </button>
            </div>
            <button onClick={handleBuyNow} disabled={outOfStock} className="btn-gold w-full mt-2">Acheter maintenant</button>
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="mt-2 w-full h-[52px] border border-ink/15 flex items-center justify-center gap-2.5 text-[11px] uppercase tracking-[0.22em] font-semibold hover:border-[#1f8f4e] hover:text-[#1f8f4e] transition-colors">
              <MessageCircle className="w-4 h-4" strokeWidth={1.5} /> Commander sur WhatsApp
            </a>

            <ul className="mt-8 grid grid-cols-3 border border-ink/10 divide-x divide-ink/10 text-center text-[11px] text-ink/65">
              {[
                { Icon: Truck, t: `Offerte dès ${(SITE_CONFIG.freeShippingThreshold / 1000).toFixed(0)} 000 F` },
                { Icon: RefreshCw, t: 'Échange 7 jours' },
                { Icon: ShieldCheck, t: 'Paiement sécurisé' },
              ].map(({ Icon, t }) => (
                <li key={t} className="py-4 px-2"><Icon className="w-4 h-4 mx-auto text-gold-dark mb-2" strokeWidth={1.4} />{t}</li>
              ))}
            </ul>

            <div className="mt-8 border-t border-ink/10">
              <Accordion title="Détails & composition" open={openSection === 'details'} onToggle={() => toggle('details')}>
                <ul className="space-y-2">
                  {product.details.map(d => <li key={d} className="flex gap-3"><span className="text-gold">—</span>{d}</li>)}
                  <li className="flex gap-3 text-ink/45"><span className="text-gold">—</span>Référence {product.id}</li>
                </ul>
              </Accordion>
              <Accordion title="Livraison & échanges" open={openSection === 'livraison'} onToggle={() => toggle('livraison')}>
                <p><strong className="text-ink">Dakar</strong> : livraison en 24h, de 1 500 à 2 000 FCFA selon le quartier.</p>
                <p className="mt-2"><strong className="text-ink">Régions</strong> : de 48h à 5 jours selon la destination.</p>
                <p className="mt-2">Livraison <strong className="text-ink">offerte dès {formatPrice(SITE_CONFIG.freeShippingThreshold)}</strong>. Échange gratuit sous 7 jours pour toute pièce non portée.</p>
              </Accordion>
              <Accordion id="avis" title={`Avis clients (${product.reviewCount})`} open={openSection === 'avis'} onToggle={() => toggle('avis')}>
                <div className="flex items-center gap-4 mb-5">
                  <span className="font-display text-5xl text-ink">{product.rating.toFixed(1)}</span>
                  <span><Stars rating={product.rating} size={15} /><span className="block text-xs mt-1">{product.reviewCount} avis vérifiés</span></span>
                </div>
                {product.reviews?.length ? (
                  <ul className="space-y-5 mb-6">
                    {product.reviews.slice(0, 5).map(r => (
                      <li key={r.author + r.date} className="pb-5 border-b border-ink/5 last:border-0">
                        <div className="flex items-center justify-between"><strong className="text-ink text-[13px]">{r.author}</strong><Stars rating={r.rating} size={11} /></div>
                        <p className="mt-2">{r.comment}</p>
                        <p className="text-[11px] text-ink/40 mt-1.5">{new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mb-5">Soyez la première personne à partager votre expérience.</p>}
                <ReviewForm onSubmit={r => { addReview(product.id, r); notify('Merci pour votre avis !'); }} />
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      {complete.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28">
          <Reveal className="mb-10"><p className="eyebrow">Accordez votre silhouette</p><h2 className="font-display text-4xl sm:text-5xl mt-3">Complétez le <em>look</em></h2></Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-12">{complete.map(p => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
      {related.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-24">
          <Reveal className="mb-10"><p className="eyebrow">{category?.name}</p><h2 className="font-display text-4xl sm:text-5xl mt-3">Vous aimerez aussi</h2></Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-12">{related.map(p => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}

      {/* Barre d'achat collante (mobile) */}
      <div className={`lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ivory/95 backdrop-blur border-t border-ink/10 px-4 py-3 flex items-center gap-3 transition-transform duration-500 ease-luxe ${pastBuy && !buyVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg leading-tight truncate">{product.name}</p>
          <p className="text-xs text-ink/60">{formatPrice(product.price)}{size && ` · T. ${size}`}</p>
        </div>
        <button onClick={handleAdd} disabled={outOfStock} className="btn-dark !h-12 !px-5 shrink-0">{outOfStock ? 'Épuisé' : 'Ajouter'}</button>
      </div>
    </div>
  );
};
