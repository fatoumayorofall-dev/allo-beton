import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import type { Order } from '../data/types';
import { formatDate, formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { OrderTimeline, PAYMENT_LABELS } from '../components/OrderTimeline';

export const Tracking: React.FC = () => {
  usePageTitle('Suivi de commande');
  const { findOrder } = useStore();
  const [params] = useSearchParams();
  const [id, setId] = useState(params.get('commande') ?? '');
  const [phone, setPhone] = useState(params.get('tel') ?? '');
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  const search = (e?: React.FormEvent) => {
    e?.preventDefault();
    const found = findOrder(id, phone);
    setOrder(found ?? null);
    setNotFound(!found);
  };

  useEffect(() => {
    if (params.get('commande') && params.get('tel')) search();
  }, []);

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
        <button className="btn-dark !h-12">Rechercher</button>
      </form>

      {notFound && <p className="mt-8 text-center text-sm text-wine">Aucune commande ne correspond. Vérifiez vos informations ou écrivez-nous sur WhatsApp.</p>}

      {order && (
        <div className="mt-10 bg-white border border-ink/[0.06] p-7 sm:p-10 animate-fade-up">
          <div className="flex flex-wrap justify-between gap-6 pb-8 border-b border-ink/10">
            <div><p className="field-label">Commande</p><p className="font-display text-4xl">{order.id}</p><p className="text-xs text-ink/50 mt-1">{formatDate(order.createdAt)}</p></div>
            <div className="sm:text-right"><p className="field-label">Total</p><p className="font-display text-3xl">{formatPrice(order.total)}</p>
              <p className="text-xs mt-1">{PAYMENT_LABELS[order.paymentMethod]} · <span className={order.paymentStatus === 'paye' ? 'text-emerald-800' : 'text-amber-800'}>{order.paymentStatus === 'paye' ? 'Payé' : 'À régler'}</span></p></div>
          </div>
          <div className="pt-8"><OrderTimeline order={order} /></div>
          <p className="text-sm text-ink/60 border-t border-ink/10 pt-6">{order.items.reduce((s, i) => s + i.quantity, 0)} pièce(s) · Livraison : {order.customer.zone}</p>
        </div>
      )}
    </div>
  );
};
