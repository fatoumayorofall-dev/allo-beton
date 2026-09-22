import React, { useState } from 'react';
import { MessageCircle, Plus } from 'lucide-react';
import { DELIVERY_ZONES, SITE_CONFIG, buildWhatsAppLink } from '../config/site';
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
    <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-16">
      <div className="text-center">
        <p className="eyebrow">Service client</p>
        <h1 className="font-display text-5xl sm:text-6xl mt-4">Aide & questions</h1>
        <p className="text-ink/60 mt-4">Tout ce qu'il faut savoir pour commander l'esprit léger.</p>
      </div>

      <div className="mt-14 border-t border-ink/10">
        {QUESTIONS.map((item, i) => (
          <div key={item.q} className="border-b border-ink/10">
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="w-full flex items-center justify-between gap-6 py-6 text-left">
              <span className="font-display text-2xl">{item.q}</span>
              <span className={`w-8 h-8 rounded-full border border-ink/15 grid place-items-center shrink-0 transition-transform duration-500 ${open === i ? 'rotate-45 bg-ink text-ivory border-ink' : ''}`}><Plus className="w-3.5 h-3.5" /></span>
            </button>
            <div className={`grid transition-all duration-500 ease-luxe ${open === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden"><p className="pb-6 text-ink/65 leading-relaxed pr-12">{item.a}</p></div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-display text-4xl mt-20 mb-6">Frais de livraison</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b border-ink"><th className="field-label py-3">Zone</th><th className="field-label py-3">Délai</th><th className="field-label py-3 text-right">Frais</th></tr></thead>
        <tbody>
          {DELIVERY_ZONES.map(z => <tr key={z.name} className="border-b border-ink/10"><td className="py-3.5">{z.name}</td><td className="py-3.5 text-ink/60">{z.delay}</td><td className="py-3.5 text-right">{formatPrice(z.fee)}</td></tr>)}
        </tbody>
      </table>
      <p className="text-sm text-ink/60 mt-4">Livraison offerte dès {formatPrice(SITE_CONFIG.freeShippingThreshold)} d'achat.</p>

      <h2 id="tailles" className="font-display text-4xl mt-20 mb-6 scroll-mt-32">Guide des tailles</h2>
      <div className="grid sm:grid-cols-2 gap-10">
        <div>
          <h3 className="field-label">Chaussures · longueur du pied</h3>
          <table className="w-full text-sm"><tbody>
            {SHOE_SIZES.map(([s, cm]) => <tr key={s} className="border-b border-ink/10"><td className="py-2.5">{s}</td><td className="py-2.5 text-right text-ink/60">{cm}</td></tr>)}
          </tbody></table>
        </div>
        <div>
          <h3 className="field-label">Prêt-à-porter</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-ink/50 border-b border-ink/10"><th className="text-left py-2.5 font-normal">Taille</th><th className="text-left font-normal">FR</th><th className="text-right font-normal">Poitrine</th></tr></thead>
            <tbody>{CLOTHES_SIZES.map(([s, fr, p]) => <tr key={s} className="border-b border-ink/10"><td className="py-2.5">{s}</td><td>{fr}</td><td className="text-right text-ink/60">{p}</td></tr>)}</tbody>
          </table>
          <p className="text-xs text-ink/50 mt-4">Entre deux tailles ? Choisissez la plus grande, ou demandez conseil sur WhatsApp.</p>
        </div>
      </div>

      <div className="mt-24 text-center bg-ink text-ivory px-6 py-16 grain relative overflow-hidden">
        <p className="eyebrow !text-gold-light">Conseil personnalisé</p>
        <h2 className="font-display text-4xl sm:text-5xl mt-4">Une autre question ?</h2>
        <p className="text-ivory/65 mt-3 text-sm">Notre équipe vous répond sur WhatsApp, 7 jours sur 7.</p>
        <a href={buildWhatsAppLink('Bonjour Fabima Store, j\'ai une question :')} target="_blank" rel="noopener noreferrer" className="btn-light mt-8"><MessageCircle className="w-4 h-4" strokeWidth={1.5} /> Écrire sur WhatsApp</a>
      </div>
    </div>
  );
};
