const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// ============================================================
// Auto-migration : créer les tables si elles n'existent pas
// ============================================================
(async () => {
  try {
    // Table des banques
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS banks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50),
        address VARCHAR(500),
        phone VARCHAR(50),
        email VARCHAR(255),
        contact_person VARCHAR(255),
        account_number VARCHAR(100),
        iban VARCHAR(100),
        swift_bic VARCHAR(50),
        notes TEXT,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Table des comptes bancaires
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bank_id INT NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        account_type ENUM('courant', 'epargne', 'professionnel') DEFAULT 'courant',
        currency VARCHAR(10) DEFAULT 'XOF',
        current_balance DECIMAL(15,2) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Table des prêts / dettes
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS bank_loans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bank_id INT NOT NULL,
        loan_type ENUM('pret', 'dette', 'credit', 'decouvert') NOT NULL,
        label VARCHAR(255) NOT NULL,
        description TEXT,
        principal_amount DECIMAL(15,2) NOT NULL,
        interest_rate DECIMAL(5,2) DEFAULT 0,
        total_amount DECIMAL(15,2) NOT NULL,
        amount_paid DECIMAL(15,2) DEFAULT 0,
        remaining_amount DECIMAL(15,2) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        status ENUM('en_cours', 'termine', 'en_retard', 'annule') DEFAULT 'en_cours',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Table des échéances de paiement
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS bank_loan_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        loan_id INT NOT NULL,
        due_date DATE NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        principal_part DECIMAL(15,2) DEFAULT 0,
        interest_part DECIMAL(15,2) DEFAULT 0,
        status ENUM('a_payer', 'paye', 'en_retard', 'partiel') DEFAULT 'a_payer',
        paid_date DATE,
        paid_amount DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (loan_id) REFERENCES bank_loans(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ Tables banques créées/vérifiées avec succès');
  } catch (e) {
    console.error('Migration tables banques:', e.message);
  }
})();

// ============================================================
// BANQUES — CRUD
// ============================================================

// GET - Liste des banques
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [banks] = await pool.execute(`
      SELECT b.*,
        (SELECT COUNT(*) FROM bank_accounts ba WHERE ba.bank_id = b.id) as accounts_count,
        (SELECT COALESCE(SUM(ba.current_balance), 0) FROM bank_accounts ba WHERE ba.bank_id = b.id AND ba.is_active = 1) as total_balance,
        (SELECT COUNT(*) FROM bank_loans bl WHERE bl.bank_id = b.id AND bl.status = 'en_cours') as active_loans_count,
        (SELECT COALESCE(SUM(bl.remaining_amount), 0) FROM bank_loans bl WHERE bl.bank_id = b.id AND bl.status = 'en_cours') as total_remaining_debt
      FROM banks b
      ORDER BY b.name ASC
    `);

    res.json({ success: true, data: banks });
  } catch (error) {
    console.error('Erreur GET /banks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Détail d'une banque
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [banks] = await pool.execute('SELECT * FROM banks WHERE id = ?', [req.params.id]);
    if (banks.length === 0) {
      return res.status(404).json({ success: false, error: 'Banque non trouvée' });
    }

    const [accounts] = await pool.execute('SELECT * FROM bank_accounts WHERE bank_id = ? ORDER BY account_name', [req.params.id]);
    const [loans] = await pool.execute('SELECT * FROM bank_loans WHERE bank_id = ? ORDER BY start_date DESC', [req.params.id]);

    res.json({ success: true, data: { ...banks[0], accounts, loans } });
  } catch (error) {
    console.error('Erreur GET /banks/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Créer une banque
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, code, address, phone, email, contact_person, account_number, iban, swift_bic, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Le nom de la banque est requis' });
    }

    const [result] = await pool.execute(
      'INSERT INTO banks (name, code, address, phone, email, contact_person, account_number, iban, swift_bic, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, code || null, address || null, phone || null, email || null, contact_person || null, account_number || null, iban || null, swift_bic || null, notes || null]
    );

    const [newBank] = await pool.execute('SELECT * FROM banks WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newBank[0] });
  } catch (error) {
    console.error('Erreur POST /banks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Modifier une banque
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, code, address, phone, email, contact_person, account_number, iban, swift_bic, notes, is_active } = req.body;

    await pool.execute(
      'UPDATE banks SET name = ?, code = ?, address = ?, phone = ?, email = ?, contact_person = ?, account_number = ?, iban = ?, swift_bic = ?, notes = ?, is_active = ? WHERE id = ?',
      [name, code || null, address || null, phone || null, email || null, contact_person || null, account_number || null, iban || null, swift_bic || null, notes || null, is_active ?? 1, req.params.id]
    );

    const [updated] = await pool.execute('SELECT * FROM banks WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Erreur PUT /banks/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Supprimer une banque
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM banks WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Banque supprimée' });
  } catch (error) {
    console.error('Erreur DELETE /banks/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// COMPTES BANCAIRES
// ============================================================

// GET - Comptes d'une banque
router.get('/:bankId/accounts', authenticateToken, async (req, res) => {
  try {
    const [accounts] = await pool.execute(
      'SELECT * FROM bank_accounts WHERE bank_id = ? ORDER BY account_name',
      [req.params.bankId]
    );
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Créer un compte bancaire
router.post('/:bankId/accounts', authenticateToken, async (req, res) => {
  try {
    const { account_name, account_number, account_type, currency, current_balance } = req.body;
    if (!account_name || !account_number) {
      return res.status(400).json({ success: false, error: 'Nom et numéro de compte requis' });
    }

    const [result] = await pool.execute(
      'INSERT INTO bank_accounts (bank_id, account_name, account_number, account_type, currency, current_balance) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.bankId, account_name, account_number, account_type || 'courant', currency || 'XOF', current_balance || 0]
    );

    const [newAccount] = await pool.execute('SELECT * FROM bank_accounts WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newAccount[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Modifier un compte bancaire
router.put('/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const { account_name, account_number, account_type, currency, current_balance, is_active } = req.body;

    await pool.execute(
      'UPDATE bank_accounts SET account_name = ?, account_number = ?, account_type = ?, currency = ?, current_balance = ?, is_active = ? WHERE id = ?',
      [account_name, account_number, account_type, currency, current_balance, is_active ?? 1, req.params.id]
    );

    const [updated] = await pool.execute('SELECT * FROM bank_accounts WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Supprimer un compte bancaire
router.delete('/accounts/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM bank_accounts WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Compte supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// PRÊTS / DETTES
// ============================================================

// GET - Tous les prêts/dettes (avec filtres)
router.get('/loans/all', authenticateToken, async (req, res) => {
  try {
    const { status, loan_type, bank_id } = req.query;
    let query = `
      SELECT bl.*, b.name as bank_name
      FROM bank_loans bl
      JOIN banks b ON b.id = bl.bank_id
      WHERE 1=1
    `;
    const params = [];

    if (status) { query += ' AND bl.status = ?'; params.push(status); }
    if (loan_type) { query += ' AND bl.loan_type = ?'; params.push(loan_type); }
    if (bank_id) { query += ' AND bl.bank_id = ?'; params.push(bank_id); }

    query += ' ORDER BY bl.start_date DESC';

    const [loans] = await pool.execute(query, params);
    res.json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Créer un prêt/dette
router.post('/loans', authenticateToken, async (req, res) => {
  try {
    const { bank_id, loan_type, label, description, principal_amount, interest_rate, total_amount, start_date, end_date, notes } = req.body;

    if (!bank_id || !loan_type || !label || !principal_amount || !start_date) {
      return res.status(400).json({ success: false, error: 'Champs requis: bank_id, loan_type, label, principal_amount, start_date' });
    }

    const finalTotal = total_amount || principal_amount;
    const [result] = await pool.execute(
      'INSERT INTO bank_loans (bank_id, loan_type, label, description, principal_amount, interest_rate, total_amount, remaining_amount, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [bank_id, loan_type, label, description || null, principal_amount, interest_rate || 0, finalTotal, finalTotal, start_date, end_date || null, notes || null]
    );

    const [newLoan] = await pool.execute('SELECT bl.*, b.name as bank_name FROM bank_loans bl JOIN banks b ON b.id = bl.bank_id WHERE bl.id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newLoan[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Modifier un prêt/dette
router.put('/loans/:id', authenticateToken, async (req, res) => {
  try {
    const { label, description, principal_amount, interest_rate, total_amount, start_date, end_date, status, notes } = req.body;

    const finalTotal = total_amount || principal_amount;

    // Recalculer le reste
    const [current] = await pool.execute('SELECT amount_paid FROM bank_loans WHERE id = ?', [req.params.id]);
    const amountPaid = current.length > 0 ? parseFloat(current[0].amount_paid) : 0;
    const remaining = finalTotal - amountPaid;

    await pool.execute(
      'UPDATE bank_loans SET label = ?, description = ?, principal_amount = ?, interest_rate = ?, total_amount = ?, remaining_amount = ?, start_date = ?, end_date = ?, status = ?, notes = ? WHERE id = ?',
      [label, description || null, principal_amount, interest_rate || 0, finalTotal, remaining, start_date, end_date || null, status || 'en_cours', notes || null, req.params.id]
    );

    const [updated] = await pool.execute('SELECT bl.*, b.name as bank_name FROM bank_loans bl JOIN banks b ON b.id = bl.bank_id WHERE bl.id = ?', [req.params.id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Supprimer un prêt/dette
router.delete('/loans/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM bank_loans WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Prêt/dette supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ÉCHÉANCES DE PAIEMENT
// ============================================================

// GET - Échéances d'un prêt
router.get('/loans/:loanId/schedules', authenticateToken, async (req, res) => {
  try {
    const [schedules] = await pool.execute(
      'SELECT * FROM bank_loan_schedules WHERE loan_id = ? ORDER BY due_date ASC',
      [req.params.loanId]
    );
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Toutes les échéances à venir
router.get('/schedules/upcoming', authenticateToken, async (req, res) => {
  try {
    const { days } = req.query;
    const daysAhead = parseInt(days) || 30;

    const [schedules] = await pool.execute(`
      SELECT s.*, bl.label as loan_label, bl.loan_type, b.name as bank_name
      FROM bank_loan_schedules s
      JOIN bank_loans bl ON bl.id = s.loan_id
      JOIN banks b ON b.id = bl.bank_id
      WHERE s.status IN ('a_payer', 'en_retard')
        AND s.due_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY s.due_date ASC
    `, [daysAhead]);

    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Créer une échéance
router.post('/loans/:loanId/schedules', authenticateToken, async (req, res) => {
  try {
    const { due_date, amount, principal_part, interest_part, notes } = req.body;

    if (!due_date || !amount) {
      return res.status(400).json({ success: false, error: 'Date et montant requis' });
    }

    const [result] = await pool.execute(
      'INSERT INTO bank_loan_schedules (loan_id, due_date, amount, principal_part, interest_part, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.loanId, due_date, amount, principal_part || 0, interest_part || 0, notes || null]
    );

    const [newSchedule] = await pool.execute('SELECT * FROM bank_loan_schedules WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newSchedule[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Générer automatiquement les échéances
router.post('/loans/:loanId/schedules/generate', authenticateToken, async (req, res) => {
  try {
    const { num_months, monthly_amount } = req.body;
    const loanId = req.params.loanId;

    const [loans] = await pool.execute('SELECT * FROM bank_loans WHERE id = ?', [loanId]);
    if (loans.length === 0) {
      return res.status(404).json({ success: false, error: 'Prêt non trouvé' });
    }

    const loan = loans[0];
    const months = num_months || 12;
    const amount = monthly_amount || (parseFloat(loan.remaining_amount) / months);
    const interestPerMonth = (parseFloat(loan.interest_rate) / 100 / 12) * parseFloat(loan.principal_amount);
    const principalPerMonth = amount - interestPerMonth;

    const startDate = new Date(loan.start_date);
    const schedules = [];

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      await pool.execute(
        'INSERT INTO bank_loan_schedules (loan_id, due_date, amount, principal_part, interest_part) VALUES (?, ?, ?, ?, ?)',
        [loanId, dueDateStr, amount.toFixed(2), principalPerMonth > 0 ? principalPerMonth.toFixed(2) : 0, interestPerMonth > 0 ? interestPerMonth.toFixed(2) : 0]
      );
      schedules.push({ due_date: dueDateStr, amount: parseFloat(amount.toFixed(2)) });
    }

    res.json({ success: true, data: schedules, message: `${months} échéances générées` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Marquer une échéance comme payée
router.put('/schedules/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { paid_amount, paid_date } = req.body;
    const scheduleId = req.params.id;

    const [schedules] = await pool.execute('SELECT * FROM bank_loan_schedules WHERE id = ?', [scheduleId]);
    if (schedules.length === 0) {
      return res.status(404).json({ success: false, error: 'Échéance non trouvée' });
    }

    const schedule = schedules[0];
    const finalPaid = paid_amount || parseFloat(schedule.amount);
    const finalDate = paid_date || new Date().toISOString().split('T')[0];
    const status = finalPaid >= parseFloat(schedule.amount) ? 'paye' : 'partiel';

    await pool.execute(
      'UPDATE bank_loan_schedules SET status = ?, paid_amount = ?, paid_date = ? WHERE id = ?',
      [status, finalPaid, finalDate, scheduleId]
    );

    // Mettre à jour le montant payé sur le prêt
    await pool.execute(
      'UPDATE bank_loans SET amount_paid = amount_paid + ?, remaining_amount = remaining_amount - ? WHERE id = ?',
      [finalPaid, finalPaid, schedule.loan_id]
    );

    // Vérifier si tout est payé
    const [loan] = await pool.execute('SELECT * FROM bank_loans WHERE id = ?', [schedule.loan_id]);
    if (loan.length > 0 && parseFloat(loan[0].remaining_amount) <= 0) {
      await pool.execute('UPDATE bank_loans SET status = ?, remaining_amount = 0 WHERE id = ?', ['termine', schedule.loan_id]);
    }

    // Marquer les échéances en retard
    await pool.execute(
      "UPDATE bank_loan_schedules SET status = 'en_retard' WHERE loan_id = ? AND status = 'a_payer' AND due_date < CURDATE()",
      [schedule.loan_id]
    );

    const [updated] = await pool.execute('SELECT * FROM bank_loan_schedules WHERE id = ?', [scheduleId]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Supprimer une échéance
router.delete('/schedules/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM bank_loan_schedules WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Échéance supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// TABLEAU DE BORD / RÉSUMÉ
// ============================================================

router.get('/summary/overview', authenticateToken, async (req, res) => {
  try {
    // Total des soldes bancaires
    const [balanceResult] = await pool.execute(
      'SELECT COALESCE(SUM(current_balance), 0) as total_balance FROM bank_accounts WHERE is_active = 1'
    );

    // Total des dettes en cours
    const [debtResult] = await pool.execute(
      "SELECT COALESCE(SUM(remaining_amount), 0) as total_debt, COUNT(*) as active_loans FROM bank_loans WHERE status = 'en_cours'"
    );

    // Échéances du mois
    const [monthSchedules] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) as month_due, COUNT(*) as schedules_count
      FROM bank_loan_schedules
      WHERE status IN ('a_payer', 'en_retard')
        AND MONTH(due_date) = MONTH(CURDATE())
        AND YEAR(due_date) = YEAR(CURDATE())
    `);

    // Échéances en retard
    const [overdueResult] = await pool.execute(`
      SELECT COALESCE(SUM(amount), 0) as overdue_amount, COUNT(*) as overdue_count
      FROM bank_loan_schedules
      WHERE status = 'en_retard'
    `);

    // Nombre de banques actives
    const [bankCount] = await pool.execute('SELECT COUNT(*) as count FROM banks WHERE is_active = 1');

    res.json({
      success: true,
      data: {
        total_balance: parseFloat(balanceResult[0].total_balance),
        total_debt: parseFloat(debtResult[0].total_debt),
        active_loans: parseInt(debtResult[0].active_loans),
        month_due: parseFloat(monthSchedules[0].month_due),
        month_schedules_count: parseInt(monthSchedules[0].schedules_count),
        overdue_amount: parseFloat(overdueResult[0].overdue_amount),
        overdue_count: parseInt(overdueResult[0].overdue_count),
        banks_count: parseInt(bankCount[0].count),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
