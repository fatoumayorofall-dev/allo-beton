const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

// GET / - Liste des employés
router.get('/', async (req, res) => {
  try {
    const { status, department } = req.query;
    let query = `SELECT * FROM employees WHERE 1=1`;
    const params = [];
    if (status) { query += ` AND status = ?`; params.push(status); }
    if (department) { query += ` AND department = ?`; params.push(department); }
    query += ` ORDER BY last_name, first_name`;
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Erreur employés:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /departments - Liste des départements
router.get('/departments', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != '' ORDER BY department`
    );
    res.json({ success: true, data: rows.map(r => r.department) });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /:id - Détail d'un employé avec son historique
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM employees WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Employé introuvable' });

    const [salaries] = await pool.execute(
      `SELECT * FROM salary_payments WHERE employee_id = ? ORDER BY payment_year DESC, payment_month DESC LIMIT 12`,
      [req.params.id]
    );
    const [advances] = await pool.execute(
      `SELECT * FROM salary_advances WHERE employee_id = ? ORDER BY request_date DESC`,
      [req.params.id]
    );

    const pending_advance = advances
      .filter(a => a.status === 'approved')
      .reduce((sum, a) => sum + (parseFloat(a.amount) - parseFloat(a.repaid_amount || 0)), 0);

    res.json({
      success: true,
      data: { ...rows[0], salary_history: salaries, advances, pending_advance }
    });
  } catch (e) {
    console.error('Erreur employé:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST / - Créer un employé
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, address,
      position, department, hire_date, contract_type,
      base_salary, transport_allowance, housing_allowance,
      rib, bank_name, notes
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ success: false, error: 'Prénom et nom obligatoires' });
    }

    const id = uuidv4();
    // Générer numéro employé
    const [[countRow]] = await pool.execute(`SELECT COUNT(*) as cnt FROM employees`);
    const emp_number = `EMP${String(countRow.cnt + 1).padStart(4, '0')}`;

    await pool.execute(
      `INSERT INTO employees (id, employee_number, first_name, last_name, email, phone, address,
        position, department, hire_date, contract_type, base_salary,
        transport_allowance, housing_allowance, rib, bank_name, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, emp_number, first_name, last_name, email || null, phone || null, address || null,
       position || null, department || null, hire_date || null, contract_type || 'CDI',
       base_salary || 0, transport_allowance || 0, housing_allowance || 0,
       rib || null, bank_name || null, notes || null]
    );

    const [newEmp] = await pool.execute(`SELECT * FROM employees WHERE id = ?`, [id]);
    res.status(201).json({ success: true, data: newEmp[0], message: 'Employé créé avec succès' });
  } catch (e) {
    console.error('Erreur création employé:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// PUT /:id - Modifier un employé
router.put('/:id', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, address,
      position, department, hire_date, contract_type,
      base_salary, transport_allowance, housing_allowance,
      rib, bank_name, status, notes
    } = req.body;

    await pool.execute(
      `UPDATE employees SET
        first_name=?, last_name=?, email=?, phone=?, address=?,
        position=?, department=?, hire_date=?, contract_type=?,
        base_salary=?, transport_allowance=?, housing_allowance=?,
        rib=?, bank_name=?, status=?, notes=?, updated_at=NOW()
       WHERE id=?`,
      [first_name, last_name, email || null, phone || null, address || null,
       position || null, department || null, hire_date || null, contract_type || 'CDI',
       base_salary || 0, transport_allowance || 0, housing_allowance || 0,
       rib || null, bank_name || null, status || 'active', notes || null,
       req.params.id]
    );

    const [updated] = await pool.execute(`SELECT * FROM employees WHERE id = ?`, [req.params.id]);
    res.json({ success: true, data: updated[0], message: 'Employé mis à jour' });
  } catch (e) {
    console.error('Erreur modification employé:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /stats/payroll-history - Évolution masse salariale 6 derniers mois
router.get('/stats/payroll-history', async (req, res) => {
  try {
    const months = parseInt(req.query.months || '6', 10);
    const [rows] = await pool.execute(
      `SELECT payment_year AS year, payment_month AS month,
              COUNT(*) AS count,
              SUM(gross_salary) AS gross,
              SUM(net_salary) AS net,
              SUM(CASE WHEN status='paid' THEN net_salary ELSE 0 END) AS paid_net
         FROM salary_payments
        WHERE STR_TO_DATE(CONCAT(payment_year,'-',payment_month,'-01'),'%Y-%m-%d')
              >= DATE_SUB(LAST_DAY(NOW()), INTERVAL ? MONTH)
        GROUP BY payment_year, payment_month
        ORDER BY payment_year, payment_month`,
      [months]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Erreur payroll-history:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /seed-demo - Insérer un jeu de données de démonstration (admin uniquement)
router.post('/seed-demo', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Réservé aux administrateurs' });
    }
    const reset = req.body?.reset === true;
    const path = require('path');
    const { spawn } = require('child_process');
    const args = [path.join(__dirname, '..', 'scripts', 'seed_hr.js')];
    if (reset) args.push('--reset');
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { err += d.toString(); });
    child.on('close', code => {
      if (code === 0) {
        res.json({ success: true, message: 'Données de démonstration créées', log: out });
      } else {
        res.status(500).json({ success: false, error: 'Échec du seed', log: err || out });
      }
    });
  } catch (e) {
    console.error('Erreur seed-demo:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// DELETE /:id - Supprimer un employé
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute(`DELETE FROM employees WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Employé supprimé' });
  } catch (e) {
    console.error('Erreur suppression employé:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
