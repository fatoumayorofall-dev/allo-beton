# Audit fonctionnel — Fabima Store

Audit de la première version de la boutique, puis corrections et refonte visuelle « premium ».
Chaque correction a été vérifiée par un test automatisé dans un navigateur (Chromium) sur ordinateur (1440 px, 1024 px) et mobile (390 px).

## 1. Bugs de logique métier (corrigés)

| # | Problème constaté | Conséquence | Correction |
|---|---|---|---|
| 1 | L'annulation d'une commande ne remettait pas les articles en stock | Stock sous-évalué, articles affichés « épuisés » à tort | Annulation → remise en stock ; réactivation → nouveau retrait |
| 2 | Le panier gardait l'ancien prix quand le gérant modifiait un produit | Commande facturée à un prix périmé | Le panier se réaligne automatiquement sur le catalogue (prix, nom, image) |
| 3 | Un article supprimé ou épuisé restait commandable depuis le panier | Commande d'un produit inexistant | Retiré du panier automatiquement ; quantité plafonnée au stock |
| 4 | L'ajout répété au panier pouvait dépasser le stock (plusieurs tailles/couleurs d'un même article) | Survente | Contrôle du stock total par article, message explicite |
| 5 | Le code `FABIMA5000` s'appliquait sous 40 000 FCFA sans aucune réduction ni message | Client perdu, sentiment de bug | Minimum défini dans `config/site.ts`, montant manquant affiché |

## 2. Défauts d'expérience (corrigés)

| # | Problème | Correction |
|---|---|---|
| 6 | Code promo perdu au rechargement de la page | Conservé dans le navigateur |
| 7 | Coordonnées à ressaisir à chaque commande | Mémorisées sur l'appareil (case cochée par défaut, effaçables depuis « Mes commandes ») |
| 8 | Aucun historique de commandes côté client | Nouvelle page **Mes commandes** |
| 9 | La touche Échap ne fermait ni le panier, ni les fenêtres ; la page défilait derrière la recherche | Échap + blocage du défilement sur tous les panneaux |
| 10 | Impossible de laisser un avis | Formulaire d'avis avec note, moyenne recalculée |
| 11 | Un article avec tailles obligeait à ouvrir sa fiche pour l'ajouter | Ajout rapide avec choix de la taille directement sur la carte + aperçu rapide |
| 12 | Boutons radio des filtres sans groupe (navigation clavier incohérente) | Groupes nommés, focus visible |
| 13 | Animations imposées même si l'utilisateur les a désactivées dans son système | Respect de « réduire les animations » |
| 14 | Un rafraîchissement sur une page interne (ex. `/boutique/sacs`) donnait une erreur 404 une fois en ligne | Fichiers de réécriture `public/_redirects` (Netlify) et `vercel.json` (Vercel) |

## 3. Nouveautés

- **Emballage cadeau signature** (+2 000 FCFA) avec mot personnalisé, repris sur la confirmation et dans l'espace gérant.
- **« Complétez votre look »** dans le panier et sur la fiche produit.
- **Shop the look** sur l'accueil : une silhouette avec points cliquables vers chaque pièce.
- **Zoom** au survol de la photo produit, **partage** (partage natif sur mobile, copie du lien sinon).
- **Barre d'achat collante** sur mobile quand on fait défiler la fiche produit.
- **Pagination « Voir plus »** du catalogue (12 pièces par page).
- **Export CSV** des commandes pour Excel (espace gérant).
- L'espace gérant est chargé à part : les clients ne téléchargent plus son code.

## 4. Refonte visuelle

- Typographie de maison de couture : *Cormorant Garamond* (titres) + *Manrope* (texte).
- Palette ivoire / encre / or / bordeaux, angles droits, filets dorés, libellés en petites capitales espacées.
- En-tête sur deux niveaux, logo centré, **méga-menu** par univers (types, sélections, pièce iconique), transparent au-dessus du visuel d'accueil.
- Accueil éditorial : visuel plein écran avec effet de zoom lent, grain photo et barre de progression ; manifeste ; univers en mosaïque ; atelier Teranga ; bandeau défilant ; avis en carrousel ; grille #FabimaStyle.
- Apparition des sections au défilement, transitions adoucies, visuel de remplacement élégant si une photo ne charge pas.

## 5. Deuxième passe : fond, forme, contenu

**Contenu**
- Catalogue recentré sur la femme (30 pièces) : les articles homme sont remplacés par des ballerines, sandales perlées, compensées en raphia, sac seau, capeline, robe de soirée, grand boubou femme…
- Chaque pièce a désormais ses occasions, sa matière, ses conseils d'entretien et un conseil de style.
- Le journal : 4 articles (invitée de mariage, foulard, Tabaski & Korité, entretien du cuir) reliés aux produits.
- FAQ enrichie (commander pour offrir, alerte de retour en stock).

**Fond**
- Navigation par occasion (filtre du catalogue, section d'accueil, méga-menu, menu mobile, recherche).
- Alerte « Victime de son succès » sur les pièces épuisées, visible par la gérante.
- « Ajouter tout le look » avec choix des tailles, idées cadeaux par budget.
- Référencement : description et aperçu de partage propres à chaque page, données structurées produit (prix, stock, note) pour Google.
- Migration automatique des navigateurs qui gardaient l'ancien catalogue (`CATALOG_VERSION`).

**Forme**
- Sections d'accueil « Une tenue pour chaque moment », « Idées cadeaux pour elle », « Le journal ».
- Fiche produit : pastilles d'occasion, encart « Le conseil de Fabima », onglet matière & entretien.
- Pages journal éditoriales (article, astuce, produits cités, « À lire aussi »).

## 6. Livraison : point GPS et suivi du livreur en direct

- À la commande, la cliente touche « Je suis ici » (GPS), cherche un lieu connu ou fait glisser la carte : elle n'a plus à expliquer le chemin. La zone et les frais se règlent tout seuls.
- La gérante voit le point sur la carte (lien Google Maps) et confie la livraison à un livreur, qui reçoit un lien secret.
- Le livreur démarre la course ; sa position est envoyée toutes les 4 secondes. La cliente reçoit un WhatsApp « en route » avec le lien de suivi, puis « il arrive » à moins de 400 m, puis « livrée ».
- Livraison en relais (jusqu'à 6 étapes : moto → car longue distance → moto…) : un lien par livreur, rendez-vous au point de relais sur la carte, passage de relais validé par celui qui donne ou celui qui reçoit, messages WhatsApp à chaque étape.
- Limite : la position n'est envoyée que tant que la page du livreur reste ouverte (l'écran est maintenu allumé).

## 7. Boutique chaussures & sacs : passage « expert »

- Catalogue publié sur le serveur : les modifications de la gérante sont vues par toutes les clientes (avant : seulement sur son appareil).
- Stock partagé, vérifié avant paiement (plus de survente ni de prix modifié), rendu à l'annulation.
- Vente « sur commande » des pièces épuisées, paiement à la commande.
- Avis et alertes de retour en stock gardés par le serveur (avant : perdus sur le téléphone de la cliente).
- Le Marché limité aux chaussures et aux sacs, proposé en bas des pages Chaussures et Sacs.
- Accueil plus vivant : bulles « Trouvez votre style », profondeur au défilement, chiffres animés, compteur du panier animé, badge « Plus que N ».

## 8. Audit « site moderne 2026 » et nouveau logo

Mesures faites sur 9 pages (accueil, chaussures, fiche sac, panier, Marché, suivi, compte, journal, FAQ), sur un téléphone Pixel 7 simulé, avec axe-core (le moteur d'accessibilité de Lighthouse). Décalage de mise en page (CLS) : 0 sur 8 pages, 0,08 sur la page de suivi (seuil « bon » : 0,1).

| | Avant | Après |
|---|---|---|
| Problèmes d'accessibilité (axe) | 185 | 0 |
| JavaScript au premier chargement (compressé) | 148 Ko | 123 Ko |
| Grande photo d'accueil | chargement différé, taille unique 1600 px | prioritaire, taille adaptée à l'écran (affichée vers 0,3 s en local) |
| Polices | Google Fonts (2 domaines externes, feuille bloquante) | hébergées par le site, préchargées |
| robots.txt / sitemap.xml | absents (renvoyaient la page d'accueil) | générés par le serveur (26 adresses avec photos) |
| Image d'aperçu des liens WhatsApp / Facebook | aucune | image dédiée + photo de la pièce sur chaque fiche |

**Nouvelle identité**
- Monogramme : un sac à main dont l'anse dessine une arche (le motif des photos du site), marqué d'un F calligraphié en or rose. Nom FABIMA en capitales Cormorant, « STORE · DAKAR » en dessous.
- Entièrement vectorisé (`components/Logo.tsx`) : net sur tous les écrans, aucune police à attendre. Le sac se balance au survol.
- Déclinaisons : favicon (version claire automatique si l'onglet est sombre), icônes de l'application (192, 512, masquable, Apple), image de partage 1200 × 630 (`public/og-image.jpg`), pied de page, panier vide, écran de chargement, page livreur, pages statut.
- Fichiers prêts pour Instagram, flyers et étiquettes : `public/brand/` (logo fond clair, logo fond sombre, monogramme).

**Accessibilité**
- Contrastes : les textes gris trop pâles (2,1 à 4,0 : 1) passent à 5,2 : 1 ou plus ; le rose doré foncé des libellés est assombri (4,5 → 5,6 : 1) ; le bouton dégradé or est lisible en blanc.
- Contour de focus au clavier bien visible (framboise sur fond clair, rose doré sur fond sombre).
- Pastilles de couleur et étoiles lisibles par les lecteurs d'écran, note annoncée « 4,9 sur 5 », ancien prix annoncé « au lieu de ».
- Tri du catalogue et du Marché étiquetés, ordre des titres corrigé, bandeau d'annonces et boutons flottants dans des zones repérables, défilement des étapes du Marché accessible au clavier.
- Indicateurs de diaporama et de photos agrandis à 24 px de hauteur tactile (règle WCAG 2.2).

**Vitesse**
- Pages secondaires (panier, commande, compte, journal, FAQ…) et assistante chargées à la demande, puis préchargées quand le téléphone est libre.
- Photo principale (accueil, fiche produit) téléchargée en priorité ; photos proposées en plusieurs tailles, le téléphone prend la plus légère.
- Polices hébergées par le site ; fichiers versionnés gardés en cache un an.

**Référencement et partage**
- Chaque page reçoit du serveur son titre, sa description, son adresse de référence et son image : un lien de fiche envoyé sur WhatsApp montre la photo, le nom et le prix de la pièce.
- Données structurées Google (boutique à Dakar, horaires, moyens de paiement, recherche dans le site) ; les liens courts `/p/…` renvoient vers la fiche produit comme adresse de référence.
- Pages privées (espace gérant, livreur, commande, compte) exclues des moteurs de recherche.

**Touches 2026**
- En-tête « îlot » en verre dépoli qui flotte au défilement.
- Ajout rapide : la photo de la pièce s'envole jusqu'au panier, qui rebondit.
- Titres équilibrés sur plusieurs lignes, paragraphes sans mot orphelin.
- Animations coupées si le téléphone demande moins de mouvement.

## 9. Logo v2 et accueil repensé (maquette Figma)

Fichier Figma : « Fabima Store — Identité & Accueil 2026 » (page 01 · Logo : charte ; page 02 · Accueil : maquettes ordinateur et mobile, composants Bouton et Carte produit).

**Logo v2**
- Monogramme reconstruit sur une grille de 100 : anse en demi-cercle parfait, corps trapèze à 8°, couture maroquinerie, F renforcé pour rester lisible en petit.
- Nom en Cormorant plus présent (graisse 650) avec espacement optique ; ligne STORE ◆ DAKAR justifiée sur la largeur exacte du nom.
- Nouvelles déclinaisons : logo empilé (format carré), monogramme une couleur (gravure, tampon, marquage cuir), favicon renforcé.

**Accueil**
- Page 45 % plus courte (6 150 px au lieu de 11 160 sur ordinateur) : 15 sections → 9, sans perdre de contenu utile.
- Héros en deux colonnes sur fond clair : titre, deux boutons (chaussures / sacs), preuve sociale (4,8/5), photo en arche et « pièce du moment ».
- Barre de confiance juste sous le héros (livraison 24 h, suivi, Wave / Orange Money, échange 7 jours) au lieu d'une section en bas de page.
- Univers en grille « bento » : Chaussures, Sacs, Nouveautés et Petits prix (qui remplace le bloc idées cadeaux).
- Avis en trois cartes lisibles d'un coup d'œil au lieu d'un carrousel.
- Retirés : manifeste, bandeau défilant, occasions en double avec le menu, journal, section #FabimaStyle vide (aucune photo), services en double.
- Une seule écriture calligraphique par écran ; titres en Cormorant avec fin en italique.

## 10. Restent à traiter avant la mise en ligne

Ces points ne peuvent pas être réglés sans serveur :

1. **Données** : ~~commandes, catalogue et stock propres à chaque navigateur~~ → réglé : commandes, catalogue, stock, avis et alertes sont gardés par le serveur, qui vérifie prix et stock. Les frais de livraison et remises restent calculés par le navigateur. → À terme, une vraie base de données (le backend Express/MySQL d'Allô Béton peut servir de base).
2. **Paiement simulé** : aucun débit réel. → Intégrer Wave Business, Orange Money ou un agrégateur (PayDunya, CinetPay).
3. **Espace gérant** : le code PIN est vérifié dans le navigateur, il ne protège pas réellement. → Authentification côté serveur.
4. **Avis clients** : publiés sans modération ni vérification d'achat. → À valider côté serveur.
5. **Photos et coordonnées** : images Pexels et coordonnées d'exemple à remplacer par les vôtres.
