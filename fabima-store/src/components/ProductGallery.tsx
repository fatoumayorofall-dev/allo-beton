import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { useEscape, useLockBody } from '../utils/hooks';
import { ProductImage } from './ProductImage';

/** Image principale avec zoom qui suit le curseur (ordinateur). */
const ZoomImage: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [origin, setOrigin] = useState('50% 50%');
  const [zoom, setZoom] = useState(false);
  return (
    <div className="relative w-full h-full overflow-hidden"
      onMouseEnter={() => setZoom(true)} onMouseLeave={() => setZoom(false)}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
      }}>
      <div className="w-full h-full transition-transform duration-300 ease-out" style={{ transform: zoom ? 'scale(1.8)' : 'scale(1)', transformOrigin: origin }}>
        <ProductImage src={src} alt={alt} className="w-full h-full" sizes="(min-width: 1024px) 50vw, 100vw" priority />
      </div>
    </div>
  );
};

/**
 * Galerie de la fiche produit.
 * - téléphone : les photos défilent au doigt (glissement natif), avec un indicateur de position
 * - ordinateur : vignettes + grande photo avec zoom au survol ; la galerie reste visible au défilement
 * - partout : un toucher ouvre la visionneuse plein écran (flèches, clavier, glissement)
 */
export const ProductGallery: React.FC<{ images: string[]; name: string; badges?: React.ReactNode }> = ({ images, name, badges }) => {
  const [idx, setIdx] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const many = images.length > 1;

  useEffect(() => { setIdx(0); strip.current?.scrollTo({ left: 0 }); }, [images]);
  const onStripScroll = () => {
    const el = strip.current;
    if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };
  const goTo = (i: number) => { setIdx(i); strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: 'smooth' }); };

  return (
    <div className="lg:sticky lg:top-32 lg:self-start min-w-0">
      <div className="lg:flex lg:items-start lg:gap-4">
        {many && (
          <div className="hidden lg:flex flex-col gap-3 w-20 shrink-0">
            {images.map((img, i) => (
              <button key={img} onClick={() => setIdx(i)} aria-label={`Image ${i + 1}`} aria-current={i === idx}
                className={`aspect-[3/4] overflow-hidden rounded-2xl transition-all duration-300 ${i === idx ? 'ring-1 ring-ink ring-offset-2 ring-offset-ivory' : 'opacity-50 hover:opacity-100'}`}>
                <ProductImage src={img} alt="" className="w-full h-full" />
              </button>
            ))}
          </div>
        )}

        <div className="relative flex-1 min-w-0">
          {/* Téléphone : bande de photos à faire glisser */}
          <div ref={strip} onScroll={onStripScroll} className="lg:hidden flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[2rem] bg-ivory-deep" data-testid="gallery-strip">
            {images.map((img, i) => (
              <button key={img} onClick={() => setViewer(i)} className="relative shrink-0 w-full aspect-[4/5] snap-center" aria-label={`Agrandir la photo ${i + 1}`}>
                <ProductImage src={img} alt={i === 0 ? name : ''} className="w-full h-full" sizes="100vw" priority={i === 0} />
              </button>
            ))}
          </div>
          {/* Ordinateur : grande photo avec zoom */}
          <button onClick={() => setViewer(idx)} className="hidden lg:block relative w-full aspect-[4/5] bg-ivory-deep rounded-[2.5rem] overflow-hidden cursor-zoom-in" aria-label="Agrandir la photo">
            <div key={idx} className="absolute inset-0 animate-fade-in"><ZoomImage src={images[idx]} alt={name} /></div>
          </button>

          <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none">{badges}</div>
          <span className="absolute top-4 right-4 w-10 h-10 rounded-full bg-ivory/85 backdrop-blur grid place-items-center pointer-events-none shadow-soft" aria-hidden><Maximize2 className="w-4 h-4" strokeWidth={1.6} /></span>
          {many && (
            <>
              <span className="absolute bottom-4 right-4 px-3 h-7 rounded-full bg-ink/70 backdrop-blur text-ivory text-[11px] font-semibold tabular-nums grid place-items-center pointer-events-none" aria-hidden>{idx + 1} / {images.length}</span>
              <div className="lg:hidden flex justify-center mt-3">
                {images.map((img, i) => (
                  <button key={img} onClick={() => goTo(i)} aria-label={`Image ${i + 1}`} aria-current={i === idx} className="h-6 min-w-6 px-1 grid place-items-center">
                    <span className={`block h-1.5 rounded-full transition-all duration-500 ${i === idx ? 'w-6 bg-ink' : 'w-1.5 bg-ink/25'}`} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {viewer !== null && <Lightbox images={images} name={name} start={viewer} onClose={i => { setViewer(null); setIdx(i); if (strip.current) strip.current.scrollLeft = i * strip.current.clientWidth; }} />}
    </div>
  );
};

/** Visionneuse plein écran : glissement, flèches, touches ← → et Échap. */
const Lightbox: React.FC<{ images: string[]; name: string; start: number; onClose: (i: number) => void }> = ({ images, name, start, onClose }) => {
  const [i, setI] = useState(start);
  const track = useRef<HTMLDivElement>(null);
  useLockBody(true);
  useEscape(true, () => onClose(i));
  useEffect(() => { if (track.current) track.current.scrollLeft = start * track.current.clientWidth; }, [start]);
  const go = (n: number) => { const k = (n + images.length) % images.length; setI(k); track.current?.scrollTo({ left: k * track.current.clientWidth, behavior: 'smooth' }); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return createPortal(
    <div className="fixed inset-0 z-[95] bg-ink/95 backdrop-blur-sm animate-fade-in flex flex-col" role="dialog" aria-modal="true" aria-label={`Photos — ${name}`}>
      <div className="flex items-center justify-between px-5 h-16 text-ivory shrink-0">
        <span className="text-sm tabular-nums">{i + 1} / {images.length}</span>
        <p className="hidden sm:block font-display text-xl truncate px-6">{name}</p>
        <button onClick={() => onClose(i)} aria-label="Fermer" className="w-11 h-11 rounded-full bg-ivory/10 hover:bg-ivory/20 grid place-items-center"><X className="w-5 h-5" /></button>
      </div>
      <div ref={track} onScroll={e => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
        {images.map((img, k) => (
          <div key={img} className="shrink-0 w-full h-full snap-center flex items-center justify-center p-4 sm:p-10">
            <ProductImage src={img} alt={k === i ? name : ''} className="max-w-full max-h-[calc(100svh-7rem)] w-auto h-auto !object-contain rounded-[1.5rem]" sizes="100vw" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="hidden sm:flex absolute inset-y-0 inset-x-4 items-center justify-between pointer-events-none">
          <button onClick={() => go(i - 1)} aria-label="Photo précédente" className="pointer-events-auto w-12 h-12 rounded-full bg-ivory/10 hover:bg-ivory/20 text-ivory grid place-items-center"><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={() => go(i + 1)} aria-label="Photo suivante" className="pointer-events-auto w-12 h-12 rounded-full bg-ivory/10 hover:bg-ivory/20 text-ivory grid place-items-center"><ChevronRight className="w-6 h-6" /></button>
        </div>
      )}
    </div>,
    document.body,
  );
};
