# Fabima Store — Boutique de mode en ligne

Boutique e-commerce de mode (chaussures, sacs, accessoires, bijoux, prêt-à-porter) inspirée de la boutique **Allô Béton** :
même pile technique (React + TypeScript + Tailwind + Vite), même logique commerciale adaptée au Sénégal
(prix en FCFA, zones de livraison dakaroises, paiement Wave / Orange Money / Free Money / carte / espèces, commande WhatsApp).

## Démarrer

```bash
cd fabima-store
npm install
npm run dev        # site : http://localhost:5174
npm run server     # (2e terminal) assistante IA + WhatsApp : http://localhost:8787
npm run build      # vérification TypeScript + build de production dans dist/
```

Le site fonctionne sans le serveur : l'assistante répond alors en mode « réponses rapides » (sans IA)
et les messages WhatsApp se font en un clic, avec un texte prérempli.

## Assistante IA « Fabi » et notifications WhatsApp

Copiez `server/.env.example` en `server/.env`, puis renseignez :

| Variable | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | Active l'assistante IA (Claude). Clé à créer sur console.anthropic.com. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Active l'envoi automatique des messages WhatsApp (même fournisseur qu'Allô Béton). |
| `OWNER_WHATSAPP` | Votre numéro : vous y recevez chaque nouvelle commande. |
| `ADMIN_PIN` | Même code que l'espace gérant, exigé pour envoyer les messages de suivi aux clientes. |
| `SITE_URL` | Adresse publique du site, utilisée dans les liens de suivi envoyés sur WhatsApp. |

**Ce qui se passe à chaque commande**

| Moment | Avec Twilio configuré | Sans configuration |
|---|---|---|
| La cliente valide sa commande | Vous recevez le récapitulatif complet sur WhatsApp, la cliente reçoit un accusé de réception avec son lien de suivi | La page de confirmation invite la cliente à vous envoyer le récapitulatif sur WhatsApp en un clic |
| Vous changez le statut (confirmée, en préparation, en route, livrée, annulée) | La cliente reçoit le message correspondant automatiquement | Un bouton vert « Prévenir … » ouvre WhatsApp avec le message prêt |
| Une pièce épuisée revient en stock | « Prévenir sur WhatsApp » écrit à toutes les clientes en attente | Un bouton par cliente ouvre WhatsApp avec le message prêt |

Chaque envoi est noté dans le détail de la commande (auto, manuel ou échec).

**Bon à savoir sur WhatsApp** : pour tester, le bac à sable Twilio suffit (chaque numéro doit d'abord envoyer
le mot-clé du bac à sable). En production, WhatsApp n'autorise à écrire à une personne qui ne vous a pas écrit
dans les dernières 24 h qu'avec des **modèles de messages approuvés par Meta** : créez-les dans Twilio
(Content Template Builder) et indiquez leurs identifiants dans `TWILIO_TPL_*`.

**Coût de l'assistante** : chaque question envoie le catalogue à Claude ; il est mis en cache (environ 10 fois
moins cher à la relecture) et les réponses sont limitées en longueur. Le serveur limite aussi le nombre de
questions par visiteuse. Le modèle se change avec `CLAUDE_MODEL`.

**Mise en ligne** : `npm start` compile le site puis lance le serveur, qui sert à la fois le site et l'API
(un seul service à héberger, par exemple sur Railway comme Allô Béton).

## Thème

Thème **féminin** : rose poudré, vieux rose, prune et rose doré ; logo et accents en calligraphie (*Pinyon Script*),
titres en *Cormorant Garamond*, texte en *Manrope* ; formes arrondies et arches, ornements floraux.
Les couleurs sont centralisées dans `tailwind.config.js` (jetons `ink`, `ivory`, `gold`, `wine`, `blush`, `mauve`) :
modifier une teinte à cet endroit la change sur tout le site.

## Fonctionnalités

| Côté client | Côté gérant (`/admin`, PIN démo : `2026`) |
|---|---|
| Accueil : carrousel, catégories, best-sellers / nouveautés / promos, avis clients | Tableau de bord : CA, commandes, panier moyen, ventes par catégorie, stock faible |
| Catalogue filtrable (catégorie, femme/homme, type, prix, couleur, stock, promo) et triable | Commandes : filtre par statut, changement de statut, paiement reçu, contact WhatsApp |
| Fiche produit : galerie, couleurs, tailles, stock, avis, guide des tailles, commande WhatsApp | Produits : ajout, modification, suppression, restauration du catalogue |
| Recherche plein écran, méga-menu, aperçu rapide, ajout rapide avec taille depuis la carte | Export CSV des commandes |
| Shopping par occasion (mariage, Tabaski & Korité, soirée, bureau, quotidien, vacances) | Occasions, matière, entretien et conseil de style par produit |
| Fiche produit : conseil de style, matière & entretien, alerte de retour en stock | Liste des clientes à prévenir au retour en stock |
| Idées cadeaux par budget, « Ajouter tout le look » en un clic | |
| Le journal : guides de style et conseils d'entretien reliés aux produits | |
| Favoris, articles vus récemment, avis clients, « Complétez le look », Shop the look | Remise en stock automatique à l'annulation |
| Panier latéral, codes promo, emballage cadeau avec message, livraison offerte dès 50 000 FCFA | |
| Commande en 2 étapes, coordonnées mémorisées, validation du numéro sénégalais | |
| Confirmation imprimable, suivi de commande, page « Mes commandes » | |
| FAQ, frais de livraison, guide des tailles, page « Notre maison » | |

Codes promo de démonstration : `BIENVENUE` (-10 %), `FABIMA5000` (-5 000 FCFA dès 40 000), `LIVRAISON` (livraison offerte).

## Organisation

```
src/
├── config/site.ts         # Coordonnées, WhatsApp, zones & frais de livraison, codes promo, emballage cadeau, PIN admin
├── data/catalog.ts        # Catégories, occasions et catalogue initial (30 pièces pour femme)
├── data/journal.ts        # Articles du journal (blocs texte, astuces, produits cités)
├── data/types.ts          # Types Produit, Panier, Commande
├── services/api.ts        # Appels au serveur (assistante, WhatsApp, vitrine, voix), avec repli si absent
├── utils/statusImage.ts   # Image du statut WhatsApp (1080 × 1920)
├── utils/share.ts         # Liens courts /p/…, textes de statut et de réponse
├── context/StoreContext   # État global : produits, panier, favoris, commandes, avis, notifications
├── utils/hooks.ts         # Échap, blocage du défilement, apparition au défilement
├── components/            # Navbar, Footer, panier latéral, carte produit, recherche…
└── pages/                 # Accueil, Boutique, Produit, Panier, Commande, Confirmation, Suivi, Mes commandes, Favoris, Journal, FAQ, Maison, Admin
```

Le serveur (`server/`) : `index.js` (routes, limites de débit, site compilé), `assistant.js` (Claude),
`whatsapp.js` (Twilio et textes des messages), `store.js` (vitrine du statut, compteurs de visites, notes vocales).

Le rapport d'audit (bugs corrigés, nouveautés, points restants) est dans [`AUDIT.md`](AUDIT.md).

## Vendre avec le statut WhatsApp

Dans l'espace gérant, onglet **Statut WhatsApp** :

1. Touchez une pièce.
2. Touchez **Publier sur mon statut** : l'image (format statut, prix en grand, couleurs, lien court écrit en gros)
   et le texte avec le lien cliquable sont prêts. Sur téléphone, le menu de partage s'ouvre : choisissez WhatsApp → *Mon statut*.
   Sur ordinateur, l'image est téléchargée et le texte copié.
3. Facultatif : **Ajouter à la vitrine du jour** et **Enregistrer ma voix** (présentation en wolof ou en français, 1 minute).

Ce que voit la cliente :

| Lien | Page |
|---|---|
| `/p/109` | Page très simple d'une pièce : grande photo, prix en très gros, couleurs en ronds, tailles en gros boutons, 🔊 écouter (votre voix, ou lecture automatique de la fiche), gros bouton vert « Commander sur WhatsApp » avec couleur et taille déjà écrites |
| `/s` | Vitrine du jour : toutes les pièces mises en statut, en grandes photos avec le prix |

Chaque visite arrivée depuis un statut est comptée : le nombre s'affiche sur chaque pièce dans l'onglet.
La vitrine, les notes vocales et les compteurs sont gardés par le serveur (`server/data/`, ou le dossier `DATA_DIR`) :
sur un hébergement, prévoyez un disque persistant pour ce dossier.

## Modifier le catalogue

Le catalogue de départ est dans `src/data/catalog.ts`. Si vous changez sa structure, augmentez `CATALOG_VERSION` :
les navigateurs qui gardaient l'ancienne version repartent automatiquement du nouveau catalogue.

## Mise en ligne

`npm run build` produit le dossier `dist/`, déployable sur Netlify ou Vercel : les fichiers `public/_redirects`
et `vercel.json` renvoient toutes les adresses vers l'application (sinon un rafraîchissement sur `/boutique/sacs` donnerait une 404).

## À savoir avant la mise en production

- **Données** : le catalogue, les paniers et les commandes sont conservés dans le navigateur (`localStorage`).
  Pour une vraie boutique multi-appareils, brancher `StoreContext` sur une API (le backend Express/MySQL d'Allô Béton peut servir de base).
- **Paiement** : la passerelle est simulée dans `pages/Checkout.tsx` (fonction `pay`). À remplacer par l'API Wave Business,
  Orange Money ou un agrégateur (PayDunya, CinetPay…).
- **Notifications** : sans base de données, le serveur reçoit la commande depuis le navigateur de la cliente ;
  il vérifie le format et limite les envois, mais une vraie base de commandes côté serveur reste l'étape suivante.
- **Espace gérant** : le PIN est vérifié côté navigateur, il ne protège donc qu'une démo. Une authentification serveur est nécessaire en production.
- **Coordonnées** : le téléphone, le WhatsApp, l'e-mail et les réseaux sociaux de `config/site.ts` sont des valeurs d'exemple à remplacer.
- **Photos** : les images proviennent de Pexels ; si une image ne charge pas, un visuel de remplacement s'affiche.
  Remplacez-les par vos propres photos depuis l'espace gérant.
