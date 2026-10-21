import React, { useEffect, useState } from 'react';

/** Compte à rebours « 04:59 » (une mise à jour par seconde) */
export const Countdown: React.FC<{ until: string; className?: string }> = ({ until, className }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.round((Date.parse(until) - Date.now()) / 1000));
  return (
    <span className={`tabular-nums ${className ?? ''}`} data-testid="mp-flash-countdown">
      {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
    </span>
  );
};
