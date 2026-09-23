import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Gift, Instagram, MapPin, Plus, RefreshCw, ShoppingBag, Smartphone, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES, OCCASIONS } from '../data/catalog';
import { ARTICLES } from '../data/journal';
import type { Product } from '../data/types';
import { ArticleCard } from './Journal';
import { SITE_CONFIG } from '../config/site';
import { formatPrice } from '../utils/format';
import { usePrefersReducedMotion } from '../utils/hooks';
import { usePageTitle } from '../utils/usePageTitle';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { Reveal } from '../components/Reveal';
import { FloatingPetals, Flourish, Flower } from '../components/Decor';

const px = (id: number, w = 1600) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const HERO_SLIDES = [
  {
    kicker: 'Collection Automne 2026 · Pour elle',
    title: ['Belle', 'à chaque', 'pas'],
    accent: 1,
    text: 'Escarpins en velours, sandales dorées et mules raffinées : la nouvelle saison se porte avec grâce.',
    cta: { label: 'Découvrir les chaussures', to: '/boutique/chaussures' },
    image: px(1464625),
    featured: 'escarpins-velours-aminata',
  },
  {
    kicker: 'Maroquinerie',
    title: ['Le sac', 'qui vous', 'ressemble'],
    accent: 1,
    text: 'Sacs structurés, cabas en wax façonnés à Dakar et pochettes de soirée perlées.',
    cta: { label: 'Explorer les sacs', to: '/boutique/sacs' },
    image: px(1152077),
    featured: 'sac-a-main-fatou',
  },
  {
    kicker: 'Joaillerie',
    title: ['Brillez', 'de mille', 'feux'],
    accent: 1,
    text: 'Plaqué or 18 carats, perles nacrées et créoles lumineuses pour briller à chaque cérémonie.',
    cta: { label: 'Voir les bijoux', to: '/boutique/bijoux' },
    image: px(1191531),
    featured: 'collier-plaque-or',
  },
];

const TESTIMONIALS = [
  { name: 'Aïssatou N.', city: 'Mermoz, Dakar', text: 'Commande reçue le lendemain dans un écrin magnifique. Le sac Fatou est encore plus beau en vrai — on me demande sans cesse d\'où il vient.' },
  { name: 'Ndèye F.', city: 'Thiès', text: 'Des sandales dorées d\'une qualité rare, payées avec Wave en deux minutes. Une équipe douce et attentionnée, toujours à l\'écoute sur WhatsApp.' },
  { name: 'Coumba S.', city: 'Almadies, Dakar', text: 'J\'ai échangé ma pointure sans aucune difficulté. Les escarpins Aminata étaient parfaits pour le mariage de ma sœur.' },
];

const DURATION = 7000;

export const Home: React.FC = () => {
  usePageTitle();
  const { products, recentlyViewed, getProduct } = useStore();
  const reduced = usePrefersReducedMotion();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState<'bestsellers' | 'nouveautes' | 'promos'>('bestsellers');
  const [quote, setQuote] = useState(0);

  useEffect(() => {
    if (paused || reduced) return;
    const t = setTimeout(() => setSlide(s => (s + 1) % HERO_SLIDES.length), DURATION);
    return () => clearTimeout(t);
  }, [slide, paused, reduced]);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setQuote(q => (q + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(t);
  }, [reduced]);

  const tabProducts = useMemo(() => {
    if (tab === 'nouveautes') return [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
    if (tab === 'promos') return products.filter(p => p.oldPrice).slice(0, 8);
    return products.filter(p => p.isBestseller).slice(0, 8);
  }, [tab, products]);

  const look = useMemo(() => ['robe-wax-dior', 'sac-a-main-fatou', 'sandales-dorees-ndeye', 'collier-plaque-or'].map(getProduct).filter((p): p is NonNullable<typeof p> => !!p), [getProduct]);
  const recent = recentlyViewed.map(getProduct).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 4);
  const current = HERO_SLIDES[slide];
  const featured = getProduct(current.featured);
  const [c0, ...cRest] = CATEGORIES;

  return (
    <div className="overflow-x-clip">
      {/* ───────────── HERO ───────────── */}
      <section className="relative h-[calc(100svh-2.25rem)] min-h-[620px] overflow-hidden bg-ink grain" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        aria-roledescription="carrousel" aria-label="À la une">
        {HERO_SLIDES.map((s, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-[1.4s] ease-luxe ${i === slide ? 'opacity-100' : 'opacity-0'}`} aria-hidden={i !== slide}>
            <div className={`absolute inset-0 ${i === slide ? 'animate-kenburns' : ''}`}>
              <ProductImage src={s.image} alt="" className="w-full h-full" />
            </div>
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-wine/15 to-ink/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/60 via-transparent to-transparent" />

        <div className="relative h-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex flex-col justify-end pb-24 sm:pb-28">
          <div key={slide} className="max-w-3xl text-ivory">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-luxe text-gold-light animate-fade-up flex items-center gap-3"><Flower className="w-3.5 h-3.5" />{current.kicker}</p>
            <h1 className="font-display font-normal text-[3.4rem] sm:text-7xl lg:text-[7.5rem] leading-[0.92] mt-5">
              {current.title.map((line, i) => (
                <span key={i} className={`block animate-fade-up ${i === current.accent ? 'font-script text-gold-light text-[1.15em] leading-[0.95] pl-2' : ''}`} style={{ animationDelay: `${120 + i * 110}ms` }}>{line}</span>
              ))}
            </h1>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-end gap-8 animate-fade-up" style={{ animationDelay: '500ms' }}>
              <p className="text-ivory/75 text-[15px] leading-relaxed max-w-sm">{current.text}</p>
              <Link to={current.cta.to} className="btn-light self-start shrink-0">{current.cta.label} <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>

        {/* La pièce du moment : carte en verre dépoli posée sur la photo */}
        {featured && (
          <Link key={`f-${slide}`} to={`/produit/${featured.slug}`}
            className="hidden lg:flex absolute right-28 bottom-28 w-[330px] items-center gap-4 p-3 pr-5 rounded-[1.75rem] glass text-ivory animate-fade-up group"
            style={{ animationDelay: '700ms' }} data-testid="hero-featured">
            <span className="block w-20 h-24 rounded-[1.25rem] overflow-hidden shrink-0 animate-hover">
              <ProductImage src={featured.images[0]} alt="" label="" className="w-full h-full" />
            </span>
            <span className="min-w-0">
              <span className="block font-script text-[1.35rem] text-gold-light leading-none whitespace-nowrap">La pièce du moment</span>
              <span className="block font-display text-xl leading-tight mt-1.5 line-clamp-2">{featured.name}</span>
              <span className="flex items-center gap-2 mt-1.5 text-sm">
                <strong className="font-semibold">{formatPrice(featured.price)}</strong>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </span>
          </Link>
        )}

        {/* Invitation à défiler */}
        <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 text-ivory/60 pointer-events-none" aria-hidden>
          <span className="text-[9px] uppercase tracking-luxe">Défiler</span>
          <span className="relative w-px h-10 bg-ivory/20 overflow-hidden"><span className="absolute inset-0 bg-ivory animate-scroll-cue" /></span>
        </div>

        {/* Contrôles */}
        <div className="absolute bottom-8 inset-x-0">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex items-center gap-6 text-ivory">
            <span className="font-display text-lg tabular-nums">0{slide + 1}</span>
            <div className="flex gap-2 flex-1 max-w-xs">
              {HERO_SLIDES.map((_, i) => (
                <button key={i} onClick={() => setSlide(i)} aria-label={`Afficher la diapositive ${i + 1}`} aria-current={i === slide}
                  className="relative h-[2px] flex-1 bg-ivory/25 overflow-hidden">
                  {i < slide && <span className="absolute inset-0 bg-ivory" />}
                  {i === slide && <span key={`${slide}-${paused}`} className={`absolute inset-0 bg-ivory origin-left ${paused || reduced ? '' : 'animate-progress'}`} style={{ animationDuration: `${DURATION}ms` }} />}
                </button>
              ))}
            </div>
            <span className="font-display text-lg text-ivory/50 tabular-nums">0{HERO_SLIDES.length}</span>
          </div>
        </div>
      </section>

      {/* ───────────── MANIFESTE ───────────── */}
      <section className="relative">
        <FloatingPetals />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
          <Reveal>
            <p className="font-script text-4xl sm:text-5xl text-gold-dark">Pour toutes les femmes</p>
            <p className="font-display text-3xl sm:text-5xl leading-[1.15] mt-6">
              Celles qui rayonnent au bureau, qui dansent jusqu'au bout de la nuit aux mariages, et qui brillent <em className="text-gold-dark">simplement d'être elles-mêmes</em>. Chaque pièce Fabima est choisie pour vous.
            </p>
            <Flourish className="mt-12" />
          </Reveal>
        </div>
      </section>

      {/* ───────────── UNIVERS ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        <Reveal className="flex items-end justify-between gap-6 mb-10">
          <div><p className="eyebrow">Nos univers</p><h2 className="font-display text-5xl sm:text-6xl mt-3">Tout pour vous <span className="font-script text-gold-dark text-[1.1em]">sublimer</span></h2></div>
          <Link to="/boutique" className="hidden sm:inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold link-luxe">Toute la boutique <ArrowRight className="w-3.5 h-3.5" /></Link>
        </Reveal>
        <div className="grid lg:grid-cols-2 gap-4">
          <Reveal>
            <CategoryTile id={c0.id} name={c0.name} description={c0.description} image={c0.image} tall />
          </Reveal>
          <div className="grid grid-cols-2 gap-4">
            {cRest.map((c, i) => (
              <Reveal key={c.id} delay={i * 90}><CategoryTile id={c.id} name={c.name} description={c.description} image={c.image} /></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── OCCASIONS ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28 sm:pt-36">
        <Reveal className="text-center mb-12">
          <p className="eyebrow">Shopping par occasion</p>
          <h2 className="font-display text-5xl sm:text-6xl mt-3">Une tenue pour <span className="font-script text-gold-dark text-[1.15em]">chaque moment</span></h2>
        </Reveal>
        <div className="flex lg:grid lg:grid-cols-6 gap-4 overflow-x-auto no-scrollbar snap-x -mx-5 px-5 sm:mx-0 sm:px-0 pb-2">
          {OCCASIONS.map((o, i) => {
            const count = products.filter(p => p.occasions.includes(o.id)).length;
            return (
              <Reveal key={o.id} delay={i * 70} className="shrink-0 w-[46%] sm:w-[30%] lg:w-auto snap-start">
                <Link to={`/boutique?occasion=${o.id}`} className="group block text-center">
                  <div className="relative arch aspect-[3/4] overflow-hidden">
                    <ProductImage src={o.image} alt={o.name} label="" className="w-full h-full group-hover:scale-110 transition-transform duration-[1.4s] ease-luxe" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/55 to-transparent" />
                    <span className="absolute bottom-4 inset-x-0 text-ivory text-[10px] uppercase tracking-[0.22em]">{count} pièces</span>
                  </div>
                  <p className="font-display text-xl mt-4 leading-tight group-hover:text-gold-dark transition-colors">{o.name}</p>
                  <p className="font-script text-xl text-gold-dark leading-none mt-1">{o.tagline}</p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ───────────── SÉLECTION ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28 sm:pt-36">
        <Reveal className="text-center mb-12">
          <p className="eyebrow">La sélection</p>
          <h2 className="font-display text-5xl sm:text-6xl mt-3">Nos <span className="font-script text-gold-dark text-[1.15em]">coups de cœur</span></h2>
          <div className="mt-8 inline-flex gap-1 p-1 rounded-full bg-white border border-ink/[0.06] shadow-soft" role="tablist">
            {([['bestsellers', 'Coups de cœur'], ['nouveautes', 'Nouveautés'], ['promos', 'Petits prix']] as const).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`px-5 h-10 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold transition-colors ${tab === id ? 'bg-ink text-ivory' : 'text-ink/50 hover:text-ink hover:bg-blush/60'}`}>{label}</button>
            ))}
          </div>
        </Reveal>
        <div key={tab} className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-12 animate-fade-in">
          {tabProducts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* ───────────── ATELIER TERANGA ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28 sm:pt-36">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-6 items-center">
          <Reveal className="lg:col-span-5 relative">
            <div className="aspect-[4/5] overflow-hidden arch"><ProductImage src={px(6044266, 1000)} alt="Artisane de l'atelier Teranga" label="Atelier Teranga" className="w-full h-full" /></div>
            <div className="hidden sm:block absolute -bottom-10 -right-10 lg:-right-20 w-44 lg:w-56 aspect-[3/4] overflow-hidden arch border-[8px] border-ivory shadow-luxe">
              <ProductImage src={px(994523, 600)} alt="Robe en wax" label="" className="w-full h-full" />
            </div>
          </Reveal>
          <Reveal className="lg:col-span-6 lg:col-start-7" delay={120}>
            <p className="eyebrow">Fait main à Dakar</p>
            <h2 className="font-display text-5xl sm:text-7xl leading-[0.95] mt-4">L'atelier<br /><span className="font-script text-gold-dark text-[1.2em]">Teranga</span></h2>
            <p className="mt-8 text-ink/65 leading-relaxed max-w-lg">
              Au cœur de la Médina, nos artisanes façonnent des cabas en wax et des robes cintrées aux imprimés vibrants.
              Chaque pièce est coupée à la main, numérotée et ne sera jamais tout à fait identique à une autre.
            </p>
            <dl className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[['12', 'artisanes'], ['100 %', 'coton wax'], ['1', 'pièce unique']].map(([n, l]) => (
                <div key={l}><dt className="font-display text-4xl text-gold-dark">{n}</dt><dd className="text-xs text-ink/55 mt-1">{l}</dd></div>
              ))}
            </dl>
            <Link to="/boutique?q=wax" className="btn-outline mt-10">Découvrir la collection <ArrowRight className="w-4 h-4" /></Link>
          </Reveal>
        </div>
      </section>

      {/* ───────────── BANDEAU DÉFILANT ───────────── */}
      <section className="mt-32 sm:mt-40 bg-blush/50 py-8 overflow-hidden -rotate-1 scale-[1.02]" aria-hidden>
        <div className="flex whitespace-nowrap animate-marquee w-max">
          {[0, 1].map(k => (
            <div key={k} className="flex items-center">
              {['Grâce', 'Élégance', 'Féminité', 'Teranga', 'Douceur', 'Audace'].map(w => (
                <span key={w} className="font-display italic text-5xl sm:text-7xl px-8 text-ink/85 flex items-center gap-16">{w}<Flower className="w-7 h-7 text-gold-light" /></span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── SHOP THE LOOK ───────────── */}
      {look.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28 sm:pt-36">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <Reveal className="relative aspect-[4/5] overflow-hidden arch">
              <ProductImage src={px(1536619, 1200)} alt="Look de cérémonie Fabima" label="Le look cérémonie" className="w-full h-full" />
              {look.map((p, i) => {
                const pos = [['30%', '38%'], ['62%', '58%'], ['44%', '86%'], ['48%', '22%']][i];
                return (
                  <Link key={p.id} to={`/produit/${p.slug}`} style={{ left: pos[0], top: pos[1] }} aria-label={p.name}
                    className="group absolute -translate-x-1/2 -translate-y-1/2">
                    <span className="relative w-8 h-8 rounded-full bg-ivory grid place-items-center shadow-luxe">
                      <span className="absolute inset-0 rounded-full bg-ivory/60 animate-ping" />
                      <Plus className="relative w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                    </span>
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 bg-ivory px-4 py-2 rounded-full whitespace-nowrap text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-soft">
                      {p.name} · {formatPrice(p.price)}
                    </span>
                  </Link>
                );
              })}
            </Reveal>
            <Reveal delay={120}>
              <p className="eyebrow">Shop the look</p>
              <h2 className="font-display text-5xl sm:text-6xl mt-3 leading-[1]">Invitée <em>d'honneur</em></h2>
              <p className="mt-5 text-ink/60 max-w-md">Une silhouette pensée pour les mariages et baptêmes : wax éclatant, maroquinerie structurée et touches dorées.</p>
              <ul className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
                {look.map(p => (
                  <li key={p.id}>
                    <Link to={`/produit/${p.slug}`} className="group flex items-center gap-5 py-4">
                      <ProductImage src={p.images[0]} alt={p.name} label="" className="w-16 h-20 shrink-0 rounded-2xl" />
                      <span className="flex-1"><span className="eyebrow !text-ink/40">{p.subcategory}</span><span className="block font-display text-xl mt-1 group-hover:text-gold-dark transition-colors">{p.name}</span></span>
                      <span className="text-sm">{formatPrice(p.price)}</span>
                      <ArrowUpRight className="w-4 h-4 text-ink/30 group-hover:text-ink group-hover:rotate-45 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
              <LookAdder look={look} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ───────────── IDÉES CADEAUX ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28 sm:pt-36">
        <div className="rounded-[3rem] bg-ink text-ivory px-6 sm:px-12 lg:px-16 py-16 relative overflow-hidden grain">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 items-center relative">
            <Reveal>
              <p className="font-script text-4xl text-gold-light">Faire plaisir</p>
              <h2 className="font-display text-5xl sm:text-6xl mt-2 leading-[1]">Idées cadeaux<br />pour elle</h2>
              <p className="mt-5 text-ivory/65 text-sm max-w-sm leading-relaxed">Anniversaire, fête des mères, Saint-Valentin ou simple attention : choisissez un budget, nous nous occupons de l'emballage et du petit mot.</p>
              <p className="mt-6 inline-flex items-center gap-2 text-xs text-gold-light"><Gift className="w-4 h-4" strokeWidth={1.5} /> Emballage cadeau signature disponible au panier</p>
            </Reveal>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'lt15', label: 'Moins de 15 000', hint: 'Créoles, foulards, lunettes' },
                { id: '15-30', label: '15 000 – 30 000', hint: 'Colliers, sandales, sacs wax' },
                { id: '30-50', label: '30 000 – 50 000', hint: 'Sacs à main, escarpins, robes' },
                { id: 'gt50', label: 'Plus de 50 000', hint: 'Boubou brodé, pièces d\'exception' },
              ].map((b, i) => (
                <Reveal key={b.id} delay={i * 80}>
                  <Link to={`/boutique?prix=${b.id}&tri=note`} className="group block h-full p-6 rounded-[2rem] bg-ivory/[0.06] border border-ivory/10 hover:bg-ivory hover:text-ink transition-colors duration-500">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-gold-light group-hover:text-gold-dark">FCFA</p>
                    <p className="font-display text-2xl sm:text-3xl mt-2 leading-tight">{b.label}</p>
                    <p className="text-xs mt-3 opacity-60">{b.hint}</p>
                    <ArrowUpRight className="w-4 h-4 mt-4 group-hover:rotate-45 transition-transform" />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── JOURNAL ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28 sm:pt-36">
        <Reveal className="flex items-end justify-between gap-6 mb-10">
          <div><p className="font-script text-4xl text-gold-dark">Le journal</p><h2 className="font-display text-5xl sm:text-6xl mt-1">Conseils & inspirations</h2></div>
          <Link to="/journal" className="hidden sm:inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold link-luxe">Tous les articles <ArrowRight className="w-3.5 h-3.5" /></Link>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {ARTICLES.slice(0, 3).map((a, i) => <Reveal key={a.slug} delay={i * 90}><ArticleCard article={a} /></Reveal>)}
        </div>
      </section>

      {/* ───────────── SERVICES ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28 sm:pt-36">
        <Reveal className="text-center mb-12">
          <p className="font-script text-4xl text-gold-dark">Nos engagements</p>
          <h2 className="font-display text-4xl sm:text-5xl mt-1">Le service <em className="italic">Fabima</em></h2>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {[
            { Icon: Truck, t: 'Livraison 24h', d: `À Dakar, offerte dès ${formatPrice(SITE_CONFIG.freeShippingThreshold)}. Partout au Sénégal en relais.` },
            { Icon: MapPin, t: 'Suivi en direct', d: 'Suivez votre livreur sur la carte jusqu\'à votre porte.' },
            { Icon: Smartphone, t: 'Paiement mobile', d: 'Wave, Orange Money, Free Money ou espèces à la livraison.' },
            { Icon: RefreshCw, t: 'Échange offert', d: 'Taille ou couleur, sous 7 jours, sans frais.' },
          ].map(({ Icon, t, d }, i) => (
            <Reveal key={t} delay={i * 80}
              className="group relative p-5 sm:p-8 rounded-[1.75rem] sm:rounded-[2rem] bg-white border border-ink/[0.05] hover:-translate-y-1 hover:shadow-luxe transition-all duration-500 ease-luxe overflow-hidden">
              <span className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-blush/50 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden />
              <span className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blush to-mauve/40 grid place-items-center">
                <Icon className="w-6 h-6 text-wine" strokeWidth={1.4} />
              </span>
              <p className="relative font-display text-xl sm:text-[1.7rem] mt-4 sm:mt-6 leading-tight">{t}</p>
              <p className="relative text-[13px] sm:text-sm text-ink/55 mt-2 leading-snug sm:leading-relaxed">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────── TÉMOIGNAGES ───────────── */}
      <section className="relative mt-20 mx-3 sm:mx-6 rounded-[3rem] overflow-hidden bg-petal">
        <FloatingPetals />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
          <p className="font-script text-4xl text-gold-dark">Elles nous aiment</p>
          <div className="relative mt-10 min-h-[220px] sm:min-h-[200px]">
            {TESTIMONIALS.map((t, i) => (
              <figure key={t.name} className={`absolute inset-0 transition-all duration-1000 ease-luxe ${i === quote ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`} aria-hidden={i !== quote}>
                <blockquote className="font-display text-2xl sm:text-4xl leading-snug">« {t.text} »</blockquote>
                <figcaption className="mt-8 text-[11px] uppercase tracking-[0.25em]"><strong>{t.name}</strong> <span className="text-ink/45">— {t.city}</span></figcaption>
              </figure>
            ))}
          </div>
          <div className="flex justify-center gap-2 mt-8">
            {TESTIMONIALS.map((t, i) => (
              <button key={t.name} onClick={() => setQuote(i)} aria-label={`Témoignage ${i + 1}`} className={`h-2 rounded-full transition-all duration-500 ${i === quote ? 'w-8 bg-gold' : 'w-2 bg-ink/20'}`} />
            ))}
          </div>
          <p className="mt-12 text-sm text-ink/55">Note moyenne <strong className="text-ink">4,8/5</strong> sur plus de 800 avis vérifiés</p>
        </div>
      </section>

      {/* ───────────── INSTAGRAM ───────────── */}
      <section className="pt-28 sm:pt-36">
        <Reveal className="text-center mb-10 px-5">
          <p className="eyebrow">@fabimastore</p>
          <h2 className="font-display text-5xl sm:text-6xl mt-3">#FabimaStyle</h2>
          <p className="text-ink/55 mt-3 text-sm">Partagez votre look avec le hashtag, les plus belles d'entre vous apparaissent ici.</p>
        </Reveal>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 px-3 sm:px-6">
          {products.filter(p => p.images[0]).slice(0, 6).map((p, i) => (
            <a key={p.id} href={SITE_CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" className={`group relative aspect-square overflow-hidden ${i % 2 ? 'rounded-[2rem]' : 'arch'}`} aria-label={`Instagram — ${p.name}`}>
              <ProductImage src={p.images[p.images.length > 1 && i % 2 ? 1 : 0]} alt="" className="w-full h-full group-hover:scale-110 transition-transform duration-[1.2s]" />
              <span className="absolute inset-0 bg-wine/0 group-hover:bg-wine/40 transition-colors duration-500 grid place-items-center">
                <Instagram className="w-6 h-6 text-ivory opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.4} />
              </span>
            </a>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28">
          <Reveal className="mb-10"><p className="eyebrow">Pour vous</p><h2 className="font-display text-4xl sm:text-5xl mt-3">Récemment consultés</h2></Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-12">
            {recent.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
};

const CategoryTile: React.FC<{ id: string; name: string; description: string; image: string; tall?: boolean }> = ({ id, name, description, image, tall }) => (
  <Link to={`/boutique/${id}`} className={`group relative block overflow-hidden ${tall ? 'rounded-[2.5rem] aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[640px]' : 'arch aspect-[3/4]'}`}>
    <ProductImage src={image} alt={name} label="" className="absolute inset-0 w-full h-full transition-transform duration-[1.6s] ease-luxe group-hover:scale-[1.07]" />
    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-wine/5 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 text-ivory flex items-end justify-between gap-4">
      <div>
        <h3 className={`font-display leading-none ${tall ? 'text-5xl sm:text-6xl' : 'text-[1.4rem] sm:text-4xl whitespace-nowrap'}`}>{name}</h3>
        <p className="text-xs text-ivory/70 mt-2 hidden sm:block">{description}</p>
      </div>
      <span className="hidden sm:grid w-11 h-11 rounded-full border border-ivory/50 place-items-center shrink-0 group-hover:bg-ivory group-hover:text-ink transition-colors duration-500">
        <ArrowUpRight className="w-4 h-4" />
      </span>
    </div>
  </Link>
);

/** Ajoute toutes les pièces du look au panier, en demandant les tailles quand il en faut. */
const LookAdder: React.FC<{ look: Product[] }> = ({ look }) => {
  const { addToCart, setCartOpen, notify } = useStore();
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const sized = look.filter(p => p.sizes.length > 0 && p.stock > 0);
  const total = look.reduce((s, p) => s + p.price, 0);

  const addAll = () => {
    const missing = sized.find(p => !sizes[p.id]);
    if (missing) { notify(`Choisissez la taille : ${missing.name}`, 'error'); return; }
    let added = 0;
    look.forEach(p => { if (p.stock > 0 && addToCart(p, { size: sizes[p.id], color: p.colors[0]?.name, silent: true })) added += 1; });
    if (added) { notify(`${added} pièces du look ajoutées au panier`); setCartOpen(true); }
  };

  return (
    <div className="mt-8 p-6 rounded-[2rem] bg-white border border-ink/[0.06]">
      {sized.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          {sized.map(p => (
            <label key={p.id} className="text-xs">
              <span className="field-label">Taille · {p.subcategory}</span>
              <select value={sizes[p.id] ?? ''} onChange={e => setSizes(s => ({ ...s, [p.id]: e.target.value }))} className="field !h-11">
                <option value="">Choisir</option>
                {p.sizes.map(sz => <option key={sz} value={sz}>{sz}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink/60">Le look complet<br /><strong className="font-display text-3xl text-ink">{formatPrice(total)}</strong></p>
        <button onClick={addAll} className="btn-dark"><ShoppingBag className="w-4 h-4" strokeWidth={1.5} /> Ajouter tout le look</button>
      </div>
    </div>
  );
};
