import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Play, Sparkles } from 'lucide-react';
import type { MpListing } from './api';
import { mpPath } from './config';
import { priceText } from './format';

export const ListingCard: React.FC<{ listing: MpListing; showSeller?: boolean; why?: string }> = ({
  listing: l,
  showSeller = true,
  why,
}) => (
  <Link
    to={mpPath(`/annonce/${l.id}`)}
    className="group block bg-white rounded-2xl overflow-hidden border border-ink/[0.06] hover:shadow-soft transition-shadow"
    data-testid="mp-card"
  >
    <div className="relative aspect-square bg-ivory overflow-hidden">
      <img
        src={l.photos[0]}
        alt={l.title}
        loading="lazy"
        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
      />
      {l.video && (
        <span
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/55 text-white grid place-items-center"
          aria-label="Vidéo"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
        </span>
      )}
      {why && (
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-semibold">
          <Sparkles className="w-3 h-3 text-gold-dark" /> {why}
        </span>
      )}
      {l.condition === 'occasion' && (
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-bold uppercase tracking-wide">
          Occasion
        </span>
      )}
      {l.soldOut && (
        <span className="absolute inset-0 bg-white/60 grid place-items-center font-semibold text-sm">Épuisé</span>
      )}
    </div>
    <div className="p-3">
      <p className="text-[14px] leading-snug line-clamp-2 min-h-[2.5em]">{l.title}</p>
      <p className="mt-1 font-bold text-[15px]" data-testid="mp-card-price">
        {priceText(l)}
      </p>
      {l.negotiable && <p className="text-[11px] font-semibold text-emerald-800">Prix à négocier</p>}
      {showSeller && l.seller && (
        <p className="mt-1 text-[11px] text-ink/60 flex items-center gap-1 truncate">
          {l.seller.verified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
          <span className="truncate">
            {l.seller.shopName}
            {l.seller.zone && ` · ${l.seller.zone}`}
          </span>
        </p>
      )}
    </div>
  </Link>
);
