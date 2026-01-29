const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

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
      `SELECT * FROM purchase_orders 
       WHERE user_id = ? AND supplier_id = ?
       ORDER BY created_at DESC`,
      [req.user.id, supplier_id]
    );

    // Récupérer les articles pour chaque commande
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await pool.execute(
          `SELECT id, product_name, quantity, unit_cost, line_total FROM purchase_order_items WHERE purchase_order_id = ?`,
          [order.id]
        );
        return {
          ...order,
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

module.exports = router;
