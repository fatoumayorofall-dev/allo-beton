const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { testConnection } = require('./config/database');
const { initEcommerceTables } = require('./scripts/init_ecommerce_tables');
const { auditMiddleware } = require('./services/auditLog');

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
const settingsRoutes = require('./routes/settings');
const invoiceRoutes = require('./routes/invoices');
const deliveryNoteRoutes = require('./routes/delivery_notes');

const app = express();
const PORT = process.env.PORT || 3001;

// 🛡️ Sécurité HTTP — Helmet avec CSP renforcée
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false, // compat avec images externes
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // requis pour React inline scripts en prod (à raffiner avec nonce)
          "'unsafe-eval'",   // requis pour certains libs
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
          'https://connect.facebook.net',
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://images.pexels.com',
          'https://*.google-analytics.com',
          'https://*.facebook.com',
        ],
        connectSrc: [
          "'self'",
          'http://localhost:*',
          'https://allobeton-backend-production-91e5.up.railway.app',
          'https://www.google-analytics.com',
          'https://*.google-analytics.com',
          'https://connect.facebook.net',
        ],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// 🛑 Rate limiting GLOBAL souple (anti-DDoS, anti-scraping)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 300,                  // 300 req/min/IP (large pour usage normal)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Ne limite pas le healthcheck ni les assets
    return req.path === '/api/health' || req.path.startsWith('/uploads/');
  },
  message: { success: false, error: 'Trop de requêtes, veuillez patienter.' },
});
app.use('/api', globalLimiter);

// 🌐 Configuration CORS — dev + production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
  'http://localhost:5180',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:5178',
  'http://127.0.0.1:5179',
  'http://127.0.0.1:5180',
  'https://allobeton.sn',
  'https://www.allobeton.sn',
  'http://allobeton.sn',
  'http://www.allobeton.sn',
  'https://allobeton-sn.netlify.app',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Autorise les requêtes sans origin (Postman, apps mobiles, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Autorise toutes les IPs du réseau local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) return callback(null, true);
      // Autorise 127.0.0.1 sur n'importe quel port (browser previews, outils dev)
      if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return callback(null, true);
      // En développement, autoriser localhost sur n'importe quel port
      if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      callback(new Error(`Origin non autorisée : ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-Request-ID'],
  })
);


// Rate limiting pour login (protection brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 tentatives par IP
  message: {
    success: false,
    error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

// 🔍 Parsing JSON & formulaires
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// � Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// �📜 Middleware de logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});
// 📝 Middleware d'audit (ajoute req.audit())
app.use(auditMiddleware);
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
app.use('/api/settings', settingsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/delivery-notes', deliveryNoteRoutes);
// 📄 Routes PDF - Relevés de compte améliorés
const pdfRoutes = require('./routes/pdf-enhanced');
app.use('/api/pdf', pdfRoutes);

// 💰 Routes de gestion de caisse
const cashRoutes = require('./routes/cash');
app.use('/api/cash', cashRoutes);

// 🏗️ Routes de gestion de projets / chantiers
const projectRoutes = require('./routes/projects');
app.use('/api/projects', projectRoutes);

// 📊 Routes quotas & avoirs
const quotaRoutes = require('./routes/quotas');
app.use('/api/quotas', quotaRoutes);
const creditNoteRoutes = require('./routes/credit_notes');
app.use('/api/credit-notes', creditNoteRoutes);

// 🛒 Routes E-commerce
const ecommerceRoutes = require('./routes/ecommerce');
app.use('/api/ecommerce', ecommerceRoutes);

// 🤖 Route Chatbot IA boutique publique (Gemini avec Google Search)
const shopAiChatRoutes = require('./routes/aiChat');
app.use('/api/shop-ai', shopAiChatRoutes);

// 🔎 Routes SEO publiques (sitemap.xml, robots.txt)
const seoRoutes = require('./routes/seo');
app.use('/', seoRoutes);

// 🤖 Routes Intelligence Artificielle
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);

// 🏦 Routes Gestion Bancaire
const bankRoutes = require('./routes/banks');
app.use('/api/banks', bankRoutes);

// 🤝 Routes Partenaires Investisseurs
const partnerRoutes = require('./routes/partners');
app.use('/api/partners', partnerRoutes);

// 👔 Routes RH - Gestion des Salaires
const employeeRoutes = require('./routes/employees');
const salaryRoutes = require('./routes/salaries');
const salaryAdvanceRoutes = require('./routes/salary_advances');
app.use('/api/employees', employeeRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/salary-advances', salaryAdvanceRoutes);

// 📊 Routes Analytics
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);

// 📒 Routes Comptabilité OHADA / Sage
const comptabiliteRoutes = require('./routes/comptabilite');
app.use('/api/comptabilite', comptabiliteRoutes);

// 🧠 Routes Smart Accounting - Comptabilité Intelligente
const smartAccountingRoutes = require('./routes/smart-accounting');
app.use('/api/smart-accounting', smartAccountingRoutes);

// 📥 Routes Import Sage SAARI
const sageImportRoutes = require('./routes/sage-import');
app.use('/api/sage-import', sageImportRoutes);

// ❤️ Route de santé enrichie (monitoring / uptime checkers)
app.get('/api/health', async (req, res) => {
  const started = Date.now();
  try {
    const dbStatus = await testConnection();
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    const dbLatency = Date.now() - started;

    const healthy = dbStatus && mem.rss < 2 * 1024 * 1024 * 1024; // < 2 Go RSS

    res.status(healthy ? 200 : 503).json({
      success: healthy,
      status: healthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round(uptime),
      uptime_human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      database: {
        connected: !!dbStatus,
        latency_ms: dbLatency,
      },
      memory: {
        rss_mb: Math.round(mem.rss / 1024 / 1024),
        heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
        external_mb: Math.round(mem.external / 1024 / 1024),
      },
      runtime: {
        node: process.version,
        platform: process.platform,
        pid: process.pid,
      },
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString(),
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
      comptabilite: '/api/comptabilite',
      smart_accounting: '/api/smart-accounting',
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

    // 🛒 Initialisation automatique des tables e-commerce
    console.log('🛒 Vérification des tables e-commerce...');
    await initEcommerceTables();

    const server = app.listen(PORT, '0.0.0.0', () => {
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
        const nextPort = parseInt(PORT, 10) + 1;
        console.error(`❌ Le port ${PORT} est déjà en use. Tentative sur le port ${nextPort}...`);
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

// 🛡️ Gestion des erreurs non capturées pour éviter les crashes
process.on('uncaughtException', (err) => {
  console.error('❌ Erreur non capturée:', err.message);
  console.error(err.stack);
  // Ne pas quitter - continuer à fonctionner
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  // Ne pas quitter - continuer à fonctionner
});

startServer();

