import React, { useEffect, useRef, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import type { Product } from '../data/types';
import { listVoices, voiceUrl } from '../services/api';
import { spokenDescription } from '../utils/share';

let voicesPromise: Promise<string[]> | null = null;
const knownVoices = () => (voicesPromise ??= listVoices());

/**
 * « Écouter » : joue la note vocale enregistrée par la gérante (en wolof, par exemple)
 * ou, à défaut, lit la fiche à voix haute avec la synthèse vocale du téléphone.
 */
export const ListenButton: React.FC<{ product: Product; big?: boolean; className?: string }> = ({ product, big, className = '' }) => {
  const [hasVoice, setHasVoice] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    let alive = true;
    knownVoices().then(list => alive && setHasVoice(list.includes(product.slug)));
    return () => {
      alive = false;
      audioRef.current?.pause();
      if (canSpeak) window.speechSynthesis.cancel();
    };
  }, [product.slug, canSpeak]);

  const stop = () => {
    audioRef.current?.pause();
    if (canSpeak) window.speechSynthesis.cancel();
    setPlaying(false);
  };

  const speak = () => {
    if (!canSpeak) return;
    const u = new SpeechSynthesisUtterance(spokenDescription(product));
    u.lang = 'fr-FR';
    u.rate = 0.92;
    const fr = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('fr'));
    if (fr) u.voice = fr;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setPlaying(true);
  };

  const play = () => {
    if (playing) { stop(); return; }
    if (hasVoice) {
      const a = new Audio(voiceUrl(product.slug));
      audioRef.current = a;
      a.onended = () => setPlaying(false);
      a.onerror = () => { setPlaying(false); speak(); };
      a.play().then(() => setPlaying(true)).catch(speak);
    } else speak();
  };

  if (!hasVoice && !canSpeak) return null;
  const Icon = playing ? Square : Volume2;

  if (big) {
    return (
      <button onClick={play} aria-label={playing ? 'Arrêter' : 'Écouter la description'}
        className={`flex flex-col items-center gap-1 ${className || 'relative'}`}>
        <span className="relative w-16 h-16 rounded-full bg-white shadow-luxe grid place-items-center text-wine">
          {!playing && <span className="absolute inset-0 rounded-full bg-white/70 animate-ping" />}
          <Icon className="relative w-7 h-7" strokeWidth={2} fill={playing ? 'currentColor' : 'none'} />
        </span>
        <span className="px-2 py-0.5 rounded-full bg-ink/75 text-[11px] font-bold text-white">{playing ? 'Stop' : hasVoice ? 'Écouter 🎙' : 'Écouter'}</span>
      </button>
    );
  }
  return (
    <button onClick={play} className={`inline-flex items-center gap-2 px-4 h-10 rounded-full bg-blush/60 text-sm hover:bg-blush transition-colors ${className}`}>
      <Icon className="w-4 h-4 text-wine" /> {playing ? 'Arrêter' : hasVoice ? 'Écouter la présentation' : 'Écouter la fiche'}
    </button>
  );
};
