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
- Limite : la position n'est envoyée que tant que la page du livreur reste ouverte (l'écran est maintenu allumé).

## 7. Restent à traiter avant la mise en ligne

Ces points ne peuvent pas être réglés sans serveur :

1. **Données locales** : ~~le gérant ne voit pas les commandes passées sur le téléphone d'un client~~ → réglé : les commandes sont enregistrées sur le serveur (`/api/orders`) et apparaissent dans l'espace gérant. Le stock et le catalogue restent dans le navigateur ; les montants envoyés par le navigateur ne sont pas recalculés par le serveur. → À terme, une vraie base de données (le backend Express/MySQL d'Allô Béton peut servir de base).
2. **Paiement simulé** : aucun débit réel. → Intégrer Wave Business, Orange Money ou un agrégateur (PayDunya, CinetPay).
3. **Espace gérant** : le code PIN est vérifié dans le navigateur, il ne protège pas réellement. → Authentification côté serveur.
4. **Avis clients** : publiés sans modération ni vérification d'achat. → À valider côté serveur.
5. **Photos et coordonnées** : images Pexels et coordonnées d'exemple à remplacer par les vôtres.
