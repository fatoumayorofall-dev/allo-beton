// 📦 Import des dépendances
const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/* -----------------------------------------------------------
   🧱 ROUTES CLIENTS (Allo Béton)
   ----------------------------------------------------------- */

// ✅ 1. Récupérer tous les clients
router.get('/', async (req, res) => {
  try {
    const [customers] = await pool.execute(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.company,
        c.credit_limit,
        c.current_balance,
        c.notes,
        c.status,
        COALESCE(SUM(s.total_amount), 0) AS total_purchases,
        COUNT(s.id) AS total_orders
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id AND s.status != 'cancelled'
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    const transformed = customers.map(c => ({
      ...c,
      balance: Number(c.current_balance || 0),
      creditLimit: Number(c.credit_limit || 0),
      totalPurchases: Number(c.total_purchases || 0),
      totalOrders: Number(c.total_orders || 0),
    }));

    return res.json({ success: true, data: transformed });
  } catch (error) {
    console.error('❌ Erreur récupération clients:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la récupération des clients' });
  }
});

// ✅ 2. Créer un nouveau client
router.post('/', authenticateToken, requireRole(['admin', 'manager', 'seller']), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      city,
      company,
      creditLimit,
      balance,
      notes,
    } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ success: false, error: 'Le nom du client est obligatoire' });
    }

    const safeCreditLimit = Number(creditLimit);
    const safeBalance = Number(balance);

    const safeValues = {
      id: uuidv4(),
      user_id: req.user?.id || null,
      name: String(name).trim(),
      email: email ? String(email).trim() : null,
      phone: phone ? String(phone).trim() : null,
      address: address ? String(address).trim() : null,
      city: city ? String(city).trim() : null,
      company: company ? String(company).trim() : null,
      credit_limit: Number.isFinite(safeCreditLimit) ? safeCreditLimit : 0,
      current_balance: Number.isFinite(safeBalance) ? safeBalance : 0,
      notes: notes ? String(notes).trim() : null,
    };

    await pool.execute(
      `INSERT INTO customers 
        (id, user_id, name, email, phone, address, city, company, credit_limit, current_balance, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [
        safeValues.id,
        safeValues.user_id,
        safeValues.name,
        safeValues.email,
        safeValues.phone,
        safeValues.address,
        safeValues.city,
        safeValues.company,
        safeValues.credit_limit,
        safeValues.current_balance,
        safeValues.notes,
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [safeValues.id]);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Erreur création client:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la création du client' });
  }
});

// ✅ 3. Mettre à jour un client (CORRIGÉ)
router.put('/:id', authenticateToken, requireRole(['admin', 'manager', 'seller']), async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      phone,
      address,
      city,
      company,
      creditLimit,
      balance,
      notes,
    } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ success: false, error: 'Le nom du client est obligatoire' });
    }

    const safeCreditLimit = Number(creditLimit);
    const safeBalance = Number(balance);

    const safe = {
      name: String(name).trim(),
      email: email ? String(email).trim() : null,
      phone: phone ? String(phone).trim() : null,
      address: address ? String(address).trim() : null,
      city: city ? String(city).trim() : null,
      company: company ? String(company).trim() : null,
      creditLimit: Number.isFinite(safeCreditLimit) ? safeCreditLimit : 0,
      balance: Number.isFinite(safeBalance) ? safeBalance : 0,
      notes: notes ? String(notes).trim() : null,
    };

    await pool.execute(
      `UPDATE customers 
       SET name=?, email=?, phone=?, address=?, city=?, company=?, 
           credit_limit=?, current_balance=?, notes=?, updated_at=NOW()
       WHERE id=?`,
      [
        safe.name,
        safe.email,
        safe.phone,
        safe.address,
        safe.city,
        safe.company,
        safe.creditLimit,
        safe.balance,
        safe.notes,
        id
      ]
    );

    // 🔎 Renvoyer le client mis à jour (IMPORTANT pour le frontend)
    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client introuvable' });
    }

    return res.json({ success: true, data: rows[0], message: '✅ Client mis à jour avec succès' });
  } catch (error) {
    console.error('❌ Erreur mise à jour client:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour du client' });
  }
});

// ✅ 4. Supprimer un client (désactivation)
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute(
      'UPDATE customers SET status="inactive", updated_at=NOW() WHERE id=?',
      [id]
    );
    return res.json({ success: true, message: '🗑️ Client supprimé avec succès' });
  } catch (error) {
    console.error('❌ Erreur suppression client:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la suppression du client' });
  }
});

module.exports = router;

