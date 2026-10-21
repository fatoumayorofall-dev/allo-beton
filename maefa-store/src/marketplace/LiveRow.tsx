import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, BellRing, CalendarClock, Eye } from 'lucide-react';
import { fetchLives, fetchUpcoming, remindLive, type LiveSummary, type UpcomingLive } from './api';
import { mpPath } from './config';
import { ACCENTS } from './format';
import { useAccount } from '../context/AccountContext';

/** « samedi 20:00 », « aujourd'hui 20:00 », « demain 18:30 » */
export function liveWhen(iso: string) {
  const d = new Date(iso);
  const day = (x: Date) => x.toDateString();
  const today = new Date();
  const tomorrow = new Date(Date.now() + 864e5);
  const hour = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (day(d) === day(today)) return `aujourd'hui ${hour}`;
  if (day(d) === day(tomorrow)) return `demain ${hour}`;
  return `${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })} ${hour}`;
}

/** Bouton « Me prévenir » d'un live programmé (message 15 minutes avant et au début) */
export const RemindButton: React.FC<{
  slug: string;
  reminded: boolean;
  onChange?: (on: boolean) => void;
  dark?: boolean;
}> = ({ slug, reminded, onChange, dark }) => {
  const { status } = useAccount();
  const navigate = useNavigate();
  const [on, setOn] = useState(reminded);
  useEffect(() => setOn(reminded), [reminded]);
  return (
    <button
      onClick={async e => {
        e.preventDefault();
        if (status !== 'user') return navigate(mpPath(`/compte?retour=${encodeURIComponent(location.pathname)}`));
        const r = await remindLive(slug, !on);
        if (r.ok) {
          setOn(r.data.on);
          onChange?.(r.data.on);
        }
      }}
      aria-pressed={on}
      className={`h-8 px-3 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${on ? (dark ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900') : dark ? 'bg-white text-ink' : 'bg-ink text-white'}`}
      data-testid="mp-live-remind"
    >
      {on ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
      {on ? 'Rappel activé' : 'Me prévenir'}
    </button>
  );
};

/** En tête de l'accueil : les lives en cours, puis ceux qui sont programmés (rien s'il n'y en a pas). */
export const LiveRow: React.FC = () => {
  const [lives, setLives] = useState<LiveSummary[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingLive[]>([]);
  const { status } = useAccount();
  useEffect(() => {
    const load = () => {
      fetchLives().then(r => r.ok && setLives(r.data.lives));
      fetchUpcoming().then(r => r.ok && setUpcoming(r.data.upcoming));
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [status]);
  if (!lives.length && !upcoming.length) return null;
  return (
    <section className="mt-5" data-testid="mp-live-row">
      <h2 className="font-display text-2xl flex items-center gap-2">
        {lives.length ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" aria-hidden /> En direct maintenant
          </>
        ) : (
          <>
            <CalendarClock className="w-5 h-5" /> Lives à venir
          </>
        )}
      </h2>
      <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {lives.map(l => (
          <Link
            key={l.id}
            to={mpPath(`/live/${l.id}`)}
            className="relative shrink-0 w-36 aspect-[9/16] rounded-2xl overflow-hidden bg-ink text-white ring-2 ring-red-600"
            data-testid="mp-live-card"
          >
            {l.cover && <img src={l.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-bold uppercase inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden /> En direct
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
        {upcoming.map(u => {
          const s = u.seller!;
          const color = ACCENTS[s.accent]?.hex ?? ACCENTS.prune.hex;
          return (
            <div
              key={s.id}
              className="relative shrink-0 w-36 aspect-[9/16] rounded-2xl overflow-hidden text-white flex flex-col justify-between p-2.5"
              style={{ background: `linear-gradient(160deg, ${color}, #1c1917)` }}
              data-testid="mp-upcoming-card"
            >
              {s.cover && (
                <img src={s.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" />
              )}
              <span className="relative px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-bold uppercase w-fit inline-flex items-center gap-1">
                <CalendarClock className="w-3 h-3" /> {liveWhen(u.at)}
              </span>
              <span className="relative space-y-1.5">
                <Link to={mpPath(`/boutique/${s.slug}`)} className="block">
                  <span className="block text-xs font-bold truncate">{s.shopName}</span>
                  <span className="block text-[11px] leading-tight line-clamp-3 opacity-90">{u.title}</span>
                </Link>
                <RemindButton slug={s.slug} reminded={u.reminded} dark />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
