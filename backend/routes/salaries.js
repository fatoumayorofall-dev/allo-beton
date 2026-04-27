const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

// GET / - Liste des bulletins de salaire
router.get('/', async (req, res) => {
  try {
    const { employee_id, month, year, status } = req.query;
    let query = `
      SELECT sp.*, e.first_name, e.last_name, e.position, e.department, e.employee_number
      FROM salary_payments sp
      JOIN employees e ON sp.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (employee_id) { query += ` AND sp.employee_id = ?`; params.push(employee_id); }
    if (month) { query += ` AND sp.payment_month = ?`; params.push(parseInt(month)); }
    if (year) { query += ` AND sp.payment_year = ?`; params.push(parseInt(year)); }
    if (status) { query += ` AND sp.status = ?`; params.push(status); }
    query += ` ORDER BY sp.payment_year DESC, sp.payment_month DESC, e.last_name`;

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Erreur bulletins:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /summary/:year/:month - Résumé masse salariale d'un mois
router.get('/summary/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const [[summary]] = await pool.execute(`
      SELECT
        COUNT(*) as employee_count,
        SUM(gross_salary) as total_gross,
        SUM(net_salary) as total_net,
        SUM(bonuses) as total_bonuses,
        SUM(deductions) as total_deductions,
        SUM(advance_deducted) as total_advances_deducted,
        SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) as draft_count
      FROM salary_payments
      WHERE payment_year = ? AND payment_month = ?
    `, [parseInt(year), parseInt(month)]);

    res.json({ success: true, data: summary });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /generate/:year/:month - Générer les bulletins pour tous les employés actifs
router.post('/generate/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const [employees] = await pool.execute(
      `SELECT * FROM employees WHERE status = 'active'`
    );

    let created = 0;
    let skipped = 0;

    for (const emp of employees) {
      // Vérifier si un bulletin existe déjà
      const [[existing]] = await pool.execute(
        `SELECT id FROM salary_payments WHERE employee_id = ? AND payment_year = ? AND payment_month = ?`,
        [emp.id, parseInt(year), parseInt(month)]
      );
      if (existing) { skipped++; continue; }

      // Calculer les avances à déduire pour ce mois
      const [advances] = await pool.execute(`
        SELECT * FROM salary_advances
        WHERE employee_id = ? AND status = 'approved'
        AND (repaid_amount IS NULL OR repaid_amount < amount)
      `, [emp.id]);

      let advance_deducted = 0;
      for (const adv of advances) {
        if (adv.repayment_type === 'monthly') {
          advance_deducted += parseFloat(adv.monthly_deduction || 0);
        } else if (adv.repayment_type === 'one_shot') {
          advance_deducted += parseFloat(adv.amount) - parseFloat(adv.repaid_amount || 0);
        }
      }

      const gross = parseFloat(emp.base_salary) + parseFloat(emp.transport_allowance || 0) + parseFloat(emp.housing_allowance || 0);
      const net = gross - advance_deducted;

      await pool.execute(
        `INSERT INTO salary_payments (id, employee_id, payment_month, payment_year,
          base_salary, transport_allowance, housing_allowance, bonuses, deductions,
          advance_deducted, gross_salary, net_salary, status)
         VALUES (?,?,?,?,?,?,?,0,0,?,?,?,'draft')`,
        [uuidv4(), emp.id, parseInt(month), parseInt(year),
         emp.base_salary, emp.transport_allowance || 0, emp.housing_allowance || 0,
         advance_deducted, gross, net]
      );
      created++;
    }

    res.json({
      success: true,
      message: `${created} bulletins générés, ${skipped} déjà existants`,
      data: { created, skipped }
    });
  } catch (e) {
    console.error('Erreur génération bulletins:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST / - Créer un bulletin manuellement
router.post('/', async (req, res) => {
  try {
    const {
      employee_id, payment_month, payment_year,
      base_salary, transport_allowance, housing_allowance,
      bonuses, bonus_description, deductions, deduction_description,
      advance_deducted, payment_date, payment_method, notes
    } = req.body;

    if (!employee_id || !payment_month || !payment_year) {
      return res.status(400).json({ success: false, error: 'Employé, mois et année obligatoires' });
    }

    const gross = (parseFloat(base_salary) || 0)
      + (parseFloat(transport_allowance) || 0)
      + (parseFloat(housing_allowance) || 0)
      + (parseFloat(bonuses) || 0);
    const net = gross - (parseFloat(deductions) || 0) - (parseFloat(advance_deducted) || 0);

    const id = uuidv4();
    await pool.execute(
      `INSERT INTO salary_payments (id, employee_id, payment_month, payment_year,
        base_salary, transport_allowance, housing_allowance, bonuses, bonus_description,
        deductions, deduction_description, advance_deducted, gross_salary, net_salary,
        payment_date, payment_method, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, employee_id, parseInt(payment_month), parseInt(payment_year),
       base_salary || 0, transport_allowance || 0, housing_allowance || 0,
       bonuses || 0, bonus_description || null,
       deductions || 0, deduction_description || null,
       advance_deducted || 0, gross, net,
       payment_date || null, payment_method || 'virement', notes || null]
    );

    const [newPayslip] = await pool.execute(`SELECT * FROM salary_payments WHERE id = ?`, [id]);
    res.status(201).json({ success: true, data: newPayslip[0], message: 'Bulletin créé' });
  } catch (e) {
    console.error('Erreur création bulletin:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// PUT /:id - Modifier un bulletin
router.put('/:id', async (req, res) => {
  try {
    const {
      base_salary, transport_allowance, housing_allowance,
      bonuses, bonus_description, deductions, deduction_description,
      advance_deducted, payment_date, payment_method, status, notes
    } = req.body;

    const gross = (parseFloat(base_salary) || 0)
      + (parseFloat(transport_allowance) || 0)
      + (parseFloat(housing_allowance) || 0)
      + (parseFloat(bonuses) || 0);
    const net = gross - (parseFloat(deductions) || 0) - (parseFloat(advance_deducted) || 0);

    await pool.execute(
      `UPDATE salary_payments SET
        base_salary=?, transport_allowance=?, housing_allowance=?,
        bonuses=?, bonus_description=?, deductions=?, deduction_description=?,
        advance_deducted=?, gross_salary=?, net_salary=?,
        payment_date=?, payment_method=?, status=?, notes=?, updated_at=NOW()
       WHERE id=?`,
      [base_salary || 0, transport_allowance || 0, housing_allowance || 0,
       bonuses || 0, bonus_description || null,
       deductions || 0, deduction_description || null,
       advance_deducted || 0, gross, net,
       payment_date || null, payment_method || 'virement', status || 'draft', notes || null,
       req.params.id]
    );

    // Si on marque comme payé, mettre à jour les avances
    if (status === 'paid') {
      const [[payslip]] = await pool.execute(`SELECT * FROM salary_payments WHERE id = ?`, [req.params.id]);
      if (payslip && payslip.advance_deducted > 0) {
        await pool.execute(`
          UPDATE salary_advances
          SET repaid_amount = repaid_amount + ?,
              status = CASE WHEN repaid_amount + ? >= amount THEN 'repaid' ELSE status END,
              updated_at = NOW()
          WHERE employee_id = ? AND status = 'approved'
          LIMIT 1
        `, [payslip.advance_deducted, payslip.advance_deducted, payslip.employee_id]);
      }
    }

    const [updated] = await pool.execute(`SELECT * FROM salary_payments WHERE id = ?`, [req.params.id]);
    res.json({ success: true, data: updated[0], message: 'Bulletin mis à jour' });
  } catch (e) {
    console.error('Erreur modification bulletin:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute(`DELETE FROM salary_payments WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Bulletin supprimé' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
