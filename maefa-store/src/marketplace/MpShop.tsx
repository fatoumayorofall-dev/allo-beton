import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, Loader2, MapPin } from 'lucide-react';
import { fetchShop, type MpListing, type MpSeller } from './api';
import { ListingCard } from './ListingCard';
import { MP, mpPath } from './config';
import { usePageTitle } from '../utils/usePageTitle';

export default function MpShop() {
  const { slug = '' } = useParams();
  const [data, setData] = useState<{ seller: MpSeller; listings: MpListing[] } | null | 'absent'>(null);
  const s = data && data !== 'absent' ? data.seller : null;
  usePageTitle(s ? `${s.shopName} · ${MP.name}` : MP.name, s?.description.slice(0, 150));
  useEffect(() => {
    setData(null);
    fetchShop(slug).then(r => setData(r.ok ? r.data : 'absent'));
  }, [slug]);

  if (data === null)
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  if (data === 'absent' || !s)
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="font-display text-3xl">Boutique introuvable</p>
        <Link to={mpPath()} className="btn-dark mt-6 inline-flex !h-12 !px-6">
          Retour au marché
        </Link>
      </div>
    );
  return (
    <div className="max-w-6xl mx-auto px-4 pt-5" data-testid="mp-shop">
      <section className="bg-white rounded-3xl border border-ink/[0.06] p-5 sm:p-7 flex flex-col sm:flex-row gap-5">
        <span className="w-20 h-20 rounded-2xl bg-ivory overflow-hidden grid place-items-center font-display text-4xl shrink-0">
          {s.logo ? <img src={s.logo} alt="" className="w-full h-full object-cover" /> : s.shopName[0]}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-3xl sm:text-4xl flex items-center gap-2">
            {s.shopName}
            {s.verified && <BadgeCheck className="w-6 h-6 text-emerald-700" aria-label="Vendeur vérifié" />}
          </h1>
          <p className="mt-1 text-sm text-ink/65 flex flex-wrap items-center gap-x-3 gap-y-1">
            {s.zone && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {s.zone}
              </span>
            )}
            <span>
              Sur {MP.name} depuis {new Date(s.since).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
            {!!s.sales && (
              <span>
                {s.sales} vente{s.sales > 1 ? 's' : ''} livrée{s.sales > 1 ? 's' : ''}
              </span>
            )}
          </p>
          {s.description && <p className="mt-3 text-[15px] text-ink/85 whitespace-pre-line">{s.description}</p>}
        </div>
      </section>
      <h2 className="mt-8 font-display text-2xl">
        {data.listings.length} article{data.listings.length > 1 ? 's' : ''}
      </h2>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {data.listings.map(l => (
          <ListingCard key={l.id} listing={{ ...l, seller: s }} showSeller={false} />
        ))}
      </div>
    </div>
  );
}
