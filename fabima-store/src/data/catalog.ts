import type { Category, Product, ColorOption } from './types';

/** Image Pexels redimensionnée. Une image indisponible est remplacée à l'affichage par un visuel de secours. */
const px = (id: number, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const CATEGORIES: Category[] = [
  { id: 'chaussures', name: 'Chaussures', description: 'Escarpins, sneakers, sandales & mocassins', image: px(1598505, 700) },
  { id: 'sacs', name: 'Sacs', description: 'Sacs à main, cabas, pochettes & sacs à dos', image: px(1152077, 700) },
  { id: 'accessoires', name: 'Accessoires', description: 'Lunettes, montres, ceintures & foulards', image: px(1161268, 700) },
  { id: 'bijoux', name: 'Bijoux', description: 'Colliers, boucles d\'oreilles & bracelets', image: px(1191531, 700) },
  { id: 'vetements', name: 'Prêt-à-porter', description: 'Robes, boubous, chemises & ensembles', image: px(994523, 700) },
];

const C = {
  noir: { name: 'Noir', hex: '#111111' },
  blanc: { name: 'Blanc', hex: '#f5f5f5' },
  camel: { name: 'Camel', hex: '#b5835a' },
  nude: { name: 'Nude', hex: '#dcb8a0' },
  rouge: { name: 'Rouge', hex: '#a3142b' },
  or: { name: 'Doré', hex: '#c9a24d' },
  argent: { name: 'Argenté', hex: '#c0c0c0' },
  marron: { name: 'Marron', hex: '#5b3a29' },
  bleu: { name: 'Bleu nuit', hex: '#1f2a44' },
  vert: { name: 'Vert émeraude', hex: '#11694f' },
  beige: { name: 'Beige', hex: '#e6d5b8' },
  rose: { name: 'Rose poudré', hex: '#e8b4b8' },
  wax: { name: 'Wax multicolore', hex: 'linear-gradient(135deg,#e0a526,#b33a1f,#1f5f8b)' },
} satisfies Record<string, ColorOption>;

const SHOE_W = ['36', '37', '38', '39', '40', '41'];
const SHOE_M = ['40', '41', '42', '43', '44', '45'];
const CLOTHES = ['S', 'M', 'L', 'XL'];

let n = 0;
const p = (data: Omit<Product, 'id' | 'createdAt'> & { createdAt?: string }): Product => {
  n += 1;
  return { id: `FAB-${String(n).padStart(3, '0')}`, createdAt: data.createdAt ?? `2026-0${1 + (n % 8)}-1${n % 9}T10:00:00Z`, ...data };
};

export const INITIAL_PRODUCTS: Product[] = [
  /* ───────── CHAUSSURES ───────── */
  p({
    slug: 'escarpins-velours-aminata', name: 'Escarpins Aminata en velours', category: 'chaussures', subcategory: 'Escarpins', gender: 'femme',
    price: 32000, oldPrice: 39000, images: [px(1464625), px(336372)], colors: [C.noir, C.rouge, C.nude], sizes: SHOE_W, stock: 14,
    description: 'Des escarpins élégants en velours doux, talon aiguille de 9 cm, parfaits pour vos soirées, mariages et cérémonies.',
    details: ['Tige en velours', 'Semelle intérieure rembourrée', 'Talon 9 cm', 'Bout pointu'], rating: 4.8, reviewCount: 36, isBestseller: true,
    reviews: [
      { author: 'Awa D.', rating: 5, comment: 'Magnifiques et confortables, je les ai portées toute la nuit à un mariage !', date: '2026-08-12' },
      { author: 'Khady S.', rating: 4, comment: 'Très belles, taillent un peu petit, prenez une pointure au-dessus.', date: '2026-07-30' },
    ],
  }),
  p({
    slug: 'sneakers-urban-blanc', name: 'Sneakers Urban cuir blanc', category: 'chaussures', subcategory: 'Sneakers', gender: 'unisexe',
    price: 28500, images: [px(2529148), px(1598505)], colors: [C.blanc, C.noir], sizes: [...SHOE_W, '42', '43', '44'], stock: 30,
    description: 'La basket incontournable : cuir lisse, semelle épaisse et confort toute la journée. S\'accorde avec tout.',
    details: ['Cuir synthétique premium', 'Semelle caoutchouc antidérapante', 'Doublure respirante'], rating: 4.7, reviewCount: 58, isBestseller: true,
  }),
  p({
    slug: 'sandales-dorees-ndeye', name: 'Sandales Ndèye à brides dorées', category: 'chaussures', subcategory: 'Sandales', gender: 'femme',
    price: 18000, images: [px(1446161), px(267320)], colors: [C.or, C.argent, C.noir], sizes: SHOE_W, stock: 22, isNew: true,
    description: 'Sandales plates à fines brides métallisées, idéales pour l\'été et les sorties à la plage.',
    details: ['Brides ajustables', 'Semelle souple', 'Finition métallisée'], rating: 4.5, reviewCount: 17, createdAt: '2026-09-10T10:00:00Z',
  }),
  p({
    slug: 'mocassins-cuir-serigne', name: 'Mocassins Serigne cuir véritable', category: 'chaussures', subcategory: 'Mocassins', gender: 'homme',
    price: 42000, images: [px(292999), px(1478442)], colors: [C.marron, C.noir], sizes: SHOE_M, stock: 11, isBestseller: true,
    description: 'Mocassins en cuir véritable cousus main, élégance classique pour le bureau comme pour la Tabaski.',
    details: ['Cuir pleine fleur', 'Semelle cuir', 'Fabrication artisanale'], rating: 4.9, reviewCount: 41,
  }),
  p({
    slug: 'babouches-brodees', name: 'Babouches brodées artisanales', category: 'chaussures', subcategory: 'Babouches', gender: 'homme',
    price: 15000, images: [px(1027130)], colors: [C.blanc, C.beige, C.noir], sizes: SHOE_M, stock: 25,
    description: 'Babouches traditionnelles brodées à la main, parfaites avec un grand boubou pour la prière du vendredi.',
    details: ['Cuir souple', 'Broderies faites main', 'Semelle légère'], rating: 4.6, reviewCount: 29,
  }),
  p({
    slug: 'mules-talon-carre', name: 'Mules à talon carré', category: 'chaussures', subcategory: 'Mules', gender: 'femme',
    price: 24500, oldPrice: 29000, images: [px(2759779)], colors: [C.nude, C.noir, C.camel], sizes: SHOE_W, stock: 9, isNew: true,
    description: 'Mules modernes à talon carré de 6 cm : chic et stables pour le quotidien.',
    details: ['Talon 6 cm', 'Bride large', 'Semelle confort'], rating: 4.4, reviewCount: 12, createdAt: '2026-09-02T10:00:00Z',
  }),
  p({
    slug: 'baskets-running-air', name: 'Baskets Running Air', category: 'chaussures', subcategory: 'Sneakers', gender: 'homme',
    price: 35000, images: [px(1456706), px(2385477)], colors: [C.noir, C.bleu, C.rouge], sizes: SHOE_M, stock: 18,
    description: 'Légères et respirantes, pour le sport comme pour le style streetwear.',
    details: ['Mesh respirant', 'Amorti à air', 'Poids : 280 g'], rating: 4.6, reviewCount: 33,
  }),
  p({
    slug: 'bottines-chelsea', name: 'Bottines Chelsea daim', category: 'chaussures', subcategory: 'Bottines', gender: 'unisexe',
    price: 38000, images: [px(1159670)], colors: [C.camel, C.noir], sizes: [...SHOE_W, '42', '43', '44'], stock: 4,
    description: 'Bottines Chelsea en daim avec élastiques latéraux, l\'allure intemporelle.',
    details: ['Daim synthétique', 'Élastiques latéraux', 'Tirette arrière'], rating: 4.5, reviewCount: 14,
  }),

  /* ───────── SACS ───────── */
  p({
    slug: 'sac-a-main-fatou', name: 'Sac à main Fatou structuré', category: 'sacs', subcategory: 'Sacs à main', gender: 'femme',
    price: 45000, oldPrice: 52000, images: [px(1152077), px(904350)], colors: [C.noir, C.camel, C.rouge], sizes: [], stock: 12, isBestseller: true,
    description: 'Le sac signature Fabima : structuré, anses courtes, bandoulière amovible et fermoir doré.',
    details: ['Dimensions : 28 × 20 × 12 cm', 'Bandoulière amovible', '3 compartiments', 'Fermoir métal doré'], rating: 4.9, reviewCount: 64,
    reviews: [{ author: 'Mariama B.', rating: 5, comment: 'Qualité incroyable pour le prix, on me demande toujours où je l\'ai acheté.', date: '2026-08-21' }],
  }),
  p({
    slug: 'cabas-cuir-weekend', name: 'Cabas Week-end grand format', category: 'sacs', subcategory: 'Cabas', gender: 'femme',
    price: 38000, images: [px(1204464)], colors: [C.camel, C.beige, C.noir], sizes: [], stock: 16,
    description: 'Un grand cabas pratique pour le travail, les courses ou les escapades à Saly.',
    details: ['Format A4', 'Poche zippée intérieure', 'Pochette amovible'], rating: 4.7, reviewCount: 27,
  }),
  p({
    slug: 'pochette-soiree-perles', name: 'Pochette de soirée perlée', category: 'sacs', subcategory: 'Pochettes', gender: 'femme',
    price: 19500, images: [px(2081199)], colors: [C.or, C.argent, C.blanc], sizes: [], stock: 20, isNew: true,
    description: 'Pochette ornée de perles et chaînette amovible, l\'accessoire idéal des grandes occasions.',
    details: ['Perles cousues main', 'Chaînette 110 cm', 'Fermoir aimanté'], rating: 4.8, reviewCount: 19, createdAt: '2026-09-15T10:00:00Z',
  }),
  p({
    slug: 'sac-bandouliere-mini', name: 'Mini sac bandoulière', category: 'sacs', subcategory: 'Bandoulière', gender: 'femme',
    price: 22000, oldPrice: 26000, images: [px(1374910)], colors: [C.rose, C.noir, C.blanc, C.vert], sizes: [], stock: 27,
    description: 'Compact et tendance, il contient l\'essentiel : téléphone, cartes, rouge à lèvres.',
    details: ['18 × 12 × 6 cm', 'Bandoulière réglable', 'Fermeture zippée'], rating: 4.5, reviewCount: 38,
  }),
  p({
    slug: 'sac-a-dos-urbain', name: 'Sac à dos urbain cuir', category: 'sacs', subcategory: 'Sacs à dos', gender: 'unisexe',
    price: 34000, images: [px(2905238)], colors: [C.noir, C.marron], sizes: [], stock: 13,
    description: 'Sac à dos élégant avec compartiment ordinateur 14", pour étudiants et professionnels.',
    details: ['Compartiment PC 14"', 'Dos rembourré', 'Port USB externe'], rating: 4.6, reviewCount: 22,
  }),
  p({
    slug: 'porte-documents-homme', name: 'Porte-documents Executive', category: 'sacs', subcategory: 'Porte-documents', gender: 'homme',
    price: 48000, images: [px(1638247)], colors: [C.marron, C.noir], sizes: [], stock: 7,
    description: 'Porte-documents en cuir pour l\'homme d\'affaires exigeant.',
    details: ['Cuir véritable', 'Compartiment PC 15"', 'Serrure à code'], rating: 4.8, reviewCount: 9,
  }),
  p({
    slug: 'sac-wax-teranga', name: 'Sac Teranga en wax', category: 'sacs', subcategory: 'Cabas', gender: 'femme',
    price: 16500, images: [px(6044266)], colors: [C.wax], sizes: [], stock: 24, isNew: true,
    description: 'Cabas en tissu wax fabriqué à Dakar par nos artisanes. Chaque pièce est unique.',
    details: ['Tissu wax 100 % coton', 'Doublure intérieure', 'Fait main à Dakar'], rating: 4.9, reviewCount: 31, createdAt: '2026-09-05T10:00:00Z',
  }),

  /* ───────── ACCESSOIRES ───────── */
  p({
    slug: 'lunettes-soleil-oversize', name: 'Lunettes de soleil oversize', category: 'accessoires', subcategory: 'Lunettes', gender: 'femme',
    price: 12500, oldPrice: 15000, images: [px(701877), px(46710)], colors: [C.noir, C.camel], sizes: [], stock: 40, isBestseller: true,
    description: 'Monture oversize et verres UV400 pour affronter le soleil de Dakar avec style.',
    details: ['Protection UV400', 'Étui inclus', 'Monture acétate'], rating: 4.6, reviewCount: 52,
  }),
  p({
    slug: 'montre-classique-or', name: 'Montre Classique dorée', category: 'accessoires', subcategory: 'Montres', gender: 'unisexe',
    price: 39000, images: [px(190819), px(277390)], colors: [C.or, C.argent], sizes: [], stock: 10,
    description: 'Montre au cadran minimaliste et bracelet milanais, résistante aux éclaboussures.',
    details: ['Mouvement quartz', 'Étanche 3 ATM', 'Bracelet ajustable', 'Garantie 1 an'], rating: 4.7, reviewCount: 25,
  }),
  p({
    slug: 'ceinture-cuir-reversible', name: 'Ceinture cuir réversible', category: 'accessoires', subcategory: 'Ceintures', gender: 'homme',
    price: 14000, images: [px(1049686)], colors: [C.noir, C.marron], sizes: ['90', '100', '110', '120'], stock: 35,
    description: 'Deux ceintures en une : face noire et face marron, boucle pivotante.',
    details: ['Cuir refendu', 'Boucle pivotante', 'Largeur 3,5 cm'], rating: 4.5, reviewCount: 18,
  }),
  p({
    slug: 'foulard-soie-imprime', name: 'Foulard en soie imprimé', category: 'accessoires', subcategory: 'Foulards', gender: 'femme',
    price: 11000, images: [px(1078958)], colors: [C.rouge, C.bleu, C.or], sizes: [], stock: 28,
    description: 'Foulard carré en soie à porter en turban, noué au cou ou sur votre sac.',
    details: ['90 × 90 cm', 'Soie mélangée', 'Ourlets roulottés'], rating: 4.7, reviewCount: 21,
  }),
  p({
    slug: 'casquette-brodee-fabima', name: 'Casquette brodée Fabima', category: 'accessoires', subcategory: 'Chapeaux', gender: 'unisexe',
    price: 8500, images: [px(1124465)], colors: [C.noir, C.beige, C.blanc], sizes: [], stock: 50, isNew: true,
    description: 'Casquette en coton brodée du logo Fabima. Taille ajustable.',
    details: ['100 % coton', 'Réglage arrière', 'Broderie ton sur ton'], rating: 4.4, reviewCount: 10, createdAt: '2026-08-28T10:00:00Z',
  }),
  p({
    slug: 'portefeuille-cuir-homme', name: 'Portefeuille cuir compact', category: 'accessoires', subcategory: 'Maroquinerie', gender: 'homme',
    price: 13500, images: [px(1552617)], colors: [C.noir, C.marron], sizes: [], stock: 3,
    description: 'Portefeuille fin en cuir avec protection RFID, 8 emplacements cartes.',
    details: ['Protection RFID', '8 emplacements', 'Compartiment billets'], rating: 4.6, reviewCount: 16,
  }),

  /* ───────── BIJOUX ───────── */
  p({
    slug: 'collier-plaque-or', name: 'Collier plaqué or Soxna', category: 'bijoux', subcategory: 'Colliers', gender: 'femme',
    price: 17500, images: [px(1191531)], colors: [C.or], sizes: [], stock: 19, isBestseller: true,
    description: 'Collier délicat plaqué or 18 carats avec pendentif goutte, hypoallergénique.',
    details: ['Plaqué or 18 k', 'Chaîne 45 cm', 'Hypoallergénique'], rating: 4.8, reviewCount: 47,
  }),
  p({
    slug: 'boucles-creoles-xl', name: 'Créoles XL dorées', category: 'bijoux', subcategory: 'Boucles d\'oreilles', gender: 'femme',
    price: 9500, images: [px(1395306)], colors: [C.or, C.argent], sizes: [], stock: 45,
    description: 'De grandes créoles légères qui illuminent le visage.',
    details: ['Diamètre 6 cm', 'Acier inoxydable', 'Ne noircit pas'], rating: 4.6, reviewCount: 39,
  }),
  p({
    slug: 'bracelet-jonc-grave', name: 'Bracelet jonc gravé', category: 'bijoux', subcategory: 'Bracelets', gender: 'femme',
    price: 12000, oldPrice: 14500, images: [px(1453008)], colors: [C.or, C.argent], sizes: [], stock: 23,
    description: 'Jonc ouvert finement gravé, à porter seul ou en accumulation.',
    details: ['Acier plaqué', 'Taille unique ajustable'], rating: 4.5, reviewCount: 15,
  }),
  p({
    slug: 'bague-solitaire', name: 'Bague solitaire zircon', category: 'bijoux', subcategory: 'Bagues', gender: 'femme',
    price: 14500, images: [px(691046)], colors: [C.argent, C.or], sizes: ['50', '52', '54', '56', '58'], stock: 17, isNew: true,
    description: 'Bague solitaire sertie d\'un oxyde de zirconium, éclat garanti.',
    details: ['Argent 925', 'Pierre 6 mm', 'Écrin offert'], rating: 4.9, reviewCount: 13, createdAt: '2026-09-12T10:00:00Z',
  }),
  p({
    slug: 'parure-perles-mariage', name: 'Parure perles de mariage', category: 'bijoux', subcategory: 'Parures', gender: 'femme',
    price: 29000, images: [px(1616096)], colors: [C.blanc, C.or], sizes: [], stock: 8,
    description: 'Collier, boucles et bracelet assortis pour sublimer la mariée et ses demoiselles d\'honneur.',
    details: ['3 pièces', 'Perles nacrées', 'Coffret cadeau'], rating: 5, reviewCount: 11,
  }),

  /* ───────── PRÊT-À-PORTER ───────── */
  p({
    slug: 'robe-wax-dior', name: 'Robe longue wax Dior', category: 'vetements', subcategory: 'Robes', gender: 'femme',
    price: 27000, images: [px(994523)], colors: [C.wax], sizes: CLOTHES, stock: 15, isBestseller: true,
    description: 'Robe longue cintrée en wax, coupe évasée, confectionnée par nos tailleurs à Dakar.',
    details: ['Wax 100 % coton', 'Fermeture dos', 'Longueur 140 cm'], rating: 4.8, reviewCount: 44,
  }),
  p({
    slug: 'grand-boubou-bazin', name: 'Grand boubou bazin riche', category: 'vetements', subcategory: 'Boubous', gender: 'homme',
    price: 65000, images: [px(2918534)], colors: [C.blanc, C.bleu, C.beige], sizes: CLOTHES, stock: 6,
    description: 'Grand boubou trois pièces en bazin riche brodé, pour les grandes fêtes.',
    details: ['Bazin riche teint', 'Broderie main', '3 pièces : boubou, tunique, pantalon'], rating: 4.9, reviewCount: 20,
  }),
  p({
    slug: 'chemise-lin-homme', name: 'Chemise en lin', category: 'vetements', subcategory: 'Chemises', gender: 'homme',
    price: 19000, oldPrice: 23000, images: [px(297933)], colors: [C.blanc, C.beige, C.bleu], sizes: CLOTHES, stock: 21,
    description: 'Chemise légère en lin, fraîcheur garantie sous la chaleur.',
    details: ['100 % lin', 'Coupe droite', 'Boutons nacre'], rating: 4.5, reviewCount: 17,
  }),
  p({
    slug: 'ensemble-tailleur-femme', name: 'Ensemble tailleur Adja', category: 'vetements', subcategory: 'Ensembles', gender: 'femme',
    price: 36000, images: [px(1536619)], colors: [C.beige, C.noir, C.vert], sizes: CLOTHES, stock: 10, isNew: true,
    description: 'Veste et pantalon large assortis, pour une allure affirmée au bureau.',
    details: ['Veste doublée', 'Pantalon taille haute', 'Tissu fluide'], rating: 4.7, reviewCount: 8, createdAt: '2026-09-18T10:00:00Z',
  }),
  p({
    slug: 'kaftan-brode-femme', name: 'Kaftan brodé Linguère', category: 'vetements', subcategory: 'Robes', gender: 'femme',
    price: 42000, images: [px(1755428)], colors: [C.vert, C.rose, C.blanc], sizes: CLOTHES, stock: 5,
    description: 'Kaftan ample aux broderies dorées, élégance et confort pour les cérémonies.',
    details: ['Broderies dorées', 'Manches évasées', 'Tissu satiné'], rating: 4.8, reviewCount: 23,
  }),
];
