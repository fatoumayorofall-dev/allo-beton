export type CategoryId = 'chaussures' | 'sacs' | 'accessoires' | 'bijoux' | 'vetements';

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
  gender: 'femme' | 'homme' | 'unisexe';
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
}
