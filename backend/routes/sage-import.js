/**
 * ALLO BÉTON — ROUTES IMPORT SAGE SAARI
 * ======================================
 * API REST pour l'import de données depuis Sage SAARI
 * Upload de fichiers CSV/Excel/TXT + analyse + import
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sageImport = require('../services/sageImportService');
const { authenticateToken } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION MULTER — Upload de fichiers
// ═══════════════════════════════════════════════════════════════

const uploadDir = path.join(__dirname, '..', 'uploads', 'sage-imports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `sage_${timestamp}_${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.csv', '.xlsx', '.xls', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Format non supporté : ${ext}. Formats acceptés : CSV, Excel (xlsx/xls), TXT`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/sage-import/stats
 * Statistiques actuelles de la base avant import
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await sageImport.getImportStats();
    const history = await sageImport.getImportHistory();
    res.json({ success: true, stats, history });
  } catch (error) {
    console.error('Erreur stats import:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sage-import/analyze
 * Upload + analyse d'un fichier Sage (prévisualisation avant import)
 */
router.post('/analyze', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier envoyé' });
    }

    const forceType = req.body.forceType || null;
    const analysis = await sageImport.analyzeFile(req.file.path, forceType);

    res.json({
      success: true,
      filename: req.file.originalname,
      fileSize: req.file.size,
      filePath: req.file.filename,
      analysis,
    });
  } catch (error) {
    console.error('Erreur analyse Sage:', error);
    // Nettoyer le fichier en cas d'erreur
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sage-import/import
 * Import effectif des données après analyse
 */
router.post('/import', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier envoyé' });
    }

    const options = {
      overwrite: req.body.overwrite === 'true',
      dryRun: req.body.dryRun === 'true',
      exerciceId: req.body.exerciceId || null,
    };

    const dataType = req.body.dataType || null;
    const customMapping = req.body.mapping ? JSON.parse(req.body.mapping) : null;

    if (dataType && dataType !== 'auto') {
      // Import ciblé (un seul type de données)
      const parsed = await sageImport.parseFile(req.file.path);
      const data = parsed.data || Object.values(parsed.sheets || {})[0];

      if (!data || data.length === 0) {
        return res.status(400).json({ success: false, error: 'Fichier vide ou illisible' });
      }

      const columns = Object.keys(data[0]);
      const mapping = customMapping || sageImport.mapColumns(columns, dataType);

      const importFunctions = {
        plan_comptable: sageImport.importPlanComptable,
        journaux: sageImport.importJournaux,
        ecritures: sageImport.importEcritures,
        clients: sageImport.importClients,
        fournisseurs: sageImport.importFournisseurs,
        articles: sageImport.importArticles,
        reglements: sageImport.importReglements,
      };

      const importFn = importFunctions[dataType];
      if (!importFn) {
        return res.status(400).json({ success: false, error: `Type inconnu : ${dataType}` });
      }

      const result = await importFn(data, mapping, options);
      res.json({
        success: true,
        type: dataType,
        dryRun: options.dryRun,
        result,
      });
    } else {
      // Import automatique complet
      const result = await sageImport.importComplet(req.file.path, options);
      res.json({
        success: true,
        dryRun: options.dryRun,
        result,
      });
    }
  } catch (error) {
    console.error('Erreur import Sage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sage-import/column-maps
 * Retourne les mappings de colonnes supportés (pour l'UI)
 */
router.get('/column-maps', authenticateToken, (req, res) => {
  res.json({
    success: true,
    maps: sageImport.SAGE_COLUMN_MAPS,
    supportedTypes: Object.keys(sageImport.SAGE_COLUMN_MAPS),
    supportedFormats: ['.csv', '.xlsx', '.xls', '.txt'],
  });
});

/**
 * POST /api/sage-import/import-sheet
 * Import d'un onglet spécifique d'un fichier Excel multi-onglets
 */
router.post('/import-sheet', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier envoyé' });
    }

    const sheetName = req.body.sheetName;
    const dataType = req.body.dataType;
    const options = {
      overwrite: req.body.overwrite === 'true',
      dryRun: req.body.dryRun === 'true',
    };

    if (!sheetName || !dataType) {
      return res.status(400).json({ success: false, error: 'sheetName et dataType requis' });
    }

    const parsed = await sageImport.parseFile(req.file.path);
    const data = parsed.sheets?.[sheetName];

    if (!data) {
      return res.status(400).json({ success: false, error: `Onglet "${sheetName}" non trouvé` });
    }

    const columns = Object.keys(data[0] || {});
    const mapping = sageImport.mapColumns(columns, dataType);

    const importFunctions = {
      plan_comptable: sageImport.importPlanComptable,
      journaux: sageImport.importJournaux,
      ecritures: sageImport.importEcritures,
      clients: sageImport.importClients,
      fournisseurs: sageImport.importFournisseurs,
      articles: sageImport.importArticles,
      reglements: sageImport.importReglements,
    };

    const importFn = importFunctions[dataType];
    if (!importFn) {
      return res.status(400).json({ success: false, error: `Type inconnu : ${dataType}` });
    }

    const result = await importFn(data, mapping, options);
    res.json({ success: true, sheet: sheetName, type: dataType, dryRun: options.dryRun, result });
  } catch (error) {
    console.error('Erreur import onglet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sage-import/history
 * Historique des imports Sage
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const history = await sageImport.getImportHistory();
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
