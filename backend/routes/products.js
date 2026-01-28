const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Récupérer tous les produits
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [products] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        s.name as supplier_name,
        i.quantity,
        i.min_stock_level,
        i.reorder_point
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_items i ON p.id = i.product_id
      WHERE p.user_id = ? AND p.status = 'active'
      ORDER BY p.name
    `, [req.user.id]);

    // Transformer les données pour correspondre au format frontend
    const transformedProducts = products.map(product => ({
      ...product,
      price: product.selling_price,
      stock: product.quantity || 0,
      minStock: product.min_stock_level || 0,
      category: { id: product.category_id, name: product.category_name },
      supplier: { id: product.supplier_id, name: product.supplier_name },
      type: product.category_name?.toLowerCase().includes('béton') ? 'concrete' : 
            product.category_name?.toLowerCase().includes('additif') ? 'additive' : 'equipment'
    }));

    res.json({
      success: true,
      data: transformedProducts
    });

  } catch (error) {
    console.error('Erreur récupération produits:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des produits'
    });
  }
});

// Créer un nouveau produit
router.post('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      name,
      description,
      category_id,
      supplier_id,
      price,
      cost_price,
      unit,
      stock,
      minStock
    } = req.body;

    // Validation
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        error: 'Le nom et le prix du produit sont obligatoires'
      });
    }

    // Générer un SKU unique
    const sku = `PRD-${Date.now()}`;
    const productId = uuidv4();

    // Créer le produit
    await connection.execute(
      `INSERT INTO products (id, user_id, name, description, sku, category_id, supplier_id, cost_price, selling_price, unit, status, is_tracked) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', TRUE)`,
      [productId, req.user.id, name, description, sku, category_id, supplier_id, cost_price || price * 0.8, price, unit || 'm³']
    );

    // Créer l'entrée d'inventaire
    await connection.execute(
      `INSERT INTO inventory_items (id, user_id, product_id, quantity, min_stock_level, reorder_point, last_received_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), req.user.id, productId, stock || 0, minStock || 0, minStock || 0]
    );

    await connection.commit();

    // Récupérer le produit créé avec ses relations
    const [newProduct] = await pool.execute(`
      SELECT 
        p.*,
        c.name as category_name,
        s.name as supplier_name,
        i.quantity,
        i.min_stock_level
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN inventory_items i ON p.id = i.product_id
      WHERE p.id = ?
    `, [productId]);

    res.status(201).json({
      success: true,
      data: newProduct[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur création produit:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du produit'
    });
  } finally {
    connection.release();
  }
});

// Mettre à jour un produit
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      name,
      description,
      category_id,
      supplier_id,
      price,
      cost_price,
      unit,
      stock,
      minStock
    } = req.body;

    // Mettre à jour le produit
    await connection.execute(
      `UPDATE products 
       SET name = ?, description = ?, category_id = ?, supplier_id = ?, selling_price = ?, cost_price = ?, unit = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [name, description, category_id, supplier_id, price, cost_price, unit, id, req.user.id]
    );

    // Mettre à jour l'inventaire si nécessaire
    if (stock !== undefined || minStock !== undefined) {
      const updates = [];
      const values = [];

      if (stock !== undefined) {
        updates.push('quantity = ?');
        values.push(stock);
      }
      if (minStock !== undefined) {
        updates.push('min_stock_level = ?', 'reorder_point = ?');
        values.push(minStock, minStock);
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        values.push(id, req.user.id);
        await connection.execute(
          `UPDATE inventory_items SET ${updates.join(', ')} WHERE product_id = ? AND user_id = ?`,
          values
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Produit mis à jour avec succès'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur mise à jour produit:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du produit'
    });
  } finally {
    connection.release();
  }
});

// Supprimer un produit (soft delete)
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute(
      'UPDATE products SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      ['inactive', id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Produit supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression produit:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du produit'
    });
  }
});

module.exports = router;