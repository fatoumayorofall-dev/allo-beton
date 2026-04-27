/**
 * ALLO BÉTON — Page FAQ publique (SEO + trust)
 * Injecte automatiquement un JSON-LD FAQPage pour rich snippets Google
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, HelpCircle, MessageCircle, Phone, Truck, Shield, CreditCard, Package, Clock } from 'lucide-react';
import { SITE_CONFIG, buildWhatsAppLink } from './siteConfig';

interface FAQItem {
  q: string;
  a: string;
  icon?: React.ElementType;
}

const FAQ_CATEGORIES: { title: string; icon: React.ElementType; items: FAQItem[] }[] = [
  {
    title: 'Commandes & livraison',
    icon: Truck,
    items: [
      {
        q: 'Quels sont les délais de livraison ?',
        a: `Livraison en 24 à 48h sur Dakar et sa banlieue (Pikine, Guédiawaye, Rufisque). Pour les régions (Thiès, Mbour, Saint-Louis...), comptez 48 à 72h ouvrées. Les commandes passées avant 14h sont traitées le jour même.`,
      },
      {
        q: 'Quelles zones livrez-vous ?',
        a: `Nous livrons dans tout le Sénégal. Nos tarifs de livraison dépendent de la zone : Dakar Plateau, Almadies, Médina, Parcelles Assainies, Pikine, Guédiawaye, Rufisque, Thiès, Diamniadio. Pour les autres zones, contactez-nous pour un devis personnalisé.`,
      },
      {
        q: 'Quelle est la quantité minimum de commande ?',
        a: `Pour le béton prêt à l'emploi, la quantité minimum est de 2 m³. Pour les autres matériaux (ciment, fer, granulats), il n'y a pas de minimum : nous livrons aussi bien pour les petits travaux que les gros chantiers.`,
      },
      {
        q: 'Puis-je suivre ma commande ?',
        a: `Oui, vous recevez une notification WhatsApp à chaque étape : confirmation, préparation, départ camion et livraison. Vous pouvez aussi suivre en temps réel depuis votre espace client.`,
      },
    ],
  },
  {
    title: 'Paiement',
    icon: CreditCard,
    items: [
      {
        q: 'Quels moyens de paiement acceptez-vous ?',
        a: `Wave, Orange Money, Free Money, carte bancaire Visa/Mastercard, virement bancaire, paiement à la livraison (pour les clients réguliers) et chèque d'entreprise.`,
      },
      {
        q: 'Puis-je payer à la livraison ?',
        a: `Oui, le paiement à la livraison est possible pour les commandes inférieures à 500 000 FCFA. Pour les montants supérieurs, un acompte de 30% est demandé à la commande.`,
      },
      {
        q: 'Les prix sont-ils TTC ?',
        a: `Oui, tous nos prix affichés incluent la TVA à 18%. Une facture conforme DGID (avec NINEA : ${SITE_CONFIG.legal.ninea}) vous est remise à la livraison et disponible dans votre espace client.`,
      },
      {
        q: 'Proposez-vous des tarifs pro / volumes ?',
        a: `Oui, nous accordons des remises dégressives selon le volume commandé. Pour les professionnels et gros chantiers (>50 m³ ou >5 M FCFA/mois), contactez notre commercial au ${SITE_CONFIG.phone} pour un devis personnalisé.`,
      },
    ],
  },
  {
    title: 'Produits & qualité',
    icon: Package,
    items: [
      {
        q: 'Votre béton est-il certifié ?',
        a: `Oui, notre béton prêt à l'emploi est certifié NF EN 206-1. Nous proposons les classes de résistance B20, B25, B30, B35 et B40, adaptées à tous types de travaux : dallages, fondations, structures porteuses.`,
      },
      {
        q: 'Quelle classe de béton choisir ?',
        a: `B20 : travaux non structurels (dallage léger). B25 : standard pour constructions résidentielles. B30 : structures porteuses, dalles de parking. B35/B40 : ouvrages industriels, piliers. En cas de doute, notre équipe vous conseille gratuitement.`,
      },
      {
        q: 'Provenance de vos matériaux ?',
        a: `Nous travaillons avec les meilleures cimenteries du Sénégal (Sococim, Cimentpaicam). Nos granulats proviennent de carrières locales certifiées. Le fer à béton est conforme à la norme NF A 35-016.`,
      },
      {
        q: 'Acceptez-vous les retours ?',
        a: `Les matériaux non ouverts et en parfait état peuvent être retournés sous 48h (frais de retour à votre charge). Le béton frais livré ne peut pas être retourné (produit périssable). En cas de problème qualité, nous remplaçons gratuitement.`,
      },
    ],
  },
  {
    title: 'Compte & sécurité',
    icon: Shield,
    items: [
      {
        q: 'Pourquoi créer un compte ?',
        a: `Un compte vous permet de : suivre vos commandes, télécharger vos factures, sauvegarder vos adresses de livraison, bénéficier de tarifs fidélité et passer commande en un clic.`,
      },
      {
        q: 'Mes données sont-elles sécurisées ?',
        a: `Oui. Votre compte est protégé par un mot de passe crypté (bcrypt) et les connexions utilisent des tokens JWT. Aucune information bancaire n'est stockée chez nous (elle transite directement par notre prestataire de paiement sécurisé).`,
      },
      {
        q: "J'ai oublié mon mot de passe",
        a: `Depuis la page de connexion, cliquez sur "Mot de passe oublié ?" et entrez votre email. Vous recevrez un lien de réinitialisation valide 1 heure.`,
      },
    ],
  },
];

export const ShopFAQ: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  // JSON-LD FAQPage pour rich snippets Google
  useEffect(() => {
    const allItems = FAQ_CATEGORIES.flatMap((c) => c.items);
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: allItems.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    };
    let script = document.getElementById('ld-faq') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'ld-faq';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
    return () => {
      document.getElementById('ld-faq')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="relative shop-mesh-light overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 shop-grid-light opacity-40 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 rounded-full px-4 py-1.5 mb-5 text-xs font-bold tracking-wider uppercase">
            <HelpCircle className="w-4 h-4" />
            Questions fréquentes
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Comment pouvons-nous <span className="shop-grad-text">vous aider</span> ?
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Les réponses aux questions les plus fréquentes sur nos produits, livraisons, paiements et services.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={buildWhatsAppLink('Bonjour, j\'ai une question à propos de vos produits 🙋')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-green-500/25 transition-all hover:-translate-y-0.5"
            >
              <MessageCircle className="w-4 h-4" />
              Poser une question sur WhatsApp
            </a>
            <a
              href={`tel:${SITE_CONFIG.phoneRaw}`}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-orange-500 text-slate-700 hover:text-orange-700 font-bold px-5 py-3 rounded-xl transition-all"
            >
              <Phone className="w-4 h-4" />
              {SITE_CONFIG.phone}
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-16">
        {FAQ_CATEGORIES.map((cat, catIdx) => (
          <div key={cat.title} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center">
                <cat.icon className="w-5 h-5 text-orange-700" />
              </div>
              <h2 className="font-display text-2xl font-black text-slate-900 tracking-tight">
                {cat.title}
              </h2>
            </div>

            <div className="space-y-3">
              {cat.items.map((item, i) => {
                const id = `${catIdx}-${i}`;
                const isOpen = openId === id;
                return (
                  <div
                    key={id}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      isOpen
                        ? 'border-orange-300 shadow-lg shadow-orange-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => setOpenId(isOpen ? null : id)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="font-bold text-slate-900 text-[15px]">{item.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 flex-shrink-0 text-slate-400 transition-transform duration-300 ${
                          isOpen ? 'rotate-180 text-orange-600' : ''
                        }`}
                      />
                    </button>
                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="px-5 pb-5 pt-1 text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Bottom CTA */}
        <div className="mt-16 bg-gradient-to-br from-orange-600 to-orange-800 rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl shadow-orange-900/20">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-5">
            <Clock className="w-7 h-7 text-orange-200" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight mb-3">
            Vous n'avez pas trouvé votre réponse ?
          </h2>
          <p className="text-orange-100 text-lg leading-relaxed max-w-xl mx-auto mb-8">
            Notre équipe est disponible du lundi au samedi pour répondre à toutes vos questions.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={buildWhatsAppLink('Bonjour, j\'ai une question spécifique 💬')}
              target="_blank"
              rel="noopener noreferrer"
              className="shop-shine inline-flex items-center gap-2 bg-white text-orange-700 font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              className="inline-flex items-center gap-2 bg-orange-900/40 hover:bg-orange-900/60 border border-white/20 text-white font-bold px-6 py-3 rounded-xl transition-all"
            >
              <Phone className="w-4 h-4" />
              {SITE_CONFIG.email}
            </a>
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-orange-200 hover:text-white font-medium px-6 py-3 transition-colors"
              >
                ← Retour à la boutique
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ShopFAQ;
