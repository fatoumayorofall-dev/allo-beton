import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-14">
      <div className="text-center">
        <PackageSearch className="w-12 h-12 mx-auto text-gold-dark" strokeWidth={1.4} />
        <h1 className="font-display text-4xl sm:text-5xl mt-4">Suivre ma commande</h1>
        <p className="text-ink/60 mt-3">Saisissez votre numéro de commande (ex : FB-A1B2C3) et le téléphone utilisé lors de l'achat.</p>
      </div>

      <form onSubmit={search} className="mt-10 bg-white rounded-3xl p-6 sm:p-8 grid sm:grid-cols-[1fr_1fr_auto] gap-3">
        <input value={id} onChange={e => setId(e.target.value)} placeholder="N° de commande" aria-label="Numéro de commande" required
          className="px-4 py-3 rounded-xl border border-ink/15 outline-none focus:border-ink uppercase" />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone" type="tel" aria-label="Téléphone" required
          className="px-4 py-3 rounded-xl border border-ink/15 outline-none focus:border-ink" />
        <button className="px-6 py-3 rounded-xl bg-ink text-ivory font-semibold">Rechercher</button>
      </form>

      {notFound && <p className="mt-6 text-center text-[#a3142b]">Aucune commande ne correspond. Vérifiez vos informations ou contactez-nous sur WhatsApp.</p>}

      {order && (
        <div className="mt-8 bg-white rounded-3xl p-6 sm:p-8 animate-fade-up">
          <div className="flex flex-wrap justify-between gap-4 pb-6 border-b border-ink/10">
            <div><p className="text-xs text-ink/50">Commande</p><p className="font-display text-2xl">{order.id}</p><p className="text-xs text-ink/50">{formatDate(order.createdAt)}</p></div>
            <div className="text-right"><p className="text-xs text-ink/50">Total</p><p className="font-semibold text-lg">{formatPrice(order.total)}</p>
              <p className="text-xs">{PAYMENT_LABELS[order.paymentMethod]} · <span className={order.paymentStatus === 'paye' ? 'text-emerald-700' : 'text-amber-700'}>{order.paymentStatus === 'paye' ? 'Payé' : 'À payer'}</span></p></div>
          </div>
          <div className="pt-6"><OrderTimeline order={order} /></div>
          <p className="mt-6 text-sm text-ink/60">{order.items.reduce((s, i) => s + i.quantity, 0)} article(s) · Livraison : {order.customer.zone}</p>
        </div>
      )}
    </div>
  );
};
