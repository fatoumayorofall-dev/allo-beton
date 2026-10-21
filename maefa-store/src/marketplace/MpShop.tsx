import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, Bell, BellRing, Check, Link2, Loader2, MapPin, Search, Share2 } from 'lucide-react';
import { fetchFollows, fetchShop, followShop, type MpListing, type MpSeller, type PublicReview } from './api';
import { Stars } from '../components/Stars';
import { ListingCard } from './ListingCard';
import { MP, mpPath } from './config';
import { ACCENTS, shopLink } from './format';
import { usePageTitle } from '../utils/usePageTitle';
import { useAccount } from '../context/AccountContext';
import { StatusButton } from './StatusKit';

/**
 * La boutique en ligne d'un abonné : sa vitrine (bannière, logo, couleur), ses articles avec leurs prix,
 * sa recherche, ses avis, et son lien court à partager (WhatsApp, Instagram, flyers).
 */
export default function MpShop() {
  const { slug = '' } = useParams();
  const [data, setData] = useState<
    { seller: MpSeller; listings: MpListing[]; reviews: PublicReview[] } | null | 'absent'
  >(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [copied, setCopied] = useState(false);
  const { status } = useAccount();
  const navigate = useNavigate();
  // Suivre la boutique : la cliente est prévenue de ses nouveautés (elle revient d'elle-même)
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const s = data && data !== 'absent' ? data.seller : null;
  useEffect(() => setFollowers(s?.followers ?? 0), [s]);
  useEffect(() => {
    if (status !== 'user') return setFollowing(false);
    fetchFollows().then(r => r.ok && setFollowing(r.data.shops.includes(slug)));
  }, [status, slug]);
  const [followError, setFollowError] = useState('');
  const toggleFollow = async () => {
    if (status !== 'user') return navigate(mpPath(`/compte?retour=${encodeURIComponent(mpPath(`/boutique/${slug}`))}`));
    setFollowError('');
    const r = await followShop(slug, !following);
    if (!r.ok) return setFollowError(r.error);
    setFollowing(r.data.following);
    setFollowers(r.data.followers);
  };
  usePageTitle(s ? `${s.shopName} · ${MP.name}` : MP.name, s?.description.slice(0, 150));
  useEffect(() => {
    setData(null);
    setQ('');
    setCat('');
    fetchShop(slug).then(r => setData(r.ok ? r.data : 'absent'));
  }, [slug]);
  const listings = useMemo(() => (data && data !== 'absent' ? data.listings : []), [data]);
  const cats = useMemo(() => [...new Set(listings.map(l => l.category))], [listings]);
  const shown = useMemo(() => {
    const words = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
    return listings.filter(
      l =>
        (!cat || l.category === cat) &&
        words.every(w => `${l.title} ${l.description}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(w)),
    );
  }, [listings, q, cat]);

  if (data === null)
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  if (data === 'absent' || !s)
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="font-display text-3xl">Boutique introuvable</p>
        <Link to={mpPath()} className="btn-dark mt-6 inline-flex !h-12 !px-6">
          Voir les boutiques
        </Link>
      </div>
    );
  const color = ACCENTS[s.accent]?.hex ?? ACCENTS.prune.hex;
  const link = shopLink(s.slug);
  const share = async () => {
    if (navigator.share) await navigator.share({ title: s.shopName, url: link }).catch(() => {});
    else
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${s.shopName} : ma boutique en ligne\n${link}`)}`,
        '_blank',
        'noopener',
      );
  };
  const CATEGORY_NAMES: Record<string, string> = {
    mode: 'Mode & chaussures',
    sacs: 'Sacs & accessoires',
    beaute: 'Beauté',
    electronique: 'Électronique',
    maison: 'Maison',
    enfants: 'Enfants',
    epicerie: 'Épicerie',
    autres: 'Autres',
  };

  return (
    <div className="max-w-6xl mx-auto sm:px-4 sm:pt-5" data-testid="mp-shop">
      <section className="bg-white sm:rounded-3xl border-b sm:border border-ink/[0.06] overflow-hidden">
        <div className="relative h-36 sm:h-56" style={{ background: color }} data-testid="mp-shop-cover">
          {s.cover && <img src={s.cover} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="px-4 sm:px-7 pb-5 -mt-10 relative">
          <span
            className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden grid place-items-center font-display text-4xl text-white shadow-soft"
            style={{ background: color }}
          >
            {s.logo ? <img src={s.logo} alt="" className="w-full h-full object-cover bg-white" /> : s.shopName[0]}
          </span>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl flex items-center gap-2">
            {s.shopName}
            {s.verified && <BadgeCheck className="w-6 h-6 text-emerald-700" aria-label="Boutique vérifiée" />}
            {s.featured && (
              <span
                className="px-2 py-0.5 rounded-full bg-gold text-ink text-[11px] font-sans font-bold uppercase tracking-wide"
                data-testid="mp-featured"
              >
                À la une
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-ink/65 flex flex-wrap items-center gap-x-3 gap-y-1">
            {s.zone && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {s.zone}
              </span>
            )}
            <span>
              Boutique en ligne depuis{' '}
              {new Date(s.since).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
            {!!s.sales && (
              <span>
                {s.sales} vente{s.sales > 1 ? 's' : ''} livrée{s.sales > 1 ? 's' : ''}
              </span>
            )}
            {!!s.rating?.count && (
              <span className="inline-flex items-center gap-1" data-testid="mp-shop-rating">
                <Stars rating={s.rating.average ?? 0} size={13} /> {s.rating.average?.toLocaleString('fr-FR')} (
                {s.rating.count} avis)
              </span>
            )}
          </p>
          {s.description && <p className="mt-3 text-[15px] text-ink/85 whitespace-pre-line">{s.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={toggleFollow}
              aria-pressed={following}
              className="h-11 px-5 rounded-full font-semibold text-sm inline-flex items-center gap-2 border"
              style={following ? { borderColor: color, color } : { background: '#1c1917', color: '#fff' }}
              data-testid="mp-shop-follow"
            >
              {following ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {following ? 'Abonnée' : 'Suivre'}
              {followers > 0 && <span className="opacity-70">· {followers}</span>}
            </button>
            <button
              onClick={share}
              className="h-11 px-5 rounded-full text-white font-semibold text-sm inline-flex items-center gap-2"
              style={{ background: color }}
              data-testid="mp-shop-share"
            >
              <Share2 className="w-4 h-4" /> Partager la boutique
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard?.writeText(link).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="h-11 px-4 rounded-full border border-ink/15 font-semibold text-sm inline-flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copied ? 'Lien copié' : link.replace(/^https?:\/\//, '')}
            </button>
            <StatusButton
              label="Statut WhatsApp"
              filename={`statut-${s.slug}.jpg`}
              testId="mp-shop-status"
              className="h-11 px-4 rounded-full border border-ink/15 font-semibold text-sm inline-flex items-center gap-2"
              make={() => ({
                photo: s.cover ?? listings[0]?.photos[0] ?? s.logo,
                title: s.shopName,
                line: 'Boutique en ligne',
                small: s.zone ? `${s.zone} · livraison partout` : 'Livraison partout au Sénégal',
                link,
                color,
              })}
            />
          </div>
          {followError && (
            <p className="mt-2 text-sm text-wine" role="alert">
              {followError}
            </p>
          )}
          {!following && (
            <p className="mt-2 text-xs text-ink/55">Suivez la boutique : vous êtes prévenue de ses nouveautés.</p>
          )}
        </div>
      </section>

      <div className="px-4 sm:px-0">
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <label className="flex-1 min-w-[12rem] flex items-center gap-2 h-11 px-4 rounded-full bg-white border border-ink/10 focus-within:border-ink">
            <Search className="w-4 h-4 text-ink/50" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={`Chercher chez ${s.shopName}…`}
              aria-label="Chercher dans la boutique"
              className="flex-1 bg-transparent outline-none text-[15px]"
              data-testid="mp-shop-search"
            />
          </label>
        </div>
        {cats.length > 1 && (
          <div
            className="mt-3 flex gap-2 overflow-x-auto no-scrollbar"
            role="tablist"
            aria-label="Rayons de la boutique"
          >
            {['', ...cats].map(c => (
              <button
                key={c}
                role="tab"
                aria-selected={cat === c}
                onClick={() => setCat(c)}
                className="shrink-0 h-9 px-4 rounded-full text-sm border"
                style={cat === c ? { background: color, color: '#fff', borderColor: color } : undefined}
              >
                {c ? (CATEGORY_NAMES[c] ?? c) : 'Tout'}
              </button>
            ))}
          </div>
        )}
        <h2 className="mt-6 font-display text-2xl">
          {shown.length} article{shown.length > 1 ? 's' : ''}
        </h2>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" data-testid="mp-shop-grid">
          {shown.map(l => (
            <ListingCard key={l.id} listing={{ ...l, seller: s }} showSeller={false} />
          ))}
        </div>
        {data.reviews.length > 0 && (
          <section className="mt-10" data-testid="mp-shop-reviews">
            <h2 className="font-display text-2xl">Avis des clientes</h2>
            <p className="text-xs text-ink/60 mt-1">
              Avis vérifiés : seules les clientes qui ont reçu leur commande peuvent noter.
            </p>
            <ul className="mt-3 space-y-3">
              {data.reviews.map((r, i) => (
                <li key={i} className="bg-white rounded-2xl border border-ink/[0.06] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm">{r.name}</strong>
                    <Stars rating={r.stars} size={12} />
                  </div>
                  {r.text && <p className="mt-1 text-[15px]">{r.text}</p>}
                  <p className="text-[11px] text-ink/55 mt-1">{new Date(r.at).toLocaleDateString('fr-FR')}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-10 text-center text-xs text-ink/50">
          Boutique en ligne hébergée par{' '}
          <Link to={mpPath()} className="underline">
            {MP.name}
          </Link>{' '}
          · paiement à la livraison
        </p>
      </div>
    </div>
  );
}
