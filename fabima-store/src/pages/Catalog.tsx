import React, { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/catalog';
import type { CategoryId, Product } from '../data/types';
import { ProductCard } from '../components/ProductCard';
import { ColorSwatch } from '../components/ColorSwatch';
import { usePageTitle } from '../utils/usePageTitle';
import { formatPrice } from '../utils/format';

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

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const Catalog: React.FC = () => {
  const { category } = useParams<{ category?: CategoryId }>();
  const [params, setParams] = useSearchParams();
  const { products } = useStore();
  const [filtersOpen, setFiltersOpen] = useState(false);

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
            <Link key={c.id} to={`/boutique/${c.id}?${params.toString()}`} className="block py-1 text-sm text-ink/70 hover:text-ink">{c.name}</Link>
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Pour">
        {[['', 'Tous'], ['femme', 'Femme'], ['homme', 'Homme']].map(([v, l]) => (
          <Radio key={v} checked={gender === v} onChange={() => setParam('genre', v || null)} label={l} />
        ))}
      </FilterGroup>
      {subcategories.length > 1 && (
        <FilterGroup title="Type">
          <Radio checked={!sub} onChange={() => setParam('type', null)} label="Tous" />
          {subcategories.map(s => <Radio key={s} checked={sub === s} onChange={() => setParam('type', s)} label={s} />)}
        </FilterGroup>
      )}
      <FilterGroup title="Prix (FCFA)">
        <Radio checked={!price} onChange={() => setParam('prix', null)} label="Tous les prix" />
        {PRICE_RANGES.map(r => <Radio key={r.id} checked={price === r.id} onChange={() => setParam('prix', r.id)} label={r.label} />)}
      </FilterGroup>
      <FilterGroup title="Couleur">
        <div className="flex flex-wrap gap-2.5">
          {colors.map(c => (
            <ColorSwatch key={c.name} color={c} size={26} selected={color === c.name} onClick={() => setParam('couleur', color === c.name ? null : c.name)} />
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
      {activeCount > 0 && <button onClick={reset} className="text-sm underline underline-offset-4">Réinitialiser les filtres</button>}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <nav className="flex items-center gap-1.5 text-xs text-ink/50 mb-6" aria-label="Fil d'Ariane">
        <Link to="/" className="hover:text-ink">Accueil</Link><ChevronRight className="w-3 h-3" />
        <Link to="/boutique" className="hover:text-ink">Boutique</Link>
        {cat && <><ChevronRight className="w-3 h-3" /><span className="text-ink">{cat.name}</span></>}
      </nav>

      <header className="mb-8">
        <h1 className="font-display text-4xl sm:text-5xl">{cat?.name ?? (promoOnly ? 'Soldes' : q ? `Résultats pour « ${q} »` : 'Toute la boutique')}</h1>
        <p className="mt-2 text-ink/60">{cat?.description ?? 'Chaussures, sacs, accessoires, bijoux et prêt-à-porter.'}</p>
        {q && <button onClick={() => setParam('q', null)} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/5 text-sm">« {q} » <X className="w-3.5 h-3.5" /></button>}
      </header>

      {/* Onglets catégories */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
        <Link to="/boutique" className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${!cat ? 'bg-ink text-ivory' : 'border border-ink/15'}`}>Tout</Link>
        {CATEGORIES.map(c => (
          <Link key={c.id} to={`/boutique/${c.id}`} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${cat?.id === c.id ? 'bg-ink text-ivory' : 'border border-ink/15 hover:border-ink'}`}>{c.name}</Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-[230px_1fr] gap-10">
        <aside className="hidden lg:block">{filters}</aside>

        <div>
          <div className="flex items-center justify-between gap-3 mb-6">
            <button onClick={() => setFiltersOpen(true)} className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-ink/20 text-sm">
              <SlidersHorizontal className="w-4 h-4" /> Filtres {activeCount > 0 && <span className="w-5 h-5 rounded-full bg-ink text-ivory text-[10px] grid place-items-center">{activeCount}</span>}
            </button>
            <p className="text-sm text-ink/60 hidden sm:block">{filtered.length} article{filtered.length > 1 ? 's' : ''}</p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-ink/60 hidden sm:inline">Trier par</span>
              <select value={sort} onChange={e => setParam('tri', e.target.value === 'pertinence' ? null : e.target.value)}
                className="px-3 py-2.5 rounded-full border border-ink/20 bg-transparent outline-none">
                {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl">
              <p className="font-display text-2xl">Aucun article ne correspond</p>
              <p className="text-ink/60 mt-2">Essayez d'élargir vos critères.</p>
              <button onClick={reset} className="mt-6 px-6 py-3 rounded-full bg-ink text-ivory text-sm font-semibold">Réinitialiser</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10">
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          <p className="text-xs text-ink/40 mt-10 text-center">Tous nos prix sont en FCFA, TTC. Livraison offerte dès {formatPrice(50000)}.</p>
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[75] lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto bg-ivory rounded-t-3xl p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl">Filtres</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Fermer"><X className="w-6 h-6" /></button>
            </div>
            {filters}
            <button onClick={() => setFiltersOpen(false)} className="mt-8 w-full py-3.5 rounded-full bg-ink text-ivory font-semibold">
              Voir {filtered.length} article{filtered.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FilterGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-xs uppercase tracking-[0.2em] font-semibold mb-3">{title}</h3>
    <div className="space-y-1">{children}</div>
  </div>
);

const Radio: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2.5 py-1 text-sm cursor-pointer">
    <input type="radio" checked={checked} onChange={onChange} className="accent-ink w-4 h-4" />
    <span className={checked ? 'text-ink font-medium' : 'text-ink/70'}>{label}</span>
  </label>
);
