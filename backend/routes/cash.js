const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Catégories prédéfinies
const EXPENSE_CATEGORIES = [
  'FOND DE CAISSE ANTERIEUR',
  'APPROVISIONNEMENT BANQUE',
  'FRAIS CARBURANT GROUPE',
  'FRAIS CARBURANT CHARGEUR',
  'FRAIS CONSOMMATION CARRIERE',
  'FRAIS DINER MAISON',
  'ACHAT PALIERS',
  'ACHAT PIECES',
  'FRAIS LIVRAISON',
  'VERSEMENT BANQUE',
  'PAIEMENT WAVE',
  'SALAIRES',
  'ENTRETIEN VEHICULES',
  'AUTRES DEPENSES'
];

const INCOME_CATEGORIES = [
  'VENTES BETON',
  'APPROVISIONNEMENT BANQUE',
  'FOND DE CAISSE ANTERIEUR',
  'AUTRES RECETTES'
];

// Auto-migration: ajouter colonnes décaisseur/encaisseur si manquantes
(async () => {
  try {
    const [cols] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cash_movements'"
    );
    const names = cols.map(c => c.COLUMN_NAME);
    if (!names.includes('decaisseur')) {
      await pool.execute('ALTER TABLE cash_movements ADD COLUMN decaisseur VARCHAR(100) NULL');
      console.log('✅ Colonne decaisseur ajoutée à cash_movements');
    }
    if (!names.includes('encaisseur')) {
      await pool.execute('ALTER TABLE cash_movements ADD COLUMN encaisseur VARCHAR(100) NULL');
      console.log('✅ Colonne encaisseur ajoutée à cash_movements');
    }
  } catch(e) {
    console.error('Migration cash_movements:', e.message);
  }
})();

// GET - Liste des catégories
router.get('/categories', (req, res) => {
  res.json({
    expenses: EXPENSE_CATEGORIES,
    income: INCOME_CATEGORIES
  });
});

// GET - Liste des mouvements de caisse avec filtres
router.get('/movements', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, type, category, payment_method, project_id } = req.query;
    
    let query = `SELECT cm.*, p.name as project_name, p.code as project_code 
      FROM cash_movements cm 
      LEFT JOIN projects p ON cm.project_id = p.id 
      WHERE 1=1`;
    const params = [];
    
    if (startDate) {
      query += ' AND cm.date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND cm.date <= ?';
      params.push(endDate);
    }
    
    if (type) {
      query += ' AND cm.type = ?';
      params.push(type);
    }
    
    if (category) {
      query += ' AND cm.category = ?';
      params.push(category);
    }
    
    if (payment_method) {
      query += ' AND cm.payment_method = ?';
      params.push(payment_method);
    }

    if (project_id) {
      query += ' AND cm.project_id = ?';
      params.push(project_id);
    }
    
    query += ' ORDER BY cm.date DESC, cm.created_at DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des mouvements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Résumé journalier
router.get('/daily-summary', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Récupérer le solde de la veille
    const [previousBalance] = await pool.execute(`
      SELECT closing_balance 
      FROM cash_balance 
      WHERE date < ? 
      ORDER BY date DESC 
      LIMIT 1
    `, [targetDate]);
    
    const openingBalance = previousBalance.length > 0 
      ? parseFloat(previousBalance[0].closing_balance) 
      : 0;
    
    // Récupérer les mouvements du jour
    const [movements] = await pool.execute(`
      SELECT cm.*, p.name as project_name, p.code as project_code 
      FROM cash_movements cm
      LEFT JOIN projects p ON cm.project_id = p.id
      WHERE cm.date = ? 
      ORDER BY cm.created_at ASC
    `, [targetDate]);
    
    // Calculer les totaux
    const totalRecettes = movements
      .filter(m => m.type === 'recette')
      .reduce((sum, m) => sum + parseFloat(m.amount), 0);
    
    const totalDepenses = movements
      .filter(m => m.type === 'depense')
      .reduce((sum, m) => sum + parseFloat(m.amount), 0);
    
    const closingBalance = openingBalance + totalRecettes - totalDepenses;
    
    // Grouper par catégorie
    const byCategory = movements.reduce((acc, m) => {
      if (!acc[m.category]) {
        acc[m.category] = { recettes: 0, depenses: 0 };
      }
      if (m.type === 'recette') {
        acc[m.category].recettes += parseFloat(m.amount);
      } else {
        acc[m.category].depenses += parseFloat(m.amount);
      }
      return acc;
    }, {});
    
    // Grouper par mode de paiement
    const byPaymentMethod = movements.reduce((acc, m) => {
      if (!acc[m.payment_method]) {
        acc[m.payment_method] = { recettes: 0, depenses: 0 };
      }
      if (m.type === 'recette') {
        acc[m.payment_method].recettes += parseFloat(m.amount);
      } else {
        acc[m.payment_method].depenses += parseFloat(m.amount);
      }
      return acc;
    }, {});
    
    res.json({
      date: targetDate,
      openingBalance,
      totalRecettes,
      totalDepenses,
      closingBalance,
      movements,
      byCategory,
      byPaymentMethod
    });
  } catch (error) {
    console.error('Erreur lors du calcul du résumé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Ajouter un mouvement
router.post('/movements', authenticateToken, async (req, res) => {
  try {
    const { date, type, category, description, amount, payment_method, reference, account_number, decaisseur, encaisseur, project_id } = req.body;

    if (!date || !type || !category || !amount) {
      return res.status(400).json({ error: 'Champs requis manquants: date, type, category, amount' });
    }

    const [result] = await pool.execute(`
      INSERT INTO cash_movements
      (date, type, category, description, amount, payment_method, reference, decaisseur, encaisseur, project_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      date,
      type,
      category,
      description || null,
      amount,
      payment_method || 'especes',
      reference || null,
      decaisseur || null,
      encaisseur || null,
      project_id || null,
      req.user?.id || null
    ]);
    
    // Mettre à jour le solde du jour
    await updateDailyBalance(date);
    
    const [newMovement] = await pool.execute(
      'SELECT * FROM cash_movements WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newMovement[0]);
  } catch (error) {
    console.error('Erreur lors de l\'ajout du mouvement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT - Modifier un mouvement
router.put('/movements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type, category, description, amount, payment_method, reference, decaisseur, encaisseur, project_id } = req.body;

    // Récupérer l'ancienne date pour mise à jour du solde
    const [oldMovement] = await pool.execute(
      'SELECT date FROM cash_movements WHERE id = ?',
      [id]
    );

    if (oldMovement.length === 0) {
      return res.status(404).json({ error: 'Mouvement non trouvé' });
    }

    await pool.execute(`
      UPDATE cash_movements
      SET date = ?, type = ?, category = ?, description = ?, amount = ?,
          payment_method = ?, reference = ?, decaisseur = ?, encaisseur = ?, project_id = ?
      WHERE id = ?
    `, [date, type, category, description, amount, payment_method, reference, decaisseur, encaisseur, project_id || null, id]);
    
    // Mettre à jour les soldes
    await updateDailyBalance(oldMovement[0].date);
    if (date !== oldMovement[0].date) {
      await updateDailyBalance(date);
    }
    
    const [updated] = await pool.execute(
      'SELECT * FROM cash_movements WHERE id = ?',
      [id]
    );
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Erreur lors de la modification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE - Supprimer un mouvement
router.delete('/movements/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [movement] = await pool.execute(
      'SELECT date FROM cash_movements WHERE id = ?',
      [id]
    );
    
    if (movement.length === 0) {
      return res.status(404).json({ error: 'Mouvement non trouvé' });
    }
    
    await pool.execute('DELETE FROM cash_movements WHERE id = ?', [id]);
    
    // Mettre à jour le solde du jour
    await updateDailyBalance(movement[0].date);
    
    res.json({ message: 'Mouvement supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Historique des soldes
router.get('/balance-history', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM cash_balance WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY date DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Clôturer la journée (versement banque)
router.post('/close-day', authenticateToken, async (req, res) => {
  try {
    const { date, bank_deposit, notes } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Si versement banque, créer le mouvement
    if (bank_deposit && bank_deposit > 0) {
      await pool.execute(`
        INSERT INTO cash_movements 
        (date, type, category, description, amount, payment_method, created_by)
        VALUES (?, 'depense', 'VERSEMENT BANQUE', ?, ?, 'banque', ?)
      `, [targetDate, notes || 'Versement en banque fin de journée', bank_deposit, req.user?.id || null]);
    }
    
    // Mettre à jour le solde
    await updateDailyBalance(targetDate, bank_deposit, notes);
    
    const [balance] = await pool.execute(
      'SELECT * FROM cash_balance WHERE date = ?',
      [targetDate]
    );
    
    res.json(balance[0] || { message: 'Journée clôturée' });
  } catch (error) {
    console.error('Erreur lors de la clôture:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fonction helper pour mettre à jour le solde quotidien
async function updateDailyBalance(date, bankDeposit = null, notes = null) {
  try {
    // Récupérer le solde de la veille
    const [previousBalance] = await pool.execute(`
      SELECT closing_balance 
      FROM cash_balance 
      WHERE date < ? 
      ORDER BY date DESC 
      LIMIT 1
    `, [date]);
    
    const openingBalance = previousBalance.length > 0 
      ? parseFloat(previousBalance[0].closing_balance) 
      : 0;
    
    // Calculer les totaux du jour
    const [totals] = await pool.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'recette' THEN amount ELSE 0 END), 0) as total_recettes,
        COALESCE(SUM(CASE WHEN type = 'depense' THEN amount ELSE 0 END), 0) as total_depenses
      FROM cash_movements 
      WHERE date = ?
    `, [date]);
    
    const totalRecettes = parseFloat(totals[0].total_recettes);
    const totalDepenses = parseFloat(totals[0].total_depenses);
    const closingBalance = openingBalance + totalRecettes - totalDepenses;
    
    // Insérer ou mettre à jour le solde
    await pool.execute(`
      INSERT INTO cash_balance (date, opening_balance, total_recettes, total_depenses, closing_balance, bank_deposit, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        opening_balance = VALUES(opening_balance),
        total_recettes = VALUES(total_recettes),
        total_depenses = VALUES(total_depenses),
        closing_balance = VALUES(closing_balance),
        bank_deposit = COALESCE(VALUES(bank_deposit), bank_deposit),
        notes = COALESCE(VALUES(notes), notes)
    `, [date, openingBalance, totalRecettes, totalDepenses, closingBalance, bankDeposit, notes]);
    
    return { openingBalance, totalRecettes, totalDepenses, closingBalance };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du solde:', error);
    throw error;
  }
}

// POST - Import en lot depuis Excel
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { date, movements } = req.body;
    if (!date || !Array.isArray(movements) || movements.length === 0) {
      return res.status(400).json({ error: 'date et movements requis' });
    }

    let count = 0;
    for (const m of movements) {
      if (!m.type || !m.category || !m.amount) continue;
      await pool.execute(`
        INSERT INTO cash_movements (date, type, category, description, amount, payment_method, decaisseur, encaisseur, project_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        date,
        m.type,
        m.category,
        m.description || m.category,
        m.amount,
        m.payment_method || 'especes',
        m.decaisseur || null,
        m.encaisseur || null,
        m.project_id || null,
        req.user?.id || null
      ]);
      count++;
    }

    await updateDailyBalance(date);
    res.json({ message: `${count} mouvement(s) importé(s)`, count });
  } catch (error) {
    console.error('Erreur import:', error);
    res.status(500).json({ error: 'Erreur lors de l\'importation' });
  }
});

// GET - Rapport journalier complet pour PDF
router.get('/daily-report', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Récupérer le solde de la veille
    const [previousBalance] = await pool.execute(`
      SELECT closing_balance 
      FROM cash_balance 
      WHERE date < ? 
      ORDER BY date DESC 
      LIMIT 1
    `, [targetDate]);
    
    const openingBalance = previousBalance.length > 0 
      ? parseFloat(previousBalance[0].closing_balance) 
      : 0;
    
    // Récupérer les mouvements du jour
    const [movements] = await pool.execute(`
      SELECT cm.*, p.name as project_name, p.code as project_code 
      FROM cash_movements cm
      LEFT JOIN projects p ON cm.project_id = p.id
      WHERE cm.date = ? 
      ORDER BY cm.created_at ASC
    `, [targetDate]);
    
    // Calculer les totaux
    const totalRecettes = movements
      .filter(m => m.type === 'recette')
      .reduce((sum, m) => sum + parseFloat(m.amount), 0);
    
    const totalDepenses = movements
      .filter(m => m.type === 'depense')
      .reduce((sum, m) => sum + parseFloat(m.amount), 0);
    
    const closingBalance = openingBalance + totalRecettes - totalDepenses;
    
    // Grouper par catégorie
    const byCategory = movements.reduce((acc, m) => {
      if (!acc[m.category]) {
        acc[m.category] = { recettes: 0, depenses: 0 };
      }
      if (m.type === 'recette') {
        acc[m.category].recettes += parseFloat(m.amount);
      } else {
        acc[m.category].depenses += parseFloat(m.amount);
      }
      return acc;
    }, {});
    
    // Grouper par mode de paiement
    const byPaymentMethod = movements.reduce((acc, m) => {
      if (!acc[m.payment_method]) {
        acc[m.payment_method] = { recettes: 0, depenses: 0 };
      }
      if (m.type === 'recette') {
        acc[m.payment_method].recettes += parseFloat(m.amount);
      } else {
        acc[m.payment_method].depenses += parseFloat(m.amount);
      }
      return acc;
    }, {});
    
    // Calculer le score de fonctionnement
    const operatingScore = totalRecettes > 0 
      ? ((totalRecettes - totalDepenses) / totalRecettes * 100) 
      : 0;
    
    // Récupérer les données des 7 derniers jours pour les tendances
    const sevenDaysAgo = new Date(new Date(targetDate).getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    
    let trends = [];
    try {
      const [last7Days] = await pool.execute(`
        SELECT 
          cm.date,
          SUM(CASE WHEN cm.type = 'recette' THEN cm.amount ELSE 0 END) as entrees,
          SUM(CASE WHEN cm.type = 'depense' THEN cm.amount ELSE 0 END) as sorties,
          cb.closing_balance as solde
        FROM cash_movements cm
        LEFT JOIN cash_balance cb ON cm.date = cb.date
        WHERE cm.date BETWEEN ? AND ?
        GROUP BY cm.date, cb.closing_balance
        ORDER BY cm.date ASC
      `, [sevenDaysAgo, targetDate]);
      
      trends = last7Days.map(day => ({
        date: day.date,
        entrees: parseFloat(day.entrees) || 0,
        sorties: parseFloat(day.sorties) || 0,
        solde: parseFloat(day.solde) || 0
      }));
    } catch (trendError) {
      console.error('Erreur tendances (non bloquant):', trendError.message);
    }
    
    res.json({
      date: targetDate,
      openingBalance,
      totalRecettes,
      totalDepenses,
      closingBalance,
      operatingScore: Math.max(0, Math.min(100, operatingScore)),
      movements: movements.map(m => ({
        ...m,
        amount: parseFloat(m.amount)
      })),
      byCategory,
      byPaymentMethod,
      trends
    });
  } catch (error) {
    console.error('Erreur lors du rapport:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
