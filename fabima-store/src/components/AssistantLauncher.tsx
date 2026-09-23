import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { OPEN_ASSISTANT_EVENT, openAssistant } from './assistantBus';

const loadAssistant = () => import('./Assistant');
const AssistantPanel = lazy(() => loadAssistant().then(m => ({ default: m.Assistant })));

/** Monte le panneau de l'assistante à la première demande d'ouverture, puis le laisse gérer les suivantes. */
export const AssistantHost: React.FC = () => {
  const [first, setFirst] = useState<{ question?: string } | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => setFirst(f => f ?? { question: (e as CustomEvent<string | undefined>).detail });
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen);
  }, []);
  return first ? <Suspense fallback={null}><AssistantPanel initial={first} /></Suspense> : null;
};

/** Bouton flottant d'ouverture de l'assistante. */
export const AssistantLauncher: React.FC = () => {
  const [hint, setHint] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('fabima_assistant_hint') === '1'; } catch { /* ignore */ }
    if (seen) return;
    const t = setTimeout(() => setHint(true), 6000);
    // La bulle se retire seule pour ne pas gêner la lecture
    const t2 = setTimeout(() => setHint(false), 18000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);
  const dismiss = () => { setHint(false); try { sessionStorage.setItem('fabima_assistant_hint', '1'); } catch { /* ignore */ } };

  return (
    <div className="relative">
      {hint && (
        <div className="assistant-hint absolute right-[4.25rem] bottom-1 w-44 sm:w-56 bg-white rounded-2xl rounded-br-md shadow-luxe p-3.5 text-xs animate-fade-up border border-ink/[0.06]">
          <button onClick={dismiss} aria-label="Masquer" className="absolute top-1.5 right-1.5 p-1 text-ink/70"><X className="w-3 h-3" /></button>
          <p className="font-script text-xl text-gold-dark leading-none">Fabi</p>
          <p className="mt-1 text-ink/75 text-[11px] sm:text-xs">Une question ? Je vous réponds tout de suite<span className="hidden sm:inline"> : pièces, livraison, commande</span>.</p>
        </div>
      )}
      <button onClick={() => { dismiss(); openAssistant(); }} onPointerEnter={() => { loadAssistant(); }} aria-label="Poser une question à l'assistante"
        className="w-14 h-14 rounded-full bg-gradient-to-br from-gold to-wine text-white grid place-items-center shadow-luxe hover:scale-105 transition-transform">
        <Sparkles className="w-6 h-6" strokeWidth={1.6} />
      </button>
    </div>
  );
};
