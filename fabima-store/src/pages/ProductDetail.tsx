import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Heart, MessageCircle, Minus, Plus, RefreshCw, Ruler, ShieldCheck, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/catalog';
import { buildProductWhatsAppMessage, buildWhatsAppLink } from '../config/site';
import { discountPercent, formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { ProductImage } from '../components/ProductImage';
import { ColorSwatch } from '../components/ColorSwatch';
import { Stars } from '../components/Stars';
import { ProductCard } from '../components/ProductCard';

export const ProductDetail: React.FC = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { getProduct, products, addToCart, toggleWishlist, isInWishlist, markViewed, setCartOpen, notify } = useStore();
  const product = getProduct(slug);

  const [imageIdx, setImageIdx] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'description' | 'livraison' | 'avis'>('description');
  const [sizeError, setSizeError] = useState(false);

  usePageTitle(product?.name);

  useEffect(() => {
    if (!product) return;
    markViewed(product.id);
    setImageIdx(0);
    setSize('');
    setColor(product.colors[0]?.name ?? '');
    setQty(1);
    setSizeError(false);
    window.scrollTo({ top: 0 });
  }, [product?.id]);

  if (!product) {
    return (
      <div className="max-w-xl mx-auto text-center py-32 px-4">
        <h1 className="font-display text-4xl">Article introuvable</h1>
        <p className="text-ink/60 mt-3">Cet article n'existe plus ou a été retiré de la boutique.</p>
        <Link to="/boutique" className="inline-block mt-8 px-6 py-3 rounded-full bg-ink text-ivory font-semibold">Retour à la boutique</Link>
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
      notify('Veuillez choisir une taille', 'error');
      return false;
    }
    return true;
  };

  const handleAdd = () => {
    if (!validate()) return;
    addToCart(product, { size, color, quantity: qty });
    setCartOpen(true);
  };

  const handleBuyNow = () => {
    if (!validate()) return;
    addToCart(product, { size, color, quantity: qty });
    navigate('/commande');
  };

  const waLink = buildWhatsAppLink(buildProductWhatsAppMessage({
    name: product.name, price: product.price, size: size || undefined, color: color || undefined, url: window.location.href,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <nav className="flex items-center gap-1.5 text-xs text-ink/50 mb-6 flex-wrap" aria-label="Fil d'Ariane">
        <Link to="/" className="hover:text-ink">Accueil</Link><ChevronRight className="w-3 h-3" />
        <Link to={`/boutique/${product.category}`} className="hover:text-ink">{category?.name}</Link><ChevronRight className="w-3 h-3" />
        <span className="text-ink line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Galerie */}
        <div className="flex flex-col-reverse sm:flex-row gap-4">
          {product.images.length > 1 && (
            <div className="flex sm:flex-col gap-3">
              {product.images.map((img, i) => (
                <button key={img} onClick={() => setImageIdx(i)} aria-label={`Image ${i + 1}`}
                  className={`w-20 h-24 rounded-xl overflow-hidden border-2 ${i === imageIdx ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <ProductImage src={img} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1 aspect-[4/5] rounded-3xl overflow-hidden bg-ivory-deep">
            <ProductImage key={imageIdx} src={product.images[imageIdx]} alt={product.name} className="w-full h-full animate-fade-up" />
            {off > 0 && <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-[#a3142b] text-white text-xs font-semibold">-{off}%</span>}
          </div>
        </div>

        {/* Infos */}
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gold-dark">{product.subcategory}</p>
          <h1 className="font-display text-4xl sm:text-5xl mt-2 leading-tight">{product.name}</h1>
          <button onClick={() => setTab('avis')} className="mt-3 flex items-center gap-2 text-sm text-ink/60">
            <Stars rating={product.rating} /> {product.rating.toFixed(1)} · {product.reviewCount} avis
          </button>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatPrice(product.price)}</span>
            {product.oldPrice && <span className="text-lg text-ink/40 line-through">{formatPrice(product.oldPrice)}</span>}
            {off > 0 && <span className="text-sm font-semibold text-[#a3142b]">Économisez {formatPrice(product.oldPrice! - product.price)}</span>}
          </div>

          <p className="mt-6 text-ink/70 leading-relaxed">{product.description}</p>

          {product.colors.length > 0 && (
            <div className="mt-8">
              <p className="text-sm mb-3">Couleur : <strong>{color}</strong></p>
              <div className="flex gap-3">{product.colors.map(c => <ColorSwatch key={c.name} color={c} size={32} selected={color === c.name} onClick={() => setColor(c.name)} />)}</div>
            </div>
          )}

          {product.sizes.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <p className={`text-sm ${sizeError ? 'text-[#a3142b] font-semibold' : ''}`}>Taille : <strong>{size || 'à choisir'}</strong></p>
                <Link to="/faq#tailles" className="text-xs flex items-center gap-1 underline underline-offset-4 text-ink/60"><Ruler className="w-3.5 h-3.5" /> Guide des tailles</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(s => (
                  <button key={s} onClick={() => { setSize(s); setSizeError(false); }}
                    className={`min-w-12 h-12 px-3 rounded-xl border text-sm font-medium transition-colors ${
                      size === s ? 'bg-ink text-ivory border-ink' : sizeError ? 'border-[#a3142b]' : 'border-ink/20 hover:border-ink'}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <p className={`mt-6 text-sm font-medium ${outOfStock ? 'text-[#a3142b]' : product.stock <= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {outOfStock ? '● Épuisé — revient bientôt' : product.stock <= 5 ? `● Plus que ${product.stock} en stock, commandez vite !` : '● En stock, expédié sous 24h'}
          </p>

          <div className="mt-6 flex gap-3">
            <div className="flex items-center border border-ink/20 rounded-full">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Diminuer" className="p-3.5"><Minus className="w-4 h-4" /></button>
              <span className="w-8 text-center font-medium">{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} aria-label="Augmenter" className="p-3.5"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={handleAdd} disabled={outOfStock}
              className="flex-1 py-4 rounded-full bg-ink text-ivory font-semibold hover:bg-ink-soft disabled:opacity-40 transition-colors">
              Ajouter au panier
            </button>
            <button onClick={() => toggleWishlist(product.id)} aria-label="Favoris"
              className="w-14 rounded-full border border-ink/20 grid place-items-center hover:border-ink">
              <Heart className={`w-5 h-5 ${liked ? 'fill-[#a3142b] text-[#a3142b]' : ''}`} />
            </button>
          </div>
          <button onClick={handleBuyNow} disabled={outOfStock} className="mt-3 w-full py-4 rounded-full bg-gold text-ink font-semibold hover:bg-gold-light disabled:opacity-40">
            Acheter maintenant
          </button>
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="mt-3 w-full py-3.5 rounded-full border border-[#25D366] text-[#128C7E] font-semibold flex items-center justify-center gap-2 hover:bg-[#25D366]/10">
            <MessageCircle className="w-5 h-5" /> Commander sur WhatsApp
          </a>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs">
            {[
              { Icon: Truck, t: 'Livraison 24h à Dakar' },
              { Icon: RefreshCw, t: 'Échange sous 7 jours' },
              { Icon: ShieldCheck, t: 'Paiement sécurisé' },
            ].map(({ Icon, t }) => (
              <div key={t} className="p-3 rounded-2xl bg-white"><Icon className="w-5 h-5 mx-auto text-gold-dark mb-1.5" />{t}</div>
            ))}
          </div>

          {/* Onglets */}
          <div className="mt-10 border-b border-ink/10 flex gap-6">
            {([['description', 'Détails'], ['livraison', 'Livraison & retours'], ['avis', `Avis (${product.reviewCount})`]] as const).map(([id, l]) => (
              <button key={id} onClick={() => setTab(id)} className={`pb-3 text-sm font-medium border-b-2 -mb-px ${tab === id ? 'border-ink' : 'border-transparent text-ink/50'}`}>{l}</button>
            ))}
          </div>
          <div className="py-6 text-sm text-ink/75 leading-relaxed">
            {tab === 'description' && (
              <ul className="space-y-2">
                {product.details.map(d => <li key={d} className="flex gap-2"><span className="text-gold">✦</span>{d}</li>)}
                <li className="flex gap-2 text-ink/50"><span className="text-gold">✦</span>Réf. {product.id}</li>
              </ul>
            )}
            {tab === 'livraison' && (
              <div className="space-y-3">
                <p><strong>Dakar :</strong> livraison en 24h, de 1 500 à 2 500 FCFA selon le quartier.</p>
                <p><strong>Régions :</strong> 48h à 5 jours selon la destination.</p>
                <p><strong>Offerte</strong> dès 50 000 FCFA d'achat.</p>
                <p><strong>Échanges :</strong> gratuits sous 7 jours (article non porté, dans son emballage d'origine).</p>
              </div>
            )}
            {tab === 'avis' && (
              product.reviews?.length ? (
                <ul className="space-y-5">
                  {product.reviews.map(r => (
                    <li key={r.author + r.date} className="border-b border-ink/10 pb-4">
                      <div className="flex items-center justify-between"><strong>{r.author}</strong><Stars rating={r.rating} size={12} /></div>
                      <p className="mt-1.5">{r.comment}</p>
                      <p className="text-xs text-ink/40 mt-1">{new Date(r.date).toLocaleDateString('fr-FR')}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Note moyenne de <strong>{product.rating.toFixed(1)}/5</strong> sur {product.reviewCount} avis clients vérifiés.</p>
              )
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-3xl sm:text-4xl mb-8">Vous aimerez aussi</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
};
