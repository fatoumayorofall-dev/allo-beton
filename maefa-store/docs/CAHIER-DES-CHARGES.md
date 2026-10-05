# Cahier des charges — Maefa Store

| | |
|---|---|
| **Projet** | Maefa Store : boutique en ligne de chaussures et de sacs pour femme |
| **Porteuse du projet** | Fatoumata Fall, gérante et cheffe de projet |
| **Lieu** | Dakar (Sénégal), livraison dans tout le pays |
| **Version** | 1.0 — octobre 2026 |

---

## 1. Contexte

La gérante est **revendeuse** : elle achète chez des fournisseurs de Dakar et revend à ses clientes,
surtout par WhatsApp. Cette vente « à la main » pose plusieurs problèmes :

- les clientes demandent sans cesse les photos, les couleurs, les tailles et les prix ;
- l'adresse de livraison est floue : beaucoup de clientes ne savent pas lire une carte et ne
  connaissent pas le nom exact de leur quartier ;
- les livraisons du jour se font sans ordre, avec des allers-retours coûteux ;
- les autres revendeurs copient les prix affichés publiquement ;
- la cliente ne sait pas où est son colis.

## 2. Objectifs

| N° | Objectif | Indicateur de réussite |
|---|---|---|
| O1 | Présenter le catalogue en ligne, sur téléphone comme sur ordinateur | 100 % des articles visibles avec photos et vidéos |
| O2 | Recevoir les demandes d'achat structurées sur WhatsApp | chaque demande porte une référence unique (DEM-XXXXX) |
| O3 | Garder les prix confidentiels vis-à-vis des autres revendeurs | aucun prix exact visible sans le lien de la gérante |
| O4 | Obtenir une adresse de livraison précise et compréhensible par le livreur | point GPS + repère connu pour chaque commande |
| O5 | Réduire les distances de livraison | ordre de tournée calculé automatiquement |
| O6 | Informer la cliente en temps réel | suivi du livreur sur la carte, notifications |
| O7 | Être utilisable par une personne peu à l'aise avec l'écrit | assistante en wolof, mode simple, notes vocales |

## 3. Acteurs

| Acteur | Rôle |
|---|---|
| **Cliente** | parcourt, demande un article, finalise sa commande, suit sa livraison, gère son compte |
| **Gérante** | répond aux demandes (disponibilité, prix convenu), gère le catalogue, les commandes, les tournées, les statuts WhatsApp |
| **Livreur** | suit sa tournée arrêt par arrêt, partage sa position, confirme la remise |
| **Système** | contrôle les commandes, calcule les tournées, envoie les notifications |

## 4. Exigences fonctionnelles

### 4.1 Catalogue
- **EF-01** Afficher les articles par catégorie (chaussures, sacs), avec photos, vidéo, couleurs et tailles.
- **EF-02** Filtrer par catégorie, couleur, occasion et **classe de prix** ; trier.
- **EF-03** Afficher une **classe de prix** (« 20 000 – 30 000 F ») et jamais le prix exact au public.
- **EF-04** Rechercher un article par son nom.
- **EF-05** Vérifier l'authenticité d'une pièce par un code.

### 4.2 Demande et commande
- **EF-06** « Acheter » enregistre une **demande** (référence DEM-XXXXX) et ouvre WhatsApp avec son détail.
- **EF-07** La gérante répond « disponible » ou « pas disponible », et peut fixer un **prix convenu** par article.
- **EF-08** La cliente finalise la commande uniquement par le **lien envoyé par la gérante**.
- **EF-09** Paiement par Wave, Orange Money ou à la livraison ; frais de livraison selon la zone (jamais nuls).
- **EF-10** Pièces épuisées vendables « sur commande » avec un délai.

### 4.3 Livraison
- **EF-11** Choix du point de livraison sur une carte plein écran, avec GPS précis.
- **EF-12** Proposition des **lieux connus** autour du point (mosquée, pharmacie, école, arrêt…) comme repère.
- **EF-13** Enregistrement de plusieurs adresses (Maison, Bureau, Chez maman…).
- **EF-14** Calcul de la **tournée optimale** pour les commandes du jour.
- **EF-15** Suivi du livreur en direct par la cliente ; notification au départ de chaque arrêt.

### 4.4 Compte et données
- **EF-16** Connexion par numéro de téléphone (code SMS) ou code personnel.
- **EF-17** Historique des commandes, favoris, adresses.
- **EF-18** **Télécharger ses données** et **supprimer son compte** (loi 2008-12).

### 4.5 Assistance
- **EF-19** Assistante « Maé » : conseille et répond en français et en wolof, sans connexion à un service payant.
- **EF-20** Notes vocales de la gérante pour les personnes qui lisent difficilement.

### 4.6 Gestion (gérante)
- **EF-21** Tableau de bord : demandes, commandes, clientes, statistiques.
- **EF-22** Gestion du catalogue (ajout, modification, stock, vidéo).
- **EF-23** Création d'images de statut WhatsApp et d'une vitrine de nouveautés.

## 5. Exigences non fonctionnelles

| Code | Exigence | Mesure retenue |
|---|---|---|
| ENF-01 | **Performance** sur réseau mobile 3G/4G | miniatures 540 px, compression, cache hors ligne, code découpé par page |
| ENF-02 | **Charge** | 200 commandes simultanées sans erreur (test réalisé) |
| ENF-03 | **Sécurité** | HTTPS, contrôle serveur des prix et totaux, codes chiffrés (scrypt), jetons signés, limites de débit, CSP |
| ENF-04 | **Confidentialité** | conformité à la loi n° 2008-12 (CDP) : politique, accès, effacement |
| ENF-05 | **Disponibilité** | hébergement cloud, sauvegarde atomique des données, arrêt propre |
| ENF-06 | **Compatibilité** | téléphones Android et iPhone, navigateurs récents, application installable (PWA) |
| ENF-07 | **Accessibilité** | contrastes vérifiés, textes lisibles, mode simple, voix |
| ENF-08 | **Maintenabilité** | TypeScript, ESLint, Prettier, documentation, tests automatisés |
| ENF-09 | **Portabilité** | Docker, version WAMP hors ligne |

## 6. Contraintes

- Budget minimal : services gratuits ou peu coûteux (OpenStreetMap plutôt que Google Maps, IA locale).
- Équipe d'une personne : développement assisté par l'IA, cheffe de projet unique.
- Aucune copie de grande marque dans le catalogue (risque juridique et de blocage des plateformes).

## 7. Architecture retenue

Application web progressive (React + TypeScript) et API REST (Node.js + Express). Persistance
JSON ou PostgreSQL (ORM). Voir [`ARCHITECTURE.md`](ARCHITECTURE.md) et [`MERISE.md`](MERISE.md).

## 8. Livrables

| Livrable | Emplacement |
|---|---|
| Application en ligne | https://maefa-store.onrender.com |
| Code source | dépôt GitHub (dossier `maefa-store`) |
| Paquet hors ligne | `maefa-wamp.zip` |
| Dossier technique, MERISE, API | `docs/` |
| Tests automatisés | `tests/e2e/`, `scripts/eval-assistant/` |

## 9. Planning réalisé

| Période | Étape |
|---|---|
| Janvier – juillet 2026 | Logiciel de gestion « Allô Béton » (base technique réutilisée : serveur, SMS, tableaux de bord) |
| 22 – 23 septembre 2026 | Première boutique, thème, assistante, compte par téléphone, carte de livraison |
| 24 – 30 septembre 2026 | Catalogue chaussures et sacs, vidéos, authenticité, statuts WhatsApp, audits |
| 1 – 2 octobre 2026 | GPS précis façon Yango, tournées optimisées, achat par WhatsApp, repères et adresses |
| 2 – 5 octobre 2026 | Prix confidentiels, marchandage, qualité (ESLint, Prettier), tests, CI/CD, Docker, documentation |
