const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ─── Permissions par défaut par rôle ─────────────────────────────────────────

const MENU_ITEMS = [
  'dashboard', 'sales', 'transport', 'customers', 'inventory', 'suppliers',
  'payments', 'cash', 'cash-report', 'banks', 'partners', 'ecommerce',
  'ai-expert', 'hr', 'company', 'admin', 'settings'
];

const ALL_TRUE = { c: true, r: true, u: true, d: true };
const READ_ONLY = { c: false, r: true, u: false, d: false };
const NO_ACCESS = { c: false, r: false, u: false, d: false };
const CRU = { c: true, r: true, u: true, d: false };
const CR = { c: true, r: true, u: false, d: false };

const DEFAULT_ROLE_PERMISSIONS = {
  admin: Object.fromEntries(MENU_ITEMS.map(m => [m, ALL_TRUE])),
  manager: {
    dashboard: READ_ONLY, sales: ALL_TRUE, transport: CRU, customers: CRU,
    inventory: CRU, suppliers: CRU, payments: CRU, cash: CRU,
    'cash-report': READ_ONLY, banks: CRU, partners: CRU, ecommerce: CRU,
    'ai-expert': READ_ONLY, hr: READ_ONLY, company: READ_ONLY,
    admin: NO_ACCESS, settings: READ_ONLY,
  },
  seller: {
    dashboard: READ_ONLY, sales: CRU, transport: CR, customers: CRU,
    inventory: READ_ONLY, suppliers: NO_ACCESS, payments: CR, cash: CR,
    'cash-report': NO_ACCESS, banks: NO_ACCESS, partners: NO_ACCESS,
    ecommerce: READ_ONLY, 'ai-expert': READ_ONLY, hr: NO_ACCESS,
    company: NO_ACCESS, admin: NO_ACCESS, settings: NO_ACCESS,
  },
  viewer: {
    dashboard: READ_ONLY, sales: READ_ONLY, transport: READ_ONLY,
    customers: READ_ONLY, inventory: READ_ONLY, suppliers: NO_ACCESS,
    payments: NO_ACCESS, cash: NO_ACCESS, 'cash-report': NO_ACCESS,
    banks: NO_ACCESS, partners: NO_ACCESS, ecommerce: NO_ACCESS,
    'ai-expert': NO_ACCESS, hr: NO_ACCESS, company: NO_ACCESS,
    admin: NO_ACCESS, settings: NO_ACCESS,
  },
};

// Auto-créer la table user_permissions
(async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        menu_id VARCHAR(50) NOT NULL,
        can_create BOOLEAN DEFAULT FALSE,
        can_read BOOLEAN DEFAULT FALSE,
        can_update BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_menu (user_id, menu_id)
      )
    `);
    console.log('✅ Table user_permissions créée/vérifiée');
  } catch (err) {
    console.error('❌ Erreur création table user_permissions:', err.message);
  }
})();

// Initialiser les permissions d'un utilisateur selon son rôle
async function initializeUserPermissions(userId, role) {
  const perms = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.viewer;
  await pool.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
  for (const [menuId, p] of Object.entries(perms)) {
    await pool.execute(
      'INSERT INTO user_permissions (user_id, menu_id, can_create, can_read, can_update, can_delete) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, menuId, p.c, p.r, p.u, p.d]
    );
  }
}

// Récupérer les permissions d'un utilisateur
async function getUserPermissions(userId) {
  const [rows] = await pool.execute(
    'SELECT menu_id, can_create, can_read, can_update, can_delete FROM user_permissions WHERE user_id = ? ORDER BY FIELD(menu_id, ' + MENU_ITEMS.map(() => '?').join(',') + ')',
    [userId, ...MENU_ITEMS]
  );
  return rows.map(r => ({
    menu_id: r.menu_id,
    can_create: !!r.can_create,
    can_read: !!r.can_read,
    can_update: !!r.can_update,
    can_delete: !!r.can_delete,
  }));
}

// Configuration Multer pour l'upload d'avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif, webp)'));
  }
});

// Inscription
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, company, phone } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Un compte existe déjà avec cet email'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const userId = uuidv4();
    await pool.execute(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, company, phone, role) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, email.toLowerCase(), hashedPassword, firstName || null, lastName || null, company || null, phone || null, 'seller']
    );

    // Initialiser les permissions par défaut (rôle seller)
    await initializeUserPermissions(userId, 'seller');

    // Générer le token JWT
    const token = jwt.sign(
      { userId, email: email.toLowerCase(), role: 'seller' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          email: email.toLowerCase(),
          first_name: firstName || null,
          last_name: lastName || null,
          role: 'seller',
          company: company || null,
          phone: phone || null
        },
        token
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du compte'
    });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  try {
    const { email, phone, login: loginId, password } = req.body;
    const identifier = (loginId || email || phone || '').trim();

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Téléphone (ou email) et mot de passe requis'
      });
    }

    // Détecter si c'est un email ou un téléphone
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    // Récupérer l'utilisateur
    const [users] = await pool.execute(
      `SELECT id, email, password_hash, first_name, last_name, role, company, phone, is_active, avatar_url, position, bio FROM users WHERE ${isEmail ? 'email = ?' : 'phone = ?'}`,
      [isEmail ? identifier.toLowerCase() : identifier]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Identifiant ou mot de passe incorrect'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Compte désactivé'
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token JWT (rôle inclus pour audit + perf)
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Récupérer les permissions custom
    let permissions = await getUserPermissions(user.id);
    if (permissions.length === 0) {
      await initializeUserPermissions(user.id, user.role);
      permissions = await getUserPermissions(user.id);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          company: user.company,
          phone: user.phone,
          avatar_url: user.avatar_url,
          position: user.position,
          bio: user.bio,
          permissions
        },
        token
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la connexion'
    });
  }
});

// Récupérer le profil utilisateur
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Récupérer les permissions custom
    let permissions = await getUserPermissions(req.user.id);
    if (permissions.length === 0) {
      await initializeUserPermissions(req.user.id, req.user.role);
      permissions = await getUserPermissions(req.user.id);
    }

    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        role: req.user.role,
        company: req.user.company,
        phone: req.user.phone,
        avatar_url: req.user.avatar_url,
        position: req.user.position,
        bio: req.user.bio,
        permissions
      }
    });
  } catch (error) {
    console.error('Erreur profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du profil'
    });
  }
});

// Mettre à jour le profil
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, company, phone, position, bio } = req.body;

    // Ne pas toucher à avatar_url - c'est géré par POST /avatar
    await pool.execute(
      'UPDATE users SET first_name = ?, last_name = ?, company = ?, phone = ?, position = ?, bio = ?, updated_at = NOW() WHERE id = ?',
      [
        first_name || '', 
        last_name || '', 
        company || '', 
        phone || '', 
        position || null, 
        bio || null, 
        req.user.id
      ]
    );

    // Récupérer les données mises à jour avec avatar_url
    const [users] = await pool.execute(
      'SELECT id, email, first_name, last_name, role, company, phone, position, bio, avatar_url FROM users WHERE id = ?',
      [req.user.id]
    );

    console.log('✅ Profil mis à jour pour:', req.user.email);

    res.json({
      success: true,
      data: users[0]
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du profil'
    });
  }
});

// Changer le mot de passe
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Récupérer le mot de passe actuel
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = users[0];

    // Vérifier le mot de passe actuel
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Mot de passe actuel incorrect'
      });
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Mettre à jour le mot de passe
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du changement de mot de passe'
    });
  }
});

// Upload d'avatar
router.post('/avatar', authenticateToken, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier uploadé'
      });
    }

    // Construire l'URL de l'avatar
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Mettre à jour l'avatar dans la base de données
    await pool.execute(
      'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
      [avatarUrl, req.user.id]
    );

    console.log(`✅ Avatar uploadé pour l'utilisateur ${req.user.id}: ${avatarUrl}`);

    res.json({
      success: true,
      data: {
        avatar_url: avatarUrl
      }
    });

  } catch (error) {
    console.error('Erreur upload avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload de l\'avatar'
    });
  }
});

// Supprimer son propre compte
router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM user_permissions WHERE user_id = ?', [req.user.id]);
    await pool.execute('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: 'Compte supprime avec succes' });
  } catch (error) {
    console.error('Erreur suppression compte:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression du compte' });
  }
});

// ─── ROUTES ADMINISTRATION ────────────────────────────────────────────────

// Lister tous les utilisateurs (admin uniquement)
router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, email, first_name, last_name, role, company, phone, is_active, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Erreur liste utilisateurs:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Créer un utilisateur (admin uniquement)
router.post('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, company, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const validRoles = ['admin', 'manager', 'seller', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Rôle invalide' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Un compte existe déjà avec cet email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const assignedRole = role || 'seller';

    await pool.execute(
      'INSERT INTO users (id, email, password_hash, first_name, last_name, company, phone, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email.toLowerCase(), hashedPassword, first_name || '', last_name || '', company || '', phone || '', assignedRole, true]
    );

    // Initialiser les permissions selon le rôle
    await initializeUserPermissions(userId, assignedRole);

    res.status(201).json({
      success: true,
      data: {
        id: userId,
        email: email.toLowerCase(),
        first_name: first_name || '',
        last_name: last_name || '',
        role: assignedRole,
        company: company || '',
        phone: phone || '',
        is_active: true,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

// Mettre à jour le rôle d'un utilisateur (admin uniquement)
router.put('/users/:id/role', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Vous ne pouvez pas modifier votre propre rôle' });
    }

    const validRoles = ['admin', 'manager', 'seller', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Rôle invalide' });
    }

    const [result] = await pool.execute(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [role, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    // Réinitialiser les permissions selon le nouveau rôle
    await initializeUserPermissions(id, role);

    res.json({ success: true, message: 'Rôle et permissions mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur mise à jour rôle:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour du rôle' });
  }
});

// Basculer le statut actif/inactif (admin uniquement)
router.put('/users/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Vous ne pouvez pas désactiver votre propre compte' });
    }

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Le champ is_active doit être un booléen' });
    }

    const [result] = await pool.execute(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [is_active ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    res.json({ success: true, message: `Utilisateur ${is_active ? 'activé' : 'désactivé'} avec succès` });
  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour du statut' });
  }
});

// Supprimer un utilisateur (admin uniquement)
router.delete('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const [user] = await pool.execute('SELECT id, email, role FROM users WHERE id = ?', [id]);
    if (user.length === 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({ success: true, message: `Utilisateur ${user[0].email} supprimé avec succès` });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

// ─── Récupérer les permissions d'un utilisateur (admin) ──────────────────────
router.get('/users/:id/permissions', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [userCheck] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [id]);
    if (userCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    let permissions = await getUserPermissions(id);
    if (permissions.length === 0) {
      await initializeUserPermissions(id, userCheck[0].role);
      permissions = await getUserPermissions(id);
    }

    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Erreur permissions:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des permissions' });
  }
});

// ─── Sauvegarder les permissions d'un utilisateur (admin) ────────────────────
router.put('/users/:id/permissions', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, error: 'Format de permissions invalide' });
    }

    const [userCheck] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (userCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    // Valider et insérer/mettre à jour chaque permission
    for (const perm of permissions) {
      if (!perm.menu_id || !MENU_ITEMS.includes(perm.menu_id)) continue;

      await pool.execute(
        `INSERT INTO user_permissions (user_id, menu_id, can_create, can_read, can_update, can_delete)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE can_create = VALUES(can_create), can_read = VALUES(can_read), can_update = VALUES(can_update), can_delete = VALUES(can_delete), updated_at = NOW()`,
        [id, perm.menu_id, !!perm.can_create, !!perm.can_read, !!perm.can_update, !!perm.can_delete]
      );
    }

    const updated = await getUserPermissions(id);
    res.json({ success: true, data: updated, message: 'Permissions mises à jour avec succès' });
  } catch (error) {
    console.error('Erreur sauvegarde permissions:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la sauvegarde des permissions' });
  }
});

// ─── Réinitialiser les permissions au template du rôle ───────────────────────
router.post('/users/:id/permissions/reset', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const [userCheck] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [id]);
    if (userCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    await initializeUserPermissions(id, userCheck[0].role);
    const permissions = await getUserPermissions(id);

    res.json({ success: true, data: permissions, message: 'Permissions réinitialisées selon le rôle' });
  } catch (error) {
    console.error('Erreur reset permissions:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la réinitialisation' });
  }
});

// ─── Journal d'activité / Audit logs ─────────────────────────────────────────
const { getAuditLogs, getAuditStats } = require('../services/auditLog');

// GET /audit/logs - Liste paginée des logs
router.get('/audit/logs', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { page, limit, userId, module, action, startDate, endDate, search } = req.query;
    const result = await getAuditLogs({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      userId, module, action, startDate, endDate, search
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Erreur audit logs:', error);
    res.status(500).json({ success: false, error: 'Erreur récupération des logs' });
  }
});

// GET /audit/stats - Statistiques d'activité
router.get('/audit/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const stats = await getAuditStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Erreur audit stats:', error);
    res.status(500).json({ success: false, error: 'Erreur récupération des stats' });
  }
});

module.exports = router;