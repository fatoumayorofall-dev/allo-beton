import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, MapPin } from 'lucide-react';
import { Stars } from '../components/Stars';
import {
  PROBLEM_LABELS,
  fetchTracking,
  reportProblem,
  reviewOrder,
  type MpOrder,
  type ProblemKind,
  type Tracking,
} from './api';

const PROBLEM_HOURS = 72;

/** Pendant la livraison : où est le livreur (mis à jour toutes les 20 secondes). */
export const DriverTracking: React.FC<{ order: MpOrder }> = ({ order: o }) => {
  const [t, setT] = useState<Tracking | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetchTracking(o.id).then(r => alive && r.ok && setT(r.data.tracking));
    load();
    const timer = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [o.id]);
  if (!t) return null;
  return (
    <div
      className="mt-2 rounded-xl bg-sky-50 text-sky-950 px-3 py-2 text-sm flex flex-wrap items-center gap-2"
      data-testid="mp-tracking"
    >
      <span>
        🛵 {t.name} {t.phase === 'chez_vendeur' ? 'récupère votre colis chez le vendeur' : 'arrive chez vous'}
        {t.km !== undefined && t.minutes !== undefined && (
          <>
            {' '}
            · à <strong>{t.km.toLocaleString('fr-FR')} km</strong> (≈ {t.minutes} min)
          </>
        )}
      </span>
      {t.position && (
        <a
          href={`https://www.google.com/maps?q=${t.position.lat},${t.position.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 font-semibold underline"
        >
          <MapPin className="w-3.5 h-3.5" /> Voir sur la carte
        </a>
      )}
    </div>
  );
};

/** Après la livraison : avis vérifié (vendeur, livreur) et signalement d'un problème. */
export const AfterSale: React.FC<{ order: MpOrder; onChange: (patch: Partial<MpOrder>) => void }> = ({
  order: o,
  onChange,
}) => {
  const [stars, setStars] = useState(0);
  const [driverStars, setDriverStars] = useState(0);
  const [text, setText] = useState('');
  const [problemOpen, setProblemOpen] = useState(false);
  const [kind, setKind] = useState<ProblemKind | ''>('');
  const [problemText, setProblemText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const deliveredAt = o.history?.find(h => h.status === 'livree')?.at;
  const withinProblemWindow =
    o.status === 'livree' && !!deliveredAt && Date.now() - Date.parse(deliveredAt) < PROBLEM_HOURS * 3600e3;
  const late = ['prete', 'en_livraison'].includes(o.status);
  const canReport = !o.dispute || o.dispute.status !== 'ouvert' ? withinProblemWindow || late : false;
  const kinds = (Object.keys(PROBLEM_LABELS) as ProblemKind[]).filter(k => (late ? k === 'non_recu' : true));

  return (
    <div className="mt-3 space-y-3">
      {o.dispute && (
        <p
          className={`text-sm rounded-xl px-3 py-2 ${o.dispute.status === 'ouvert' ? 'bg-amber-50 text-amber-900' : 'bg-ivory'}`}
          data-testid="mp-dispute"
        >
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          {PROBLEM_LABELS[o.dispute.kind]} :{' '}
          {o.dispute.status === 'ouvert'
            ? "signalement reçu, l'équipe examine et contacte le vendeur."
            : `${o.dispute.status === 'resolu' ? 'résolu' : 'clôturé'} — ${o.dispute.resolution}`}
        </p>
      )}

      {o.status === 'livree' && !o.review && (
        <form
          className="rounded-2xl bg-ivory p-3 space-y-2"
          data-testid="mp-review-form"
          onSubmit={async e => {
            e.preventDefault();
            if (!stars) return setError('Choisissez une note');
            setBusy(true);
            const r = await reviewOrder(o.id, { sellerStars: stars, text, ...(driverStars ? { driverStars } : {}) });
            setBusy(false);
            if (!r.ok) return setError(r.error);
            onChange({ review: r.data.review });
          }}
        >
          <p className="text-sm font-semibold">Votre avis sur {o.shopName}</p>
          <Stars rating={stars} size={26} onRate={setStars} />
          {o.trip?.driver && (
            <div className="flex items-center gap-2 text-sm">
              <span>Livreur ({o.trip.driver.name}) :</span>
              <Stars rating={driverStars} size={20} onRate={setDriverStars} />
            </div>
          )}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={2}
            maxLength={400}
            placeholder="Qualité, conformité, emballage… (facultatif)"
            aria-label="Votre avis"
            className="field resize-none"
          />
          {error && (
            <p className="text-sm text-wine" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn-dark !h-10 !px-5" data-testid="mp-review-send">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publier mon avis'}
          </button>
        </form>
      )}
      {o.review && (
        <p className="text-sm text-ink/75" data-testid="mp-review-done">
          Votre avis : {'★'.repeat(o.review.seller.stars)}
          {'☆'.repeat(5 - o.review.seller.stars)}
          {o.review.seller.text && ` « ${o.review.seller.text} »`}
        </p>
      )}

      {canReport &&
        (problemOpen ? (
          <form
            className="rounded-2xl border border-amber-300 p-3 space-y-2"
            data-testid="mp-problem-form"
            onSubmit={async e => {
              e.preventDefault();
              if (!kind) return setError('Choisissez le problème');
              setBusy(true);
              const r = await reportProblem(o.id, kind, problemText);
              setBusy(false);
              if (!r.ok) return setError(r.error);
              setProblemOpen(false);
              onChange({ dispute: r.data.dispute });
            }}
          >
            <p className="text-sm font-semibold">Quel est le problème ?</p>
            <div className="grid gap-1.5">
              {kinds.map(k => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={`p-${o.id}`} checked={kind === k} onChange={() => setKind(k)} />
                  {PROBLEM_LABELS[k]}
                </label>
              ))}
            </div>
            <textarea
              value={problemText}
              onChange={e => setProblemText(e.target.value)}
              rows={2}
              maxLength={600}
              placeholder="Expliquez en quelques mots"
              aria-label="Explication du problème"
              className="field resize-none"
            />
            {error && (
              <p className="text-sm text-wine" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setProblemOpen(false)} className="btn-outline !h-10 !px-4">
                Annuler
              </button>
              <button disabled={busy} className="btn-dark !h-10 !px-5" data-testid="mp-problem-send">
                Envoyer
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => {
              setError('');
              setProblemOpen(true);
            }}
            className="text-sm font-semibold underline underline-offset-4 text-amber-900"
            data-testid="mp-problem-open"
          >
            Signaler un problème
          </button>
        ))}
    </div>
  );
};
