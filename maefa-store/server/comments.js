// ============================================================
//  AVIS ET QUESTIONS SUR LES PIÈCES
//  - toute visiteuse peut écrire (prénom + message, note facultative) : publié tout de suite,
//    visible par toutes ;
//  - « Cliente vérifiée » quand la personne connectée a reçu cette pièce (commande livrée) ;
//  - pas de liens ni de numéros de téléphone (évite le spam et le démarchage des clientes) ;
//  - la gérante peut répondre, masquer ou supprimer un message.
// ============================================================
import crypto from 'node:crypto';

const clip = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');
const PRODUCT_ID = /^[A-Z]{2,4}-[\w-]{1,30}$/;
const LINK = /(https?:\/\/|www\.|\.(com|sn|net|org|fr)\b)/i;
const PHONE = /(\+?\d[\s.-]?){8,}/;
const STATUSES = new Set(['publie', 'masque']);

/** Vue publique : jamais le téléphone ni l'identifiant de compte. */
const publicComment = c => ({
  id: c.id,
  author: c.author,
  text: c.text,
  rating: c.rating ?? null,
  verified: !!c.verified,
  createdAt: c.createdAt,
  reply: c.reply ?? null,
});

export function summarize(list) {
  const rated = list.filter(c => c.rating);
  return {
    count: list.length,
    rated: rated.length,
    average: rated.length ? Math.round((rated.reduce((s, c) => s + c.rating, 0) / rated.length) * 10) / 10 : null,
  };
}

export function registerCommentRoutes(app, { limit, isAdmin, store, currentUser, toE164 }) {
  const productExists = id => {
    const catalog = store.getCatalog();
    return catalog ? catalog.some(p => p.id === id) : PRODUCT_ID.test(id);
  };
  const published = productId => store.listComments().filter(c => c.productId === productId && c.status === 'publie');

  app.get('/api/products/:id/comments', (req, res) => {
    const id = clip(req.params.id, 40);
    const list = published(id);
    res.set('Cache-Control', 'no-store');
    res.json({ comments: list.slice(0, 100).map(publicComment), summary: summarize(list) });
  });

  app.post('/api/products/:id/comments', (req, res) => {
    const productId = clip(req.params.id, 40);
    if (!productExists(productId)) return res.status(404).json({ error: 'Pièce introuvable' });
    if (!limit(`comment:${req.ip}`, 6, 3600e3))
      return res.status(429).json({ error: 'Trop de messages, réessayez plus tard' });
    const author = clip(req.body?.author, 40);
    const text = clip(req.body?.text, 600);
    const r = Number(req.body?.rating);
    const rating = Number.isInteger(r) && r >= 1 && r <= 5 ? r : null;
    if (author.length < 2) return res.status(400).json({ error: 'Indiquez votre prénom' });
    if (text.length < 3) return res.status(400).json({ error: 'Écrivez votre message' });
    if (LINK.test(text) || LINK.test(author) || PHONE.test(text))
      return res.status(400).json({ error: 'Les liens et les numéros de téléphone ne sont pas autorisés' });
    // Cliente connectée qui a reçu cette pièce : « Cliente vérifiée »
    const user = currentUser(req);
    const verified =
      !!user &&
      store
        .listShopOrders()
        .some(
          o =>
            o.status === 'livree' &&
            toE164(o.customer?.phone) === user.phone &&
            (o.items ?? []).some(i => i.productId === productId),
        );
    const comment = store.saveComment({
      id: crypto.randomBytes(6).toString('hex'),
      productId,
      author,
      text,
      rating,
      verified,
      customerPhone: user?.phone ?? null,
      status: 'publie',
      createdAt: new Date().toISOString(),
      reply: null,
    });
    res.status(201).json({ comment: publicComment(comment), summary: summarize(published(productId)) });
  });

  /* Gérante : tous les messages, réponse, masquer / republier, supprimer */
  app.get('/api/admin/comments', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    res.json({ comments: store.listComments().slice(0, 500) });
  });

  app.patch('/api/admin/comments/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    const c = store.getComment(clip(req.params.id, 20));
    if (!c) return res.status(404).json({ error: 'Message introuvable' });
    const { status, reply } = req.body || {};
    if (status !== undefined) {
      if (!STATUSES.has(status)) return res.status(400).json({ error: 'Statut invalide' });
      c.status = status;
    }
    if (reply !== undefined) {
      const t = clip(reply, 600);
      c.reply = t ? { text: t, at: new Date().toISOString() } : null;
    }
    res.json({ comment: store.saveComment(c) });
  });

  app.delete('/api/admin/comments/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    store.deleteComment(clip(req.params.id, 20));
    res.json({ ok: true });
  });
}
