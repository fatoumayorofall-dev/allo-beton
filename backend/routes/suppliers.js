const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Récupérer tous les fournisseurs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [suppliers] = await pool.execute(`
      SELECT 
        s.*,
        COUNT(DISTINCT p.id) as products_count,
        COUNT(DISTINCT po.id) as orders_count
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id AND p.status = 'active'
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      WHERE s.user_id = ? AND s.status = 'active'
      GROUP BY s.id
      ORDER BY s.name
    `, [req.user.id]);

    // Transformer les données pour correspondre au format frontend
    const transformedSuppliers = suppliers.map(supplier => ({
      ...supplier,
      contactPerson: supplier.contact_person,
      totalOrders: supplier.orders_count || 0,
      lastOrderDate: new Date().toISOString(),
      productsSupplied: [`${supplier.products_count || 0} produits`],
      rating: 4.5
    }));

    res.json({
      success: true,
      data: transformedSuppliers
    });

  } catch (error) {
    console.error('Erreur récupération fournisseurs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des fournisseurs'
    });
  }
});

// Créer un nouveau fournisseur
router.post('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      city,
      contactPerson,
      notes
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Le nom du fournisseur est obligatoire'
      });
    }

    const supplierId = uuidv4();

    await pool.execute(
      `INSERT INTO suppliers (id, user_id, name, email, phone, address, city, contact_person, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [supplierId, req.user.id, name, email, phone, address, city, contactPerson, notes]
    );

    // Récupérer le fournisseur créé
    const [newSupplier] = await pool.execute(
      'SELECT * FROM suppliers WHERE id = ?',
      [supplierId]
    );

    res.status(201).json({
      success: true,
      data: newSupplier[0]
    });

  } catch (error) {
    console.error('Erreur création fournisseur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du fournisseur'
    });
  }
});

// Mettre à jour un fournisseur
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      address,
      city,
      contactPerson,
      notes
    } = req.body;

    await pool.execute(
      `UPDATE suppliers 
       SET name = ?, email = ?, phone = ?, address = ?, city = ?, contact_person = ?, notes = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [name, email, phone, address, city, contactPerson, notes, id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Fournisseur mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur mise à jour fournisseur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du fournisseur'
    });
  }
});

// Supprimer un fournisseur (soft delete)
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute(
      'UPDATE suppliers SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      ['inactive', id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Fournisseur supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression fournisseur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du fournisseur'
    });
  }
});

module.exports = router;