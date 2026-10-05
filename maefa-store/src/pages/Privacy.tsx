import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { usePageTitle } from '../utils/usePageTitle';

/** Date de la dernière mise à jour de cette politique (à changer à chaque modification). */
const UPDATED = '5 octobre 2026';

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-28">
    <h2 className="font-display text-3xl mt-12">{title}</h2>
    <div className="mt-4 space-y-3 text-ink/80 leading-relaxed">{children}</div>
  </section>
);

/**
 * Politique de confidentialité, conforme à la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la
 * protection des données à caractère personnel (autorité de contrôle : la CDP).
 */
export const Privacy: React.FC = () => {
  usePageTitle(
    'Confidentialité',
    'Quelles données Maefa Store garde, pourquoi, combien de temps, et comment exercer vos droits (loi sénégalaise 2008-12, CDP).',
  );
  const wa = buildWhatsAppLink('Bonjour Maefa 👋 Je souhaite exercer mes droits sur mes données personnelles.');
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-16 pb-10" data-testid="privacy-page">
      <p className="eyebrow">Vos données</p>
      <h1 className="font-display text-5xl sm:text-6xl mt-4">Politique de confidentialité</h1>
      <p className="text-ink/70 mt-4">Dernière mise à jour : {UPDATED}</p>

      <div className="mt-8 rounded-[1.5rem] bg-white border border-ink/[0.06] p-6 text-ink/80 leading-relaxed">
        <strong className="text-ink">En bref :</strong> nous gardons seulement ce qu'il faut pour préparer, livrer et
        suivre votre commande. Nous ne vendons jamais vos données. Vous pouvez à tout moment télécharger vos données ou
        supprimer votre compte depuis{' '}
        <Link to="/compte" className="underline">
          Mon compte
        </Link>
        .
      </div>

      <Section id="responsable" title="1. Qui est responsable de vos données ?">
        <p>
          {SITE_CONFIG.name}, boutique en ligne basée à Dakar (Sénégal). Contact : {SITE_CONFIG.phone} (téléphone et
          WhatsApp), {SITE_CONFIG.email}.
        </p>
        <p>
          Ce traitement relève de la loi n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère
          personnel. L'autorité de contrôle est la Commission de Protection des Données Personnelles (CDP).
        </p>
      </Section>

      <Section id="donnees" title="2. Quelles données ?">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Identité et contact</strong> : prénom, nom, numéro de téléphone.
          </li>
          <li>
            <strong>Livraison</strong> : quartier, adresse écrite, repère et point choisi sur la carte (position GPS,
            seulement quand vous appuyez sur « Je suis ici » ou déplacez le point), adresses enregistrées.
          </li>
          <li>
            <strong>Commandes</strong> : articles, montants, moyen de paiement choisi, suivi de livraison. Nous ne
            recevons jamais vos codes Wave ou Orange Money.
          </li>
          <li>
            <strong>Compte</strong> : code personnel (gardé sous forme chiffrée, illisible même pour nous), favoris.
          </li>
          <li>
            <strong>Échanges</strong> : vos demandes envoyées sur WhatsApp, vos messages à l'assistante Maé.
          </li>
          <li>
            <strong>Mesure d'audience</strong> : nombre de visites par article, sans vous identifier.
          </li>
        </ul>
      </Section>

      <Section id="finalites" title="3. Pourquoi ?">
        <ul className="list-disc pl-5 space-y-2">
          <li>Vérifier la disponibilité, préparer et livrer votre commande (exécution de la vente).</li>
          <li>Vous tenir informée de votre commande par SMS ou WhatsApp, et permettre au livreur de vous trouver.</li>
          <li>Vous connecter à votre compte et retrouver vos adresses et vos commandes.</li>
          <li>Respecter nos obligations comptables.</li>
          <li>Améliorer la boutique (articles les plus vus), sans profilage commercial vendu à des tiers.</li>
        </ul>
      </Section>

      <Section id="destinataires" title="4. Qui les reçoit ?">
        <ul className="list-disc pl-5 space-y-2">
          <li>L'équipe Maefa et le livreur de votre commande (nom, téléphone, adresse, repère).</li>
          <li>Notre hébergeur (serveur sécurisé, HTTPS) et notre service d'envoi de messages WhatsApp.</li>
          <li>
            Les services de cartes OpenStreetMap, pour transformer une adresse en point sur la carte (ils reçoivent la
            recherche ou la position, pas votre nom).
          </li>
        </ul>
        <p>
          Certains de ces services sont hébergés hors du Sénégal. Ces transferts sont limités au strict nécessaire et
          encadrés conformément à la loi 2008-12.
        </p>
      </Section>

      <Section id="duree" title="5. Combien de temps ?">
        <ul className="list-disc pl-5 space-y-2">
          <li>Compte : tant qu'il est actif, ou jusqu'à sa suppression par vous.</li>
          <li>Commandes : le temps exigé par nos obligations comptables, puis elles sont supprimées.</li>
          <li>Demandes WhatsApp sans suite : 12 mois au plus.</li>
          <li>Position du livreur : seulement pendant la livraison.</li>
        </ul>
      </Section>

      <Section id="securite" title="6. Comment sont-elles protégées ?">
        <p>
          Connexion chiffrée (HTTPS), codes personnels chiffrés, accès de la gérante protégé par un code vérifié par le
          serveur, jetons de connexion signés, limites contre les tentatives répétées. Les prix et les données sensibles
          ne sont jamais exposés au public.
        </p>
      </Section>

      <Section id="droits" title="7. Vos droits">
        <p>
          Vous avez le droit d'<strong>accéder</strong> à vos données, de les <strong>rectifier</strong>, de les{' '}
          <strong>faire supprimer</strong> et de vous <strong>opposer</strong> à leur utilisation pour un motif
          légitime.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Dans{' '}
            <Link to="/compte" className="underline">
              Mon compte
            </Link>{' '}
            : « Télécharger mes données » et « Supprimer mon compte », en un geste.
          </li>
          <li>
            Ou sur{' '}
            <a href={wa} target="_blank" rel="noopener noreferrer" className="underline">
              WhatsApp
            </a>{' '}
            : nous répondons sous 30 jours au plus.
          </li>
        </ul>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la Commission de Protection des
          Données Personnelles (CDP).
        </p>
      </Section>

      <Section id="stockage" title="8. Stockage sur votre téléphone">
        <p>
          Le site garde sur votre téléphone votre panier, vos favoris et vos préférences (langue, adresses), pour que
          vous les retrouviez. Aucun cookie publicitaire n'est utilisé.
        </p>
      </Section>
    </div>
  );
};

export default Privacy;
