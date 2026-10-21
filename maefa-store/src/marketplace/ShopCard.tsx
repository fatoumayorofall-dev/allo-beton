import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import type { ShopSummary } from './api';
import { mpPath } from './config';
import { ACCENTS } from './format';

/** Une boutique dans l'annuaire : sa vitrine (bannière ou ses derniers articles), sans aucun prix. */
export const ShopCard: React.FC<{ shop: ShopSummary }> = ({ shop: s }) => {
  const color = ACCENTS[s.accent]?.hex ?? ACCENTS.prune.hex;
  return (
    <Link
      to={mpPath(`/boutique/${s.slug}`)}
      className="group block bg-white rounded-3xl overflow-hidden border border-ink/[0.06] hover:shadow-soft transition-shadow"
      data-testid="mp-shop-card"
    >
      <div className="relative aspect-[16/9] overflow-hidden" style={{ background: color }}>
        {s.cover ? (
          <img src={s.cover} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="grid grid-cols-3 h-full gap-0.5">
            {s.photos.map(p => (
              <img key={p} src={p} alt="" loading="lazy" className="w-full h-full object-cover" />
            ))}
          </div>
        )}
        {s.featured && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gold text-ink text-[10px] font-bold uppercase tracking-wide"
            data-testid="mp-featured"
          >
            À la une
          </span>
        )}
        {s.pro && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-bold uppercase tracking-wide">
            Boutique Pro
          </span>
        )}
      </div>
      <div className="p-4 pt-0 -mt-7 relative">
        <span
          className="w-14 h-14 rounded-2xl border-4 border-white overflow-hidden grid place-items-center font-display text-2xl text-white"
          style={{ background: color }}
        >
          {s.logo ? <img src={s.logo} alt="" className="w-full h-full object-cover" /> : s.shopName[0]}
        </span>
        <p className="mt-2 font-display text-xl leading-tight flex items-center gap-1.5">
          <span className="truncate">{s.shopName}</span>
          {s.verified && <BadgeCheck className="w-4 h-4 text-emerald-700 shrink-0" aria-label="Boutique vérifiée" />}
        </p>
        <p className="mt-1 text-xs text-ink/65 flex flex-wrap items-center gap-x-3 gap-y-1">
          {s.zone && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {s.zone}
            </span>
          )}
          <span>
            {s.articles} article{s.articles > 1 ? 's' : ''}
          </span>
          {!!s.rating.count && (
            <span className="inline-flex items-center gap-1">
              <Star className="w-3 h-3 fill-gold text-gold" /> {s.rating.average?.toLocaleString('fr-FR')} (
              {s.rating.count})
            </span>
          )}
        </p>
        {s.description && <p className="mt-2 text-sm text-ink/75 line-clamp-2">{s.description}</p>}
      </div>
    </Link>
  );
};
