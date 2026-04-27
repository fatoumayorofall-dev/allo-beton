/**
 * ALLO BÉTON — Zones de livraison
 *
 * Gère les zones géographiques avec tarification :
 *   - Frais de base (FCFA)
 *   - Frais par tonne transportée (béton, ciment, granulats)
 *   - Délai de livraison estimé (heures)
 *   - Régions / villes couvertes
 *
 * GET  /             → Liste publique (pour calculer le devis côté shop)
 * GET  /admin        → Liste complète admin (incl. zones désactivées)
 * POST /admin        → Créer
 * PUT  /admin/:id    → Modifier
 * DELETE /admin/:id  → Supprimer
 * POST /quote        → Calcul devis : { zone_id, weight_tons } → { total_fee, eta_hours }
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../../config/database');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { logAdmin } = require('../../services/adminAuditService');

let _ready = false;
async function ensureTable() {
  if (_ready) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ecom_shipping_zones (
      id              VARCHAR(36) PRIMARY KEY,
      name            VARCHAR(120) NOT NULL,
      regions         JSON DEFAULT NULL,
      base_fee        DECIMAL(12,2) NOT NULL DEFAULT 0,
      per_ton_fee     DECIMAL(12,2) NOT NULL DEFAULT 0,
      free_threshold  DECIMAL(12,2) DEFAULT NULL,
      eta_hours       INT NOT NULL DEFAULT 24,
      max_weight_tons DECIMAL(8,2) DEFAULT NULL,
      sort_order      INT NOT NULL DEFAULT 0,
      is_active       TINYINT(1) NOT NULL DEFAULT 1,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  /* Seed zones par défaut Sénégal */
  const [c] = await pool.query(`SELECT COUNT(*) AS n FROM ecom_shipping_zones`);
  if (c[0].n === 0) {
    const seed = [
      { name: 'Dakar centre',       regions: ['Plateau','Médina','Fann','Mermoz','Sacré-Cœur'], base_fee: 5000,  per_ton: 1500, eta: 4  },
      { name: 'Dakar banlieue',     regions: ['Pikine','Guédiawaye','Parcelles','Yeumbeul','Thiaroye'], base_fee: 10000, per_ton: 2000, eta: 8  },
      { name: 'Rufisque',           regions: ['Rufisque','Bargny','Diamniadio','Sébikotane'], base_fee: 15000, per_ton: 2500, eta: 12 },
      { name: 'Région Thiès',       regions: ['Thiès','Mbour','Tivaouane','Saly','Joal'], base_fee: 25000, per_ton: 3000, eta: 24 },
      { name: 'Autres régions',     regions: ['Saint-Louis','Kaolack','Ziguinchor','Tambacounda','Louga'], base_fee: 50000, per_ton: 5000, eta: 48 },
    ];
    let order = 0;
    for (const z of seed) {
      await pool.query(
        `INSERT INTO ecom_shipping_zones
          (id, name, regions, base_fee, per_ton_fee, eta_hours, sort_order, is_active)
         VALUES (?,?,?,?,?,?,?,1)`,
        [uuidv4(), z.name, JSON.stringify(z.regions), z.base_fee, z.per_ton, z.eta, order++]
      );
    }
  }
  _ready = true;
}

/* ─── PUBLIC : liste des zones actives ─── */
router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(
      `SELECT id, name, regions, base_fee, per_ton_fee, free_threshold, eta_hours, max_weight_tons
       FROM ecom_shipping_zones
       WHERE is_active = 1
       ORDER BY sort_order ASC, name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Erreur shipping-zones list:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/* ─── PUBLIC : calcul d'un devis ─── */
router.post('/quote', async (req, res) => {
  try {
    await ensureTable();
    const { zone_id, weight_tons = 0, order_amount = 0 } = req.body;
    if (!zone_id) {
      return res.status(400).json({ success: false, error: 'zone_id requis' });
    }
    const [zones] = await pool.query(
      `SELECT * FROM ecom_shipping_zones WHERE id = ? AND is_active = 1`,
      [zone_id]
    );
    if (zones.length === 0) {
      return res.status(404).json({ success: false, error: 'Zone introuvable ou inactive' });
    }
    const z = zones[0];
    const weight = Math.max(0, Number(weight_tons));

    if (z.max_weight_tons != null && weight > Number(z.max_weight_tons)) {
      return res.status(400).json({
        success: false,
        error: `Poids ${weight}t dépasse la capacité de cette zone (${z.max_weight_tons}t)`
      });
    }

    let total = Number(z.base_fee) + (weight * Number(z.per_ton_fee));
    let free = false;
    if (z.free_threshold != null && Number(order_amount) >= Number(z.free_threshold)) {
      total = 0;
      free = true;
    }

    res.json({
      success: true,
      data: {
        zone_id: z.id,
        zone_name: z.name,
        base_fee: Number(z.base_fee),
        per_ton_fee: Number(z.per_ton_fee),
        weight_tons: weight,
        total_fee: Math.round(total),
        eta_hours: z.eta_hours,
        free_shipping: free,
      }
    });
  } catch (e) {
    console.error('Erreur quote:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/* ─── ADMIN ─── */
router.use('/admin', authenticateToken, requireAdmin);

router.get('/admin', async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(
      `SELECT * FROM ecom_shipping_zones ORDER BY sort_order ASC, name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Erreur admin list zones:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.post('/admin', async (req, res) => {
  try {
    await ensureTable();
    const {
      name, regions, base_fee = 0, per_ton_fee = 0,
      free_threshold, eta_hours = 24, max_weight_tons,
      sort_order = 0, is_active = true,
    } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name requis' });

    const id = uuidv4();
    await pool.query(
      `INSERT INTO ecom_shipping_zones
        (id, name, regions, base_fee, per_ton_fee, free_threshold,
         eta_hours, max_weight_tons, sort_order, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        id, name,
        regions ? JSON.stringify(regions) : null,
        base_fee, per_ton_fee, free_threshold || null,
        eta_hours, max_weight_tons || null,
        sort_order, is_active ? 1 : 0
      ]
    );
    const [rows] = await pool.query(`SELECT * FROM ecom_shipping_zones WHERE id = ?`, [id]);
    logAdmin(req, 'create', 'shipping_zone', id, { name, base_fee, per_ton_fee });
    res.status(201).json({ success: true, data: rows[0] });
  } catch (e) {
    console.error('Erreur create zone:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.put('/admin/:id', async (req, res) => {
  try {
    const fields = ['name','regions','base_fee','per_ton_fee','free_threshold',
                    'eta_hours','max_weight_tons','sort_order','is_active'];
    const updates = [], params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === 'regions') {
          updates.push('regions = ?');
          params.push(req.body.regions ? JSON.stringify(req.body.regions) : null);
        } else if (f === 'is_active') {
          updates.push('is_active = ?');
          params.push(req.body.is_active ? 1 : 0);
        } else {
          updates.push(`${f} = ?`);
          params.push(req.body[f]);
        }
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ à modifier' });
    }
    params.push(req.params.id);
    await pool.query(
      `UPDATE ecom_shipping_zones SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    const [rows] = await pool.query(`SELECT * FROM ecom_shipping_zones WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Zone introuvable' });
    logAdmin(req, 'update', 'shipping_zone', req.params.id, { changes: Object.keys(req.body) });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error('Erreur update zone:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

router.delete('/admin/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM ecom_shipping_zones WHERE id = ?`, [req.params.id]);
    logAdmin(req, 'delete', 'shipping_zone', req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error('Erreur delete zone:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
