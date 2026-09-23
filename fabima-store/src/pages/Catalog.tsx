import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal, X, Globe2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ALL_CATEGORIES, CATEGORIES, OCCASIONS } from '../data/catalog';
import { useMarket } from '../utils/market';
import { MarketCard } from '../components/MarketCard';
import type { CategoryId, Product } from '../data/types';
import { ProductCard } from '../components/ProductCard';
import { ColorSwatch } from '../components/ColorSwatch';
import { usePageTitle } from '../utils/usePageTitle';
import { formatPrice } from '../utils/format';
import { SITE_CONFIG } from '../config/site';
import { ProductImage } from '../components/ProductImage';
import { useEscape, useLockBody } from '../utils/hooks';
import { GoldDust } from '../components/Magic';
import { Sparkle } from '../components/Decor';

const PAGE_SIZE = 12;

const SORTS = {
  pertinence: 'Pertinence',
  nouveautes: 'Nouveautés',
  prix_asc: 'Prix croissant',
  prix_desc: 'Prix décroissant',
  note: 'Mieux notés',
} as const;
type SortKey = keyof typeof SORTS;

const PRICE_RANGES = [
  { id: 'lt20', label: 'Moins de 20 000', test: (p: number) => p < 20000 },
  { id: '20-30', label: '20 000 – 30 000', test: (p: number) => p >= 20000 && p <= 30000 },
  { id: '30-40', label: '30 000 – 40 000', test: (p: number) => p > 30000 && p <= 40000 },
  { id: 'gt40', label: 'Plus de 40 000', test: (p: number) => p > 40000 },
];

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const Catalog: React.FC = () => {
  const { category } = useParams<{ category?: CategoryId }>();
  const [params, setParams] = useSearchParams();
  const { products } = useStore();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);
  useLockBody(filtersOpen);
  useEscape(filtersOpen, () => setFiltersOpen(false));
  useEffect(() => setShown(PAGE_SIZE), [params, category]);

  const cat = CATEGORIES.find(c => c.id === category);
  const market = useMarket().products ?? [];
  const marketMore = cat ? market.filter(p => p.category.toLowerCase() === cat.name.toLowerCase()) : market;
  // Ancien lien vers une catégorie pas encore en vente (bijoux…) : on l'annonce et on montre le reste
  const soon = !cat && category ? ALL_CATEGORIES.find(c => c.id === category) : undefined;
  const q = params.get('q') ?? '';
  const promoOnly = params.get('promo') === '1';
  const sort = (params.get('tri') as SortKey) in SORTS ? (params.get('tri') as SortKey) : 'pertinence';
  const occasionId = params.get('occasion') ?? '';
  const occasion = OCCASIONS.find(o => o.id === occasionId);
  const sub = params.get('type') ?? '';
  const price = params.get('prix') ?? '';
  const color = params.get('couleur') ?? '';
  const inStock = params.get('stock') === '1';

  usePageTitle(cat?.name ?? occasion?.name ?? (q ? `Recherche « ${q} »` : promoOnly ? 'Offres' : 'Boutique'),
    cat ? `${cat.description} pour femme chez Fabima Store, livraison 24h à Dakar.` : undefined);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const base = useMemo(() => (cat ? products.filter(p => p.category === cat.id) : products), [products, cat]);
  const subcategories = useMemo(() => [...new Set(base.map(p => p.subcategory))].sort(), [base]);
  const types = useMemo(() => subcategories.map(name => ({ name, image: base.find(p => p.subcategory === name)?.images[0] })), [subcategories, base]);
  const colors = useMemo(() => {
    const map = new Map<string, Product['colors'][number]>();
    base.forEach(p => p.colors.forEach(c => map.set(c.name, c)));
    return [...map.values()];
  }, [base]);

  const filtered = useMemo(() => {
    const term = normalize(q.trim());
    const range = PRICE_RANGES.find(r => r.id === price);
    const list = base.filter(p =>
      (!term || normalize(`${p.name} ${p.subcategory} ${p.category} ${p.description} ${p.material} ${p.colors.map(c => c.name).join(' ')} ${p.occasions.map(o => OCCASIONS.find(x => x.id === o)?.name).join(' ')}`).includes(term)) &&
      (!promoOnly || !!p.oldPrice) &&
      (!occasion || p.occasions.includes(occasion.id)) &&
      (!sub || p.subcategory === sub) &&
      (!range || range.test(p.price)) &&
      (!color || p.colors.some(c => c.name === color)) &&
      (!inStock || p.stock > 0),
    );
    const sorted = [...list];
    if (sort === 'nouveautes') sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === 'prix_asc') sorted.sort((a, b) => a.price - b.price);
    if (sort === 'prix_desc') sorted.sort((a, b) => b.price - a.price);
    if (sort === 'note') sorted.sort((a, b) => b.rating - a.rating);
    if (sort === 'pertinence') sorted.sort((a, b) => Number(!!b.isBestseller) - Number(!!a.isBestseller));
    return sorted;
  }, [base, q, promoOnly, occasion, sub, price, color, inStock, sort]);

  const activeCount = [occasionId, sub, price, color, inStock ? '1' : '', promoOnly ? '1' : ''].filter(Boolean).length;
  const reset = () => setParams(q ? { q } : {}, { replace: true });

  const filters = (
    <div className="space-y-8">
      {!cat && (
        <FilterGroup title="Catégorie">
          {CATEGORIES.map(c => (
            <Link key={c.id} to={`/boutique/${c.id}?${params.toString()}`} className="block py-1 text-sm text-ink/75 hover:text-ink link-luxe">{c.name}</Link>
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Occasion">
        <Radio name="occasion" checked={!occasion} onChange={() => setParam('occasion', null)} label="Toutes" />
        {OCCASIONS.map(o => <Radio name="occasion" key={o.id} checked={occasion?.id === o.id} onChange={() => setParam('occasion', o.id)} label={o.name} />)}
      </FilterGroup>
      {subcategories.length > 1 && (
        <FilterGroup title="Type">
          <Radio name="type" checked={!sub} onChange={() => setParam('type', null)} label="Tous" />
          {subcategories.map(s => <Radio name="type" key={s} checked={sub === s} onChange={() => setParam('type', s)} label={s} />)}
        </FilterGroup>
      )}
      <FilterGroup title="Prix (FCFA)">
        <Radio name="prix" checked={!price} onChange={() => setParam('prix', null)} label="Tous les prix" />
        {PRICE_RANGES.map(r => <Radio name="prix" key={r.id} checked={price === r.id} onChange={() => setParam('prix', r.id)} label={r.label} />)}
      </FilterGroup>
      <FilterGroup title="Couleur">
        <div className="flex flex-wrap gap-2.5">
          {colors.map(c => (
            <ColorSwatch key={c.name} color={c} size={22} selected={color === c.name} onClick={() => setParam('couleur', color === c.name ? null : c.name)} />
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Disponibilité">
        <label className="flex items-center gap-2.5 text-sm cursor-pointer">
          <input type="checkbox" checked={inStock} onChange={e => setParam('stock', e.target.checked ? '1' : null)} className="accent-ink w-4 h-4" /> En stock uniquement
        </label>
        <label className="flex items-center gap-2.5 text-sm cursor-pointer mt-2">
          <input type="checkbox" checked={promoOnly} onChange={e => setParam('promo', e.target.checked ? '1' : null)} className="accent-ink w-4 h-4" /> En promotion
        </label>
      </FilterGroup>
      {activeCount > 0 && <button onClick={reset} className="text-[11px] uppercase tracking-[0.2em] font-semibold link-luxe">Tout effacer ({activeCount})</button>}
    </div>
  );

  const visible = filtered.slice(0, shown);

  return (
    <div>
      {/* En-tête éditorial : titre à gauche, photo en arche à droite */}
      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-6 sm:pt-10">
        <div className="grid md:grid-cols-[1fr_auto] gap-6 md:gap-12 items-center">
          <div>
            <nav className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-ink/70 mb-5" aria-label="Fil d'Ariane">
              <Link to="/" className="hover:text-ink">Accueil</Link><ChevronRight className="w-3 h-3" />
              <Link to="/boutique" className="hover:text-ink">Boutique</Link>
              {cat && <><ChevronRight className="w-3 h-3" /><span className="text-ink">{cat.name}</span></>}
            </nav>
            {occasion && !cat && <p className="eyebrow mb-2">{occasion.tagline}</p>}
            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl leading-[0.92]">{cat?.name ?? occasion?.name ?? (promoOnly ? 'Les offres' : q ? <>« <em className="text-gold-dark">{q}</em> »</> : <>La <em className="text-gold-dark text-magic">boutique</em></>)}</h1>
            <p className="mt-4 text-ink/75 max-w-lg leading-relaxed">{cat?.description ?? (occasion ? `Notre sélection de pièces pour « ${occasion.name.toLowerCase()} ».` : promoOnly ? 'Une sélection de pièces à prix doux, en quantités limitées.' : soon ? `${soon.name} : bientôt chez Fabima ! En attendant, découvrez nos ${CATEGORIES.map(c => c.name.toLowerCase()).join(' et nos ')}.` : `${CATEGORIES.map(c => c.name).join(', ').replace(/, ([^,]*)$/, ' et $1')} pour elle.`)}</p>
            {occasion && cat && <p className="mt-2 text-xs text-gold-dark">Occasion : {occasion.name}</p>}
            {/* Univers : sélecteur en pilule */}
            <div className="mt-7 inline-flex p-1 rounded-full bg-white border border-ink/[0.07] shadow-soft">
              <Link to="/boutique" className={`px-5 h-10 inline-flex items-center rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold transition-colors ${!cat ? 'bg-ink text-ivory' : 'text-ink/75 hover:text-ink'}`}>Tout</Link>
              {CATEGORIES.map(c => (
                <Link key={c.id} to={`/boutique/${c.id}`} className={`px-5 h-10 inline-flex items-center rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold transition-colors ${cat?.id === c.id ? 'bg-ink text-ivory' : 'text-ink/75 hover:text-ink'}`}>{c.name}</Link>
              ))}
            </div>
          </div>
          <div className="hidden md:block relative">
            <div className="relative w-[200px] lg:w-[250px] aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2rem] shadow-luxe bg-ivory-deep">
              <ProductImage src={cat?.image ?? occasion?.image ?? CATEGORIES[1].image} alt="" className="w-full h-full animate-kenburns" sizes="250px" priority />
              <GoldDust className="mix-blend-screen" density={0.8} />
            </div>
            <Sparkle className="absolute -top-2 -right-3 w-6 h-6 text-gold animate-twinkle pointer-events-none" />
            <Sparkle className="absolute top-[38%] -left-4 w-3 h-3 text-mauve animate-twinkle pointer-events-none" style={{ animationDelay: '1.6s' }} />
          </div>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Types de pièces : pastilles photo (un toucher filtre, un second retire le filtre) */}
        {types.length > 1 && (
          <ul className="mt-8 flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 pb-2" aria-label="Types de pièces" data-testid="type-chips">
            {types.map(t => (
              <li key={t.name} className="shrink-0">
                <button onClick={() => setParam('type', sub === t.name ? null : t.name)} aria-pressed={sub === t.name} className="group flex flex-col items-center gap-2 w-[76px]">
                  <span className={`w-[68px] h-[68px] rounded-full overflow-hidden p-[3px] transition-all duration-500 ${sub === t.name ? 'bg-gradient-to-br from-gold to-wine' : 'bg-ink/[0.06] group-hover:bg-gold-light'}`}>
                    <span className="block w-full h-full rounded-full overflow-hidden border-2 border-ivory"><ProductImage src={t.image} alt="" label="" className="w-full h-full group-hover:scale-110 transition-transform duration-700" /></span>
                  </span>
                  <span className={`text-[11px] leading-tight text-center line-clamp-2 ${sub === t.name ? 'font-semibold text-ink' : 'text-ink/75'}`}>{t.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Barre d'outils */}
        <div className="flex items-center justify-between gap-3 py-6 sticky top-16 lg:top-[116px] z-30 bg-ivory/95 backdrop-blur">
          <button onClick={() => setFiltersOpen(true)} className="lg:hidden inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold">
            <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} /> Filtrer {activeCount > 0 && <span className="w-5 h-5 rounded-full bg-ink text-ivory text-[10px] grid place-items-center">{activeCount}</span>}
          </button>
          <p className="text-xs text-ink/70 hidden lg:block">{filtered.length} pièce{filtered.length > 1 ? 's' : ''}</p>
          <div className="flex items-center gap-3">
            {q && <button onClick={() => setParam('q', null)} className="hidden sm:inline-flex items-center gap-1.5 px-3 h-8 rounded-full border border-ink/15 text-xs">« {q} » <X className="w-3 h-3" /></button>}
            <label className="flex items-center gap-2 text-xs">
              <span className="text-ink/70 hidden sm:inline uppercase tracking-[0.18em]">Trier</span>
              <select value={sort} onChange={e => setParam('tri', e.target.value === 'pertinence' ? null : e.target.value)} aria-label="Trier les pièces"
                className="h-10 pl-4 pr-8 rounded-full border border-ink/15 bg-transparent outline-none text-sm focus:border-ink">
                {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-12">
          <aside className="hidden lg:block" aria-labelledby="filtres-titre"><h2 id="filtres-titre" className="sr-only">Filtres</h2><div className="sticky top-[210px] max-h-[calc(100vh-230px)] overflow-y-auto no-scrollbar pb-6">{filters}</div></aside>

          <div>
            {filtered.length === 0 ? (
              <div className="text-center py-28 border border-ink/10 rounded-[2rem]">
                <p className="font-display text-4xl">Aucune pièce ne correspond</p>
                <p className="text-ink/75 mt-3 text-sm">Élargissez vos critères pour découvrir d'autres merveilles.</p>
                <button onClick={reset} className="btn-dark mt-8">Réinitialiser les filtres</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-12">
                  {visible.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
                <div className="mt-16 text-center">
                  <p className="text-xs text-ink/70">{visible.length} sur {filtered.length} pièces</p>
                  <div className="w-48 h-[2px] bg-ink/10 mx-auto mt-3"><div className="h-full bg-ink transition-all duration-700" style={{ width: `${(visible.length / filtered.length) * 100}%` }} /></div>
                  {visible.length < filtered.length && (
                    <button onClick={() => setShown(n => n + PAGE_SIZE)} className="btn-outline mt-8">Voir plus de pièces</button>
                  )}
                </div>
              </>
            )}
            {marketMore.length > 0 && (
              <section className="mt-20 p-6 sm:p-8 rounded-[2rem] bg-white border border-ink/[0.06]" data-testid="catalog-market">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                  <div>
                    <p className="eyebrow inline-flex items-center gap-2"><Globe2 className="w-3.5 h-3.5" /> Le Marché · sur commande</p>
                    <h2 className="font-display text-3xl sm:text-4xl mt-2">Encore plus de {cat ? cat.name.toLowerCase() : 'modèles'}</h2>
                  </div>
                  <Link to={`/marche${cat ? `?categorie=${encodeURIComponent(cat.name)}` : ''}`} className="text-[11px] uppercase tracking-[0.22em] font-semibold link-luxe">Tout voir au Marché</Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">{marketMore.slice(0, 4).map(p => <MarketCard key={p.id} product={p} />)}</div>
              </section>
            )}
            <p className="text-[11px] text-ink/70 mt-12 text-center">Prix en FCFA, TTC · Livraison offerte dès {formatPrice(SITE_CONFIG.freeShippingThreshold)}</p>
          </div>
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[75] lg:hidden">
          <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setFiltersOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Filtres" className="absolute bottom-0 inset-x-0 max-h-[88vh] flex flex-col bg-ivory rounded-t-[2rem] overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 h-16 border-b border-ink/10">
              <h2 className="font-display text-3xl">Filtrer</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Fermer" className="w-10 h-10 grid place-items-center"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">{filters}</div>
            <div className="p-4 border-t border-ink/10">
              <button onClick={() => setFiltersOpen(false)} className="btn-dark w-full">Voir {filtered.length} pièce{filtered.length > 1 ? 's' : ''}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FilterGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-[10px] uppercase tracking-luxe font-semibold mb-4 pb-3 border-b border-ink/10">{title}</h3>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const Radio: React.FC<{ name: string; checked: boolean; onChange: () => void; label: string }> = ({ name, checked, onChange, label }) => (
  <label className="flex items-center gap-3 py-1 text-sm cursor-pointer group">
    <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only peer" />
    <span className={`w-3.5 h-3.5 rounded-full border grid place-items-center transition-colors peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-gold ${checked ? 'border-ink' : 'border-ink/30 group-hover:border-ink'}`}>
      {checked && <span className="w-1.5 h-1.5 rounded-full bg-ink" />}
    </span>
    <span className={checked ? 'text-ink' : 'text-ink/75 group-hover:text-ink transition-colors'}>{label}</span>
  </label>
);
