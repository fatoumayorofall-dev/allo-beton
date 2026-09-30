# Maé — assistante conversationnelle français / wolof de Maefa

Maé est une conseillère de vente qui fonctionne **entièrement dans le téléphone de la cliente** :
aucun service payant, aucune donnée envoyée, réponse en environ 1 ms. Si une clé d'IA générative
est configurée sur le serveur (`ANTHROPIC_API_KEY`), l'IA prend le relais pour les conversations libres. Sinon,
c'est ce moteur qui répond, et c'est le cas aujourd'hui.

## Architecture

```
phrase de la cliente
   │
   ├─ 1. normalize()        nlu.ts     minuscules, accents, graphies wolof (kh→x, gn/ny→ñ, dieu→jë, ou→u…),
   │                                   lettres doublées, lexique de variantes (beug→bëgg, khonk→xonq…)
   ├─ 2. detectLang()       nlu.ts     wolof / français par mots marqueurs (code-switching toléré)
   ├─ 3. extractSlots()     slots.ts   type d'article, sous-type, occasion, couleur, budget (chiffres,
   │                                   « 16k », « fukk ak juróom mille », « ñetti junni »), pointure,
   │                                   modèle cité, ville de livraison, n° de commande
   ├─ 4. understand()       brain.ts   mémoire exacte (messages courts) → sinon modèle hybride :
   │                                   bayésien naïf (mots, paires, morceaux de 4 lettres) + mots-indices
   ├─ 5. gestion du dialogue brain.ts  état : souhaits, questions posées, pièces montrées, langue, tour
   │                                   une question à la fois ; bouton touché = réponse à la question
   └─ 6. génération         brain.ts   réponse FR ou WO, pièces présentées (lien, prix, conseil, autres
                                       couleurs), arguments de vente vrais, boutons de réponse
```

| Fichier | Rôle |
|---|---|
| `nlu.ts` | Normalisation, lexique wolof, classifieur bayésien naïf, détection de langue, `nre()` (motifs sûrs) |
| `training.ts` | ~640 phrases d'entraînement (34 intentions) + mots-indices par intention |
| `slots.ts` | Extraction des détails ; nombres et argent en wolof |
| `brain.ts` | Compréhension, dialogue, réponses, vente |
| `../utils/shopAdvisor.ts` | Recommandation (filtres, score, un modèle par famille) partagée avec le parcours en boutons |
| `../data/wolofGuide.ts` | Guide vocal en wolof (voix enregistrées par la gérante) |

## Choix linguistiques (wolof)

- **Orthographe** : on accepte l'orthographe officielle (CLAD : *bëgg, ñuul, xonq, jërëjëf*) et les graphies
  « à la française » ou SMS (*beug, gnoul, khonk, dieuredieuf*). Les deux donnent la même compréhension :
  c'est testé sur des paires de phrases.
- **Réponses** : wolof courant de Dakar, phrases courtes. On garde les mots français que tout le monde utilise
  (*commande, livraison, panier, pointure, Wave*). Les prix sont écrits en chiffres.
- **Politesse** : Maé rend le salut tel qu'il est donné (*Salaam aleekum* → *Maalekum salaam* ; *Na nga def ?* →
  *Maa ngi fi rekk, alxamdulilaa*). Elle dit *soxna si* quand elle ne connaît pas le prénom, le prénom sinon,
  et *Dewenati* autour de la Tabaski et de la Korité.
- **Argent** : compte traditionnel, *junni* = 1 000 dërëm = 5 000 F (*ñetti junni* = 15 000 F) ;
  compte à la française avec *mille* (*fukk ak juróom mille* = 15 000 F). **À valider par la gérante.**
- **Voix en wolof = la voix de la gérante** : aucun téléphone ne sait lire le wolof à voix haute. La gérante
  enregistre 17 phrases types (`src/data/wolofVoices.ts`, Admin > Statut WhatsApp) et les 6 sujets du guide.
  En wolof, chaque réponse de Maé fait écouter la phrase qui correspond : accueil, question de la vendeuse, pièces
  apportées, confiance, hésitation, paiement… (`voiceForReply`). Un bouton **Déglu** permet de réécouter.
  Une phrase pas encore enregistrée reste seulement écrite. Les réponses en français ont un bouton « Écouter »
  (voix du téléphone).

## Vente : règles d'honnêteté (testées automatiquement)

Arguments autorisés, parce qu'ils sont vrais : paiement en espèces à la livraison, vérification devant le livreur,
24 h à Dakar, vraie équipe sur WhatsApp, pièce assortie pour compléter le look, vraies dates des fêtes, montant
manquant pour la livraison offerte.

Interdits : fausse rareté (« dernières pièces », « plus que 2 »), fausses promotions, faux avis, grandes marques
pour vanter une copie. Si elle ne connaît pas une information (par exemple les dimensions), elle le dit et
renvoie vers WhatsApp.

## Évaluation

```
npm run eval:assistant -- --offline
```

Le rapport `scripts/eval-assistant/rapport.md` contient la fiche d'évaluation et toutes les conversations.

| Mesure | Résultat |
|---|---|
| Examen sur 72 phrases jamais apprises | **99 %** |
| Validation croisée à 5 plis (640 phrases) | **74 %**. C'est la mesure la plus sévère : on retire aussi des phrases très courtes et uniques. Les mots-indices ont été choisis en connaissant les phrases d'entraînement, donc ce chiffre est un peu optimiste. |
| Audit sur 87 messages imprévus | 0 incompris (une partie de ces messages a depuis été apprise) |
| Orthographes wolof (officielle / SMS) | 11 paires sur 11 comprises pareil |
| Détection de la langue | 14 sur 14 |
| Argent en wolof | 8 sur 8 |
| Temps de réponse | environ 1 ms |

Méthodes comparées avant de choisir (validation croisée / examen) :

| Méthode | Validation croisée | Examen |
|---|---|---|
| Bayésien naïf seul | 61 % | 96 % |
| TF-IDF, k plus proches voisins (k = 5) | 61 % | 85 % |
| TF-IDF, centroïdes | 61 % | 89 % |
| **Hybride : bayésien + mots-indices (poids 4)** | **74 %** | **99 %** |

## Faire progresser Maé

1. **Nouvelle façon de dire** : ajouter la phrase dans la bonne liste de `training.ts`. Si le mot est
   décisif, l'ajouter aussi aux `CUES`.
2. **Nouvelle graphie wolof** : ajouter la variante dans `LEXICON` (`nlu.ts`).
3. **Vérifier** : ajouter une phrase **jamais apprise** dans `scripts/eval-assistant/examen.mjs`, puis lancer
   l'évaluation. Ne jamais recopier une phrase d'examen dans l'entraînement : l'examen ne mesurerait plus rien.
