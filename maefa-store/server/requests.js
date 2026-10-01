// ============================================================
//  DEMANDES WHATSAPP
//  La boutique est revendeuse : quand une cliente touche « Acheter », WhatsApp s'ouvre
//  avec le détail de ses articles et une référence (DEM-XXXX). La gérante vérifie chez son
//  fournisseur à Dakar, puis confirme « disponible » (la cliente reçoit un lien pour finaliser :
//  nom, point sur la carte, paiement) ou « pas disponible ».
// ============================================================
const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
export const REQUEST_ID = /^DEM-[A-HJ-NP-Z2-9]{5}$/;
const STATUSES = new Set(['nouvelle', 'disponible', 'indisponible', 'commandee']);

/** Articles demandés : prix et nom repris du catalogue publié (jamais ceux envoyés par le navigateur). */
function cleanItems(items, catalog) {
  if (!Array.isArray(items) || !items.length || items.length > 20) return null;
  const out = [];
  for (const it of items) {
    const p = catalog?.find(x => x.id === it?.productId);
    if (catalog && !p) return null;
    const quantity = Math.round(Number(it.quantity));
    if (!(quantity >= 1 && quantity <= 20)) return null;
    out.push({
      productId: clip(it.productId, 40), name: p?.name ?? clip(it.name, 120), price: p?.price ?? Math.max(0, Math.round(Number(it.price) || 0)),
      image: p?.images?.[0] ?? clip(it.image, 300), size: clip(it.size, 10) || undefined, color: clip(it.color, 40) || undefined, quantity,
    });
  }
  return out;
}

export function registerRequestRoutes(app, { limit, isAdmin, store }) {
  /** La cliente touche « Acheter » : la demande est notée (le navigateur ouvre WhatsApp en même temps). */
  app.post('/api/requests', (req, res) => {
    if (!limit(`req-ip:${req.ip}`, 40, 3600e3)) return res.status(429).json({ error: 'Trop de demandes' });
    const id = clip(req.body?.id, 12).toUpperCase();
    if (!REQUEST_ID.test(id)) return res.status(400).json({ error: 'Référence invalide' });
    if (store.getRequest(id)) return res.status(409).json({ error: 'Référence déjà utilisée' });
    const items = cleanItems(req.body?.items, store.getCatalog());
    if (!items) return res.status(400).json({ error: 'Articles invalides' });
    const c = req.body?.customer ?? {};
    const r = {
      id, status: 'nouvelle', createdAt: new Date().toISOString(), items,
      total: items.reduce((s, i) => s + i.price * i.quantity, 0),
      customer: { firstName: clip(c.firstName, 40) || undefined, phone: clip(c.phone, 20) || undefined, zone: clip(c.zone, 60) || undefined },
      history: [{ status: 'nouvelle', date: new Date().toISOString() }],
    };
    store.saveRequest(r);
    res.status(201).json({ id });
  });

  /** Lien de finalisation : la cliente ne voit que ses articles et l'état de la demande. */
  app.get('/api/requests/:id', (req, res) => {
    if (!limit(`req-get:${req.ip}`, 120, 600e3)) return res.status(429).json({ error: 'Trop de demandes' });
    const r = store.getRequest(clip(req.params.id, 12).toUpperCase());
    if (!r) return res.status(404).json({ error: 'Demande introuvable' });
    res.json({ id: r.id, status: r.status, items: r.items, total: r.total, note: r.note ?? '', orderId: r.orderId ?? null });
  });

  app.get('/api/admin/requests', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    res.json({ requests: store.listRequests().slice(0, 300) });
  });

  /** Gérante : « disponible » / « pas disponible », avec un petit mot et, si besoin, les articles ajustés. */
  app.patch('/api/admin/requests/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const r = store.getRequest(clip(req.params.id, 12).toUpperCase());
    if (!r) return res.status(404).json({ error: 'Demande introuvable' });
    const { status, note } = req.body || {};
    if (status !== undefined) {
      if (!STATUSES.has(status) || status === 'commandee') return res.status(400).json({ error: 'Statut invalide' });
      if (r.status === 'commandee') return res.status(409).json({ error: 'Déjà commandée' });
      if (r.status !== status) { r.status = status; r.history.push({ status, date: new Date().toISOString() }); }
    }
    if (note !== undefined) r.note = clip(note, 300);
    store.saveRequest(r);
    res.json({ request: r });
  });
}

/** Une commande passée avec la référence : la demande devient « commandée ». */
export function linkRequestToOrder(store, requestId, orderId) {
  const id = clip(requestId, 12).toUpperCase();
  const r = REQUEST_ID.test(id) && store.getRequest(id);
  if (!r || r.status === 'commandee') return;
  r.status = 'commandee';
  r.orderId = orderId;
  r.history.push({ status: 'commandee', date: new Date().toISOString() });
  store.saveRequest(r);
}
