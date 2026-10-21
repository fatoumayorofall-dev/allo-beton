import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Heart, Loader2, Share2, ShoppingBag, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { fetchFeed, type FeedItem } from './api';
import { MP, mpPath } from './config';
import { getSeen, getTaste, isLiked, note } from './taste';
import { useAccount } from '../context/AccountContext';
import { visitorId } from '../utils/track';
import { usePageTitle } from '../utils/usePageTitle';

const PER = 8;

/** Un article du fil : vidéo (lecture seule quand il est à l'écran) ou ses photos qui défilent. */
const Slide: React.FC<{ item: FeedItem; muted: boolean; onToggleSound: () => void }> = ({
  item,
  muted,
  onToggleSound,
}) => {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [photo, setPhoto] = useState(0);
  const [liked, setLiked] = useState(() => isLiked(item.id));
  const [likes, setLikes] = useState(item.likes);

  // À l'écran (60 % au moins) : lecture et comptage ; en sortant : « regardé » ou « passé »
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let since = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          if (!since) {
            since = Date.now();
            note(item, 'view');
          }
          setActive(true);
        } else if (since) {
          const ms = Date.now() - since;
          since = 0;
          if (ms >= 5000) note(item, 'dwell');
          else if (ms < 2000) note(item, 'skip');
          setActive(false);
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [item]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [active]);

  // Sans vidéo : les photos défilent doucement
  useEffect(() => {
    if (!active || item.video || item.photos.length < 2) return;
    const t = setInterval(() => setPhoto(p => (p + 1) % item.photos.length), 2600);
    return () => clearInterval(t);
  }, [active, item]);

  const like = () => {
    note(item, liked ? 'unlike' : 'like');
    setLikes(n => Math.max(0, n + (liked ? -1 : 1)));
    setLiked(!liked);
  };
  const share = async () => {
    note(item, 'share');
    const url = `${location.origin}${mpPath(`/annonce/${item.id}`)}`;
    const text = `${item.title}${item.seller ? ` chez ${item.seller.shopName}` : ''} sur ${MP.name}`;
    if (navigator.share) await navigator.share({ title: item.title, text, url }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  };

  return (
    <section
      ref={ref}
      className="relative h-full w-full snap-start snap-always overflow-hidden bg-black"
      data-testid="mp-feed-item"
    >
      {/* Fond flouté (photos verticales ou carrées sur un écran de téléphone) */}
      <img
        src={item.photos[0]}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-50 scale-110"
      />
      {item.video ? (
        <video
          ref={videoRef}
          src={item.video}
          poster={item.photos[0]}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-contain"
          onClick={onToggleSound}
        />
      ) : (
        <img
          src={item.photos[photo]}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-500"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

      {/* Boutons à droite, comme sur TikTok */}
      <div className="absolute right-3 bottom-36 flex flex-col items-center gap-5 text-white">
        {item.seller && (
          <Link
            to={mpPath(`/boutique/${item.seller.slug}`)}
            aria-label={`Boutique ${item.seller.shopName}`}
            className="w-12 h-12 rounded-full bg-white text-ink grid place-items-center font-display text-xl overflow-hidden border-2 border-white"
          >
            {item.seller.logo ? (
              <img src={item.seller.logo} alt="" className="w-full h-full object-cover" />
            ) : (
              item.seller.shopName[0]
            )}
          </Link>
        )}
        <button
          onClick={like}
          aria-pressed={liked}
          aria-label={liked ? 'Je n’aime plus' : 'J’aime'}
          className="flex flex-col items-center gap-1 text-xs font-semibold"
          data-testid="mp-like"
        >
          <Heart className={`w-8 h-8 drop-shadow ${liked ? 'fill-wine text-wine' : ''}`} strokeWidth={1.8} />
          {likes}
        </button>
        <button
          onClick={share}
          aria-label="Partager"
          className="flex flex-col items-center gap-1 text-xs font-semibold"
        >
          <Share2 className="w-7 h-7 drop-shadow" strokeWidth={1.8} />
          Partager
        </button>
        {item.video && (
          <button onClick={onToggleSound} aria-label={muted ? 'Mettre le son' : 'Couper le son'}>
            {muted ? <VolumeX className="w-7 h-7 drop-shadow" /> : <Volume2 className="w-7 h-7 drop-shadow" />}
          </button>
        )}
      </div>

      {/* Infos et achat en bas */}
      <div className="absolute inset-x-0 bottom-0 p-4 pr-20 text-white">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[11px] font-semibold"
          data-testid="mp-why"
        >
          <Sparkles className="w-3 h-3" /> {item.why}
        </span>
        {item.seller && (
          <p className="mt-2 text-sm font-semibold flex items-center gap-1">
            {item.seller.shopName}
            {item.seller.verified && <BadgeCheck className="w-4 h-4 text-emerald-300" />}
            {item.seller.zone && <span className="font-normal text-white/75">· {item.seller.zone}</span>}
          </p>
        )}
        <h2 className="mt-1 text-lg leading-snug font-semibold line-clamp-2">{item.title}</h2>
        <div className="mt-3 flex items-center gap-3">
          {/* Pas de prix dans le fil : on ne compare pas les vendeurs, le prix se voit dans la boutique */}
          {item.seller && (
            <Link
              to={mpPath(`/boutique/${item.seller.slug}`)}
              className="inline-flex items-center gap-2 h-12 px-5 rounded-full border border-white/50 font-semibold text-sm"
            >
              Voir la boutique
            </Link>
          )}
          <Link
            to={mpPath(`/annonce/${item.id}`)}
            className="ml-auto inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-ink font-semibold text-sm"
            data-testid="mp-feed-buy"
          >
            <ShoppingBag className="w-4 h-4" /> Voir l'article
          </Link>
        </div>
      </div>
    </section>
  );
};

/**
 * Fil « Pour vous » façon TikTok : un article par écran, on fait glisser vers le haut.
 * L'ordre vient du serveur (goûts du téléphone + tendance + distance + sérieux du vendeur).
 */
export default function MpFeed() {
  usePageTitle(`Pour vous · ${MP.name}`);
  const { user } = useAccount();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(true);
  // Goûts et « déjà vus » figés à l'ouverture : les pages suivantes gardent le même ordre
  const ctx = useRef({ taste: getTaste(), seen: getSeen() });
  const lat = user?.location?.lat;
  const lng = user?.location?.lng;
  const near = useMemo(() => (lat !== undefined && lng !== undefined ? { lat, lng } : null), [lat, lng]);

  const loadMore = useCallback(async () => {
    if (loading || (total !== null && items.length >= total)) return;
    setLoading(true);
    const r = await fetchFeed({ v: visitorId(), ...ctx.current, near, page: page + 1, per: PER });
    setLoading(false);
    if (!r.ok) return setTotal(t => t ?? 0);
    setTotal(r.data.total);
    setPage(p => p + 1);
    setItems(list => [...list, ...r.data.items.filter(x => !list.some(y => y.id === x.id))]);
  }, [loading, total, items.length, page, near]);

  useEffect(() => {
    loadMore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Charge la suite quand on approche de la fin
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && loadMore(), { rootMargin: '200%' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (total === 0)
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="font-display text-3xl">Pas encore d'articles</p>
        <Link to={mpPath('/vendre')} className="btn-dark mt-6 inline-flex !h-12 !px-6">
          Publier le premier
        </Link>
      </div>
    );
  return (
    <div
      className="fixed inset-x-0 top-16 bottom-16 sm:bottom-0 overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar"
      data-testid="mp-feed"
    >
      {items.map(it => (
        <div key={it.id} className="h-full">
          <Slide item={it} muted={muted} onToggleSound={() => setMuted(m => !m)} />
        </div>
      ))}
      <div ref={sentinel} className="h-px" />
      {(loading || total === null) && (
        <div className="h-full grid place-items-center snap-start">
          <Loader2 className="w-7 h-7 animate-spin text-white/60" />
        </div>
      )}
      {total !== null && items.length >= total && items.length > 0 && (
        <div className="h-full grid place-items-center snap-start text-white text-center px-6">
          <div>
            <p className="font-display text-3xl">Vous avez tout vu !</p>
            <Link
              to={mpPath()}
              className="mt-5 inline-flex h-12 px-6 rounded-full bg-white text-ink font-semibold items-center"
            >
              Chercher un article
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
