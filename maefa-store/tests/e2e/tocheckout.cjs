// Prix confidentiels : la page de commande ne s'ouvre qu'avec une demande confirmée par la gérante.
// On note le panier comme demande, on la confirme (« disponible ») puis on ouvre le lien de finalisation.
const API = 'http://localhost:8787';
const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
module.exports = async function toCheckout(page, base, opts) {
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('maefa_cart') || '[]'));
  const id = 'DEM-' + Array.from({ length: 5 }, () => AL[Math.floor(Math.random() * AL.length)]).join('');
  const items = cart.map(i => ({
    productId: i.productId,
    name: i.name,
    price: i.price,
    image: i.image,
    size: i.size,
    color: i.color,
    quantity: i.quantity,
  }));
  const r1 = await fetch(API + '/api/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, items }),
  });
  if (r1.status !== 201) throw new Error('demande refusée ' + r1.status + ' ' + (await r1.text()));
  const r2 = await fetch(API + '/api/admin/requests/' + id, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-admin-pin': '2026' },
    body: JSON.stringify({ status: 'disponible' }),
  });
  if (!r2.ok) throw new Error('confirmation refusée ' + r2.status);
  await page.goto(base + '/commande?demande=' + id, opts);
  return id;
};
