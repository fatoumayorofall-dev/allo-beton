const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Import des routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const salesRoutes = require('./routes/sales');
const supplierRoutes = require('./routes/suppliers');
const paymentRoutes = require('./routes/payments');
const categoryRoutes = require('./routes/categories');
const dashboardRoutes = require('./routes/dashboard');
const notificationsRoutes = require('./routes/notifications');
const purchaseOrderRoutes = require('./routes/purchase_orders');

const app = express();
const PORT = process.env.PORT || 3001;

// 🛡️ Sécurité HTTP
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 🌐 Configuration CORS (accepte UNIQUEMENT localhost:5173 et 5174)
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);


/* 
🚫 Rate limiting désactivé pour le développement
(Si tu veux le réactiver plus tard, décommente ces lignes 👇)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Trop de requêtes, veuillez réessayer plus tard.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', limiter);
*/

// 🔍 Parsing JSON & formulaires
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// � Servir les fichiers statiques (uploads)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// �📜 Middleware de logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// 🧭 Déclaration des routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
const pdfRoutes = require('./routes/pdf');
app.use('/api/pdf', pdfRoutes);


// ❤️ Route de santé
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    const uptime = process.uptime();

    res.json({
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)} minutes`,
      database: dbStatus ? 'Connected' : 'Disconnected',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'ERROR',
      error: error.message,
    });
  }
});

// 🏠 Page d'accueil de l'API
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Allo Béton - Système de Gestion de Ventes de Béton',
    version: '1.0.0',
    documentation: 'https://docs.allobeton.sn',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      customers: '/api/customers',
      sales: '/api/sales',
      suppliers: '/api/suppliers',
      payments: '/api/payments',
      categories: '/api/categories',
      dashboard: '/api/dashboard',
      health: '/api/health',
    },
  });
});

// ❗ Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      success: false,
      error: 'Cette valeur existe déjà dans la base de données',
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      error: 'Référence invalide vers un autre enregistrement',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Erreur interne du serveur'
        : err.message,
  });
});

// 🚧 Route non trouvée
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    path: req.originalUrl,
  });
});

// 🚀 Démarrage du serveur
async function startServer() {
  try {
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Impossible de se connecter à la base de données');
      console.log('💡 Vérifie MySQL et les paramètres du fichier backend/.env');
      process.exit(1);
    }

    const server = app.listen(PORT, () => {
      console.log('🚀 Serveur Allo Béton démarré avec succès!');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(
        `🔗 Frontend autorisé: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`
      );
      console.log(`📚 Documentation API: http://localhost:${PORT}`);
      console.log(`🏥 Santé du serveur: http://localhost:${PORT}/api/health`);
      console.log('');
      console.log('📋 Endpoints disponibles:');
      console.log('   🔐 Auth: /api/auth');
      console.log('   📦 Produits: /api/products');
      console.log('   👥 Clients: /api/customers');
      console.log('   💰 Ventes: /api/sales');
      console.log('   🚚 Fournisseurs: /api/suppliers');
      console.log('   💳 Paiements: /api/payments');
      console.log('   📊 Tableau de bord: /api/dashboard');
    });
    // Gestion de l'erreur EADDRINUSE (port déjà en use)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Le port ${PORT} est déjà en use. Tentative sur le port ${PORT + 1}...`);
        const nextPort = parseInt(PORT) + 1;
        const newServer = app.listen(nextPort);
        newServer.on('error', (newErr) => {
          if (newErr.code === 'EADDRINUSE') {
            console.error(`❌ Le port ${nextPort} est aussi en use. Arrêt...`);
            process.exit(1);
          }
        });
        newServer.on('listening', () => {
          console.log(`🚀 Serveur démarré sur le port alternatif: ${nextPort}`);
        });
      } else {
        console.error('❌ Erreur serveur:', err);
        process.exit(1);
      }
    });  } catch (error) {
    console.error('💥 Erreur démarrage serveur:', error);
    process.exit(1);
  }
}

// 🛑 Arrêt propre du serveur
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Arrêt du serveur...');
  process.exit(0);
});

startServer();

