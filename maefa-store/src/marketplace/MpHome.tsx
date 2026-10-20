import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Search, Store, Truck, Users } from 'lucide-react';
import { fetchConfig, fetchListings, type MpCategory, type MpListing } from './api';
import { ListingCard } from './ListingCard';
import { MP, mpPath } from './config';
import { usePageTitle } from '../utils/usePageTitle';

const SORTS = [
  ['', 'Plus récents'],
  ['prix_asc', 'Prix croissant'],
  ['prix_desc', 'Prix décroissant'],
] as const;

export default function MpHome() {
  usePageTitle(MP.name, `${MP.tagline} : des vendeurs de tout le Sénégal, paiement à la livraison.`);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('rayon') ?? '';
  const sort = params.get('tri') ?? '';
  const [text, setText] = useState(q);
  const [categories, setCategories] = useState<MpCategory[]>([]);
  const [listings, setListings] = useState<MpListing[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfig().then(r => r.ok && setCategories(r.data.categories));
  }, []);
  useEffect(() => {
    let alive = true;
    setListings(null);
    fetchListings({ q, cat, tri: sort }).then(r => {
      if (!alive) return;
      if (r.ok) {
        setListings(r.data.listings);
        setTotal(r.data.total);
        setError('');
      } else {
        setListings([]);
        setError(r.error);
      }
    });
    return () => {
      alive = false;
    };
  }, [q, cat, sort]);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      {!q && !cat && (
        <section className="mt-5 rounded-3xl bg-ink text-ivory p-6 sm:p-10 relative overflow-hidden" data-dark>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold-light font-semibold">Place de marché</p>
          <h1 className="font-display text-4xl sm:text-5xl mt-2 leading-[1.05] max-w-xl">{MP.tagline}</h1>
          <ul className="mt-5 grid sm:grid-cols-3 gap-3 text-sm text-ivory/85 max-w-3xl">
            <li className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gold-light" /> Des vendeurs vérifiés
            </li>
            <li className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gold-light" /> Paiement à la livraison
            </li>
            <li className="flex items-center gap-2">
              <Store className="w-4 h-4 text-gold-light" /> Ouvrez votre boutique gratuitement
            </li>
          </ul>
          <Link
            to={mpPath('/vendre')}
            className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-ivory text-ink font-semibold text-sm"
          >
            <Store className="w-4 h-4" /> Vendre mes articles
          </Link>
        </section>
      )}

      <form
        role="search"
        className="mt-5 flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          set('q', text.trim());
        }}
      >
        <label className="flex-1 flex items-center gap-2 h-12 px-4 rounded-full bg-white border border-ink/10 focus-within:border-ink">
          <Search className="w-4 h-4 text-ink/50" />
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Robe, téléphone, thiouraye…"
            aria-label="Rechercher un article"
            className="flex-1 bg-transparent outline-none text-[15px]"
          />
        </label>
        <button className="btn-dark !h-12 !px-5">Chercher</button>
      </form>

      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Rayons">
        {[{ id: '', name: 'Tout' }, ...categories].map(c => (
          <button
            key={c.id}
            role="tab"
            aria-selected={cat === c.id}
            onClick={() => set('rayon', c.id)}
            className={`shrink-0 h-10 px-4 rounded-full text-sm border ${cat === c.id ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/10'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink/70">
          {listings ? `${total} article${total > 1 ? 's' : ''}` : 'Chargement…'}
          {q && (
            <>
              {' '}
              pour « {q} »{' '}
              <button
                className="underline"
                onClick={() => {
                  setText('');
                  set('q', '');
                }}
              >
                effacer
              </button>
            </>
          )}
        </p>
        <select value={sort} onChange={e => set('tri', e.target.value)} aria-label="Trier" className="field-sm !w-auto">
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {!listings ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
        </div>
      ) : listings.length ? (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" data-testid="mp-grid">
          {listings.map(l => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="font-display text-2xl">{error || 'Aucun article pour le moment'}</p>
          <p className="text-sm text-ink/70 mt-2">Soyez parmi les premiers vendeurs !</p>
          <Link to={mpPath('/vendre')} className="btn-dark mt-5 inline-flex !h-12 !px-6">
            Ouvrir ma boutique
          </Link>
        </div>
      )}
    </div>
  );
}
