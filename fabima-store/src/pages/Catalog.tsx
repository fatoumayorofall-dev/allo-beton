import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/catalog';
import type { CategoryId, Product } from '../data/types';
import { ProductCard } from '../components/ProductCard';
import { ColorSwatch } from '../components/ColorSwatch';
import { usePageTitle } from '../utils/usePageTitle';
import { formatPrice } from '../utils/format';
import { SITE_CONFIG } from '../config/site';
import { ProductImage } from '../components/ProductImage';
import { useEscape, useLockBody } from '../utils/hooks';

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
  { id: 'lt15', label: 'Moins de 15 000', test: (p: number) => p < 15000 },
  { id: '15-30', label: '15 000 – 30 000', test: (p: number) => p >= 15000 && p <= 30000 },
  { id: '30-50', label: '30 000 – 50 000', test: (p: number) => p > 30000 && p <= 50000 },
  { id: 'gt50', label: 'Plus de 50 000', test: (p: number) => p > 50000 },
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
  const q = params.get('q') ?? '';
  const promoOnly = params.get('promo') === '1';
  const sort = (params.get('tri') as SortKey) in SORTS ? (params.get('tri') as SortKey) : 'pertinence';
  const gender = params.get('genre') ?? '';
  const sub = params.get('type') ?? '';
  const price = params.get('prix') ?? '';
  const color = params.get('couleur') ?? '';
  const inStock = params.get('stock') === '1';

  usePageTitle(cat?.name ?? (q ? `Recherche « ${q} »` : promoOnly ? 'Soldes' : 'Boutique'));

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const base = useMemo(() => (cat ? products.filter(p => p.category === cat.id) : products), [products, cat]);
  const subcategories = useMemo(() => [...new Set(base.map(p => p.subcategory))].sort(), [base]);
  const colors = useMemo(() => {
    const map = new Map<string, Product['colors'][number]>();
    base.forEach(p => p.colors.forEach(c => map.set(c.name, c)));
    return [...map.values()];
  }, [base]);

  const filtered = useMemo(() => {
    const term = normalize(q.trim());
    const range = PRICE_RANGES.find(r => r.id === price);
    const list = base.filter(p =>
      (!term || normalize(`${p.name} ${p.subcategory} ${p.category} ${p.description} ${p.colors.map(c => c.name).join(' ')}`).includes(term)) &&
      (!promoOnly || !!p.oldPrice) &&
      (!gender || p.gender === gender || p.gender === 'unisexe') &&
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
  }, [base, q, promoOnly, gender, sub, price, color, inStock, sort]);

  const activeCount = [gender, sub, price, color, inStock ? '1' : '', promoOnly ? '1' : ''].filter(Boolean).length;
  const reset = () => setParams(q ? { q } : {}, { replace: true });

  const filters = (
    <div className="space-y-8">
      {!cat && (
        <FilterGroup title="Catégorie">
          {CATEGORIES.map(c => (
            <Link key={c.id} to={`/boutique/${c.id}?${params.toString()}`} className="block py-1 text-sm text-ink/60 hover:text-ink link-luxe">{c.name}</Link>
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Pour">
        {[['', 'Tous'], ['femme', 'Femme'], ['homme', 'Homme']].map(([v, l]) => (
          <Radio name="genre" key={v} checked={gender === v} onChange={() => setParam('genre', v || null)} label={l} />
        ))}
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
      {/* Bannière */}
      <section className="relative h-[42vh] min-h-[320px] max-h-[460px] overflow-hidden bg-ink grain">
        <ProductImage src={cat?.image ?? CATEGORIES[1].image} alt="" className="absolute inset-0 w-full h-full opacity-70 animate-kenburns" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/20" />
        <div className="relative h-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex flex-col justify-end pb-10 text-ivory">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-ivory/60 mb-5" aria-label="Fil d'Ariane">
            <Link to="/" className="hover:text-ivory">Accueil</Link><ChevronRight className="w-3 h-3" />
            <Link to="/boutique" className="hover:text-ivory">Boutique</Link>
            {cat && <><ChevronRight className="w-3 h-3" /><span className="text-ivory">{cat.name}</span></>}
          </nav>
          <h1 className="font-display text-5xl sm:text-7xl leading-none">{cat?.name ?? (promoOnly ? 'Les offres' : q ? <>« <em>{q}</em> »</> : 'La boutique')}</h1>
          <p className="mt-3 text-ivory/70 text-sm max-w-md">{cat?.description ?? (promoOnly ? 'Une sélection de pièces à prix doux, en quantités limitées.' : 'Chaussures, sacs, accessoires, bijoux et prêt-à-porter.')}</p>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Univers */}
        <div className="flex gap-7 overflow-x-auto no-scrollbar border-b border-ink/10 -mx-5 px-5 sm:mx-0 sm:px-0">
          <Link to="/boutique" className={`py-5 text-[11px] uppercase tracking-[0.22em] font-semibold whitespace-nowrap border-b -mb-px ${!cat ? 'border-ink' : 'border-transparent text-ink/45 hover:text-ink'}`}>Tout</Link>
          {CATEGORIES.map(c => (
            <Link key={c.id} to={`/boutique/${c.id}`} className={`py-5 text-[11px] uppercase tracking-[0.22em] font-semibold whitespace-nowrap border-b -mb-px ${cat?.id === c.id ? 'border-ink' : 'border-transparent text-ink/45 hover:text-ink'}`}>{c.name}</Link>
          ))}
        </div>

        {/* Barre d'outils */}
        <div className="flex items-center justify-between gap-3 py-6 sticky top-16 lg:top-[116px] z-30 bg-ivory/95 backdrop-blur">
          <button onClick={() => setFiltersOpen(true)} className="lg:hidden inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold">
            <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} /> Filtrer {activeCount > 0 && <span className="w-5 h-5 rounded-full bg-ink text-ivory text-[10px] grid place-items-center">{activeCount}</span>}
          </button>
          <p className="text-xs text-ink/55 hidden lg:block">{filtered.length} pièce{filtered.length > 1 ? 's' : ''}</p>
          <div className="flex items-center gap-3">
            {q && <button onClick={() => setParam('q', null)} className="hidden sm:inline-flex items-center gap-1.5 px-3 h-8 border border-ink/15 text-xs">« {q} » <X className="w-3 h-3" /></button>}
            <label className="flex items-center gap-2 text-xs">
              <span className="text-ink/55 hidden sm:inline uppercase tracking-[0.18em]">Trier</span>
              <select value={sort} onChange={e => setParam('tri', e.target.value === 'pertinence' ? null : e.target.value)}
                className="h-10 pl-3 pr-8 border border-ink/15 bg-transparent outline-none text-sm focus:border-ink">
                {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-12">
          <aside className="hidden lg:block"><div className="sticky top-[210px] max-h-[calc(100vh-230px)] overflow-y-auto no-scrollbar pb-6">{filters}</div></aside>

          <div>
            {filtered.length === 0 ? (
              <div className="text-center py-28 border border-ink/10">
                <p className="font-display text-4xl">Aucune pièce ne correspond</p>
                <p className="text-ink/60 mt-3 text-sm">Élargissez vos critères pour découvrir d'autres merveilles.</p>
                <button onClick={reset} className="btn-dark mt-8">Réinitialiser les filtres</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-12">
                  {visible.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
                <div className="mt-16 text-center">
                  <p className="text-xs text-ink/50">{visible.length} sur {filtered.length} pièces</p>
                  <div className="w-48 h-[2px] bg-ink/10 mx-auto mt-3"><div className="h-full bg-ink transition-all duration-700" style={{ width: `${(visible.length / filtered.length) * 100}%` }} /></div>
                  {visible.length < filtered.length && (
                    <button onClick={() => setShown(n => n + PAGE_SIZE)} className="btn-outline mt-8">Voir plus de pièces</button>
                  )}
                </div>
              </>
            )}
            <p className="text-[11px] text-ink/40 mt-12 text-center">Prix en FCFA, TTC · Livraison offerte dès {formatPrice(SITE_CONFIG.freeShippingThreshold)}</p>
          </div>
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[75] lg:hidden">
          <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setFiltersOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Filtres" className="absolute bottom-0 inset-x-0 max-h-[88vh] flex flex-col bg-ivory animate-fade-up">
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
    <span className={checked ? 'text-ink' : 'text-ink/60 group-hover:text-ink transition-colors'}>{label}</span>
  </label>
);
