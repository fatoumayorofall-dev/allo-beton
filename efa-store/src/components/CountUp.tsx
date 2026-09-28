import React, { useEffect, useState } from 'react';
import { useInView, usePrefersReducedMotion } from '../utils/hooks';

/** Chiffre qui défile jusqu'à sa valeur quand il apparaît à l'écran (« 100 % », « 12 »…). */
export const CountUp: React.FC<{ value: string; className?: string }> = ({ value, className }) => {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const reduced = usePrefersReducedMotion();
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? Number(match[1]) : 0;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView || !match) return;
    if (reduced) { setN(target); return; }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1400);
      setN(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className={className}>{match ? `${n}${match[2]}` : value}</span>;
};
