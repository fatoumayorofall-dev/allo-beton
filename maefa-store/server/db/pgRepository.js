// ============================================================
//  PERSISTANCE POSTGRESQL (ORM Drizzle + pilote pg)
//  Le serveur travaille sur un état en mémoire (lectures instantanées) ; ce dépôt :
//  - au démarrage, reconstruit cet état à partir des tables (load) ;
//  - à chaque sauvegarde, n'écrit que les lignes qui ont changé, dans une transaction (sync).
//  Les tables suivent le modèle relationnel de docs/MERISE.md (server/db/schema.js).
// ============================================================
import { inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as t from './schema.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const nn = v => (v === undefined ? null : v);
const num = v => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);

/**
 * Description de chaque table : comment produire ses lignes à partir de l'état en mémoire
 * (`rows`), la clé d'une ligne (`key`), et les tables « enfants » à réécrire avec elle.
 */
const TABLES = [
  {
    table: t.customers,
    pk: [t.customers.phone],
    key: r => r.phone,
    rows: s =>
      Object.values(s.users).map(u => {
        const { addresses: _a, ...data } = u;
        return {
          phone: u.phone,
          firstName: nn(u.firstName),
          lastName: nn(u.lastName),
          pinHash: nn(u.pinHash),
          createdAt: nn(u.createdAt),
          updatedAt: nn(u.updatedAt),
          data,
        };
      }),
  },
  {
    table: t.customerAddresses,
    pk: [t.customerAddresses.customerPhone, t.customerAddresses.id],
    key: r => `${r.customerPhone}|${r.id}`,
    rows: s =>
      Object.values(s.users).flatMap(u =>
        (u.addresses ?? []).map((a, position) => ({
          id: String(a.id),
          customerPhone: u.phone,
          position,
          name: a.name ?? 'Adresse',
          icon: nn(a.icon),
          lat: a.lat,
          lng: a.lng,
          label: nn(a.label),
          landmark: nn(a.landmark),
          accuracy: nn(a.accuracy),
          source: nn(a.source),
        })),
      ),
  },
  {
    table: t.sessions,
    pk: [t.sessions.tokenHash],
    key: r => r.tokenHash,
    rows: s =>
      Object.entries(s.sessions)
        .filter(([, v]) => s.users[v.phone])
        .map(([tokenHash, v]) => ({ tokenHash, customerPhone: v.phone, createdAt: v.createdAt })),
  },
  {
    table: t.products,
    pk: [t.products.id],
    key: r => r.id,
    rows: s =>
      (s.catalog ?? []).map((p, position) => ({
        id: p.id,
        slug: p.slug,
        position,
        name: p.name,
        category: p.category,
        price: num(p.price),
        oldPrice: num(p.oldPrice),
        stock: Math.max(0, num(p.stock) ?? 0),
        preorderDays: num(p.preorderDays),
        data: p,
      })),
  },
  {
    table: t.purchaseRequests,
    pk: [t.purchaseRequests.id],
    key: r => r.id,
    rows: s =>
      Object.values(s.requests ?? {}).map(r => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        total: num(r.total) ?? 0,
        orderId: nn(r.orderId),
        customerPhone: nn(r.customer?.phone),
        data: r,
      })),
  },
  {
    table: t.requestItems,
    pk: [t.requestItems.requestId, t.requestItems.position],
    key: r => `${r.requestId}|${r.position}`,
    rows: s =>
      Object.values(s.requests ?? {}).flatMap(r =>
        r.items.map((i, position) => ({
          requestId: r.id,
          position,
          productId: i.productId,
          name: i.name,
          price: num(i.price) ?? 0,
          catalogPrice: num(i.catalogPrice),
          quantity: num(i.quantity) ?? 1,
          size: nn(i.size),
          color: nn(i.color),
        })),
      ),
  },
  {
    table: t.orders,
    pk: [t.orders.id],
    key: r => r.id,
    rows: s =>
      Object.values(s.shopOrders).map(o => ({
        id: o.id,
        status: o.status,
        paymentMethod: nn(o.paymentMethod),
        paymentStatus: nn(o.paymentStatus),
        subtotal: num(o.subtotal),
        discount: num(o.discount),
        deliveryFee: num(o.deliveryFee),
        total: num(o.total) ?? 0,
        zone: nn(o.customer?.zone),
        customerPhone: nn(o.customer?.phone),
        requestId: nn(o.requestId),
        createdAt: o.createdAt,
        data: o,
      })),
  },
  {
    table: t.orderItems,
    pk: [t.orderItems.orderId, t.orderItems.position],
    key: r => `${r.orderId}|${r.position}`,
    rows: s =>
      Object.values(s.shopOrders).flatMap(o =>
        (o.items ?? []).map((i, position) => ({
          orderId: o.id,
          position,
          productId: i.productId,
          name: i.name,
          price: num(i.price) ?? 0,
          quantity: num(i.quantity) ?? 1,
          size: nn(i.size),
          color: nn(i.color),
        })),
      ),
  },
  {
    table: t.accountOrders,
    pk: [t.accountOrders.customerPhone, t.accountOrders.orderId],
    key: r => `${r.customerPhone}|${r.orderId}`,
    rows: s =>
      Object.entries(s.orders)
        .filter(([phone]) => s.users[phone])
        .flatMap(([phone, list]) =>
          list.map((o, position) => ({ customerPhone: phone, orderId: o.id, position, data: o })),
        ),
  },
  {
    table: t.deliveries,
    pk: [t.deliveries.orderId],
    key: r => r.orderId,
    rows: s => Object.entries(s.deliveries).map(([orderId, data]) => ({ orderId, data })),
  },
  {
    table: t.tours,
    pk: [t.tours.id],
    key: r => r.id,
    rows: s => Object.values(s.tours ?? {}).map(x => ({ id: x.id, token: x.token, createdAt: x.createdAt, data: x })),
  },
  {
    table: t.authCodes,
    pk: [t.authCodes.code],
    key: r => r.code,
    rows: s => Object.values(s.authCodes).map(c => ({ code: c.code, createdAt: c.createdAt, data: c })),
  },
  {
    table: t.marketProducts,
    pk: [t.marketProducts.id],
    key: r => r.id,
    rows: s => Object.values(s.market.products).map(p => ({ id: p.id, slug: p.slug, createdAt: p.createdAt, data: p })),
  },
  {
    table: t.productComments,
    pk: [t.productComments.id],
    key: r => r.id,
    rows: s =>
      Object.values(s.comments ?? {}).map(c => ({
        id: c.id,
        productId: c.productId,
        status: c.status,
        rating: c.rating ?? null,
        createdAt: c.createdAt,
        data: c,
      })),
  },
  {
    table: t.appSettings,
    pk: [t.appSettings.key],
    key: r => r.key,
    rows: s => [
      { key: 'showcase', value: s.showcase },
      { key: 'visits', value: s.visits },
      { key: 'marketSettings', value: s.market.settings },
      { key: 'catalogPublished', value: s.catalog !== null },
      { key: 'catalogUpdatedAt', value: s.catalogUpdatedAt },
      { key: 'stockAlerts', value: s.stockAlerts },
    ],
  },
];

export async function createPgRepository(url) {
  const pool = new pg.Pool({
    connectionString: url,
    max: 5,
    ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool);
  // Migrations : crée ou met à jour les tables (fichiers SQL générés par drizzle-kit)
  await migrate(db, { migrationsFolder: path.join(here, 'migrations') });

  /** Dernière version écrite de chaque ligne, par table : seules les différences sont envoyées. */
  const written = new Map(TABLES.map(d => [d.table, new Map()]));

  async function load() {
    const all = new Map(await Promise.all(TABLES.map(async d => [d.table, await db.select().from(d.table)])));
    const settings = Object.fromEntries(all.get(t.appSettings).map(r => [r.key, r.value]));
    const addresses = {};
    for (const a of all.get(t.customerAddresses).sort((x, y) => x.position - y.position)) {
      const { customerPhone, position: _p, ...rest } = a;
      const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null));
      (addresses[customerPhone] ??= []).push(clean);
    }
    const accountOrders = {};
    for (const r of all.get(t.accountOrders).sort((x, y) => x.position - y.position))
      (accountOrders[r.customerPhone] ??= []).push(r.data);
    const state = {
      users: Object.fromEntries(
        all
          .get(t.customers)
          .map(c => [c.phone, { ...c.data, ...(addresses[c.phone] ? { addresses: addresses[c.phone] } : {}) }]),
      ),
      sessions: Object.fromEntries(
        all.get(t.sessions).map(s => [s.tokenHash, { phone: s.customerPhone, createdAt: s.createdAt }]),
      ),
      orders: accountOrders,
      shopOrders: Object.fromEntries(all.get(t.orders).map(o => [o.id, o.data])),
      requests: Object.fromEntries(all.get(t.purchaseRequests).map(r => [r.id, r.data])),
      deliveries: Object.fromEntries(all.get(t.deliveries).map(d => [d.orderId, d.data])),
      tours: Object.fromEntries(all.get(t.tours).map(x => [x.id, x.data])),
      authCodes: Object.fromEntries(all.get(t.authCodes).map(c => [c.code, c.data])),
      comments: Object.fromEntries(all.get(t.productComments).map(c => [c.id, c.data])),
      market: {
        products: Object.fromEntries(all.get(t.marketProducts).map(p => [p.id, p.data])),
        settings: settings.marketSettings ?? null,
      },
      catalog: settings.catalogPublished
        ? all
            .get(t.products)
            .sort((a, b) => a.position - b.position)
            .map(p => p.data)
        : null,
      catalogUpdatedAt: settings.catalogUpdatedAt ?? null,
      showcase: settings.showcase ?? [],
      visits: settings.visits ?? {},
      stockAlerts: settings.stockAlerts ?? [],
    };
    // Point de départ des différences : ce qui est en base (les lignes inchangées ne seront pas réécrites)
    for (const d of TABLES) {
      const inDb = new Set(all.get(d.table).map(d.key));
      written.set(
        d.table,
        new Map(
          d
            .rows(state)
            .filter(r => inDb.has(d.key(r)))
            .map(r => [d.key(r), JSON.stringify(r)]),
        ),
      );
      for (const k of inDb) if (!written.get(d.table).has(k)) written.get(d.table).set(k, null);
    }
    const empty = TABLES.every(d => all.get(d.table).length === 0);
    return { state, empty };
  }

  /** Écrit les différences entre l'état en mémoire et la dernière écriture, en une transaction. */
  async function sync(state) {
    const plan = TABLES.map(d => {
      const before = written.get(d.table);
      const now = new Map();
      for (const r of d.rows(state)) now.set(d.key(r), { row: r, json: JSON.stringify(r) });
      const upserts = [...now].filter(([k, v]) => before.get(k) !== v.json).map(([, v]) => v.row);
      const removed = [...before.keys()].filter(k => !now.has(k));
      return { d, now, upserts, removed };
    });
    if (plan.every(p => !p.upserts.length && !p.removed.length)) return;
    await db.transaction(async tx => {
      // Suppressions des enfants vers les parents (clés étrangères), puis ajouts des parents vers les enfants
      for (const { d, removed } of [...plan].reverse()) {
        if (!removed.length) continue;
        if (d.pk.length === 1) await tx.delete(d.table).where(inArray(d.pk[0], removed));
        else
          for (const k of removed) {
            const parts = k.split('|');
            await tx.delete(d.table).where(
              sql.join(
                d.pk.map((c, i) => sql`${c} = ${parts[i]}`),
                sql` and `,
              ),
            );
          }
      }
      for (const { d, upserts } of plan) {
        for (let i = 0; i < upserts.length; i += 500) {
          const chunk = upserts.slice(i, i + 500);
          const cols = Object.keys(chunk[0]);
          await tx
            .insert(d.table)
            .values(chunk)
            .onConflictDoUpdate({
              target: d.pk,
              set: Object.fromEntries(cols.map(c => [c, sql.raw(`excluded.${d.table[c].name}`)])),
            });
        }
      }
    });
    for (const { d, now } of plan) written.set(d.table, new Map([...now].map(([k, v]) => [k, v.json])));
  }

  return { load, sync, close: () => pool.end() };
}
