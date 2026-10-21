import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Package, Phone, Users } from 'lucide-react';
import { cancelMyOrder, fetchMyOrders, type MpOrder } from './api';
import { MP, mpPath } from './config';
import { F, STATUS_LABELS, STATUS_STYLES, ago } from './format';
import { useAccount } from '../context/AccountContext';
import { usePageTitle } from '../utils/usePageTitle';
import { AfterSale, DriverTracking } from './AfterSale';
import { recall, remember } from './offline';

const STEPS: MpOrder['status'][] = ['nouvelle', 'acceptee', 'prete', 'en_livraison', 'livree'];

export default function MpOrders() {
  usePageTitle(`Mes commandes · ${MP.name}`);
  const { status } = useAccount();
  const [orders, setOrders] = useState<MpOrder[] | null>(null);
  const [offlineAt, setOfflineAt] = useState<number | null>(null);
  // Sans réseau : les commandes (et les codes de remise) enregistrées sur ce téléphone restent visibles
  const load = () =>
    fetchMyOrders().then(r => {
      if (r.ok) {
        remember('commandes', r.data.orders);
        setOfflineAt(null);
        return setOrders(r.data.orders);
      }
      const saved = r.status === 0 ? recall<MpOrder[]>('commandes') : null;
      setOfflineAt(saved?.at ?? null);
      setOrders(saved?.data ?? []);
    });
  useEffect(() => {
    if (status === 'user') load();
  }, [status]);

  if (status !== 'user')
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Package className="w-12 h-12 mx-auto text-ink/30" strokeWidth={1.3} />
        <p className="font-display text-3xl mt-4">Vos commandes</p>
        <p className="text-sm text-ink/70 mt-2">Connectez-vous avec votre numéro pour les retrouver.</p>
        <Link
          to={mpPath(`/compte?retour=${encodeURIComponent(mpPath('/commandes'))}`)}
          className="btn-dark mt-6 inline-flex !h-12 !px-6"
        >
          Me connecter
        </Link>
      </div>
    );
  if (!orders)
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  return (
    <div className="max-w-3xl mx-auto px-4 pt-5 space-y-4" data-testid="mp-orders">
      <h1 className="font-display text-3xl">Mes commandes</h1>
      {offlineAt && (
        <p className="rounded-2xl bg-amber-50 text-amber-950 p-3 text-sm" data-testid="mp-orders-offline">
          Pas de réseau : voici vos commandes enregistrées sur ce téléphone ({ago(new Date(offlineAt).toISOString())}).
          Votre code de remise est aussi dans vos SMS.
        </p>
      )}
      {!orders.length && <p className="text-ink/70">Aucune commande pour le moment.</p>}
      {orders.map(o => {
        const step = STEPS.indexOf(o.status);
        return (
          <article key={o.id} className="bg-white rounded-2xl border border-ink/[0.06] p-4" data-testid="mp-order">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {o.shopName} <span className="text-ink/50 font-normal text-sm">· {o.id}</span>
              </p>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[o.status]}`}>
                {STATUS_LABELS[o.status]}
              </span>
            </div>
            {step >= 0 && (
              <div className="mt-3 grid grid-cols-5 gap-1" aria-hidden>
                {STEPS.map((s, i) => (
                  <span key={s} className={`h-1.5 rounded-full ${i <= step ? 'bg-emerald-600' : 'bg-ink/10'}`} />
                ))}
              </div>
            )}
            <ul className="mt-3 text-sm space-y-1">
              {o.lines.map(l => (
                <li key={`${l.listingId}-${l.variant}`} className="flex justify-between gap-3">
                  <span>
                    {l.qty} × {l.title}
                    {l.variant && ` (${l.variant})`}
                  </span>
                  <span>{F(l.price * l.qty)}</span>
                </li>
              ))}
              <li className="flex justify-between text-ink/70">
                <span>
                  Livraison
                  {o.delivery.mode === 'partagee' ? ' moitié-moitié' : o.delivery.mode === 'express' ? ' express' : ''}
                </span>
                <span>
                  {(o.delivery.share ?? o.delivery.fee) < o.delivery.fee && (
                    <s className="text-ink/45 mr-1.5">{F(o.delivery.fee)}</s>
                  )}
                  <span data-testid="mp-order-share">{F(o.delivery.share ?? o.delivery.fee)}</span>
                </span>
              </li>
              <li className="flex justify-between text-ink/70">
                <span>Frais de service</span>
                <span>{F(o.buyerFee)}</span>
              </li>
              <li className="flex justify-between font-bold">
                <span>Total à la livraison</span>
                <span>{F(o.total)}</span>
              </li>
            </ul>
            {o.reason && <p className="mt-2 text-sm text-wine">Raison : {o.reason}</p>}
            {o.handoverCode && (
              <p
                className="mt-2 rounded-xl bg-ivory px-3 py-2 text-sm flex flex-wrap items-center gap-x-3"
                data-testid="mp-handover-code"
              >
                <span>
                  Code de remise : <strong className="text-xl tracking-[0.3em]">{o.handoverCode}</strong>
                </span>
                <span className="text-xs text-ink/65">
                  Donnez-le au livreur seulement quand vous avez votre colis en main. Sans ce code, la commande ne peut
                  pas être marquée « livrée ».
                </span>
              </p>
            )}
            {o.status === 'retour' && (
              <p className="mt-2 text-sm text-orange-900">
                Le livreur n'a pas pu vous remettre le colis : il retourne chez le vendeur. Après deux livraisons
                ratées, il faut passer par le service client pour commander à nouveau.
              </p>
            )}
            {o.trip && !['livree', 'annulee', 'refusee'].includes(o.status) && (
              <p
                className="mt-2 text-sm bg-emerald-50 text-emerald-900 rounded-xl px-3 py-2"
                data-testid="mp-order-trip"
              >
                {o.trip.driver
                  ? `🛵 ${o.trip.driver.name} livre votre commande.`
                  : o.trip.status === 'ouverte'
                    ? `Moitié-moitié : ${o.trip.members > 1 ? `vous partagez le livreur avec ${o.trip.members - 1} autre(s) commande(s)` : "en attente d'autres commandes dans votre direction"} jusqu'à ${o.trip.deadline ? new Date(o.trip.deadline).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'bientôt'}. Le prix ne peut que baisser.`
                    : 'Un livreur va être choisi dès que le colis est prêt.'}
                {o.trip.mode === 'partagee' && o.trip.status === 'ouverte' && !o.trip.driver && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `On partage le livreur ? Commande sur ${MP.name} en livraison « moitié-moitié »${o.trip.deadline ? ` avant ${new Date(o.trip.deadline).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''} : plus on est nombreuses dans la même direction, moins chacune paie. ${location.origin}${mpPath()}`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex w-fit items-center gap-1.5 h-9 px-3 rounded-full bg-emerald-700 text-white text-xs font-semibold"
                    data-testid="mp-order-invite"
                  >
                    <Users className="w-3.5 h-3.5" /> Inviter mes voisines : la livraison baisse pour tout le monde
                  </a>
                )}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink/60">
              <span>Commandée {ago(o.createdAt)}</span>
              {o.trip?.driver && !['livree', 'annulee', 'refusee'].includes(o.status) && (
                <a
                  href={`tel:${o.trip.driver.phone}`}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-ink/15 text-ink font-semibold"
                >
                  <Phone className="w-3.5 h-3.5" /> Appeler le livreur
                </a>
              )}
              {o.sellerPhone && (
                <a
                  href={`tel:${o.sellerPhone}`}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-ink/15 text-ink font-semibold"
                >
                  <Phone className="w-3.5 h-3.5" /> Appeler le vendeur
                </a>
              )}
              {o.status === 'nouvelle' && (
                <button
                  onClick={async () => {
                    if (!window.confirm('Annuler cette commande ?')) return;
                    const r = await cancelMyOrder(o.id);
                    if (r.ok) load();
                  }}
                  className="h-9 px-3 rounded-full border border-wine/30 text-wine font-semibold"
                >
                  Annuler
                </button>
              )}
            </div>
            {o.trip?.driver && ['prete', 'en_livraison'].includes(o.status) && <DriverTracking order={o} />}
            <AfterSale
              order={o}
              onChange={patch => setOrders(list => (list ?? []).map(x => (x.id === o.id ? { ...x, ...patch } : x)))}
            />
          </article>
        );
      })}
    </div>
  );
}
