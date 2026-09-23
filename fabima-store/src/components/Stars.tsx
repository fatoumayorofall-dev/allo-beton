import React from 'react';
import { Star } from 'lucide-react';

export const Stars: React.FC<{ rating: number; size?: number; onRate?: (n: number) => void }> = ({ rating, size = 13, onRate }) => (
  <span className="inline-flex items-center gap-0.5" role={onRate ? 'radiogroup' : 'img'} aria-label={`Note : ${rating} sur 5`}>
    {[1, 2, 3, 4, 5].map(i => {
      const star = <Star style={{ width: size, height: size }} strokeWidth={1.4}
        className={i <= Math.round(rating) ? 'fill-gold text-gold' : 'text-ink/25'} />;
      return onRate ? (
        <button key={i} type="button" role="radio" aria-checked={i === rating} aria-label={`${i} étoile${i > 1 ? 's' : ''}`} onClick={() => onRate(i)} className="p-0.5 hover:scale-110 transition-transform">{star}</button>
      ) : <span key={i}>{star}</span>;
    })}
  </span>
);
