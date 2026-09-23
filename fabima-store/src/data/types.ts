export type CategoryId = 'chaussures' | 'sacs' | 'accessoires' | 'bijoux' | 'vetements';

export type OccasionId = 'mariage' | 'soiree' | 'bureau' | 'quotidien' | 'ceremonie' | 'vacances';

export interface Occasion {
  id: OccasionId;
  name: string;
  tagline: string;
  image: string;
}

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  image: string;
}

export interface ColorOption {
  name: string;
  hex: string;
}

export interface Review {
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  subcategory: string;
  occasions: OccasionId[];
  /** Matière et composition */
  material: string;
  /** Conseils d'entretien */
  care: string;
  /** Conseil de style de l'équipe */
  styleTip: string;
  price: number;
  oldPrice?: number;
  images: string[];
  colors: ColorOption[];
  sizes: string[];
  stock: number;
  description: string;
  details: string[];
  rating: number;
  reviewCount: number;
  reviews?: Review[];
  isNew?: boolean;
  isBestseller?: boolean;
  createdAt: string;
}

export interface CartItem {
  key: string; // productId|size|color
  productId: string;
  name: string;
  image: string;
  price: number;
  size?: string;
  color?: string;
  quantity: number;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  zone: string;
  address: string;
  notes?: string;
  /** Point de livraison choisi sur la carte (GPS, recherche ou déplacement de la carte) */
  location?: DeliveryLocation;
}

export interface DeliveryLocation {
  lat: number;
  lng: number;
  /** Adresse lisible du point (« Rue SC-110, Sacré-Cœur 3, Dakar ») */
  label?: string;
  /** Précision du GPS en mètres */
  accuracy?: number;
  /** Repère donné par la cliente : portail vert, près de la mosquée… */
  landmark?: string;
  source?: 'gps' | 'recherche' | 'carte';
}

export type Vehicle = 'moto' | 'voiture' | 'car';

/** Point de relais (gare routière, station…) où un livreur passe le colis au suivant */
export interface RelayPoint { label: string; lat?: number; lng?: number }

/** Une étape de la livraison, avec son livreur */
export interface DeliveryLeg {
  driverName: string;
  driverPhone: string;
  vehicle: Vehicle;
  /** Point de relais ; `null` = jusqu'à la cliente (dernière étape) */
  to: RelayPoint | null;
  state: 'attente' | 'en_route' | 'remis';
  startedAt: string | null;
  doneAt: string | null;
  /** Lien secret du livreur (vue gérante uniquement) */
  driverLink?: string;
}

/** Livraison suivie en direct (renvoyée par le serveur) — le livreur affiché est celui de l'étape en cours */
export interface DeliveryInfo {
  driverName: string;
  driverPhone: string;
  vehicle?: Vehicle;
  state: 'assignee' | 'en_route' | 'livree';
  assignedAt: string;
  startedAt: string | null;
  deliveredAt: string | null;
  position: { lat: number; lng: number; accuracy: number | null; heading: number | null; speed: number | null; at: string; stale: boolean } | null;
  distanceM: number | null;
  etaMin: number | null;
  /** Lien secret du livreur de l'étape en cours (vue gérante uniquement) */
  driverLink?: string;
  /** Livraison en plusieurs étapes (relais) */
  relay?: boolean;
  /** Numéro de l'étape en cours (0 = première) */
  current?: number;
  /** L'étape en cours va jusqu'à la cliente */
  final?: boolean;
  /** Point de relais visé par l'étape en cours */
  target?: RelayPoint | null;
  legs?: DeliveryLeg[];
}

export interface StockAlert {
  productId: string;
  contact: string;
  createdAt: string;
}

export type PaymentMethod = 'wave' | 'orange_money' | 'free_money' | 'card' | 'cash';

export type OrderStatus = 'en_attente' | 'confirmee' | 'en_preparation' | 'expediee' | 'livree' | 'annulee';

export interface Order {
  id: string;
  createdAt: string;
  customer: CustomerInfo;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  giftFee: number;
  giftMessage?: string;
  total: number;
  promoCode?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'en_attente' | 'paye';
  status: OrderStatus;
  history: { status: OrderStatus; date: string }[];
  /** Journal des messages WhatsApp liés à la commande */
  notifications?: OrderNotification[];
  /** Livreur et position (commandes enregistrées sur le serveur, vue gérante) */
  delivery?: DeliveryInfo | null;
}

export interface OrderNotification {
  date: string;
  /** Événement notifié : nouvelle commande ou changement de statut */
  event: 'nouvelle' | OrderStatus;
  to: 'gerante' | 'cliente';
  /** auto = envoyé par le serveur ; manuel = ouvert dans WhatsApp par la gérante ; echec = envoi automatique raté */
  channel: 'auto' | 'manuel' | 'echec';
}
