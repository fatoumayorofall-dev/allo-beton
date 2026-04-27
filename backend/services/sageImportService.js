/**
 * ALLO BÉTON — SERVICE D'IMPORT SAGE SAARI
 * ==========================================
 * Import complet de la base de données Sage SAARI vers Allo Béton
 * 
 * Formats supportés :
 * - CSV (.csv) — Export standard Sage
 * - Excel (.xlsx, .xls) — Export tableur
 * - Texte tabulé (.txt) — Format Sage classique
 * 
 * Modules d'import :
 * 1. Plan comptable (comptes SYSCOHADA)
 * 2. Journaux comptables
 * 3. Écritures comptables
 * 4. Clients (tiers)
 * 5. Fournisseurs (tiers)
 * 6. Articles / Produits
 * 7. Factures
 * 8. Règlements / Paiements
 * 9. Balances
 * 10. Exercices comptables
 */

const pool = require('../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// ═══════════════════════════════════════════════════════════════
// CONSTANTES — Mapping colonnes Sage → Allo Béton
// ═══════════════════════════════════════════════════════════════

const SAGE_COLUMN_MAPS = {
  // Plan comptable Sage
  plan_comptable: {
    // Noms de colonnes possibles dans Sage (multiples variantes)
    code: ['Numéro', 'Numero', 'N° Compte', 'N°Compte', 'Code', 'Compte', 'CompteNum', 'Account', 'NumCompte', 'CG_Num'],
    libelle: ['Intitulé', 'Intitule', 'Libellé', 'Libelle', 'Désignation', 'Designation', 'Nom', 'Label', 'CG_Intitule'],
    type: ['Type', 'Nature', 'Sens', 'CG_Type'],
    classe: ['Classe', 'Class'],
  },

  // Journaux Sage
  journaux: {
    code: ['Code', 'Code journal', 'JO_Num', 'CodeJournal', 'Journal'],
    libelle: ['Intitulé', 'Intitule', 'Libellé', 'Libelle', 'Désignation', 'JO_Intitule', 'Nom'],
    type: ['Type', 'JO_Type', 'TypeJournal'],
  },

  // Écritures Sage
  ecritures: {
    journal: ['Code journal', 'Journal', 'JO_Num', 'CodeJournal', 'JournalCode'],
    date: ['Date', 'Date écriture', 'DateEcriture', 'JM_Date', 'EC_Date', 'DatePiece'],
    numero_piece: ['N° pièce', 'Pièce', 'Piece', 'NumPiece', 'EC_RefPiece', 'Reference', 'Ref'],
    compte: ['N° Compte', 'Compte', 'CompteNum', 'CG_Num', 'NumCompte', 'General'],
    libelle: ['Libellé', 'Libelle', 'Intitulé', 'EC_Intitule', 'Designation'],
    debit: ['Débit', 'Debit', 'Montant débit', 'MontantDebit', 'EC_Debit'],
    credit: ['Crédit', 'Credit', 'Montant crédit', 'MontantCredit', 'EC_Credit'],
    tiers: ['Tiers', 'Auxiliaire', 'CT_Num', 'CompteAux'],
    echeance: ['Échéance', 'Echeance', 'DateEcheance', 'EC_Echeance'],
  },

  // Clients Sage
  clients: {
    code: ['Code', 'N° Client', 'NumClient', 'CT_Num', 'Référence', 'Reference'],
    nom: ['Nom', 'Raison sociale', 'RaisonSociale', 'Intitulé', 'CT_Intitule', 'Société', 'Societe'],
    adresse: ['Adresse', 'Adresse 1', 'CT_Adresse', 'Rue'],
    ville: ['Ville', 'CT_Ville', 'City'],
    telephone: ['Téléphone', 'Telephone', 'Tel', 'CT_Telephone', 'Phone'],
    email: ['Email', 'E-mail', 'CT_EMail', 'Mail'],
    type: ['Type', 'CT_Type', 'Catégorie', 'Categorie'],
    solde: ['Solde', 'Encours', 'CT_Encours', 'Balance'],
    ninea: ['NINEA', 'N° NINEA', 'NumFiscal', 'CT_NumPayeur', 'NIF'],
    rc: ['RC', 'Registre Commerce', 'CT_Ape', 'RCCM'],
  },

  // Fournisseurs Sage
  fournisseurs: {
    code: ['Code', 'N° Fournisseur', 'NumFournisseur', 'CT_Num', 'Référence'],
    nom: ['Nom', 'Raison sociale', 'RaisonSociale', 'Intitulé', 'CT_Intitule'],
    adresse: ['Adresse', 'CT_Adresse', 'Rue'],
    ville: ['Ville', 'CT_Ville'],
    telephone: ['Téléphone', 'Telephone', 'Tel', 'CT_Telephone'],
    email: ['Email', 'E-mail', 'CT_EMail'],
    type: ['Type', 'CT_Type'],
    solde: ['Solde', 'Encours', 'CT_Encours'],
  },

  // Articles/Produits Sage
  articles: {
    reference: ['Référence', 'Reference', 'AR_Ref', 'Code', 'CodeArticle'],
    designation: ['Désignation', 'Designation', 'AR_Design', 'Libellé', 'Libelle', 'Nom'],
    famille: ['Famille', 'FA_CodeFamille', 'Catégorie', 'Categorie', 'Category'],
    prix_achat: ['Prix achat', 'PrixAchat', 'AR_PrixAch', 'PA', 'CoutRevient'],
    prix_vente: ['Prix vente', 'PrixVente', 'AR_PrixVen', 'PV', 'PrixTTC'],
    unite: ['Unité', 'Unite', 'AR_UniteVen', 'UniteMesure', 'Unit'],
    tva: ['TVA', 'Taux TVA', 'TauxTVA', 'AR_TauxTVA'],
    stock: ['Stock', 'Quantité', 'Quantite', 'QteStock', 'StockActuel'],
  },

  // Factures Sage
  factures: {
    numero: ['N° Facture', 'NumFacture', 'DO_Piece', 'Référence', 'Reference', 'Numero'],
    date: ['Date', 'Date facture', 'DO_Date', 'DateFacture'],
    client: ['Client', 'Code client', 'DO_Tiers', 'CT_Num', 'CodeClient'],
    montant_ht: ['Montant HT', 'MontantHT', 'TotalHT', 'DO_TotalHT', 'HT'],
    montant_tva: ['TVA', 'Montant TVA', 'MontantTVA', 'TotalTVA', 'DO_TotalTVA'],
    montant_ttc: ['Montant TTC', 'MontantTTC', 'TotalTTC', 'DO_TotalTTC', 'TTC', 'Total'],
    echeance: ['Échéance', 'Echeance', 'DateEcheance', 'DO_DateLivr'],
    reglement: ['Réglé', 'Regle', 'Statut', 'DO_Statut', 'Etat'],
  },

  // Règlements / Paiements Sage
  reglements: {
    numero: ['N° Règlement', 'NumReglement', 'RG_Num', 'Reference', 'Piece'],
    date: ['Date', 'Date règlement', 'RG_Date', 'DateReglement'],
    tiers: ['Tiers', 'Client', 'Fournisseur', 'RG_Tiers', 'CT_Num'],
    montant: ['Montant', 'RG_Montant', 'Total', 'Somme'],
    mode: ['Mode', 'Mode règlement', 'RG_ModeRegl', 'ModeReglement', 'TypePaiement'],
    banque: ['Banque', 'RG_Banque', 'CompteBanque'],
    reference: ['Référence', 'Reference', 'RG_Reference', 'NumCheque'],
  },
};

// ═══════════════════════════════════════════════════════════════
// PARSING — Lecture des fichiers
// ═══════════════════════════════════════════════════════════════

/**
 * Détecte et parse un fichier (CSV, Excel, TXT)
 */
async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.xlsx' || ext === '.xls') {
    return parseExcel(filePath);
  } else if (ext === '.csv') {
    return parseCSV(filePath);
  } else if (ext === '.txt') {
    return parseTXT(filePath);
  } else {
    throw new Error(`Format non supporté : ${ext}. Utilisez .csv, .xlsx, .xls ou .txt`);
  }
}

/**
 * Parse un fichier Excel (.xlsx / .xls)
 */
function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheets = {};

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if (data.length > 0) {
      sheets[sheetName] = data;
    }
  }

  // Si un seul onglet, retourner directement les données
  if (Object.keys(sheets).length === 1) {
    return { data: Object.values(sheets)[0], sheets, sheetNames: workbook.SheetNames };
  }

  return { data: null, sheets, sheetNames: workbook.SheetNames };
}

/**
 * Parse un fichier CSV
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const content = fs.readFileSync(filePath, 'utf-8');

    // Détecter le séparateur (;  ou  , ou \t)
    const firstLine = content.split('\n')[0];
    let separator = ';'; // Sage utilise ; par défaut
    if (firstLine.split('\t').length > firstLine.split(';').length) separator = '\t';
    else if (firstLine.split(',').length > firstLine.split(';').length) separator = ',';

    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' })
      .pipe(csv({ separator, mapHeaders: ({ header }) => header.trim() }));

    stream.on('data', (row) => results.push(row));
    stream.on('end', () => resolve({ data: results, separator }));
    stream.on('error', reject);
  });
}

/**
 * Parse un fichier TXT tabulé (format Sage classique)
 */
function parseTXT(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);

  if (lines.length < 2) throw new Error('Fichier TXT vide ou sans données');

  // Première ligne = en-têtes
  const separator = lines[0].includes('\t') ? '\t' : ';';
  const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    data.push(row);
  }

  return { data, separator, headers };
}

// ═══════════════════════════════════════════════════════════════
// MAPPING INTELLIGENT — Détection automatique des colonnes
// ═══════════════════════════════════════════════════════════════

/**
 * Détecte automatiquement le type de données Sage dans un fichier
 */
function detectDataType(columns) {
  const colLower = columns.map(c => c.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  const scores = {
    plan_comptable: 0,
    journaux: 0,
    ecritures: 0,
    clients: 0,
    fournisseurs: 0,
    articles: 0,
    factures: 0,
    reglements: 0,
  };

  // Scoring basé sur la présence de colonnes caractéristiques
  for (const col of columns) {
    const cl = col.toLowerCase();
    // Plan comptable
    if (cl.includes('cg_num') || cl.includes('numcompte') || (cl.includes('compte') && !cl.includes('journal'))) scores.plan_comptable += 3;
    if (cl.includes('cg_intitule') || cl.includes('classe')) scores.plan_comptable += 2;
    
    // Journaux
    if (cl.includes('jo_num') || cl.includes('codejournal')) scores.journaux += 5;
    if (cl.includes('jo_intitule') || cl.includes('typejournal')) scores.journaux += 3;
    
    // Écritures
    if (cl.includes('debit') || cl.includes('credit') || cl.includes('ec_debit')) scores.ecritures += 3;
    if (cl.includes('ec_') || cl.includes('journal')) scores.ecritures += 2;
    if (cl.includes('piece') || cl.includes('numpiece')) scores.ecritures += 2;
    
    // Clients
    if (cl.includes('ct_num') || cl.includes('raisonsociale')) scores.clients += 3;
    if (cl.includes('ninea') || cl.includes('rccm') || cl.includes('registrecommerce')) scores.clients += 4;
    if (cl.includes('telephone') || cl.includes('email') || cl.includes('adresse')) scores.clients += 1;
    
    // Fournisseurs (même structure que clients mais on vérifie le contexte)
    if (cl.includes('fournisseur') || cl.includes('supplier')) scores.fournisseurs += 5;
    
    // Articles
    if (cl.includes('ar_ref') || cl.includes('codearticle') || cl.includes('designation')) scores.articles += 3;
    if (cl.includes('prixvente') || cl.includes('prixachat') || cl.includes('ar_prix')) scores.articles += 4;
    if (cl.includes('stock') || cl.includes('qte')) scores.articles += 2;
    
    // Factures
    if (cl.includes('do_piece') || cl.includes('numfacture') || cl.includes('facture')) scores.factures += 4;
    if (cl.includes('totalht') || cl.includes('totalttc') || cl.includes('do_total')) scores.factures += 3;
    
    // Règlements
    if (cl.includes('rg_') || cl.includes('reglement') || cl.includes('modereglement')) scores.reglements += 4;
    if (cl.includes('numcheque') || cl.includes('banque')) scores.reglements += 2;
  }

  // Retourner le type avec le meilleur score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  
  return {
    type: best[1] > 2 ? best[0] : 'inconnu',
    confidence: best[1],
    scores: Object.fromEntries(sorted),
  };
}

/**
 * Mappe automatiquement les colonnes d'un fichier Sage vers Allo Béton
 */
function mapColumns(columns, dataType) {
  const mapping = {};
  const columnMap = SAGE_COLUMN_MAPS[dataType];
  if (!columnMap) return mapping;

  for (const [alloField, sageVariants] of Object.entries(columnMap)) {
    for (const col of columns) {
      const colClean = col.trim();
      if (sageVariants.some(v => v.toLowerCase() === colClean.toLowerCase())) {
        mapping[alloField] = colClean;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Applique le mapping pour transformer une ligne Sage en ligne Allo Béton
 */
function transformRow(row, mapping) {
  const result = {};
  for (const [alloField, sageCol] of Object.entries(mapping)) {
    result[alloField] = row[sageCol] !== undefined ? String(row[sageCol]).trim() : '';
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// ANALYSE — Prévisualisation avant import
// ═══════════════════════════════════════════════════════════════

/**
 * Analyse un fichier et retourne un aperçu avant import
 */
async function analyzeFile(filePath, forceType = null) {
  const parsed = await parseFile(filePath);
  let allData = parsed.data;

  // Si fichier Excel multi-onglets, analyser chaque onglet
  if (!allData && parsed.sheets) {
    const analyses = {};
    for (const [sheetName, data] of Object.entries(parsed.sheets)) {
      const columns = Object.keys(data[0] || {});
      const detection = detectDataType(columns);
      const mapping = mapColumns(columns, detection.type);

      analyses[sheetName] = {
        type: detection.type,
        confidence: detection.confidence,
        totalRows: data.length,
        columns,
        mapping,
        mappedFields: Object.keys(mapping).length,
        unmappedColumns: columns.filter(c => !Object.values(mapping).includes(c)),
        preview: data.slice(0, 5).map(row => transformRow(row, mapping)),
      };
    }
    return { multiSheet: true, sheets: analyses, sheetNames: parsed.sheetNames };
  }

  const columns = Object.keys(allData[0] || {});
  const detection = forceType ? { type: forceType, confidence: 100 } : detectDataType(columns);
  const mapping = mapColumns(columns, detection.type);

  return {
    multiSheet: false,
    type: detection.type,
    confidence: detection.confidence,
    totalRows: allData.length,
    columns,
    mapping,
    mappedFields: Object.keys(mapping).length,
    totalFields: Object.keys(SAGE_COLUMN_MAPS[detection.type] || {}).length,
    unmappedColumns: columns.filter(c => !Object.values(mapping).includes(c)),
    preview: allData.slice(0, 10).map(row => transformRow(row, mapping)),
    rawPreview: allData.slice(0, 3),
  };
}

// ═══════════════════════════════════════════════════════════════
// IMPORT — Fonctions d'insertion en base
// ═══════════════════════════════════════════════════════════════

/**
 * Import du Plan Comptable depuis Sage
 */
async function importPlanComptable(data, mapping, options = {}) {
  const { overwrite = false, dryRun = false } = options;
  const results = { imported: 0, skipped: 0, errors: [], updated: 0 };

  for (let i = 0; i < data.length; i++) {
    try {
      const row = transformRow(data[i], mapping);
      const code = row.code;
      if (!code) { results.skipped++; continue; }

      const libelle = row.libelle || `Compte ${code}`;
      const classe = row.classe || parseInt(code.charAt(0)) || 0;

      // Déterminer le type selon la classe SYSCOHADA
      let type = 'actif';
      if (row.type) {
        const t = row.type.toLowerCase();
        if (t.includes('passif') || t === 'p' || t === '1') type = 'passif';
        else if (t.includes('charge') || t === 'c' || t === '6') type = 'charge';
        else if (t.includes('produit') || t === 'r' || t === '7') type = 'produit';
      } else {
        // Auto-détection par classe SYSCOHADA
        if ([1].includes(classe)) type = 'passif';
        else if ([2, 3].includes(classe)) type = 'actif';
        else if ([4].includes(classe)) type = code.startsWith('40') ? 'passif' : 'actif';
        else if ([5].includes(classe)) type = 'actif';
        else if ([6].includes(classe)) type = 'charge';
        else if ([7].includes(classe)) type = 'produit';
        else if ([8].includes(classe)) type = 'engagement';
      }

      const parentCode = code.length > 2 ? code.substring(0, code.length - 1) : null;

      if (dryRun) { results.imported++; continue; }

      // Vérifier si le compte existe déjà
      const [existing] = await pool.execute('SELECT id FROM plan_comptable WHERE code = ?', [code]);

      if (existing.length > 0) {
        if (overwrite) {
          await pool.execute(
            'UPDATE plan_comptable SET libelle = ?, classe = ?, type = ? WHERE code = ?',
            [libelle, classe, type, code]
          );
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        await pool.execute(
          'INSERT INTO plan_comptable (code, libelle, classe, type, parent_code, is_detail, is_active) VALUES (?, ?, ?, ?, ?, 1, 1)',
          [code, libelle, classe, type, parentCode]
        );
        results.imported++;
      }
    } catch (err) {
      results.errors.push({ line: i + 2, error: err.message, data: data[i] });
    }
  }

  return results;
}

/**
 * Import des Journaux depuis Sage
 */
async function importJournaux(data, mapping, options = {}) {
  const { overwrite = false, dryRun = false } = options;
  const results = { imported: 0, skipped: 0, errors: [], updated: 0 };

  // Mapping types Sage → Allo Béton (valeurs ENUM de la table journaux_comptables)
  // Types valides: 'ventes','achats','banque','caisse','operations_diverses','salaires','ouverture'
  const typeMap = {
    '0': 'achats', 'ACH': 'achats', 'A': 'achats', 'ACHAT': 'achats',
    '1': 'ventes', 'VTE': 'ventes', 'V': 'ventes', 'VENTE': 'ventes',
    '2': 'banque', 'TRE': 'banque', 'T': 'banque', 'TRESORERIE': 'banque',
    'BQ': 'banque', 'BAN': 'banque', 'BANQUE': 'banque',
    'CA': 'caisse', 'CAISSE': 'caisse',
    '3': 'operations_diverses', 'OD': 'operations_diverses', 'DIVERS': 'operations_diverses',
    '4': 'ouverture', 'SIT': 'ouverture', 'S': 'ouverture', 'AN': 'ouverture', 'SITUATION': 'ouverture',
    'SAL': 'salaires', 'SALAIRES': 'salaires',
  };

  for (let i = 0; i < data.length; i++) {
    try {
      const row = transformRow(data[i], mapping);
      const code = row.code;
      if (!code) { results.skipped++; continue; }

      const libelle = row.libelle || `Journal ${code}`;
      const type = typeMap[(row.type || '').toUpperCase()] || typeMap[row.type] || 'operations_diverses';

      if (dryRun) { results.imported++; continue; }

      const [existing] = await pool.execute('SELECT id FROM journaux_comptables WHERE code = ?', [code]);

      if (existing.length > 0) {
        if (overwrite) {
          await pool.execute('UPDATE journaux_comptables SET libelle = ?, type = ? WHERE code = ?', [libelle, type, code]);
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        await pool.execute(
          'INSERT INTO journaux_comptables (code, libelle, type) VALUES (?, ?, ?)',
          [code, libelle, type]
        );
        results.imported++;
      }
    } catch (err) {
      results.errors.push({ line: i + 2, error: err.message });
    }
  }

  return results;
}

/**
 * Import des Écritures Comptables depuis Sage
 */
async function importEcritures(data, mapping, options = {}) {
  const { dryRun = false, exerciceId = null } = options;
  const results = { imported: 0, skipped: 0, errors: [], totalDebit: 0, totalCredit: 0 };

  // Récupérer l'exercice actif
  let exId = exerciceId;
  if (!exId) {
    const [exercices] = await pool.execute("SELECT id FROM exercices WHERE statut = 'ouvert' LIMIT 1");
    exId = exercices[0]?.id;
  }
  if (!exId) throw new Error('Aucun exercice comptable ouvert. Créez un exercice avant d\'importer.');

  // Grouper les écritures par pièce/date pour maintenir l'équilibre
  const groupes = {};
  for (const row of data) {
    const transformed = transformRow(row, mapping);
    const key = `${transformed.journal || 'OD'}_${transformed.numero_piece || 'SANS'}_${transformed.date || ''}`;
    if (!groupes[key]) groupes[key] = [];
    groupes[key].push(transformed);
  }

  for (const [key, lignes] of Object.entries(groupes)) {
    try {
      let totalDebit = 0, totalCredit = 0;
      const ecritures = [];

      for (const ligne of lignes) {
        const debit = parseFloat(String(ligne.debit || '0').replace(/\s/g, '').replace(',', '.')) || 0;
        const credit = parseFloat(String(ligne.credit || '0').replace(/\s/g, '').replace(',', '.')) || 0;
        const compte = ligne.compte;

        if (!compte) continue;

        // Parser la date (formats Sage : DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY)
        let dateEcriture = parseSageDate(ligne.date);

        totalDebit += debit;
        totalCredit += credit;

        ecritures.push({
          journal_code: ligne.journal || 'OD',
          date_ecriture: dateEcriture,
          numero_piece: ligne.numero_piece || null,
          compte_code: compte,
          libelle: ligne.libelle || '',
          debit,
          credit,
          tiers: ligne.tiers || null,
        });
      }

      results.totalDebit += totalDebit;
      results.totalCredit += totalCredit;

      if (ecritures.length === 0) { results.skipped++; continue; }
      if (dryRun) { results.imported += ecritures.length; continue; }

      // Vérifier l'équilibre
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        results.errors.push({
          piece: key,
          error: `Écriture déséquilibrée : Débit=${totalDebit.toFixed(2)}, Crédit=${totalCredit.toFixed(2)}`,
          lignes: ecritures.length,
        });
        continue;
      }

      // Insérer les lignes d'écriture
      for (const ec of ecritures) {
        // Vérifier que le compte existe, sinon créer automatiquement
        const [compteExists] = await pool.execute('SELECT id FROM plan_comptable WHERE code = ?', [ec.compte_code]);
        if (compteExists.length === 0) {
          const classe = parseInt(ec.compte_code.charAt(0)) || 0;
          let type = 'actif';
          if ([1].includes(classe)) type = 'passif';
          else if ([6].includes(classe)) type = 'charge';
          else if ([7].includes(classe)) type = 'produit';
          
          await pool.execute(
            'INSERT INTO plan_comptable (code, libelle, classe, type, is_detail, is_active) VALUES (?, ?, ?, ?, 1, 1)',
            [ec.compte_code, ec.libelle || `Compte ${ec.compte_code}`, classe, type]
          );
        }

        // Vérifier que le journal existe
        const [journalExists] = await pool.execute('SELECT id FROM journaux_comptables WHERE code = ?', [ec.journal_code]);
        if (journalExists.length === 0) {
          await pool.execute(
            "INSERT INTO journaux_comptables (code, libelle, type) VALUES (?, ?, 'operations_diverses')",
            [ec.journal_code, `Journal ${ec.journal_code}`]
          );
        }

        await pool.execute(
          `INSERT INTO ecritures_comptables 
           (exercice_id, journal_code, date_ecriture, numero_piece, compte_code, libelle, debit, credit, statut, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'validee', 'import_sage')`,
          [exId, ec.journal_code, ec.date_ecriture, ec.numero_piece, ec.compte_code, ec.libelle, ec.debit, ec.credit]
        );
        results.imported++;
      }
    } catch (err) {
      results.errors.push({ piece: key, error: err.message });
    }
  }

  return results;
}

/**
 * Import des Clients depuis Sage (Tiers type client)
 */
async function importClients(data, mapping, options = {}) {
  const { overwrite = false, dryRun = false, userId = null } = options;
  const results = { imported: 0, skipped: 0, errors: [], updated: 0 };

  // Récupérer un user_id par défaut (admin) si non fourni
  let defaultUserId = userId;
  if (!defaultUserId && !dryRun) {
    const [users] = await pool.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (users.length > 0) {
      defaultUserId = users[0].id;
    } else {
      // Créer un ID système si pas d'admin
      defaultUserId = 'system-import-sage';
    }
  }

  for (let i = 0; i < data.length; i++) {
    try {
      const row = transformRow(data[i], mapping);
      const nom = row.nom;
      if (!nom) { results.skipped++; continue; }

      const phone = row.telephone || '';
      const email = row.email || '';
      const address = row.adresse || '';
      const city = row.ville || 'Dakar';
      const ninea = row.ninea || '';
      const rc = row.rc || '';
      const company = ninea || rc ? nom : null; // Stocker le nom comme company si c'est une entreprise
      const taxNumber = ninea || null;

      // Déterminer le type de client
      // Types valides: 'occasionnel','simple','quotataire','revendeur'
      let customerType = 'simple'; // Valeur par défaut
      const t = (row.type || '').toLowerCase();
      if (t.includes('occasionnel') || t.includes('particulier') || t.includes('ponctuel')) {
        customerType = 'occasionnel';
      } else if (t.includes('quotataire') || t.includes('quota') || t.includes('gros')) {
        customerType = 'quotataire';
      } else if (t.includes('revendeur') || t.includes('distributeur') || t.includes('grossiste')) {
        customerType = 'revendeur';
      } else if (t.includes('entreprise') || t.includes('société') || t.includes('pro') || t === '1' || ninea || rc) {
        customerType = 'simple'; // Les entreprises sont des clients "simples" (réguliers)
      }

      if (dryRun) { results.imported++; continue; }

      // Vérifier doublon par nom ou téléphone
      let existQuery = 'SELECT id FROM customers WHERE name = ?';
      let existParams = [nom];
      if (phone) {
        existQuery += ' OR phone = ?';
        existParams.push(phone);
      }

      const [existing] = await pool.execute(existQuery, existParams);

      if (existing.length > 0) {
        if (overwrite) {
          await pool.execute(
            'UPDATE customers SET phone = ?, email = ?, address = ?, city = ?, customer_type = ?, company = ?, tax_number = ? WHERE id = ?',
            [phone || null, email || null, address || null, city, customerType, company, taxNumber, existing[0].id]
          );
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        const id = require('uuid').v4();
        await pool.execute(
          `INSERT INTO customers (id, user_id, name, phone, email, address, city, customer_type, company, tax_number, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'actif', NOW())`,
          [id, defaultUserId, nom, phone || null, email || null, address || null, city, customerType, company, taxNumber]
        );
        results.imported++;
      }
    } catch (err) {
      results.errors.push({ line: i + 2, error: err.message, name: data[i]?.nom || data[i]?.Nom });
    }
  }

  return results;
}

/**
 * Import des Fournisseurs depuis Sage
 */
async function importFournisseurs(data, mapping, options = {}) {
  const { overwrite = false, dryRun = false } = options;
  const results = { imported: 0, skipped: 0, errors: [], updated: 0 };

  for (let i = 0; i < data.length; i++) {
    try {
      const row = transformRow(data[i], mapping);
      const nom = row.nom;
      if (!nom) { results.skipped++; continue; }

      const phone = row.telephone || '';
      const email = row.email || '';
      const address = row.adresse || '';

      if (dryRun) { results.imported++; continue; }

      const [existing] = await pool.execute('SELECT id FROM suppliers WHERE name = ?', [nom]);

      if (existing.length > 0) {
        if (overwrite) {
          await pool.execute(
            'UPDATE suppliers SET phone = ?, email = ?, address = ? WHERE id = ?',
            [phone || null, email || null, address || null, existing[0].id]
          );
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        const id = require('uuid').v4();
        await pool.execute(
          `INSERT INTO suppliers (id, name, phone, email, address, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
          [id, nom, phone || null, email || null, address || null]
        );
        results.imported++;
      }
    } catch (err) {
      results.errors.push({ line: i + 2, error: err.message });
    }
  }

  return results;
}

/**
 * Import des Articles/Produits depuis Sage
 */
async function importArticles(data, mapping, options = {}) {
  const { overwrite = false, dryRun = false } = options;
  const results = { imported: 0, skipped: 0, errors: [], updated: 0 };

  for (let i = 0; i < data.length; i++) {
    try {
      const row = transformRow(data[i], mapping);
      const designation = row.designation || row.reference;
      if (!designation) { results.skipped++; continue; }

      const reference = row.reference || designation.substring(0, 20).toUpperCase().replace(/\s/g, '_');
      const prixVente = parseFloat(String(row.prix_vente || '0').replace(/\s/g, '').replace(',', '.')) || 0;
      const prixAchat = parseFloat(String(row.prix_achat || '0').replace(/\s/g, '').replace(',', '.')) || 0;
      const unite = row.unite || 'm³';
      const stock = parseInt(row.stock || '0') || 0;

      // Déterminer la catégorie
      let categoryId = null;
      if (row.famille) {
        const [cats] = await pool.execute('SELECT id FROM categories WHERE name LIKE ?', [`%${row.famille}%`]);
        if (cats.length > 0) categoryId = cats[0].id;
      }

      if (dryRun) { results.imported++; continue; }

      const [existing] = await pool.execute('SELECT id FROM products WHERE name = ? OR sku = ?', [designation, reference]);

      if (existing.length > 0) {
        if (overwrite) {
          await pool.execute(
            'UPDATE products SET price = ?, cost_price = ?, unit = ?, stock_quantity = ? WHERE id = ?',
            [prixVente, prixAchat, unite, stock, existing[0].id]
          );
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        const id = require('uuid').v4();
        await pool.execute(
          `INSERT INTO products (id, name, sku, price, cost_price, unit, stock_quantity, min_stock, category_id, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 10, ?, 'active', NOW())`,
          [id, designation, reference, prixVente, prixAchat, unite, stock, categoryId]
        );
        results.imported++;
      }
    } catch (err) {
      results.errors.push({ line: i + 2, error: err.message });
    }
  }

  return results;
}

/**
 * Import des Règlements/Paiements depuis Sage
 */
async function importReglements(data, mapping, options = {}) {
  const { dryRun = false } = options;
  const results = { imported: 0, skipped: 0, errors: [], totalMontant: 0 };

  // Mapping modes de paiement Sage → Allo Béton
  const modeMap = {
    'chèque': 'cheque', 'cheque': 'cheque', 'chq': 'cheque',
    'virement': 'banque', 'vir': 'banque', 'virment': 'banque',
    'espèces': 'especes', 'especes': 'especes', 'esp': 'especes', 'caisse': 'especes',
    'cb': 'carte', 'carte': 'carte', 'carte bancaire': 'carte',
    'traite': 'traite', 'lettre de change': 'traite', 'lcr': 'traite',
    'wave': 'wave', 'orange money': 'orange_money', 'om': 'orange_money',
  };

  for (let i = 0; i < data.length; i++) {
    try {
      const row = transformRow(data[i], mapping);
      const montant = parseFloat(String(row.montant || '0').replace(/\s/g, '').replace(',', '.')) || 0;
      if (montant === 0) { results.skipped++; continue; }

      const dateReglement = parseSageDate(row.date);
      const mode = modeMap[(row.mode || '').toLowerCase()] || 'banque';
      const reference = row.reference || row.numero || '';
      const tiers = row.tiers || '';

      results.totalMontant += montant;

      if (dryRun) { results.imported++; continue; }

      // Trouver le client/sale associé si possible
      let saleId = null;
      if (tiers) {
        const [sales] = await pool.execute(
          `SELECT s.id FROM sales s 
           JOIN customers c ON s.customer_id = c.id 
           WHERE c.name LIKE ? AND s.remaining_amount > 0
           ORDER BY s.created_at DESC LIMIT 1`,
          [`%${tiers}%`]
        );
        if (sales.length > 0) saleId = sales[0].id;
      }

      const id = require('uuid').v4();
      await pool.execute(
        `INSERT INTO payments (id, sale_id, amount, payment_method, payment_date, reference, notes, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', NOW())`,
        [id, saleId, montant, mode, dateReglement, reference, `Import Sage - ${tiers}`, ]
      );
      results.imported++;
    } catch (err) {
      results.errors.push({ line: i + 2, error: err.message });
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// IMPORT COMPLET — Fichier Excel multi-onglets
// ═══════════════════════════════════════════════════════════════

/**
 * Import automatique multi-onglets (un fichier Excel Sage complet)
 */
async function importComplet(filePath, options = {}) {
  const parsed = await parseFile(filePath);
  const summary = {
    fichier: path.basename(filePath),
    date_import: new Date().toISOString(),
    resultats: {},
    total_importe: 0,
    total_erreurs: 0,
  };

  // Fonctions d'import par type
  const importFunctions = {
    plan_comptable: importPlanComptable,
    journaux: importJournaux,
    ecritures: importEcritures,
    clients: importClients,
    fournisseurs: importFournisseurs,
    articles: importArticles,
    reglements: importReglements,
  };

  if (parsed.sheets) {
    // Fichier Excel multi-onglets
    for (const [sheetName, data] of Object.entries(parsed.sheets)) {
      if (data.length === 0) continue;
      const columns = Object.keys(data[0]);
      const detection = detectDataType(columns);
      
      if (detection.type === 'inconnu' || detection.confidence < 3) {
        summary.resultats[sheetName] = { status: 'ignoré', reason: 'Type non reconnu', confidence: detection.confidence };
        continue;
      }

      const mapping = mapColumns(columns, detection.type);
      const importFn = importFunctions[detection.type];
      
      if (importFn) {
        const result = await importFn(data, mapping, options);
        summary.resultats[sheetName] = { type: detection.type, ...result };
        summary.total_importe += (result.imported || 0) + (result.updated || 0);
        summary.total_erreurs += (result.errors || []).length;
      }
    }
  } else if (parsed.data) {
    // Fichier simple (CSV, TXT)
    const columns = Object.keys(parsed.data[0] || {});
    const detection = detectDataType(columns);
    const mapping = mapColumns(columns, detection.type);
    const importFn = importFunctions[detection.type];

    if (importFn) {
      const result = await importFn(parsed.data, mapping, options);
      summary.resultats['données'] = { type: detection.type, ...result };
      summary.total_importe += (result.imported || 0) + (result.updated || 0);
      summary.total_erreurs += (result.errors || []).length;
    } else {
      summary.resultats['données'] = { status: 'erreur', reason: `Type non reconnu: ${detection.type}` };
    }
  }

  return summary;
}

// ═══════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════

/**
 * Parse les différents formats de date Sage
 */
function parseSageDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  const d = String(dateStr).trim();
  
  // Format DD/MM/YYYY ou DD-MM-YYYY
  const match1 = d.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (match1) {
    return `${match1[3]}-${match1[2].padStart(2, '0')}-${match1[1].padStart(2, '0')}`;
  }

  // Format YYYY-MM-DD (déjà bon)
  const match2 = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match2) return d;

  // Format YYYYMMDD (Sage compact)
  const match3 = d.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (match3) return `${match3[1]}-${match3[2]}-${match3[3]}`;

  // Format Excel (numérique)
  const num = parseFloat(d);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + num * 86400000);
    return date.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Statistiques de la base Allo Béton actuelle (avant import)
 */
async function getImportStats() {
  const stats = {};

  const queries = {
    comptes: 'SELECT COUNT(*) as count FROM plan_comptable',
    journaux: 'SELECT COUNT(*) as count FROM journaux_comptables',
    ecritures: 'SELECT COUNT(*) as count FROM ecritures_comptables',
    clients: 'SELECT COUNT(*) as count FROM customers',
    fournisseurs: 'SELECT COUNT(*) as count FROM suppliers',
    produits: 'SELECT COUNT(*) as count FROM products',
    paiements: 'SELECT COUNT(*) as count FROM payments',
  };

  for (const [key, sql] of Object.entries(queries)) {
    try {
      const [rows] = await pool.execute(sql);
      stats[key] = rows[0].count;
    } catch {
      stats[key] = 0;
    }
  }

  return stats;
}

/**
 * Historique des imports
 */
async function getImportHistory() {
  try {
    const [rows] = await pool.execute(
      "SELECT source, COUNT(*) as count, MIN(created_at) as first_import, MAX(created_at) as last_import FROM ecritures_comptables WHERE source = 'import_sage' GROUP BY source"
    );
    return rows;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Parsing
  parseFile,
  parseExcel,
  parseCSV,
  parseTXT,

  // Analyse
  analyzeFile,
  detectDataType,
  mapColumns,

  // Import par module
  importPlanComptable,
  importJournaux,
  importEcritures,
  importClients,
  importFournisseurs,
  importArticles,
  importReglements,

  // Import complet
  importComplet,

  // Utilitaires
  getImportStats,
  getImportHistory,
  parseSageDate,

  // Constantes
  SAGE_COLUMN_MAPS,
};
