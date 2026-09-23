import React, { useEffect, useRef, useState } from 'react';

/** Type de fichier d'après son adresse (les vidéos d'iPhone .mov se lisent comme des MP4). */
const typeOf = (src: string) => (/\.webm($|\?)/i.test(src) ? 'video/webm' : 'video/mp4');

/** Vrai si la cliente préfère moins d'animations ou a activé l'économie de données. */
function shouldHold() {
  if (typeof window === 'undefined') return true;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return !!saveData || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Vidéo d'une pièce, posée par-dessus sa photo :
 * - muette, en boucle, lue seulement quand elle est à l'écran (et `active`) — rien n'est téléchargé avant
 * - apparaît en fondu dès que l'image bouge ; si la vidéo ne se lit pas, la photo reste simplement affichée
 * - moins d'animations ou économie de données : pas de lecture automatique (`controls` permet de la lancer)
 * `src` : une adresse, ou plusieurs formats du même film (le navigateur prend le premier qu'il sait lire).
 */
export const ProductVideo: React.FC<{ src: string | string[]; className?: string; active?: boolean; controls?: boolean; label?: string }> = ({ src, className = '', active = true, controls = false, label }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hold] = useState(shouldHold);
  const sources = Array.isArray(src) ? src : [src];
  const key = sources.join('|');

  useEffect(() => { setFailed(false); setPlaying(false); }, [key]);

  // Lecture seulement quand la vidéo est visible
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [key]);

  useEffect(() => {
    const el = ref.current;
    if (!el || failed || hold) return;
    if (visible && active) {
      el.play().catch(() => { /* lecture automatique refusée : la photo reste affichée */ });
    } else el.pause();
  }, [visible, active, failed, hold, key]);

  if (failed) return null;
  const shown = playing || (hold && controls);
  return (
    <video
      key={key}
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      controls={controls && (hold || playing)}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      disablePictureInPicture
      onPlaying={() => setPlaying(true)}
      onError={() => setFailed(true)}
      className={`object-cover transition-opacity duration-700 ease-luxe ${shown ? 'opacity-100' : 'opacity-0'} ${className}`}
      data-testid="product-video"
    >
      {sources.map(s => <source key={s} src={s} type={typeOf(s)} onError={s === sources[sources.length - 1] ? () => setFailed(true) : undefined} />)}
    </video>
  );
};
