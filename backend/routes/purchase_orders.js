const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Auto-migration: ajouter colonnes received_quantity et product_id à purchase_order_items
(async () => {
  try {
    const [cols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items'"
    );
    const names = cols.map(c => c.COLUMN_NAME);
    if (!names.includes('received_quantity')) {
      await pool.execute("ALTER TABLE purchase_order_items ADD COLUMN received_quantity DECIMAL(10,2) DEFAULT 0");
      console.log('✅ Colonne received_quantity ajoutée à purchase_order_items');
    }
    if (!names.includes('product_id')) {
      await pool.execute("ALTER TABLE purchase_order_items ADD COLUMN product_id VARCHAR(36) NULL");
      console.log('✅ Colonne product_id ajoutée à purchase_order_items');
    }
  } catch (e) {
    console.error('Migration purchase_order_items:', e.message);
  }
})();

// Créer une commande fournisseur
router.post('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    console.log('📦 Requête POST /purchase-orders reçue');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const {
      supplier_id,
      order_number,
      expectedDeliveryDate = null,
      notes = '',
      items = [],
      total_amount = 0
    } = req.body;

    console.log('Données extraites:', { supplier_id, order_number, expectedDeliveryDate, items, total_amount });

    if (!supplier_id || !order_number) {
      return res.status(400).json({
        success: false,
        error: 'supplier_id et order_number sont obligatoires'
      });
    }

    const orderId = uuidv4();
    // Convertir la date vide en NULL
    const deliveryDate = expectedDeliveryDate && expectedDeliveryDate.trim() ? expectedDeliveryDate : null;

    console.log('Création commande avec:', { orderId, supplier_id, order_number, deliveryDate });

    // Créer la commande
    await pool.execute(
      `INSERT INTO purchase_orders (id, user_id, supplier_id, order_number, expected_delivery_date, notes, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [orderId, req.user.id, supplier_id, order_number, deliveryDate, notes, total_amount]
    );
    
    console.log('✅ Commande insérée:', orderId);

    // Ajouter les articles de commande
    if (Array.isArray(items) && items.length > 0) {
      console.log(`📦 Ajout de ${items.length} articles`);
      for (const item of items) {
        console.log('Article:', item);
        if (item.product_name && item.quantity > 0 && item.unit_cost >= 0) {
          const line_total = item.quantity * item.unit_cost;
          console.log('✅ Insertion article:', { product_name: item.product_name, quantity: item.quantity, unit_cost: item.unit_cost, line_total });
          await pool.execute(
            `INSERT INTO purchase_order_items (id, purchase_order_id, product_name, quantity, unit_cost, line_total)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), orderId, item.product_name, item.quantity, item.unit_cost, line_total]
          );
        } else {
          console.log('❌ Article rejeté - conditions non remplies:', { product_name: item.product_name, quantity: item.quantity, unit_cost: item.unit_cost });
        }
      }
    } else {
      console.log('⚠️ Aucun article à ajouter ou items n\'est pas un tableau');
    }

    // Récupérer la commande créée avec ses articles
    const [newOrder] = await pool.execute(
      'SELECT * FROM purchase_orders WHERE id = ?',
      [orderId]
    );

    const [orderItems] = await pool.execute(
      'SELECT id, product_name, quantity, unit_cost, line_total FROM purchase_order_items WHERE purchase_order_id = ?',
      [orderId]
    );

    console.log('📋 Commande créée avec', orderItems.length, 'articles');

    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: {
        ...newOrder[0],
        items: orderItems
      }
    });

  } catch (error) {
    console.error('Erreur création commande:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la commande'
    });
  }
});

// Récupérer les commandes d'un fournisseur avec leurs articles
router.get('/supplier/:supplier_id', authenticateToken, async (req, res) => {
  try {
    const { supplier_id } = req.params;

    const [orders] = await pool.execute(
      `SELECT id, order_number, status, total_amount, notes, expected_delivery_date, created_at as order_date
       FROM purchase_orders
       WHERE user_id = ? AND supplier_id = ?
       ORDER BY created_at DESC`,
      [req.user.id, supplier_id]
    );

    // Récupérer les articles pour chaque commande et calculer le total
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await pool.execute(
          `SELECT id, product_name, quantity, unit_cost, line_total FROM purchase_order_items WHERE purchase_order_id = ?`,
          [order.id]
        );

        // Calculer le total à partir des items si total_amount est 0 ou null
        let calculatedTotal = order.total_amount || 0;
        if ((!calculatedTotal || calculatedTotal === 0) && items.length > 0) {
          calculatedTotal = items.reduce((sum, item) => sum + (Number(item.line_total) || (item.quantity * item.unit_cost)), 0);
        }

        return {
          ...order,
          total_amount: calculatedTotal,
          items: items
        };
      })
    );

    res.json({
      success: true,
      data: ordersWithItems
    });

  } catch (error) {
    console.error('Erreur récupération commandes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des commandes'
    });
  }
});

// Mettre à jour le statut d'une commande
router.put('/:id/status', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'sent', 'confirmed', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Statut invalide' });
    }

    await pool.execute(
      'UPDATE purchase_orders SET status = ? WHERE id = ? AND user_id = ?',
      [status, id, req.user.id]
    );

    res.json({ success: true, message: 'Statut mis à jour' });
  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour' });
  }
});

// Réceptionner une commande — met à jour le stock
router.post('/:id/receive', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { items } = req.body; // [{ item_id, received_quantity, product_id }]

    // Récupérer la commande
    const [orders] = await connection.execute(
      'SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ? AND po.user_id = ?',
      [id, req.user.id]
    );
    if (orders.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }
    const order = orders[0];

    if (!items || items.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, error: 'Aucun article à réceptionner' });
    }

    let totalReceived = 0;

    for (const item of items) {
      const receivedQty = parseFloat(item.received_quantity);
      if (!receivedQty || receivedQty <= 0) continue;

      // Mettre à jour la quantité reçue dans purchase_order_items
      await connection.execute(
        'UPDATE purchase_order_items SET received_quantity = COALESCE(received_quantity, 0) + ?, product_id = COALESCE(?, product_id) WHERE id = ?',
        [receivedQty, item.product_id || null, item.item_id]
      );

      // Récupérer les infos de l'article pour le coût unitaire
      const [itemRows] = await connection.execute(
        'SELECT product_name, unit_cost FROM purchase_order_items WHERE id = ?',
        [item.item_id]
      );
      const orderItem = itemRows[0];

      // Si un product_id est lié, mettre à jour le stock
      if (item.product_id) {
        const [invRows] = await connection.execute(
          'SELECT quantity FROM inventory_items WHERE product_id = ? AND user_id = ?',
          [item.product_id, req.user.id]
        );

        if (invRows.length > 0) {
          const previousStock = parseFloat(invRows[0].quantity) || 0;
          const newStock = previousStock + receivedQty;

          await connection.execute(
            'UPDATE inventory_items SET quantity = ?, last_received_at = NOW(), updated_at = NOW() WHERE product_id = ? AND user_id = ?',
            [newStock, item.product_id, req.user.id]
          );

          await connection.execute(
            `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity, reference_type, reference_id, notes, unit_cost, supplier_name, reference_number, previous_stock, new_stock)
             VALUES (?, ?, ?, 'in', ?, 'purchase', ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(), req.user.id, item.product_id, receivedQty,
              id, `Réception commande ${order.order_number}`,
              orderItem?.unit_cost || null, order.supplier_name || null,
              order.order_number, previousStock, newStock
            ]
          );
        }
      }

      totalReceived++;
    }

    // Mettre à jour le statut de la commande
    await connection.execute(
      "UPDATE purchase_orders SET status = 'received' WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );

    await connection.commit();
    res.json({
      success: true,
      message: `${totalReceived} article(s) réceptionné(s)`,
      data: { totalReceived }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur réception commande:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la réception' });
  } finally {
    connection.release();
  }
});

// Récupérer toutes les commandes (tous fournisseurs confondus)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT po.*, s.name as supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.user_id = ?
       ORDER BY po.created_at DESC`,
      [req.user.id]
    );

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await pool.execute(
          `SELECT id, product_name, product_id, quantity, received_quantity, unit_cost, line_total FROM purchase_order_items WHERE purchase_order_id = ?`,
          [order.id]
        );
        let calculatedTotal = order.total_amount || 0;
        if ((!calculatedTotal || calculatedTotal === 0) && items.length > 0) {
          calculatedTotal = items.reduce((sum, item) => sum + (Number(item.line_total) || (item.quantity * item.unit_cost)), 0);
        }
        return { ...order, total_amount: calculatedTotal, items };
      })
    );

    res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    console.error('Erreur récupération commandes:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des commandes' });
  }
});

module.exports = router;
