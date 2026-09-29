import React, { useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import type { DeliveryRating } from '../data/types';
import { rateDelivery } from '../services/api';

const WORDS = ['', 'Décevante', 'Moyenne', 'Correcte', 'Très bien', 'Parfaite'];

/** Après la livraison : la cliente note son livreur en un toucher (la gérante voit la note). */
export const RateDelivery: React.FC<{ orderId: string; phone: string; driverName?: string; rating?: DeliveryRating; onRated: (r: DeliveryRating) => void }> = ({ orderId, phone, driverName, rating, onRated }) => {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (rating) {
    return (
      <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-7 text-center" data-testid="rate-delivery">
        <p className="text-2xl text-amber-500 tracking-wider" aria-label={`${rating.stars} sur 5`}>{'★'.repeat(rating.stars)}<span className="text-ink/15">{'★'.repeat(5 - rating.stars)}</span></p>
        <p className="font-display text-2xl mt-2">Merci pour votre avis 🌸</p>
      </div>
    );
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stars) return;
    setBusy(true);
    const r = await rateDelivery(orderId, phone, stars, comment);
    setBusy(false);
    if (r.ok) onRated(r.data.rating); else setError(r.error);
  };
  const shown = hover || stars;

  return (
    <form onSubmit={send} className="bg-white border border-ink/[0.06] rounded-[2rem] p-7 sm:p-9 text-center" data-testid="rate-delivery">
      <p className="eyebrow">Votre avis</p>
      <p className="font-display text-3xl mt-2">Comment s'est passée la livraison{driverName ? ` avec ${driverName}` : ''} ?</p>
      <div className="mt-5 flex justify-center gap-1.5" role="radiogroup" aria-label="Note de la livraison" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
            onClick={() => setStars(n)} onMouseEnter={() => setHover(n)} className="p-1 transition-transform active:scale-90">
            <Star className={`w-9 h-9 ${n <= shown ? 'fill-amber-400 text-amber-400' : 'text-ink/20'}`} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <p className="h-5 mt-1 text-sm text-ink/70">{WORDS[shown]}</p>
      {stars > 0 && (
        <div className="mt-4 space-y-3 animate-fade-up">
          <textarea value={comment} onChange={e => setComment(e.target.value.slice(0, 500))} rows={2} aria-label="Un mot sur la livraison (facultatif)"
            placeholder="Un mot sur la livraison (facultatif)" className="field !h-auto py-3 resize-none" />
          <button className="btn-dark w-full sm:w-auto" disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer mon avis'}</button>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-wine">{error}</p>}
    </form>
  );
};

export default RateDelivery;
