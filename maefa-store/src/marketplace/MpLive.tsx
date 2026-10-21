import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  Flag,
  Heart,
  Loader2,
  Megaphone,
  Send,
  Share2,
  ShoppingBag,
  Store,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import {
  fetchFollows,
  fetchLive,
  fetchLives,
  followShop,
  likeLive,
  reportLive,
  sendLiveComment,
  type LiveComment,
  type LiveProduct,
  type LiveView,
} from './api';
import { useMpCart } from './cart';
import { MP, mpPath } from './config';
import { ACCENTS, F } from './format';
import { LivePlayer, type PlayerState } from './liveMedia';
import { Countdown } from './Countdown';
import { useAccount } from '../context/AccountContext';
import { usePageTitle } from '../utils/usePageTitle';

/** Identifiant anonyme du téléphone (compte les spectatrices, sans rien savoir d'elles) */
function viewerKey() {
  const fresh = () => Math.random().toString(36).slice(2, 12);
  try {
    let k = localStorage.getItem('mp_viewer');
    if (!k) localStorage.setItem('mp_viewer', (k = fresh()));
    return k;
  } catch {
    return fresh();
  }
}

/** Questions en un geste (pas besoin d'écrire) */
const QUICK = ["C'est combien ?", 'Quelles tailles ?', 'Livraison à Dakar ?', 'Je prends ! 🙋🏾‍♀️'];

/** Prix d'un article dans le live : offre flash, prix live (barré : le prix habituel), prix affiché, ou à négocier */
const PriceLine: React.FC<{ p: LiveProduct; dark?: boolean }> = ({ p, dark }) => {
  const promo = p.flash?.price ?? p.livePrice;
  if (promo)
    return (
      <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
        <strong className={p.flash ? 'text-amber-600' : ''}>{F(promo)}</strong>
        {p.price !== null && p.price > promo && <s className="text-xs opacity-60">{F(p.price)}</s>}
        <span
          className={`text-[10px] font-bold uppercase tracking-wide ${p.flash ? 'text-amber-600' : dark ? 'text-rose-300' : 'text-rose-600'}`}
        >
          {p.flash ? 'offre flash' : 'prix live'}
        </span>
      </span>
    );
  return p.price !== null ? <strong>{F(p.price)}</strong> : <span>{p.priceBand ?? 'Prix à négocier'}</span>;
};
const negotiable = (p: LiveProduct) => p.price === null && !p.livePrice && !p.flash;

/**
 * Le live vu par la cliente, plein écran comme sur TikTok : la vidéo, les commentaires, les cœurs (double tap),
 * l'article présenté (avec son offre flash), les questions rapides et le panier, sans quitter le direct ;
 * glisser vers le haut ou le bas passe au live suivant.
 */
export default function MpLive() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { status } = useAccount();
  const { add, count } = useMpCart();
  const viewer = useMemo(viewerKey, []);
  const [live, setLive] = useState<LiveView | null>(null);
  const [missing, setMissing] = useState(false);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const after = useRef(0);
  const pollNow = useRef<() => void>(() => {});
  const video = useRef<HTMLVideoElement>(null);
  const player = useRef<LivePlayer | null>(null);
  const [playState, setPlayState] = useState<PlayerState>('chargement');
  const [muted, setMuted] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [hearts, setHearts] = useState<{ id: number; dx: number; x?: number; y?: number }[]>([]);
  const pendingLikes = useRef(0);
  const [likes, setLikes] = useState(0);
  const [following, setFollowing] = useState(false);
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [others, setOthers] = useState<string[]>([]);
  usePageTitle(live ? `🔴 ${live.title} · ${live.seller?.shopName ?? MP.name}` : `Live · ${MP.name}`);

  // État du live et nouveaux commentaires, toutes les 2 secondes
  useEffect(() => {
    let alive = true;
    after.current = 0;
    setComments([]);
    setLive(null);
    setMissing(false);
    const tick = async () => {
      const r = await fetchLive(id, after.current, viewer);
      if (!alive) return;
      if (!r.ok) return r.status === 404 && setMissing(true);
      const { live: l, comments: fresh, hidden } = r.data;
      setLive(l);
      setLikes(n => Math.max(n, l.likes));
      if (fresh.length) after.current = fresh[fresh.length - 1].id;
      setComments(list => [...list, ...fresh].filter(c => !hidden.includes(c.id)).slice(-60));
    };
    pollNow.current = tick;
    tick();
    const t = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id, viewer]);
  // Les autres lives en cours (pour glisser de l'un à l'autre)
  useEffect(() => {
    fetchLives().then(r => r.ok && setOthers(r.data.lives.map(l => l.id)));
  }, [id]);

  // Lecture de la vidéo
  const mime = live?.mime ?? null;
  const on = live?.status === 'en_direct';
  useEffect(() => {
    if (!mime || !video.current) return;
    const p = new LivePlayer(video.current, id, mime, setPlayState);
    player.current = p;
    return () => {
      p.destroy();
      player.current = null;
    };
  }, [id, mime]);
  const seq = live?.seq ?? 0;
  useEffect(() => {
    if (on && seq) player.current?.setLatest(seq);
  }, [on, seq, mime]);

  // Cœurs : envoyés par paquets (un envoi toutes les 1,5 s au plus)
  useEffect(() => {
    const t = setInterval(() => {
      const n = Math.min(10, pendingLikes.current);
      if (!n) return;
      pendingLikes.current -= n;
      likeLive(id, n).then(r => r.ok && setLikes(x => Math.max(x, r.data.likes)));
    }, 1500);
    return () => clearInterval(t);
  }, [id]);
  const heart = (at?: { x: number; y: number }) => {
    pendingLikes.current += 1;
    setLikes(n => n + 1);
    navigator.vibrate?.(15);
    const h = { id: Date.now() + Math.random(), dx: Math.round(Math.random() * 60 - 30), ...at };
    setHearts(list => [...list.slice(-12), h]);
    setTimeout(() => setHearts(list => list.filter(x => x.id !== h.id)), 1700);
  };

  // Toucher la vidéo : le son ; toucher deux fois : un cœur (comme sur TikTok) ; glisser : live suivant
  const lastTap = useRef(0);
  const touchY = useRef<number | null>(null);
  const go = (step: 1 | -1) => {
    const i = others.indexOf(id);
    const next = others[(i + step + others.length) % others.length];
    if (next && next !== id) navigate(mpPath(`/live/${next}`), { replace: true });
  };
  const onTap = (e: React.MouseEvent) => {
    const t = Date.now();
    if (t - lastTap.current < 320) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      heart({ x: e.clientX - r.left, y: e.clientY - r.top });
    } else if (muted) {
      setMuted(false);
      video.current?.play().catch(() => {});
    }
    lastTap.current = t;
  };

  // Suivre la boutique depuis le live
  const slug = live?.seller?.slug;
  useEffect(() => {
    if (status !== 'user' || !slug) return;
    fetchFollows().then(r => r.ok && setFollowing(r.data.shops.includes(slug)));
  }, [status, slug]);
  const login = () => navigate(mpPath(`/compte?retour=${encodeURIComponent(mpPath(`/live/${id}`))}`));

  const say = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(x => (x === m ? '' : x)), 3500);
  };
  const comment = async (t: string) => {
    if (status !== 'user') return login();
    if (!t.trim()) return;
    const r = await sendLiveComment(id, t.trim());
    if (!r.ok) return say(r.error);
    setText('');
    pollNow.current();
  };
  const buy = (p: LiveProduct) => {
    if (p.soldOut) return;
    // Prix à négocier (sans prix live) : on fait une offre sur la fiche de l'article
    if (negotiable(p)) return navigate(mpPath(`/annonce/${p.id}`));
    const v = p.variants.length ? (variants[p.id] ?? null) : null;
    if (p.variants.length && !v) {
      setSheet(true);
      return say(`Choisissez : ${p.variantLabel ?? 'un modèle'} (« ${p.title} »)`);
    }
    add(p, 1, v, p.flash?.price ?? p.livePrice ?? undefined);
    navigator.vibrate?.(30);
    say(`« ${p.title} » est dans votre panier`);
  };
  const share = async () => {
    const url = location.href;
    if (navigator.share) await navigator.share({ title: live?.title, url }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(`🔴 En direct : ${live?.title}\n${url}`)}`, '_blank');
  };

  if (missing)
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center" data-testid="mp-live-missing">
        <p className="font-display text-3xl">Ce live est terminé</p>
        <Link to={mpPath()} className="btn-dark mt-6 inline-flex !h-12 !px-6">
          Voir les boutiques
        </Link>
      </div>
    );
  if (!live)
    return (
      <div className="fixed inset-0 z-50 bg-black grid place-items-center">
        <Loader2 className="w-7 h-7 animate-spin text-white/60" />
      </div>
    );

  const s = live.seller;
  const color = ACCENTS[s?.accent ?? 'prune']?.hex ?? ACCENTS.prune.hex;
  const pinned = live.products.find(p => p.id === live.pinned) ?? null;
  const ended = live.status === 'termine';
  const several = others.filter(x => x !== id).length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white" data-testid="mp-live">
      <div
        className="relative h-full w-full max-w-md mx-auto overflow-hidden"
        onTouchStart={e => (touchY.current = e.touches[0].clientY)}
        onTouchEnd={e => {
          const dy = touchY.current === null ? 0 : e.changedTouches[0].clientY - touchY.current;
          touchY.current = null;
          if (several && !sheet && Math.abs(dy) > 90) go(dy < 0 ? 1 : -1);
        }}
      >
        <video
          ref={video}
          muted={muted}
          playsInline
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
          data-testid="mp-live-video"
        />
        {/* Zone de la vidéo : toucher = son, double toucher = cœur */}
        <div className="absolute inset-0" onClick={onTap} aria-hidden />
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/65 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

        {/* En-tête : boutique, suivre, en direct, spectatrices */}
        <div className="absolute top-0 inset-x-0 p-3 flex items-center gap-2">
          <button
            onClick={() => (history.length > 1 ? navigate(-1) : navigate(mpPath()))}
            aria-label="Quitter le live"
            className="w-10 h-10 rounded-full bg-black/35 backdrop-blur grid place-items-center shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {s && (
            <div className="flex items-center gap-2 min-w-0 bg-black/35 backdrop-blur rounded-full pl-1 pr-1.5 py-1">
              <Link to={mpPath(`/boutique/${s.slug}`)} className="flex items-center gap-2 min-w-0">
                <span
                  className="w-8 h-8 rounded-full overflow-hidden grid place-items-center font-display shrink-0 ring-2 ring-red-500"
                  style={{ background: color }}
                >
                  {s.logo ? <img src={s.logo} alt="" className="w-full h-full object-cover" /> : s.shopName[0]}
                </span>
                <span className="text-sm font-semibold truncate max-w-[8.5rem]">{s.shopName}</span>
              </Link>
              {!following && (
                <button
                  onClick={async () => {
                    if (status !== 'user') return login();
                    const r = await followShop(s.slug, true);
                    if (r.ok) setFollowing(true);
                    else say(r.error);
                  }}
                  className="h-7 px-3 rounded-full text-xs font-bold"
                  style={{ background: color }}
                  data-testid="mp-live-follow"
                >
                  Suivre
                </button>
              )}
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span
              className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1 ${ended ? 'bg-white/25' : 'bg-red-600'}`}
              data-testid="mp-live-badge"
            >
              {!ended && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden />}
              {ended ? 'Terminé' : 'En direct'}
            </span>
            <span
              className="px-2 py-1 rounded-md bg-black/35 backdrop-blur text-xs inline-flex items-center gap-1"
              data-testid="mp-live-viewers"
            >
              <Eye className="w-3.5 h-3.5" /> {live.viewers}
            </span>
          </div>
        </div>
        <div className="absolute top-16 left-3 right-3 space-y-1.5 pointer-events-none">
          <p className="text-sm font-semibold drop-shadow">{live.title}</p>
          {live.banner && (
            <p
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-ink text-xs font-bold px-3 py-1 shadow"
              data-testid="mp-live-banner"
            >
              <Megaphone className="w-3.5 h-3.5" /> {live.banner}
            </p>
          )}
        </div>

        {/* États de la vidéo */}
        {(ended || live.status === 'coupure' || playState !== 'lecture') && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none px-8 text-center">
            <div className="bg-black/60 backdrop-blur rounded-2xl px-5 py-4 text-sm" data-testid="mp-live-state">
              {ended ? (
                <>
                  <p className="font-display text-2xl">Le live est terminé</p>
                  <p className="mt-1 opacity-85">Les articles restent à commander avec le bouton ci-dessous.</p>
                  {s && (
                    <Link
                      to={mpPath(`/boutique/${s.slug}`)}
                      className="pointer-events-auto mt-3 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white text-ink font-semibold"
                    >
                      <Store className="w-4 h-4" /> Voir la boutique
                    </Link>
                  )}
                </>
              ) : live.status === 'coupure' ? (
                'La connexion de la vendeuse est coupée : le live reprend dès que le réseau revient…'
              ) : playState === 'illisible' ? (
                'La vidéo ne se lit pas sur ce téléphone : vous voyez quand même les articles et les commentaires.'
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Chargement du direct…
                </span>
              )}
            </div>
          </div>
        )}
        {muted && !ended && playState === 'lecture' && (
          <button
            onClick={() => {
              setMuted(false);
              video.current?.play().catch(() => {});
            }}
            className="absolute top-28 left-1/2 -translate-x-1/2 h-10 px-4 rounded-full bg-white/90 text-ink text-sm font-semibold inline-flex items-center gap-2 shadow-lg"
            data-testid="mp-live-sound"
          >
            <Volume2 className="w-4 h-4" /> Activer le son
          </button>
        )}

        {/* Actions à droite : cœurs, articles, partage, signalement, lives suivants */}
        <div className="absolute right-2 bottom-48 flex flex-col items-center gap-4">
          {several && (
            <button
              onClick={() => go(-1)}
              aria-label="Live précédent"
              className="w-10 h-10 rounded-full bg-black/35 backdrop-blur grid place-items-center"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => heart()}
            aria-label="Envoyer un cœur"
            className="grid justify-items-center"
            data-testid="mp-live-heart"
          >
            <span className="w-12 h-12 rounded-full bg-black/35 backdrop-blur grid place-items-center active:scale-90 transition-transform">
              <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
            </span>
            <span className="text-xs font-semibold mt-0.5 tabular-nums" data-testid="mp-live-likes">
              {likes}
            </span>
          </button>
          <button
            onClick={() => setSheet(true)}
            aria-label="Articles du live"
            className="grid justify-items-center"
            data-testid="mp-live-bag"
          >
            <span className="relative w-12 h-12 rounded-full bg-amber-400 text-ink grid place-items-center shadow-lg">
              <ShoppingBag className="w-6 h-6" />
              {live.products.some(p => p.flash) && (
                <Zap className="absolute -top-1 -right-1 w-5 h-5 fill-red-500 text-red-500" aria-label="Offre flash" />
              )}
            </span>
            <span className="text-xs font-semibold mt-0.5">{live.products.length}</span>
          </button>
          <button
            onClick={share}
            aria-label="Partager le live"
            className="w-12 h-12 rounded-full bg-black/35 backdrop-blur grid place-items-center"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={async () => {
              if (status !== 'user') return login();
              const reason = window.prompt(
                'Pourquoi signalez-vous ce live ? (contrefaçon, arnaque, contenu choquant…)',
              );
              if (!reason) return;
              const r = await reportLive(id, reason);
              say(r.ok ? 'Merci : la plateforme va vérifier ce live.' : r.error);
            }}
            aria-label="Signaler le live"
            className="w-10 h-10 rounded-full bg-black/35 backdrop-blur grid place-items-center"
          >
            <Flag className="w-4 h-4" />
          </button>
          {several && (
            <button
              onClick={() => go(1)}
              aria-label="Live suivant"
              className="w-10 h-10 rounded-full bg-black/35 backdrop-blur grid place-items-center"
              data-testid="mp-live-next"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </div>
        {hearts.map(h => (
          <Heart
            key={h.id}
            className={`live-heart absolute fill-rose-500 text-rose-500 pointer-events-none ${h.x === undefined ? 'right-5 bottom-64 w-7 h-7' : 'w-16 h-16'}`}
            style={
              {
                '--dx': `${h.dx}px`,
                ...(h.x !== undefined ? { left: h.x - 32, top: h.y! - 32 } : {}),
              } as React.CSSProperties
            }
          />
        ))}

        {/* Bas : commentaires, article présenté, questions rapides, écrire */}
        <div className="absolute inset-x-0 bottom-0 p-3 pr-16 space-y-2 pointer-events-none">
          <ul
            className="space-y-1 max-h-52 overflow-hidden flex flex-col justify-end items-start"
            aria-live="polite"
            data-testid="mp-live-comments"
          >
            {comments.slice(-7).map(c => (
              <li
                key={c.id}
                className={`text-sm leading-snug rounded-2xl px-3 py-1 max-w-full ${c.system ? 'bg-amber-400/20 text-amber-100 italic' : 'bg-black/30 backdrop-blur-sm'}`}
              >
                {!c.system && (
                  <strong className="mr-1.5">
                    {c.name}
                    {c.seller && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-red-600 text-[10px] uppercase tracking-wide">
                        Vendeuse
                      </span>
                    )}
                  </strong>
                )}
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
          {pinned && (
            <div
              className={`pointer-events-auto flex items-center gap-3 rounded-2xl bg-white text-ink p-2 pr-3 shadow-xl ${pinned.flash ? 'ring-4 ring-amber-400' : ''}`}
              data-testid="mp-live-pinned"
            >
              <img src={pinned.photos[0]} alt="" className="w-14 h-14 rounded-xl object-cover bg-ivory" />
              <div className="flex-1 min-w-0">
                {pinned.flash ? (
                  <p
                    className="text-[11px] font-bold text-amber-700 flex items-center gap-1 whitespace-nowrap"
                    data-testid="mp-live-flash"
                  >
                    <Zap className="w-3.5 h-3.5 shrink-0 fill-amber-500 text-amber-500" />
                    <span>Offre flash</span>
                    <span className="px-1.5 rounded bg-amber-100">
                      <Countdown until={pinned.flash.until} />
                    </span>
                    {pinned.flash.qty && <span>plus que {pinned.flash.left}</span>}
                  </p>
                ) : (
                  <p className="text-[10px] uppercase tracking-wide font-bold text-red-600">Présenté maintenant</p>
                )}
                <p className="text-sm font-semibold truncate">{pinned.title}</p>
                <p className="text-sm">
                  <PriceLine p={pinned} />
                </p>
              </div>
              <button
                onClick={() => buy(pinned)}
                disabled={pinned.soldOut}
                className="h-10 px-4 rounded-full text-white text-sm font-bold shrink-0 disabled:opacity-50"
                style={{ background: pinned.flash ? '#d97706' : color }}
                data-testid="mp-live-buy"
              >
                {pinned.soldOut ? 'Épuisé' : negotiable(pinned) ? 'Offre' : 'Acheter'}
              </button>
            </div>
          )}
          {!ended && (
            <div
              className="pointer-events-auto flex gap-1.5 overflow-x-auto no-scrollbar"
              aria-label="Questions rapides"
            >
              {QUICK.map(q => (
                <button
                  key={q}
                  onClick={() => comment(q)}
                  className="shrink-0 h-8 px-3 rounded-full bg-white/15 backdrop-blur text-xs font-semibold"
                  data-testid="mp-live-quick"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={e => {
              e.preventDefault();
              comment(text);
            }}
            className="pointer-events-auto flex items-center gap-2"
          >
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onFocus={() => status !== 'user' && login()}
              maxLength={200}
              disabled={ended}
              placeholder={ended ? 'Live terminé' : 'Écrire un commentaire…'}
              aria-label="Écrire un commentaire"
              className="flex-1 h-11 px-4 rounded-full bg-white/15 backdrop-blur placeholder-white/70 outline-none focus:bg-white/25"
              data-testid="mp-live-input"
            />
            <button
              aria-label="Envoyer"
              disabled={ended}
              className="w-11 h-11 rounded-full bg-white/15 backdrop-blur grid place-items-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
        {count > 0 && (
          <Link
            to={mpPath('/panier')}
            className="absolute right-3 top-40 h-10 px-4 rounded-full bg-white text-ink text-sm font-bold inline-flex items-center gap-2 shadow-lg"
            data-testid="mp-live-cart"
          >
            <ShoppingBag className="w-4 h-4" /> Commander ({count})
          </Link>
        )}
        {message && (
          <p
            className="absolute left-3 right-3 top-52 rounded-2xl bg-white text-ink text-sm px-4 py-3 shadow-lg"
            role="status"
            data-testid="mp-live-message"
          >
            {message}
          </p>
        )}

        {/* Tous les articles du live */}
        {sheet && (
          <div className="absolute inset-0 bg-black/40 flex items-end" onClick={() => setSheet(false)}>
            <div
              className="w-full max-h-[75%] overflow-y-auto rounded-t-3xl bg-white text-ink p-4 pb-6"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-label="Articles du live"
              data-testid="mp-live-sheet"
            >
              <div className="mx-auto w-10 h-1.5 rounded-full bg-ink/15" aria-hidden />
              <div className="mt-2 flex items-center justify-between">
                <h2 className="font-display text-2xl">Articles du live</h2>
                <button onClick={() => setSheet(false)} aria-label="Fermer" className="w-9 h-9 grid place-items-center">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ul className="mt-3 divide-y divide-ink/[0.06]">
                {live.products.map(p => (
                  <li key={p.id} className="flex gap-3 py-3" data-testid="mp-live-product">
                    <img src={p.photos[0]} alt="" className="w-20 h-20 rounded-xl object-cover bg-ivory" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {p.id === live.pinned && <span className="mr-1 text-red-600">●</span>}
                        {p.title}
                      </p>
                      <p className="text-sm">
                        <PriceLine p={p} />
                      </p>
                      {p.flash && (
                        <p className="text-xs font-semibold text-amber-700">
                          ⚡ encore <Countdown until={p.flash.until} />
                          {p.flash.qty ? ` · ${p.flash.left} pièce(s)` : ''}
                        </p>
                      )}
                      {p.variants.length > 0 && (
                        <div
                          className="mt-1 flex flex-wrap gap-1"
                          role="radiogroup"
                          aria-label={p.variantLabel ?? 'Choix'}
                        >
                          {p.variants.map(v => (
                            <button
                              key={v}
                              role="radio"
                              aria-checked={variants[p.id] === v}
                              onClick={() => setVariants(x => ({ ...x, [p.id]: v }))}
                              className={`h-8 px-3 rounded-full border text-xs ${variants[p.id] === v ? 'bg-ink text-white border-ink' : 'border-ink/20'}`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => buy(p)}
                        disabled={p.soldOut}
                        className="mt-2 h-9 px-4 rounded-full text-white text-sm font-semibold disabled:opacity-50"
                        style={{ background: p.flash ? '#d97706' : color }}
                        data-testid="mp-live-add"
                      >
                        {p.soldOut ? 'Épuisé' : negotiable(p) ? 'Faire une offre' : 'Ajouter au panier'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink/60">
                Paiement à la livraison. Les prix live valent pendant le live et 15 minutes après ; une offre flash, le
                temps du compte à rebours.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
