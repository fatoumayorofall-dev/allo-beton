import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  Eye,
  Heart,
  Loader2,
  Megaphone,
  Pin,
  Radio,
  Send,
  ShoppingBag,
  SwitchCamera,
  X,
  Zap,
} from 'lucide-react';
import {
  cancelSchedule,
  endLive,
  fetchLive,
  fetchMyListings,
  fetchMyLive,
  fetchMySchedule,
  fetchMySeller,
  flashLive,
  muteLive,
  pinLive,
  scheduleLive,
  sendLiveComment,
  setLiveBanner,
  startLive,
  stopFlash,
  type LiveComment,
  type LiveResult,
  type LiveView,
  type MyListing,
  type MySeller,
  type UpcomingLive,
} from './api';
import { MP, mpPath } from './config';
import { ACCENTS, F, shopLink } from './format';
import { LiveRecorder, QUALITIES, canGoLive, openCamera, type Quality } from './liveMedia';
import { Countdown } from './Countdown';
import { StatusButton } from './StatusKit';
import { useAccount } from '../context/AccountContext';
import { usePageTitle } from '../utils/usePageTitle';

type Phase = 'preparer' | 'direct' | 'fin';
const FLASH_MINUTES = [2, 5, 10, 15];
const QUALITY_KEY = 'mp_live_quality';
const savedQuality = (): Quality => {
  try {
    const q = localStorage.getItem(QUALITY_KEY);
    return q === 'eco' || q === 'hd' ? q : 'normale';
  } catch {
    return 'normale';
  }
};
/** « samedi 26 octobre à 20:00 » */
const when = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
/** Valeur par défaut du champ date : ce soir 20 h (ou demain si c'est passé) */
const tonight = () => {
  const d = new Date();
  d.setHours(20, 0, 0, 0);
  if (d.getTime() < Date.now() + 10 * 60e3) d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Le studio de la vendeuse, plein écran comme sur TikTok : la caméra d'abord ; en bas, le titre, les articles
 * à montrer (prix live facultatif), « Passer en direct » ou « Programmer ». Pendant le live : présenter un
 * article, lancer une offre flash, afficher un bandeau, répondre, masquer quelqu'un ; puis le bilan.
 */
export default function MpLiveStudio() {
  usePageTitle(`Faire un live · ${MP.name}`);
  const navigate = useNavigate();
  const { status } = useAccount();
  const [seller, setSeller] = useState<MySeller | null | undefined>(undefined);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [chosen, setChosen] = useState<Record<string, string>>({}); // article → prix live saisi ('' = sans)
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'maintenant' | 'programmer'>('maintenant');
  const [at, setAt] = useState(tonight);
  const [schedule, setSchedule] = useState<UpcomingLive | null>(null);
  const [phase, setPhase] = useState<Phase>('preparer');
  const [resume, setResume] = useState<LiveView | null>(null);
  const [live, setLive] = useState<LiveView | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [result, setResult] = useState<LiveResult | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [quality, setQuality] = useState<Quality>(savedQuality);
  const [camera, setCamera] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [network, setNetwork] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');
  const [flash, setFlash] = useState<{ listingId: string; price: string; minutes: number; qty: string } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [, tick] = useState(0);
  const preview = useRef<HTMLVideoElement>(null);
  const recorder = useRef<LiveRecorder | null>(null);
  const after = useRef(0);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  /** Fin demandée par la vendeuse : un dernier envoi refusé (« live terminé ») n'est pas une erreur */
  const ending = useRef(false);

  useEffect(() => {
    if (status !== 'user') return;
    fetchMySeller().then(r => setSeller(r.ok ? r.data.seller : null));
    fetchMyListings().then(r => r.ok && setListings(r.data.listings.filter(l => l.status === 'publiee')));
    fetchMyLive().then(r => r.ok && r.data.live && setResume(r.data.live));
    fetchMySchedule().then(r => {
      if (!r.ok || !r.data.schedule) return;
      setSchedule(r.data.schedule);
      setTitle(t => t || r.data.schedule!.title);
    });
  }, [status]);

  // Caméra (avant ou arrière, qualité) ; changée pendant le direct : le morceau suivant prend la nouvelle
  const finished = phase === 'fin';
  useEffect(() => {
    if (!canGoLive() || finished || seller?.status !== 'active') return;
    let alive = true;
    let stream: MediaStream | null = null;
    openCamera(facing, quality)
      .then(s => {
        if (!alive) return s.getTracks().forEach(t => t.stop());
        stream = s;
        setCamera(s);
        setError(e => (e.startsWith('Autorisez') ? '' : e));
        recorder.current?.setStream(s);
      })
      .catch(() => setError('Autorisez la caméra et le micro pour faire un live.'));
    return () => {
      alive = false;
      // L'ancienne caméra s'arrête un peu après : le morceau en cours finit de s'enregistrer
      setTimeout(() => stream?.getTracks().forEach(t => t.stop()), 3500);
    };
  }, [facing, quality, finished, seller?.status]);
  useEffect(() => {
    if (preview.current && camera) preview.current.srcObject = camera;
  }, [camera, phase]);
  const pickQuality = (q: Quality) => {
    setQuality(q);
    recorder.current?.setQuality(q);
    try {
      localStorage.setItem(QUALITY_KEY, q);
    } catch {
      /* rien */
    }
  };

  // Pendant le direct : commentaires, spectatrices, cœurs (toutes les 2 secondes) ; durée à l'écran
  const liveId = live?.id;
  useEffect(() => {
    if (phase !== 'direct' || !liveId) return;
    const t = setInterval(async () => {
      tick(n => n + 1);
      const r = await fetchLive(liveId, after.current);
      if (!r.ok) return;
      setLive(r.data.live);
      const fresh = r.data.comments;
      if (fresh.length) after.current = fresh[fresh.length - 1].id;
      setComments(list => [...list, ...fresh].filter(c => !r.data.hidden.includes(c.id)).slice(-80));
    }, 2000);
    return () => clearInterval(t);
  }, [phase, liveId]);

  const goLive = useCallback(
    (l: LiveView) => {
      if (!camera) return setError('La caméra n’est pas prête.');
      ending.current = false;
      setLive(l);
      setPhase('direct');
      setStartedAt(Date.parse(l.startedAt));
      after.current = 0;
      setComments([]);
      const rec = new LiveRecorder(
        l.id,
        e => {
          if (e.kind === 'envoye') setNetwork('');
          if (e.kind === 'lent')
            setNetwork('Réseau faible : passez en qualité « Économie » ou rapprochez-vous du wifi.');
          if (e.kind === 'erreur') setNetwork(`Envoi difficile : ${e.error}`);
          if (e.kind === 'termine') {
            if (ending.current) return;
            setNetwork('');
            setError(e.error);
            setPhase('fin');
          }
        },
        quality,
      );
      rec.start(camera);
      recorder.current = rec;
      // Écran allumé pendant tout le live
      (
        navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
      ).wakeLock
        ?.request('screen')
        .then(w => (wake.current = w))
        .catch(() => {});
    },
    [camera, quality],
  );
  useEffect(
    () => () => {
      recorder.current?.stop();
      wake.current?.release().catch(() => {});
    },
    [],
  );

  const products = () =>
    Object.entries(chosen).map(([listingId, p]) => ({
      listingId,
      livePrice: p.trim() ? Number(p.replace(/\s/g, '')) : null,
    }));
  const start = async () => {
    if (!products().length) return setError('Choisissez au moins un article à montrer.');
    setBusy(true);
    setError('');
    const r = await startLive(title.trim(), products());
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setSchedule(null);
    goLive(r.data.live);
  };
  const plan = async () => {
    setBusy(true);
    setError('');
    const r = await scheduleLive(title.trim(), new Date(at).toISOString());
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setSchedule(r.data.schedule);
  };
  const stop = async () => {
    if (!live || !window.confirm('Terminer le live ?')) return;
    ending.current = true;
    recorder.current?.stop();
    recorder.current = null;
    wake.current?.release().catch(() => {});
    const r = await endLive(live.id);
    if (r.ok) setResult(r.data.result);
    camera?.getTracks().forEach(t => t.stop());
    setPhase('fin');
  };
  const pin = async (listingId: string) => {
    if (!live) return;
    const r = await pinLive(live.id, listingId);
    if (r.ok) setLive(r.data.live);
  };
  const launchFlash = async () => {
    if (!live || !flash) return;
    const price = Number(flash.price.replace(/\s/g, ''));
    const qty = flash.qty.trim() ? Number(flash.qty) : null;
    const r = await flashLive(live.id, flash.listingId, price, flash.minutes, qty);
    if (!r.ok) return setNetwork(r.error);
    setLive(r.data.live);
    setFlash(null);
  };
  const answer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!live || !reply.trim()) return;
    const r = await sendLiveComment(live.id, reply.trim());
    if (!r.ok) return setNetwork(r.error);
    setReply('');
  };

  if (status !== 'user')
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="font-display text-3xl">Faire un live</p>
        <Link
          to={mpPath(`/compte?retour=${encodeURIComponent(mpPath('/live/studio'))}`)}
          className="btn-dark mt-6 inline-flex !h-12 !px-6"
        >
          Me connecter
        </Link>
      </div>
    );
  if (seller === undefined)
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  if (!seller || seller.status !== 'active')
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="font-display text-3xl">Faire un live</p>
        <p className="mt-2 text-ink/70">Le live est ouvert aux boutiques validées.</p>
        <Link to={mpPath('/vendre')} className="btn-dark mt-6 inline-flex !h-12 !px-6">
          Ma boutique
        </Link>
      </div>
    );
  if (!canGoLive())
    return (
      <p className="max-w-md mx-auto px-4 py-16 text-center text-ink/75">
        Ce navigateur ne sait pas filmer un live. Ouvrez le site dans Chrome sur votre téléphone.
      </p>
    );
  const color = ACCENTS[seller.accent]?.hex ?? ACCENTS.prune.hex;

  /* ---------- Bilan ---------- */
  if (phase === 'fin')
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center" data-testid="mp-live-result">
        <p className="font-display text-4xl">Live terminé</p>
        {error && <p className="mt-2 text-wine">{error}</p>}
        {result && (
          <dl className="mt-6 grid grid-cols-2 gap-3 text-left">
            {(
              [
                ['Commandes', String(result.sales)],
                ['Montant', F(result.amount)],
                ['Spectatrices (au plus)', String(result.peak)],
                ['Cœurs', String(result.likes)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="bg-white rounded-2xl border border-ink/[0.06] p-4">
                <dt className="text-xs text-ink/60">{k}</dt>
                <dd className="font-display text-2xl">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to={mpPath('/vendre')} className="btn-dark !h-12 !px-6">
            Voir mes commandes
          </Link>
          <button
            onClick={() => {
              setResult(null);
              setError('');
              setPhase('preparer');
            }}
            className="btn-outline !h-12 !px-6"
          >
            Refaire un live
          </button>
        </div>
      </div>
    );

  const cameraBar = (
    <div className="flex items-center gap-1.5">
      <div
        className="flex rounded-full bg-black/45 backdrop-blur p-0.5"
        role="radiogroup"
        aria-label="Qualité de la vidéo"
      >
        {(Object.keys(QUALITIES) as Quality[]).map(q => (
          <button
            key={q}
            role="radio"
            aria-checked={quality === q}
            onClick={() => pickQuality(q)}
            className={`h-8 px-2.5 rounded-full text-[11px] font-semibold ${quality === q ? 'bg-white text-ink' : 'text-white'}`}
            title={QUALITIES[q].perHour}
          >
            {QUALITIES[q].label}
          </button>
        ))}
      </div>
      <button
        onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))}
        aria-label="Changer de caméra"
        className="w-10 h-10 rounded-full bg-black/45 backdrop-blur grid place-items-center"
      >
        <SwitchCamera className="w-5 h-5" />
      </button>
    </div>
  );

  /* ---------- En direct ---------- */
  if (phase === 'direct' && live) {
    const secs = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    const orders = comments.filter(c => c.system && c.text.startsWith('🛍️')).length;
    const pinned = live.products.find(p => p.id === live.pinned);
    return (
      <div className="fixed inset-0 z-50 bg-black text-white" data-testid="mp-studio-live">
        <div className="relative h-full w-full max-w-md mx-auto overflow-hidden">
          <video
            ref={preview}
            muted
            playsInline
            autoPlay
            className={`absolute inset-0 w-full h-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
          />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/90 via-black/35 to-transparent pointer-events-none" />
          <div className="absolute top-0 inset-x-0 p-3 space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-1 rounded-md bg-red-600 text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden /> En direct ·{' '}
                {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
              </span>
              <span
                className="px-2 py-1 rounded-md bg-black/40 text-xs inline-flex items-center gap-1"
                data-testid="mp-studio-viewers"
              >
                <Eye className="w-3.5 h-3.5" /> {live.viewers}
              </span>
              <span className="px-2 py-1 rounded-md bg-black/40 text-xs inline-flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> {live.likes}
              </span>
              <span
                className="px-2 py-1 rounded-md bg-black/40 text-xs inline-flex items-center gap-1"
                data-testid="mp-studio-orders"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> {orders}
              </span>
              <button
                onClick={stop}
                className="ml-auto h-9 px-4 rounded-full bg-white text-ink text-sm font-bold"
                data-testid="mp-studio-end"
              >
                Terminer
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              {cameraBar}
              <div className="flex gap-1.5">
                <button
                  onClick={async () => {
                    const text = window.prompt(
                      'Bandeau au-dessus de la vidéo (vide pour l’enlever)',
                      live.banner ?? '',
                    );
                    if (text === null) return;
                    const r = await setLiveBanner(live.id, text);
                    if (r.ok) setLive(r.data.live);
                    else setNetwork(r.error);
                  }}
                  aria-label="Bandeau d'annonce"
                  className="w-10 h-10 rounded-full bg-black/45 backdrop-blur grid place-items-center"
                  data-testid="mp-studio-banner"
                >
                  <Megaphone className="w-5 h-5" />
                </button>
                <button
                  onClick={() =>
                    setFlash({ listingId: live.pinned ?? live.products[0]?.id ?? '', price: '', minutes: 5, qty: '' })
                  }
                  className="h-10 px-3 rounded-full bg-amber-400 text-ink text-sm font-bold inline-flex items-center gap-1"
                  data-testid="mp-studio-flash"
                >
                  <Zap className="w-4 h-4" /> Flash
                </button>
              </div>
            </div>
            {live.banner && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-ink text-xs font-bold px-3 py-1">
                <Megaphone className="w-3.5 h-3.5" /> {live.banner}
              </p>
            )}
          </div>
          {network && (
            <p className="absolute top-32 inset-x-3 rounded-xl bg-amber-300 text-ink text-sm px-3 py-2" role="status">
              {network}
            </p>
          )}

          <div className="absolute inset-x-0 bottom-0 p-3 space-y-2">
            <ul
              className="space-y-1 max-h-56 overflow-hidden flex flex-col justify-end items-start"
              data-testid="mp-studio-comments"
            >
              {comments.slice(-8).map(c => (
                <li
                  key={c.id}
                  className={`text-sm flex items-start gap-2 rounded-2xl px-3 py-1 max-w-full ${c.system ? 'bg-amber-400/20 text-amber-100 italic' : 'bg-black/35'}`}
                >
                  <span className="flex-1">
                    {!c.system && <strong className="mr-1.5">{c.name}</strong>}
                    {c.text}
                  </span>
                  {!c.system && !c.seller && (
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Masquer ${c.name} ? Ses commentaires disparaissent du live.`)) return;
                        const r = await muteLive(live.id, c.id);
                        if (r.ok) setComments(list => list.filter(x => x.id !== c.id));
                      }}
                      className="text-[11px] underline text-white/70 shrink-0"
                    >
                      Masquer
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 overflow-x-auto no-scrollbar" aria-label="Articles du live">
              {live.products.map(p => (
                <button
                  key={p.id}
                  onClick={() => pin(p.id)}
                  aria-pressed={live.pinned === p.id}
                  className={`relative shrink-0 w-28 rounded-xl overflow-hidden text-left border-2 ${p.flash ? 'border-amber-400' : live.pinned === p.id ? 'border-red-500' : 'border-transparent'} bg-white text-ink`}
                  data-testid="mp-studio-product"
                >
                  <img src={p.photos[0]} alt="" className="w-full h-16 object-cover" />
                  {p.flash && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-400 text-[10px] font-bold inline-flex items-center gap-0.5">
                      <Zap className="w-3 h-3" /> <Countdown until={p.flash.until} />
                    </span>
                  )}
                  <span className="block px-1.5 py-1 text-[11px] font-semibold truncate">
                    {live.pinned === p.id ? <Pin className="inline w-3 h-3 text-red-600 mr-0.5" /> : null}
                    {p.title}
                  </span>
                </button>
              ))}
            </div>
            <form onSubmit={answer} className="flex items-center gap-2">
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                maxLength={200}
                placeholder="Répondre à tout le monde…"
                aria-label="Répondre dans le live"
                className="flex-1 h-11 px-4 rounded-full bg-white/15 placeholder-white/70 outline-none"
              />
              <button aria-label="Envoyer" className="w-11 h-11 rounded-full bg-white/15 grid place-items-center">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Offre flash : article, prix, durée, quantité */}
          {flash && (
            <div className="absolute inset-0 bg-black/50 flex items-end" onClick={() => setFlash(null)}>
              <div
                className="w-full rounded-t-3xl bg-white text-ink p-4 space-y-3"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-label="Offre flash"
                data-testid="mp-studio-flash-sheet"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl inline-flex items-center gap-2">
                    <Zap className="w-5 h-5 fill-amber-400 text-amber-500" /> Offre flash
                  </h2>
                  <button
                    onClick={() => setFlash(null)}
                    aria-label="Fermer"
                    className="w-9 h-9 grid place-items-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <label className="block">
                  <span className="field-label">Article</span>
                  <select
                    value={flash.listingId}
                    onChange={e => setFlash({ ...flash, listingId: e.target.value })}
                    className="field"
                  >
                    {live.products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="field-label">Prix flash (F)</span>
                    <input
                      inputMode="numeric"
                      value={flash.price}
                      onChange={e => setFlash({ ...flash, price: e.target.value })}
                      className="field"
                      aria-label="Prix flash"
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">Pièces (facultatif)</span>
                    <input
                      inputMode="numeric"
                      value={flash.qty}
                      onChange={e => setFlash({ ...flash, qty: e.target.value })}
                      placeholder="Sans limite"
                      className="field"
                      aria-label="Nombre de pièces"
                    />
                  </label>
                </div>
                <div className="flex gap-2" role="radiogroup" aria-label="Durée">
                  {FLASH_MINUTES.map(m => (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={flash.minutes === m}
                      onClick={() => setFlash({ ...flash, minutes: m })}
                      className={`flex-1 h-10 rounded-full border text-sm font-semibold ${flash.minutes === m ? 'bg-ink text-white border-ink' : 'border-ink/15'}`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {live.products.find(p => p.id === flash.listingId)?.flash && (
                    <button
                      onClick={async () => {
                        const r = await stopFlash(live.id, flash.listingId);
                        if (r.ok) setLive(r.data.live);
                        setFlash(null);
                      }}
                      className="h-12 px-4 rounded-full border border-ink/15 font-semibold"
                    >
                      Arrêter
                    </button>
                  )}
                  <button
                    onClick={launchFlash}
                    className="flex-1 h-12 rounded-full bg-amber-500 text-white font-bold"
                    data-testid="mp-studio-flash-go"
                  >
                    Lancer le compte à rebours
                  </button>
                </div>
                {pinned && (
                  <p className="text-xs text-ink/60">L'article de l'offre passe à l'écran pour tout le monde.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Préparer le live : la caméra en plein écran, les réglages en bas ---------- */
  return (
    <div className="fixed inset-0 z-50 bg-black text-white" data-testid="mp-studio">
      <div className="relative h-full w-full max-w-md mx-auto overflow-hidden">
        <video
          ref={preview}
          muted
          playsInline
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
          data-testid="mp-studio-preview"
        />
        {!camera && (
          <div className="absolute inset-x-0 top-20 h-[22%] grid place-items-center px-10 text-center text-sm text-white/85">
            {error.startsWith('Autorisez') ? error : 'Ouverture de la caméra…'}
          </div>
        )}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute top-0 inset-x-0 p-3 flex items-center justify-between gap-2">
          <button
            onClick={() => navigate(mpPath('/vendre'))}
            aria-label="Fermer"
            className="w-10 h-10 rounded-full bg-black/45 backdrop-blur grid place-items-center"
          >
            <X className="w-5 h-5" />
          </button>
          {cameraBar}
        </div>
        <p className="absolute top-16 right-3 text-[11px] text-white/80">{QUALITIES[quality].perHour}</p>

        <div className="absolute inset-x-0 bottom-0 max-h-[64%] overflow-y-auto rounded-t-3xl bg-white text-ink p-4 space-y-3">
          <div className="mx-auto w-10 h-1.5 rounded-full bg-ink/15" aria-hidden />
          {resume && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3">
              <p className="text-sm font-semibold">Votre live « {resume.title} » est encore ouvert.</p>
              <button onClick={() => goLive(resume)} className="btn-dark mt-2 !h-10 !px-4">
                Reprendre le live
              </button>
            </div>
          )}
          {schedule && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3" data-testid="mp-studio-scheduled">
              <p className="text-sm">
                <CalendarClock className="inline w-4 h-4 mr-1" />
                Live programmé <strong>{when(schedule.at)}</strong> : « {schedule.title} » · {schedule.reminders}{' '}
                cliente(s) à prévenir
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusButton
                  label="Annoncer en statut"
                  filename={`live-${seller.slug}.jpg`}
                  make={() => ({
                    photo: seller.cover ?? listings[0]?.photos[0] ?? seller.logo,
                    title: `Live ${when(schedule.at)}`,
                    line: schedule.title,
                    small: seller.shopName,
                    link: shopLink(seller.slug),
                    color,
                  })}
                />
                <button
                  onClick={async () => {
                    if (!window.confirm('Annuler ce live programmé ? Les clientes qui attendaient seront prévenues.'))
                      return;
                    const r = await cancelSchedule();
                    if (r.ok) setSchedule(null);
                  }}
                  className="h-10 px-4 rounded-full border border-ink/15 font-semibold text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Titre du live (ex. : Nouveaux boubous de Tabaski)"
            aria-label="Titre du live"
            className="field !text-base"
            data-testid="mp-studio-title"
          />
          <div className="flex rounded-full bg-ivory p-1" role="tablist" aria-label="Quand">
            {(
              [
                ['maintenant', 'Maintenant'],
                ['programmer', 'Programmer'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={mode === k}
                onClick={() => setMode(k)}
                className={`flex-1 h-9 rounded-full text-sm font-semibold ${mode === k ? 'bg-white shadow-sm' : 'text-ink/60'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'programmer' ? (
            <div className="space-y-2">
              <label className="block">
                <span className="field-label">Date et heure</span>
                <input
                  type="datetime-local"
                  value={at}
                  onChange={e => setAt(e.target.value)}
                  className="field"
                  data-testid="mp-studio-at"
                />
              </label>
              <p className="text-xs text-ink/60">
                Vos abonnées sont prévenues ; les clientes qui touchent « Me prévenir » reçoivent un message 15 minutes
                avant et au début du live.
              </p>
              {error && (
                <p className="text-sm text-wine" role="alert">
                  {error}
                </p>
              )}
              <button
                onClick={plan}
                disabled={busy}
                className="w-full h-12 rounded-full bg-ink text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="mp-studio-schedule"
              >
                <CalendarClock className="w-4 h-4" /> {schedule ? 'Changer la date' : 'Programmer le live'}
              </button>
            </div>
          ) : (
            <>
              <fieldset>
                <legend className="field-label">Articles à montrer (prix live facultatif, plus bas que le prix)</legend>
                {!listings.length && (
                  <p className="text-sm text-ink/70">Publiez d'abord des articles dans votre boutique.</p>
                )}
                <ul className="space-y-2">
                  {listings.map(l => {
                    const on = l.id in chosen;
                    return (
                      <li key={l.id} className="flex items-center gap-3" data-testid="mp-studio-pick">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setChosen(c => {
                              const next = { ...c };
                              if (on) delete next[l.id];
                              else next[l.id] = '';
                              return next;
                            })
                          }
                          aria-label={`Montrer ${l.title}`}
                          className="w-5 h-5 accent-red-600"
                        />
                        <img src={l.photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate">{l.title}</span>
                          <span className="text-xs text-ink/60">
                            {F(l.price)}
                            {l.priceMode === 'negocier' ? ' · prix caché' : ''}
                          </span>
                        </span>
                        {on && (
                          <input
                            inputMode="numeric"
                            value={chosen[l.id]}
                            onChange={e => setChosen(c => ({ ...c, [l.id]: e.target.value }))}
                            placeholder="Prix live"
                            aria-label={`Prix live pour ${l.title}`}
                            className="w-24 h-10 px-3 rounded-xl border border-ink/15 text-sm"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
              {error && (
                <p className="text-sm text-wine" role="alert">
                  {error}
                </p>
              )}
              <button
                onClick={start}
                disabled={busy || !camera}
                className="w-full h-14 rounded-full bg-red-600 text-white text-base font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-600/30"
                data-testid="mp-studio-start"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />} Passer en direct
              </button>
              {!!seller.followers && (
                <p className="text-xs text-ink/60 text-center">
                  {seller.followers} abonnée{seller.followers > 1 ? 's' : ''} seront prévenue
                  {seller.followers > 1 ? 's' : ''} sur WhatsApp.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
