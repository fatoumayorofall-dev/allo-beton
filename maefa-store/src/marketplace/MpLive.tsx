import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Flag, Heart, Loader2, Send, Share2, ShoppingBag, Volume2, X } from 'lucide-react';
import {
  fetchFollows,
  fetchLive,
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

/** Prix d'un article dans le live : prix live (barré : le prix habituel), prix affiché, ou à négocier */
const PriceLine: React.FC<{ p: LiveProduct }> = ({ p }) =>
  p.livePrice ? (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <strong>{F(p.livePrice)}</strong>
      {p.price !== null && p.price > p.livePrice && <s className="text-xs opacity-60">{F(p.price)}</s>}
      <span className="text-[10px] font-bold uppercase tracking-wide text-rose-300">prix live</span>
    </span>
  ) : p.price !== null ? (
    <strong>{F(p.price)}</strong>
  ) : (
    <span>{p.priceBand ?? 'Prix à négocier'}</span>
  );

/**
 * Le live vu par la cliente, plein écran comme sur TikTok : la vidéo, les commentaires, les cœurs,
 * l'article présenté par la vendeuse et le panier, sans quitter le direct.
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
  const [hearts, setHearts] = useState<{ id: number; dx: number }[]>([]);
  const pendingLikes = useRef(0);
  const [likes, setLikes] = useState(0);
  const [following, setFollowing] = useState(false);
  const [variants, setVariants] = useState<Record<string, string>>({});
  usePageTitle(live ? `🔴 ${live.title} · ${live.seller?.shopName ?? MP.name}` : `Live · ${MP.name}`);

  // État du live et nouveaux commentaires, toutes les 2 secondes
  useEffect(() => {
    let alive = true;
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
  const heart = () => {
    pendingLikes.current += 1;
    setLikes(n => n + 1);
    const h = { id: Date.now() + Math.random(), dx: Math.round(Math.random() * 60 - 30) };
    setHearts(list => [...list.slice(-12), h]);
    setTimeout(() => setHearts(list => list.filter(x => x.id !== h.id)), 1700);
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
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'user') return login();
    const t = text.trim();
    if (!t) return;
    const r = await sendLiveComment(id, t);
    if (!r.ok) return say(r.error);
    setText('');
    pollNow.current();
  };
  const buy = (p: LiveProduct) => {
    if (p.soldOut) return;
    // Prix à négocier (sans prix live) : on fait une offre sur la fiche de l'article
    if (p.price === null && !p.livePrice) return navigate(mpPath(`/annonce/${p.id}`));
    const v = p.variants.length ? (variants[p.id] ?? null) : null;
    if (p.variants.length && !v) {
      setSheet(true);
      return say(`Choisissez : ${p.variantLabel ?? 'un modèle'} (« ${p.title} »)`);
    }
    add(p, 1, v, p.livePrice ?? undefined);
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
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );

  const s = live.seller;
  const color = ACCENTS[s?.accent ?? 'prune']?.hex ?? ACCENTS.prune.hex;
  const pinned = live.products.find(p => p.id === live.pinned) ?? null;
  const ended = live.status === 'termine';

  return (
    <div className="fixed inset-0 z-50 bg-black text-white" data-testid="mp-live">
      <div className="relative h-full w-full max-w-md mx-auto overflow-hidden">
        <video
          ref={video}
          muted={muted}
          playsInline
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
          data-testid="mp-live-video"
        />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* En-tête : boutique, suivre, en direct, spectatrices */}
        <div className="absolute top-0 inset-x-0 p-3 flex items-center gap-2">
          <button
            onClick={() => (history.length > 1 ? navigate(-1) : navigate(mpPath()))}
            aria-label="Quitter le live"
            className="w-10 h-10 rounded-full bg-black/35 grid place-items-center shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {s && (
            <div className="flex items-center gap-2 min-w-0 bg-black/35 rounded-full pl-1 pr-1.5 py-1">
              <Link to={mpPath(`/boutique/${s.slug}`)} className="flex items-center gap-2 min-w-0">
                <span
                  className="w-8 h-8 rounded-full overflow-hidden grid place-items-center font-display shrink-0"
                  style={{ background: color }}
                >
                  {s.logo ? <img src={s.logo} alt="" className="w-full h-full object-cover" /> : s.shopName[0]}
                </span>
                <span className="text-sm font-semibold truncate max-w-[9rem]">{s.shopName}</span>
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
              className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${ended ? 'bg-white/25' : 'bg-red-600'}`}
              data-testid="mp-live-badge"
            >
              {ended ? 'Terminé' : 'En direct'}
            </span>
            <span
              className="px-2 py-1 rounded-md bg-black/35 text-xs inline-flex items-center gap-1"
              data-testid="mp-live-viewers"
            >
              <Eye className="w-3.5 h-3.5" /> {live.viewers}
            </span>
          </div>
        </div>
        <p className="absolute top-16 left-3 right-3 text-sm font-semibold drop-shadow">{live.title}</p>

        {/* États de la vidéo */}
        {(ended || live.status === 'coupure' || playState !== 'lecture') && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none px-8 text-center">
            <p className="bg-black/55 rounded-2xl px-4 py-3 text-sm" data-testid="mp-live-state">
              {ended
                ? 'Le live est terminé. Les articles restent à commander ci-dessous.'
                : live.status === 'coupure'
                  ? 'La connexion de la vendeuse est coupée : le live reprend dès que le réseau revient…'
                  : playState === 'illisible'
                    ? 'La vidéo ne se lit pas sur ce téléphone : vous voyez quand même les articles et les commentaires.'
                    : 'Chargement du direct…'}
            </p>
          </div>
        )}
        {muted && !ended && playState === 'lecture' && (
          <button
            onClick={() => {
              setMuted(false);
              video.current?.play().catch(() => {});
            }}
            className="absolute top-24 left-1/2 -translate-x-1/2 h-10 px-4 rounded-full bg-white text-ink text-sm font-semibold inline-flex items-center gap-2"
            data-testid="mp-live-sound"
          >
            <Volume2 className="w-4 h-4" /> Activer le son
          </button>
        )}

        {/* Actions à droite : cœurs, articles, partage, signalement */}
        <div className="absolute right-2 bottom-44 flex flex-col items-center gap-4">
          <button
            onClick={heart}
            aria-label="Envoyer un cœur"
            className="grid justify-items-center"
            data-testid="mp-live-heart"
          >
            <span className="w-12 h-12 rounded-full bg-black/35 grid place-items-center">
              <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
            </span>
            <span className="text-xs font-semibold mt-0.5" data-testid="mp-live-likes">
              {likes}
            </span>
          </button>
          <button
            onClick={() => setSheet(true)}
            aria-label="Articles du live"
            className="grid justify-items-center"
            data-testid="mp-live-bag"
          >
            <span className="w-12 h-12 rounded-full bg-amber-400 text-ink grid place-items-center">
              <ShoppingBag className="w-6 h-6" />
            </span>
            <span className="text-xs font-semibold mt-0.5">{live.products.length}</span>
          </button>
          <button
            onClick={share}
            aria-label="Partager le live"
            className="w-12 h-12 rounded-full bg-black/35 grid place-items-center"
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
            className="w-10 h-10 rounded-full bg-black/35 grid place-items-center"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
        {hearts.map(h => (
          <Heart
            key={h.id}
            className="live-heart absolute right-5 bottom-60 w-7 h-7 fill-rose-500 text-rose-500 pointer-events-none"
            style={{ '--dx': `${h.dx}px` } as React.CSSProperties}
          />
        ))}

        {/* Bas : commentaires, article présenté, écrire */}
        <div className="absolute inset-x-0 bottom-0 p-3 pr-16 space-y-2">
          <ul
            className="space-y-1 max-h-48 overflow-hidden flex flex-col justify-end"
            aria-live="polite"
            data-testid="mp-live-comments"
          >
            {comments.slice(-7).map(c => (
              <li key={c.id} className={`text-sm leading-snug ${c.system ? 'text-amber-200 italic' : ''}`}>
                {!c.system && (
                  <strong className="mr-1.5">
                    {c.name}
                    {c.seller && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] uppercase tracking-wide">
                        Vendeuse
                      </span>
                    )}
                  </strong>
                )}
                <span className="drop-shadow">{c.text}</span>
              </li>
            ))}
          </ul>
          {pinned && (
            <div
              className="flex items-center gap-3 rounded-2xl bg-white text-ink p-2 pr-3"
              data-testid="mp-live-pinned"
            >
              <img src={pinned.photos[0]} alt="" className="w-14 h-14 rounded-xl object-cover bg-ivory" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide font-bold text-red-600">Présenté maintenant</p>
                <p className="text-sm font-semibold truncate">{pinned.title}</p>
                <p className="text-sm">
                  <PriceLine p={pinned} />
                </p>
              </div>
              <button
                onClick={() => buy(pinned)}
                disabled={pinned.soldOut}
                className="h-10 px-4 rounded-full text-white text-sm font-bold shrink-0 disabled:opacity-50"
                style={{ background: color }}
                data-testid="mp-live-buy"
              >
                {pinned.soldOut ? 'Épuisé' : pinned.price === null && !pinned.livePrice ? 'Offre' : 'Acheter'}
              </button>
            </div>
          )}
          <form onSubmit={send} className="flex items-center gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onFocus={() => status !== 'user' && login()}
              maxLength={200}
              disabled={ended}
              placeholder={ended ? 'Live terminé' : 'Écrire un commentaire…'}
              aria-label="Écrire un commentaire"
              className="flex-1 h-11 px-4 rounded-full bg-white/15 placeholder-white/70 outline-none focus:bg-white/25"
              data-testid="mp-live-input"
            />
            <button
              aria-label="Envoyer"
              disabled={ended}
              className="w-11 h-11 rounded-full bg-white/15 grid place-items-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
        {count > 0 && (
          <Link
            to={mpPath('/panier')}
            className="absolute right-3 top-36 h-10 px-4 rounded-full bg-white text-ink text-sm font-bold inline-flex items-center gap-2"
            data-testid="mp-live-cart"
          >
            <ShoppingBag className="w-4 h-4" /> Commander ({count})
          </Link>
        )}
        {message && (
          <p
            className="absolute left-3 right-3 top-48 rounded-2xl bg-white text-ink text-sm px-4 py-3 shadow-lg"
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
              className="w-full max-h-[75%] overflow-y-auto rounded-t-3xl bg-white text-ink p-4"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-label="Articles du live"
              data-testid="mp-live-sheet"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl">Articles du live</h2>
                <button onClick={() => setSheet(false)} aria-label="Fermer" className="w-9 h-9 grid place-items-center">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ul className="mt-3 space-y-3">
                {live.products.map(p => (
                  <li key={p.id} className="flex gap-3" data-testid="mp-live-product">
                    <img src={p.photos[0]} alt="" className="w-20 h-20 rounded-xl object-cover bg-ivory" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {p.id === live.pinned && <span className="mr-1 text-red-600">●</span>}
                        {p.title}
                      </p>
                      <p className="text-sm">
                        <PriceLine p={p} />
                      </p>
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
                        style={{ background: color }}
                        data-testid="mp-live-add"
                      >
                        {p.soldOut
                          ? 'Épuisé'
                          : p.price === null && !p.livePrice
                            ? 'Faire une offre'
                            : 'Ajouter au panier'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-ink/60">
                Paiement à la livraison. Les prix live valent pendant le live et 15 minutes après.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
