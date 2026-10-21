/**
 * Appels par internet entre acheteur et vendeur (voix seulement, WebRTC) : pour marchander de vive voix
 * sans donner son numéro. Le serveur ne fait que mettre les deux téléphones en relation ; la voix passe
 * directement de l'un à l'autre, chiffrée (ou par un relais TURN si le réseau mobile bloque).
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { answerCall, endCall, fetchCall, fetchCallConfig, fetchIncomingCalls, placeCall, type CallInfo } from './api';
import { useAccount } from '../context/AccountContext';

type Phase = 'idle' | 'sonnerie' | 'appel' | 'connexion' | 'en_ligne' | 'fin';
interface CallValue {
  start: (chatId: string, withName: string) => void;
  busy: boolean;
}
const Ctx = createContext<CallValue>({ start: () => {}, busy: false });
export const useCall = () => useContext(Ctx);

/** Attendre la collecte des chemins réseau (au plus quelques secondes) : une seule offre, complète. */
const gathered = (pc: RTCPeerConnection, ms = 3500) =>
  new Promise<void>(resolve => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const t = setTimeout(resolve, ms);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(t);
        resolve();
      }
    });
  });

/** Petite sonnerie générée (pas de fichier à télécharger) ; vibre aussi si le téléphone le permet. */
function ringer(kind: 'entrant' | 'sortant') {
  let ctx: AudioContext | null = null;
  try {
    ctx = new AudioContext();
  } catch {
    /* pas de son possible */
  }
  const beep = () => {
    if (kind === 'entrant') navigator.vibrate?.([300, 200, 300]);
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = kind === 'entrant' ? 620 : 425;
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (kind === 'entrant' ? 0.5 : 1));
  };
  beep();
  const t = setInterval(beep, kind === 'entrant' ? 1500 : 3000);
  return () => {
    clearInterval(t);
    ctx?.close().catch(() => {});
  };
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAccount();
  const [phase, setPhase] = useState<Phase>('idle');
  const [info, setInfo] = useState<CallInfo | null>(null);
  const [withName, setWithName] = useState('');
  const [message, setMessage] = useState('');
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const stopRing = useRef<(() => void) | null>(null);
  const callId = useRef<string | null>(null);

  const cleanup = useCallback((text = '') => {
    stopRing.current?.();
    stopRing.current = null;
    local.current?.getTracks().forEach(t => t.stop());
    local.current = null;
    pc.current?.close();
    pc.current = null;
    callId.current = null;
    setMuted(false);
    setMessage(text);
    setPhase(text ? 'fin' : 'idle');
    if (text) setTimeout(() => setPhase(p => (p === 'fin' ? 'idle' : p)), 3500);
  }, []);

  /** Micro + connexion WebRTC (voix seulement). */
  const connect = useCallback(async () => {
    const cfg = await fetchCallConfig();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    local.current = stream;
    const peer = new RTCPeerConnection({ iceServers: cfg.ok ? cfg.data.iceServers : [] });
    stream.getTracks().forEach(t => peer.addTrack(t, stream));
    peer.ontrack = e => {
      if (audio.current) {
        audio.current.srcObject = e.streams[0];
        audio.current.play().catch(() => {});
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        stopRing.current?.();
        stopRing.current = null;
        setSeconds(0);
        setPhase('en_ligne');
      }
      if (peer.connectionState === 'failed') {
        if (callId.current) endCall(callId.current);
        cleanup('Connexion impossible : le réseau bloque l’appel. Réessayez ou écrivez un message.');
      }
    };
    pc.current = peer;
    return peer;
  }, [cleanup]);

  // Appeler (depuis une discussion)
  const start = useCallback(
    async (chatId: string, name: string) => {
      if (phase !== 'idle' && phase !== 'fin') return;
      setWithName(name);
      setMessage('');
      setPhase('appel');
      try {
        const peer = await connect();
        await peer.setLocalDescription(await peer.createOffer());
        await gathered(peer);
        const r = await placeCall(chatId, peer.localDescription?.sdp ?? '');
        if (!r.ok) return cleanup(r.error);
        callId.current = r.data.call.id;
        setInfo(r.data.call);
        stopRing.current = ringer('sortant');
      } catch {
        cleanup('Autorisez le micro pour appeler.');
      }
    },
    [phase, connect, cleanup],
  );

  // Décrocher
  const accept = async () => {
    if (!info?.sdp) return;
    stopRing.current?.();
    stopRing.current = null;
    setPhase('connexion');
    try {
      const peer = await connect();
      await peer.setRemoteDescription({ type: 'offer', sdp: info.sdp });
      await peer.setLocalDescription(await peer.createAnswer());
      await gathered(peer);
      const r = await answerCall(info.id, peer.localDescription?.sdp ?? '');
      if (!r.ok) cleanup(r.error);
    } catch {
      endCall(info.id);
      cleanup('Autorisez le micro pour répondre.');
    }
  };
  const hangup = async () => {
    if (callId.current) await endCall(callId.current);
    cleanup(phase === 'sonnerie' ? '' : 'Appel terminé');
  };

  // Appels entrants : vérifiés toutes les 3 secondes quand on est connecté et libre
  useEffect(() => {
    if (status !== 'user' || phase !== 'idle') return;
    const check = async () => {
      const r = await fetchIncomingCalls();
      const c = r.ok ? r.data.calls[0] : undefined;
      if (!c) return;
      callId.current = c.id;
      setInfo(c);
      setWithName(c.with);
      setPhase('sonnerie');
      stopRing.current = ringer('entrant');
    };
    check();
    const t = setInterval(check, 3000);
    return () => clearInterval(t);
  }, [status, phase]);

  // Pendant l'appel : suivre la réponse d'en face, et voir s'il a raccroché
  useEffect(() => {
    if (!['sonnerie', 'appel', 'connexion', 'en_ligne'].includes(phase)) return;
    const t = setInterval(async () => {
      const id = callId.current;
      if (!id) return;
      const r = await fetchCall(id);
      if (!r.ok) return;
      const c = r.data.call;
      if (c.status === 'manque') return cleanup(c.incoming ? 'Appel manqué' : 'Pas de réponse');
      if (c.status === 'refuse') return cleanup(c.incoming ? '' : 'Appel refusé');
      if (c.status === 'termine') return cleanup('Appel terminé');
      if (phase === 'appel' && c.status === 'en_cours' && c.sdp && pc.current && !pc.current.remoteDescription) {
        setPhase('connexion');
        await pc.current.setRemoteDescription({ type: 'answer', sdp: c.sdp }).catch(() => {});
      }
    }, 1500);
    return () => clearInterval(t);
  }, [phase, cleanup]);

  // Durée de l'appel
  useEffect(() => {
    if (phase !== 'en_ligne') return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const toggleMute = () => {
    local.current?.getAudioTracks().forEach(t => (t.enabled = muted));
    setMuted(!muted);
  };
  const statusText =
    phase === 'sonnerie'
      ? 'vous appelle'
      : phase === 'appel'
        ? 'Appel en cours…'
        : phase === 'connexion'
          ? 'Connexion…'
          : phase === 'en_ligne'
            ? `En ligne · ${mmss(seconds)}`
            : message;

  return (
    <Ctx.Provider value={{ start, busy: phase !== 'idle' && phase !== 'fin' }}>
      {children}
      <audio ref={audio} autoPlay playsInline className="hidden" />
      {phase !== 'idle' && (
        <div
          className="fixed inset-x-0 bottom-20 sm:bottom-6 z-50 px-4 flex justify-center"
          role="dialog"
          aria-label="Appel"
          data-testid="mp-call"
        >
          <div className="w-full max-w-sm rounded-3xl bg-ink text-ivory shadow-2xl p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-ivory/60">Appel par internet · sans numéro</p>
            <p className="mt-1 font-display text-2xl">{withName}</p>
            {info?.listing && <p className="text-sm text-ivory/70 truncate">au sujet de « {info.listing} »</p>}
            <p className="mt-2 text-sm font-semibold" data-testid="mp-call-status" aria-live="polite">
              {statusText}
            </p>
            {phase !== 'fin' && (
              <div className="mt-4 flex items-center justify-center gap-4">
                {phase === 'sonnerie' ? (
                  <>
                    <button
                      onClick={hangup}
                      aria-label="Refuser"
                      className="w-14 h-14 rounded-full bg-red-600 grid place-items-center"
                      data-testid="mp-call-decline"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </button>
                    <button
                      onClick={accept}
                      aria-label="Répondre"
                      className="w-14 h-14 rounded-full bg-emerald-600 grid place-items-center animate-pulse"
                      data-testid="mp-call-accept"
                    >
                      <Phone className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={toggleMute}
                      aria-pressed={muted}
                      aria-label={muted ? 'Réactiver le micro' : 'Couper le micro'}
                      className="w-12 h-12 rounded-full bg-white/15 grid place-items-center"
                    >
                      {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={hangup}
                      aria-label="Raccrocher"
                      className="w-14 h-14 rounded-full bg-red-600 grid place-items-center"
                      data-testid="mp-call-hangup"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
};
