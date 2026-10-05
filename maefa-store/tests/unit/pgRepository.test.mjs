// Test d'intégration de la persistance PostgreSQL (ORM Drizzle).
// Lancé seulement si TEST_DATABASE_URL est défini (base de test vidée à chaque lancement).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { createPgRepository } from '../../server/db/pgRepository.js';

const URL = process.env.TEST_DATABASE_URL;
const opts = { skip: !URL && 'TEST_DATABASE_URL non défini' };

async function sqlQuery(q, params) {
  const c = new pg.Client({ connectionString: URL });
  await c.connect();
  try {
    return (await c.query(q, params)).rows;
  } finally {
    await c.end();
  }
}

const baseState = () => ({
  showcase: [{ slug: 'sac-ndella-noir', addedAt: '2026-10-01T10:00:00.000Z' }],
  visits: { 'sac-ndella-noir': { statut: 2, partage: 1, vitrine: 0, last: null } },
  users: {
    '+221771112233': {
      phone: '+221771112233',
      firstName: 'Awa',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
      addresses: [{ id: 'a1', name: 'Maison', icon: '🏠', lat: 14.7, lng: -17.46, landmark: 'À côté de la mosquée' }],
    },
  },
  sessions: { abc: { phone: '+221771112233', createdAt: '2026-10-01T10:00:00.000Z' } },
  orders: {},
  shopOrders: {
    'MAE-1': {
      id: 'MAE-1',
      status: 'en_attente',
      total: 23500,
      createdAt: '2026-10-01T11:00:00.000Z',
      customer: { phone: '77 111 22 33', zone: 'Médina' },
      items: [{ productId: 'MAE-103', name: 'Sac Ndella — Noir', price: 22000, quantity: 1, color: 'Noir' }],
    },
  },
  deliveries: {},
  tours: {},
  requests: {
    'DEM-ABCDE': {
      id: 'DEM-ABCDE',
      status: 'disponible',
      createdAt: '2026-10-01T10:30:00.000Z',
      total: 22000,
      items: [{ productId: 'MAE-103', name: 'Sac Ndella — Noir', price: 22000, catalogPrice: 25000, quantity: 1 }],
    },
  },
  market: { products: {}, settings: null },
  catalog: [
    { id: 'MAE-103', slug: 'sac-ndella-noir', name: 'Sac Ndella — Noir', category: 'sacs', price: 25000, stock: 20 },
  ],
  catalogUpdatedAt: '2026-10-01T09:00:00.000Z',
  stockAlerts: [],
  authCodes: {},
});

test('enregistrement puis relecture identique (aller-retour)', opts, async () => {
  await sqlQuery('DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const repo = await createPgRepository(URL);
  const first = await repo.load();
  assert.equal(first.empty, true);
  const state = baseState();
  await repo.sync(state);
  await repo.close();

  const again = await createPgRepository(URL);
  const { state: loaded, empty } = await again.load();
  assert.equal(empty, false);
  assert.deepEqual(loaded.users, state.users);
  assert.deepEqual(loaded.shopOrders, state.shopOrders);
  assert.deepEqual(loaded.requests, state.requests);
  assert.deepEqual(loaded.catalog, state.catalog);
  assert.deepEqual(loaded.showcase, state.showcase);
  await again.close();
});

test('les tables relationnelles sont remplies (requêtes SQL possibles)', opts, async () => {
  const items = await sqlQuery('select product_id, price, quantity from order_items where order_id = $1', ['MAE-1']);
  assert.deepEqual(items, [{ product_id: 'MAE-103', price: 22000, quantity: 1 }]);
  const deal = await sqlQuery('select price, catalog_price from request_items where request_id = $1', ['DEM-ABCDE']);
  assert.deepEqual(deal, [{ price: 22000, catalog_price: 25000 }]);
  const addr = await sqlQuery('select name, landmark from customer_addresses where customer_phone = $1', [
    '+221771112233',
  ]);
  assert.equal(addr[0].landmark, 'À côté de la mosquée');
});

test('seules les différences sont écrites ; suppression en cascade', opts, async () => {
  const repo = await createPgRepository(URL);
  const { state } = await repo.load();
  state.shopOrders['MAE-1'].status = 'livree';
  delete state.users['+221771112233'];
  delete state.sessions.abc;
  await repo.sync(state);
  assert.deepEqual(await sqlQuery("select status from orders where id = 'MAE-1'"), [{ status: 'livree' }]);
  assert.equal((await sqlQuery('select count(*)::int as n from customers'))[0].n, 0);
  assert.equal((await sqlQuery('select count(*)::int as n from customer_addresses'))[0].n, 0);
  assert.equal((await sqlQuery('select count(*)::int as n from sessions'))[0].n, 0);
  await repo.close();
});

test('les contraintes de la base refusent une donnée incohérente', opts, async () => {
  await assert.rejects(
    sqlQuery(
      "insert into products (id, slug, position, name, category, price, stock, data) values ('X', 'x', 0, 'X', 'sacs', -5, 0, '{}')",
    ),
    /prix_positif/,
  );
  await assert.rejects(
    sqlQuery(
      "insert into purchase_requests (id, status, created_at, total, data) values ('DEM-ZZZZZ', 'inconnu', now(), 0, '{}')",
    ),
    /statut_demande/,
  );
});
