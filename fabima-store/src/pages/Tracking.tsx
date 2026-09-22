import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { DeliveryInfo, Order } from '../data/types';
import { formatDate, formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { OrderTimeline, PAYMENT_LABELS } from '../components/OrderTimeline';
import { lookupOrder } from '../services/api';

const LiveTracking = lazy(() => import('../components/LiveTracking'));

export const Tracking: React.FC = () => {
  usePageTitle('Suivi de commande');
  const { findOrder } = useStore();
  const [params, setParams] = useSearchParams();
  const [id, setId] = useState(params.get('commande') ?? '');
  const [phone, setPhone] = useState(params.get('tel') ?? '');
  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<DeliveryInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const query = useRef<{ id: string; phone: string } | null>(null);

  /** Le serveur d'abord (statut à jour + livreur en direct), sinon la commande gardée sur ce téléphone. */
  const load = async (q: { id: string; phone: string }, polling = false) => {
    const remote = await lookupOrder(q.id, q.phone);
    if (query.current !== q) return;
    if (remote) {
      setOrder(remote.order);
      setDelivery(remote.delivery);
      setNotFound(false);
      return;
    }
    if (polling) return; // coupure passagère : on garde l'affichage
    const local = findOrder(q.id, q.phone) ?? null;
    setOrder(local);
    setNotFound(!local);
  };

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = { id: id.trim().toUpperCase(), phone: phone.trim() };
    query.current = q;
    setLoading(true);
    setDelivery(null);
    await load(q);
    setLoading(false);
    if (e) setParams({ commande: q.id, tel: q.phone }, { replace: true });
  };

  useEffect(() => {
    if (params.get('commande') && params.get('tel')) search();
  }, []);

  // Actualisation : toutes les 5 s quand le livreur roule, sinon toutes les 30 s
  const live = delivery?.state === 'en_route';
  const done = order?.status === 'livree' || order?.status === 'annulee';
  useEffect(() => {
    if (!order || done) return;
    const t = setInterval(() => { if (query.current && document.visibilityState === 'visible') load(query.current, true); }, live ? 5000 : 30000);
    return () => clearInterval(t);
  }, [order?.id, live, done]);

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-16">
      <div className="text-center">
        <p className="eyebrow">Service client</p>
        <h1 className="font-display text-5xl sm:text-6xl mt-4">Suivre une commande</h1>
        <p className="text-ink/60 mt-4 max-w-md mx-auto">Saisissez votre numéro de commande (ex : FB-A1B2C3) et le téléphone utilisé lors de l'achat.</p>
      </div>

      <form onSubmit={search} className="mt-12 grid sm:grid-cols-[1fr_1fr_auto] gap-2">
        <input value={id} onChange={e => setId(e.target.value)} placeholder="N° de commande" aria-label="Numéro de commande" required className="field uppercase" />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone" type="tel" aria-label="Téléphone" required className="field" />
        <button className="btn-dark !h-12" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechercher'}</button>
      </form>

      {notFound && <p className="mt-8 text-center text-sm text-wine">Aucune commande ne correspond. Vérifiez vos informations ou écrivez-nous sur WhatsApp.</p>}

      {order && (
        <div className="mt-10 space-y-6 animate-fade-up">
          {live && (
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-wine">
              <span className="w-2.5 h-2.5 rounded-full bg-wine animate-pulse" /> Votre commande est en route — suivez votre livreur en direct
            </p>
          )}
          {(order.customer.location || delivery) && !done && (
            <Suspense fallback={<div className="h-80 rounded-[1.5rem] bg-blush/30 animate-pulse" />}>
              <LiveTracking location={order.customer.location} delivery={delivery} />
            </Suspense>
          )}
          <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-7 sm:p-10">
            <div className="flex flex-wrap justify-between gap-6 pb-8 border-b border-ink/10">
              <div><p className="field-label">Commande</p><p className="font-display text-4xl">{order.id}</p><p className="text-xs text-ink/50 mt-1">{formatDate(order.createdAt)}</p></div>
              <div className="sm:text-right"><p className="field-label">Total</p><p className="font-display text-3xl">{formatPrice(order.total)}</p>
                <p className="text-xs mt-1">{PAYMENT_LABELS[order.paymentMethod]} · <span className={order.paymentStatus === 'paye' ? 'text-emerald-800' : 'text-amber-800'}>{order.paymentStatus === 'paye' ? 'Payé' : 'À régler'}</span></p></div>
            </div>
            <div className="pt-8"><OrderTimeline order={order} /></div>
            <p className="text-sm text-ink/60 border-t border-ink/10 pt-6">
              {order.items.reduce((s, i) => s + i.quantity, 0)} pièce(s) · Livraison : {order.customer.location?.label || order.customer.zone}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
