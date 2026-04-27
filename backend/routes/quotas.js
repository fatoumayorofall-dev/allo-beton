const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Auto-migration: recréer la table client_quotas avec la bonne structure
(async () => {
  try {
    // Vérifier si la table existe avec la bonne structure
    const [cols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'client_quotas'"
    );
    const names = cols.map(c => c.COLUMN_NAME);

    // Si product_type n'existe pas, on doit ajouter les nouvelles colonnes
    if (!names.includes('product_type')) {
      // Ajouter les colonnes manquantes
      try {
        await pool.execute("ALTER TABLE client_quotas ADD COLUMN product_type VARCHAR(50) NULL AFTER customer_id");
        console.log('✅ Colonne product_type ajoutée à client_quotas');
      } catch (e) {
        if (!e.message.includes('Duplicate')) console.error('product_type:', e.message);
      }

      try {
        await pool.execute("ALTER TABLE client_quotas ADD COLUMN product_variant VARCHAR(100) NULL AFTER product_type");
        console.log('✅ Colonne product_variant ajoutée à client_quotas');
      } catch (e) {
        if (!e.message.includes('Duplicate')) console.error('product_variant:', e.message);
      }

      try {
        await pool.execute("ALTER TABLE client_quotas ADD COLUMN product_id VARCHAR(36) NULL AFTER product_variant");
        console.log('✅ Colonne product_id ajoutée à client_quotas');
      } catch (e) {
        if (!e.message.includes('Duplicate')) console.error('product_id:', e.message);
      }

      try {
        await pool.execute("ALTER TABLE client_quotas ADD COLUMN quota_consumed DECIMAL(15,2) DEFAULT 0 AFTER quota_initial");
        console.log('✅ Colonne quota_consumed ajoutée à client_quotas');
      } catch (e) {
        if (!e.message.includes('Duplicate')) console.error('quota_consumed:', e.message);
      }

      try {
        await pool.execute("ALTER TABLE client_quotas ADD COLUMN status ENUM('active','completed','cancelled') DEFAULT 'active' AFTER quota_consumed");
        console.log('✅ Colonne status ajoutée à client_quotas');
      } catch (e) {
        if (!e.message.includes('Duplicate')) console.error('status:', e.message);
      }

      // Supprimer l'ancienne contrainte unique si elle existe
      try {
        await pool.execute("ALTER TABLE client_quotas DROP INDEX unique_customer_date");
        console.log('✅ Index unique_customer_date supprimé');
      } catch (e) {
        // Index n'existe peut-être pas
      }

      // Rendre quota_date nullable (ce n'est plus obligatoire)
      try {
        await pool.execute("ALTER TABLE client_quotas MODIFY COLUMN quota_date DATE NULL");
        console.log('✅ Colonne quota_date rendue nullable');
      } catch (e) {
        console.error('quota_date nullable:', e.message);
      }
    }

    console.log('✅ Table client_quotas vérifiée/migrée');
  } catch (e) {
    console.error('Migration client_quotas:', e.message);
  }
})();

// Auto-migration: créer la table quota_consumptions pour l'historique
(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS quota_consumptions (
        id VARCHAR(36) PRIMARY KEY,
        quota_id VARCHAR(36) NOT NULL,
        sale_id VARCHAR(36) NULL,
        quantity DECIMAL(15,2) NOT NULL,
        consumed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (quota_id) REFERENCES client_quotas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table quota_consumptions vérifiée/créée');
  } catch (e) {
    console.error('Migration quota_consumptions:', e.message);
  }
})();

// GET - Liste des quotas d'un client avec consommation
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { customer_id } = req.query;

    let query = `
      SELECT
        q.*,
        c.name as customer_name,
        p.name as product_name
      FROM client_quotas q
      JOIN customers c ON q.customer_id = c.id
      LEFT JOIN products p ON q.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (customer_id) {
      query += ' AND q.customer_id = ?';
      params.push(customer_id);
    }

    query += ' ORDER BY q.created_at DESC';

    const [rows] = await pool.execute(query, params);

    const data = rows.map(r => ({
      ...r,
      quota_initial: Number(r.quota_initial),
      quota_consumed: Number(r.quota_consumed || 0),
      quota_remaining: Number(r.quota_initial) - Number(r.quota_consumed || 0),
      // Nom du produit formaté
      product_display: r.product_name ||
        (r.product_type && r.product_variant ? `${r.product_type.charAt(0).toUpperCase() + r.product_type.slice(1)} ${r.product_variant}` : 'Non spécifié'),
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur récupération quotas:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des quotas' });
  }
});

// GET - Obtenir le quota actif d'un client (DOIT être avant /:id pour éviter conflit)
router.get('/customer/:customerId/active', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Chercher le quota actif le plus récent
    const [quotaRows] = await pool.execute(`
      SELECT q.*, c.name as customer_name, p.name as product_name
      FROM client_quotas q
      JOIN customers c ON q.customer_id = c.id
      LEFT JOIN products p ON q.product_id = p.id
      WHERE q.customer_id = ? AND q.status = 'active'
      ORDER BY q.created_at DESC
      LIMIT 1
    `, [customerId]);
    
    if (quotaRows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'Aucun quota actif pour ce client'
      });
    }
    
    const quota = quotaRows[0];
    res.json({
      success: true,
      data: {
        ...quota,
        quota_initial: Number(quota.quota_initial),
        quota_consumed: Number(quota.quota_consumed || 0),
        quota_remaining: Number(quota.quota_initial) - Number(quota.quota_consumed || 0),
        product_display: quota.product_name ||
          (quota.product_type && quota.product_variant 
            ? `${quota.product_type.charAt(0).toUpperCase() + quota.product_type.slice(1)} ${quota.product_variant}` 
            : 'Non spécifié'),
      }
    });
  } catch (error) {
    console.error('Erreur récupération quota actif:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération du quota actif' });
  }
});

// GET - Historique de consommation d'un quota
router.get('/:id/consumptions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(`
      SELECT
        qc.*,
        s.sale_number
      FROM quota_consumptions qc
      LEFT JOIN sales s ON qc.sale_id = s.id
      WHERE qc.quota_id = ?
      ORDER BY qc.consumed_at DESC
    `, [id]);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Erreur historique consommation:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération de l\'historique' });
  }
});

// POST - Créer un nouveau quota
router.post('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { customer_id, product_type, product_variant, product_id, quota_initial, notes } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, error: 'customer_id est obligatoire' });
    }
    if (quota_initial === undefined || quota_initial === null || Number(quota_initial) <= 0) {
      return res.status(400).json({ success: false, error: 'quota_initial doit être supérieur à 0' });
    }
    if (!product_type && !product_id) {
      return res.status(400).json({ success: false, error: 'Veuillez sélectionner un produit' });
    }

    // Vérifier que le client existe
    const [client] = await pool.execute('SELECT id FROM customers WHERE id = ?', [customer_id]);
    if (client.length === 0) {
      return res.status(404).json({ success: false, error: 'Client introuvable' });
    }

    const id = uuidv4();
    await pool.execute(
      `INSERT INTO client_quotas (id, user_id, customer_id, product_type, product_variant, product_id, quota_initial, quota_consumed, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, NOW())`,
      [id, req.user?.id || null, customer_id, product_type || null, product_variant || null, product_id || null, Number(quota_initial), notes || null]
    );

    // Retourner avec les données complètes
    const [inserted] = await pool.execute(`
      SELECT q.*, c.name as customer_name, p.name as product_name
      FROM client_quotas q
      JOIN customers c ON q.customer_id = c.id
      LEFT JOIN products p ON q.product_id = p.id
      WHERE q.id = ?
    `, [id]);

    const row = inserted[0];
    res.status(201).json({
      success: true,
      data: {
        ...row,
        quota_initial: Number(row.quota_initial),
        quota_consumed: 0,
        quota_remaining: Number(row.quota_initial),
        product_display: row.product_name ||
          (row.product_type && row.product_variant ? `${row.product_type.charAt(0).toUpperCase() + row.product_type.slice(1)} ${row.product_variant}` : 'Non spécifié'),
      }
    });
  } catch (error) {
    console.error('Erreur création quota:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la création du quota' });
  }
});

// POST - Consommer du quota (utilisé lors d'une vente)
router.post('/:id/consume', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { quantity, sale_id, notes } = req.body;

    if (!quantity || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, error: 'Quantité invalide' });
    }

    await connection.beginTransaction();

    // Vérifier le quota existe et est actif
    const [quotas] = await connection.execute(
      'SELECT * FROM client_quotas WHERE id = ? AND status = "active"',
      [id]
    );
    if (quotas.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Quota introuvable ou inactif' });
    }

    const quota = quotas[0];
    const remaining = Number(quota.quota_initial) - Number(quota.quota_consumed || 0);
    const consumeQty = Number(quantity);

    if (consumeQty > remaining) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: `Quantité demandée (${consumeQty}) dépasse le quota restant (${remaining})`
      });
    }

    // Ajouter la consommation à l'historique
    const consumptionId = uuidv4();
    await connection.execute(
      'INSERT INTO quota_consumptions (id, quota_id, sale_id, quantity, notes) VALUES (?, ?, ?, ?, ?)',
      [consumptionId, id, sale_id || null, consumeQty, notes || null]
    );

    // Mettre à jour le quota
    const newConsumed = Number(quota.quota_consumed || 0) + consumeQty;
    const newStatus = newConsumed >= Number(quota.quota_initial) ? 'completed' : 'active';

    await connection.execute(
      'UPDATE client_quotas SET quota_consumed = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [newConsumed, newStatus, id]
    );

    await connection.commit();

    res.json({
      success: true,
      data: {
        consumed: consumeQty,
        total_consumed: newConsumed,
        remaining: Number(quota.quota_initial) - newConsumed,
        status: newStatus,
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur consommation quota:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la consommation du quota' });
  } finally {
    connection.release();
  }
});

// PUT - Mettre à jour un quota
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { quota_initial, notes, status } = req.body;

    const setClauses = [];
    const values = [];

    if (quota_initial !== undefined && quota_initial !== null) {
      setClauses.push('quota_initial = ?');
      values.push(Number(quota_initial));
    }
    if (notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(notes || null);
    }
    if (status !== undefined) {
      setClauses.push('status = ?');
      values.push(status);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour' });
    }

    setClauses.push('updated_at = NOW()');
    values.push(id);

    await pool.execute(
      `UPDATE client_quotas SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ success: true, message: 'Quota mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur mise à jour quota:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour du quota' });
  }
});

// DELETE - Supprimer un quota
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM client_quotas WHERE id = ?', [id]);
    res.json({ success: true, message: 'Quota supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression quota:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression du quota' });
  }
});

module.exports = router;
