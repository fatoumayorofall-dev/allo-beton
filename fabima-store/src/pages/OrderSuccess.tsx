import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Gift, MessageCircle, Printer } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { PAYMENT_LABELS } from '../components/OrderTimeline';
import { ProductImage } from '../components/ProductImage';
import { customerOrderSummaryLink } from '../utils/whatsappMessages';

export const OrderSuccess: React.FC = () => {
  usePageTitle('Commande confirmée');
  const { id = '' } = useParams();
  const { orders, logNotification } = useStore();
  const order = orders.find(o => o.id === id);

  if (!order) {
    return (
      <div className="max-w-xl mx-auto text-center py-40 px-5">
        <h1 className="font-display text-5xl">Commande introuvable</h1>
        <Link to="/suivi" className="btn-dark mt-10">Suivre une commande</Link>
      </div>
    );
  }

  const wa = customerOrderSummaryLink(order);
  const shopNotified = order.notifications?.some(n => n.to === 'gerante' && (n.channel === 'auto' || n.channel === 'manuel'));
  const customerNotified = order.notifications?.some(n => n.to === 'cliente' && n.channel === 'auto');

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-16">
      <div className="text-center">
        <span className="w-20 h-20 rounded-full bg-gradient-to-br from-blush to-gold-light grid place-items-center mx-auto animate-fade-up"><Check className="w-8 h-8 text-gold-dark" strokeWidth={1.3} /></span>
        <p className="eyebrow mt-8 animate-fade-up" style={{ animationDelay: '100ms' }}>Commande {order.id}</p>
        <h1 className="font-display text-5xl sm:text-7xl mt-4 animate-fade-up" style={{ animationDelay: '200ms' }}>Merci, <span className="font-script text-gold-dark text-[1.15em]">{order.customer.firstName}</span></h1>
        <p className="mt-5 text-ink/65 max-w-lg mx-auto animate-fade-up" style={{ animationDelay: '300ms' }}>
          Votre commande est entre de bonnes mains. Nous vous appelons très vite au <strong className="text-ink">{order.customer.phone}</strong> pour convenir de la livraison.
        </p>
      </div>

      <div className="mt-14 bg-white border border-ink/[0.06] rounded-[2rem] p-7 sm:p-10 animate-fade-up" style={{ animationDelay: '400ms' }}>
        <dl className="grid sm:grid-cols-3 gap-6 text-sm pb-8 border-b border-ink/10">
          <div><dt className="field-label">Livraison</dt><dd className="font-medium">{order.customer.zone}</dd><dd className="text-ink/60">{order.customer.address}</dd></div>
          <div><dt className="field-label">Paiement</dt><dd className="font-medium">{PAYMENT_LABELS[order.paymentMethod]}</dd>
            <dd className={order.paymentStatus === 'paye' ? 'text-emerald-800' : 'text-amber-800'}>{order.paymentStatus === 'paye' ? 'Payé' : 'À régler à la livraison'}</dd></div>
          <div><dt className="field-label">Total</dt><dd className="font-display text-4xl">{formatPrice(order.total)}</dd></div>
        </dl>
        <ul className="divide-y divide-ink/10">
          {order.items.map(i => (
            <li key={i.key} className="flex items-center gap-5 py-5">
              <ProductImage src={i.image} alt={i.name} label="" className="w-16 h-20 rounded-xl" />
              <div className="flex-1 text-sm"><p className="font-display text-xl">{i.name}</p><p className="text-ink/50">{[i.color, i.size && `T. ${i.size}`, `× ${i.quantity}`].filter(Boolean).join(' · ')}</p></div>
              <span className="text-sm">{formatPrice(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="text-sm space-y-2 pt-5 border-t border-ink/10">
          <div className="flex justify-between"><dt className="text-ink/65">Sous-total</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between text-emerald-800"><dt>Réduction {order.promoCode && `(${order.promoCode})`}</dt><dd>-{formatPrice(order.discount)}</dd></div>}
          {order.giftFee > 0 && <div className="flex justify-between"><dt className="text-ink/65">Emballage cadeau</dt><dd>{formatPrice(order.giftFee)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink/65">Livraison</dt><dd>{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Offerte'}</dd></div>
        </dl>
        {order.giftMessage && (
          <p className="mt-6 p-5 bg-ivory-deep/60 text-sm flex gap-3"><Gift className="w-4 h-4 text-gold-dark shrink-0 mt-0.5" strokeWidth={1.5} /><span className="font-display italic text-lg">« {order.giftMessage} »</span></p>
        )}
      </div>

      {/* WhatsApp : la boutique est-elle prévenue ? */}
      <div className={`mt-8 p-6 rounded-[2rem] border print:hidden ${shopNotified ? 'bg-emerald-50/70 border-emerald-100' : 'bg-white border-gold/30'}`}>
        {shopNotified ? (
          <p className="text-sm flex items-start gap-3"><MessageCircle className="w-5 h-5 text-[#1f8f4e] shrink-0" strokeWidth={1.5} />
            <span><strong>La boutique a bien reçu votre commande sur WhatsApp.</strong>{customerNotified ? ' Vous venez aussi de recevoir un message de confirmation ; nous vous écrirons à chaque étape.' : ' Nous vous tiendrons informée à chaque étape.'}</span></p>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="text-sm flex-1"><strong>Dernière étape (recommandée) :</strong> envoyez le récapitulatif sur WhatsApp, la boutique vous confirme la livraison plus vite.</p>
            <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => logNotification(order.id, { event: 'nouvelle', to: 'gerante', channel: 'manuel' })}
              className="btn !bg-[#1f8f4e] text-white hover:!bg-[#177a41] shrink-0"><MessageCircle className="w-4 h-4" strokeWidth={1.5} /> Envoyer sur WhatsApp</a>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center print:hidden">
        <Link to={`/suivi?commande=${order.id}&tel=${encodeURIComponent(order.customer.phone)}`} className="btn-dark">Suivre ma commande</Link>
        <button onClick={() => window.print()} className="btn-outline"><Printer className="w-4 h-4" strokeWidth={1.5} /> Imprimer</button>
      </div>
      <p className="text-center mt-10"><Link to="/boutique" className="text-[11px] uppercase tracking-[0.2em] link-luxe">Continuer mes achats</Link></p>
    </div>
  );
};
