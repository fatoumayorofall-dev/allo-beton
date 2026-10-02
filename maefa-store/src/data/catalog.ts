import type { Category, ColorOption, Occasion, Product } from './types';
import { isOnSale } from '../config/site';

/** Image Pexels redimensionnée. Une image indisponible est remplacée à l'affichage par un visuel de secours. */
export const px = (id: number, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

/**
 * Version du catalogue initial. À incrémenter quand INITIAL_PRODUCTS change de structure :
 * les navigateurs qui gardaient une ancienne copie en mémoire repartent alors du nouveau catalogue.
 */
export const CATALOG_VERSION = 21;

/** Toutes les catégories prévues (y compris celles pas encore en vente). */
export const ALL_CATEGORIES: Category[] = [
  { id: 'chaussures', name: 'Chaussures', description: 'Sandales, tongs & mules', image: '/produits/tongs-anneau-dore-dore-1.jpg' },
  { id: 'sacs', name: 'Sacs', description: 'Sacs à main, rabats & bandoulières', image: '/produits/sac-ndella-camel-1.jpg' },
  { id: 'accessoires', name: 'Accessoires', description: 'Lunettes, montres, foulards & chapeaux', image: px(1161268, 700) },
  { id: 'bijoux', name: 'Bijoux', description: 'Colliers, créoles, bracelets & parures', image: px(1191531, 700) },
  { id: 'vetements', name: 'Prêt-à-porter', description: 'Robes, kaftans, boubous & ensembles', image: px(994523, 700) },
];

/** Catégories en vente (réglage SHOP_CATEGORIES dans config/site.ts). */
export const CATEGORIES: Category[] = ALL_CATEGORIES.filter(c => isOnSale(c.id));

export const OCCASIONS: Occasion[] = [
  { id: 'mariage', name: 'Mariage & baptême', tagline: 'Être l\'invitée qu\'on remarque', image: px(1616096, 700) },
  { id: 'ceremonie', name: 'Tabaski & Korité', tagline: 'Briller en famille', image: px(2918534, 700) },
  { id: 'soiree', name: 'Soirée', tagline: 'Éclat et paillettes', image: px(2081199, 700) },
  { id: 'bureau', name: 'Au bureau', tagline: 'Élégance affirmée', image: px(1536619, 700) },
  { id: 'quotidien', name: 'Au quotidien', tagline: 'Chic sans effort', image: px(1374910, 700) },
  { id: 'vacances', name: 'Vacances & plage', tagline: 'Cap sur Saly', image: px(1446161, 700) },
];

/** Couleurs courantes, prêtes pour les prochaines pièces. */
export const COLORS = {
  noir: { name: 'Noir', hex: '#1c1418' },
  blanc: { name: 'Blanc', hex: '#f7f3f1' },
  camel: { name: 'Camel', hex: '#b5835a' },
  nude: { name: 'Nude', hex: '#e3bfa9' },
  rouge: { name: 'Rouge passion', hex: '#a3142b' },
  fuchsia: { name: 'Fuchsia', hex: '#c2185b' },
  or: { name: 'Doré', hex: '#c9a24d' },
  argent: { name: 'Argenté', hex: '#c7c4c6' },
  bleu: { name: 'Bleu nuit', hex: '#1f2a44' },
  vert: { name: 'Vert émeraude', hex: '#11694f' },
  beige: { name: 'Beige', hex: '#e6d5b8' },
  rose: { name: 'Rose poudré', hex: '#e8b4b8' },
  lilas: { name: 'Lilas', hex: '#b9a0c9' },
  raphia: { name: 'Raphia naturel', hex: '#d9c08f' },
  wax: { name: 'Wax multicolore', hex: 'linear-gradient(135deg,#e0a526,#b33a1f,#1f5f8b)' },
} satisfies Record<string, ColorOption>;

/** Pointures proposées par défaut pour les chaussures. */
export const SHOE_SIZES = ['36', '37', '38', '39', '40', '41'];

/** Stock non affiché aux clientes : simple plafond de commande (0 = épuisé, réglable dans l'admin). */
const STOCK = 20;

let n = 100;
const p = (data: Omit<Product, 'id' | 'createdAt'> & { createdAt?: string }): Product => {
  n += 1;
  return { id: `MAE-${n}`, createdAt: data.createdAt ?? `2026-0${1 + (n % 8)}-1${n % 9}T10:00:00Z`, ...data };
};


/**
 * Photos et vidéos des pièces : public/produits et public/videos.
 * Vidéos du fournisseur recadrées, retravaillées et signées Maefa (voir docs/ARTICLES.md).
 */
const media = (slug: string, n: number) => Array.from({ length: n }, (_, i) => `/produits/${slug}-${i + 1}.jpg`);

/** Sac Ndella : sac à rabat structuré, aspect daim ; une fiche par couleur, avec sa vidéo. */
const ndella = (color: ColorOption, key: string, photos: number, video = true) => p({
  slug: `sac-ndella-${key}`,
  name: `Sac Ndella — ${color.name}`,
  category: 'sacs',
  subcategory: 'Sacs à rabat',
  occasions: ['bureau', 'quotidien', 'ceremonie', 'mariage'],
  material: 'Aspect daim, finitions lisses, coutures contrastées',
  care: 'Brosser à sec avec une brosse douce, éviter la pluie et les taches grasses, ranger à l\'abri de la chaleur.',
  styleTip: 'À la main pour une tenue habillée, en bandoulière pour les journées chargées : il passe du bureau aux cérémonies.',
  price: 25000,
  images: media(`sac-ndella-${key}`, photos),
  video: video ? `/videos/sac-ndella-${key}.mp4` : undefined,
  colors: [color],
  sizes: [],
  stock: STOCK,
  description: `Le sac Ndella en ${color.name.toLowerCase()} : une silhouette structurée, un rabat aux lignes douces, une anse sur le dessus et une bandoulière amovible. Chic en toutes circonstances.`,
  details: ['Sac à main à rabat', `Couleur : ${color.name}`, 'Aspect daim, finitions lisses', 'Anse sur le dessus et bandoulière amovible', 'Livré dans un emballage Maefa'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  isBestseller: true,
  createdAt: '2026-09-29T10:00:00Z',
});

/** Pochette Coumba : pochette de soirée à rabat, strass sur le contour, fermoir papillon en pierres. */
const coumba = (color: ColorOption, key: string) => p({
  slug: `pochette-papillon-${key}`,
  name: `Pochette Coumba à papillon — ${color.name}`,
  category: 'sacs',
  subcategory: 'Pochettes de soirée',
  occasions: ['soiree', 'mariage', 'ceremonie'],
  material: 'Aspect satin, strass sur le rabat et le contour, fermoir papillon en pierres',
  care: 'Ranger dans sa pochette à l\'abri de la poussière, éviter l\'eau et les frottements sur les strass.',
  styleTip: 'Pour un mariage ou un baptême, avec un grand boubou ou un ensemble en bazin : elle donne l\'éclat final.',
  price: 15000,
  images: media(`pochette-papillon-${key}`, 2),
  video: `/videos/pochette-papillon-${key}.mp4`,
  colors: [color],
  sizes: [],
  stock: STOCK,
  description: `La pochette Coumba en ${color.name.toLowerCase()} : un rabat semé de strass, un contour brillant et un fermoir papillon en pierres. La touche qui fait briller les tenues de fête.`,
  details: ['Pochette de soirée à rabat', `Couleur : ${color.name}`, 'Strass sur le rabat et le contour', 'Fermoir papillon en pierres', 'Livrée dans un emballage Maefa'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  createdAt: '2026-09-30T16:00:00Z',
});

/** Sac Aminata : cabas souple aspect cuir grainé, double zip, breloque dorée, bandoulière amovible. */
const aminata = (color: ColorOption, key: string) => p({
  slug: `sac-aminata-${key}`,
  name: `Sac Aminata — ${color.name}`,
  category: 'sacs',
  subcategory: 'Sacs cabas',
  occasions: ['bureau', 'quotidien', 'ceremonie'],
  material: 'Aspect cuir grainé, intérieur contrasté, fermeture à double zip, breloque en métal doré',
  care: 'Essuyer avec un chiffon doux et sec, éviter l\'eau et la chaleur, ranger rembourré pour garder sa forme.',
  styleTip: 'Au creux du bras pour le bureau, en bandoulière le week-end : un sac qui va avec tout.',
  price: 17000,
  images: media(`sac-aminata-${key}`, 1),
  colors: [color],
  sizes: [],
  stock: STOCK,
  description: `Le sac Aminata en ${color.name.toLowerCase()} : un cabas souple et spacieux à l'aspect cuir grainé, fermé par un double zip, avec une breloque dorée, deux anses et une bandoulière amovible.`,
  details: ['Sac cabas souple', `Couleur : ${color.name}`, 'Aspect cuir grainé', 'Fermeture à double zip', 'Deux anses et bandoulière amovible', 'Livré dans un emballage Maefa'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  createdAt: '2026-09-30T15:00:00Z',
});

/** Sac Diarra : sac à main structuré, fermoir tournant doré, breloque cœur et clés. */
const diarra = (color: ColorOption, key: string) => p({
  slug: `sac-diarra-${key}`,
  name: `Sac Diarra à breloque cœur — ${color.name}`,
  category: 'sacs',
  subcategory: 'Sacs à main',
  occasions: ['bureau', 'quotidien', 'ceremonie'],
  material: 'Aspect daim marbré, anses et bandes aspect cuir lisse, fermoir tournant et clous dorés',
  care: 'Brosser à sec avec une brosse douce, éviter l\'eau et les taches grasses, ranger rembourré pour garder sa forme.',
  styleTip: 'À la main ou en bandoulière, avec une robe simple : la breloque cœur et ses clés dorées font le bijou.',
  price: 15000,
  images: media(`sac-diarra-${key}`, 1),
  colors: [color],
  sizes: [],
  stock: STOCK,
  description: `Le sac Diarra en ${color.name.toLowerCase()} : une forme structurée à l'aspect daim marbré, un fermoir tournant doré, une jolie breloque cœur avec ses clés dorées, deux anses et une bandoulière réglable.`,
  details: ['Sac à main structuré', `Couleur : ${color.name}`, 'Fermoir tournant et clous dorés', 'Breloque cœur et clés dorées', 'Deux anses et bandoulière amovible réglable', 'Livré dans un emballage Maefa'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  createdAt: '2026-09-30T14:00:00Z',
});

/** Tongs Adja : bride fine entre les doigts, fermoir en métal argenté, semelle plate carrée. */
const adja = (color: ColorOption, key: string) => p({
  slug: `tongs-adja-${key}`,
  name: `Tongs Adja à fermoir — ${color.name}`,
  category: 'chaussures',
  subcategory: 'Sandales plates',
  occasions: ['quotidien', 'vacances', 'soiree'],
  material: 'Aspect cuir lisse, fermoir en métal argenté, semelle plate à bout carré',
  care: 'Essuyer avec un chiffon doux légèrement humide, éviter l\'eau sur le fermoir, ranger à plat.',
  styleTip: 'Avec une robe fluide ou un ensemble en lin : le fermoir argenté fait tout le chic, sans effort.',
  price: 15000,
  images: media(`tongs-adja-${key}`, 2),
  video: `/videos/tongs-adja-${key}.mp4`,
  colors: [color],
  sizes: SHOE_SIZES,
  stock: STOCK,
  description: `Des tongs plates en ${color.name.toLowerCase()} : une fine bride entre les doigts, un fermoir en métal argenté sur le dessus et une semelle au bout carré. Minimalistes, confortables, élégantes.`,
  details: ['Tongs plates, bride entre les doigts', `Couleur : ${color.name}`, 'Fermoir en métal argenté', 'Semelle plate à bout carré', 'Pointures du 36 au 41'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  createdAt: '2026-09-30T12:00:00Z',
});

/** Tongs Zara à anneau d'orteil : barre dorée sur le dessus et anneau doré autour de l'orteil. */
const orteil = (color: ColorOption, key: string) => p({
  slug: `tongs-zara-orteil-${key}`,
  name: `Tongs Zara à anneau d'orteil — ${color.name}`,
  category: 'chaussures',
  subcategory: 'Sandales plates',
  occasions: ['quotidien', 'vacances', 'soiree'],
  material: 'Aspect cuir lisse, barre et anneau en métal doré, semelle plate',
  care: 'Essuyer avec un chiffon doux et sec, éviter l\'eau de mer sur le métal, ranger à plat.',
  styleTip: 'Avec un kaftan ou une robe longue : la barre dorée sert de bijou de pied.',
  price: 15000,
  images: media(`tongs-zara-orteil-${key}`, 2),
  video: `/videos/tongs-zara-orteil-${key}.mp4`,
  colors: [color],
  sizes: SHOE_SIZES,
  stock: STOCK,
  description: `Des sandales plates Zara en ${color.name.toLowerCase()} : une barre dorée sur le dessus du pied et un anneau doré autour de l'orteil. Légères, faciles à porter, avec une touche de bijou.`,
  details: ['Marque : Zara', 'Sandales plates à anneau d\'orteil', `Couleur : ${color.name}`, 'Barre et anneau en métal doré', 'Pointures du 36 au 41'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  createdAt: '2026-09-30T12:30:00Z',
});

/** Mules Zara à talon : large bride croisée bout ouvert, semelle vernie, talon fin. */
const mulesTalon = (color: ColorOption, key: string) => p({
  slug: `mules-talon-${key}`,
  name: `Mules Zara à talon — ${color.name}`,
  category: 'chaussures',
  subcategory: 'Mules à talon',
  occasions: ['soiree', 'ceremonie', 'mariage', 'bureau'],
  material: 'Dessus aspect satin mat, semelle intérieure vernie, talon fin',
  care: 'Brosser délicatement, éviter l\'eau et les taches, ranger dans leur pochette pour protéger le talon.',
  styleTip: 'Avec un grand boubou, une robe fourreau ou un tailleur : une couleur profonde qui habille toute la tenue.',
  price: 15000,
  images: media(`mules-talon-${key}`, 2),
  video: `/videos/mules-talon-${key}.mp4`,
  colors: [color],
  sizes: SHOE_SIZES,
  stock: STOCK,
  description: `Des mules Zara à talon en ${color.name.toLowerCase()} : une large bride croisée au bout ouvert, une semelle vernie assortie et un talon fin. Élégantes pour les cérémonies, les soirées et le bureau.`,
  details: ['Marque : Zara', 'Mules à talon, bout ouvert', `Couleur : ${color.name}`, 'Large bride croisée', 'Semelle intérieure vernie assortie', 'Pointures du 36 au 41'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  createdAt: '2026-09-30T10:00:00Z',
});

/** Mules Zara croisées : brides croisées effet surpiqué et brides à strass, semelle plate. */
const mules = (color: ColorOption, key: string) => p({
  slug: `mules-croisees-strass-${key}`,
  name: `Mules Zara croisées à strass — ${color.name}`,
  category: 'chaussures',
  subcategory: 'Sandales plates',
  occasions: ['quotidien', 'soiree', 'ceremonie', 'vacances'],
  material: 'Dessus aspect cuir métallisé surpiqué, brides ornées de strass, semelle plate',
  care: 'Essuyer avec un chiffon doux et sec, éviter l\'eau sur les strass, ranger à plat dans leur pochette.',
  styleTip: 'Avec un boubou léger ou une robe longue : les strass font briller la tenue sans talons.',
  price: 15000,
  images: media(`mules-croisees-strass-${key}`, 2),
  video: `/videos/mules-croisees-strass-${key}.mp4`,
  colors: [color],
  sizes: SHOE_SIZES,
  stock: STOCK,
  description: `Des mules plates Zara en ${color.name.toLowerCase()} : une large bride croisée effet surpiqué et trois fines brides à strass. Faciles à enfiler, confortables et habillées à la fois.`,
  details: ['Marque : Zara', 'Mules plates à enfiler', `Couleur : ${color.name}`, 'Bride croisée surpiquée et brides à strass', 'Semelle plate confortable', 'Pointures du 36 au 41'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  createdAt: '2026-09-29T12:00:00Z',
});

/** Tongs Zara à anneau doré : semelle plate, bride entre les doigts, gros anneau doré sculpté. */
const tongs = (color: ColorOption, key: string) => p({
  slug: `tongs-anneau-dore-${key}`,
  name: `Tongs Zara à anneau doré — ${color.name}`,
  category: 'chaussures',
  subcategory: 'Sandales plates',
  occasions: ['quotidien', 'vacances', 'soiree'],
  material: 'Dessus et semelle intérieure aspect cuir, anneau en métal doré',
  care: 'Essuyer avec un chiffon doux légèrement humide, éviter l\'eau de mer sur l\'anneau, ranger à plat.',
  styleTip: 'Avec une robe longue ou un ensemble en lin : l\'anneau doré suffit comme bijou.',
  price: 15000,
  images: media(`tongs-anneau-dore-${key}`, 2),
  video: `/videos/tongs-anneau-dore-${key}.mp4`,
  colors: [color],
  sizes: SHOE_SIZES,
  stock: STOCK,
  description: `Des tongs plates Zara en ${color.name.toLowerCase()}, rehaussées d'un grand anneau doré sculpté : confortables toute la journée et assez élégantes pour le soir.`,
  details: ['Marque : Zara', 'Tongs plates, bride entre les doigts', `Couleur : ${color.name}`, 'Grand anneau en métal doré', 'Semelle plate confortable', 'Pointures du 36 au 41'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  createdAt: '2026-09-29T11:00:00Z',
});

/** Sac Awa : sac bowling à fermoir doré, bande plissée au centre, bandes effet croco. */
const awa = (color: ColorOption, key: string) => p({
  slug: `sac-awa-${key}`,
  name: `Sac Awa à fermoir doré — ${color.name}`,
  category: 'sacs',
  subcategory: 'Sacs à fermoir',
  occasions: ['bureau', 'ceremonie', 'mariage', 'soiree'],
  material: 'Aspect cuir lisse, bande centrale plissée, bandes et anses effet croco, fermoir en métal doré',
  care: 'Essuyer avec un chiffon doux et sec, éviter l\'eau et la chaleur, ranger rembourré pour garder sa forme.',
  styleTip: 'Tenu à la main avec une robe portefeuille ou un tailleur : l\'allure d\'un sac de créatrice, du bureau aux cérémonies.',
  price: 18500,
  images: [`/produits/sac-awa-${key}-1.jpg`],
  colors: [color],
  sizes: [],
  stock: STOCK,
  description: `Le sac Awa en ${color.name.toLowerCase()} : une forme bowling structurée, un fermoir doré façon sac de docteur, une bande plissée au centre et des finitions effet croco. Élégant et spacieux.`,
  details: ['Sac à main à fermoir doré', `Couleur : ${color.name}`, 'Bande centrale plissée', 'Bandes et anses effet croco', 'Deux anses portées main'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  createdAt: '2026-09-29T12:00:00Z',
});

/** Sac Soxna : sac à rabat effet croco verni, anse carrée en métal doré, bandoulière. */
const soxna = (color: ColorOption, key: string, price = 22000) => p({
  slug: `sac-soxna-${key}`,
  name: `Sac Soxna effet croco — ${color.name}`,
  category: 'sacs',
  subcategory: 'Sacs à anse dorée',
  occasions: ['soiree', 'ceremonie', 'mariage', 'bureau'],
  material: 'Aspect cuir verni embossé effet croco, anse carrée en métal doré',
  care: 'Essuyer avec un chiffon doux et sec, éviter l\'eau et la chaleur, ranger dans une housse pour préserver le vernis.',
  styleTip: 'À la main par son anse dorée pour une cérémonie, en bandoulière pour la journée : une couleur vive suffit à illuminer une tenue simple.',
  price,
  images: [`/produits/sac-soxna-${key}-1.jpg`, `/produits/sac-soxna-${key}-2.jpg`],
  video: `/videos/sac-soxna-${key}.mp4`,
  colors: [color],
  sizes: [],
  stock: STOCK,
  description: `Le sac Soxna en ${color.name.toLowerCase()} : un rabat effet croco verni, des empiècements lisses en Y et une anse carrée en métal doré. Il se porte aussi en bandoulière.`,
  details: ['Sac à rabat', `Couleur : ${color.name}`, 'Effet croco verni et empiècements lisses', 'Anse carrée en métal doré', 'Bandoulière'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  createdAt: '2026-09-30T10:00:00Z',
});

/** Catalogue complet, y compris les pièces des catégories pas encore en vente. */
/**
 * Ordre = numéro de chaque pièce (MAE-101, 102…) utilisé par les liens courts /p/… partagés
 * sur les statuts WhatsApp : toujours AJOUTER les nouvelles pièces à la fin, ne jamais insérer au milieu.
 */
export const ALL_PRODUCTS: Product[] = [
  ndella({ name: 'Camel', hex: '#a8683a' }, 'camel', 2),
  ndella({ name: 'Bordeaux', hex: '#6e1f34' }, 'bordeaux', 1, false),
  ndella(COLORS.noir, 'noir', 2),
  ndella({ name: 'Chocolat', hex: '#5a3526' }, 'chocolat', 2),
  awa({ name: 'Taupe', hex: '#8f7a63' }, 'taupe'),
  awa(COLORS.noir, 'noir'),
  awa({ name: 'Crème & cognac', hex: '#ece3d3' }, 'creme-cognac'),
  awa({ name: 'Vert olive', hex: '#6b7430' }, 'vert-olive'),
  awa({ name: 'Bleu ciel', hex: '#7f9cc4' }, 'bleu'),
  awa({ name: 'Cognac', hex: '#9a5a2c' }, 'cognac'),
  awa({ name: 'Bordeaux', hex: '#7a1f27' }, 'bordeaux'),
  soxna({ name: 'Cognac', hex: '#8f4a22' }, 'cognac'),
  soxna({ name: 'Vert émeraude', hex: '#11694f' }, 'vert-emeraude'),
  soxna({ name: 'Rouge', hex: '#b3122e' }, 'rouge'),
  soxna({ name: 'Violet', hex: '#6e3a9c' }, 'violet'),
  soxna({ name: 'Bleu roi', hex: '#2743b8' }, 'bleu-roi'),
  soxna(COLORS.noir, 'noir'),
  soxna(COLORS.blanc, 'blanc'),
  soxna({ name: 'Fuchsia', hex: '#d2268a' }, 'fuchsia'),
  soxna({ name: 'Orange', hex: '#e8641c' }, 'orange'),
  tongs(COLORS.or, 'dore'),
  tongs(COLORS.noir, 'noir'),
  tongs(COLORS.blanc, 'blanc'),
  tongs({ name: 'Bordeaux', hex: '#5b2430' }, 'bordeaux'),
  mules({ name: 'Noir et doré', hex: 'linear-gradient(135deg,#1c1418 50%,#c9a24d 50%)' }, 'noir-dore'),
  mules(COLORS.noir, 'noir'),
  mules({ name: 'Bronze', hex: '#8a5a3c' }, 'bronze'),
  mules(COLORS.or, 'dore'),
  mulesTalon({ name: 'Bordeaux', hex: '#6e1330' }, 'bordeaux'),
  mulesTalon({ name: 'Vert sapin', hex: '#1f3d33' }, 'vert-sapin'),
  mulesTalon({ name: 'Violet', hex: '#4a2166' }, 'violet'),
  mulesTalon({ name: 'Camel', hex: '#9a5f2e' }, 'camel'),
  orteil({ name: 'Cognac', hex: '#a8582a' }, 'cognac'),
  orteil(COLORS.noir, 'noir'),
  orteil(COLORS.blanc, 'blanc'),
  orteil({ name: 'Bordeaux', hex: '#7a1f2e' }, 'bordeaux'),
  orteil({ name: 'Chocolat', hex: '#4a2a26' }, 'chocolat'),
  adja(COLORS.blanc, 'blanc'),
  adja(COLORS.noir, 'noir'),
  adja({ name: 'Chocolat', hex: '#5a4038' }, 'chocolat'),
  adja({ name: 'Framboise', hex: '#b0283f' }, 'framboise'),
  diarra({ name: 'Bordeaux', hex: '#6b1e2e' }, 'bordeaux'),
  diarra({ name: 'Rose poudré', hex: '#d99a9e' }, 'rose'),
  diarra(COLORS.noir, 'noir'),
  diarra({ name: 'Crème', hex: '#ece3d3' }, 'creme'),
  diarra({ name: 'Gris perle', hex: '#b8bec6' }, 'gris'),
  diarra({ name: 'Chocolat', hex: '#4f2a22' }, 'chocolat'),
  diarra({ name: 'Camel', hex: '#b0876c' }, 'camel'),
  diarra({ name: 'Taupe rosé', hex: '#9e857f' }, 'taupe'),
  aminata({ name: 'Taupe', hex: '#8c7a62' }, 'taupe'),
  aminata({ name: 'Cognac', hex: '#7a4a2c' }, 'cognac'),
  aminata(COLORS.noir, 'noir'),
  aminata({ name: 'Vert olive', hex: '#5a6b2c' }, 'vert-olive'),
  aminata({ name: 'Prune', hex: '#6e2440' }, 'prune'),
  coumba({ name: 'Orange', hex: '#f08a1c' }, 'orange'),
  coumba({ name: 'Fuchsia', hex: '#a3163f' }, 'fuchsia'),
  coumba(COLORS.or, 'dore'),
  coumba(COLORS.noir, 'noir'),
  coumba({ name: 'Chocolat', hex: '#5a2f24' }, 'chocolat'),
];

/**
 * Pièces retirées de la vente à cause d'une marque visible (logo, boîte ou étiquette d'une grande maison) :
 * Adja (boîte, étiquette et pochette Hermès sur les photos et vidéos) et Aminata (breloque « T » de Tod's).
 * Elles reviendront avec des photos et des pièces sans marque. Le serveur garde la même liste (server/catalog.js).
 */
export const PAUSED_SLUG_PREFIXES = ['tongs-adja-', 'sac-aminata-'];
export const isPaused = (p: { slug: string }) => PAUSED_SLUG_PREFIXES.some(pre => p.slug.startsWith(pre));

export const INITIAL_PRODUCTS: Product[] = ALL_PRODUCTS.filter(p => isOnSale(p.category) && !isPaused(p));
