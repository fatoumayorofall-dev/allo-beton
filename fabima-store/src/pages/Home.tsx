import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Globe2, MapPin, Plus, RefreshCw, ShoppingBag, Smartphone, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/catalog';
import type { Product } from '../data/types';
import { SITE_CONFIG } from '../config/site';
import { formatPrice } from '../utils/format';
import { usePrefersReducedMotion } from '../utils/hooks';
import { usePageTitle } from '../utils/usePageTitle';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { Reveal } from '../components/Reveal';
import { useMarket } from '../utils/market';
import { StyleStories } from '../components/StyleStories';
import { CountUp } from '../components/CountUp';
import { MarketCard } from '../components/MarketCard';
import { GoldDust, Twinkles } from '../components/Magic';
import { Sparkle } from '../components/Decor';

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
    kicker: 'Le duo parfait',
    title: ['Sac', '& souliers', 'assortis'],
    accent: 1,
    text: 'Pochettes perlées et sandales à talons, cabas et mules : des duos pensés pour aller ensemble, du bureau aux cérémonies.',
    cta: { label: 'Voir les pochettes', to: '/boutique/sacs' },
    image: px(2081199),
    featured: 'pochette-soiree-perles',
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
  useEffect(() => {
    if (paused || reduced) return;
    const t = setTimeout(() => setSlide(s => (s + 1) % HERO_SLIDES.length), DURATION);
    return () => clearTimeout(t);
  }, [slide, paused, reduced]);

  const tabProducts = useMemo(() => {
    if (tab === 'nouveautes') return [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
    if (tab === 'promos') return products.filter(p => p.oldPrice).slice(0, 8);
    return products.filter(p => p.isBestseller).slice(0, 8);
  }, [tab, products]);

  const look = useMemo(() => ['sac-a-main-fatou', 'sandales-talons-perlees-linguere', 'pochette-soiree-perles', 'escarpins-velours-aminata'].map(getProduct).filter((p): p is NonNullable<typeof p> => !!p), [getProduct]);
  const recent = recentlyViewed.map(getProduct).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 4);
  const current = HERO_SLIDES[slide];
  const featured = getProduct(current.featured);
  const market = useMarket().products ?? [];

  return (
    <div className="overflow-x-clip">
      {/* ───────────── HÉROS : texte à gauche, photo en arche à droite ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-4 sm:pt-8 lg:pt-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        aria-roledescription="carrousel" aria-label="À la une">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-14 items-center">
          <div key={slide} className="order-2 lg:order-1">
            <p className="eyebrow animate-fade-up">{current.kicker}</p>
            <h1 className="font-display font-medium text-[3.6rem] sm:text-7xl xl:text-[7.4rem] leading-[0.9] mt-4 sm:mt-6">
              {current.title.map((line, i) => (
                <span key={i} className={`block animate-fade-up ${i === current.accent ? 'italic text-gold-dark' : ''}`} style={{ animationDelay: `${80 + i * 90}ms` }}>
                  {i === current.accent ? <span className="text-magic" style={{ animationDelay: '-3.2s' }}>{line}</span> : line}
                </span>
              ))}
            </h1>
            <p className="mt-6 text-ink/75 text-base sm:text-lg leading-relaxed max-w-lg animate-fade-up" style={{ animationDelay: '360ms' }}>{current.text}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 animate-fade-up" style={{ animationDelay: '440ms' }}>
              <Link to={current.cta.to} className="btn-dark">{current.cta.label} <ArrowRight className="w-4 h-4" /></Link>
              <Link to={current.cta.to === '/boutique/sacs' ? '/boutique/chaussures' : '/boutique/sacs'} className="btn-outline">{current.cta.to === '/boutique/sacs' ? 'Voir les chaussures' : 'Voir les sacs'}</Link>
            </div>
            <p className="mt-8 flex items-center gap-3 text-[13px] font-semibold">
              <span className="flex -space-x-2.5" aria-hidden>{['bg-gold-light', 'bg-mauve', 'bg-gold', 'bg-blush'].map(c => <span key={c} className={`w-8 h-8 rounded-full border-[3px] border-ivory ${c}`} />)}</span>
              <span><span className="text-gold" aria-hidden>★★★★★</span> 4,8/5 · plus de 800 clientes à Dakar</span>
            </p>
            {/* Contrôles du diaporama */}
            <div className="mt-8 flex items-center gap-5 max-w-xs">
              <span className="font-display text-lg tabular-nums">0{slide + 1}</span>
              <div className="flex gap-2 flex-1">
                {HERO_SLIDES.map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)} aria-label={`Afficher la diapositive ${i + 1}`} aria-current={i === slide} className="h-6 flex-1 flex items-center">
                    <span className="relative block w-full h-[2px] bg-ink/15 overflow-hidden">
                      {i < slide && <span className="absolute inset-0 bg-ink" />}
                      {i === slide && <span key={`${slide}-${paused}`} className={`absolute inset-0 bg-ink origin-left ${paused || reduced ? '' : 'animate-progress'}`} style={{ animationDuration: `${DURATION}ms` }} />}
                    </span>
                  </button>
                ))}
              </div>
              <span className="font-display text-lg text-ink/50 tabular-nums">0{HERO_SLIDES.length}</span>
            </div>
          </div>

          <div className="relative order-1 lg:order-2 lg:pl-16">
            {/* Halo pastel qui respire derrière l'arche */}
            <div className="pointer-events-none absolute -inset-[8%] lg:left-[4%] grid place-items-center" aria-hidden>
              <div className="aurora w-full aspect-square rounded-full blur-[40px] opacity-70 will-change-transform" />
            </div>
            <div className="relative aspect-[4/5] sm:aspect-[5/6] lg:aspect-[4/5] max-h-[78svh] mx-auto overflow-hidden rounded-t-[999px] rounded-b-[2.25rem] bg-ivory-deep shadow-luxe">
              {HERO_SLIDES.map((s, i) => (
                <div key={i} className={`absolute inset-0 transition-opacity duration-[1.2s] ease-luxe ${i === slide ? 'opacity-100' : 'opacity-0'}`} aria-hidden={i !== slide}>
                  <div className={`absolute inset-0 ${i === slide ? 'animate-kenburns' : ''}`}>
                    <ProductImage src={s.image} alt="" className="w-full h-full" sizes="(min-width: 1024px) 45vw, 100vw" priority={i === 0} />
                  </div>
                </div>
              ))}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/35 to-transparent" />
              {/* Poussière de lumière qui flotte dans la photo */}
              <GoldDust className="mix-blend-screen" />
            </div>
            <Sparkle className="absolute -top-3 right-[14%] w-7 h-7 text-gold animate-twinkle pointer-events-none" />
            <Sparkle className="absolute top-[9%] right-[6%] w-3.5 h-3.5 text-gold-dark animate-twinkle pointer-events-none" style={{ animationDelay: '1.4s' }} />
            <Sparkle className="absolute top-[30%] left-2 lg:left-12 w-4 h-4 text-mauve animate-twinkle pointer-events-none" style={{ animationDelay: '2.3s' }} />
            <p className="hidden lg:block absolute left-0 top-[16%] -rotate-6 font-script text-5xl text-gold-dark text-magic pointer-events-none" aria-hidden>le coup de cœur</p>
            {/* La pièce du moment */}
            {featured && (
              <Link key={`f-${slide}`} to={`/produit/${featured.slug}`} data-testid="hero-featured"
                className="absolute left-3 bottom-3 sm:left-0 sm:bottom-10 flex items-center gap-3 sm:gap-4 p-2.5 pr-4 sm:p-3 sm:pr-5 rounded-[1.5rem] bg-white/95 backdrop-blur shadow-luxe animate-fade-up group max-w-[calc(100%-1.5rem)] sm:max-w-[320px]"
                style={{ animationDelay: '500ms' }}>
                <span className="block w-14 h-16 sm:w-20 sm:h-24 rounded-2xl overflow-hidden shrink-0">
                  <ProductImage src={featured.images[0]} alt="" label="" className="w-full h-full" />
                </span>
                <span className="min-w-0">
                  <span className="eyebrow block">Pièce du moment</span>
                  <span className="block font-display text-lg sm:text-xl leading-tight mt-1 line-clamp-2">{featured.name}</span>
                  <span className="flex items-center gap-2 mt-1 text-sm font-semibold text-wine">{formatPrice(featured.price)} <ArrowUpRight className="w-4 h-4 text-ink transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ───────────── CONFIANCE ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-10 sm:pt-14" aria-label="Nos engagements">
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-0 lg:divide-x divide-ink/[0.07] rounded-[1.75rem] lg:bg-white lg:border border-ink/[0.06] lg:py-5">
          {[
            { Icon: Truck, t: 'Livraison 24 h', d: `Dakar · offerte dès ${formatPrice(SITE_CONFIG.freeShippingThreshold)}` },
            { Icon: MapPin, t: 'Suivi en direct', d: 'Votre livreur sur la carte' },
            { Icon: Smartphone, t: 'Wave · Orange Money', d: 'ou espèces à la livraison' },
            { Icon: RefreshCw, t: 'Échange 7 jours', d: 'Taille ou couleur, sans frais' },
          ].map(({ Icon, t, d }) => (
            <li key={t} className="flex flex-col items-start sm:flex-row sm:items-center gap-2.5 sm:gap-4 p-4 lg:px-7 rounded-[1.25rem] bg-white lg:bg-transparent border border-ink/[0.06] lg:border-0">
              <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blush grid place-items-center shrink-0"><Icon className="w-5 h-5 text-wine" strokeWidth={1.5} /></span>
              <span className="min-w-0"><span className="block font-display text-lg sm:text-xl leading-tight">{t}</span><span className="block text-[12px] text-ink/70 leading-snug">{d}</span></span>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────────── STYLES (bulles façon stories) ───────────── */}
      <StyleStories />

      {/* ───────────── UNIVERS (bento) ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-20 sm:pt-28">
        <SectionHead eyebrow="Nos univers" title="Chaque pas," accent="chaque sac" link={{ to: '/boutique', label: 'Toute la boutique' }} />
        <div className="grid grid-cols-2 lg:grid-cols-[1.25fr_1fr_0.62fr] gap-3 sm:gap-4">
          {CATEGORIES.slice(0, 2).map((c, i) => (
            <Reveal key={c.id} delay={i * 90}><CategoryTile id={c.id} name={c.name} description={c.description} image={c.image} tall /></Reveal>
          ))}
          <div className="col-span-2 lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
            <Link to="/boutique?tri=nouveautes" className="group relative overflow-hidden rounded-[2rem] min-h-[190px] bg-gradient-to-br from-blush to-wine/70 p-6 flex flex-col justify-end text-ivory">
              <span className="absolute inset-0 bg-gradient-to-t from-ink/55 to-transparent" />
              <span className="relative font-display text-3xl sm:text-4xl leading-none">Nouveautés</span>
              <span className="relative text-xs mt-2 text-ivory/85 inline-flex items-center gap-1.5">Arrivées de la saison <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></span>
            </Link>
            <Link to="/boutique?prix=lt20&tri=note" className="group relative overflow-hidden rounded-[2rem] min-h-[190px] bg-ink p-6 flex flex-col justify-end text-ivory">
              <span className="eyebrow !text-gold-light">Petits prix</span>
              <span className="font-display text-3xl sm:text-4xl leading-[1.02] mt-2">Moins de 20 000 FCFA</span>
              <span className="text-xs mt-2 text-gold-light inline-flex items-center gap-1.5">Idées cadeaux <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── SÉLECTION ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-20 sm:pt-28">
        <SectionHead eyebrow="La sélection" title="Nos coups" accent="de cœur" link={{ to: '/boutique', label: 'Voir tout' }} />
        <div className="-mt-4 mb-8 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0" role="tablist" aria-label="Sélection">
          {([['bestsellers', 'Coups de cœur'], ['nouveautes', 'Nouveautés'], ['promos', 'Petits prix']] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`shrink-0 px-5 h-10 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold border transition-colors ${tab === id ? 'bg-ink text-ivory border-ink' : 'border-ink/15 text-ink/75 hover:border-ink/40'}`}>{label}</button>
          ))}
        </div>
        <div key={tab} className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-12 animate-fade-in">
          {tabProducts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* ───────────── SHOP THE LOOK ───────────── */}
      {look.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-20 sm:pt-28">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <Reveal className="relative aspect-[4/5] overflow-hidden arch">
              <ProductImage src={px(1536619, 1200)} alt="Look de cérémonie Fabima" label="Le look cérémonie" className="w-full h-full" sizes="(min-width: 1024px) 50vw, 100vw" />
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
              <p className="eyebrow">Shop the look · mariage & baptême</p>
              <h2 className="font-display text-5xl sm:text-6xl mt-3 leading-[1]">Invitée <em className="text-gold-dark text-magic">d'honneur</em></h2>
              <p className="mt-5 text-ink/75 max-w-md">Un sac structuré, une pochette perlée et des souliers qui brillent à chaque pas.</p>
              <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
                {look.map(p => (
                  <li key={p.id}>
                    <Link to={`/produit/${p.slug}`} className="group flex items-center gap-5 py-3.5">
                      <ProductImage src={p.images[0]} alt="" label="" className="w-14 h-16 shrink-0 rounded-2xl" />
                      <span className="flex-1"><span className="eyebrow !text-ink/70">{p.subcategory}</span><span className="block font-display text-xl mt-0.5 group-hover:text-gold-dark transition-colors">{p.name}</span></span>
                      <span className="text-sm">{formatPrice(p.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <LookAdder look={look} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ───────────── ATELIER TERANGA ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-20 sm:pt-28">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-6 items-center rounded-[2.5rem] bg-ivory-deep/70 p-5 sm:p-10 lg:p-14">
          <Reveal className="lg:col-span-5">
            <div className="aspect-[4/5] overflow-hidden arch"><ProductImage src={px(6044266, 1000)} alt="Artisane de l'atelier Teranga" label="Atelier Teranga" className="w-full h-full" sizes="(min-width: 1024px) 40vw, 100vw" /></div>
          </Reveal>
          <Reveal className="lg:col-span-6 lg:col-start-7" delay={120}>
            <p className="eyebrow">Fait main à Dakar</p>
            <h2 className="font-display text-5xl sm:text-6xl leading-[0.95] mt-4">L'atelier <em className="text-gold-dark text-magic">Teranga</em></h2>
            <p className="mt-6 text-ink/75 leading-relaxed max-w-lg">
              Au cœur de la Médina, nos artisanes façonnent des cabas en wax et des sacs aux imprimés vibrants, cousus main.
              Chaque pièce est coupée à la main, numérotée et ne sera jamais tout à fait identique à une autre.
            </p>
            <dl className="mt-8 grid grid-cols-3 gap-6 max-w-md">
              {[['12', 'artisanes'], ['100 %', 'coton wax'], ['1', 'pièce unique']].map(([n, l]) => (
                <div key={l}><dt className="font-display text-4xl text-gold-dark"><CountUp value={n} /></dt><dd className="text-xs text-ink/70 mt-1">{l}</dd></div>
              ))}
            </dl>
            <Link to="/boutique?q=wax" className="btn-outline mt-8">Découvrir la collection <ArrowRight className="w-4 h-4" /></Link>
          </Reveal>
        </div>
      </section>

      {/* ───────────── AVIS ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-20 sm:pt-28" aria-labelledby="avis-titre">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="eyebrow">Elles nous aiment</p>
            <h2 id="avis-titre" className="font-display text-5xl sm:text-6xl mt-3">4,8<span className="text-gold-dark">/5</span> <em className="text-3xl sm:text-4xl text-ink/75">· plus de 800 avis</em></h2>
          </div>
          <p className="text-sm text-ink/70 max-w-xs">Avis laissés après livraison, sur la fiche de chaque pièce.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 90}>
              <figure className="h-full p-7 sm:p-8 rounded-[2rem] bg-white border border-ink/[0.05] flex flex-col">
                <p className="text-gold tracking-[0.2em]" aria-label="5 étoiles sur 5">★★★★★</p>
                <blockquote className="font-display text-[1.45rem] leading-snug mt-4 flex-1">« {t.text} »</blockquote>
                <figcaption className="mt-6 text-[11px] uppercase tracking-[0.22em] font-semibold text-gold-dark">{t.name} <span className="text-ink/70 font-normal">· {t.city}</span></figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────── LE MARCHÉ (dropshipping) ───────────── */}
      {market.length > 0 && (
        <section className="relative mt-20 sm:mt-28 mx-3 sm:mx-6 rounded-[3rem] overflow-hidden bg-ink text-ivory" data-testid="home-market">
          <span className="pointer-events-none absolute -top-32 -left-24 w-[30rem] h-[30rem] rounded-full bg-wine/40 blur-[110px]" aria-hidden />
          <Twinkles count={26} seed={11} />
          <div className="relative max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-14 sm:py-16 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-center">
            <Reveal>
              <p className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-luxe text-gold-light"><Globe2 className="w-4 h-4" /> Nouveau · Le Marché</p>
              <h2 className="font-display text-4xl sm:text-5xl mt-4 leading-[1.02]">Encore plus de modèles, <em className="text-gold-light text-magic-light">livrés du monde entier</em></h2>
              <p className="mt-5 text-ivory/70 max-w-md leading-relaxed">Commandés pour vous chez nos partenaires et suivis à chaque étape jusqu'à votre porte.</p>
              <Link to="/marche" className="btn-light mt-8">Découvrir le Marché <ArrowRight className="w-4 h-4" /></Link>
            </Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 [&_p]:text-ivory [&_.text-ink\/45]:!text-ivory/50">
              {market.slice(0, 4).map((p, i) => <Reveal key={p.id} delay={i * 80}><MarketCard product={p} /></Reveal>)}
            </div>
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-20 sm:pt-28">
          <SectionHead eyebrow="Pour vous" title="Récemment" accent="consultés" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-12">
            {recent.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
};

/** En-tête de section : sur-titre, titre (fin en italique) et lien « voir tout ». */
const SectionHead: React.FC<{ eyebrow: string; title: string; accent: string; link?: { to: string; label: string } }> = ({ eyebrow, title, accent, link }) => (
  <Reveal className="flex items-end justify-between gap-6 mb-10">
    <div><p className="eyebrow">{eyebrow}</p><h2 className="font-display text-5xl sm:text-6xl mt-3 leading-[1]">{title} <em className="text-gold-dark text-magic">{accent}</em></h2></div>
    {link && <Link to={link.to} className="hidden sm:inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-semibold link-luxe shrink-0">{link.label} <ArrowRight className="w-3.5 h-3.5" /></Link>}
  </Reveal>
);

const CategoryTile: React.FC<{ id: string; name: string; description: string; image: string; tall?: boolean }> = ({ id, name, description, image, tall }) => (
  <Link to={`/boutique/${id}`} className={`group relative block overflow-hidden ${tall ? 'rounded-[2rem] sm:rounded-[2.5rem] aspect-[3/4] lg:aspect-auto lg:h-full lg:min-h-[560px]' : 'arch aspect-[3/4]'}`}>
    <ProductImage src={image} alt="" label="" sizes={tall ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'} className="absolute inset-0 w-full h-full transition-transform duration-[1.6s] ease-luxe group-hover:scale-[1.07]" />
    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-wine/5 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 text-ivory flex items-end justify-between gap-4">
      <div>
        <h3 className={`font-display leading-none ${tall ? 'text-3xl sm:text-5xl lg:text-6xl' : 'text-[1.4rem] sm:text-4xl whitespace-nowrap'}`}>{name}</h3>
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
        <p className="text-sm text-ink/75">Le look complet<br /><strong className="font-display text-3xl text-ink">{formatPrice(total)}</strong></p>
        <button onClick={addAll} className="btn-dark"><ShoppingBag className="w-4 h-4" strokeWidth={1.5} /> Ajouter tout le look</button>
      </div>
    </div>
  );
};
