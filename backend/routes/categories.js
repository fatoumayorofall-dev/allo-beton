const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Récupérer toutes les catégories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [categories] = await pool.execute(`
      SELECT 
        c.*,
        COUNT(p.id) as products_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
      WHERE c.user_id = ? AND c.status = 'active'
      GROUP BY c.id
      ORDER BY c.name
    `, [req.user.id]);

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des catégories'
    });
  }
});

// Créer une nouvelle catégorie
router.post('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { name, description, parent_id } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Le nom de la catégorie est obligatoire'
      });
    }

    const categoryId = uuidv4();

    await pool.execute(
      `INSERT INTO categories (id, user_id, name, description, parent_id, status) 
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [categoryId, req.user.id, name, description, parent_id]
    );

    // Récupérer la catégorie créée
    const [newCategory] = await pool.execute(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );

    res.status(201).json({
      success: true,
      data: newCategory[0]
    });

  } catch (error) {
    console.error('Erreur création catégorie:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la catégorie'
    });
  }
});

module.exports = router;