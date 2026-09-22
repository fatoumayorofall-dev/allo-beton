# Fabima Store — Boutique de mode en ligne

Boutique e-commerce de mode (chaussures, sacs, accessoires, bijoux, prêt-à-porter) inspirée de la boutique **Allô Béton** :
même pile technique (React + TypeScript + Tailwind + Vite), même logique commerciale adaptée au Sénégal
(prix en FCFA, zones de livraison dakaroises, paiement Wave / Orange Money / Free Money / carte / espèces, commande WhatsApp).

## Démarrer

```bash
cd fabima-store
npm install
npm run dev        # http://localhost:5174
npm run build      # vérification TypeScript + build de production dans dist/
```

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
├── data/catalog.ts        # Catégories et catalogue initial (30 articles)
├── data/types.ts          # Types Produit, Panier, Commande
├── context/StoreContext   # État global : produits, panier, favoris, commandes, avis, notifications
├── utils/hooks.ts         # Échap, blocage du défilement, apparition au défilement
├── components/            # Navbar, Footer, panier latéral, carte produit, recherche…
└── pages/                 # Accueil, Boutique, Produit, Panier, Commande, Confirmation, Suivi, Mes commandes, Favoris, FAQ, Maison, Admin
```

Le rapport d'audit (bugs corrigés, nouveautés, points restants) est dans [`AUDIT.md`](AUDIT.md).

## Mise en ligne

`npm run build` produit le dossier `dist/`, déployable sur Netlify ou Vercel : les fichiers `public/_redirects`
et `vercel.json` renvoient toutes les adresses vers l'application (sinon un rafraîchissement sur `/boutique/sacs` donnerait une 404).

## À savoir avant la mise en production

- **Données** : le catalogue, les paniers et les commandes sont conservés dans le navigateur (`localStorage`).
  Pour une vraie boutique multi-appareils, brancher `StoreContext` sur une API (le backend Express/MySQL d'Allô Béton peut servir de base).
- **Paiement** : la passerelle est simulée dans `pages/Checkout.tsx` (fonction `pay`). À remplacer par l'API Wave Business,
  Orange Money ou un agrégateur (PayDunya, CinetPay…).
- **Espace gérant** : le PIN est vérifié côté navigateur, il ne protège donc qu'une démo. Une authentification serveur est nécessaire en production.
- **Coordonnées** : le téléphone, le WhatsApp, l'e-mail et les réseaux sociaux de `config/site.ts` sont des valeurs d'exemple à remplacer.
- **Photos** : les images proviennent de Pexels ; si une image ne charge pas, un visuel de remplacement s'affiche.
  Remplacez-les par vos propres photos depuis l'espace gérant.
