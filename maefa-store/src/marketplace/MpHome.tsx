import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clapperboard, Loader2, Search, Store, Truck, Users } from 'lucide-react';
import { fetchConfig, fetchFeed, fetchShops, type FeedItem, type MpCategory, type ShopSummary } from './api';
import { getSeen, getTaste } from './taste';
import { useAccount } from '../context/AccountContext';
import { visitorId } from '../utils/track';
import { ListingCard } from './ListingCard';
import { ShopCard } from './ShopCard';
import { MP, mpPath } from './config';
import { usePageTitle } from '../utils/usePageTitle';

/**
 * Accueil : les boutiques en ligne des abonnés. On choisit une boutique, pas un prix : aucun prix n'est
 * montré ici (les vendeurs ne sont pas mis en concurrence) ; on les voit dans chaque boutique.
 */
export default function MpHome() {
  usePageTitle(
    MP.name,
    `${MP.tagline} : les boutiques en ligne de vendeurs de tout le Sénégal, paiement à la livraison.`,
  );
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('rayon') ?? '';
  const [text, setText] = useState(q);
  const [categories, setCategories] = useState<MpCategory[]>([]);
  const [shops, setShops] = useState<ShopSummary[] | null>(null);
  const [error, setError] = useState('');
  const [forYou, setForYou] = useState<FeedItem[]>([]);
  const { user } = useAccount();

  useEffect(() => {
    fetchConfig().then(r => r.ok && setCategories(r.data.categories));
  }, []);
  // « Pour vous » : les 8 premiers du fil personnalisé (sans prix)
  useEffect(() => {
    const near = user?.location ? { lat: user.location.lat, lng: user.location.lng } : null;
    fetchFeed({ v: visitorId(), taste: getTaste(), seen: getSeen(), near, page: 1, per: 8 }).then(
      r => r.ok && setForYou(r.data.items),
    );
  }, [user?.location]);
  useEffect(() => {
    let alive = true;
    setShops(null);
    fetchShops({ q, rayon: cat }).then(r => {
      if (!alive) return;
      setShops(r.ok ? r.data.shops : []);
      setError(r.ok ? '' : r.error);
    });
    return () => {
      alive = false;
    };
  }, [q, cat]);

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
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold-light font-semibold">Boutiques en ligne</p>
          <h1 className="font-display text-4xl sm:text-5xl mt-2 leading-[1.05] max-w-xl">{MP.tagline}</h1>
          <ul className="mt-5 grid sm:grid-cols-3 gap-3 text-sm text-ivory/85 max-w-3xl">
            <li className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gold-light" /> Des boutiques vérifiées
            </li>
            <li className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gold-light" /> Paiement à la livraison
            </li>
            <li className="flex items-center gap-2">
              <Store className="w-4 h-4 text-gold-light" /> Votre boutique en ligne, sans payer de site
            </li>
          </ul>
          <Link
            to={mpPath('/vendre')}
            className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-ivory text-ink font-semibold text-sm"
          >
            <Store className="w-4 h-4" /> Créer ma boutique en ligne
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
            placeholder="Une boutique, un quartier, un article…"
            aria-label="Rechercher une boutique"
            className="flex-1 bg-transparent outline-none text-[15px]"
          />
        </label>
        <button className="btn-dark !h-12 !px-5">Chercher</button>
      </form>

      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Rayons">
        {[{ id: '', name: 'Toutes' }, ...categories].map(c => (
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

      <p className="mt-4 text-sm text-ink/70">
        {shops ? `${shops.length} boutique${shops.length > 1 ? 's' : ''}` : 'Chargement…'}
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

      {!shops ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
        </div>
      ) : shops.length ? (
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="mp-shops">
          {shops.map(s => (
            <ShopCard key={s.id} shop={s} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="font-display text-2xl">{error || 'Aucune boutique pour le moment'}</p>
          <p className="text-sm text-ink/70 mt-2">Ouvrez la vôtre : c'est votre site, sans payer de développeur.</p>
          <Link to={mpPath('/vendre')} className="btn-dark mt-5 inline-flex !h-12 !px-6">
            Créer ma boutique en ligne
          </Link>
        </div>
      )}

      {!q && !cat && forYou.length > 0 && (
        <section className="mt-8" data-testid="mp-for-you">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl">À découvrir dans les boutiques</h2>
            <Link
              to={mpPath('/pour-vous')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
            >
              <Clapperboard className="w-4 h-4" /> Voir en vidéo
            </Link>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x">
            {forYou.map(l => (
              <div key={l.id} className="w-40 sm:w-48 shrink-0 snap-start">
                <ListingCard listing={l} why={l.why} showPrice={false} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
