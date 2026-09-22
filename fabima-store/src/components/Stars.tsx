import React from 'react';
import { Star } from 'lucide-react';

export const Stars: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`Note : ${rating} sur 5`}>
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} style={{ width: size, height: size }}
        className={i <= Math.round(rating) ? 'fill-gold text-gold' : 'text-ink/20'} />
    ))}
  </span>
);
