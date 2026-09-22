import React, { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { DELIVERY_ZONES, buildWhatsAppLink } from '../config/site';
import { formatPrice } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';

const QUESTIONS = [
  { q: 'Quels sont les délais de livraison ?', a: 'Nous livrons en 24h à Dakar et en 48h à 5 jours dans les autres régions du Sénégal. Vous êtes appelé(e) avant chaque livraison.' },
  { q: 'Quels moyens de paiement acceptez-vous ?', a: 'Wave, Orange Money, Free Money, carte bancaire (Visa, Mastercard) et paiement en espèces à la livraison.' },
  { q: 'Puis-je échanger ou retourner un article ?', a: 'Oui : vous disposez de 7 jours après réception pour échanger un article (taille, couleur) gratuitement, à condition qu\'il n\'ait pas été porté et soit dans son emballage d\'origine. Contactez-nous sur WhatsApp pour organiser l\'échange.' },
  { q: 'Comment suivre ma commande ?', a: 'Rendez-vous sur la page « Suivre ma commande » avec votre numéro de commande (reçu à la confirmation) et votre numéro de téléphone.' },
  { q: 'Les articles sont-ils authentiques et de qualité ?', a: 'Chaque article est sélectionné et contrôlé par notre équipe avant expédition. Nos créations en wax sont confectionnées à Dakar.' },
  { q: 'Puis-je retirer ma commande en boutique ?', a: 'Oui, choisissez « Dakar Plateau » ou « Sacré-Cœur » et précisez « retrait en boutique » dans les instructions : nous vous rembourserons les frais de livraison.' },
];

const SHOE_SIZES = [['36', '23 cm'], ['37', '23,7 cm'], ['38', '24,3 cm'], ['39', '25 cm'], ['40', '25,7 cm'], ['41', '26,3 cm'], ['42', '27 cm'], ['43', '27,7 cm'], ['44', '28,3 cm'], ['45', '29 cm']];
const CLOTHES_SIZES = [['S', '36–38', '84–88 cm'], ['M', '40–42', '88–96 cm'], ['L', '44–46', '96–104 cm'], ['XL', '48–50', '104–112 cm']];

export const FAQ: React.FC = () => {
  usePageTitle('Aide & FAQ');
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-14">
      <h1 className="font-display text-5xl text-center">Aide & FAQ</h1>
      <p className="text-center text-ink/60 mt-3">Tout ce qu'il faut savoir pour commander sereinement.</p>

      <div className="mt-12 space-y-3">
        {QUESTIONS.map((item, i) => (
          <div key={item.q} className="bg-white rounded-2xl">
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="w-full flex items-center justify-between gap-4 p-5 text-left font-medium">
              {item.q}<ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && <p className="px-5 pb-5 text-ink/70 leading-relaxed animate-fade-up">{item.a}</p>}
          </div>
        ))}
      </div>

      <h2 className="font-display text-3xl mt-16 mb-5">Frais de livraison</h2>
      <div className="bg-white rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink text-ivory"><tr><th className="text-left p-3">Zone</th><th className="text-left p-3">Frais</th><th className="text-left p-3">Délai</th></tr></thead>
          <tbody>
            {DELIVERY_ZONES.map(z => <tr key={z.name} className="border-t border-ink/5"><td className="p-3">{z.name}</td><td className="p-3">{formatPrice(z.fee)}</td><td className="p-3">{z.delay}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-ink/60 mt-3">Livraison offerte dès 50 000 FCFA d'achat.</p>

      <h2 id="tailles" className="font-display text-3xl mt-16 mb-5 scroll-mt-28">Guide des tailles</h2>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5">
          <h3 className="font-semibold mb-3">Chaussures (longueur du pied)</h3>
          <table className="w-full text-sm"><tbody>
            {SHOE_SIZES.map(([s, cm]) => <tr key={s} className="border-t border-ink/5"><td className="py-1.5">{s}</td><td className="py-1.5 text-right text-ink/60">{cm}</td></tr>)}
          </tbody></table>
        </div>
        <div className="bg-white rounded-2xl p-5">
          <h3 className="font-semibold mb-3">Vêtements</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-ink/50"><th className="text-left py-1.5 font-normal">Taille</th><th className="text-left font-normal">FR</th><th className="text-right font-normal">Poitrine</th></tr></thead>
            <tbody>{CLOTHES_SIZES.map(([s, fr, p]) => <tr key={s} className="border-t border-ink/5"><td className="py-1.5">{s}</td><td>{fr}</td><td className="text-right text-ink/60">{p}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className="mt-16 text-center bg-ink text-ivory rounded-3xl p-10">
        <h2 className="font-display text-3xl">Une autre question ?</h2>
        <p className="text-ivory/70 mt-2">Notre équipe vous répond sur WhatsApp 7j/7.</p>
        <a href={buildWhatsAppLink('Bonjour Fabima Store, j\'ai une question :')} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-6 px-7 py-3.5 rounded-full bg-[#25D366] text-white font-semibold"><MessageCircle className="w-5 h-5" /> Écrire sur WhatsApp</a>
      </div>
    </div>
  );
};
