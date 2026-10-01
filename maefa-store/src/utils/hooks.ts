import { useEffect, useRef, useState } from 'react';

/** Bloque le défilement de la page tant que `locked` est vrai (tiroirs, modales). */
export function useLockBody(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    // Sur iPhone, « overflow: hidden » ne suffit pas : la page derrière continue de bouger et
    // vole le geste du doigt au menu. On fige donc la page à sa place, puis on la rend telle quelle.
    const { body, documentElement: html } = document;
    const y = window.scrollY;
    const prev = { bo: body.style.overflow, ho: html.style.overflow, pos: body.style.position, top: body.style.top, w: body.style.width };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.width = '100%';
    return () => {
      html.style.overflow = prev.ho;
      body.style.overflow = prev.bo;
      body.style.position = prev.pos;
      body.style.top = prev.top;
      body.style.width = prev.w;
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    };
  }, [locked]);
}

/** Appelle `onEscape` à l'appui sur Échap tant que `active` est vrai. */
export function useEscape(active: boolean, onEscape: () => void) {
  const cb = useRef(onEscape);
  cb.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cb.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

/** Vrai quand l'élément entre dans la fenêtre (une seule fois). */
export function useInView<T extends Element>(rootMargin = '0px 0px -10% 0px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { rootMargin });
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, rootMargin]);
  return { ref, inView };
}

export function usePrefersReducedMotion() {
  const [reduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  return reduced;
}
