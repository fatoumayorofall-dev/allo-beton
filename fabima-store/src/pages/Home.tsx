import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw, ShieldCheck, Sparkles, Truck, Smartphone, Quote } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/catalog';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { Stars } from '../components/Stars';
import { usePageTitle } from '../utils/usePageTitle';

const HERO_SLIDES = [
  {
    kicker: 'Nouvelle collection · Automne 2026',
    title: 'L\'élégance,\njusqu\'au bout des pieds',
    text: 'Escarpins, mocassins et sneakers soigneusement sélectionnés pour chaque moment de votre vie.',
    cta: { label: 'Découvrir les chaussures', to: '/boutique/chaussures' },
    image: 'https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg?auto=compress&cs=tinysrgb&w=1400',
  },
  {
    kicker: 'Maroquinerie',
    title: 'Le sac qui\nfait la différence',
    text: 'Sacs à main structurés, cabas en wax faits à Dakar et pochettes de soirée : trouvez votre signature.',
    cta: { label: 'Voir les sacs', to: '/boutique/sacs' },
    image: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=1400',
  },
  {
    kicker: 'Jusqu\'à -20 %',
    title: 'Les petits prix\ndes grands jours',
    text: 'Profitez de nos offres sur une sélection de bijoux, accessoires et prêt-à-porter.',
    cta: { label: 'J\'en profite', to: '/boutique?promo=1' },
    image: 'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=1400',
  },
];

const TESTIMONIALS = [
  { name: 'Aïssatou N.', city: 'Mermoz', text: 'Commande reçue le lendemain, emballage soigné et le sac est encore plus beau en vrai. Je recommande Fabima à toutes mes amies !', rating: 5 },
  { name: 'Ousmane F.', city: 'Thiès', text: 'Mocassins de très bonne qualité, payés avec Wave en 2 minutes. Service client très réactif sur WhatsApp.', rating: 5 },
  { name: 'Coumba S.', city: 'Almadies', text: 'J\'ai échangé ma pointure sans aucun souci. Les escarpins sont sublimes, parfaits pour le mariage de ma sœur.', rating: 5 },
];

export const Home: React.FC = () => {
  usePageTitle();
  const { products, recentlyViewed, getProduct } = useStore();
  const [slide, setSlide] = useState(0);
  const [tab, setTab] = useState<'bestsellers' | 'nouveautes' | 'promos'>('bestsellers');

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 6500);
    return () => clearInterval(t);
  }, []);

  const tabProducts = useMemo(() => {
    if (tab === 'nouveautes') return [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
    if (tab === 'promos') return products.filter(p => p.oldPrice).slice(0, 8);
    return products.filter(p => p.isBestseller).slice(0, 8);
  }, [tab, products]);

  const recent = recentlyViewed.map(getProduct).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 4);
  const current = HERO_SLIDES[slide];

  return (
    <div>
      {/* ───── HERO ───── */}
      <section className="relative h-[78vh] min-h-[520px] max-h-[760px] overflow-hidden bg-ink">
        {HERO_SLIDES.map((s, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}>
            <ProductImage src={s.image} alt="" className="w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/50 to-transparent" />
          </div>
        ))}
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          <div key={slide} className="max-w-xl text-ivory animate-fade-up">
            <p className="text-gold-light uppercase tracking-[0.3em] text-xs mb-5">{current.kicker}</p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05] whitespace-pre-line">{current.title}</h1>
            <p className="mt-6 text-ivory/80 text-lg max-w-md">{current.text}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to={current.cta.to} className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-ivory text-ink font-semibold hover:bg-gold-light transition-colors">
                {current.cta.label} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/boutique" className="inline-flex items-center px-7 py-4 rounded-full border border-ivory/40 text-ivory font-semibold hover:bg-ivory/10">
                Toute la boutique
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-4">
          <button onClick={() => setSlide(s => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} aria-label="Précédent" className="p-2 rounded-full bg-ivory/15 text-ivory hover:bg-ivory/30"><ChevronLeft className="w-4 h-4" /></button>
          {HERO_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} aria-label={`Diapositive ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-10 bg-gold-light' : 'w-4 bg-ivory/40'}`} />
          ))}
          <button onClick={() => setSlide(s => (s + 1) % HERO_SLIDES.length)} aria-label="Suivant" className="p-2 rounded-full bg-ivory/15 text-ivory hover:bg-ivory/30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </section>

      {/* ───── ENGAGEMENTS ───── */}
      <section className="border-b border-ink/10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { Icon: Truck, title: 'Livraison 24h', text: 'à Dakar, 48–72h en régions' },
            { Icon: Smartphone, title: 'Paiement mobile', text: 'Wave, Orange Money, Free Money' },
            { Icon: RefreshCw, title: 'Échange 7 jours', text: 'taille ou couleur, sans frais' },
            { Icon: ShieldCheck, title: 'Qualité garantie', text: 'produits contrôlés un à un' },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-ivory-deep grid place-items-center shrink-0"><Icon className="w-5 h-5 text-gold-dark" /></span>
              <div><p className="font-semibold text-sm">{title}</p><p className="text-xs text-ink/55">{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ───── CATÉGORIES ───── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <SectionTitle kicker="Nos univers" title="Achetez par catégorie" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {CATEGORIES.map((c, i) => (
            <Link key={c.id} to={`/boutique/${c.id}`}
              className={`group relative overflow-hidden rounded-2xl ${i === 0 ? 'col-span-2 md:col-span-1' : ''} aspect-[4/5] md:aspect-[3/4]`}>
              <ProductImage src={c.image} alt={c.name} className="w-full h-full transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-4 text-ivory">
                <h3 className="font-display text-2xl">{c.name}</h3>
                <p className="text-xs text-ivory/70 mt-1 line-clamp-1">{c.description}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold-light">Explorer <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───── SÉLECTION ───── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <SectionTitle kicker="La sélection" title="Nos pièces du moment" />
        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {([['bestsellers', 'Best-sellers'], ['nouveautes', 'Nouveautés'], ['promos', 'Promotions']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${tab === id ? 'bg-ink text-ivory' : 'border border-ink/15 hover:border-ink'}`}>{label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
          {tabProducts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
        <div className="text-center mt-12">
          <Link to="/boutique" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-ink font-semibold hover:bg-ink hover:text-ivory transition-colors">
            Voir tout le catalogue <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ───── BANNIÈRE WAX ───── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="relative rounded-3xl overflow-hidden bg-ink grid md:grid-cols-2">
          <div className="p-10 sm:p-14 text-ivory flex flex-col justify-center">
            <p className="text-gold-light uppercase tracking-[0.3em] text-xs mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Made in Dakar</p>
            <h2 className="font-display text-4xl sm:text-5xl leading-tight">La collection Teranga</h2>
            <p className="mt-5 text-ivory/70 max-w-md">Des sacs et robes en wax confectionnés par nos artisanes sénégalaises. Chaque pièce est unique et raconte une histoire.</p>
            <Link to="/boutique?q=wax" className="mt-8 self-start inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gold text-ink font-semibold hover:bg-gold-light">
              Découvrir la collection <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <ProductImage src="https://images.pexels.com/photos/6044266/pexels-photo-6044266.jpeg?auto=compress&cs=tinysrgb&w=1000" alt="Collection Teranga en wax" className="w-full h-72 md:h-full min-h-[320px]" />
        </div>
      </section>

      {/* ───── TÉMOIGNAGES ───── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <SectionTitle kicker="Elles & ils nous font confiance" title="Plus de 5 000 clients satisfaits" />
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map(t => (
            <figure key={t.name} className="bg-white rounded-3xl p-7 shadow-sm border border-ink/5">
              <Quote className="w-8 h-8 text-gold-light" />
              <blockquote className="mt-3 text-ink/80 leading-relaxed">{t.text}</blockquote>
              <figcaption className="mt-5 flex items-center justify-between">
                <span><strong className="block text-sm">{t.name}</strong><span className="text-xs text-ink/50">{t.city}</span></span>
                <Stars rating={t.rating} />
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          <SectionTitle kicker="Pour vous" title="Vus récemment" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10">
            {recent.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export const SectionTitle: React.FC<{ kicker: string; title: string }> = ({ kicker, title }) => (
  <div className="text-center mb-10">
    <p className="text-gold-dark uppercase tracking-[0.3em] text-xs mb-3">{kicker}</p>
    <h2 className="font-display text-4xl sm:text-5xl">{title}</h2>
  </div>
);
