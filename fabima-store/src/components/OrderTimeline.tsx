import React from 'react';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';
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
    return <p className="flex items-center gap-2 text-[#a3142b] font-medium"><XCircle className="w-5 h-5" /> Cette commande a été annulée.</p>;
  }
  const currentIdx = FLOW.indexOf(order.status);
  return (
    <ol className="relative space-y-6">
      {FLOW.map((s, i) => {
        const done = i <= currentIdx;
        const entry = order.history.find(h => h.status === s);
        return (
          <li key={s} className="flex gap-4 relative">
            {i < FLOW.length - 1 && <span className={`absolute left-[11px] top-7 w-0.5 h-6 ${i < currentIdx ? 'bg-gold' : 'bg-ink/10'}`} />}
            {done ? <CheckCircle2 className="w-6 h-6 text-gold shrink-0" /> : <Circle className="w-6 h-6 text-ink/20 shrink-0" />}
            <div>
              <p className={done ? 'font-semibold' : 'text-ink/40'}>{STATUS_LABELS[s]}</p>
              {entry && <p className="text-xs text-ink/50">{formatDate(entry.date)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
