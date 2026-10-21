// Paiement en ligne : partage de l'argent (vendeuse, livreur, plateforme, cliente), signature Wave,
// appel de l'API Wave, versements automatiques ou « à verser ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createPayments, failedSplitOf, splitOf, verifyWaveSignature } from '../../server/marketplace/payments.js';

const S = { driverRate: 0.1, sellerRate: 0.07, buyerFee: 150 };
const order = (mode, extra = {}) => ({
  id: 'C-1',
  sellerId: 'V-1',
  buyerPhone: '+221780000001',
  buyer: { name: 'Khady' },
  subtotal: 20000,
  buyerFee: 150,
  commissions: { seller: 1400, buyer: 150 },
  delivery: { mode, fee: 2000, share: 2000 },
  total: 22150,
  onlinePayment: { id: 'PAY-1', status: 'payee', amount: 22150 },
  status: 'livree',
  ...extra,
});

test('vendeuse qui livre elle-même : articles − commission + livraison ; la plateforme garde commission + frais', () => {
  const s = splitOf(order('vendeur'), S);
  assert.deepEqual(s, { paid: 22150, seller: 20000 - 1400 + 2000, driver: 0, platform: 1400 + 150, refund: 0 });
  assert.equal(s.seller + s.driver + s.platform + s.refund, s.paid);
});

test('livreur : la vendeuse reçoit articles − commission, le livreur sa course − 10 %', () => {
  const s = splitOf(order('express'), S);
  assert.equal(s.seller, 18600);
  assert.equal(s.driver, 1800);
  assert.equal(s.platform, 1400 + 150 + 200);
  assert.equal(s.seller + s.driver + s.platform + s.refund, s.paid);
});

test('moitié-moitié moins cher que prévu : la différence est rendue à la cliente', () => {
  const s = splitOf(order('partagee', { delivery: { mode: 'partagee', fee: 2000, share: 1200 } }), S);
  assert.equal(s.refund, 800);
  assert.equal(s.driver, 1080);
  assert.equal(s.seller + s.driver + s.platform + s.refund, s.paid);
});

test('livraison ratée : la cliente récupère les articles, le livreur garde sa course', () => {
  const f = failedSplitOf(order('express'), S);
  assert.deepEqual(f, { paid: 22150, driver: 1800, refund: 20000, platform: 350 });
  assert.equal(failedSplitOf(order('vendeur'), S).refund, 22150);
});

test('signature Wave : HMAC-SHA256 de « horodatage + corps », récente', () => {
  const secret = 'wave_sn_WHS_test';
  const body = '{"type":"checkout.session.completed"}';
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', secret).update(`${t}${body}`).digest('hex');
  assert.equal(verifyWaveSignature(body, `t=${t},v1=${v1}`, secret), true);
  assert.equal(verifyWaveSignature(body, `t=${t},v1=${v1}`, 'autre'), false, 'mauvais secret');
  assert.equal(verifyWaveSignature(`${body} `, `t=${t},v1=${v1}`, secret), false, 'corps modifié');
  const old = t - 3600;
  const v1old = crypto.createHmac('sha256', secret).update(`${old}${body}`).digest('hex');
  assert.equal(verifyWaveSignature(body, `t=${old},v1=${v1old}`, secret), false, 'trop ancienne');
  assert.equal(verifyWaveSignature(body, undefined, secret), false);
});

/** Petit magasin en mémoire (commandes, vendeuses, livreurs) */
function memStore(orders) {
  const o = new Map(orders.map(x => [x.id, x]));
  return {
    listMpOrders: () => [...o.values()],
    getMpOrder: id => o.get(id),
    saveMpOrder: x => (o.set(x.id, x), x),
    getMpSeller: () => ({
      id: 'V-1',
      shopName: 'Awa',
      ownerPhone: '+221770000001',
      payout: { phone: '+221770000009' },
    }),
    getMpDriver: () => ({ id: 'D-1', name: 'Moussa', ownerPhone: '+221770000002' }),
  };
}
const ledger = () => {
  const lines = [];
  return { lines, append: (type, data) => lines.push({ type, data }) };
};
const settle = () => new Promise(r => setTimeout(r, 20));

test('Wave : session de paiement créée avec le montant, la référence et les adresses de retour', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: 'cos-123', wave_launch_url: 'https://pay.wave.com/c/cos-123' }), {
      status: 200,
    });
  };
  const o = order('vendeur', {
    status: 'nouvelle',
    onlinePayment: { id: 'PAY-9', status: 'en_attente', amount: 22150 },
  });
  const p = createPayments({
    store: memStore([o]),
    settings: () => S,
    ledger: ledger(),
    notify: () => {},
    siteUrl: () => 'https://sama.sn',
    env: { WAVE_CHECKOUT_KEY: 'wave_sn_prod_x', WAVE_WEBHOOK_SECRET: 's' },
    fetchImpl,
  });
  assert.deepEqual(p.methods(), ['wave'], 'Orange Money en ligne pas encore proposé');
  const r = await p.start([o], 'wave');
  assert.equal(r.url, 'https://pay.wave.com/c/cos-123');
  assert.equal(calls[0].url, 'https://api.wave.com/v1/checkout/sessions');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer wave_sn_prod_x');
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body, {
    amount: '22150',
    currency: 'XOF',
    client_reference: 'PAY-9',
    success_url: 'https://sama.sn/m/paiement/PAY-9?retour=ok',
    error_url: 'https://sama.sn/m/paiement/PAY-9?retour=erreur',
  });
  assert.equal(p.automaticPayouts, false, 'sans clé « payout » : versements à faire par la gérante');
});

test('livraison confirmée : versements automatiques (mode test) ou « à verser », une seule fois', async () => {
  for (const [mode, expected] of [
    ['1', 'versee'],
    ['manuel', 'a_verser'],
  ]) {
    const o = order('express', { driverId: 'D-1' });
    const store = memStore([o]);
    const l = ledger();
    const p = createPayments({
      store,
      settings: () => S,
      ledger: l,
      notify: () => {},
      siteUrl: () => '',
      env: { PAYMENTS_SIMULATION: mode },
    });
    p.release(store.getMpOrder('C-1'));
    p.release(store.getMpOrder('C-1'));
    await settle();
    const payouts = store.getMpOrder('C-1').payouts;
    assert.deepEqual(
      payouts.map(x => [x.kind, x.amount, x.to, x.status]),
      [
        ['vendeur', 18600, '+221770000009', expected],
        ['livreur', 1800, '+221770000002', expected],
      ],
      mode,
    );
    assert.ok(l.lines.some(x => x.type === 'partage' && x.data.platform === 1750));
  }
});

test('paiement confirmé par Wave après l’annulation (30 minutes passées) : remboursé, une seule fois', async () => {
  const o = order('vendeur', { status: 'annulee', onlinePayment: { id: 'PAY-1', status: 'expiree', amount: 22150 } });
  const store = memStore([o]);
  const l = ledger();
  const p = createPayments({
    store,
    settings: () => S,
    ledger: l,
    notify: () => {},
    siteUrl: () => '',
    env: { PAYMENTS_SIMULATION: '1' },
  });
  let announced = 0;
  p.hooks.onPaid = () => announced++;
  p.markPaid('PAY-1', 'wave');
  p.markPaid('PAY-1', 'wave');
  await settle();
  const fresh = store.getMpOrder('C-1');
  assert.equal(announced, 0, 'commande annulée : pas relancée');
  assert.equal(fresh.status, 'annulee');
  assert.equal(fresh.onlinePayment.status, 'remboursee');
  assert.deepEqual(
    fresh.payouts.map(x => [x.kind, x.amount]),
    [['remboursement', 22150]],
  );
});

test('commande annulée après paiement : la cliente est remboursée en entier', async () => {
  const o = order('vendeur', { status: 'annulee' });
  const store = memStore([o]);
  const p = createPayments({
    store,
    settings: () => S,
    ledger: ledger(),
    notify: () => {},
    siteUrl: () => '',
    env: { PAYMENTS_SIMULATION: '1' },
  });
  p.refund(o);
  p.refund(store.getMpOrder('C-1'));
  await settle();
  const fresh = store.getMpOrder('C-1');
  assert.equal(fresh.onlinePayment.status, 'remboursee');
  assert.deepEqual(
    fresh.payouts.map(x => [x.kind, x.amount, x.to]),
    [['remboursement', 22150, '+221780000001']],
  );
});
