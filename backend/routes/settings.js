const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Récupérer tous les paramètres de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT setting_key, setting_value FROM settings WHERE user_id = ?',
      [req.user.id]
    );

    // Convertir en objet clé-valeur
    const settings = {};
    rows.forEach(row => {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch {
        settings[row.setting_key] = row.setting_value;
      }
    });

    // Valeurs par défaut si pas de settings
    const defaultSettings = {
      companyName: 'Allo Béton SARL',
      companyAddress: 'Dakar, Sénégal',
      companyPhone: '+221 77 000 00 00',
      companyEmail: 'contact@allobeton.sn',
      currency: 'FCFA',
      taxRate: 18,
      language: 'fr',
      timezone: 'Africa/Dakar',
      dateFormat: 'DD/MM/YYYY',
      weatherCity: 'Dakar',
      weatherCountry: 'SN',
      emailNotifications: true,
      smsNotifications: false,
      lowStockAlert: true,
      lowStockThreshold: 10,
      paymentReminders: true,
      reminderDays: 3,
      autoBackup: true,
      backupFrequency: 'daily',
      theme: 'light',
      sidebarCollapsed: false,
      invoicePrefix: 'FAC-',
      quotePrefix: 'DEV-',
      orderPrefix: 'CMD-'
    };

    res.json({
      success: true,
      data: { ...defaultSettings, ...settings }
    });

  } catch (error) {
    console.error('Erreur récupération settings:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des paramètres'
    });
  }
});

// Sauvegarder les paramètres
router.put('/', authenticateToken, async (req, res) => {
  try {
    const settings = req.body;
    
    // Sauvegarder chaque paramètre
    for (const [key, value] of Object.entries(settings)) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      await pool.execute(
        `INSERT INTO settings (user_id, setting_key, setting_value) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
        [req.user.id, key, valueStr, valueStr]
      );
    }

    console.log(`✅ Paramètres sauvegardés pour l'utilisateur ${req.user.id}`);

    res.json({
      success: true,
      message: 'Paramètres sauvegardés avec succès',
      data: settings
    });

  } catch (error) {
    console.error('Erreur sauvegarde settings:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sauvegarde des paramètres'
    });
  }
});

// Sauvegarder un paramètre spécifique
router.patch('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    await pool.execute(
      `INSERT INTO settings (user_id, setting_key, setting_value) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [req.user.id, key, valueStr, valueStr]
    );

    res.json({
      success: true,
      message: `Paramètre ${key} sauvegardé`,
      data: { [key]: value }
    });

  } catch (error) {
    console.error('Erreur sauvegarde setting:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sauvegarde du paramètre'
    });
  }
});

module.exports = router;
