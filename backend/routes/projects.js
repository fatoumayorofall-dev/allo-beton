const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Auto-migration: créer la table si manquante
(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        code VARCHAR(30) NOT NULL UNIQUE,
        description TEXT,
        client VARCHAR(150),
        location VARCHAR(200),
        status ENUM('actif', 'en_pause', 'termine', 'annule') DEFAULT 'actif',
        whatsapp_group VARCHAR(255),
        budget_prevu DECIMAL(15,2) DEFAULT 0,
        date_debut DATE,
        date_fin_prevue DATE,
        date_fin_reelle DATE,
        responsable VARCHAR(100),
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Ajouter project_id à cash_movements si manquant
    const [cols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cash_movements' AND COLUMN_NAME = 'project_id'"
    );
    if (cols.length === 0) {
      await pool.execute('ALTER TABLE cash_movements ADD COLUMN project_id INT NULL');
      await pool.execute('ALTER TABLE cash_movements ADD INDEX idx_project_id (project_id)');
      console.log('✅ [projects] Colonne project_id ajoutée à cash_movements');
    }
  } catch (e) {
    console.error('Migration projects:', e.message);
  }
})();

// ═══════════════════════════════════════════════════════
// GET /api/projects — Liste des projets
// ═══════════════════════════════════════════════════════
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT p.*,
        COALESCE(SUM(CASE WHEN cm.type = 'depense' THEN cm.amount ELSE 0 END), 0) AS total_depenses,
        COALESCE(SUM(CASE WHEN cm.type = 'recette' THEN cm.amount ELSE 0 END), 0) AS total_recettes,
        COUNT(cm.id) AS nb_mouvements
      FROM projects p
      LEFT JOIN cash_movements cm ON cm.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.client LIKE ? OR p.location LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC';

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erreur liste projets:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/projects/:id — Détail d'un projet
// ═══════════════════════════════════════════════════════
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [projects] = await pool.execute('SELECT * FROM projects WHERE id = ?', [id]);
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    const project = projects[0];

    // Mouvements liés
    const [movements] = await pool.execute(
      'SELECT * FROM cash_movements WHERE project_id = ? ORDER BY date DESC, created_at DESC',
      [id]
    );

    // Totaux
    const [totals] = await pool.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'depense' THEN amount ELSE 0 END), 0) AS total_depenses,
        COALESCE(SUM(CASE WHEN type = 'recette' THEN amount ELSE 0 END), 0) AS total_recettes,
        COUNT(*) AS nb_mouvements
      FROM cash_movements WHERE project_id = ?
    `, [id]);

    // Répartition par catégorie
    const [byCategory] = await pool.execute(`
      SELECT category, type,
        SUM(amount) AS total,
        COUNT(*) AS nb
      FROM cash_movements
      WHERE project_id = ?
      GROUP BY category, type
      ORDER BY total DESC
    `, [id]);

    // Dépenses par mois
    const [byMonth] = await pool.execute(`
      SELECT DATE_FORMAT(date, '%Y-%m') AS month,
        COALESCE(SUM(CASE WHEN type = 'depense' THEN amount ELSE 0 END), 0) AS depenses,
        COALESCE(SUM(CASE WHEN type = 'recette' THEN amount ELSE 0 END), 0) AS recettes
      FROM cash_movements
      WHERE project_id = ?
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month ASC
    `, [id]);

    res.json({
      ...project,
      movements,
      totals: totals[0],
      byCategory,
      byMonth,
    });
  } catch (error) {
    console.error('Erreur détail projet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/projects — Créer un projet
// ═══════════════════════════════════════════════════════
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, code, description, client, location, status, whatsapp_group, budget_prevu, date_debut, date_fin_prevue, responsable, notes } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Nom et code du projet requis' });
    }

    const [result] = await pool.execute(`
      INSERT INTO projects (name, code, description, client, location, status, whatsapp_group, budget_prevu, date_debut, date_fin_prevue, responsable, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, code,
      description || null,
      client || null,
      location || null,
      status || 'actif',
      whatsapp_group || null,
      budget_prevu || 0,
      date_debut || null,
      date_fin_prevue || null,
      responsable || null,
      notes || null,
      req.user?.id || null,
    ]);

    const [newProject] = await pool.execute('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    res.status(201).json(newProject[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ce code projet existe déjà' });
    }
    console.error('Erreur création projet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// PUT /api/projects/:id — Modifier un projet
// ═══════════════════════════════════════════════════════
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, client, location, status, whatsapp_group, budget_prevu, date_debut, date_fin_prevue, date_fin_reelle, responsable, notes } = req.body;

    const [existing] = await pool.execute('SELECT id FROM projects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    await pool.execute(`
      UPDATE projects SET
        name = ?, code = ?, description = ?, client = ?, location = ?,
        status = ?, whatsapp_group = ?, budget_prevu = ?,
        date_debut = ?, date_fin_prevue = ?, date_fin_reelle = ?,
        responsable = ?, notes = ?
      WHERE id = ?
    `, [
      name, code,
      description || null,
      client || null,
      location || null,
      status || 'actif',
      whatsapp_group || null,
      budget_prevu || 0,
      date_debut || null,
      date_fin_prevue || null,
      date_fin_reelle || null,
      responsable || null,
      notes || null,
      id,
    ]);

    const [updated] = await pool.execute('SELECT * FROM projects WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ce code projet existe déjà' });
    }
    console.error('Erreur modification projet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// DELETE /api/projects/:id — Supprimer un projet
// ═══════════════════════════════════════════════════════
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier s'il y a des mouvements liés
    const [linked] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM cash_movements WHERE project_id = ?', [id]
    );
    if (linked[0].cnt > 0) {
      // Détacher les mouvements au lieu de bloquer
      await pool.execute('UPDATE cash_movements SET project_id = NULL WHERE project_id = ?', [id]);
    }

    await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ message: 'Projet supprimé' });
  } catch (error) {
    console.error('Erreur suppression projet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/projects/:id/movements — Mouvements d'un projet
// ═══════════════════════════════════════════════════════
router.get('/:id/movements', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, type } = req.query;

    let query = 'SELECT * FROM cash_movements WHERE project_id = ?';
    const params = [id];

    if (startDate) { query += ' AND date >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND date <= ?'; params.push(endDate); }
    if (type) { query += ' AND type = ?'; params.push(type); }

    query += ' ORDER BY date DESC, created_at DESC';

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erreur mouvements projet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/projects/stats/summary — Stats globales projets
// ═══════════════════════════════════════════════════════
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT
        COUNT(*) AS total_projets,
        SUM(CASE WHEN status = 'actif' THEN 1 ELSE 0 END) AS projets_actifs,
        SUM(CASE WHEN status = 'termine' THEN 1 ELSE 0 END) AS projets_termines,
        SUM(budget_prevu) AS budget_total
      FROM projects
    `);

    const [depenses] = await pool.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN cm.type = 'depense' THEN cm.amount ELSE 0 END), 0) AS total_depenses,
        COALESCE(SUM(CASE WHEN cm.type = 'recette' THEN cm.amount ELSE 0 END), 0) AS total_recettes
      FROM cash_movements cm
      WHERE cm.project_id IS NOT NULL
    `);

    res.json({ ...stats[0], ...depenses[0] });
  } catch (error) {
    console.error('Erreur stats projets:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
