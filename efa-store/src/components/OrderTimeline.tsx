import React from 'react';
import { Check, XCircle } from 'lucide-react';
import type { Order, OrderStatus } from '../data/types';
import { formatDate } from '../utils/format';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente: 'Commande reçue',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  expediee: 'En cours de livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

export const PAYMENT_LABELS: Record<Order['paymentMethod'], string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  card: 'Carte bancaire',
  cash: 'Paiement à la livraison',
};

const FLOW: OrderStatus[] = ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree'];

export const OrderTimeline: React.FC<{ order: Order }> = ({ order }) => {
  if (order.status === 'annulee') {
    return <p className="flex items-center gap-2 text-wine text-sm"><XCircle className="w-5 h-5" strokeWidth={1.5} /> Cette commande a été annulée.</p>;
  }
  const currentIdx = FLOW.indexOf(order.status);
  return (
    <ol className="space-y-0">
      {FLOW.map((s, i) => {
        const done = i <= currentIdx;
        const entry = [...order.history].reverse().find(h => h.status === s);
        return (
          <li key={s} className="flex gap-5">
            <div className="flex flex-col items-center">
              <span className={`w-7 h-7 rounded-full grid place-items-center border transition-colors ${done ? 'bg-ink border-ink text-gold-light' : 'border-ink/20'} ${i === currentIdx ? 'ring-4 ring-gold/20' : ''}`}>
                {done && <Check className="w-3.5 h-3.5" />}
              </span>
              {i < FLOW.length - 1 && <span className={`w-px flex-1 min-h-8 ${i < currentIdx ? 'bg-ink' : 'bg-ink/15'}`} />}
            </div>
            <div className="pb-7">
              <p className={`text-sm ${done ? 'font-semibold' : 'text-ink/70'}`}>{STATUS_LABELS[s]}</p>
              {entry && <p className="text-xs text-ink/70 mt-0.5">{formatDate(entry.date)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
