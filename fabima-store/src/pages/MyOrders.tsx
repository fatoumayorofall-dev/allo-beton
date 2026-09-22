import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatDate, formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { STATUS_LABELS } from '../components/OrderTimeline';
import { ProductImage } from '../components/ProductImage';

/** Historique des commandes passées depuis cet appareil. */
export const MyOrders: React.FC = () => {
  usePageTitle('Mes commandes');
  const { orders, savedCustomer, saveCustomer, notify } = useStore();

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-14">
      <div className="text-center pb-10 border-b border-ink/10">
        <p className="eyebrow">Mon espace</p>
        <h1 className="font-display text-5xl sm:text-6xl mt-4">{savedCustomer ? <>Bonjour, <em>{savedCustomer.firstName}</em></> : 'Mes commandes'}</h1>
        <p className="text-sm text-ink/55 mt-4">Retrouvez les commandes passées depuis cet appareil.</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-24">
          <p className="font-display text-3xl">Aucune commande pour le moment</p>
          <p className="text-sm text-ink/60 mt-3">Une commande passée depuis un autre appareil ? <Link to="/suivi" className="link-luxe text-ink">Suivez-la ici</Link>.</p>
          <Link to="/boutique" className="btn-dark mt-10">Découvrir la boutique</Link>
        </div>
      ) : (
        <ul className="divide-y divide-ink/10">
          {orders.map(o => (
            <li key={o.id}>
              <Link to={`/suivi?commande=${o.id}&tel=${encodeURIComponent(o.customer.phone)}`} className="group flex flex-wrap items-center gap-5 py-7">
                <div className="flex -space-x-4">
                  {o.items.slice(0, 3).map(i => <ProductImage key={i.key} src={i.image} alt={i.name} label="" className="w-14 h-[72px] border-2 border-ivory" />)}
                </div>
                <div className="flex-1 min-w-[160px]">
                  <p className="font-display text-2xl">{o.id}</p>
                  <p className="text-xs text-ink/50">{formatDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} pièce(s)</p>
                </div>
                <span className={`text-[10px] uppercase tracking-[0.2em] font-semibold px-3 py-1.5 border ${o.status === 'annulee' ? 'border-wine/30 text-wine' : o.status === 'livree' ? 'border-emerald-700/30 text-emerald-800' : 'border-ink/20'}`}>{STATUS_LABELS[o.status]}</span>
                <span className="font-semibold w-28 text-right">{formatPrice(o.total)}</span>
                <ArrowRight className="w-4 h-4 text-ink/30 group-hover:text-ink group-hover:translate-x-1 transition-all" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {savedCustomer && (
        <div className="mt-12 p-6 border border-ink/10 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div>
            <p className="field-label">Coordonnées mémorisées</p>
            <p>{savedCustomer.firstName} {savedCustomer.lastName} · {savedCustomer.phone}</p>
            <p className="text-ink/55">{savedCustomer.address}, {savedCustomer.zone}</p>
          </div>
          <button onClick={() => { saveCustomer(null); notify('Coordonnées effacées de cet appareil', 'info'); }} className="text-[11px] uppercase tracking-[0.2em] link-luxe text-ink/60">Effacer</button>
        </div>
      )}
    </div>
  );
};
