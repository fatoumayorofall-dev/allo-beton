import type { Category, ColorOption, Occasion, Product } from './types';
import { isOnSale } from '../config/site';

/** Image Pexels redimensionnée. Une image indisponible est remplacée à l'affichage par un visuel de secours. */
export const px = (id: number, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

/**
 * Version du catalogue initial. À incrémenter quand INITIAL_PRODUCTS change de structure :
 * les navigateurs qui gardaient une ancienne copie en mémoire repartent alors du nouveau catalogue.
 */
export const CATALOG_VERSION = 4;

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
  subcategory: 'Sacs à main',
  occasions: ['bureau', 'quotidien', 'ceremonie', 'mariage'],
  material: 'Aspect daim, finitions lisses, coutures contrastées',
  care: 'Brosser à sec avec une brosse douce, éviter la pluie et les taches grasses, ranger à l\'abri de la chaleur.',
  styleTip: 'À la main pour une tenue habillée, en bandoulière pour les journées chargées : il passe du bureau aux cérémonies.',
  price: 25000,
  images: media(`sac-ndella-${key}`, photos),
  video: video ? `/videos/sac-ndella-${key}.mp4` : undefined,
  colors: [color],
  sizes: [],
  stock: 3,
  description: `Le sac Ndella en ${color.name.toLowerCase()} : une silhouette structurée, un rabat aux lignes douces, une anse sur le dessus et une bandoulière amovible. Chic en toutes circonstances.`,
  details: ['Sac à main à rabat', `Couleur : ${color.name}`, 'Aspect daim, finitions lisses', 'Anse sur le dessus et bandoulière amovible', 'Livré dans un emballage Maefa'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  isBestseller: true,
  createdAt: '2026-09-29T10:00:00Z',
});

/** Tongs à anneau doré : semelle plate, bride entre les doigts, gros anneau doré sculpté. */
const tongs = (color: ColorOption, key: string) => p({
  slug: `tongs-anneau-dore-${key}`,
  name: `Tongs à anneau doré — ${color.name}`,
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
  stock: 6,
  description: `Des tongs plates en ${color.name.toLowerCase()}, rehaussées d'un grand anneau doré sculpté : confortables toute la journée et assez élégantes pour le soir.`,
  details: ['Tongs plates, bride entre les doigts', `Couleur : ${color.name}`, 'Grand anneau en métal doré', 'Semelle plate confortable', 'Pointures du 36 au 41'],
  rating: 0,
  reviewCount: 0,
  isNew: true,
  createdAt: '2026-09-29T11:00:00Z',
});

/** Catalogue complet, y compris les pièces des catégories pas encore en vente. */
export const ALL_PRODUCTS: Product[] = [
  ndella({ name: 'Camel', hex: '#a8683a' }, 'camel', 2),
  ndella({ name: 'Bordeaux', hex: '#6e1f34' }, 'bordeaux', 1, false),
  ndella(COLORS.noir, 'noir', 2),
  ndella({ name: 'Chocolat', hex: '#5a3526' }, 'chocolat', 2),
  tongs(COLORS.or, 'dore'),
  tongs(COLORS.noir, 'noir'),
  tongs(COLORS.blanc, 'blanc'),
  tongs({ name: 'Bordeaux', hex: '#5b2430' }, 'bordeaux'),
];

export const INITIAL_PRODUCTS: Product[] = ALL_PRODUCTS.filter(p => isOnSale(p.category));
