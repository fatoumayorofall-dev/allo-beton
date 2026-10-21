import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, Loader2, Pin, Radio, RefreshCw, Send, ShoppingBag, SwitchCamera } from 'lucide-react';
import {
  endLive,
  fetchLive,
  fetchMyListings,
  fetchMyLive,
  fetchMySeller,
  muteLive,
  pinLive,
  sendLiveComment,
  startLive,
  type LiveComment,
  type LiveResult,
  type LiveView,
  type MyListing,
  type MySeller,
} from './api';
import { MP, mpPath } from './config';
import { F } from './format';
import { LiveRecorder, canGoLive, openCamera } from './liveMedia';
import { useAccount } from '../context/AccountContext';
import { usePageTitle } from '../utils/usePageTitle';

type Phase = 'preparer' | 'direct' | 'fin';

/**
 * Le studio de la vendeuse : elle choisit les articles à montrer (avec un prix live si elle veut),
 * lance le direct, présente un article à la fois, lit et répond aux commentaires, puis voit son bilan.
 */
export default function MpLiveStudio() {
  usePageTitle(`Faire un live · ${MP.name}`);
  const { status } = useAccount();
  const [seller, setSeller] = useState<MySeller | null | undefined>(undefined);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [chosen, setChosen] = useState<Record<string, string>>({}); // article → prix live saisi ('' = sans)
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<Phase>('preparer');
  const [resume, setResume] = useState<LiveView | null>(null);
  const [live, setLive] = useState<LiveView | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [result, setResult] = useState<LiveResult | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [camera, setCamera] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [network, setNetwork] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');
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
  }, [status]);

  // Caméra (avant ou arrière) ; au changement pendant le direct, le morceau suivant prend la nouvelle
  const finished = phase === 'fin';
  useEffect(() => {
    if (!canGoLive() || finished || seller?.status !== 'active') return;
    let alive = true;
    let stream: MediaStream | null = null;
    openCamera(facing)
      .then(s => {
        if (!alive) return s.getTracks().forEach(t => t.stop());
        stream = s;
        setCamera(s);
        recorder.current?.setStream(s);
      })
      .catch(() => setError('Autorisez la caméra et le micro pour faire un live.'));
    return () => {
      alive = false;
      // L'ancienne caméra s'arrête un peu après : le morceau en cours finit de s'enregistrer
      setTimeout(() => stream?.getTracks().forEach(t => t.stop()), 3500);
    };
  }, [facing, finished, seller?.status]);
  useEffect(() => {
    if (preview.current && camera) preview.current.srcObject = camera;
  }, [camera, phase]);

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
      const rec = new LiveRecorder(l.id, e => {
        if (e.kind === 'envoye') setNetwork('');
        if (e.kind === 'lent') setNetwork('Réseau faible : la vidéo saute un peu. Rapprochez-vous du wifi.');
        if (e.kind === 'erreur') setNetwork(`Envoi difficile : ${e.error}`);
        if (e.kind === 'termine') {
          if (ending.current) return;
          setNetwork('');
          setError(e.error);
          setPhase('fin');
        }
      });
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
    [camera],
  );
  useEffect(
    () => () => {
      recorder.current?.stop();
      wake.current?.release().catch(() => {});
    },
    [],
  );

  const start = async () => {
    const products = Object.entries(chosen).map(([listingId, p]) => ({
      listingId,
      livePrice: p.trim() ? Number(p.replace(/\s/g, '')) : null,
    }));
    if (!products.length) return setError('Choisissez au moins un article à montrer.');
    setBusy(true);
    setError('');
    const r = await startLive(title.trim(), products);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    goLive(r.data.live);
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

  /* ---------- En direct ---------- */
  if (phase === 'direct' && live) {
    const secs = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    const orders = comments.filter(c => c.system && c.text.startsWith('🛍️')).length;
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
          <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
          <div className="absolute top-0 inset-x-0 p-3 flex items-center gap-2">
            <span className="px-2 py-1 rounded-md bg-red-600 text-[11px] font-bold uppercase tracking-wide">
              En direct · {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
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
              onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))}
              aria-label="Changer de caméra"
              className="ml-auto w-10 h-10 rounded-full bg-black/40 grid place-items-center"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
            <button
              onClick={stop}
              className="h-10 px-4 rounded-full bg-white text-ink text-sm font-bold"
              data-testid="mp-studio-end"
            >
              Terminer
            </button>
          </div>
          {network && (
            <p className="absolute top-16 inset-x-3 rounded-xl bg-amber-300 text-ink text-sm px-3 py-2" role="status">
              {network}
            </p>
          )}

          <div className="absolute inset-x-0 bottom-0 p-3 space-y-2">
            <ul
              className="space-y-1 max-h-56 overflow-hidden flex flex-col justify-end"
              data-testid="mp-studio-comments"
            >
              {comments.slice(-8).map(c => (
                <li key={c.id} className={`text-sm flex items-start gap-2 ${c.system ? 'text-amber-200 italic' : ''}`}>
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
                  className={`shrink-0 w-28 rounded-xl overflow-hidden text-left border-2 ${live.pinned === p.id ? 'border-red-500' : 'border-transparent'} bg-white text-ink`}
                  data-testid="mp-studio-product"
                >
                  <img src={p.photos[0]} alt="" className="w-full h-16 object-cover" />
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
        </div>
      </div>
    );
  }

  /* ---------- Préparer le live ---------- */
  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4" data-testid="mp-studio">
      <section className="bg-white rounded-3xl border border-ink/[0.06] p-5">
        <h1 className="font-display text-3xl flex items-center gap-2">
          <Radio className="w-6 h-6 text-red-600" /> Faire un live
        </h1>
        <p className="text-sm text-ink/70 mt-1">
          Montrez vos articles en vidéo, répondez aux questions en direct : vos abonnées sont prévenues sur WhatsApp dès
          le début et commandent sans quitter le live. Conseil : wifi ou bon réseau (≈ 200 Mo par heure), téléphone
          posé, bonne lumière.
        </p>
        <div className="mt-4 relative aspect-[9/16] max-h-[55vh] mx-auto rounded-2xl overflow-hidden bg-ink">
          <video
            ref={preview}
            muted
            playsInline
            autoPlay
            className={`w-full h-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
            data-testid="mp-studio-preview"
          />
          <button
            onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))}
            className="absolute top-2 right-2 h-9 px-3 rounded-full bg-black/50 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Changer de caméra
          </button>
        </div>
      </section>

      {resume && (
        <section className="bg-red-50 border border-red-200 rounded-3xl p-5">
          <p className="font-semibold">Votre live « {resume.title} » est encore ouvert.</p>
          <button onClick={() => goLive(resume)} className="btn-dark mt-3 !h-11 !px-5">
            Reprendre le live
          </button>
        </section>
      )}

      <section className="bg-white rounded-3xl border border-ink/[0.06] p-5 space-y-3">
        <label className="block">
          <span className="field-label">Titre du live</span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Ex. : Nouveaux boubous de Tabaski"
            className="field"
            data-testid="mp-studio-title"
          />
        </label>
        <fieldset>
          <legend className="field-label">Articles à montrer (prix live facultatif, plus bas que le prix)</legend>
          {!listings.length && <p className="text-sm text-ink/70">Publiez d'abord des articles dans votre boutique.</p>}
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
                    className="w-5 h-5"
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
                      className="w-28 h-10 px-3 rounded-xl border border-ink/15 text-sm"
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
          className="w-full h-12 rounded-full bg-red-600 text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          data-testid="mp-studio-start"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />} Démarrer le live
        </button>
        {!!seller.followers && (
          <p className="text-xs text-ink/60 text-center">
            {seller.followers} abonnée{seller.followers > 1 ? 's' : ''} seront prévenue{seller.followers > 1 ? 's' : ''}{' '}
            sur WhatsApp.
          </p>
        )}
      </section>
    </div>
  );
}
