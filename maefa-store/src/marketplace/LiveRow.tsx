import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { fetchLives, type LiveSummary } from './api';
import { mpPath } from './config';

/** « En direct maintenant » : les lives en cours, en tête de l'accueil (rien s'il n'y en a pas). */
export const LiveRow: React.FC = () => {
  const [lives, setLives] = useState<LiveSummary[]>([]);
  useEffect(() => {
    const load = () => fetchLives().then(r => r.ok && setLives(r.data.lives));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  if (!lives.length) return null;
  return (
    <section className="mt-5" data-testid="mp-live-row">
      <h2 className="font-display text-2xl flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" aria-hidden /> En direct maintenant
      </h2>
      <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {lives.map(l => (
          <Link
            key={l.id}
            to={mpPath(`/live/${l.id}`)}
            className="relative shrink-0 w-36 aspect-[9/16] rounded-2xl overflow-hidden bg-ink text-white"
            data-testid="mp-live-card"
          >
            {l.cover && <img src={l.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-bold uppercase">
              En direct
            </span>
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/40 text-[10px] inline-flex items-center gap-1">
              <Eye className="w-3 h-3" /> {l.viewers}
            </span>
            <span className="absolute bottom-2 inset-x-2">
              <span className="block text-xs font-bold truncate">{l.seller?.shopName}</span>
              <span className="block text-[11px] leading-tight line-clamp-2 opacity-90">{l.title}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};
