# Kit d'impression Maefa

Tous les fichiers sont dans `pdf/` (texte vectoriel, polices intégrées) ; des aperçus sont dans `apercus/`.

**À dire à l'imprimeur**
- Les fichiers avec fonds perdus ont 3 mm de plus de chaque côté (2 mm pour les autocollants) : c'est normal, c'est la marge de coupe.
- Les couleurs sont en RVB : demander la conversion en quadri (CMJN). Couleurs de la marque : prune #3A1F2D, crème #FDF7F5, or rose #C48A82, framboise #B03A64.
- Pour un rendu luxe : dorure à chaud or rose sur le monogramme et le nom (cartes de visite, boîtes, sacs).
- Boîtes et sacs : caler les visuels sur le gabarit (plan de découpe) du fournisseur.

**Vos coordonnées** : modifier `source/config.json` (téléphone, WhatsApp, e-mail, Instagram, site, adresse, NINEA, RC), puis relancer `node source/build.cjs` — ou demander à Claude de régénérer.

| Fichier | Support | Format fini | Fonds perdus | Pages | Conseil |
|---|---|---|---|---|---|
| `01-carte-de-visite.pdf` | Carte de visite | 85 × 55 mm | 3 mm | 2 | Papier couché mat 350 g, pelliculage soft-touch. Idéal : dorure à chaud or rose sur le recto. |
| `02-facture-A4.pdf` | Facture A4 | 210 × 297 mm | aucun | 1 | À remplir à l’ordinateur ou à la main. Papier 90 g. |
| `03-carnet-factures-A5.pdf` | Carnet de factures A5 | 148 × 210 mm | aucun | 1 | Carnet autocopiant (original + duplicata), 50 liasses numérotées, reliure en tête. |
| `04-bon-de-livraison-A5.pdf` | Bon de livraison A5 | 148 × 210 mm | aucun | 1 | Carnet autocopiant (un exemplaire pour la cliente, un pour la boutique). |
| `05-tampon-rond-40mm.pdf` | Tampon rond Ø 40 mm | 40 × 40 mm | aucun | 1 | Tampon encreur Ø 40 mm (type Trodat 46040). Fichier en une couleur, taille réelle. |
| `06-tampon-societe-60x25.pdf` | Tampon société 60 × 25 mm | 60 × 25 mm | aucun | 1 | Tampon rectangulaire 60 × 25 mm (type Trodat 4915). Pour factures et bons. |
| `07-tampons-paye-livre.pdf` | Tampons PAYÉ / LIVRÉ 50 × 20 mm | 50 × 20 mm | aucun | 2 | Deux petits tampons dateurs 50 × 20 mm. |
| `08-carte-remerciement-10x15.pdf` | Carte de remerciement 10 × 15 cm | 100 × 150 mm | 3 mm | 2 | Carte 350 g mat. Écrivez le prénom de la cliente sur les lignes : l’effet est garanti. |
| `09-etiquette-volante-50x90.pdf` | Étiquette volante 50 × 90 mm | 50 × 90 mm | 3 mm | 2 | Carton 400 g, trou Ø 5 mm, attache en cordon or rose ou ruban prune. |
| `10-autocollant-sceau-50mm.pdf` | Autocollant sceau Ø 50 mm | 50 × 50 mm | 2 mm | 1 | Autocollant rond Ø 50 mm, papier ou vinyle, découpe à la forme. Pour fermer le papier de soie et les pochettes. |
| `11-planche-sceaux-A4.pdf` | Planche de 15 sceaux (A4) | 210 × 297 mm | aucun | 1 | Pour imprimer vous-même sur feuilles autocollantes A4, puis découper. |
| `12-autocollant-merci-70x30.pdf` | Autocollant « Jërëjëf » 70 × 30 mm | 70 × 30 mm | 2 mm | 1 | Pour fermer les colis et les sachets. |
| `13-etiquette-colis-100x150.pdf` | Étiquette colis 100 × 150 mm | 100 × 150 mm | aucun | 1 | Format des imprimantes d’étiquettes thermiques 100 × 150 mm, ou papier autocollant. |
| `14-sac-shopping-face-26x33.pdf` | Sac shopping — face (×2) 26 × 33 cm | 260 × 330 mm | 3 mm | 1 | Sac papier 170 g, poignées cordon or rose ou ruban satin prune. Dimensions à caler sur le gabarit de votre fournisseur. |
| `15-sac-shopping-soufflet-10x33.pdf` | Sac shopping — soufflet (×2) 10 × 33 cm | 100 × 330 mm | 3 mm | 1 |  |
| `16-sachet-bijou-pochette-15x20.pdf` | Petit sachet 15 × 20 cm | 150 × 200 mm | 3 mm | 1 | Sachet papier ou kraft pour les petites commandes. |
| `17-boite-chaussures-couvercle-33x20.pdf` | Boîte à chaussures — dessus du couvercle 33 × 20 cm | 330 × 200 mm | 3 mm | 1 | Carton rigide recouvert, ou boîte kraft + autocollant. Prévoir la dorure sur le monogramme. |
| `18-boite-chaussures-cote-33x12.pdf` | Boîte à chaussures — côté 33 × 12 cm | 330 × 120 mm | 3 mm | 1 |  |
| `19-boite-sac-couvercle-35x28.pdf` | Boîte à sac — dessus du couvercle 35 × 28 cm | 350 × 280 mm | 3 mm | 1 |  |
| `20-papier-de-soie-50x70.pdf` | Papier de soie — motif 50 × 70 cm | 500 × 700 mm | aucun | 1 | Papier de soie blush imprimé une couleur (or rose), ou blanc imprimé prune. |
| `21-carte-cadeau.pdf` | Carte cadeau 85 × 55 mm | 85 × 55 mm | 3 mm | 2 | Carte 350 g, numérotée à la main. Idéale pour Korité, Tabaski, mariages et baptêmes. |
| `22-carte-fidelite.pdf` | Carte de fidélité 85 × 55 mm | 85 × 55 mm | 3 mm | 2 | À tamponner avec le tampon rond à chaque achat. Règle modifiable dans config.json. |
| `23-flyer-A5.pdf` | Flyer A5 | 148 × 210 mm | 3 mm | 2 | Papier couché brillant 135 g ou mat 170 g. |
| `24-papier-en-tete-A4.pdf` | Papier à en-tête A4 | 210 × 297 mm | aucun | 1 | Papier 90 g. Pour devis, courriers aux fournisseurs, attestations. |
| `25-pochon-tissu-30x40.pdf` | Pochon en tissu 30 × 40 cm (sérigraphie) | 300 × 400 mm | aucun | 1 | Coton ou suédine couleur crème ou prune ; marquage une couleur or rose (sérigraphie ou transfert). Fond beige = couleur du tissu, à ne pas imprimer. |
