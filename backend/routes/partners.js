const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// ============================================================
// Auto-migration : créer les tables si elles n'existent pas
// ============================================================
(async () => {
  try {
    // Table des partenaires investisseurs
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS partners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address VARCHAR(500),
        id_number VARCHAR(100),
        notes TEXT,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Table des contrats d'investissement
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS partner_contracts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partner_id INT NOT NULL,
        label VARCHAR(255) NOT NULL,
        description TEXT,
        invested_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        monthly_return DECIMAL(15,2) NOT NULL DEFAULT 0,
        duration_months INT NOT NULL DEFAULT 6,
        start_date DATE NOT NULL,
        end_date DATE,
        total_expected_return DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
        remaining_to_pay DECIMAL(15,2) NOT NULL DEFAULT 0,
        status ENUM('actif','termine','suspendu','annule') DEFAULT 'actif',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Table des paiements versés aux partenaires
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS partner_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        contract_id INT NOT NULL,
        partner_id INT NOT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'virement',
        reference VARCHAR(100),
        month_label VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES partner_contracts(id) ON DELETE CASCADE,
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ Tables partenaires créées/vérifiées');
  } catch (err) {
    console.error('❌ Erreur création tables partenaires:', err.message);
  }
})();

// ============================================================
// ROUTES PARTENAIRES
// ============================================================

// GET /api/partners — Liste des partenaires avec stats
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT p.*,
        COUNT(DISTINCT c.id) as contracts_count,
        COALESCE(SUM(CASE WHEN c.status = 'actif' THEN c.invested_amount ELSE 0 END), 0) as total_invested,
        COALESCE(SUM(CASE WHEN c.status = 'actif' THEN c.remaining_to_pay ELSE 0 END), 0) as total_remaining,
        COALESCE(SUM(CASE WHEN c.status = 'actif' THEN 1 ELSE 0 END), 0) as active_contracts
      FROM partners p
      LEFT JOIN partner_contracts c ON p.id = c.partner_id
      GROUP BY p.id
      ORDER BY p.name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/partners/summary — Vue d'ensemble
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const [[summ]] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM partners WHERE is_active = 1) as partners_count,
        (SELECT COUNT(*) FROM partner_contracts WHERE status = 'actif') as active_contracts,
        COALESCE((SELECT SUM(invested_amount) FROM partner_contracts WHERE status = 'actif'), 0) as total_invested,
        COALESCE((SELECT SUM(total_expected_return) FROM partner_contracts WHERE status = 'actif'), 0) as total_expected_return,
        COALESCE((SELECT SUM(total_paid) FROM partner_contracts WHERE status = 'actif'), 0) as total_paid,
        COALESCE((SELECT SUM(remaining_to_pay) FROM partner_contracts WHERE status = 'actif'), 0) as total_remaining,
        COALESCE((SELECT SUM(monthly_return) FROM partner_contracts WHERE status = 'actif'), 0) as monthly_obligations,
        COALESCE((SELECT SUM(amount) FROM partner_payments WHERE MONTH(payment_date) = MONTH(CURRENT_DATE()) AND YEAR(payment_date) = YEAR(CURRENT_DATE())), 0) as paid_this_month
    `);
    res.json({ success: true, data: summ });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/partners/:id — Détail avec contrats et paiements
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [[partner]] = await pool.execute('SELECT * FROM partners WHERE id = ?', [req.params.id]);
    if (!partner) return res.status(404).json({ success: false, message: 'Partenaire non trouvé' });

    const [contracts] = await pool.execute(`
      SELECT c.*,
        COALESCE((SELECT SUM(pp.amount) FROM partner_payments pp WHERE pp.contract_id = c.id), 0) as actual_paid
      FROM partner_contracts c
      WHERE c.partner_id = ?
      ORDER BY c.start_date DESC
    `, [req.params.id]);

    const [payments] = await pool.execute(`
      SELECT pp.*, pc.label as contract_label
      FROM partner_payments pp
      JOIN partner_contracts pc ON pp.contract_id = pc.id
      WHERE pp.partner_id = ?
      ORDER BY pp.payment_date DESC
    `, [req.params.id]);

    res.json({ success: true, data: { ...partner, contracts, payments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/partners — Créer un partenaire
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, company, phone, email, address, id_number, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Le nom est requis' });

    const [result] = await pool.execute(
      'INSERT INTO partners (name, company, phone, email, address, id_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, company || null, phone || null, email || null, address || null, id_number || null, notes || null]
    );
    res.json({ success: true, data: { id: result.insertId }, message: 'Partenaire ajouté' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/partners/:id — Modifier un partenaire
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, company, phone, email, address, id_number, notes, is_active } = req.body;
    await pool.execute(
      'UPDATE partners SET name=?, company=?, phone=?, email=?, address=?, id_number=?, notes=?, is_active=? WHERE id=?',
      [name, company || null, phone || null, email || null, address || null, id_number || null, notes || null, is_active !== undefined ? is_active : 1, req.params.id]
    );
    res.json({ success: true, message: 'Partenaire modifié' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/partners/:id — Supprimer un partenaire
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM partners WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Partenaire supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// ROUTES CONTRATS
// ============================================================

// GET /api/partners/contracts/all — Tous les contrats
router.get('/contracts/all', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT c.*, p.name as partner_name, p.company as partner_company,
        COALESCE((SELECT SUM(pp.amount) FROM partner_payments pp WHERE pp.contract_id = c.id), 0) as actual_paid,
        COALESCE((SELECT COUNT(*) FROM partner_payments pp WHERE pp.contract_id = c.id), 0) as payments_count
      FROM partner_contracts c
      JOIN partners p ON c.partner_id = p.id
      ORDER BY c.start_date DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/partners/contracts — Créer un contrat
router.post('/contracts', authenticateToken, async (req, res) => {
  try {
    const { partner_id, label, description, invested_amount, monthly_return, duration_months, start_date, notes } = req.body;
    if (!partner_id || !label || !invested_amount || !monthly_return || !duration_months || !start_date) {
      return res.status(400).json({ success: false, message: 'Partenaire, libellé, montant investi, retour mensuel, durée et date de début requis' });
    }

    const totalReturn = parseFloat(monthly_return) * parseInt(duration_months);
    const startDt = new Date(start_date);
    const endDt = new Date(startDt);
    endDt.setMonth(endDt.getMonth() + parseInt(duration_months));
    const endDate = endDt.toISOString().split('T')[0];

    const [result] = await pool.execute(
      `INSERT INTO partner_contracts (partner_id, label, description, invested_amount, monthly_return, duration_months, start_date, end_date, total_expected_return, total_paid, remaining_to_pay, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [partner_id, label, description || null, invested_amount, monthly_return, duration_months, start_date, endDate, totalReturn, totalReturn, notes || null]
    );
    res.json({ success: true, data: { id: result.insertId }, message: 'Contrat créé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/partners/contracts/:id — Modifier un contrat
router.put('/contracts/:id', authenticateToken, async (req, res) => {
  try {
    const { label, description, invested_amount, monthly_return, duration_months, start_date, status, notes } = req.body;

    const totalReturn = parseFloat(monthly_return) * parseInt(duration_months);
    const startDt = new Date(start_date);
    const endDt = new Date(startDt);
    endDt.setMonth(endDt.getMonth() + parseInt(duration_months));
    const endDate = endDt.toISOString().split('T')[0];

    // Calculer total_paid
    const [[{ paid }]] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as paid FROM partner_payments WHERE contract_id = ?',
      [req.params.id]
    );

    const remaining = totalReturn - parseFloat(paid);

    await pool.execute(
      `UPDATE partner_contracts SET label=?, description=?, invested_amount=?, monthly_return=?, duration_months=?, start_date=?, end_date=?, total_expected_return=?, total_paid=?, remaining_to_pay=?, status=?, notes=? WHERE id=?`,
      [label, description || null, invested_amount, monthly_return, duration_months, start_date, endDate, totalReturn, paid, remaining > 0 ? remaining : 0, status || 'actif', notes || null, req.params.id]
    );
    res.json({ success: true, message: 'Contrat modifié' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/partners/contracts/:id — Supprimer un contrat
router.delete('/contracts/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM partner_contracts WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Contrat supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// ROUTES PAIEMENTS PARTENAIRES
// ============================================================

// GET /api/partners/contracts/:contractId/payments — Paiements d'un contrat
router.get('/contracts/:contractId/payments', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM partner_payments WHERE contract_id = ? ORDER BY payment_date DESC',
      [req.params.contractId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/partners/payments — Enregistrer un paiement
router.post('/payments', authenticateToken, async (req, res) => {
  try {
    const { contract_id, payment_date, amount, payment_method, reference, month_label, notes } = req.body;
    if (!contract_id || !payment_date || !amount) {
      return res.status(400).json({ success: false, message: 'Contrat, date et montant requis' });
    }

    // Récupérer le partenaire
    const [[contract]] = await pool.execute('SELECT partner_id FROM partner_contracts WHERE id = ?', [contract_id]);
    if (!contract) return res.status(404).json({ success: false, message: 'Contrat non trouvé' });

    await pool.execute(
      'INSERT INTO partner_payments (contract_id, partner_id, payment_date, amount, payment_method, reference, month_label, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [contract_id, contract.partner_id, payment_date, amount, payment_method || 'virement', reference || null, month_label || null, notes || null]
    );

    // Recalculer le total_paid et remaining_to_pay du contrat
    const [[{ total }]] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as total FROM partner_payments WHERE contract_id = ?',
      [contract_id]
    );
    const [[contractData]] = await pool.execute(
      'SELECT total_expected_return FROM partner_contracts WHERE id = ?',
      [contract_id]
    );
    const remaining = parseFloat(contractData.total_expected_return) - parseFloat(total);

    await pool.execute(
      'UPDATE partner_contracts SET total_paid = ?, remaining_to_pay = ?, status = ? WHERE id = ?',
      [total, remaining > 0 ? remaining : 0, remaining <= 0 ? 'termine' : 'actif', contract_id]
    );

    res.json({ success: true, message: 'Paiement enregistré' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/partners/payments/:id — Supprimer un paiement
router.delete('/payments/:id', authenticateToken, async (req, res) => {
  try {
    // Récupérer info avant suppression
    const [[payment]] = await pool.execute('SELECT contract_id FROM partner_payments WHERE id = ?', [req.params.id]);
    if (!payment) return res.status(404).json({ success: false, message: 'Paiement non trouvé' });

    await pool.execute('DELETE FROM partner_payments WHERE id = ?', [req.params.id]);

    // Recalculer les totaux du contrat
    const [[{ total }]] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as total FROM partner_payments WHERE contract_id = ?',
      [payment.contract_id]
    );
    const [[contractData]] = await pool.execute(
      'SELECT total_expected_return FROM partner_contracts WHERE id = ?',
      [payment.contract_id]
    );
    const remaining = parseFloat(contractData.total_expected_return) - parseFloat(total);

    await pool.execute(
      'UPDATE partner_contracts SET total_paid = ?, remaining_to_pay = ?, status = ? WHERE id = ?',
      [total, remaining > 0 ? remaining : 0, remaining <= 0 ? 'termine' : 'actif', payment.contract_id]
    );

    res.json({ success: true, message: 'Paiement supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/partners/payments/upcoming — Paiements à venir ce mois
router.get('/payments/upcoming', authenticateToken, async (req, res) => {
  try {
    // Contrats actifs dont le paiement mensuel n'a pas encore été fait ce mois
    const [rows] = await pool.execute(`
      SELECT c.id as contract_id, c.label, c.monthly_return, c.invested_amount,
             c.total_paid, c.remaining_to_pay, c.duration_months,
             p.id as partner_id, p.name as partner_name, p.company as partner_company,
             c.start_date, c.end_date,
             COALESCE((SELECT SUM(pp.amount) FROM partner_payments pp 
               WHERE pp.contract_id = c.id 
               AND MONTH(pp.payment_date) = MONTH(CURRENT_DATE()) 
               AND YEAR(pp.payment_date) = YEAR(CURRENT_DATE())), 0) as paid_this_month
      FROM partner_contracts c
      JOIN partners p ON c.partner_id = p.id
      WHERE c.status = 'actif'
      ORDER BY p.name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
