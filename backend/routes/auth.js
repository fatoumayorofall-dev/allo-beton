const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

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
      [userId, email.toLowerCase(), hashedPassword, firstName, lastName, company, phone, 'seller']
    );

    // Générer le token JWT
    const token = jwt.sign(
      { userId, email: email.toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          email: email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          role: 'seller',
          company,
          phone
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
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    // Récupérer l'utilisateur
    const [users] = await pool.execute(
      'SELECT id, email, password_hash, first_name, last_name, role, company, phone, is_active FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
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

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

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
          phone: user.phone
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
        bio: req.user.bio
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
    const { first_name, last_name, company, phone, position, bio, avatar_url } = req.body;

    await pool.execute(
      'UPDATE users SET first_name = ?, last_name = ?, company = ?, phone = ?, position = ?, bio = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?',
      [first_name, last_name, company, phone, position || null, bio || null, avatar_url || null, req.user.id]
    );

    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        first_name,
        last_name,
        role: req.user.role,
        company,
        phone,
        position,
        bio,
        avatar_url
      }
    });

  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
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

module.exports = router;