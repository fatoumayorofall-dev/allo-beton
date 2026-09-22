import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Instagram, Plus, RefreshCw, ShieldCheck, Smartphone, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/catalog';
import { SITE_CONFIG } from '../config/site';
import { formatPrice } from '../utils/format';
import { usePrefersReducedMotion } from '../utils/hooks';
import { usePageTitle } from '../utils/usePageTitle';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { Reveal } from '../components/Reveal';

const px = (id: number, w = 1600) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const HERO_SLIDES = [
  {
    kicker: 'Collection Automne — 2026',
    title: ['L\'élégance', 'jusqu\'au bout', 'des pieds'],
    accent: 1,
    text: 'Escarpins en velours, mocassins cousus main et sneakers en cuir : la nouvelle saison se porte avec assurance.',
    cta: { label: 'Découvrir les chaussures', to: '/boutique/chaussures' },
    image: px(1464625),
  },
  {
    kicker: 'Maroquinerie',
    title: ['Le sac', 'qui signe', 'votre allure'],
    accent: 1,
    text: 'Sacs structurés, cabas en wax façonnés à Dakar et pochettes de soirée perlées.',
    cta: { label: 'Explorer les sacs', to: '/boutique/sacs' },
    image: px(1152077),
  },
  {
    kicker: 'Joaillerie',
    title: ['L\'éclat', 'des grands', 'jours'],
    accent: 2,
    text: 'Plaqué or 18 carats, perles nacrées et créoles lumineuses pour chaque cérémonie.',
    cta: { label: 'Voir les bijoux', to: '/boutique/bijoux' },
    image: px(1191531),
  },
];

const TESTIMONIALS = [
  { name: 'Aïssatou N.', city: 'Mermoz, Dakar', text: 'Commande reçue le lendemain dans un écrin magnifique. Le sac Fatou est encore plus beau en vrai — on me demande sans cesse d\'où il vient.' },
  { name: 'Ousmane F.', city: 'Thiès', text: 'Des mocassins d\'une qualité rare, payés avec Wave en deux minutes. Un service client attentionné, à l\'écoute sur WhatsApp.' },
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
  const [c0, ...cRest] = CATEGORIES;

  return (
    <div>
      {/* ───────────── HERO ───────────── */}
      <section className="relative h-[100svh] min-h-[620px] overflow-hidden bg-ink grain" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        aria-roledescription="carrousel" aria-label="À la une">
        {HERO_SLIDES.map((s, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-[1.4s] ease-luxe ${i === slide ? 'opacity-100' : 'opacity-0'}`} aria-hidden={i !== slide}>
            <div className={`absolute inset-0 ${i === slide ? 'animate-kenburns' : ''}`}>
              <ProductImage src={s.image} alt="" className="w-full h-full" />
            </div>
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-ink/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/60 via-transparent to-transparent" />

        <div className="relative h-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex flex-col justify-end pb-24 sm:pb-28">
          <div key={slide} className="max-w-3xl text-ivory">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-luxe text-gold-light animate-fade-up">{current.kicker}</p>
            <h1 className="font-display font-normal text-[3.4rem] sm:text-7xl lg:text-[7.5rem] leading-[0.92] mt-5">
              {current.title.map((line, i) => (
                <span key={i} className={`block animate-fade-up ${i === current.accent ? 'italic text-gold-light' : ''}`} style={{ animationDelay: `${120 + i * 110}ms` }}>{line}</span>
              ))}
            </h1>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-end gap-8 animate-fade-up" style={{ animationDelay: '500ms' }}>
              <p className="text-ivory/75 text-[15px] leading-relaxed max-w-sm">{current.text}</p>
              <Link to={current.cta.to} className="btn-light self-start shrink-0">{current.cta.label} <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
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
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
        <Reveal>
          <p className="eyebrow">Maison Fabima · Dakar</p>
          <p className="font-display text-3xl sm:text-5xl leading-[1.15] mt-8">
            Nous sélectionnons chaque pièce comme on choisit un bijou de famille : <em className="text-gold-dark">pour sa qualité</em>, pour son allure, et pour les souvenirs qu'elle accompagnera.
          </p>
          <div className="hairline w-40 mx-auto mt-12" />
        </Reveal>
      </section>

      {/* ───────────── UNIVERS ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        <Reveal className="flex items-end justify-between gap-6 mb-10">
          <div><p className="eyebrow">Nos univers</p><h2 className="font-display text-5xl sm:text-6xl mt-3">La garde-robe <em>complète</em></h2></div>
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

      {/* ───────────── SÉLECTION ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28 sm:pt-36">
        <Reveal className="text-center mb-12">
          <p className="eyebrow">La sélection</p>
          <h2 className="font-display text-5xl sm:text-6xl mt-3">Les pièces du moment</h2>
          <div className="mt-8 inline-flex gap-8 border-b border-ink/10" role="tablist">
            {([['bestsellers', 'Iconiques'], ['nouveautes', 'Nouveautés'], ['promos', 'Offres']] as const).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`pb-3 -mb-px text-[11px] uppercase tracking-[0.22em] font-semibold border-b transition-colors ${tab === id ? 'border-ink text-ink' : 'border-transparent text-ink/40 hover:text-ink'}`}>{label}</button>
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
            <div className="aspect-[4/5] overflow-hidden"><ProductImage src={px(6044266, 1000)} alt="Artisane de l'atelier Teranga" label="Atelier Teranga" className="w-full h-full" /></div>
            <div className="hidden sm:block absolute -bottom-10 -right-10 lg:-right-20 w-44 lg:w-56 aspect-[3/4] overflow-hidden border-[10px] border-ivory shadow-luxe">
              <ProductImage src={px(994523, 600)} alt="Robe en wax" label="" className="w-full h-full" />
            </div>
          </Reveal>
          <Reveal className="lg:col-span-6 lg:col-start-7" delay={120}>
            <p className="eyebrow">Fait main à Dakar</p>
            <h2 className="font-display text-5xl sm:text-7xl leading-[0.95] mt-4">L'atelier<br /><em className="text-gold-dark">Teranga</em></h2>
            <p className="mt-8 text-ink/65 leading-relaxed max-w-lg">
              Au cœur de la Médina, nos artisanes et tailleurs façonnent des cabas en wax et des robes cintrées aux imprimés vibrants.
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
      <section className="mt-32 sm:mt-40 border-y border-ink/10 py-8 overflow-hidden" aria-hidden>
        <div className="flex whitespace-nowrap animate-marquee w-max">
          {[0, 1].map(k => (
            <div key={k} className="flex items-center">
              {['Élégance', 'Savoir-faire', 'Teranga', 'Raffinement', 'Dakar', 'Audace'].map(w => (
                <span key={w} className="font-display italic text-5xl sm:text-7xl px-8 text-ink/85 flex items-center gap-16">{w}<span className="text-gold text-2xl not-italic">✦</span></span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── SHOP THE LOOK ───────────── */}
      {look.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28 sm:pt-36">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <Reveal className="relative aspect-[4/5] overflow-hidden">
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
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 bg-ivory px-3 py-2 whitespace-nowrap text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-soft">
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
                      <ProductImage src={p.images[0]} alt={p.name} label="" className="w-16 h-20 shrink-0" />
                      <span className="flex-1"><span className="eyebrow !text-ink/40">{p.subcategory}</span><span className="block font-display text-xl mt-1 group-hover:text-gold-dark transition-colors">{p.name}</span></span>
                      <span className="text-sm">{formatPrice(p.price)}</span>
                      <ArrowUpRight className="w-4 h-4 text-ink/30 group-hover:text-ink group-hover:rotate-45 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-ink/50">Le look complet : <strong className="text-ink">{formatPrice(look.reduce((s, p) => s + p.price, 0))}</strong></p>
            </Reveal>
          </div>
        </section>
      )}

      {/* ───────────── SERVICES ───────────── */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-28 sm:pt-36">
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-ink/10">
          {[
            { Icon: Truck, t: 'Livraison 24h', d: `À Dakar, offerte dès ${formatPrice(SITE_CONFIG.freeShippingThreshold)}` },
            { Icon: Smartphone, t: 'Paiement mobile', d: 'Wave, Orange Money, Free Money ou espèces' },
            { Icon: RefreshCw, t: 'Échange offert', d: 'Taille ou couleur, sous 7 jours' },
            { Icon: ShieldCheck, t: 'Qualité contrôlée', d: 'Chaque pièce vérifiée avant l\'envoi' },
          ].map(({ Icon, t, d }, i) => (
            <Reveal key={t} delay={i * 80} className={`py-10 px-2 sm:px-6 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''} border-ink/10`}>
              <Icon className="w-6 h-6 text-gold-dark" strokeWidth={1.2} />
              <p className="font-display text-2xl mt-5">{t}</p>
              <p className="text-sm text-ink/55 mt-2 leading-relaxed">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────── TÉMOIGNAGES ───────────── */}
      <section className="mt-20 bg-ivory-deep">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
          <p className="eyebrow">Ils nous font confiance</p>
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
              <button key={t.name} onClick={() => setQuote(i)} aria-label={`Témoignage ${i + 1}`} className={`h-[2px] transition-all duration-500 ${i === quote ? 'w-10 bg-ink' : 'w-5 bg-ink/20'}`} />
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
          <p className="text-ink/55 mt-3 text-sm">Partagez votre look avec le hashtag pour apparaître ici.</p>
        </Reveal>
        <div className="grid grid-cols-3 lg:grid-cols-6">
          {products.filter(p => p.images[0]).slice(0, 6).map((p, i) => (
            <a key={p.id} href={SITE_CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden" aria-label={`Instagram — ${p.name}`}>
              <ProductImage src={p.images[p.images.length > 1 && i % 2 ? 1 : 0]} alt="" className="w-full h-full group-hover:scale-110 transition-transform duration-[1.2s]" />
              <span className="absolute inset-0 bg-ink/0 group-hover:bg-ink/40 transition-colors duration-500 grid place-items-center">
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
  <Link to={`/boutique/${id}`} className={`group relative block overflow-hidden ${tall ? 'aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[640px]' : 'aspect-[3/4]'}`}>
    <ProductImage src={image} alt={name} label="" className="absolute inset-0 w-full h-full transition-transform duration-[1.6s] ease-luxe group-hover:scale-[1.07]" />
    <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/5 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 text-ivory flex items-end justify-between gap-4">
      <div>
        <h3 className={`font-display leading-none ${tall ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl'}`}>{name}</h3>
        <p className="text-xs text-ivory/70 mt-2 hidden sm:block">{description}</p>
      </div>
      <span className="w-11 h-11 rounded-full border border-ivory/50 grid place-items-center shrink-0 group-hover:bg-ivory group-hover:text-ink transition-colors duration-500">
        <ArrowUpRight className="w-4 h-4" />
      </span>
    </div>
  </Link>
);
