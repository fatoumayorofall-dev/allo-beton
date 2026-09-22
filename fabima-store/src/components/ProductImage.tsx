import React, { useState } from 'react';
import { ShoppingBag } from 'lucide-react';

/** Image produit avec visuel de secours élégant si l'URL ne répond pas. */
export const ProductImage: React.FC<{ src?: string; alt: string; className?: string }> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-ivory-deep via-blush to-gold-light/60 text-ink/60 ${className}`}>
        {alt && <ShoppingBag className="w-10 h-10" strokeWidth={1.2} />}
        {alt && <span className="font-display italic text-sm px-4 text-center line-clamp-2">{alt}</span>}
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
};
