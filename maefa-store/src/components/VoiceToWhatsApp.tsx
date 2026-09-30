import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Play, Send, Square, Trash2 } from 'lucide-react';
import { SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { WhatsAppGlyph } from './BrandLogos';

const MAX_SECONDS = 90;
const pickMime = () => ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';
const extFor = (type: string) => (type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm');

type Lang = 'fr' | 'wo';
const T = {
  start: { wo: 'Bësal te wax', fr: 'Touchez et parlez' },
  startHint: { wo: 'Wax ak Maefa ci wolof', fr: 'Envoyez un message vocal à Maefa' },
  stop: { wo: 'Bësal bu nga noppee', fr: 'Touchez quand vous avez fini' },
  listen: { wo: 'Déglu', fr: 'Écouter' },
  send: { wo: 'Yónnee ci WhatsApp', fr: 'Envoyer sur WhatsApp' },
  sendHint: { wo: 'Ci WhatsApp, tànnal « Maefa Store »', fr: 'Dans WhatsApp, choisissez « Maefa Store »' },
  redo: { wo: 'Wax ko wat', fr: 'Recommencer' },
  noMic: { wo: 'Ubbil WhatsApp te bësal micro bi', fr: 'Ouvrez WhatsApp et touchez le micro' },
  denied: { wo: 'Micro bi dafa tëju : ubbil WhatsApp te yónnee vocal', fr: 'Micro bloqué : ouvrez WhatsApp et envoyez un vocal' },
};

/**
 * Message vocal pour les clientes qui ne lisent ni n'écrivent : elle touche le micro, parle (en wolof),
 * puis le vocal part dans WhatsApp vers Maefa Store (partage du téléphone).
 * Sans micro ou sans partage de fichiers : ouverture de la discussion WhatsApp pour y envoyer un vocal.
 */
export const VoiceToWhatsApp: React.FC<{ lang: Lang }> = ({ lang }) => {
  const [state, setState] = useState<'idle' | 'rec' | 'ready' | 'denied'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<Blob | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const timer = useRef<number>();
  const audio = useRef<HTMLAudioElement | null>(null);
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  const chatLink = buildWhatsAppLink(lang === 'wo' ? 'Salaam aleekum Maefa 🌸 Dama bëgg wax ak yeen ci wolof.' : 'Bonjour Maefa Store 🌸 Je vous envoie un message vocal.');
  const url = useMemo(() => (clip ? URL.createObjectURL(clip) : ''), [clip]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => () => { window.clearInterval(timer.current); recRef.current?.stream.getTracks().forEach(t => t.stop()); }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        setClip(new Blob(chunks, { type: (rec.mimeType || mime || 'audio/webm').split(';')[0] }));
        setState('ready');
      };
      rec.start();
      recRef.current = rec;
      setSeconds(0);
      setState('rec');
      timer.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      setState('denied');
    }
  };
  const stop = () => {
    window.clearInterval(timer.current);
    if (recRef.current?.state === 'recording') recRef.current.stop();
  };
  useEffect(() => { if (state === 'rec' && seconds >= MAX_SECONDS) stop(); }, [state, seconds]);

  const send = async () => {
    if (!clip) return;
    const file = new File([clip], `vocal-maefa.${extFor(clip.type)}`, { type: clip.type });
    const text = `${lang === 'wo' ? 'Vocal ngir Maefa Store' : 'Message vocal pour Maefa Store'} (${SITE_CONFIG.phone})`;
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }
    window.open(chatLink, '_blank', 'noopener');
  };
  const reset = () => { setClip(null); setState('idle'); };

  if (!canRecord || state === 'denied') {
    return (
      <a href={chatLink} target="_blank" rel="noopener noreferrer" data-testid="voice-wa-fallback"
        className="w-full min-h-14 px-4 rounded-2xl bg-[#177a41] text-white font-semibold flex items-center justify-center gap-2.5 text-sm">
        <WhatsAppGlyph className="w-5 h-5" /> {state === 'denied' ? T.denied[lang] : T.noMic[lang]}
      </a>
    );
  }

  if (state === 'rec') {
    return (
      <button type="button" onClick={stop} data-testid="voice-stop"
        className="w-full min-h-16 rounded-2xl bg-wine text-white font-semibold flex items-center justify-center gap-3 animate-pulse">
        <Square className="w-5 h-5" fill="currentColor" />
        <span className="text-left leading-tight">{T.stop[lang]}<span className="block text-xs font-normal opacity-80 tabular-nums">{seconds} s</span></span>
      </button>
    );
  }

  if (state === 'ready' && clip) {
    return (
      <div className="space-y-2" data-testid="voice-ready">
        <div className="flex gap-2">
          <button type="button" onClick={() => { audio.current?.pause(); audio.current = new Audio(url); audio.current.play().catch(() => {}); }}
            className="flex-1 h-12 rounded-2xl bg-white border border-ink/15 font-semibold inline-flex items-center justify-center gap-2 text-sm">
            <Play className="w-4 h-4" fill="currentColor" /> {T.listen[lang]}
          </button>
          <button type="button" onClick={reset} aria-label={T.redo[lang]} title={T.redo[lang]}
            className="w-12 h-12 rounded-2xl bg-white border border-ink/15 grid place-items-center"><Trash2 className="w-4 h-4" /></button>
        </div>
        <button type="button" onClick={send} data-testid="voice-send"
          className="w-full min-h-14 rounded-2xl bg-[#177a41] text-white font-semibold flex items-center justify-center gap-2.5">
          <Send className="w-5 h-5" /> {T.send[lang]}
        </button>
        <p className="text-[11px] text-center text-ink/65">{T.sendHint[lang]}</p>
      </div>
    );
  }

  return (
    <button type="button" onClick={start} data-testid="voice-start"
      className="w-full min-h-16 rounded-2xl bg-ink text-ivory flex items-center justify-center gap-3 hover:bg-gold-dark transition-colors">
      <span className="w-11 h-11 rounded-full bg-gold-light text-ink grid place-items-center"><Mic className="w-5 h-5" /></span>
      <span className="text-left leading-tight"><span className="block font-semibold">{T.start[lang]}</span><span className="text-xs opacity-75">{T.startHint[lang]}</span></span>
    </button>
  );
};
