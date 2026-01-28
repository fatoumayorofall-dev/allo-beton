const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Récupérer les statistiques du tableau de bord
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Récupérer les statistiques en parallèle
    const [
      [salesCount],
      [revenueResult],
      [pendingOrders],
      [lowStockItems],
      [totalCustomers],
      [totalProducts]
    ] = await Promise.all([
      // Nombre total de ventes
      pool.execute(
        'SELECT COUNT(*) as count FROM sales WHERE user_id = ? AND status != "cancelled"',
        [req.user.id]
      ),
      
      // Chiffre d'affaires du mois
      pool.execute(`
        SELECT COALESCE(SUM(p.amount), 0) as revenue 
        FROM payments p 
        WHERE p.user_id = ? 
        AND p.status = 'completed'
        AND MONTH(p.created_at) = MONTH(CURRENT_DATE()) 
        AND YEAR(p.created_at) = YEAR(CURRENT_DATE())
      `, [req.user.id]),
      
      // Commandes en attente
      pool.execute(
        'SELECT COUNT(*) as count FROM sales WHERE user_id = ? AND status IN (?, ?)',
        [req.user.id, 'draft', 'confirmed']
      ),
      
      // Articles en stock faible
      pool.execute(`
        SELECT COUNT(*) as count 
        FROM inventory_items i 
        JOIN products p ON i.product_id = p.id
        WHERE i.user_id = ? 
        AND p.status = 'active'
        AND i.quantity <= i.min_stock_level 
        AND i.min_stock_level > 0
      `, [req.user.id]),

      // Total clients actifs
      pool.execute(
        'SELECT COUNT(*) as count FROM customers WHERE user_id = ? AND status = "active"',
        [req.user.id]
      ),

      // Total produits actifs
      pool.execute(
        'SELECT COUNT(*) as count FROM products WHERE user_id = ? AND status = "active"',
        [req.user.id]
      )
    ]);

    const stats = {
      totalSales: salesCount[0].count,
      monthlyRevenue: parseFloat(revenueResult[0].revenue),
      pendingOrders: pendingOrders[0].count,
      lowStockItems: lowStockItems[0].count,
      totalCustomers: totalCustomers[0].count,
      totalProducts: totalProducts[0].count
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// Récupérer les ventes récentes
router.get('/recent-sales', authenticateToken, async (req, res) => {
  try {
    const [sales] = await pool.execute(`
      SELECT 
        s.id,
        s.sale_number,
        s.total_amount,
        s.status,
        s.created_at,
        c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.user_id = ? AND s.status != 'cancelled'
      ORDER BY s.created_at DESC
      LIMIT 5
    `, [req.user.id]);

    res.json({
      success: true,
      data: sales
    });

  } catch (error) {
    console.error('Erreur récupération ventes récentes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des ventes récentes'
    });
  }
});

// Récupérer les produits en stock faible
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const [products] = await pool.execute(`
      SELECT 
        p.id,
        p.name,
        p.unit,
        i.quantity,
        i.min_stock_level,
        c.name as category_name
      FROM products p
      JOIN inventory_items i ON p.id = i.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = ? 
      AND p.status = 'active'
      AND i.quantity <= i.min_stock_level 
      AND i.min_stock_level > 0
      ORDER BY (i.quantity / i.min_stock_level) ASC
      LIMIT 10
    `, [req.user.id]);

    res.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('Erreur récupération stock faible:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des produits en stock faible'
    });
  }
});

module.exports = router;