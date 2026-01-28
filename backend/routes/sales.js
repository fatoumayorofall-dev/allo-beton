const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Récupérer toutes les ventes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [sales] = await pool.execute(`
      SELECT 
        s.*,
        c.name as customer_name,
        c.company as customer_company
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
      LIMIT 100
    `, [req.user.id]);

    // Récupérer les articles pour chaque vente
    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        const [items] = await pool.execute(`
          SELECT 
            si.*,
            p.name as product_name,
            p.unit as product_unit
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          WHERE si.sale_id = ?
        `, [sale.id]);

        return {
          ...sale,
          customerId: sale.customer_id,
          customerName: sale.customer_name || 'Client inconnu',
          sellerName: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Vendeur',
          total: sale.total_amount,
          subtotal: sale.subtotal,
          tax: sale.tax_amount,
          createdAt: sale.created_at,
          deliveryDate: sale.due_date,
          paymentStatus: sale.payment_status,
          items: items.map(item => ({
            productId: item.product_id,
            productName: item.product_name || 'Produit',
            quantity: item.quantity,
            price: item.unit_price,
            total: item.line_total
          }))
        };
      })
    );

    res.json({
      success: true,
      data: salesWithItems
    });

  } catch (error) {
    console.error('Erreur récupération ventes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des ventes'
    });
  }
});

// Créer une nouvelle vente
router.post('/', authenticateToken, requireRole(['admin', 'manager', 'seller']), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      customerId,
      items,
      deliveryDate,
      notes,
      status
    } = req.body;

    // Validation
    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Le client et au moins un article sont obligatoires'
      });
    }

    // Calculer les totaux
    let subtotal = 0;
    const processedItems = items.map(item => {
      const lineTotal = item.quantity * item.price;
      subtotal += lineTotal;
      return {
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        line_total: lineTotal,
        tax_rate: 18.00,
        discount_percentage: 0
      };
    });

    const taxAmount = subtotal * 0.18; // 18% TVA
    const totalAmount = subtotal + taxAmount;

    // Générer un numéro de vente unique
    const saleNumber = `VTE-${Date.now()}`;
    const saleId = uuidv4();

    // Créer la vente
    await connection.execute(
      `INSERT INTO sales (id, user_id, customer_id, sale_number, status, sale_date, due_date, subtotal, tax_amount, total_amount, payment_status, notes) 
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, 'pending', ?)`,
      [saleId, req.user.id, customerId, saleNumber, status || 'draft', deliveryDate, subtotal, taxAmount, totalAmount, notes]
    );

    // Créer les articles de vente
    for (const item of processedItems) {
      await connection.execute(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, discount_percentage, tax_rate, line_total) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), saleId, item.product_id, item.quantity, item.unit_price, item.discount_percentage, item.tax_rate, item.line_total]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      data: { id: saleId, sale_number: saleNumber }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur création vente:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la vente'
    });
  } finally {
    connection.release();
  }
});

// Mettre à jour une vente
router.put('/:id', authenticateToken, requireRole(['admin', 'manager', 'seller']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Construire la requête de mise à jour dynamiquement
    const allowedFields = ['status', 'due_date', 'payment_status', 'payment_method', 'notes'];
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun champ valide à mettre à jour'
      });
    }

    setClause.push('updated_at = NOW()');
    values.push(id, req.user.id);

    await pool.execute(
      `UPDATE sales SET ${setClause.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Vente mise à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur mise à jour vente:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la vente'
    });
  }
});

module.exports = router;