const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

// GET / - Liste des avances
router.get('/', async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    let query = `
      SELECT sa.*, e.first_name, e.last_name, e.employee_number, e.position
      FROM salary_advances sa
      JOIN employees e ON sa.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (employee_id) { query += ` AND sa.employee_id = ?`; params.push(employee_id); }
    if (status) { query += ` AND sa.status = ?`; params.push(status); }
    query += ` ORDER BY sa.request_date DESC`;

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Erreur avances:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /stats - Statistiques des avances
router.get('/stats', async (req, res) => {
  try {
    const [[stats]] = await pool.execute(`
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status='repaid' THEN 1 ELSE 0 END) as repaid_count,
        SUM(CASE WHEN status='approved' THEN amount - IFNULL(repaid_amount,0) ELSE 0 END) as outstanding_amount,
        SUM(amount) as total_amount
      FROM salary_advances
    `);
    res.json({ success: true, data: stats });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT sa.*, e.first_name, e.last_name, e.employee_number, e.base_salary
      FROM salary_advances sa
      JOIN employees e ON sa.employee_id = e.id
      WHERE sa.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Avance introuvable' });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST / - Créer une demande d'avance
router.post('/', async (req, res) => {
  try {
    const {
      employee_id, amount, reason, request_date,
      repayment_type, repayment_months, notes
    } = req.body;

    if (!employee_id || !amount || !request_date) {
      return res.status(400).json({ success: false, error: 'Employé, montant et date obligatoires' });
    }

    const months = parseInt(repayment_months) || 1;
    const monthly_deduction = repayment_type === 'monthly'
      ? parseFloat(amount) / months
      : parseFloat(amount);

    const id = uuidv4();
    await pool.execute(
      `INSERT INTO salary_advances (id, employee_id, amount, reason, request_date,
        repayment_type, repayment_months, monthly_deduction, repaid_amount, notes)
       VALUES (?,?,?,?,?,?,?,?,0,?)`,
      [id, employee_id, amount, reason || null, request_date,
       repayment_type || 'one_shot', months, monthly_deduction, notes || null]
    );

    const [newAdv] = await pool.execute(`
      SELECT sa.*, e.first_name, e.last_name
      FROM salary_advances sa JOIN employees e ON sa.employee_id = e.id
      WHERE sa.id = ?
    `, [id]);
    res.status(201).json({ success: true, data: newAdv[0], message: 'Demande d\'avance créée' });
  } catch (e) {
    console.error('Erreur création avance:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// PUT /:id/status - Approuver/Rejeter une avance
router.put('/:id/status', async (req, res) => {
  try {
    const { status, payment_date, notes } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected', 'repaid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Statut invalide' });
    }

    await pool.execute(
      `UPDATE salary_advances SET status=?, payment_date=?, notes=?, updated_at=NOW() WHERE id=?`,
      [status, payment_date || null, notes || null, req.params.id]
    );

    const [updated] = await pool.execute(`
      SELECT sa.*, e.first_name, e.last_name
      FROM salary_advances sa JOIN employees e ON sa.employee_id = e.id
      WHERE sa.id = ?
    `, [req.params.id]);
    res.json({ success: true, data: updated[0], message: `Avance ${status === 'approved' ? 'approuvée' : status === 'rejected' ? 'rejetée' : 'mise à jour'}` });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// PUT /:id - Modifier une avance
router.put('/:id', async (req, res) => {
  try {
    const {
      amount, reason, request_date, payment_date,
      repayment_type, repayment_months, monthly_deduction,
      repaid_amount, status, notes
    } = req.body;

    await pool.execute(
      `UPDATE salary_advances SET
        amount=?, reason=?, request_date=?, payment_date=?,
        repayment_type=?, repayment_months=?, monthly_deduction=?,
        repaid_amount=?, status=?, notes=?, updated_at=NOW()
       WHERE id=?`,
      [amount, reason || null, request_date, payment_date || null,
       repayment_type || 'one_shot', repayment_months || 1, monthly_deduction || amount,
       repaid_amount || 0, status || 'pending', notes || null,
       req.params.id]
    );

    const [updated] = await pool.execute(`
      SELECT sa.*, e.first_name, e.last_name
      FROM salary_advances sa JOIN employees e ON sa.employee_id = e.id
      WHERE sa.id = ?
    `, [req.params.id]);
    res.json({ success: true, data: updated[0], message: 'Avance mise à jour' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute(`DELETE FROM salary_advances WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Avance supprimée' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
