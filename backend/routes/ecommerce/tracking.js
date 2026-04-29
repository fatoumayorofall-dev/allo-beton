/**
 * ALLO BÉTON — TRACKING LIVRAISON (Yango-like)
 * - Page tracking publique par token (client)
 * - Heartbeat GPS du livreur
 * - Admin : CRUD drivers + assignation + changement de statut
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const pool = require('../../db');
const { authenticateCustomer } = require('../../middleware/ecommerceAuth');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// Service de notifications WhatsApp (best-effort)
let sendWhatsAppOTP = null;
try {
  ({ sendWhatsAppOTP } = require('../../services/smsService'));
} catch { /* optionnel */ }

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://allobeton.sn';

// Statuts qui font partie du flux de livraison (timeline)
const DELIVERY_TIMELINE = [
  'pending', 'confirmed', 'processing', 'ready_for_pickup',
  'in_transit', 'delivered',
];

// ════════════════════════════════════════════════════════════════════
// 1) PUBLIC — TRACKING PAR TOKEN
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/ecommerce/tracking/:token
 * Renvoie tout ce qu'il faut pour afficher la page de tracking client
 */
router.get('/tracking/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 16) {
      return res.status(400).json({ success: false, error: 'Token invalide' });
    }

    const [orders] = await pool.query(`
      SELECT o.id, o.order_number, o.status, o.total, o.subtotal, o.tax_amount, o.shipping_amount,
             o.shipping_first_name, o.shipping_last_name, o.shipping_address, o.shipping_city,
             o.shipping_phone, o.shipping_instructions,
             o.delivery_lat, o.delivery_lng,
             o.estimated_delivery_at, o.picked_up_at, o.delivered_at,
             o.created_at, o.driver_id,
             d.name AS driver_name, d.phone AS driver_phone, d.vehicle_type AS driver_vehicle_type,
             d.vehicle_plate AS driver_vehicle_plate, d.vehicle_label AS driver_vehicle_label,
             d.avatar_url AS driver_avatar, d.rating AS driver_rating,
             d.current_lat AS driver_lat, d.current_lng AS driver_lng,
             d.last_position_at AS driver_last_position_at
      FROM ecom_orders o
      LEFT JOIN ecom_drivers d ON d.id = o.driver_id
      WHERE o.tracking_token = ?
    `, [token]);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Commande introuvable' });
    }

    const o = orders[0];

    // Historique des statuts
    const [history] = await pool.query(
      `SELECT status, note, lat, lng, created_at
       FROM ecom_order_status_history
       WHERE order_id = ?
       ORDER BY created_at ASC`,
      [o.id]
    );

    // Items
    const [items] = await pool.query(
      `SELECT product_name, quantity, unit_price, total_price, image_url
       FROM ecom_order_items
       WHERE order_id = ?`,
      [o.id]
    );

    res.json({
      success: true,
      data: {
        order: {
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          total: parseFloat(o.total),
          subtotal: parseFloat(o.subtotal),
          tax_amount: parseFloat(o.tax_amount),
          shipping_amount: parseFloat(o.shipping_amount),
          shipping_first_name: o.shipping_first_name,
          shipping_last_name: o.shipping_last_name,
          shipping_address: o.shipping_address,
          shipping_city: o.shipping_city,
          shipping_phone: o.shipping_phone,
          shipping_instructions: o.shipping_instructions,
          delivery_lat: o.delivery_lat ? parseFloat(o.delivery_lat) : null,
          delivery_lng: o.delivery_lng ? parseFloat(o.delivery_lng) : null,
          estimated_delivery_at: o.estimated_delivery_at,
          picked_up_at: o.picked_up_at,
          delivered_at: o.delivered_at,
          created_at: o.created_at,
        },
        driver: o.driver_id ? {
          id: o.driver_id,
          name: o.driver_name,
          phone: o.driver_phone,
          vehicle_type: o.driver_vehicle_type,
          vehicle_plate: o.driver_vehicle_plate,
          vehicle_label: o.driver_vehicle_label,
          avatar_url: o.driver_avatar,
          rating: o.driver_rating ? parseFloat(o.driver_rating) : 5,
          current_lat: o.driver_lat ? parseFloat(o.driver_lat) : null,
          current_lng: o.driver_lng ? parseFloat(o.driver_lng) : null,
          last_position_at: o.driver_last_position_at,
        } : null,
        history,
        items,
        timeline: DELIVERY_TIMELINE,
      },
    });
  } catch (e) {
    console.error('❌ Tracking error:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ════════════════════════════════════════════════════════════════════
// 2) DRIVER — HEARTBEAT GPS (par tracking_token du livreur)
// ════════════════════════════════════════════════════════════════════

/**
 * GET /api/ecommerce/drivers/me/:driverToken
 * Le livreur récupère sa fiche + sa commande active
 */
router.get('/drivers/me/:driverToken', async (req, res) => {
  try {
    const { driverToken } = req.params;
    const [drivers] = await pool.query(
      'SELECT * FROM ecom_drivers WHERE tracking_token = ? AND is_active = 1',
      [driverToken]
    );
    if (drivers.length === 0) {
      return res.status(404).json({ success: false, error: 'Livreur introuvable' });
    }
    const driver = drivers[0];

    // Commande active assignée
    const [orders] = await pool.query(
      `SELECT id, order_number, status, total,
              shipping_first_name, shipping_last_name, shipping_address, shipping_city,
              shipping_phone, shipping_instructions,
              delivery_lat, delivery_lng, tracking_token
       FROM ecom_orders
       WHERE driver_id = ?
         AND status IN ('confirmed','processing','ready_for_pickup','in_transit')
       ORDER BY created_at ASC LIMIT 1`,
      [driver.id]
    );

    res.json({
      success: true,
      data: {
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          vehicle_type: driver.vehicle_type,
          vehicle_plate: driver.vehicle_plate,
          vehicle_label: driver.vehicle_label,
          rating: parseFloat(driver.rating),
          total_deliveries: driver.total_deliveries,
        },
        active_order: orders[0] || null,
      },
    });
  } catch (e) {
    console.error('❌ Driver me error:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/drivers/:driverToken/position
 * Heartbeat GPS du livreur (toutes les 15s typiquement)
 */
router.post('/drivers/:driverToken/position', async (req, res) => {
  try {
    const { driverToken } = req.params;
    const { lat, lng, heading, speed, accuracy, order_id } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ success: false, error: 'Coordonnées invalides' });
    }

    const [drivers] = await pool.query(
      'SELECT id FROM ecom_drivers WHERE tracking_token = ? AND is_active = 1',
      [driverToken]
    );
    if (drivers.length === 0) {
      return res.status(404).json({ success: false, error: 'Livreur introuvable' });
    }
    const driverId = drivers[0].id;

    // Mettre à jour la position courante
    await pool.query(
      'UPDATE ecom_drivers SET current_lat = ?, current_lng = ?, last_position_at = NOW() WHERE id = ?',
      [lat, lng, driverId]
    );

    // Historique (best-effort, peut rater si table absente)
    pool.query(
      `INSERT INTO ecom_driver_positions
        (driver_id, order_id, lat, lng, heading, speed, accuracy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [driverId, order_id || null, lat, lng, heading || null, speed || null, accuracy || null]
    ).catch(() => {});

    res.json({ success: true });
  } catch (e) {
    console.error('❌ Driver position error:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ════════════════════════════════════════════════════════════════════
// 3) ADMIN — DRIVERS CRUD
// ════════════════════════════════════════════════════════════════════

const adminGuard = [authenticateToken, requireRole(['admin'])];

/** GET /admin/drivers — liste */
router.get('/admin/drivers', adminGuard, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, phone, email, vehicle_type, vehicle_plate, vehicle_label,
              avatar_url, tracking_token, is_active, is_available, rating, total_deliveries,
              current_lat, current_lng, last_position_at, created_at
       FROM ecom_drivers ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('❌ Drivers list:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/** POST /admin/drivers — créer */
router.post('/admin/drivers', adminGuard, async (req, res) => {
  try {
    const {
      name, phone, email,
      vehicle_type = 'camion', vehicle_plate, vehicle_label, avatar_url,
    } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Nom et téléphone obligatoires' });
    }
    const id = uuidv4();
    const tokenStr = crypto.randomBytes(24).toString('hex');
    await pool.query(
      `INSERT INTO ecom_drivers
        (id, name, phone, email, vehicle_type, vehicle_plate, vehicle_label, avatar_url, tracking_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, phone, email || null, vehicle_type, vehicle_plate || null,
       vehicle_label || null, avatar_url || null, tokenStr]
    );
    res.json({
      success: true,
      data: { id, tracking_token: tokenStr, driver_url: `${FRONTEND_URL}/driver/${tokenStr}` }
    });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Téléphone déjà utilisé' });
    }
    console.error('❌ Driver create:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/** PUT /admin/drivers/:id — modifier */
router.put('/admin/drivers/:id', adminGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['name', 'phone', 'email', 'vehicle_type', 'vehicle_plate',
                    'vehicle_label', 'avatar_url', 'is_active', 'is_available'];
    const updates = [], values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour' });
    }
    values.push(id);
    await pool.query(`UPDATE ecom_drivers SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ Driver update:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/** DELETE /admin/drivers/:id — supprimer */
router.delete('/admin/drivers/:id', adminGuard, async (req, res) => {
  try {
    await pool.query('DELETE FROM ecom_drivers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ Driver delete:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ════════════════════════════════════════════════════════════════════
// 4) ADMIN — ASSIGNER UN LIVREUR + CHANGER LE STATUT (avec notif)
// ════════════════════════════════════════════════════════════════════

/** PUT /admin/orders/:orderId/assign — assigner un livreur */
router.put('/admin/orders/:orderId/assign', adminGuard, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driver_id, estimated_delivery_at } = req.body;

    const [drivers] = await pool.query('SELECT id, name FROM ecom_drivers WHERE id = ?', [driver_id]);
    if (drivers.length === 0) {
      return res.status(404).json({ success: false, error: 'Livreur introuvable' });
    }

    // Générer un token de tracking si absent
    const [orders] = await pool.query(
      'SELECT tracking_token, billing_phone, shipping_phone FROM ecom_orders WHERE id = ?',
      [orderId]
    );
    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Commande introuvable' });
    }
    let token = orders[0].tracking_token;
    if (!token) token = crypto.randomBytes(24).toString('hex');

    await pool.query(
      `UPDATE ecom_orders SET driver_id = ?, tracking_token = ?,
              estimated_delivery_at = ?, status = 'processing'
       WHERE id = ?`,
      [driver_id, token, estimated_delivery_at || null, orderId]
    );

    // Historique
    await pool.query(
      `INSERT INTO ecom_order_status_history (order_id, status, note, changed_by)
       VALUES (?, 'processing', ?, 'admin')`,
      [orderId, `Livreur assigné : ${drivers[0].name}`]
    );

    // Notification WhatsApp avec lien de tracking
    const phone = orders[0].shipping_phone || orders[0].billing_phone;
    if (phone && sendWhatsAppOTP) {
      const trackUrl = `${FRONTEND_URL}/track/${token}`;
      const msg = `🚚 Allo Béton : votre commande est en préparation !\n\nLivreur : ${drivers[0].name}\nSuivez en direct : ${trackUrl}`;
      // Réutilise sendWhatsAppOTP comme générique pour démo (best-effort)
      sendWhatsAppOTP(phone, msg).catch(() => {});
    }

    res.json({ success: true, data: { tracking_token: token, tracking_url: `${FRONTEND_URL}/track/${token}` } });
  } catch (e) {
    console.error('❌ Assign driver:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/** PUT /admin/orders/:orderId/tracking-status — changer le statut de tracking */
router.put('/admin/orders/:orderId/tracking-status', adminGuard, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;

    if (!DELIVERY_TIMELINE.includes(status) && !['cancelled', 'refunded', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Statut invalide' });
    }

    const updates = ['status = ?'];
    const values = [status];
    if (status === 'in_transit') { updates.push('picked_up_at = NOW()'); }
    if (status === 'delivered')  { updates.push('delivered_at = NOW()'); }
    if (status === 'cancelled')  { updates.push('cancelled_at = NOW()'); }
    values.push(orderId);

    await pool.query(`UPDATE ecom_orders SET ${updates.join(', ')} WHERE id = ?`, values);

    await pool.query(
      `INSERT INTO ecom_order_status_history (order_id, status, note, changed_by)
       VALUES (?, ?, ?, 'admin')`,
      [orderId, status, note || null]
    );

    // Notif client
    const [rows] = await pool.query(
      'SELECT tracking_token, shipping_phone, billing_phone, order_number FROM ecom_orders WHERE id = ?',
      [orderId]
    );
    if (rows.length && sendWhatsAppOTP) {
      const o = rows[0];
      const phone = o.shipping_phone || o.billing_phone;
      const labels = {
        confirmed: '✅ Commande confirmée',
        processing: '📦 En préparation',
        ready_for_pickup: '🟢 Prête à expédier',
        in_transit: '🚚 En route vers vous',
        delivered: '🎉 Livrée !',
        cancelled: '❌ Annulée',
      };
      if (phone && labels[status]) {
        const url = o.tracking_token ? `\n${FRONTEND_URL}/track/${o.tracking_token}` : '';
        sendWhatsAppOTP(phone, `${labels[status]} — Cmd ${o.order_number}${url}`).catch(() => {});
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('❌ Tracking status:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /admin/orders/:orderId/positions
 * Historique GPS d'une commande (replay)
 */
router.get('/admin/orders/:orderId/positions', adminGuard, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT lat, lng, heading, speed, accuracy, created_at
       FROM ecom_driver_positions WHERE order_id = ?
       ORDER BY created_at ASC LIMIT 1000`,
      [req.params.orderId]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
