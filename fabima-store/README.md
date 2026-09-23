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
| `SITE_URL` | Adresse publique du site (ex. `https://fabimastore.sn`) : liens de suivi envoyés sur WhatsApp, aperçus de liens, sitemap. |
| `AUTH_SECRET` | Clé des marques secrètes des étiquettes d'authenticité (longue chaîne aléatoire). Sans elle, une clé est tirée au hasard au premier démarrage et gardée dans `DATA_DIR/auth-secret` : ne la perdez pas, sinon les marques des nouvelles étiquettes changent. |

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

Thème **féminin** : rose poudré, vieux rose, prune et rose doré ; accents en calligraphie (*Pinyon Script*),
titres en *Cormorant Garamond*, texte en *Manrope* (polices hébergées dans `public/fonts/`) ; formes arrondies et arches, ornements floraux.

**Logo « L'Écrin »** (`src/components/Logo.tsx`) : une arche (la porte de la maison, le motif du site) traitée comme un écrin à bijou —
filet or rose, clé de voûte en losange, F italique et paraphe — et le nom FABIMA / STORE ◆ DAKAR. `BrandMark` (l'écrin, `compact` pour les petites tailles,
`light` pour les fonds sombres) et `Wordmark` (le nom) se réutilisent partout. Favicon, icônes et image de partage sont dans `public/`.
Fichiers pour l'impression et les réseaux dans `public/brand/` : logo horizontal (fond clair / sombre), logo empilé, monogramme (prune, or, une couleur),
cachet rond, et l'**édition sécurisée** (`fabima-monogramme-securise.svg` : guilloché + micro-texte, sans les marques secrètes).
La charte complète (construction, couleurs, typographie, maquettes de l'accueil) est dans le fichier Figma « Fabima Store — Identité & Accueil 2026 ».
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
| Point de livraison sur la carte (GPS, recherche, épingle), suivi du livreur en direct | Carte de la commande, livreur avec lien de suivi, WhatsApp « en route / il arrive » |
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
`whatsapp.js` (Twilio et textes des messages), `orders.js` (commandes, livreur, suivi GPS), `geo.js` (recherche d'adresse), `market.js` (le Marché : produits fournisseurs, import par lien, suivi fournisseur), `catalog.js` (catalogue partagé, stock, avis), `seo.js` (robots.txt, sitemap, aperçus de liens), `authenticity.js` et `brandSecurity.js` (étiquettes d'authenticité, marques secrètes), `store.js` (vitrine du statut, compteurs de visites, notes vocales, comptes et commandes des clientes), `auth.js` (connexion par numéro de téléphone).

Le rapport d'audit (bugs corrigés, nouveautés, points restants) est dans [`AUDIT.md`](AUDIT.md).

## Application sur le téléphone et compte par numéro

**Installer Fabima** : sur Android, le bouton « Mettre Fabima sur mon téléphone » (bandeau sur mobile, page Mon compte)
ouvre directement l'installation. Sur iPhone, un guide en 3 images (avec lecture à voix haute) montre les gestes dans Safari.
Une fois installée, Fabima s'ouvre depuis son icône, en plein écran, et reste consultable avec une connexion faible
(`public/sw.js`, `public/manifest.webmanifest`, icônes dans `public/icons/`). L'installation demande un site en **https**.

**Compte cliente (`/compte`)** : la cliente saisit son numéro, reçoit un **code à 4 chiffres sur WhatsApp**, l'écrit, puis
donne son prénom. Pas de mot de passe. Avec son compte, elle retrouve sur n'importe quel téléphone ses commandes, ses favoris
et son adresse ; ses coordonnées sont préremplies à la commande. La gérante voit les inscrites dans l'onglet **Clientes**
(export Excel, bouton WhatsApp).

| Réglage (`server/.env`) | Rôle |
|---|---|
| Twilio configuré | Le code part par WhatsApp |
| `TWILIO_TPL_OTP` | Modèle « authentification » approuvé par Meta, obligatoire en production |
| `OTP_DEV_MODE=1` | Sans WhatsApp, le code s'affiche à l'écran (tests uniquement) ; mettre `0` en production |

Sécurité : code valable 10 minutes, 5 essais maximum, 3 demandes de code par numéro toutes les 10 minutes ;
le serveur ne garde que l'empreinte des codes et des jetons de session (valables 6 mois).

## Livraison : la cliente pointe sa maison, puis suit son livreur (comme Yango)

**À la commande**, plus besoin d'expliquer le chemin :

1. la cliente touche **« 📍 Je suis ici, livrez-moi ici »** : le GPS du téléphone place la maison sur la carte, avec l'adresse écrite ;
2. ou elle écrit un quartier, une mosquée, une école, une pharmacie… et choisit dans la liste ;
3. elle peut faire glisser la carte pour mettre l'épingle exactement sur sa porte, et ajouter un repère (« portail vert »).

La zone de livraison et ses frais sont reconnus automatiquement à partir du point (zones et rayons dans `config/site.ts`).
Le point est gardé pour les commandes suivantes (sur le téléphone et dans le compte). Un bouton 🔊 lit les explications à voix haute.
Sans carte (serveur absent, GPS refusé), la cliente peut toujours écrire son adresse.

**La livraison** (espace gérant → Commandes → une commande) :

| Étape | Ce qui se passe |
|---|---|
| La gérante ouvre la commande | Point sur la carte, repère, bouton « Ouvrir dans Google Maps » |
| Elle choisit un livreur (nom + téléphone) | Le livreur reçoit sur WhatsApp un lien secret `/livreur/…` (ou la gérante l'envoie en un clic) |
| Le livreur touche « Démarrer la course » | La commande passe « en route » ; la cliente reçoit un WhatsApp avec le lien pour **suivre le livreur en direct** |
| Pendant le trajet | La position du livreur est envoyée toutes les 4 s ; la cliente voit le scooter avancer vers sa maison et le temps d'arrivée ; boutons Google Maps / Waze et appel pour le livreur |
| À moins de 400 m | La cliente reçoit « votre livreur arrive » |
| « Colis remis » | Commande livrée et payée, message de remerciement |

**Livraison en relais (longue distance)** : pour une cliente à Kédougou, Tambacounda, Ziguinchor…, la gérante
touche **« 🔁 En relais »** et prépare les étapes, par exemple :

1. 🛵 Modou (moto) apporte le colis jusqu'à la **gare routière** ;
2. 🚌 Ousmane (car / 7 places) l'emmène jusqu'à la **gare de Kédougou** ;
3. 🛵 Awa (moto à Kédougou) le livre **chez la cliente**.

Chaque point de relais se cherche sur la carte (ou s'écrit simplement). Chaque livreur reçoit **son propre lien**, avec
seulement sa mission : de qui il reçoit le colis, à qui il le remet. Celui qui attend voit le livreur précédent
arriver sur la carte, et il est prévenu sur WhatsApp au départ du colis puis à moins de 1 km du relais. Le relais
est validé par l'un ou l'autre : « J'ai reçu le colis » (celui qui reçoit) ou « Colis remis à … » (celui qui donne).
La cliente voit les étapes, le véhicule en cours et le temps d'arrivée ; elle reçoit un message à chaque passage de relais.
Seul le dernier livreur voit le téléphone de la cliente et le montant à encaisser. Sur la route, la position est envoyée
toutes les 15 s (4 s à moto) pour ménager la batterie ; les livreurs et points de relais déjà utilisés sont proposés en un clic.

Les commandes sont maintenant **enregistrées sur le serveur** : la gérante voit celles de toutes les clientes, depuis n'importe quel appareil.

**Cartes utilisées** : OpenStreetMap (gratuit, sans clé, très complet à Dakar) avec Leaflet pour l'affichage,
Photon pour la recherche et Nominatim pour l'adresse d'un point, appelés par le serveur (mis en cache).
Pour un gros volume, prenez un fond de carte payant (MapTiler, Stadia…) avec `VITE_MAP_TILES`, et réglez
`PHOTON_URL` / `NOMINATIM_URL` (voir `server/.env.example`). Google Maps reste utilisé pour l'itinéraire du livreur.

**Bon à savoir** : la géolocalisation demande un site en **https**. Le livreur doit garder la page ouverte pendant
le trajet (l'écran reste allumé automatiquement) ; s'il la ferme, la cliente voit la dernière position connue.

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

## Catalogue partagé, stock et « sur commande »

**Catalogue en ligne** : la première fois que la gérante ouvre l'onglet **Produits**, le catalogue est publié sur le
serveur. Ensuite, chaque ajout, modification ou suppression est visible **tout de suite par toutes les clientes**
(un bandeau vert l'indique). Les avis et les demandes « prévenez-moi du retour en stock » sont aussi gardés par
le serveur : la gérante les voit dans le tableau de bord, quel que soit le téléphone de la cliente.

**Stock** : il baisse à chaque commande et remonte si la commande est annulée. Juste avant le paiement, la boutique
vérifie que la pièce est toujours disponible et que le prix n'a pas changé : pas de survente, pas de prix modifié.

**Sur commande** : dans la fiche d'un produit, « Si épuisé : vendre sur commande » (délai en jours). Quand le stock
tombe à zéro, la pièce reste commandable avec la mention « Sur commande · 7 j » au lieu de « Épuisé » ; la cliente
paie à la commande et vous vous réapprovisionnez. Ces pièces apparaissent avec ⏳ dans le détail des commandes.

## Le Marché Fabima (dropshipping)

Une deuxième partie du site, `/marche`, où vous vendez des **chaussures et des sacs** trouvés chez un fournisseur
(AliExpress, Alibaba, CJ Dropshipping, une boutique en ligne, un grossiste…) sans l'avoir en stock.

**Ajouter un produit** (espace gérant → onglet **Le Marché** → « Ajouter un produit ») :

1. collez le lien du produit chez le fournisseur et touchez **Importer** : le nom, les photos et le prix sont lus
   sur la page quand le site le permet (sinon, remplissez la fiche à la main) ;
2. indiquez le prix fournisseur, la devise (FCFA, €, $, ¥) et les frais de port : le site calcule le **coût en FCFA**,
   le **prix conseillé** avec votre marge et le **bénéfice** ;
3. ajoutez les choix proposés à la cliente (couleur, taille, pointure…) et le délai de livraison.

La marge par défaut (40 %), les taux de change et l'arrondi se règlent dans « Marge & devises ».
Le Marché suit les catégories en vente : un produit d'une autre catégorie reste masqué. Les pages Chaussures et Sacs
proposent en bas « Encore plus de chaussures / sacs » avec les pièces du Marché.

**Quand une cliente commande** :

| Étape | Ce qui se passe |
|---|---|
| Paiement | À la commande uniquement (Wave, Orange Money, Free Money, carte) : c'est vous qui payez le fournisseur. Le serveur revérifie le prix et la disponibilité |
| Onglet Le Marché → « À commander maintenant » | Chaque article, sa couleur/taille, un bouton **Commander** vers la page du fournisseur, le coût et votre bénéfice |
| Vous passez l'étape à « Commandée » (+ n° de commande fournisseur) | La cliente reçoit un WhatsApp |
| « En route vers Dakar » (+ n° de suivi du colis) | WhatsApp avec le numéro de suivi ; la cliente voit les étapes sur la page de suivi |
| « Arrivée à Dakar » | WhatsApp, puis vous confiez la livraison à un livreur comme d'habitude (suivi GPS, relais) |

Les clientes ne voient jamais le fournisseur, son lien ni votre coût d'achat.

## Authenticité : étiquettes anti-contrefaçon

Pour qu'une copie de vos sacs ou de vos chaussures ne puisse pas passer pour une pièce Fabima :

1. **Espace gérant → Authenticité** : choisissez la pièce et le nombre d'étiquettes, puis « Imprimer ».
   Chaque étiquette porte l'écrin sécurisé, un code unique (ex. `K7QM-2HXD-9RP`, impossible à deviner, avec une clé de contrôle contre les fautes de frappe)
   et un QR code. Glissez-en une dans chaque sac ou collez-la sur la boîte.
2. **La cliente scanne le QR** (ou tape le code sur `/authentique`) : le site confirme la pièce et la date d'émission.
   Un code inconnu signale une contrefaçon ; un code vérifié plus de 5 fois signale une étiquette photocopiée.
3. **Trois niveaux de sécurité dans le logo imprimé** : guilloché tissé (comme un billet), micro-texte « FABIMA STORE · DAKAR · AUTHENTIQUE »
   lisible seulement à la loupe, et **marques secrètes** (une ligne du guilloché interrompue, trois micro-points, le cœur de la clé de voûte),
   placées d'après votre clé `AUTH_SECRET`. Leurs emplacements exacts ne s'affichent que dans l'espace gérant : ne les communiquez jamais.

Conseils : imprimez les étiquettes sur papier épais ou autocollant mat, idéalement en dorure à chaud chez un imprimeur de Dakar
(la dorure et le guilloché fin sont très difficiles à photocopier). Côté juridique, déposez la marque « Fabima » (nom et logo)
à l'**OAPI** — l'office qui protège les marques au Sénégal et dans 16 autres pays d'Afrique — par l'intermédiaire de l'**ASPIT** à Dakar :
c'est ce dépôt qui vous permet de faire saisir les contrefaçons.

## Catégories en vente

Pour le moment, la boutique vend **uniquement des chaussures et des sacs** (15 pièces). Les bijoux, accessoires et
vêtements restent prêts dans le catalogue mais sont masqués partout (menu, accueil, recherche, journal, guide des
tailles, assistante). Pour ouvrir une catégorie, ajoutez-la dans `src/config/site.ts` :

```ts
export const SHOP_CATEGORIES: CategoryId[] = ['chaussures', 'sacs', 'bijoux'];
```

Un ancien lien comme `/boutique/bijoux` affiche « Bijoux : bientôt chez Fabima » et propose les chaussures et les sacs ;
l'assistante Fabi répond de la même façon si une cliente demande un bijou ou une robe.

## Modifier le catalogue

Le catalogue de départ est dans `src/data/catalog.ts`. Si vous changez sa structure, augmentez `CATALOG_VERSION` :
les navigateurs qui gardaient l'ancienne version repartent automatiquement du nouveau catalogue.

## Mise en ligne

`npm run build` produit le dossier `dist/`, déployable sur Netlify ou Vercel : les fichiers `public/_redirects`
et `vercel.json` renvoient toutes les adresses vers l'application (sinon un rafraîchissement sur `/boutique/sacs` donnerait une 404).

Avec le serveur Fabima (`npm start`), chaque page reçoit son titre, sa description et son image de partage
(aperçus WhatsApp et Facebook), et `/robots.txt` et `/sitemap.xml` sont générés à partir du catalogue.
Définissez `SITE_URL` (ex. `https://fabimastore.sn`) pour que les liens de partage et le sitemap utilisent votre nom de domaine,
puis déclarez `https://votre-domaine/sitemap.xml` dans Google Search Console.

## À savoir avant la mise en production

- **Données** : catalogue, stocks, avis, commandes, comptes et Marché sont gardés par le serveur dans un fichier
  (`DATA_DIR`, à placer sur un disque persistant). Panier et favoris restent sur le téléphone de la cliente.
  Pour un gros volume, passer à une vraie base de données.
- **Paiement** : la passerelle est simulée dans `pages/Checkout.tsx` (fonction `pay`). À remplacer par l'API Wave Business,
  Orange Money ou un agrégateur (PayDunya, CinetPay…).
- **Commandes** : elles sont gardées par le serveur dans un fichier JSON (`DATA_DIR`) ; il vérifie le format et limite
  les envois, mais ne recalcule pas les montants. Pour un gros volume, passer à une vraie base de données.
- **Espace gérant** : le PIN est vérifié côté navigateur, il ne protège donc qu'une démo. Une authentification serveur est nécessaire en production.
- **Coordonnées** : le téléphone, le WhatsApp, l'e-mail et les réseaux sociaux de `config/site.ts` sont des valeurs d'exemple à remplacer.
- **Photos** : les images proviennent de Pexels ; si une image ne charge pas, un visuel de remplacement s'affiche.
  Remplacez-les par vos propres photos depuis l'espace gérant.
