/**
 * ALLO BÉTON - API PANIER E-COMMERCE
 * Gestion du panier client
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../../db');

// Middleware
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { authenticateCustomer } = require('../../middleware/ecommerceAuth');
const optionalAuth = require('../../middleware/optionalAuth');

// ============================================================
// HELPERS
// ============================================================

/**
 * Récupérer ou créer un panier
 */
const getOrCreateCart = async (customerId, sessionId) => {
  let cart = null;

  // Chercher panier existant
  if (customerId) {
    const [carts] = await pool.query(
      'SELECT * FROM ecom_carts WHERE customer_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1',
      [customerId]
    );
    if (carts.length > 0) cart = carts[0];
  } else if (sessionId) {
    const [carts] = await pool.query(
      'SELECT * FROM ecom_carts WHERE session_id = ? AND status = "active" AND customer_id IS NULL ORDER BY created_at DESC LIMIT 1',
      [sessionId]
    );
    if (carts.length > 0) cart = carts[0];
  }

  // Créer si inexistant
  if (!cart) {
    const id = uuidv4();

    await pool.query(`
      INSERT INTO ecom_carts (id, customer_id, session_id)
      VALUES (?, ?, ?)
    `, [id, customerId || null, sessionId || null]);

    const [newCart] = await pool.query('SELECT * FROM ecom_carts WHERE id = ?', [id]);
    cart = newCart[0];
  }

  return cart;
};

/**
 * Recalculer les totaux du panier
 */
const recalculateCart = async (cartId) => {
  // Récupérer les items
  const [items] = await pool.query(`
    SELECT ci.*, p.price as current_price, p.name, p.stock_quantity, p.stock_status
    FROM ecom_cart_items ci
    JOIN ecom_products p ON ci.product_id = p.id
    WHERE ci.cart_id = ?
  `, [cartId]);

  let subtotal = 0;
  let taxAmount = 0;

  // Taux TVA par défaut (18%)
  const taxRate = 18;

  for (const item of items) {
    const itemTotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
    const itemTax = itemTotal * (taxRate / 100);

    // Mettre à jour l'item
    await pool.query(`
      UPDATE ecom_cart_items
      SET total_price = ?, tax_rate = ?, tax_amount = ?
      WHERE id = ?
    `, [itemTotal, taxRate, itemTax, item.id]);

    subtotal += itemTotal;
    taxAmount += itemTax;
  }

  const total = subtotal + taxAmount;

  // Mettre à jour le panier
  await pool.query(`
    UPDATE ecom_carts
    SET subtotal = ?, tax_amount = ?, total = ?, updated_at = NOW()
    WHERE id = ?
  `, [subtotal, taxAmount, total, cartId]);

  return { subtotal, taxAmount, total, taxRate };
};

/**
 * Récupérer le panier complet avec items
 */
const getCartWithItems = async (cartId) => {
  const [carts] = await pool.query('SELECT * FROM ecom_carts WHERE id = ?', [cartId]);
  if (carts.length === 0) return null;

  const cart = carts[0];

  const [items] = await pool.query(`
    SELECT
      ci.*,
      p.name, p.slug, p.sku, p.image_url, p.unit,
      p.stock_quantity, p.stock_status, p.min_order_quantity as min_quantity,
      p.price as current_price
    FROM ecom_cart_items ci
    JOIN ecom_products p ON ci.product_id = p.id
    WHERE ci.cart_id = ?
    ORDER BY ci.created_at ASC
  `, [cartId]);

  // Seuils livraison (valeurs par défaut)
  const freeShippingThreshold = 500000;
  const defaultShippingCost = 15000;
  const shippingCost = parseFloat(cart.subtotal) >= freeShippingThreshold ? 0 : defaultShippingCost;

  return {
    id: cart.id,
    customer_id: cart.customer_id,
    status: cart.status,
    subtotal: parseFloat(cart.subtotal),
    tax_amount: parseFloat(cart.tax_amount),
    discount_amount: parseFloat(cart.discount_amount || 0),
    shipping_cost: shippingCost,
    total: parseFloat(cart.total) + shippingCost,
    coupon_code: cart.coupon_code,
    item_count: items.length,
    quantity_total: items.reduce((sum, i) => sum + parseFloat(i.quantity), 0),
    free_shipping_threshold: freeShippingThreshold,
    free_shipping_remaining: Math.max(0, freeShippingThreshold - parseFloat(cart.subtotal)),
    items: items.map(item => ({
      id: item.id,
      product_id: item.product_id,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      image_url: item.image_url,
      unit: item.unit,
      quantity: parseFloat(item.quantity),
      min_quantity: parseFloat(item.min_quantity) || 1,
      step_quantity: 1,
      unit_price: parseFloat(item.unit_price),
      current_price: parseFloat(item.current_price),
      price_changed: parseFloat(item.unit_price) !== parseFloat(item.current_price),
      discount_amount: parseFloat(item.discount_amount),
      tax_rate: parseFloat(item.tax_rate),
      tax_amount: parseFloat(item.tax_amount),
      total_price: parseFloat(item.total_price),
      stock_quantity: parseFloat(item.stock_quantity),
      stock_status: item.stock_status,
      in_stock: item.stock_status === 'in_stock' && parseFloat(item.stock_quantity) >= parseFloat(item.quantity)
    })),
    created_at: cart.created_at,
    updated_at: cart.updated_at
  };
};

// ============================================================
// ROUTES
// ============================================================

/**
 * GET /api/ecommerce/cart
 * Récupérer le panier actuel
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const customerId = req.user?.customer_id || null;
    const sessionId = req.headers['x-session-id'] || req.query.session_id;

    if (!customerId && !sessionId) {
      return res.json({
        success: true,
        data: {
          id: null,
          items: [],
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          item_count: 0
        }
      });
    }

    const cart = await getOrCreateCart(customerId, sessionId);
    const cartData = await getCartWithItems(cart.id);

    res.json({ success: true, data: cartData });

  } catch (error) {
    console.error('Erreur récupération panier:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/cart/items
 * Ajouter un produit au panier
 */
router.post('/items', optionalAuth, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const customerId = req.user?.customer_id || null;
    const sessionId = req.headers['x-session-id'] || req.body.session_id;

    if (!product_id) {
      return res.status(400).json({ success: false, error: 'Produit requis' });
    }

    // Vérifier le produit
    const [products] = await pool.query(
      'SELECT * FROM ecom_products WHERE id = ? AND is_active = 1',
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ success: false, error: 'Produit non trouvé' });
    }

    const product = products[0];

    // Vérifier stock
    if (product.manage_stock && product.stock_status === 'out_of_stock') {
      return res.status(400).json({ success: false, error: 'Produit en rupture de stock' });
    }

    // Vérifier quantité minimum
    const qty = parseFloat(quantity);
    const minQty = parseFloat(product.min_order_quantity) || 1;
    if (qty < minQty) {
      return res.status(400).json({
        success: false,
        error: `Quantité minimum: ${minQty} ${product.unit}`
      });
    }

    // Récupérer ou créer panier
    const cart = await getOrCreateCart(customerId, sessionId);

    // Vérifier si produit déjà dans le panier
    const [existingItems] = await pool.query(
      'SELECT * FROM ecom_cart_items WHERE cart_id = ? AND product_id = ?',
      [cart.id, product_id]
    );

    if (existingItems.length > 0) {
      // Mettre à jour quantité
      const newQty = parseFloat(existingItems[0].quantity) + qty;

      // Vérifier stock
      if (product.manage_stock && newQty > parseFloat(product.stock_quantity)) {
        return res.status(400).json({
          success: false,
          error: `Stock insuffisant. Disponible: ${product.stock_quantity} ${product.unit}`
        });
      }

      await pool.query(
        'UPDATE ecom_cart_items SET quantity = ?, total_price = ? WHERE id = ?',
        [newQty, newQty * parseFloat(product.price), existingItems[0].id]
      );
    } else {
      // Ajouter nouveau
      if (product.manage_stock && qty > parseFloat(product.stock_quantity)) {
        return res.status(400).json({
          success: false,
          error: `Stock insuffisant. Disponible: ${product.stock_quantity} ${product.unit}`
        });
      }

      const itemId = uuidv4();
      await pool.query(`
        INSERT INTO ecom_cart_items (id, cart_id, product_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [itemId, cart.id, product_id, qty, product.price, qty * parseFloat(product.price)]);
    }

    // Recalculer totaux
    await recalculateCart(cart.id);

    // Retourner panier mis à jour
    const cartData = await getCartWithItems(cart.id);

    res.json({
      success: true,
      message: 'Produit ajouté au panier',
      data: cartData
    });

  } catch (error) {
    console.error('Erreur ajout panier:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/ecommerce/cart/items/:itemId
 * Modifier la quantité d'un item
 */
router.put('/items/:itemId', optionalAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ success: false, error: 'Quantité requise' });
    }

    const qty = parseFloat(quantity);

    // Récupérer l'item
    const [items] = await pool.query(`
      SELECT ci.*, p.stock_quantity, p.stock_status, p.min_order_quantity as min_quantity, p.price, p.unit
      FROM ecom_cart_items ci
      JOIN ecom_products p ON ci.product_id = p.id
      WHERE ci.id = ?
    `, [itemId]);

    if (items.length === 0) {
      return res.status(404).json({ success: false, error: 'Item non trouvé' });
    }

    const item = items[0];

    // Supprimer si quantité <= 0
    if (qty <= 0) {
      await pool.query('DELETE FROM ecom_cart_items WHERE id = ?', [itemId]);
      await recalculateCart(item.cart_id);
      const cartData = await getCartWithItems(item.cart_id);
      return res.json({ success: true, message: 'Item supprimé', data: cartData });
    }

    // Vérifier quantité minimum
    if (qty < parseFloat(item.min_quantity)) {
      return res.status(400).json({
        success: false,
        error: `Quantité minimum: ${item.min_quantity} ${item.unit}`
      });
    }

    // Vérifier stock
    if (item.manage_stock && qty > parseFloat(item.stock_quantity)) {
      return res.status(400).json({
        success: false,
        error: `Stock insuffisant. Disponible: ${item.stock_quantity} ${item.unit}`
      });
    }

    // Mettre à jour
    await pool.query(
      'UPDATE ecom_cart_items SET quantity = ?, total_price = ? WHERE id = ?',
      [qty, qty * parseFloat(item.price), itemId]
    );

    await recalculateCart(item.cart_id);
    const cartData = await getCartWithItems(item.cart_id);

    res.json({
      success: true,
      message: 'Quantité mise à jour',
      data: cartData
    });

  } catch (error) {
    console.error('Erreur modification item:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/ecommerce/cart/items/:itemId
 * Supprimer un item du panier
 */
router.delete('/items/:itemId', optionalAuth, async (req, res) => {
  try {
    const { itemId } = req.params;

    const [items] = await pool.query('SELECT cart_id FROM ecom_cart_items WHERE id = ?', [itemId]);

    if (items.length === 0) {
      return res.status(404).json({ success: false, error: 'Item non trouvé' });
    }

    const cartId = items[0].cart_id;

    await pool.query('DELETE FROM ecom_cart_items WHERE id = ?', [itemId]);
    await recalculateCart(cartId);

    const cartData = await getCartWithItems(cartId);

    res.json({
      success: true,
      message: 'Item supprimé',
      data: cartData
    });

  } catch (error) {
    console.error('Erreur suppression item:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/ecommerce/cart
 * Vider le panier
 */
router.delete('/', optionalAuth, async (req, res) => {
  try {
    const customerId = req.user?.customer_id || null;
    const sessionId = req.headers['x-session-id'] || req.query.session_id;

    let cartQuery = '';
    let params = [];

    if (customerId) {
      cartQuery = 'SELECT id FROM ecom_carts WHERE customer_id = ? AND status = "active"';
      params = [customerId];
    } else if (sessionId) {
      cartQuery = 'SELECT id FROM ecom_carts WHERE session_id = ? AND status = "active" AND customer_id IS NULL';
      params = [sessionId];
    } else {
      return res.status(400).json({ success: false, error: 'Session requise' });
    }

    const [carts] = await pool.query(cartQuery, params);

    if (carts.length > 0) {
      await pool.query('DELETE FROM ecom_cart_items WHERE cart_id = ?', [carts[0].id]);
      await pool.query('UPDATE ecom_carts SET subtotal = 0, tax_amount = 0, total = 0 WHERE id = ?', [carts[0].id]);
    }

    res.json({ success: true, message: 'Panier vidé' });

  } catch (error) {
    console.error('Erreur vidage panier:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/cart/coupon
 * Appliquer un code promo
 */
router.post('/coupon', optionalAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const customerId = req.user?.customer_id || null;
    const sessionId = req.headers['x-session-id'] || req.body.session_id;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Code requis' });
    }
    const codeUpper = String(code).trim().toUpperCase();

    // Récupérer le panier d'abord
    const cart = await getOrCreateCart(customerId, sessionId);
    const cartData = await getCartWithItems(cart.id);

    /* ─── 1. Tenter d'abord la nouvelle table ecom_promotions ─── */
    let discount = 0;
    let matched = false;
    let matchedSource = null; // 'promotion' | 'coupon'

    try {
      const [promos] = await pool.query(
        `SELECT * FROM ecom_promotions WHERE code = ? LIMIT 1`,
        [codeUpper]
      );
      if (promos.length > 0) {
        const p = promos[0];
        const now = new Date();

        if (!p.is_active) {
          return res.status(400).json({ success: false, error: 'Code désactivé' });
        }
        if (p.starts_at && new Date(p.starts_at) > now) {
          return res.status(400).json({ success: false, error: 'Code pas encore valable' });
        }
        if (p.ends_at && new Date(p.ends_at) < now) {
          return res.status(400).json({ success: false, error: 'Code expiré' });
        }
        if (p.max_uses != null && p.uses_count >= p.max_uses) {
          return res.status(400).json({ success: false, error: 'Code épuisé' });
        }
        if (Number(p.min_amount) > Number(cartData.subtotal)) {
          return res.status(400).json({
            success: false,
            error: `Montant minimum requis : ${Number(p.min_amount).toLocaleString('fr-FR')} FCFA`
          });
        }
        if (p.max_uses_per_customer != null && customerId) {
          const [u] = await pool.query(
            `SELECT COUNT(*) AS n FROM ecom_promotion_uses WHERE promotion_id = ? AND customer_id = ?`,
            [p.id, customerId]
          );
          if (u[0].n >= p.max_uses_per_customer) {
            return res.status(400).json({ success: false, error: 'Limite d\'utilisation par client atteinte' });
          }
        }

        if (p.discount_type === 'percent') {
          discount = Math.round(Number(cartData.subtotal) * (Number(p.discount_value) / 100));
        } else if (p.discount_type === 'fixed') {
          discount = Math.min(Number(p.discount_value), Number(cartData.subtotal));
        } else if (p.discount_type === 'free_shipping') {
          // Marquer pour livraison gratuite — discount=0 mais shipping mis à 0 ailleurs
          discount = 0;
        }
        matched = true;
        matchedSource = 'promotion';
      }
    } catch (e) {
      // Table absente : on ignore et on tombe dans le fallback
      if (e.code !== 'ER_NO_SUCH_TABLE') console.error('Erreur lookup ecom_promotions:', e.message);
    }

    /* ─── 2. Fallback : ancienne table ecom_coupons ─── */
    if (!matched) {
      try {
        const [coupons] = await pool.query(`
          SELECT * FROM ecom_coupons
          WHERE code = ? AND is_active = 1
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (expires_at IS NULL OR expires_at >= NOW())
          AND (usage_limit IS NULL OR usage_count < usage_limit)
        `, [codeUpper]);

        if (coupons.length === 0) {
          return res.status(400).json({ success: false, error: 'Code promo invalide ou expiré' });
        }
        const coupon = coupons[0];
        if (coupon.min_order_amount && cartData.subtotal < parseFloat(coupon.min_order_amount)) {
          return res.status(400).json({
            success: false,
            error: `Montant minimum requis: ${coupon.min_order_amount} FCFA`
          });
        }
        if (coupon.type === 'percentage') {
          discount = cartData.subtotal * (parseFloat(coupon.value) / 100);
          if (coupon.max_discount_amount) {
            discount = Math.min(discount, parseFloat(coupon.max_discount_amount));
          }
        } else if (coupon.type === 'fixed') {
          discount = parseFloat(coupon.value);
        }
        matched = true;
        matchedSource = 'coupon';
      } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') {
          return res.status(400).json({ success: false, error: 'Code promo invalide' });
        }
        throw e;
      }
    }

    if (!matched) {
      return res.status(400).json({ success: false, error: 'Code promo invalide ou expiré' });
    }

    // Appliquer au panier
    await pool.query(
      'UPDATE ecom_carts SET coupon_code = ?, discount_amount = ? WHERE id = ?',
      [codeUpper, discount, cart.id]
    );

    await recalculateCart(cart.id);
    const updatedCart = await getCartWithItems(cart.id);

    res.json({
      success: true,
      message: discount > 0
        ? `Code promo appliqué : -${discount.toLocaleString('fr-FR')} FCFA`
        : 'Code promo appliqué',
      source: matchedSource,
      data: updatedCart
    });

  } catch (error) {
    console.error('Erreur coupon:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/ecommerce/cart/coupon
 * Retirer le code promo
 */
router.delete('/coupon', optionalAuth, async (req, res) => {
  try {
    const customerId = req.user?.customer_id || null;
    const sessionId = req.headers['x-session-id'] || req.query.session_id;

    const cart = await getOrCreateCart(customerId, sessionId);

    await pool.query(
      'UPDATE ecom_carts SET coupon_code = NULL, discount_amount = 0 WHERE id = ?',
      [cart.id]
    );

    await recalculateCart(cart.id);
    const cartData = await getCartWithItems(cart.id);

    res.json({
      success: true,
      message: 'Code promo retiré',
      data: cartData
    });

  } catch (error) {
    console.error('Erreur retrait coupon:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * POST /api/ecommerce/cart/merge
 * Fusionner un panier anonyme avec un panier client
 */
router.post('/merge', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const { session_id } = req.body;

    if (!customerId || !session_id) {
      return res.status(400).json({ success: false, error: 'Paramètres manquants' });
    }

    // Récupérer panier anonyme
    const [anonCarts] = await pool.query(
      'SELECT * FROM ecom_carts WHERE session_id = ? AND status = "active" AND customer_id IS NULL',
      [session_id]
    );

    if (anonCarts.length === 0) {
      const cart = await getOrCreateCart(customerId, null);
      const cartData = await getCartWithItems(cart.id);
      return res.json({ success: true, data: cartData });
    }

    const anonCart = anonCarts[0];

    // Récupérer ou créer panier client
    const customerCart = await getOrCreateCart(customerId, null);

    // Récupérer items du panier anonyme
    const [anonItems] = await pool.query(
      'SELECT * FROM ecom_cart_items WHERE cart_id = ?',
      [anonCart.id]
    );

    // Fusionner les items
    for (const item of anonItems) {
      const [existingItems] = await pool.query(
        'SELECT * FROM ecom_cart_items WHERE cart_id = ? AND product_id = ?',
        [customerCart.id, item.product_id]
      );

      if (existingItems.length > 0) {
        // Ajouter la quantité
        await pool.query(
          'UPDATE ecom_cart_items SET quantity = quantity + ? WHERE id = ?',
          [item.quantity, existingItems[0].id]
        );
      } else {
        // Déplacer l'item
        await pool.query(
          'UPDATE ecom_cart_items SET cart_id = ? WHERE id = ?',
          [customerCart.id, item.id]
        );
      }
    }

    // Supprimer le panier anonyme
    await pool.query('DELETE FROM ecom_carts WHERE id = ?', [anonCart.id]);

    // Recalculer
    await recalculateCart(customerCart.id);
    const cartData = await getCartWithItems(customerCart.id);

    res.json({
      success: true,
      message: 'Paniers fusionnés',
      data: cartData
    });

  } catch (error) {
    console.error('Erreur fusion panier:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ============================================================
// NETTOYAGE PANIERS ABANDONNÉS (ADMIN)
// ============================================================

/**
 * POST /api/ecommerce/cart/cleanup
 * Nettoyer les paniers abandonnés (inactifs depuis plus de 48h)
 * - Marque les paniers comme 'abandoned'
 * - Supprime les items associés
 */
router.post('/cleanup', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { hours = 48 } = req.body;
    const threshold = Math.max(1, Math.min(720, parseInt(hours))); // entre 1h et 30 jours

    // Trouver les paniers actifs non mis à jour depuis le seuil
    const [abandonedCarts] = await pool.query(`
      SELECT id FROM ecom_carts
      WHERE status = 'active'
      AND updated_at < NOW() - INTERVAL ? HOUR
    `, [threshold]);

    if (abandonedCarts.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun panier abandonné trouvé',
        data: { cleaned: 0 }
      });
    }

    const cartIds = abandonedCarts.map(c => c.id);

    // Supprimer les items des paniers abandonnés
    await pool.query(
      `DELETE FROM ecom_cart_items WHERE cart_id IN (${cartIds.map(() => '?').join(',')})`,
      cartIds
    );

    // Marquer les paniers comme abandonnés
    await pool.query(
      `UPDATE ecom_carts SET status = 'abandoned' WHERE id IN (${cartIds.map(() => '?').join(',')})`,
      cartIds
    );

    console.log(`[CART CLEANUP] ${cartIds.length} paniers abandonnés nettoyés (seuil: ${threshold}h)`);

    res.json({
      success: true,
      message: `${cartIds.length} panier(s) abandonné(s) nettoyé(s)`,
      data: { cleaned: cartIds.length, threshold_hours: threshold }
    });

  } catch (error) {
    console.error('Erreur nettoyage paniers:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/cart/stats
 * Statistiques des paniers (admin)
 */
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total_carts,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_carts,
        SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned_carts,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_carts,
        SUM(CASE WHEN status = 'active' AND updated_at < NOW() - INTERVAL 48 HOUR THEN 1 ELSE 0 END) as stale_carts
      FROM ecom_carts
    `);

    res.json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Erreur stats paniers:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
