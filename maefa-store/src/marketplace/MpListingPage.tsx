import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  ChevronLeft,
  Heart,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { fetchChats, fetchListing, openChat, type Deal, type MpListing } from './api';
import { useMpCart } from './cart';
import { ListingCard } from './ListingCard';
import { MP, mpPath } from './config';
import { ACCENTS, F, listingLink, priceText } from './format';
import { StatusButton } from './StatusKit';
import { useAccount } from '../context/AccountContext';
import { isLiked, note } from './taste';
import { usePageTitle } from '../utils/usePageTitle';

export default function MpListingPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { add } = useMpCart();
  const [data, setData] = useState<{ listing: MpListing; more: MpListing[] } | null | 'absent'>(null);
  const [photo, setPhoto] = useState(0);
  const [variant, setVariant] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  // Prix convenu avec le vendeur pour cet article (marchandage dans la messagerie)
  const [deal, setDeal] = useState<Deal | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const { status } = useAccount();
  const l = data && data !== 'absent' ? data.listing : null;
  usePageTitle(l ? `${l.title} · ${MP.name}` : MP.name, l?.description.slice(0, 150));

  useEffect(() => {
    setData(null);
    setPhoto(0);
    setVariant(null);
    setQty(1);
    setAdded(false);
    setLiked(isLiked(id));
    fetchListing(id).then(r => setData(r.ok ? r.data : 'absent'));
  }, [id]);
  useEffect(() => {
    setDeal(null);
    if (status !== 'user') return;
    fetchChats().then(r => r.ok && setDeal(r.data.chats.find(c => c.listing?.id === id)?.deal ?? null));
  }, [id, status]);

  // Goûts : vue à l'ouverture, « regardé » après 5 secondes sur la fiche
  const listingForTaste = data && data !== 'absent' ? data.listing : null;
  useEffect(() => {
    if (!listingForTaste) return;
    note(listingForTaste, 'view');
    const t = setTimeout(() => note(listingForTaste, 'dwell'), 5000);
    return () => clearTimeout(t);
  }, [listingForTaste]);

  if (data === null)
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  if (data === 'absent' || !l)
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="font-display text-3xl">Article introuvable</p>
        <p className="text-sm text-ink/70 mt-2">Il a peut-être été vendu ou retiré par le vendeur.</p>
        <Link to={mpPath()} className="btn-dark mt-6 inline-flex !h-12 !px-6">
          Voir les autres articles
        </Link>
      </div>
    );

  const put = (go: boolean) => {
    if (l.variants.length && !variant) return setError(`Choisissez : ${l.variantLabel}`);
    setError('');
    if (deal) add(l, 1, variant, deal.amount);
    else add(l, qty, variant);
    note(l, 'cart');
    setAdded(true);
    if (go) navigate(mpPath('/panier'));
  };

  // Discussion avec le vendeur (question ou offre de prix) : il faut être connecté
  const chat = async (offer: boolean) => {
    if (status !== 'user') return navigate(mpPath(`/compte?retour=${encodeURIComponent(mpPath(`/annonce/${l.id}`))}`));
    setChatBusy(true);
    const r = await openChat(l.id);
    setChatBusy(false);
    if (!r.ok) return setError(r.error);
    navigate(mpPath(`/discussions/${r.data.chat.id}${offer ? '?offre=1' : ''}`));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4" data-testid="mp-listing">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-ink/70 mb-3">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>
      <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
        <div>
          <div className="aspect-square rounded-3xl overflow-hidden bg-white border border-ink/[0.06]">
            {l.video && photo === -1 ? (
              <video
                src={l.video}
                poster={l.photos[0]}
                controls
                playsInline
                autoPlay
                muted
                loop
                className="w-full h-full object-contain bg-black"
                data-testid="mp-listing-video"
              />
            ) : (
              <img src={l.photos[Math.max(0, photo)]} alt={l.title} className="w-full h-full object-contain" />
            )}
          </div>
          {(l.photos.length > 1 || l.video) && (
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {l.video && (
                <button
                  onClick={() => setPhoto(-1)}
                  aria-label="Vidéo"
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 bg-black text-white grid place-items-center text-xs font-semibold ${photo === -1 ? 'border-ink' : 'border-transparent'}`}
                >
                  ▶ Vidéo
                </button>
              )}
              {l.photos.map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPhoto(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 ${i === photo ? 'border-ink' : 'border-transparent'}`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-ink/55 font-semibold">
            {l.condition === 'occasion' ? 'Occasion' : 'Neuf'}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl mt-1 leading-tight">{l.title}</h1>
          <div className="mt-3 flex items-center gap-3">
            <div>
              <p className="text-3xl font-bold" data-testid="mp-price">
                {deal ? F(deal.amount) : priceText(l)}
              </p>
              {deal ? (
                <p className="text-sm font-semibold text-emerald-800" data-testid="mp-deal">
                  Prix convenu avec le vendeur · valable jusqu'au{' '}
                  {new Date(deal.until).toLocaleString('fr-FR', {
                    weekday: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : (
                l.negotiable && (
                  <p className="text-sm font-semibold text-emerald-800">
                    Prix à négocier : faites une offre au vendeur
                  </p>
                )
              )}
            </div>
            <button
              onClick={() => {
                note(l, liked ? 'unlike' : 'like');
                setLiked(!liked);
              }}
              aria-pressed={liked}
              aria-label={liked ? 'Je n’aime plus' : 'J’aime'}
              className="ml-auto w-11 h-11 rounded-full border border-ink/15 grid place-items-center"
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-wine text-wine' : ''}`} />
            </button>
            <button
              onClick={async () => {
                note(l, 'share');
                const url = location.href;
                if (navigator.share) await navigator.share({ title: l.title, url }).catch(() => {});
                else
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(`${l.title} · ${priceText(l)}\n${url}`)}`,
                    '_blank',
                    'noopener',
                  );
              }}
              aria-label="Partager"
              className="w-11 h-11 rounded-full border border-ink/15 grid place-items-center"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <StatusButton
              label=""
              ariaLabel="Image pour un statut WhatsApp"
              filename={`statut-${l.id}.jpg`}
              testId="mp-listing-status"
              className="w-11 h-11 rounded-full border border-ink/15 grid place-items-center"
              make={() => {
                note(l, 'share');
                return {
                  photo: l.photos[0] ?? null,
                  title: l.title,
                  line: l.price === null ? 'Prix à négocier : faites votre offre' : F(l.price),
                  small: l.seller ? `chez ${l.seller.shopName}` : '',
                  link: listingLink(l.id),
                  color: ACCENTS[l.seller?.accent ?? 'prune']?.hex ?? ACCENTS.prune.hex,
                };
              }}
            />
          </div>

          {l.variants.length > 0 && (
            <div className="mt-5">
              <p className="field-label">{l.variantLabel}</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={l.variantLabel ?? 'Choix'}>
                {l.variants.map(v => (
                  <button
                    key={v}
                    role="radio"
                    aria-checked={variant === v}
                    onClick={() => {
                      setVariant(v);
                      setError('');
                    }}
                    className={`min-w-12 h-11 px-4 rounded-xl border text-sm font-semibold ${variant === v ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/15'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`mt-5 flex items-center gap-3 ${deal ? 'hidden' : ''}`}>
            <span className="field-label !mb-0">Quantité</span>
            <div className="inline-flex items-center rounded-full border border-ink/15 bg-white">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-10 h-10 grid place-items-center"
                aria-label="Moins"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-semibold" aria-live="polite">
                {qty}
              </span>
              <button
                onClick={() => setQty(q => Math.min(20, q + 1))}
                className="w-10 h-10 grid place-items-center"
                aria-label="Plus"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-wine" role="alert">
              {error}
            </p>
          )}
          {l.soldOut ? (
            <p className="mt-6 h-14 rounded-full bg-ink/5 grid place-items-center font-semibold">Épuisé</p>
          ) : l.negotiable && !deal ? (
            <button
              disabled={chatBusy}
              onClick={() => chat(true)}
              className="btn-dark w-full !h-14 mt-6"
              data-testid="mp-make-offer"
            >
              <MessageCircle className="w-4 h-4" /> Faire une offre au vendeur
            </button>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => put(false)} className="btn-outline !h-14" data-testid="mp-add">
                <ShoppingBag className="w-4 h-4" /> {added ? 'Ajouté ✓' : 'Au panier'}
              </button>
              <button onClick={() => put(true)} className="btn-dark !h-14" data-testid="mp-buy">
                Commander
              </button>
            </div>
          )}

          {!l.soldOut && (
            <button
              disabled={chatBusy}
              onClick={() => chat(false)}
              className="mt-3 w-full h-12 rounded-full border border-ink/15 font-semibold text-sm inline-flex items-center justify-center gap-2"
              data-testid="mp-ask-seller"
            >
              <MessageCircle className="w-4 h-4" />{' '}
              {l.negotiable ? 'Poser une question' : 'Écrire au vendeur ou négocier'}
            </button>
          )}
          <ul className="mt-6 space-y-2 text-sm text-ink/80">
            <li className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gold-dark" /> Livraison calculée selon la distance, payée à la réception
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gold-dark" /> Vous payez quand vous recevez l'article ; un problème ?
              Signalez-le sous 72 h, l'équipe s'en occupe
            </li>
          </ul>

          {l.description && (
            <div className="mt-6">
              <h2 className="font-semibold">Description</h2>
              <p className="mt-2 text-[15px] text-ink/85 whitespace-pre-line leading-relaxed">{l.description}</p>
            </div>
          )}

          {l.seller && (
            <Link
              to={mpPath(`/boutique/${l.seller.slug}`)}
              className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-white border border-ink/[0.07]"
              data-testid="mp-seller-card"
            >
              <span className="w-12 h-12 rounded-full bg-ivory overflow-hidden grid place-items-center font-display text-xl">
                {l.seller.logo ? (
                  <img src={l.seller.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  l.seller.shopName[0]
                )}
              </span>
              <span className="min-w-0">
                <span className="font-semibold flex items-center gap-1">
                  {l.seller.shopName}
                  {l.seller.verified && (
                    <BadgeCheck className="w-4 h-4 text-emerald-700" aria-label="Vendeur vérifié" />
                  )}
                </span>
                <span className="text-xs text-ink/60">
                  {l.seller.rating?.count
                    ? `★ ${l.seller.rating.average?.toLocaleString('fr-FR')} (${l.seller.rating.count} avis) · `
                    : ''}
                  {l.seller.zone || 'Sénégal'} · Voir la boutique
                </span>
              </span>
            </Link>
          )}
        </div>
      </div>

      {data.more.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl">Du même vendeur</h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.more.slice(0, 4).map(m => (
              <ListingCard key={m.id} listing={{ ...m, seller: l.seller }} showSeller={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
