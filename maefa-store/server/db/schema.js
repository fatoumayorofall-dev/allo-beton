// ============================================================
//  SCHÉMA POSTGRESQL (ORM Drizzle) — modèle logique issu du MCD (docs/MERISE.md)
//  Chaque table garde des colonnes typées (recherche, contraintes, clés étrangères) et, quand
//  l'objet est riche (photos, couleurs, étapes de livraison), le document complet en JSONB.
//  Migrations générées par drizzle-kit : server/db/migrations/ (npm run db:generate).
// ============================================================
import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true, mode: 'string' });

/* ---------- Clientes ---------- */
export const customers = pgTable('customers', {
  phone: text('phone').primaryKey(), // RG1 : identifiant = numéro au format international
  firstName: text('first_name'),
  lastName: text('last_name'),
  pinHash: text('pin_hash'), // code personnel chiffré (scrypt), jamais en clair
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  data: jsonb('data').notNull(),
});

/** RG2 : une cliente enregistre plusieurs adresses ; une adresse appartient à une seule cliente. */
export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: text('id').notNull(),
    customerPhone: text('customer_phone')
      .notNull()
      .references(() => customers.phone, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    icon: text('icon'),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    label: text('label'),
    landmark: text('landmark'),
    accuracy: doublePrecision('accuracy'),
    source: text('source'),
  },
  t => [
    primaryKey({ columns: [t.customerPhone, t.id] }),
    check('lat_valide', sql`${t.lat} between -90 and 90`),
    check('lng_valide', sql`${t.lng} between -180 and 180`),
  ],
);

/** RG12 : seule l'empreinte du jeton est gardée. */
export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    customerPhone: text('customer_phone')
      .notNull()
      .references(() => customers.phone, { onDelete: 'cascade' }),
    createdAt: createdAt().notNull(),
  },
  t => [index('sessions_customer_idx').on(t.customerPhone)],
);

/* ---------- Catalogue ---------- */
export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    price: integer('price').notNull(),
    oldPrice: integer('old_price'),
    stock: integer('stock').notNull().default(0),
    preorderDays: integer('preorder_days'),
    data: jsonb('data').notNull(),
  },
  t => [
    uniqueIndex('products_slug_idx').on(t.slug),
    index('products_category_idx').on(t.category),
    check('prix_positif', sql`${t.price} > 0`),
    check('stock_positif', sql`${t.stock} >= 0`),
  ],
);

/* ---------- Demandes WhatsApp et commandes ---------- */
export const purchaseRequests = pgTable(
  'purchase_requests',
  {
    id: text('id').primaryKey(), // DEM-XXXXX
    status: text('status').notNull(),
    createdAt: createdAt().notNull(),
    total: integer('total').notNull(),
    orderId: text('order_id'),
    customerPhone: text('customer_phone'),
    data: jsonb('data').notNull(),
  },
  t => [
    index('requests_status_idx').on(t.status),
    check('statut_demande', sql`${t.status} in ('nouvelle', 'disponible', 'indisponible', 'commandee')`),
  ],
);

/** Association CONTENIR_DEMANDE (DEMANDE–PRODUIT) avec le prix convenu (RG5). */
export const requestItems = pgTable(
  'request_items',
  {
    requestId: text('request_id')
      .notNull()
      .references(() => purchaseRequests.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    productId: text('product_id').notNull(),
    name: text('name').notNull(),
    price: integer('price').notNull(),
    catalogPrice: integer('catalog_price'),
    quantity: integer('quantity').notNull(),
    size: text('size'),
    color: text('color'),
  },
  t => [
    primaryKey({ columns: [t.requestId, t.position] }),
    check('quantite_demande', sql`${t.quantity} between 1 and 20`),
  ],
);

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(), // MAE-…
    status: text('status').notNull(),
    paymentMethod: text('payment_method'),
    paymentStatus: text('payment_status'),
    subtotal: integer('subtotal'),
    discount: integer('discount'),
    deliveryFee: integer('delivery_fee'),
    total: integer('total').notNull(),
    zone: text('zone'),
    customerPhone: text('customer_phone'),
    requestId: text('request_id'), // RG6 : demande finalisée
    createdAt: createdAt().notNull(),
    data: jsonb('data').notNull(),
  },
  t => [
    index('orders_status_idx').on(t.status),
    index('orders_customer_idx').on(t.customerPhone),
    index('orders_created_idx').on(t.createdAt),
    check('total_positif', sql`${t.total} >= 0`),
  ],
);

/** Association CONTENIR (COMMANDE–PRODUIT). */
export const orderItems = pgTable(
  'order_items',
  {
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    productId: text('product_id').notNull(),
    name: text('name').notNull(),
    price: integer('price').notNull(),
    quantity: integer('quantity').notNull(),
    size: text('size'),
    color: text('color'),
  },
  t => [primaryKey({ columns: [t.orderId, t.position] }), index('order_items_product_idx').on(t.productId)],
);

/** Copies des commandes rattachées au compte d'une cliente (historique « Mes commandes »). */
export const accountOrders = pgTable(
  'account_orders',
  {
    customerPhone: text('customer_phone')
      .notNull()
      .references(() => customers.phone, { onDelete: 'cascade' }),
    orderId: text('order_id').notNull(),
    position: integer('position').notNull(),
    data: jsonb('data').notNull(),
  },
  t => [primaryKey({ columns: [t.customerPhone, t.orderId] })],
);

/* ---------- Livraison ---------- */
/** Étapes de livraison (relais) d'une commande : document JSONB (livreurs, positions, codes). */
export const deliveries = pgTable('deliveries', {
  orderId: text('order_id').primaryKey(),
  data: jsonb('data').notNull(),
});

/** Association DESSERVIR : les arrêts ordonnés sont dans `data.stops`. */
export const tours = pgTable(
  'tours',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull(),
    createdAt: createdAt().notNull(),
    data: jsonb('data').notNull(),
  },
  t => [uniqueIndex('tours_token_idx').on(t.token)],
);

/* ---------- Outils de la gérante ---------- */
export const stockAlerts = pgTable('stock_alerts', {
  id: serial('id').primaryKey(),
  productId: text('product_id').notNull(),
  contact: text('contact').notNull(),
  createdAt: createdAt().notNull(),
});

export const authCodes = pgTable('auth_codes', {
  code: text('code').primaryKey(),
  createdAt: createdAt().notNull(),
  data: jsonb('data').notNull(),
});

export const marketProducts = pgTable('market_products', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  createdAt: createdAt().notNull(),
  data: jsonb('data').notNull(),
});

/** Avis et questions sur les pièces (association NOTER : CLIENTE – PRODUIT). */
export const productComments = pgTable(
  'product_comments',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    status: text('status').notNull(),
    rating: integer('rating'),
    createdAt: createdAt().notNull(),
    data: jsonb('data').notNull(),
  },
  t => [
    index('comments_product_idx').on(t.productId),
    check('note_valide', sql`${t.rating} is null or ${t.rating} between 1 and 5`),
    check('statut_avis', sql`${t.status} in ('publie', 'masque')`),
  ],
);

/** Réglages et petits documents (vitrine, visites, réglages du Marché, date du catalogue). */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value'),
});
