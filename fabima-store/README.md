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

## Fonctionnalités

| Côté client | Côté gérant (`/admin`, PIN démo : `2026`) |
|---|---|
| Accueil : carrousel, catégories, best-sellers / nouveautés / promos, avis clients | Tableau de bord : CA, commandes, panier moyen, ventes par catégorie, stock faible |
| Catalogue filtrable (catégorie, femme/homme, type, prix, couleur, stock, promo) et triable | Commandes : filtre par statut, changement de statut, paiement reçu, contact WhatsApp |
| Fiche produit : galerie, couleurs, tailles, stock, avis, guide des tailles, commande WhatsApp | Produits : ajout, modification, suppression, restauration du catalogue |
| Recherche instantanée, favoris, articles vus récemment | |
| Panier latéral + page panier, codes promo, livraison offerte dès 50 000 FCFA | |
| Commande en 2 étapes (livraison → paiement), validation du numéro sénégalais | |
| Confirmation imprimable, suivi de commande par n° + téléphone | |
| FAQ, frais de livraison, guide des tailles, page « Notre histoire » | |

Codes promo de démonstration : `BIENVENUE` (-10 %), `FABIMA5000` (-5 000 FCFA dès 40 000), `LIVRAISON` (livraison offerte).

## Organisation

```
src/
├── config/site.ts         # Coordonnées, WhatsApp, zones & frais de livraison, codes promo, PIN admin
├── data/catalog.ts        # Catégories et catalogue initial (30 articles)
├── data/types.ts          # Types Produit, Panier, Commande
├── context/StoreContext   # État global : produits, panier, favoris, commandes, notifications
├── components/            # Navbar, Footer, panier latéral, carte produit, recherche…
└── pages/                 # Accueil, Boutique, Produit, Panier, Commande, Confirmation, Suivi, Favoris, FAQ, À propos, Admin
```

## À savoir avant la mise en production

- **Données** : le catalogue, les paniers et les commandes sont conservés dans le navigateur (`localStorage`).
  Pour une vraie boutique multi-appareils, brancher `StoreContext` sur une API (le backend Express/MySQL d'Allô Béton peut servir de base).
- **Paiement** : la passerelle est simulée dans `pages/Checkout.tsx` (fonction `pay`). À remplacer par l'API Wave Business,
  Orange Money ou un agrégateur (PayDunya, CinetPay…).
- **Espace gérant** : le PIN est vérifié côté navigateur, il ne protège donc qu'une démo. Une authentification serveur est nécessaire en production.
- **Coordonnées** : le téléphone, le WhatsApp, l'e-mail et les réseaux sociaux de `config/site.ts` sont des valeurs d'exemple à remplacer.
- **Photos** : les images proviennent de Pexels ; si une image ne charge pas, un visuel de remplacement s'affiche.
  Remplacez-les par vos propres photos depuis l'espace gérant.
