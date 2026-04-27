const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Types de produits prédéfinis
const PRODUCT_TYPES = ['beton', 'carriere', 'autre'];

// Variantes par défaut (carrière peut être étendue)
const DEFAULT_VARIANTS = {
  beton: ['3/8', '8/16'],
  carriere: ['Gravier 5/15', 'Gravier 15/25', 'Sable fin', 'Sable grossier', 'Tout-venant', 'Latérite', 'Basalte'],
  autre: []
};

// Prix par défaut (FCFA)
const DEFAULT_PRICES = {
  'beton_3/8': 70000,
  'beton_8/16': 65000,
  'carriere_Gravier 5/15': 15000,
  'carriere_Gravier 15/25': 14000,
  'carriere_Sable fin': 12000,
  'carriere_Sable grossier': 11000,
  'carriere_Tout-venant': 10000,
  'carriere_Latérite': 8000,
  'carriere_Basalte': 20000,
};

// Auto-migration: ajouter colonnes product_type et variant si manquantes
(async () => {
  try {
    const [cols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'"
    );
    const names = cols.map(c => c.COLUMN_NAME);
    if (!names.includes('product_type')) {
      await pool.execute("ALTER TABLE products ADD COLUMN product_type ENUM('beton', 'carriere', 'autre') DEFAULT 'autre'");
      console.log('✅ Colonne product_type ajoutée à products');
    }
    if (!names.includes('variant')) {
      await pool.execute("ALTER TABLE products ADD COLUMN variant VARCHAR(50) NULL");
      console.log('✅ Colonne variant ajoutée à products');
    }
  } catch (e) {
    console.error('Migration products:', e.message);
  }
})();

// Auto-migration: ajouter colonnes supplémentaires à stock_movements
(async () => {
  try {
    const [cols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements'"
    );
    const names = cols.map(c => c.COLUMN_NAME);
    const migrations = [
      { col: 'unit_cost', sql: "ALTER TABLE stock_movements ADD COLUMN unit_cost DECIMAL(12,2) NULL" },
      { col: 'supplier_name', sql: "ALTER TABLE stock_movements ADD COLUMN supplier_name VARCHAR(255) NULL" },
      { col: 'reference_number', sql: "ALTER TABLE stock_movements ADD COLUMN reference_number VARCHAR(100) NULL" },
      { col: 'previous_stock', sql: "ALTER TABLE stock_movements ADD COLUMN previous_stock DECIMAL(10,2) NULL" },
      { col: 'new_stock', sql: "ALTER TABLE stock_movements ADD COLUMN new_stock DECIMAL(10,2) NULL" },
    ];
    for (const m of migrations) {
      if (!names.includes(m.col)) {
        await pool.execute(m.sql);
        console.log(`✅ Colonne ${m.col} ajoutée à stock_movements`);
      }
    }
  } catch (e) {
    console.error('Migration stock_movements:', e.message);
  }
})();

// GET - Types et variantes disponibles (inclut les variantes personnalisées de la DB)
router.get('/types', authenticateToken, async (req, res) => {
  try {
    // Récupérer les variantes de carrière depuis la base (produits existants)
    const [customVariants] = await pool.execute(
      "SELECT DISTINCT variant FROM products WHERE product_type = 'carriere' AND variant IS NOT NULL AND user_id = ?",
      [req.user.id]
    );
    const dbCarriereVariants = customVariants.map(r => r.variant);

    // Fusionner avec les valeurs par défaut
    const allCarriereVariants = [...new Set([...DEFAULT_VARIANTS.carriere, ...dbCarriereVariants])];

    const variants = {
      beton: DEFAULT_VARIANTS.beton,
      carriere: allCarriereVariants,
      autre: []
    };

    res.json({ success: true, data: { types: PRODUCT_TYPES, variants, defaultPrices: DEFAULT_PRICES } });
  } catch (error) {
    console.error('Erreur types:', error);
    res.json({ success: true, data: { types: PRODUCT_TYPES, variants: DEFAULT_VARIANTS, defaultPrices: DEFAULT_PRICES } });
  }
});

// POST - Initialiser les produits béton et carrière dans le stock
router.post('/initialize', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let created = 0;
    const allProducts = [];

    // Créer les produits béton
    for (const variant of DEFAULT_VARIANTS.beton) {
      const name = `Béton ${variant}`;
      const priceKey = `beton_${variant}`;
      const price = DEFAULT_PRICES[priceKey] || 65000;

      // Vérifier si le produit existe déjà
      const [existing] = await connection.execute(
        "SELECT id FROM products WHERE user_id = ? AND product_type = 'beton' AND variant = ?",
        [req.user.id, variant]
      );

      if (existing.length === 0) {
        const productId = uuidv4();
        await connection.execute(
          `INSERT INTO products (id, user_id, name, sku, selling_price, cost_price, unit, status, is_tracked, product_type, variant)
           VALUES (?, ?, ?, ?, ?, ?, 'm³', 'active', TRUE, 'beton', ?)`,
          [productId, req.user.id, name, `BET-${variant}-${Date.now()}`, price, price * 0.8, variant]
        );
        await connection.execute(
          `INSERT INTO inventory_items (id, user_id, product_id, quantity, min_stock_level, reorder_point)
           VALUES (?, ?, ?, 0, 0, 0)`,
          [uuidv4(), req.user.id, productId]
        );
        created++;
        allProducts.push({ name, variant, type: 'beton', price });
      }
    }

    // Créer les produits carrière
    for (const variant of DEFAULT_VARIANTS.carriere) {
      const name = `Carrière ${variant}`;
      const priceKey = `carriere_${variant}`;
      const price = DEFAULT_PRICES[priceKey] || 10000;

      const [existing] = await connection.execute(
        "SELECT id FROM products WHERE user_id = ? AND product_type = 'carriere' AND variant = ?",
        [req.user.id, variant]
      );

      if (existing.length === 0) {
        const productId = uuidv4();
        await connection.execute(
          `INSERT INTO products (id, user_id, name, sku, selling_price, cost_price, unit, status, is_tracked, product_type, variant)
           VALUES (?, ?, ?, ?, ?, ?, 'm³', 'active', TRUE, 'carriere', ?)`,
          [productId, req.user.id, name, `CAR-${Date.now()}-${Math.random().toString(36).substring(2,6)}`, price, price * 0.8, variant]
        );
        await connection.execute(
          `INSERT INTO inventory_items (id, user_id, product_id, quantity, min_stock_level, reorder_point)
           VALUES (?, ?, ?, 0, 0, 0)`,
          [uuidv4(), req.user.id, productId]
        );
        created++;
        allProducts.push({ name, variant, type: 'carriere', price });
      }
    }

    await connection.commit();
    res.json({ success: true, message: `${created} produit(s) créé(s)`, data: allProducts });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur initialisation produits:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'initialisation' });
  } finally {
    connection.release();
  }
});

// POST - Ajouter un nouveau type de carrière
router.post('/variants/carriere', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { name, price } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Nom et prix requis' });
    }

    await connection.beginTransaction();

    // Vérifier si existe déjà
    const [existing] = await connection.execute(
      "SELECT id FROM products WHERE user_id = ? AND product_type = 'carriere' AND variant = ?",
      [req.user.id, name]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Ce type de carrière existe déjà' });
    }

    const productId = uuidv4();
    await connection.execute(
      `INSERT INTO products (id, user_id, name, sku, selling_price, cost_price, unit, status, is_tracked, product_type, variant)
       VALUES (?, ?, ?, ?, ?, ?, 'm³', 'active', TRUE, 'carriere', ?)`,
      [productId, req.user.id, `Carrière ${name}`, `CAR-${Date.now()}`, price, price * 0.8, name]
    );
    await connection.execute(
      `INSERT INTO inventory_items (id, user_id, product_id, quantity, min_stock_level, reorder_point)
       VALUES (?, ?, ?, 0, 0, 0)`,
      [uuidv4(), req.user.id, productId]
    );

    await connection.commit();
    res.json({ success: true, message: `Carrière ${name} ajoutée`, data: { id: productId, name, price } });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur ajout carrière:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de l\'ajout' });
  } finally {
    connection.release();
  }
});

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
      productType: product.product_type || 'autre',
      variant: product.variant || null
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

// POST - Réapprovisionner un produit
router.post('/:id/restock', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { quantity, unitCost, supplier, reference, notes } = req.body;

    if (!quantity || quantity <= 0) {
      connection.release();
      return res.status(400).json({ success: false, error: 'Quantité invalide' });
    }

    // Vérifier que le produit existe
    const [product] = await connection.execute(
      'SELECT id, name FROM products WHERE id = ? AND user_id = ? AND status = ?',
      [id, req.user.id, 'active']
    );
    if (product.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, error: 'Produit non trouvé' });
    }

    // Stock actuel
    const [currentInv] = await connection.execute(
      'SELECT quantity FROM inventory_items WHERE product_id = ? AND user_id = ?',
      [id, req.user.id]
    );
    const previousStock = parseFloat(currentInv[0]?.quantity) || 0;
    const newStock = previousStock + parseFloat(quantity);

    // Mettre à jour l'inventaire
    await connection.execute(
      `UPDATE inventory_items SET quantity = ?, last_received_at = NOW(), updated_at = NOW()
       WHERE product_id = ? AND user_id = ?`,
      [newStock, id, req.user.id]
    );

    // Enregistrer le mouvement de stock
    const movementId = uuidv4();
    await connection.execute(
      `INSERT INTO stock_movements
       (id, user_id, product_id, movement_type, quantity, reference_type, reference_id, notes, unit_cost, supplier_name, reference_number, previous_stock, new_stock)
       VALUES (?, ?, ?, 'in', ?, 'purchase', NULL, ?, ?, ?, ?, ?, ?)`,
      [movementId, req.user.id, id, quantity, notes || null, unitCost || null, supplier || null, reference || null, previousStock, newStock]
    );

    await connection.commit();
    res.json({ success: true, data: { movementId, previousStock, newStock, quantity: parseFloat(quantity), productName: product[0].name } });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur restock:', error);
    res.status(500).json({ success: false, error: 'Erreur lors du réapprovisionnement' });
  } finally {
    connection.release();
  }
});

// GET - Tous les mouvements de stock (vue globale)
router.get('/movements/all', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type; // in, out, adjustment
    const from = req.query.from;
    const to = req.query.to;
    const search = req.query.search;

    let whereClause = 'sm.user_id = ?';
    const params = [req.user.id];

    if (type && ['in', 'out', 'adjustment'].includes(type)) {
      whereClause += ' AND sm.movement_type = ?';
      params.push(type);
    }
    if (from) {
      whereClause += ' AND sm.created_at >= ?';
      params.push(from);
    }
    if (to) {
      whereClause += ' AND sm.created_at <= ?';
      params.push(to + ' 23:59:59');
    }
    if (search) {
      whereClause += ' AND (p.name LIKE ? OR sm.supplier_name LIKE ? OR sm.notes LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const [movements] = await pool.execute(
      `SELECT sm.*, p.name as product_name, p.unit as product_unit, p.product_type, p.variant
       FROM stock_movements sm
       LEFT JOIN products p ON sm.product_id = p.id
       WHERE ${whereClause}
       ORDER BY sm.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM stock_movements sm
       LEFT JOIN products p ON sm.product_id = p.id
       WHERE ${whereClause}`,
      params
    );

    // Stats agrégées
    const [stats] = await pool.execute(
      `SELECT
         SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END) as total_in,
         SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END) as total_out,
         SUM(CASE WHEN movement_type = 'adjustment' THEN quantity ELSE 0 END) as total_adjustment,
         COUNT(*) as total_movements,
         SUM(CASE WHEN movement_type = 'in' THEN COALESCE(quantity * unit_cost, 0) ELSE 0 END) as total_cost_in
       FROM stock_movements
       WHERE user_id = ?`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        movements,
        total: countResult[0].total,
        stats: stats[0] || { total_in: 0, total_out: 0, total_adjustment: 0, total_movements: 0, total_cost_in: 0 }
      }
    });
  } catch (error) {
    console.error('Erreur mouvements globaux:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des mouvements' });
  }
});

// GET - Historique des mouvements de stock d'un produit
router.get('/:id/movements', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const [movements] = await pool.execute(
      `SELECT sm.*, p.name as product_name
       FROM stock_movements sm
       LEFT JOIN products p ON sm.product_id = p.id
       WHERE sm.product_id = ? AND sm.user_id = ?
       ORDER BY sm.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, req.user.id, limit, offset]
    );

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM stock_movements WHERE product_id = ? AND user_id = ?',
      [id, req.user.id]
    );

    res.json({ success: true, data: { movements, total: countResult[0].total } });
  } catch (error) {
    console.error('Erreur mouvements:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des mouvements' });
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
      minStock,
      product_type,
      variant
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
    const pType = PRODUCT_TYPES.includes(product_type) ? product_type : 'autre';

    // Créer le produit
    await connection.execute(
      `INSERT INTO products (id, user_id, name, description, sku, category_id, supplier_id, cost_price, selling_price, unit, status, is_tracked, product_type, variant)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', TRUE, ?, ?)`,
      [productId, req.user.id, name, description || null, sku, category_id || null, supplier_id || null, cost_price || price * 0.8, price, unit || 'm³', pType, variant || null]
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
      minStock,
      product_type,
      variant
    } = req.body;

    const pType = PRODUCT_TYPES.includes(product_type) ? product_type : undefined;

    // Mettre à jour le produit
    await connection.execute(
      `UPDATE products
       SET name = ?, description = ?, category_id = ?, supplier_id = ?, selling_price = ?, cost_price = ?, unit = ?,
           product_type = COALESCE(?, product_type), variant = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [name, description || null, category_id || null, supplier_id || null, price, cost_price, unit, pType, variant || null, id, req.user.id]
    );

    // Mettre à jour l'inventaire si nécessaire
    if (stock !== undefined || minStock !== undefined) {
      const updates = [];
      const values = [];

      // Si le stock change, enregistrer un mouvement
      if (stock !== undefined) {
        const [prevInv] = await connection.execute(
          'SELECT quantity FROM inventory_items WHERE product_id = ? AND user_id = ?',
          [id, req.user.id]
        );
        const previousStock = parseFloat(prevInv[0]?.quantity) || 0;
        const newStock = parseFloat(stock);
        const diff = newStock - previousStock;

        if (diff !== 0) {
          await connection.execute(
            `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity, reference_type, notes, previous_stock, new_stock)
             VALUES (?, ?, ?, ?, ?, 'adjustment', 'Ajustement manuel', ?, ?)`,
            [uuidv4(), req.user.id, id, diff > 0 ? 'in' : 'out', Math.abs(diff), previousStock, newStock]
          );
        }

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