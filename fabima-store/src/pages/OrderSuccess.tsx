import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, MessageCircle, Printer } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppLink } from '../config/site';
import { formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { PAYMENT_LABELS } from '../components/OrderTimeline';
import { ProductImage } from '../components/ProductImage';

export const OrderSuccess: React.FC = () => {
  usePageTitle('Commande confirmée');
  const { id = '' } = useParams();
  const { orders } = useStore();
  const order = orders.find(o => o.id === id);

  if (!order) {
    return (
      <div className="max-w-xl mx-auto text-center py-28 px-4">
        <h1 className="font-display text-4xl">Commande introuvable</h1>
        <Link to="/suivi" className="inline-block mt-8 px-6 py-3 rounded-full bg-ink text-ivory font-semibold">Suivre une commande</Link>
      </div>
    );
  }

  const wa = buildWhatsAppLink(`Bonjour Fabima Store, je viens de passer la commande *${order.id}* (${formatPrice(order.total)}). Merci de me la confirmer 🙏`);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-14">
      <div className="text-center animate-fade-up">
        <span className="w-20 h-20 rounded-full bg-emerald-50 grid place-items-center mx-auto"><CheckCircle2 className="w-11 h-11 text-emerald-600" /></span>
        <h1 className="font-display text-4xl sm:text-5xl mt-6">Merci {order.customer.firstName} !</h1>
        <p className="mt-3 text-ink/65">Votre commande <strong className="text-ink">{order.id}</strong> a bien été enregistrée. Nous vous appelons très vite au <strong className="text-ink">{order.customer.phone}</strong> pour confirmer la livraison.</p>
      </div>

      <div className="mt-10 bg-white rounded-3xl p-6 sm:p-8">
        <div className="grid sm:grid-cols-3 gap-4 text-sm pb-6 border-b border-ink/10">
          <div><p className="text-ink/50">Livraison</p><p className="font-medium">{order.customer.zone}</p><p className="text-ink/60">{order.customer.address}</p></div>
          <div><p className="text-ink/50">Paiement</p><p className="font-medium">{PAYMENT_LABELS[order.paymentMethod]}</p>
            <p className={order.paymentStatus === 'paye' ? 'text-emerald-700' : 'text-amber-700'}>{order.paymentStatus === 'paye' ? 'Payé' : 'À régler à la livraison'}</p></div>
          <div><p className="text-ink/50">Total</p><p className="font-display text-2xl">{formatPrice(order.total)}</p></div>
        </div>
        <ul className="divide-y divide-ink/10">
          {order.items.map(i => (
            <li key={i.key} className="flex items-center gap-4 py-4">
              <ProductImage src={i.image} alt={i.name} className="w-14 h-16 rounded-lg" />
              <div className="flex-1 text-sm"><p className="font-medium">{i.name}</p><p className="text-ink/50">{[i.color, i.size && `T. ${i.size}`, `× ${i.quantity}`].filter(Boolean).join(' · ')}</p></div>
              <span className="text-sm font-medium">{formatPrice(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="text-sm space-y-1.5 pt-4 border-t border-ink/10">
          <div className="flex justify-between"><span>Sous-total</span><span>{formatPrice(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Réduction {order.promoCode && `(${order.promoCode})`}</span><span>-{formatPrice(order.discount)}</span></div>}
          <div className="flex justify-between"><span>Livraison</span><span>{order.deliveryFee ? formatPrice(order.deliveryFee) : 'Offerte'}</span></div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center print:hidden">
        <Link to={`/suivi?commande=${order.id}&tel=${encodeURIComponent(order.customer.phone)}`} className="px-7 py-3.5 rounded-full bg-ink text-ivory font-semibold text-center">Suivre ma commande</Link>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="px-7 py-3.5 rounded-full border border-[#25D366] text-[#128C7E] font-semibold flex items-center justify-center gap-2"><MessageCircle className="w-5 h-5" /> Confirmer sur WhatsApp</a>
        <button onClick={() => window.print()} className="px-7 py-3.5 rounded-full border border-ink/20 font-semibold flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Imprimer</button>
      </div>
      <p className="text-center mt-8"><Link to="/boutique" className="text-sm underline underline-offset-4">Continuer mes achats</Link></p>
    </div>
  );
};
