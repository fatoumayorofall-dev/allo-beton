/**
 * ALLO BÉTON — Paramètres boutique
 * Stockage clé/valeur (JSON) dans ecom_settings.
 *
 * GET  /            → Tous les paramètres en bloc (objet aplati)
 * GET  /:key        → Une clé précise
 * PUT  /            → Mise à jour partielle (body = { key1: val, key2: val… })
 *
 * Lecture : auth admin requise (réservé au panneau de gestion)
 * Écriture : auth admin requise
 *
 * Côté boutique publique : un endpoint GET /public expose un sous-ensemble
 * (TVA, devise, frais de port…) sans authentification.
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { logAdmin } = require('../../services/adminAuditService');

let _ready = false;
async function ensureTable() {
  if (_ready) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecom_settings (
      \`key\`        VARCHAR(80) PRIMARY KEY,
      value          JSON DEFAULT NULL,
      is_public      TINYINT(1) NOT NULL DEFAULT 0,
      updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by     VARCHAR(150) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  /* Seed des valeurs par défaut (idempotent) */
  const defaults = [
    /* Société */
    ['company_name',        { value: 'Allô Béton SARL' },                    1],
    ['company_ninea',       { value: '' },                                   1],
    ['company_rccm',        { value: '' },                                   1],
    ['company_address',     { value: 'Dakar, Sénégal' },                     1],
    ['company_phone',       { value: '+221 33 000 00 00' },                  1],
    ['company_email',       { value: 'contact@allobeton.sn' },               1],
    /* Fiscalité */
    ['currency',            { value: 'XOF', symbol: 'FCFA' },                1],
    ['vat_rate',            { value: 18 },                                   1],
    ['vat_included',        { value: false },                                1],
    /* Livraison */
    ['free_shipping_threshold', { value: 500000 },                           1],
    ['delivery_zones',      { value: [
      { name: 'Dakar centre',  base_fee: 5000,  per_ton: 1500, eta_hours: 4 },
      { name: 'Dakar banlieue',base_fee: 10000, per_ton: 2000, eta_hours: 8 },
      { name: 'Région Thiès',  base_fee: 25000, per_ton: 3000, eta_hours: 24 },
      { name: 'Autres régions',base_fee: 50000, per_ton: 5000, eta_hours: 48 },
    ]}, 1],
    /* Paiement */
    ['payment_iban',        { value: '' },                                   0],
    ['payment_bank_name',   { value: '' },                                   1],
    ['payment_methods',     { value: ['wave','orange_money','free_money','card','cash'] }, 1],
    /* Mentions légales */
    ['terms_url',           { value: '/cgv' },                               1],
    ['privacy_url',         { value: '/confidentialite' },                   1],
    /* Boutique */
    ['shop_active',         { value: true },                                 1],
    ['maintenance_message', { value: '' },                                   1],
    ['min_order_amount',    { value: 0 },                                    1],
  ];
  for (const [key, val, isPublic] of defaults) {
    await pool.query(
      `INSERT INTO ecom_settings (\`key\`, value, is_public)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE \`key\` = \`key\``, // ne touche pas si existe
      [key, JSON.stringify(val), isPublic]
    );
  }
  _ready = true;
}

/* ─── ROUTE PUBLIQUE (exposée à la boutique) ─── */
router.get('/public', async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(
      `SELECT \`key\`, value FROM ecom_settings WHERE is_public = 1`
    );
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    res.json({ success: true, data: out });
  } catch (e) {
    console.error('Erreur settings public:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/* ─── ROUTES ADMIN ─── */
router.use(authenticateToken, requireAdmin);

router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(`SELECT \`key\`, value, is_public, updated_at, updated_by FROM ecom_settings`);
    const out = {};
    for (const r of rows) out[r.key] = { value: r.value, is_public: !!r.is_public, updated_at: r.updated_at, updated_by: r.updated_by };
    res.json({ success: true, data: out });
  } catch (e) {
    console.error('Erreur settings list:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.get('/:key', async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(`SELECT * FROM ecom_settings WHERE \`key\` = ?`, [req.params.key]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Clé inconnue' });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.put('/', async (req, res) => {
  try {
    await ensureTable();
    const updates = req.body || {};
    if (typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'Body doit être un objet { key: value }' });
    }
    const adminEmail = req.user?.email || null;
    const keys = Object.keys(updates);
    for (const key of keys) {
      const val = updates[key];
      await pool.query(
        `INSERT INTO ecom_settings (\`key\`, value, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)`,
        [key, JSON.stringify(val), adminEmail]
      );
    }
    logAdmin(req, 'update', 'settings', null, { keys });
    res.json({ success: true, updated: keys.length });
  } catch (e) {
    console.error('Erreur PUT settings:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
