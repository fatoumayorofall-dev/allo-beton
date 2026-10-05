import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarHeart } from 'lucide-react';
import { daysUntil, formatDay, inDays, orderBy, upcomingFetes } from '../utils/fetes';

/** Accueil : les trois prochaines fêtes (Korité, Tabaski, Magal…) avec la date limite pour être livrée à temps. */
export const FetesCalendar: React.FC = () => {
  const fetes = useMemo(() => upcomingFetes().slice(0, 3), []);
  if (!fetes.length) return null;
  return (
    <section
      className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-20 sm:pt-28"
      aria-labelledby="fetes-titre"
      data-testid="home-fetes"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <p className="eyebrow">Calendrier des fêtes · Sénégal</p>
          <h2 id="fetes-titre" className="font-display text-4xl sm:text-5xl leading-[0.95] mt-3">
            Prête pour <em className="text-gold-dark text-magic">chaque fête</em>
          </h2>
        </div>
        <p className="text-sm text-ink/70 max-w-sm">
          Korité, Tabaski, Magal, mariages… Commandez à temps : Dakar est livrée en 24 h, les régions en 3 à 5 jours.
        </p>
      </div>
      <ul className="grid sm:grid-cols-3 gap-3 sm:gap-4">
        {fetes.map((f, i) => {
          const n = daysUntil(f.date);
          const soon = n <= 45;
          const dark = i === 0;
          return (
            <li key={f.id}>
              <Link
                to={`/boutique?occasion=${f.occasion}`}
                className={`group relative flex flex-col h-full p-6 sm:p-7 rounded-[1.75rem] border transition-all duration-500 hover:-translate-y-1 ${dark ? 'bg-ink text-ivory border-ink shadow-[0_30px_60px_-30px_rgba(58,31,45,.6)]' : 'bg-white border-ink/[0.06] hover:border-ink/20'}`}
                data-testid="fete-card"
              >
                <span className="flex items-center justify-between gap-3">
                  <span
                    className={`text-[11px] uppercase tracking-[0.24em] font-semibold ${dark ? 'text-gold-light' : 'text-gold-dark'}`}
                  >
                    {f.lunar ? 'Vers le ' : 'Le '}
                    {formatDay(f.date)}
                  </span>
                  <span
                    className={`text-[11px] px-2.5 h-6 inline-flex items-center rounded-full ${dark ? 'bg-ivory/10 text-ivory' : 'bg-blush text-ink'}`}
                  >
                    {inDays(n)}
                  </span>
                </span>
                <span className="font-display text-3xl sm:text-4xl leading-tight mt-5">{f.name}</span>
                <span className={`text-sm mt-2 ${dark ? 'text-ivory/75' : 'text-ink/70'}`}>{f.hint}</span>
                {soon && n > 3 && (
                  <span
                    className={`mt-5 flex items-start gap-2 text-[13px] leading-snug ${dark ? 'text-ivory/85' : 'text-ink/80'}`}
                  >
                    <CalendarHeart
                      className={`w-4 h-4 mt-0.5 shrink-0 ${dark ? 'text-gold-light' : 'text-gold-dark'}`}
                      strokeWidth={1.5}
                    />
                    <span>
                      Commandez avant le <strong>{formatDay(orderBy(f.date))}</strong> pour Dakar, le{' '}
                      <strong>{formatDay(orderBy(f.date, true))}</strong> pour les régions.
                    </span>
                  </span>
                )}
                <span
                  className={`mt-auto pt-6 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] font-semibold ${dark ? 'text-ivory' : 'text-ink'}`}
                >
                  Voir la sélection{' '}
                  <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {fetes.some(f => f.lunar) && (
        <p className="text-[11px] text-ink/70 mt-4">
          Les dates des fêtes musulmanes dépendent de l'observation de la lune et peuvent varier d'un jour.
        </p>
      )}
    </section>
  );
};
