/**
 * ALLO BÉTON — SERVICE COMPTABILITÉ OHADA / SAGE
 * ================================================
 * Moteur comptable conforme SYSCOHADA révisé (2017)
 * Génération automatique des écritures depuis les opérations métier
 * Grand livre, Balance générale, Compte de résultat, Bilan
 * Déclaration TVA automatique
 * 
 * Compatible BCEAO / UEMOA / Zone franc CFA
 */

const pool = require('../db');

// ═══════════════════════════════════════════════════════════════
// 1. PLAN COMPTABLE — CRUD
// ═══════════════════════════════════════════════════════════════

async function getPlanComptable(classe = null) {
  let sql = 'SELECT * FROM plan_comptable WHERE is_active = 1';
  const params = [];
  if (classe) {
    sql += ' AND classe = ?';
    params.push(classe);
  }
  sql += ' ORDER BY code';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getCompte(code) {
  const [rows] = await pool.execute('SELECT * FROM plan_comptable WHERE code = ?', [code]);
  return rows[0] || null;
}

async function createCompte({ code, libelle, classe, type, parent_code, is_detail }) {
  await pool.execute(
    'INSERT INTO plan_comptable (code, libelle, classe, type, parent_code, is_detail) VALUES (?, ?, ?, ?, ?, ?)',
    [code, libelle, classe, type, parent_code || null, is_detail !== false]
  );
  return { code, libelle, classe, type };
}

// ═══════════════════════════════════════════════════════════════
// 2. ÉCRITURES COMPTABLES — Saisie & Validation
// ═══════════════════════════════════════════════════════════════

async function createEcriture({ journal_code, date_ecriture, numero_piece, lignes, created_by }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── Vérifier l'équilibre débit = crédit ──
    let totalDebit = 0, totalCredit = 0;
    for (const l of lignes) {
      totalDebit += parseFloat(l.debit || 0);
      totalCredit += parseFloat(l.credit || 0);
    }
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Écriture déséquilibrée : Débit=${totalDebit}, Crédit=${totalCredit}`);
    }

    // ── Validation A2 : journal existe et est actif ──
    const [jRows] = await conn.execute(
      'SELECT code, is_active FROM journaux_comptables WHERE code = ?', [journal_code]
    );
    if (!jRows.length) throw new Error(`Journal inconnu : ${journal_code}`);
    if (jRows[0].is_active === 0) throw new Error(`Journal ${journal_code} désactivé`);

    // ── Validation A1+A3 : tous les comptes existent et sont des comptes de détail ──
    const comptesDistincts = [...new Set(lignes.map(l => l.compte_code))];
    const placeholders = comptesDistincts.map(() => '?').join(',');
    const [cRows] = await conn.execute(
      `SELECT code, is_detail, is_active FROM plan_comptable WHERE code IN (${placeholders})`,
      comptesDistincts
    );
    const comptesMap = Object.fromEntries(cRows.map(c => [c.code, c]));
    for (const code of comptesDistincts) {
      const c = comptesMap[code];
      if (!c) throw new Error(`Compte inexistant : ${code}`);
      if (c.is_active === 0) throw new Error(`Compte ${code} désactivé`);
      if (c.is_detail === 0) throw new Error(`Compte ${code} est un compte de regroupement — saisie interdite (utiliser un sous-compte)`);
    }

    const exercice = new Date(date_ecriture).getFullYear();

    // ── Blocage exercice clôturé (Art. 18 AUDCIF) ──
    const [exRows] = await conn.execute(
      'SELECT statut FROM exercices WHERE annee = ?', [exercice]
    );
    if (exRows.length > 0 && exRows[0].statut === 'cloture') {
      throw new Error(`Exercice ${exercice} clôturé — saisie interdite`);
    }

    // ── Numérotation séquentielle par journal + exercice (Art. 16 AUCIMA) ──
    const [maxNum] = await conn.execute(
      `SELECT MAX(CAST(SUBSTRING_INDEX(numero_ecriture, '-', -1) AS UNSIGNED)) as max_num
       FROM ecritures_comptables WHERE journal_code = ? AND exercice_annee = ?`,
      [journal_code, exercice]
    );
    const nextNum = (maxNum[0].max_num || 0) + 1;
    const numeroEcriture = `${journal_code}${exercice}-${String(nextNum).padStart(5, '0')}`;

    const ids = [];

    for (const l of lignes) {
      const [result] = await conn.execute(
        `INSERT INTO ecritures_comptables 
         (numero_ecriture, journal_code, date_ecriture, numero_piece, compte_code, libelle, debit, credit, exercice_annee, reference_type, reference_id, created_by, section_analytique)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          numeroEcriture,
          journal_code,
          date_ecriture,
          numero_piece || null,
          l.compte_code,
          l.libelle,
          parseFloat(l.debit || 0),
          parseFloat(l.credit || 0),
          exercice,
          l.reference_type || null,
          l.reference_id || null,
          created_by || null,
          l.section_analytique || null
        ]
      );
      ids.push(result.insertId);
    }

    await conn.commit();
    return { success: true, ids, numero_ecriture: numeroEcriture, totalDebit, totalCredit };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// ═══════════════════════════════════════════════════════════════
// 2b. VALIDATION & CONTRE-PASSATION (Art. 17 AUCIMA)
// ═══════════════════════════════════════════════════════════════

async function validerEcritures(ids) {
  if (!ids || !ids.length) throw new Error('Aucun ID fourni');
  const placeholders = ids.map(() => '?').join(',');
  // Vérifier qu'aucune n'est déjà validée
  const [already] = await pool.execute(
    `SELECT id FROM ecritures_comptables WHERE id IN (${placeholders}) AND is_validated = 1`, ids
  );
  if (already.length > 0) throw new Error(`${already.length} écriture(s) déjà validée(s)`);
  const [r] = await pool.execute(
    `UPDATE ecritures_comptables SET is_validated = 1 WHERE id IN (${placeholders})`, ids
  );
  return { validated: r.affectedRows };
}

async function contrePasserEcriture(numero_ecriture) {
  if (!numero_ecriture) throw new Error('numero_ecriture requis');
  // Lire les lignes de l'écriture originale
  const [lignes] = await pool.execute(
    'SELECT * FROM ecritures_comptables WHERE numero_ecriture = ?', [numero_ecriture]
  );
  if (!lignes.length) throw new Error('Écriture non trouvée');
  if (lignes.some(l => l.is_validated === 0)) throw new Error('Validez d\'abord l\'écriture avant de contre-passer');
  
  // Créer écriture inverse dans le même journal
  const orig = lignes[0];
  const lignesInverse = lignes.map(l => ({
    compte_code: l.compte_code,
    libelle: `CP: ${l.libelle}`,
    debit: parseFloat(l.credit),
    credit: parseFloat(l.debit),
    reference_type: 'contrepassation',
    reference_id: numero_ecriture
  }));

  return createEcriture({
    journal_code: orig.journal_code,
    date_ecriture: new Date().toISOString().split('T')[0],
    numero_piece: `CP-${orig.numero_piece || numero_ecriture}`,
    lignes: lignesInverse,
    created_by: null
  });
}

// ═══════════════════════════════════════════════════════════════
// 3. MAPPING AUTOMATIQUE — Ventes → Écritures OHADA
// ═══════════════════════════════════════════════════════════════

/**
 * Génère les écritures comptables pour une vente
 * Débit  411 (Client)          = Total TTC
 * Crédit 701-707 (Ventes)      = Total HT
 * Crédit 4431 (TVA collectée)  = TVA
 */
async function comptabiliserVente(sale) {
  const totalHT = parseFloat(sale.total_amount || sale.subtotal || 0);
  const tva = parseFloat(sale.tax_amount || 0);
  const totalTTC = totalHT + tva;
  
  if (totalTTC <= 0) return null;

  const compteVente = mapProductToCompte(sale.product_type || sale.product_name);
  const dateVente = sale.sale_date || sale.created_at || new Date().toISOString().split('T')[0];

  const lignes = [
    { compte_code: '411', libelle: `Vente ${sale.sale_number || ''} - ${sale.customer_name || 'Client'}`, debit: totalTTC, credit: 0, reference_type: 'sale', reference_id: sale.id },
    { compte_code: compteVente, libelle: `Vente ${sale.sale_number || ''} - ${sale.customer_name || 'Client'}`, debit: 0, credit: totalHT, reference_type: 'sale', reference_id: sale.id },
  ];

  if (tva > 0) {
    lignes.push({ compte_code: '4431', libelle: `TVA Vente ${sale.sale_number || ''}`, debit: 0, credit: tva, reference_type: 'sale', reference_id: sale.id });
  }

  return createEcriture({
    journal_code: 'VT',
    date_ecriture: dateVente,
    numero_piece: sale.sale_number,
    lignes,
    created_by: sale.user_id
  });
}

/**
 * Génère les écritures pour un paiement client reçu
 * Débit  571/511 (Caisse/Banque) = Montant
 * Crédit 411 (Client)             = Montant
 */
async function comptabiliserPaiement(payment) {
  const montant = parseFloat(payment.amount || 0);
  if (montant <= 0) return null;

  const compteFinancier = mapPaymentMethodToCompte(payment.payment_method);
  const datePaiement = payment.payment_date || payment.created_at || new Date().toISOString().split('T')[0];

  return createEcriture({
    journal_code: compteFinancier === '571' ? 'CA' : 'BQ',
    date_ecriture: datePaiement,
    numero_piece: payment.reference || payment.id,
    lignes: [
      { compte_code: compteFinancier, libelle: `Paiement ${payment.customer_name || ''} - ${payment.reference || ''}`, debit: montant, credit: 0, reference_type: 'payment', reference_id: payment.id },
      { compte_code: '411', libelle: `Paiement ${payment.customer_name || ''} - ${payment.reference || ''}`, debit: 0, credit: montant, reference_type: 'payment', reference_id: payment.id },
    ],
    created_by: payment.user_id
  });
}

/**
 * Génère les écritures pour un mouvement de caisse
 * Recette : Débit 571 Caisse / Crédit 758 (Produit divers)
 * Dépense : Débit 6xx (Charge) / Crédit 571 Caisse
 */
async function comptabiliserMouvementCaisse(mvt) {
  const montant = parseFloat(mvt.amount || 0);
  if (montant <= 0) return null;

  const dateMvt = mvt.date || new Date().toISOString().split('T')[0];

  if (mvt.type === 'recette') {
    const compteProduit = mapCategoryToCompte(mvt.category, 'recette');
    return createEcriture({
      journal_code: 'CA',
      date_ecriture: dateMvt,
      numero_piece: mvt.reference,
      lignes: [
        { compte_code: '571', libelle: `Recette caisse - ${mvt.description || mvt.category}`, debit: montant, credit: 0, reference_type: 'cash_movement', reference_id: mvt.id },
        { compte_code: compteProduit, libelle: `Recette caisse - ${mvt.description || mvt.category}`, debit: 0, credit: montant, reference_type: 'cash_movement', reference_id: mvt.id },
      ],
      created_by: mvt.created_by
    });
  } else {
    const compteCharge = mapCategoryToCompte(mvt.category, 'depense');
    return createEcriture({
      journal_code: 'CA',
      date_ecriture: dateMvt,
      numero_piece: mvt.reference,
      lignes: [
        { compte_code: compteCharge, libelle: `Dépense caisse - ${mvt.description || mvt.category}`, debit: montant, credit: 0, reference_type: 'cash_movement', reference_id: mvt.id },
        { compte_code: '571', libelle: `Dépense caisse - ${mvt.description || mvt.category}`, debit: 0, credit: montant, reference_type: 'cash_movement', reference_id: mvt.id },
      ],
      created_by: mvt.created_by
    });
  }
}

/**
 * Génère les écritures pour un achat fournisseur
 * Débit  601/602 (Achats)       = HT
 * Débit  4451 (TVA déductible)  = TVA
 * Crédit 401 (Fournisseur)      = TTC
 */
async function comptabiliserAchat(purchase) {
  const totalHT = parseFloat(purchase.subtotal || purchase.total_amount || 0);
  const tva = parseFloat(purchase.tax_amount || 0);
  const totalTTC = totalHT + tva;
  
  if (totalTTC <= 0) return null;

  const dateAchat = purchase.order_date || purchase.created_at || new Date().toISOString().split('T')[0];

  const lignes = [
    { compte_code: '601', libelle: `Achat ${purchase.order_number || ''} - ${purchase.supplier_name || 'Fournisseur'}`, debit: totalHT, credit: 0, reference_type: 'purchase_order', reference_id: purchase.id },
    { compte_code: '401', libelle: `Achat ${purchase.order_number || ''} - ${purchase.supplier_name || 'Fournisseur'}`, debit: 0, credit: totalTTC, reference_type: 'purchase_order', reference_id: purchase.id },
  ];

  if (tva > 0) {
    lignes.push({ compte_code: '4451', libelle: `TVA déductible achat ${purchase.order_number || ''}`, debit: tva, credit: 0, reference_type: 'purchase_order', reference_id: purchase.id });
  }

  return createEcriture({
    journal_code: 'AC',
    date_ecriture: dateAchat,
    numero_piece: purchase.order_number,
    lignes,
    created_by: purchase.user_id
  });
}

/**
 * Génère les écritures pour un salaire
 * Débit  661 (Salaires)          = Brut
 * Crédit 421 (Personnel dues)    = Net
 * Crédit 431 (Charges sociales)  = Cotisations
 */
async function comptabiliserSalaire(salary) {
  const brut = parseFloat(salary.gross_salary || salary.base_salary || 0);
  const net = parseFloat(salary.net_salary || 0);
  const charges = brut - net;
  
  if (brut <= 0) return null;

  const dateSalaire = salary.pay_date || salary.created_at || new Date().toISOString().split('T')[0];

  const lignes = [
    { compte_code: '661', libelle: `Salaire ${salary.employee_name || ''} - ${salary.period || ''}`, debit: brut, credit: 0, reference_type: 'salary', reference_id: salary.id },
    { compte_code: '421', libelle: `Net à payer ${salary.employee_name || ''}`, debit: 0, credit: net, reference_type: 'salary', reference_id: salary.id },
  ];

  if (charges > 0) {
    lignes.push({ compte_code: '431', libelle: `Charges sociales ${salary.employee_name || ''}`, debit: 0, credit: charges, reference_type: 'salary', reference_id: salary.id });
  }

  return createEcriture({
    journal_code: 'SL',
    date_ecriture: dateSalaire,
    numero_piece: `SAL-${salary.id}`,
    lignes,
    created_by: salary.user_id
  });
}

/**
 * Génère les écritures pour un avoir / credit note
 * Débit  701-707 (Ventes)        = HT
 * Débit  4431 (TVA collectée)    = TVA
 * Crédit 411 (Client)             = TTC
 */
async function comptabiliserAvoir(creditNote) {
  const totalHT = parseFloat(creditNote.subtotal || creditNote.total_amount || 0);
  const tva = parseFloat(creditNote.tax_amount || 0);
  const totalTTC = totalHT + tva;
  
  if (totalTTC <= 0) return null;

  const dateAvoir = creditNote.created_at || new Date().toISOString().split('T')[0];

  const lignes = [
    { compte_code: '701', libelle: `Avoir ${creditNote.credit_note_number || ''} - ${creditNote.customer_name || ''}`, debit: totalHT, credit: 0, reference_type: 'credit_note', reference_id: creditNote.id },
    { compte_code: '411', libelle: `Avoir ${creditNote.credit_note_number || ''} - ${creditNote.customer_name || ''}`, debit: 0, credit: totalTTC, reference_type: 'credit_note', reference_id: creditNote.id },
  ];

  if (tva > 0) {
    lignes.push({ compte_code: '4431', libelle: `TVA avoir ${creditNote.credit_note_number || ''}`, debit: tva, credit: 0, reference_type: 'credit_note', reference_id: creditNote.id });
  }

  return createEcriture({
    journal_code: 'VT',
    date_ecriture: dateAvoir,
    numero_piece: creditNote.credit_note_number,
    lignes,
    created_by: creditNote.user_id
  });
}

// ═══════════════════════════════════════════════════════════════
// 4. GRAND LIVRE — Détail par compte
// ═══════════════════════════════════════════════════════════════

async function getGrandLivre({ compte_code, date_debut, date_fin, exercice }) {
  let sql = `
    SELECT e.*, pc.libelle as compte_libelle, pc.classe
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE 1=1
  `;
  const params = [];

  if (compte_code) {
    sql += ' AND e.compte_code LIKE ?';
    params.push(compte_code + '%');
  }
  if (date_debut) {
    sql += ' AND e.date_ecriture >= ?';
    params.push(date_debut);
  }
  if (date_fin) {
    sql += ' AND e.date_ecriture <= ?';
    params.push(date_fin);
  }
  if (exercice) {
    sql += ' AND e.exercice_annee = ?';
    params.push(exercice);
  }

  sql += ' ORDER BY e.compte_code, e.date_ecriture, e.id';

  const [rows] = await pool.execute(sql, params);

  // ── Report à nouveau (solde N-1) pour comptes de bilan (classes 1-5) ──
  const anneeN = exercice || new Date().getFullYear();
  const anneeN1 = parseInt(anneeN) - 1;
  const [ran] = await pool.execute(`
    SELECT e.compte_code, SUM(e.debit) as d, SUM(e.credit) as c
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.exercice_annee = ? AND pc.classe IN (1,2,3,4,5)
    GROUP BY e.compte_code
  `, [anneeN1]);
  const reportMap = {};
  for (const r of ran) {
    reportMap[r.compte_code] = parseFloat(r.d) - parseFloat(r.c);
  }

  // Grouper par compte avec solde progressif
  const comptes = {};
  for (const row of rows) {
    if (!comptes[row.compte_code]) {
      const ran_solde = reportMap[row.compte_code] || 0;
      comptes[row.compte_code] = {
        code: row.compte_code,
        numero_compte: row.compte_code,
        libelle: row.compte_libelle,
        classe: row.classe,
        ecritures: [],
        mouvements: [],
        report_a_nouveau: ran_solde,
        total_debit: 0,
        total_credit: 0,
        solde: ran_solde
      };
    }
    const c = comptes[row.compte_code];
    c.total_debit += parseFloat(row.debit);
    c.total_credit += parseFloat(row.credit);
    c.solde = c.report_a_nouveau + c.total_debit - c.total_credit;
    row.solde_progressif = c.solde;
    c.ecritures.push(row);
    c.mouvements.push(row);
  }

  return Object.values(comptes);
}

// ═══════════════════════════════════════════════════════════════
// 5. BALANCE GÉNÉRALE
// ═══════════════════════════════════════════════════════════════

async function getBalanceGenerale({ exercice, date_fin }) {
  const annee = exercice || new Date().getFullYear();
  let sql = `
    SELECT 
      e.compte_code as code,
      pc.libelle,
      pc.classe,
      pc.type,
      SUM(e.debit) as total_debit,
      SUM(e.credit) as total_credit,
      SUM(e.debit) - SUM(e.credit) as solde_debiteur,
      CASE WHEN SUM(e.credit) > SUM(e.debit) THEN SUM(e.credit) - SUM(e.debit) ELSE 0 END as solde_crediteur
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.exercice_annee = ?
  `;
  const params = [annee];

  if (date_fin) {
    sql += ' AND e.date_ecriture <= ?';
    params.push(date_fin);
  }

  sql += ' GROUP BY e.compte_code, pc.libelle, pc.classe, pc.type ORDER BY e.compte_code';

  const [rows] = await pool.execute(sql, params);

  let totalDebit = 0, totalCredit = 0;
  for (const r of rows) {
    r.total_debit = parseFloat(r.total_debit);
    r.total_credit = parseFloat(r.total_credit);
    r.solde_debiteur = r.total_debit > r.total_credit ? r.total_debit - r.total_credit : 0;
    r.solde_crediteur = r.total_credit > r.total_debit ? r.total_credit - r.total_debit : 0;
    // Alias pour compatibilité frontend
    r.numero_compte = r.code;
    r.mouvement_debit = r.total_debit;
    r.mouvement_credit = r.total_credit;
    totalDebit += r.total_debit;
    totalCredit += r.total_credit;
  }

  return {
    exercice: annee,
    comptes: rows,
    totaux: {
      total_debit: totalDebit,
      total_credit: totalCredit,
      equilibre: Math.abs(totalDebit - totalCredit) < 0.01
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// 6. COMPTE DE RÉSULTAT (Classes 6 & 7)
// ═══════════════════════════════════════════════════════════════

async function getCompteResultat(exercice) {
  const annee = exercice || new Date().getFullYear();

  // Récupérer tous les soldes par compte (classes 6, 7, 8)
  const [rows] = await pool.execute(`
    SELECT pc.code, pc.libelle, pc.classe, pc.type,
      CASE WHEN pc.classe IN (6,8) AND pc.type IN ('charge','impot','hao')
        THEN SUM(e.debit) - SUM(e.credit)
        ELSE SUM(e.credit) - SUM(e.debit)
      END as montant
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.exercice_annee = ? AND pc.classe IN (6, 7, 8)
    GROUP BY pc.code, pc.libelle, pc.classe, pc.type
    ORDER BY pc.code
  `, [annee]);

  const parse = r => ({ ...r, montant: parseFloat(r.montant || 0) });
  const allRows = rows.map(parse);
  const sum = (arr) => arr.reduce((s, r) => s + r.montant, 0);
  const prefix = (p) => allRows.filter(r => r.code.startsWith(p));

  // Charges classe 6
  const charges = allRows.filter(r => r.classe === 6);
  // Produits classe 7
  const produits = allRows.filter(r => r.classe === 7);

  // ── 9 SOLDES INTERMÉDIAIRES DE GESTION (SIG) SYSCOHADA ──

  // 1. Marge commerciale = Ventes marchandises (701) − Achats marchandises (601) − Δ stock (6031)
  const ventesMarch = sum(prefix('701'));
  const achatsMarch = sum(prefix('601'));
  const varStockMarch = sum(prefix('6031'));
  const margeCommerciale = ventesMarch - achatsMarch - varStockMarch;

  // 2. Production de l'exercice = 702+703+704+705+706+707 + 72 (prod immob) + 73 (prod stockée) + 74 (subv exploit)
  //    NB: le 707 (produits accessoires) est inclus ici selon SYSCOHADA Révisé
  const productionVendue = sum(prefix('702')) + sum(prefix('703')) + sum(prefix('704'))
    + sum(prefix('705')) + sum(prefix('706')) + sum(prefix('707'));
  const productionStockee = sum(prefix('73'));
  const productionImmobilisee = sum(prefix('72'));
  const productionExercice = productionVendue + productionStockee + productionImmobilisee;

  // 3. Valeur Ajoutée = Marge commerciale + Production − Consommations intermédiaires (602-608, 61, 62)
  const consommations = sum(prefix('602')) + sum(prefix('603')) + sum(prefix('604')) + sum(prefix('605'))
    + sum(prefix('606')) + sum(prefix('607')) + sum(prefix('608'))
    + sum(prefix('61')) + sum(prefix('62'));
  const valeurAjoutee = margeCommerciale + productionExercice - consommations;

  // 4. EBE = VA + Subventions (71) − Charges personnel (66) − Impôts/taxes (64)
  const subventions = sum(prefix('71'));
  const chargesPersonnel = sum(prefix('66'));
  const impotsTaxes = sum(prefix('64'));
  const ebe = valeurAjoutee + subventions - chargesPersonnel - impotsTaxes;

  // 5. Résultat d'Exploitation = EBE + Reprises (791+798+799) + Transferts (781)
  //    − Dotations (681+691) − Autres charges (65) + Autres produits (75)
  const reprises = sum(prefix('791')) + sum(prefix('798')) + sum(prefix('799'));
  const transfertsCharges = sum(prefix('781'));
  const dotations = sum(prefix('681')) + sum(prefix('691'));
  const autresCharges = sum(prefix('65'));
  const autresProduits = sum(prefix('75'));
  const resultatExploitation = ebe + reprises + transfertsCharges - dotations - autresCharges + autresProduits;

  // 6. Résultat Financier = Produits financiers (77) − Charges financières (67)
  const produitsFinanciers = sum(prefix('77'));
  const chargesFinancieres = sum(prefix('67'));
  const resultatFinancier = produitsFinanciers - chargesFinancieres;

  // 7. Résultat des Activités Ordinaires (RAO)
  const rao = resultatExploitation + resultatFinancier;

  // 8. Résultat HAO = Produits HAO (84, 86, 88, 82) − Charges HAO (81, 83, 85)
  const haoRows = allRows.filter(r => r.classe === 8 && r.type === 'hao');
  const produitsHAO = haoRows.filter(r => ['82','84','86','88'].some(p => r.code.startsWith(p)));
  const chargesHAO = haoRows.filter(r => ['81','83','85'].some(p => r.code.startsWith(p)));
  const resultatHAO = sum(produitsHAO) - sum(chargesHAO);

  // 9. Résultat Net = RAO + Résultat HAO − Impôts sur résultat (89)
  const impotResultat = sum(allRows.filter(r => r.code.startsWith('89')));
  let resultatNet = rao + resultatHAO - impotResultat;

  const totalCharges = sum(charges);
  const totalProduits = sum(produits);

  // ── GARDE-FOU : résultat net doit être égal à (produits - charges - impôt) ──
  // Si écart détecté, il y a des comptes non pris en compte dans les SIG : on rectifie
  const resultatReel = totalProduits - totalCharges + resultatHAO - impotResultat;
  if (Math.abs(resultatNet - resultatReel) > 1) {
    console.warn(`[getCompteResultat] Écart SIG vs résultat réel: SIG=${resultatNet}, Réel=${resultatReel}. Utilisation du résultat réel.`);
    resultatNet = resultatReel;
  }

  return {
    exercice: annee,
    charges: charges,
    produits: produits,
    total_charges: totalCharges,
    total_produits: totalProduits,
    resultat_net: resultatNet,
    type: resultatNet >= 0 ? 'Bénéfice' : 'Perte',
    // SIG SYSCOHADA
    sig: {
      marge_commerciale: margeCommerciale,
      production_exercice: productionExercice,
      valeur_ajoutee: valeurAjoutee,
      ebe: ebe,
      resultat_exploitation: resultatExploitation,
      resultat_financier: resultatFinancier,
      rao: rao,
      resultat_hao: resultatHAO,
      impot_resultat: impotResultat,
      resultat_net: resultatNet
    },
    hao: { produits: produitsHAO, charges: chargesHAO },
    impot: impotResultat
  };
}

// ═══════════════════════════════════════════════════════════════
// 7. BILAN COMPTABLE OHADA (Classes 1-5)
// ═══════════════════════════════════════════════════════════════

async function getBilan(exercice) {
  const annee = exercice || new Date().getFullYear();

  // Actifs BRUTS (classes 2, 3, 4-actif, 5-actif) — EXCLUSION des comptes d'amort/déprec (28x, 29x, 39x, 49x, 59x)
  const [actifs] = await pool.execute(`
    SELECT pc.code, pc.libelle, pc.classe,
      SUM(e.debit) - SUM(e.credit) as montant
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.exercice_annee = ? AND pc.type = 'actif'
      AND pc.code NOT LIKE '28%' AND pc.code NOT LIKE '29%'
      AND pc.code NOT LIKE '39%' AND pc.code NOT LIKE '49%' AND pc.code NOT LIKE '59%'
    GROUP BY pc.code, pc.libelle, pc.classe
    HAVING montant != 0
    ORDER BY pc.code
  `, [annee]);

  // AMORTISSEMENTS & DÉPRÉCIATIONS (pour colonne Amort du bilan)
  const [amortissements] = await pool.execute(`
    SELECT pc.code, pc.libelle, pc.classe,
      SUM(e.credit) - SUM(e.debit) as montant
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.exercice_annee = ? AND (
      pc.code LIKE '28%' OR pc.code LIKE '29%' OR
      pc.code LIKE '39%' OR pc.code LIKE '49%' OR pc.code LIKE '59%'
    )
    GROUP BY pc.code, pc.libelle, pc.classe
    HAVING montant != 0
  `, [annee]);

  // Map code_immobilisation → montant amort (ex: 281 → amort de 21x)
  const amortMap = {};
  for (const a of amortissements) {
    // Code 281 amortit 21, 282 amortit 22, etc. / 391 amortit 31, 491 amortit 41
    const code = a.code;
    let prefix = code.substring(1, 2); // 2 dans 281
    let classeImmo = code[0] === '2' ? '2' + prefix : code[0] === '3' ? '3' + prefix : '4' + prefix;
    if (!amortMap[classeImmo]) amortMap[classeImmo] = 0;
    amortMap[classeImmo] += parseFloat(a.montant);
  }

  // Passifs (classes 1, 4-passif, 5-passif)
  const [passifs] = await pool.execute(`
    SELECT pc.code, pc.libelle, pc.classe,
      SUM(e.credit) - SUM(e.debit) as montant
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.exercice_annee = ? AND pc.type = 'passif'
    GROUP BY pc.code, pc.libelle, pc.classe
    HAVING montant != 0
    ORDER BY pc.code
  `, [annee]);

  const compteResultat = await getCompteResultat(annee);
  const parse = a => ({ ...a, montant: parseFloat(a.montant || 0) });
  const pActifs = actifs.map(parse);
  const pPassifs = passifs.map(parse);
  const sumF = arr => arr.reduce((s, a) => s + a.montant, 0);

  // Helper : retrouver l'amort/dépréciation cumulé pour un compte d'actif
  // Règles SYSCOHADA par sous-classe :
  //   Compte 2XY...  → amorti par 28XY... ou déprécié par 29XY...
  //   Compte 3XY...  → déprécié par 39XY...
  //   Compte 4XY...  → déprécié par 49XY...
  //   Compte 5XY...  → déprécié par 59XY...
  // ex: 2411 (matériel industriel) → amorti par 2841 ; 2451 → 2845
  const getAmortForCode = code => {
    if (!code || code.length < 3) return 0;
    const classe = code[0];
    // Clé de correspondance : 2 chiffres après la classe (ex: 2411 → '41', 2451 → '45')
    const cle = code.substring(1, 3);
    let prefixAmort;
    if (classe === '2') prefixAmort = ['28' + cle, '29' + cle];
    else if (classe === '3') prefixAmort = ['39' + cle];
    else if (classe === '4') prefixAmort = ['49' + cle];
    else if (classe === '5') prefixAmort = ['59' + cle];
    else return 0;

    let total = 0;
    for (const a of amortissements) {
      if (prefixAmort.some(p => a.code.startsWith(p))) {
        total += parseFloat(a.montant);
      }
    }
    return total;
  };

  // ── Références OHADA normalisées ──
  // ACTIF avec amortissements
  const bilanActif = [
    { ref: 'AD', categorie: 'ACTIF IMMOBILISÉ', items: pActifs.filter(a => a.classe === 2).map(a => ({ ref: a.code.startsWith('21') ? 'AE' : a.code.startsWith('22') ? 'AF' : a.code.startsWith('23') ? 'AG' : a.code.startsWith('24') ? 'AH' : a.code.startsWith('25') ? 'AI' : a.code.startsWith('26') ? 'AJ' : a.code.startsWith('27') ? 'AK' : 'AL', code: a.code, libelle: a.libelle, brut: a.montant, amort: getAmortForCode(a.code) })) },
    { ref: 'BA', categorie: 'ACTIF CIRCULANT', items: pActifs.filter(a => a.classe === 3 || a.classe === 4).map(a => ({ ref: a.classe === 3 ? 'BB' : a.code.startsWith('41') ? 'BH' : a.code.startsWith('42') ? 'BI' : 'BJ', code: a.code, libelle: a.libelle, brut: a.montant, amort: getAmortForCode(a.code) })) },
    { ref: 'BQ', categorie: 'TRÉSORERIE-ACTIF', items: pActifs.filter(a => a.classe === 5).map(a => ({ ref: a.code.startsWith('52') ? 'BR' : 'BS', code: a.code, libelle: a.libelle, brut: a.montant, amort: getAmortForCode(a.code) })) },
  ];

  // PASSIF
  const bilanPassif = [
    { ref: 'CA', categorie: 'CAPITAUX PROPRES', items: [
      ...pPassifs.filter(p => p.classe === 1).map(p => ({ ref: p.code.startsWith('10') ? 'CA' : p.code.startsWith('11') ? 'CB' : p.code.startsWith('12') ? 'CD' : 'CE', code: p.code, libelle: p.libelle, montant: p.montant })),
      ...(compteResultat.resultat_net !== 0 ? [{ ref: 'CF', code: '13', libelle: "Résultat net de l'exercice", montant: compteResultat.resultat_net }] : [])
    ] },
    { ref: 'DA', categorie: 'DETTES FINANCIÈRES', items: pPassifs.filter(p => p.classe === 1 && (p.code.startsWith('16') || p.code.startsWith('17'))).map(p => ({ ref: p.code.startsWith('16') ? 'DA' : 'DB', code: p.code, libelle: p.libelle, montant: p.montant })) },
    { ref: 'DH', categorie: 'PASSIF CIRCULANT', items: pPassifs.filter(p => p.classe === 4).map(p => ({ ref: p.code.startsWith('40') ? 'DI' : p.code.startsWith('42') ? 'DJ' : p.code.startsWith('43') ? 'DK' : p.code.startsWith('44') ? 'DL' : 'DM', code: p.code, libelle: p.libelle, montant: p.montant })) },
    { ref: 'DQ', categorie: 'TRÉSORERIE-PASSIF', items: pPassifs.filter(p => p.classe === 5).map(p => ({ ref: 'DR', code: p.code, libelle: p.libelle, montant: p.montant })) },
  ];

  // Total actif BRUT et AMORT
  const totalActifBrut = sumF(pActifs);
  const totalAmort = bilanActif.reduce((s, cat) => s + cat.items.reduce((s2, i) => s2 + (i.amort || 0), 0), 0);
  const totalActifNet = totalActifBrut - totalAmort;

  // Report à nouveau = Résultat N-1 (produits - charges de l'exercice précédent)
  // Cette écriture devrait normalement être passée lors de la clôture de N-1
  const [ranRows] = await pool.execute(`
    SELECT pc.classe,
      SUM(e.credit) - SUM(e.debit) AS solde_credit
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.exercice_annee = ? AND pc.classe IN (6, 7)
    GROUP BY pc.classe
  `, [annee - 1]).catch(() => [[]]);
  let ranPassif = 0;
  for (const r of ranRows) {
    if (r.classe === 7) ranPassif += parseFloat(r.solde_credit); // produits
    else if (r.classe === 6) ranPassif -= parseFloat(r.solde_credit); // soustraire charges (solde_credit est négatif pour charges)
  }

  const totalPassif = sumF(pPassifs) + compteResultat.resultat_net + ranPassif;

  return {
    exercice: annee,
    actif: {
      rubriques: bilanActif,
      immobilisations: pActifs.filter(a => a.classe === 2),
      stocks: pActifs.filter(a => a.classe === 3),
      creances: pActifs.filter(a => a.classe === 4),
      tresorerie: pActifs.filter(a => a.classe === 5),
      total_brut: totalActifBrut,
      total_amort: totalAmort,
      total: totalActifNet
    },
    passif: {
      rubriques: bilanPassif,
      capitaux_propres: pPassifs.filter(p => p.classe === 1),
      dettes: pPassifs.filter(p => p.classe === 4),
      tresorerie_passive: pPassifs.filter(p => p.classe === 5),
      resultat_exercice: compteResultat.resultat_net,
      report_a_nouveau: ranPassif,
      total: totalPassif
    },
    equilibre: Math.abs(totalActifNet - totalPassif) < 0.01,
    ecart: totalActifNet - totalPassif
  };
}

// ═══════════════════════════════════════════════════════════════
// 8. DÉCLARATION TVA
// ═══════════════════════════════════════════════════════════════

async function genererDeclarationTVA(periode) {
  // periode = 'YYYY-MM'
  const [year, month] = periode.split('-');
  const dateDebut = `${year}-${month}-01`;
  const dateFin = `${year}-${month}-${new Date(year, month, 0).getDate()}`;

  // TVA collectée — détail par compte 443x
  const [collecteeDetail] = await pool.execute(`
    SELECT e.compte_code as compte, pc.libelle, 
           COALESCE(SUM(e.credit) - SUM(e.debit), 0) as tva,
           0 as base
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.compte_code LIKE '443%' AND e.date_ecriture BETWEEN ? AND ?
    GROUP BY e.compte_code, pc.libelle
  `, [dateDebut, dateFin]);

  // Calculer la base HT pour TVA collectée (CA classe 7)
  const [ca] = await pool.execute(`
    SELECT COALESCE(SUM(credit) - SUM(debit), 0) as montant
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE pc.classe = 7 AND e.date_ecriture BETWEEN ? AND ?
  `, [dateDebut, dateFin]);

  // TVA déductible — détail par compte 445x
  const [deductibleDetail] = await pool.execute(`
    SELECT e.compte_code as compte, pc.libelle,
           COALESCE(SUM(e.debit) - SUM(e.credit), 0) as tva,
           0 as base
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.compte_code LIKE '445%' AND e.date_ecriture BETWEEN ? AND ?
    GROUP BY e.compte_code, pc.libelle
  `, [dateDebut, dateFin]);

  // Achats HT (classe 6, comptes 60x)
  const [achats] = await pool.execute(`
    SELECT COALESCE(SUM(debit) - SUM(credit), 0) as montant
    FROM ecritures_comptables
    WHERE compte_code LIKE '60%' AND date_ecriture BETWEEN ? AND ?
  `, [dateDebut, dateFin]);

  // Enrichir les détails avec la base HT et le taux
  const tauxMap = { '4431': 18, '4432': 10, '4433': 0, '4451': 18, '4452': 10, '4453': 0 };
  const tva_collectee = collecteeDetail.map(r => {
    const taux = tauxMap[r.compte.substring(0, 4)] || 0;
    const base = taux > 0 ? (parseFloat(r.tva) / taux * 100) : 0;
    return { ...r, tva: parseFloat(r.tva), base, taux };
  });
  const tva_deductible = deductibleDetail.map(r => {
    const taux = tauxMap[r.compte.substring(0, 4)] || 0;
    const base = taux > 0 ? (parseFloat(r.tva) / taux * 100) : 0;
    return { ...r, tva: parseFloat(r.tva), base, taux };
  });

  const totalTVACollectee = tva_collectee.reduce((s, r) => s + r.tva, 0);
  const totalTVADeductible = tva_deductible.reduce((s, r) => s + r.tva, 0);
  const tvaNette = totalTVACollectee - totalTVADeductible;

  // Insérer ou mettre à jour la déclaration
  await pool.execute(`
    INSERT INTO declarations_tva (periode, tva_collectee, tva_deductible, tva_nette, chiffre_affaires_ht, achats_ht)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      tva_collectee = VALUES(tva_collectee),
      tva_deductible = VALUES(tva_deductible),
      tva_nette = VALUES(tva_nette),
      chiffre_affaires_ht = VALUES(chiffre_affaires_ht),
      achats_ht = VALUES(achats_ht),
      updated_at = CURRENT_TIMESTAMP
  `, [periode, totalTVACollectee, totalTVADeductible, tvaNette, parseFloat(ca[0].montant), parseFloat(achats[0].montant)]);

  return {
    periode,
    tva_collectee,
    tva_deductible,
    total_tva_collectee: totalTVACollectee,
    total_tva_deductible: totalTVADeductible,
    tva_nette: tvaNette,
    chiffre_affaires_ht: parseFloat(ca[0].montant),
    achats_ht: parseFloat(achats[0].montant),
    a_payer: tvaNette > 0 ? tvaNette : 0,
    credit_tva: tvaNette < 0 ? Math.abs(tvaNette) : 0,
    credit_anterieur: 0
  };
}

async function getDeclarationsTVA() {
  const [rows] = await pool.execute('SELECT * FROM declarations_tva ORDER BY periode DESC');
  return rows;
}

// ═══════════════════════════════════════════════════════════════
// 9. COMPTABILISATION DE MASSE (import historique)
// ═══════════════════════════════════════════════════════════════

async function comptabiliserHistorique() {
  const resultats = { ventes: 0, paiements: 0, caisse: 0, achats: 0, salaires: 0, avoirs: 0, erreurs: [] };

  // Ventes non encore comptabilisées
  const [ventes] = await pool.execute(`
    SELECT s.*, c.name as customer_name 
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    WHERE s.id NOT IN (SELECT DISTINCT reference_id FROM ecritures_comptables WHERE reference_type = 'sale' AND reference_id IS NOT NULL)
    ORDER BY s.sale_date
  `);
  for (const v of ventes) {
    try { await comptabiliserVente(v); resultats.ventes++; } 
    catch (e) { resultats.erreurs.push(`Vente ${v.id}: ${e.message}`); }
  }

  // Paiements non comptabilisés
  const [paiements] = await pool.execute(`
    SELECT p.*, c.name as customer_name
    FROM payments p
    LEFT JOIN sales s ON s.id = p.sale_id
    LEFT JOIN customers c ON c.id = s.customer_id
    WHERE p.id NOT IN (SELECT DISTINCT reference_id FROM ecritures_comptables WHERE reference_type = 'payment' AND reference_id IS NOT NULL)
    ORDER BY p.payment_date
  `);
  for (const p of paiements) {
    try { await comptabiliserPaiement(p); resultats.paiements++; }
    catch (e) { resultats.erreurs.push(`Paiement ${p.id}: ${e.message}`); }
  }

  // Mouvements de caisse
  const [caisse] = await pool.execute(`
    SELECT * FROM cash_movements
    WHERE id NOT IN (SELECT DISTINCT reference_id FROM ecritures_comptables WHERE reference_type = 'cash_movement' AND reference_id IS NOT NULL)
    ORDER BY date
  `);
  for (const m of caisse) {
    try { await comptabiliserMouvementCaisse(m); resultats.caisse++; }
    catch (e) { resultats.erreurs.push(`Caisse ${m.id}: ${e.message}`); }
  }

  // Achats fournisseurs
  const [achats] = await pool.execute(`
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.id NOT IN (SELECT DISTINCT reference_id FROM ecritures_comptables WHERE reference_type = 'purchase_order' AND reference_id IS NOT NULL)
    ORDER BY po.order_date
  `);
  for (const a of achats) {
    try { await comptabiliserAchat(a); resultats.achats++; }
    catch (e) { resultats.erreurs.push(`Achat ${a.id}: ${e.message}`); }
  }

  // Salaires
  try {
    const [salaires] = await pool.execute(`
      SELECT s.*, e.first_name, e.last_name,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name
      FROM salaries s
      LEFT JOIN employees e ON e.id = s.employee_id
      WHERE s.id NOT IN (SELECT DISTINCT reference_id FROM ecritures_comptables WHERE reference_type = 'salary' AND reference_id IS NOT NULL)
      ORDER BY s.pay_date
    `);
    for (const s of salaires) {
      try { await comptabiliserSalaire(s); resultats.salaires++; }
      catch (e) { resultats.erreurs.push(`Salaire ${s.id}: ${e.message}`); }
    }
  } catch (e) {
    if (!e.message.includes("doesn't exist")) throw e;
    // Table salaries n'existe pas encore, on skip
  }

  // Avoirs
  const [avoirs] = await pool.execute(`
    SELECT cn.*, c.name as customer_name
    FROM credit_notes cn
    LEFT JOIN customers c ON c.id = cn.customer_id
    WHERE cn.id NOT IN (SELECT DISTINCT reference_id FROM ecritures_comptables WHERE reference_type = 'credit_note' AND reference_id IS NOT NULL)
    ORDER BY cn.created_at
  `);
  for (const a of avoirs) {
    try { await comptabiliserAvoir(a); resultats.avoirs++; }
    catch (e) { resultats.erreurs.push(`Avoir ${a.id}: ${e.message}`); }
  }

  return resultats;
}

// ═══════════════════════════════════════════════════════════════
// 10. JOURNAL COMPTABLE — Consultation
// ═══════════════════════════════════════════════════════════════

async function getJournal({ journal_code, date_debut, date_fin, exercice, page, limit }) {
  let sql = `
    SELECT e.*, pc.libelle as compte_libelle, jc.libelle as journal_libelle
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    JOIN journaux_comptables jc ON jc.code = e.journal_code
    WHERE 1=1
  `;
  const params = [];

  if (journal_code) { sql += ' AND e.journal_code = ?'; params.push(journal_code); }
  if (date_debut) { sql += ' AND e.date_ecriture >= ?'; params.push(date_debut); }
  if (date_fin) { sql += ' AND e.date_ecriture <= ?'; params.push(date_fin); }
  if (exercice) { sql += ' AND e.exercice_annee = ?'; params.push(exercice); }

  // Count total
  const countSql = sql.replace('SELECT e.*, pc.libelle as compte_libelle, jc.libelle as journal_libelle', 'SELECT COUNT(*) as total');
  const [countResult] = await pool.execute(countSql, params);
  const total = countResult[0].total;

  sql += ' ORDER BY e.date_ecriture DESC, e.id DESC';

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 50;
  const offset = (pageNum - 1) * limitNum;
  sql += ` LIMIT ${limitNum} OFFSET ${offset}`;

  const [rows] = await pool.execute(sql, params);

  return { ecritures: rows, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) };
}

// ═══════════════════════════════════════════════════════════════
// 11. TABLEAU DE BORD COMPTABLE
// ═══════════════════════════════════════════════════════════════

async function getDashboardComptable(exercice) {
  const annee = exercice || new Date().getFullYear();

  const [totalEcritures] = await pool.execute(
    'SELECT COUNT(*) as total FROM ecritures_comptables WHERE exercice_annee = ?', [annee]
  );

  const [mouvements] = await pool.execute(`
    SELECT 
      SUM(debit) as total_debit,
      SUM(credit) as total_credit
    FROM ecritures_comptables WHERE exercice_annee = ?
  `, [annee]);

  // CA mensuel
  const [caMensuel] = await pool.execute(`
    SELECT 
      MONTH(date_ecriture) as mois,
      SUM(credit) - SUM(debit) as ca
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE pc.classe = 7 AND e.exercice_annee = ?
    GROUP BY MONTH(date_ecriture)
    ORDER BY mois
  `, [annee]);

  // Charges mensuelles
  const [chargesMensuel] = await pool.execute(`
    SELECT 
      MONTH(date_ecriture) as mois,
      SUM(debit) - SUM(credit) as charges
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE pc.classe = 6 AND e.exercice_annee = ?
    GROUP BY MONTH(date_ecriture)
    ORDER BY mois
  `, [annee]);

  const cr = await getCompteResultat(annee);

  return {
    exercice: annee,
    total_ecritures: totalEcritures[0].total,
    total_debit: parseFloat(mouvements[0].total_debit || 0),
    total_credit: parseFloat(mouvements[0].total_credit || 0),
    resultat_net: cr.resultat_net,
    type_resultat: cr.type,
    total_charges: cr.total_charges,
    total_produits: cr.total_produits,
    ca_mensuel: caMensuel,
    charges_mensuel: chargesMensuel
  };
}

// ═══════════════════════════════════════════════════════════════
// 6. PARAMÈTRES COMPTABILITÉ
// ═══════════════════════════════════════════════════════════════

async function getParametres() {
  const [rows] = await pool.execute('SELECT cle, valeur FROM parametres_comptable');
  const params = {};
  for (const row of rows) {
    params[row.cle] = row.valeur;
  }
  return params;
}

async function saveParametres(params) {
  const crypto = require('crypto');
  for (const [cle, valeur] of Object.entries(params)) {
    const [existing] = await pool.execute('SELECT id FROM parametres_comptable WHERE cle = ?', [cle]);
    if (existing.length) {
      await pool.execute('UPDATE parametres_comptable SET valeur = ? WHERE cle = ?', [valeur, cle]);
    } else {
      const id = crypto.randomUUID();
      await pool.execute('INSERT INTO parametres_comptable (id, cle, valeur) VALUES (?, ?, ?)', [id, cle, valeur]);
    }
  }
  return { success: true, count: Object.keys(params).length };
}

// ═══════════════════════════════════════════════════════════════
// 7. COMPTABILITÉ ANALYTIQUE
// ═══════════════════════════════════════════════════════════════

async function getCentresAnalyse(exercice) {
  const annee = exercice || new Date().getFullYear();
  // Utiliser centres_analytiques (table existante du script original)
  const [rows] = await pool.execute(
    'SELECT * FROM centres_analytiques ORDER BY code'
  );
  // Calculer charges/produits depuis les écritures avec section_analytique
  for (const row of rows) {
    const [ch] = await pool.execute(
      `SELECT COALESCE(SUM(debit),0) as charges FROM ecritures_comptables WHERE section_analytique = ? AND exercice_annee = ?`,
      [row.code, annee]
    );
    const [pr] = await pool.execute(
      `SELECT COALESCE(SUM(credit),0) as produits FROM ecritures_comptables WHERE section_analytique = ? AND exercice_annee = ?`,
      [row.code, annee]
    );
    row.charges = parseFloat(ch[0].charges);
    row.produits = parseFloat(pr[0].produits);
  }
  return rows;
}

async function createCentreAnalyse(data) {
  const id = require('crypto').randomUUID();
  const { code, libelle, type } = data;
  if (!code || !libelle) throw new Error('code et libelle requis');
  await pool.execute(
    'INSERT INTO centres_analytiques (id, code, libelle, type, actif) VALUES (?, ?, ?, ?, 1)',
    [id, code, libelle, type || 'centre_cout']
  );
  return { id, ...data };
}

async function deleteCentreAnalyse(id) {
  const [r] = await pool.execute('DELETE FROM centres_analytiques WHERE id = ?', [id]);
  if (r.affectedRows === 0) throw new Error('Centre non trouvé');
  return { deleted: true };
}

// ═══════════════════════════════════════════════════════════════
// 7b. IMMOBILISATIONS + AMORTISSEMENTS
// ═══════════════════════════════════════════════════════════════

async function getImmobilisations(exercice) {
  // La table immobilisations existante a: id, code, libelle, compte_immobilisation, compte_amortissement,
  // date_acquisition, valeur_acquisition, duree_amortissement, mode_amortissement, taux_amortissement,
  // cumul_amortissements, valeur_nette_comptable, statut, etc.
  const [rows] = await pool.execute('SELECT * FROM immobilisations ORDER BY code');
  return rows.map(r => {
    const valeur = parseFloat(r.valeur_acquisition) || 0;
    const amortCumule = parseFloat(r.cumul_amortissements) || 0;
    const vnc = parseFloat(r.valeur_nette_comptable) || (valeur - amortCumule);
    const taux = parseFloat(r.taux_amortissement) || (r.duree_amortissement ? (100 / r.duree_amortissement) : 0);
    return {
      id: r.id,
      code: r.code,
      libelle: r.libelle,
      valeur_origine: valeur,
      date_acquisition: r.date_acquisition,
      duree_amortissement: r.duree_amortissement,
      taux_amortissement: taux,
      mode_amortissement: r.mode_amortissement || 'lineaire',
      amort_cumule: amortCumule,
      vnc: vnc,
      amort_annuel: valeur * taux / 100,
      statut: r.statut || 'actif',
      compte_immo: r.compte_immobilisation,
      compte_amort: r.compte_amortissement,
      compte_dotation: r.compte_dotation,
      designation: r.libelle
    };
  });
}

async function createImmobilisation(data) {
  const id = require('crypto').randomUUID();
  const { code, libelle, valeur_origine, date_acquisition, duree_amortissement, taux_amortissement, mode_amortissement, compte_immo, compte_amort } = data;
  if (!code || !libelle || !valeur_origine || !date_acquisition || !duree_amortissement) throw new Error('Champs requis manquants');
  const taux = taux_amortissement || (100 / duree_amortissement).toFixed(2);
  const vnc = valeur_origine;
  await pool.execute(
    `INSERT INTO immobilisations (id, code, libelle, compte_immobilisation, compte_amortissement, compte_dotation,
     date_acquisition, valeur_acquisition, duree_amortissement, mode_amortissement, taux_amortissement,
     cumul_amortissements, valeur_nette_comptable, statut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'en_service')`,
    [id, code, libelle, compte_immo || '200000', compte_amort || '280000', data.compte_dotation || '681000',
     date_acquisition, valeur_origine, duree_amortissement, mode_amortissement || 'lineaire', taux, vnc]
  );
  return { id, ...data };
}

async function updateImmobilisation(id, data) {
  const fields = [], values = [];
  const colMap = { libelle: 'libelle', valeur_origine: 'valeur_acquisition', duree_amortissement: 'duree_amortissement', taux_amortissement: 'taux_amortissement', mode_amortissement: 'mode_amortissement', compte_immo: 'compte_immobilisation', compte_amort: 'compte_amortissement' };
  for (const [k, v] of Object.entries(data)) {
    if (colMap[k]) { fields.push(`${colMap[k]} = ?`); values.push(v); }
  }
  if (data.amort_cumule !== undefined) { fields.push('cumul_amortissements = ?'); values.push(data.amort_cumule); }
  if (!fields.length) throw new Error('Aucun champ à mettre à jour');
  values.push(id);
  await pool.execute(`UPDATE immobilisations SET ${fields.join(', ')} WHERE id = ?`, values);
  return { id, ...data };
}

async function deleteImmobilisation(id) {
  const [r] = await pool.execute('DELETE FROM immobilisations WHERE id = ?', [id]);
  if (r.affectedRows === 0) throw new Error('Immobilisation non trouvée');
  return { deleted: true };
}

async function calculerAmortissements(exercice) {
  const annee = exercice || new Date().getFullYear();
  const immos = await getImmobilisations(annee);
  let count = 0;
  const ecritures = [];
  for (const immo of immos) {
    const anneeAcq = new Date(immo.date_acquisition).getFullYear();
    if (annee >= anneeAcq && immo.amort_cumule < immo.valeur_origine) {
      const taux = parseFloat(immo.taux_amortissement) || 0;
      if (taux <= 0) continue;
      const amortAnnuel = immo.valeur_origine * taux / 100;
      const dotation = Math.min(amortAnnuel, immo.valeur_origine - immo.amort_cumule);
      const nouvelAmort = immo.amort_cumule + dotation;
      const vnc = immo.valeur_origine - nouvelAmort;
      await pool.execute('UPDATE immobilisations SET cumul_amortissements = ?, valeur_nette_comptable = ? WHERE id = ?', [nouvelAmort, vnc, immo.id]);

      // Générer écriture comptable : Débit 681 (dotation) / Crédit 28X (amort immo)
      const compteDotation = immo.compte_dotation || '681';
      // Utiliser le compte d'amort défini sur l'immo si disponible, sinon calculer '28' + sous-classe de l'immo
      const compteAmort = immo.compte_amort
        || (immo.compte_immo && immo.compte_immo.length >= 2 ? '28' + immo.compte_immo[1] : '281');
      try {
        await createEcriture({
          journal_code: 'OD',
          date_ecriture: `${annee}-12-31`,
          numero_piece: `DOT-${immo.code || immo.id}`,
          lignes: [
            { compte_code: compteDotation, libelle: `Dotation amort. ${immo.designation}`, debit: dotation, credit: 0, reference_type: 'immobilisation', reference_id: immo.id },
            { compte_code: compteAmort, libelle: `Amort. ${immo.designation}`, debit: 0, credit: dotation, reference_type: 'immobilisation', reference_id: immo.id }
          ]
        });
        ecritures.push({ immo: immo.designation, dotation, compte: compteDotation });
      } catch (e) {
        // Le compte d'amortissement n'existe peut-être pas, on continue
      }
      count++;
    }
  }
  return { success: true, count, ecritures, message: `${count} amortissement(s) calculé(s) avec écritures` };
}

// ═══════════════════════════════════════════════════════════════
// 8. BUDGETS PRÉVISIONNELS
// ═══════════════════════════════════════════════════════════════

async function getBudgets(exercice) {
  const annee = exercice || new Date().getFullYear();
  const [rows] = await pool.execute(
    'SELECT * FROM budgets ORDER BY numero_compte'
  );

  // Calculer le réalisé par compte et par mois
  const [realiseRows] = await pool.execute(`
    SELECT e.compte_code, MONTH(e.date_ecriture) as mois,
      SUM(e.debit) - SUM(e.credit) as montant
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.exercice_annee = ? AND pc.classe IN (6, 7)
    GROUP BY e.compte_code, MONTH(e.date_ecriture)
  `, [annee]);
  const realiseMap = {};
  for (const r of realiseRows) {
    if (!realiseMap[r.compte_code]) realiseMap[r.compte_code] = { total: 0, mensuel: Array(12).fill(0) };
    realiseMap[r.compte_code].total += Math.abs(parseFloat(r.montant));
    realiseMap[r.compte_code].mensuel[r.mois - 1] += Math.abs(parseFloat(r.montant));
  }

  const moisCols = ['montant_janvier','montant_fevrier','montant_mars','montant_avril','montant_mai','montant_juin',
    'montant_juillet','montant_aout','montant_septembre','montant_octobre','montant_novembre','montant_decembre'];

  return rows.map(r => {
    const mensuel = moisCols.map(col => parseFloat(r[col]) || 0);
    const realise = realiseMap[r.numero_compte] || { total: 0, mensuel: Array(12).fill(0) };
    return {
      id: r.id,
      categorie: r.libelle || r.numero_compte,
      prevu: parseFloat(r.total_annuel) || 0,
      realise: realise.total,
      ecart: (parseFloat(r.total_annuel) || 0) - realise.total,
      numero_compte: r.numero_compte,
      mensuel,
      realise_mensuel: realise.mensuel
    };
  });
}

async function createBudget(data) {
  const id = require('crypto').randomUUID();
  const { categorie, prevu, exercice_annee } = data;
  if (!categorie) throw new Error('categorie requise');
  const mensuel = (parseFloat(prevu) || 0) / 12;
  await pool.execute(
    `INSERT INTO budgets (id, exercice_id, numero_compte, libelle, total_annuel,
     montant_janvier, montant_fevrier, montant_mars, montant_avril, montant_mai, montant_juin,
     montant_juillet, montant_aout, montant_septembre, montant_octobre, montant_novembre, montant_decembre)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, exercice_annee || new Date().getFullYear(), categorie.substring(0, 10), categorie, prevu || 0,
     mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel]
  );
  return { id, ...data };
}

async function updateBudget(id, data) {
  const { prevu } = data;
  if (prevu !== undefined) {
    const mensuel = (parseFloat(prevu) || 0) / 12;
    await pool.execute(
      `UPDATE budgets SET total_annuel = ?,
       montant_janvier=?, montant_fevrier=?, montant_mars=?, montant_avril=?, montant_mai=?, montant_juin=?,
       montant_juillet=?, montant_aout=?, montant_septembre=?, montant_octobre=?, montant_novembre=?, montant_decembre=?
       WHERE id = ?`,
      [prevu, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, mensuel, id]
    );
  }
  return { id, ...data };
}

async function deleteBudget(id) {
  const [result] = await pool.execute('DELETE FROM budgets WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw new Error('Budget non trouvé');
  return { deleted: true };
}

// ═══════════════════════════════════════════════════════════════
// 9. RAPPROCHEMENT BANCAIRE
// ═══════════════════════════════════════════════════════════════

async function getRapprochement(compte, mois) {
  const [year, month] = mois.split('-');
  const dateDebut = `${year}-${month}-01`;
  const dateFin = `${year}-${month}-${new Date(year, month, 0).getDate()}`;

  // Écritures comptables du compte banque
  const [comptaRows] = await pool.execute(`
    SELECT id, date_ecriture as date, libelle,
           CASE WHEN debit > 0 THEN -debit ELSE credit END as montant,
           CASE WHEN debit > 0 THEN 'D' ELSE 'C' END as sens,
           rapprochement
    FROM ecritures_comptables
    WHERE compte_code = ? AND date_ecriture BETWEEN ? AND ?
    ORDER BY date_ecriture
  `, [compte, dateDebut, dateFin]);

  // Lignes de relevé bancaire importées
  const [banqueRows] = await pool.execute(`
    SELECT id, date_operation as date, libelle, montant, sens, rapprochement
    FROM releves_bancaires
    WHERE compte_code = ? AND date_operation BETWEEN ? AND ?
    ORDER BY date_operation
  `, [compte, dateDebut, dateFin]);

  return {
    ecrituresCompta: comptaRows,
    ecrituresBanque: banqueRows
  };
}

async function validerRapprochement(idsCompta, idsBanque) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (idsCompta && idsCompta.length) {
      const ph = idsCompta.map(() => '?').join(',');
      await conn.execute(`UPDATE ecritures_comptables SET rapprochement = 1 WHERE id IN (${ph})`, idsCompta);
    }
    if (idsBanque && idsBanque.length) {
      const ph = idsBanque.map(() => '?').join(',');
      await conn.execute(`UPDATE releves_bancaires SET rapprochement = 1 WHERE id IN (${ph})`, idsBanque);
    }
    await conn.commit();
    return { success: true, comptaCount: idsCompta?.length || 0, banqueCount: idsBanque?.length || 0 };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// ═══════════════════════════════════════════════════════════════
// 10a. RELANCES CLIENTS
// ═══════════════════════════════════════════════════════════════

async function getClientsEnRetard(exercice) {
  const annee = exercice || new Date().getFullYear();
  const today = new Date().toISOString().split('T')[0];

  // Écritures clients non lettrées avec solde débiteur
  const [rows] = await pool.execute(`
    SELECT e.compte_code, pc.libelle as nom,
           SUM(e.debit) - SUM(e.credit) as montant_du,
           COUNT(DISTINCT e.numero_piece) as nb_factures,
           MIN(e.date_ecriture) as date_oldest,
           MAX(COALESCE(r.date_relance, '2000-01-01')) as derniere_relance,
           MAX(COALESCE(r.niveau, 0)) as niveau_relance
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    LEFT JOIN relances r ON r.compte_code = e.compte_code
    WHERE e.compte_code LIKE '411%' AND e.exercice_annee = ?
      AND (e.lettrage IS NULL OR e.lettrage = '')
    GROUP BY e.compte_code, pc.libelle
    HAVING montant_du > 0
    ORDER BY montant_du DESC
  `, [annee]);

  return rows.map(r => ({
    id: r.compte_code,
    nom: r.nom,
    compte: r.compte_code,
    montant_du: parseFloat(r.montant_du),
    nb_factures: r.nb_factures,
    jours_retard: Math.floor((new Date(today).getTime() - new Date(r.date_oldest).getTime()) / (1000 * 60 * 60 * 24)),
    derniere_relance: r.derniere_relance === '2000-01-01' ? null : r.derniere_relance,
    niveau_relance: r.niveau_relance || 0
  }));
}

async function genererRelances(compteCodes, niveau, exercice) {
  const annee = exercice || new Date().getFullYear();
  const today = new Date().toISOString().split('T')[0];
  let count = 0;
  for (const code of compteCodes) {
    const id = require('crypto').randomUUID();
    await pool.execute(
      `INSERT INTO relances (id, compte_code, date_relance, niveau, exercice_annee) VALUES (?, ?, ?, ?, ?)`,
      [id, code, today, niveau, annee]
    );
    count++;
  }
  return { success: true, count, niveau };
}

// ═══════════════════════════════════════════════════════════════
// 10b. LETTRAGE DES ÉCRITURES
// ═══════════════════════════════════════════════════════════════

async function getEcrituresPourLettrage(compte, exercice) {
  const annee = exercice || new Date().getFullYear();
  const [rows] = await pool.execute(`
    SELECT id, date_ecriture as date, numero_piece as piece, libelle, debit, credit, lettrage as lettre
    FROM ecritures_comptables
    WHERE compte_code = ? AND exercice_annee = ?
    ORDER BY date_ecriture, numero_piece
  `, [compte, annee]);
  return rows;
}

async function lettrerEcritures(ids, lettre) {
  if (!ids || !ids.length || !lettre) throw new Error('ids et lettre requis');
  const placeholders = ids.map(() => '?').join(',');
  await pool.execute(
    `UPDATE ecritures_comptables SET lettrage = ? WHERE id IN (${placeholders})`,
    [lettre, ...ids]
  );
  return { success: true, lettre, count: ids.length };
}

async function delettrerEcritures(ids) {
  if (!ids || !ids.length) throw new Error('ids requis');
  const placeholders = ids.map(() => '?').join(',');
  await pool.execute(
    `UPDATE ecritures_comptables SET lettrage = NULL WHERE id IN (${placeholders})`,
    [...ids]
  );
  return { success: true, count: ids.length };
}

async function getNextLettre(exercice) {
  const annee = exercice || new Date().getFullYear();
  const [rows] = await pool.execute(`
    SELECT lettrage FROM ecritures_comptables
    WHERE lettrage IS NOT NULL AND lettrage != '' AND exercice_annee = ?
    ORDER BY lettrage DESC LIMIT 1
  `, [annee]);
  if (!rows.length) return 'AA';
  const last = rows[0].lettrage;
  const c0 = last.charCodeAt(0);
  const c1 = last.charCodeAt(1);
  if (c1 < 90) return String.fromCharCode(c0) + String.fromCharCode(c1 + 1);
  if (c0 < 90) return String.fromCharCode(c0 + 1) + 'A';
  return 'AA';
}

async function lettrageAutomatique(exercice) {
  const annee = exercice || new Date().getFullYear();
  // Récupérer les écritures non lettrées des comptes de tiers (40x, 41x, 42x)
  const [rows] = await pool.execute(`
    SELECT id, compte_code, debit, credit, lettrage
    FROM ecritures_comptables
    WHERE exercice_annee = ? AND (compte_code LIKE '40%' OR compte_code LIKE '41%' OR compte_code LIKE '42%')
      AND (lettrage IS NULL OR lettrage = '')
    ORDER BY compte_code, date_ecriture
  `, [annee]);

  // Grouper par compte et chercher les paires débit/crédit qui s'équilibrent
  const byCompte = {};
  for (const r of rows) {
    if (!byCompte[r.compte_code]) byCompte[r.compte_code] = [];
    byCompte[r.compte_code].push(r);
  }

  let lettres = 0;
  let lettre = await getNextLettre(annee);

  for (const [compte, ecritures] of Object.entries(byCompte)) {
    const debits = ecritures.filter(e => parseFloat(e.debit) > 0);
    const credits = ecritures.filter(e => parseFloat(e.credit) > 0);

    for (const d of debits) {
      const dMontant = parseFloat(d.debit);
      // Chercher un crédit correspondant sur le même compte
      const matchIdx = credits.findIndex(c => !c._used && Math.abs(parseFloat(c.credit) - dMontant) < 0.01);
      if (matchIdx >= 0) {
        const c = credits[matchIdx];
        c._used = true;
        await pool.execute('UPDATE ecritures_comptables SET lettrage = ? WHERE id IN (?, ?)', [lettre, d.id, c.id]);
        // Incrémenter la lettre
        const c0 = lettre.charCodeAt(0);
        const c1 = lettre.charCodeAt(1);
        if (c1 < 90) lettre = String.fromCharCode(c0) + String.fromCharCode(c1 + 1);
        else if (c0 < 90) lettre = String.fromCharCode(c0 + 1) + 'A';
        else lettre = 'AA';
        lettres++;
      }
    }
  }

  return { success: true, lettres, message: `${lettres} paire(s) lettrée(s) automatiquement` };
}

// ═══════════════════════════════════════════════════════════════
// 11a. ÉCHÉANCIER + TIERS
// ═══════════════════════════════════════════════════════════════

async function getEcheancier({ type, exercice }) {
  const annee = exercice || new Date().getFullYear();
  const comptePrefix = type === 'fournisseur' ? '401' : '411';
  const today = new Date().toISOString().split('T')[0];

  // Écritures non lettrées sur comptes tiers avec date d'échéance
  const [rows] = await pool.execute(`
    SELECT e.id, e.compte_code, pc.libelle as compte_libelle, e.numero_piece,
           e.libelle, e.debit, e.credit, e.date_ecriture,
           COALESCE(e.date_echeance, DATE_ADD(e.date_ecriture, INTERVAL 30 DAY)) as date_echeance,
           e.lettrage
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.compte_code LIKE ? AND e.exercice_annee = ?
      AND (e.lettrage IS NULL OR e.lettrage = '')
    ORDER BY date_echeance ASC
  `, [`${comptePrefix}%`, annee]);

  // Calculer le solde et le statut
  return rows.map(r => {
    const solde = type === 'fournisseur'
      ? parseFloat(r.credit) - parseFloat(r.debit)
      : parseFloat(r.debit) - parseFloat(r.credit);
    const echeance = new Date(r.date_echeance);
    const estEchu = echeance < new Date(today);
    return {
      id: r.id,
      tiers: r.compte_libelle,
      compte_code: r.compte_code,
      piece: r.numero_piece,
      libelle: r.libelle,
      montant: Math.abs(solde),
      date_echeance: r.date_echeance,
      statut: estEchu ? 'echu' : 'a_venir'
    };
  }).filter(r => r.montant > 0);
}

// ═══════════════════════════════════════════════════════════════
// 11b. TIERS COMPTABLES (clients / fournisseurs) — CRUD
// ═══════════════════════════════════════════════════════════════

async function getTiers({ type, search }) {
  let sql = 'SELECT t.*, COALESCE(SUM(e.debit),0) as solde_debit, COALESCE(SUM(e.credit),0) as solde_credit FROM tiers_comptable t LEFT JOIN ecritures_comptables e ON e.compte_code = t.compte_collectif WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND t.type = ?'; params.push(type); }
  if (search) { sql += ' AND (t.raison_sociale LIKE ? OR t.code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' GROUP BY t.id ORDER BY t.raison_sociale';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function createTiers(data) {
  const id = require('crypto').randomUUID();
  const { code, raison_sociale, type, compte_collectif, telephone, email, adresse, ninea, rc } = data;
  if (!code || !raison_sociale || !type || !compte_collectif) {
    throw new Error('Champs requis: code, raison_sociale, type, compte_collectif');
  }
  await pool.execute(
    `INSERT INTO tiers_comptable (id, code, raison_sociale, type, compte_collectif, telephone, email, adresse, ninea, rc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, code, raison_sociale, type, compte_collectif, telephone || null, email || null, adresse || null, ninea || null, rc || null]
  );
  return { id, ...data };
}

async function updateTiers(id, data) {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(data)) {
    if (['code', 'raison_sociale', 'type', 'compte_collectif', 'telephone', 'email', 'adresse', 'ninea', 'rc'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (!fields.length) throw new Error('Aucun champ à mettre à jour');
  values.push(id);
  await pool.execute(`UPDATE tiers_comptable SET ${fields.join(', ')} WHERE id = ?`, values);
  return { id, ...data };
}

async function deleteTiers(id) {
  const [result] = await pool.execute('DELETE FROM tiers_comptable WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw new Error('Tiers non trouvé');
  return { deleted: true };
}

// ═══════════════════════════════════════════════════════════════
// 11b. BALANCE ÂGÉE (créances par ancienneté)
// ═══════════════════════════════════════════════════════════════

async function getBalanceAgee({ type, exercice }) {
  const annee = exercice || new Date().getFullYear();
  const today = new Date();

  // Comptes tiers : 411 (clients) ou 401 (fournisseurs)
  const comptePrefix = type === 'fournisseur' ? '401' : '411';

  // Récupérer les écritures non lettrées sur comptes tiers
  const [rows] = await pool.execute(`
    SELECT e.compte_code, pc.libelle as compte_libelle, e.libelle, e.debit, e.credit, e.date_ecriture,
           e.numero_piece, e.lettrage
    FROM ecritures_comptables e
    JOIN plan_comptable pc ON pc.code = e.compte_code
    WHERE e.compte_code LIKE ? AND e.exercice_annee = ? AND (e.lettrage IS NULL OR e.lettrage = '')
    ORDER BY e.compte_code, e.date_ecriture
  `, [`${comptePrefix}%`, annee]);

  // Grouper par compte et calculer les tranches d'ancienneté
  const comptes = {};
  for (const r of rows) {
    const code = r.compte_code;
    if (!comptes[code]) {
      comptes[code] = { compte_code: code, libelle: r.compte_libelle, total: 0, tranches: { '0-30': 0, '31-60': 0, '61-90': 0, '+90': 0 } };
    }
    const solde = type === 'fournisseur'
      ? parseFloat(r.credit) - parseFloat(r.debit)
      : parseFloat(r.debit) - parseFloat(r.credit);
    if (solde > 0) {
      comptes[code].total += solde;
      const jours = Math.floor((today.getTime() - new Date(r.date_ecriture).getTime()) / (1000 * 60 * 60 * 24));
      if (jours <= 30) comptes[code].tranches['0-30'] += solde;
      else if (jours <= 60) comptes[code].tranches['31-60'] += solde;
      else if (jours <= 90) comptes[code].tranches['61-90'] += solde;
      else comptes[code].tranches['+90'] += solde;
    }
  }

  return Object.values(comptes).filter(c => c.total > 0);
}

// ═══════════════════════════════════════════════════════════════
// 12. ABONNEMENTS COMPTABLES (écritures récurrentes)
// ═══════════════════════════════════════════════════════════════

async function getAbonnements(exercice) {
  const annee = exercice || new Date().getFullYear();
  const [rows] = await pool.execute(
    'SELECT * FROM abonnements_comptables WHERE (exercice_annee = ? OR exercice_annee IS NULL) ORDER BY libelle',
    [annee]
  );
  return rows;
}

async function createAbonnement(data) {
  const id = require('crypto').randomUUID();
  const { libelle, frequence, journal_code, compte_debit, compte_credit, montant, libelle_ecriture, date_debut, date_fin, prochaine_echeance, exercice_annee } = data;
  if (!libelle || !journal_code || !compte_debit || !compte_credit || !montant || !date_debut || !prochaine_echeance) {
    throw new Error('Champs requis: libelle, journal_code, compte_debit, compte_credit, montant, date_debut, prochaine_echeance');
  }
  await pool.execute(
    `INSERT INTO abonnements_comptables (id, libelle, frequence, journal_code, compte_debit, compte_credit, montant, libelle_ecriture, date_debut, date_fin, prochaine_echeance, exercice_annee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, libelle, frequence || 'mensuel', journal_code, compte_debit, compte_credit, parseFloat(montant), libelle_ecriture || libelle, date_debut, date_fin || null, prochaine_echeance, exercice_annee || null]
  );
  return { id, ...data };
}

async function updateAbonnement(id, data) {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(data)) {
    if (['libelle', 'frequence', 'journal_code', 'compte_debit', 'compte_credit', 'montant', 'libelle_ecriture', 'date_debut', 'date_fin', 'prochaine_echeance', 'actif', 'exercice_annee'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (!fields.length) throw new Error('Aucun champ à mettre à jour');
  values.push(id);
  await pool.execute(`UPDATE abonnements_comptables SET ${fields.join(', ')} WHERE id = ?`, values);
  return { id, ...data };
}

async function deleteAbonnement(id) {
  const [result] = await pool.execute('DELETE FROM abonnements_comptables WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw new Error('Abonnement non trouvé');
  return { deleted: true };
}

async function executerAbonnement(id) {
  const [rows] = await pool.execute('SELECT * FROM abonnements_comptables WHERE id = ? AND actif = 1', [id]);
  if (!rows.length) throw new Error('Abonnement non trouvé ou inactif');
  const ab = rows[0];

  // Créer l'écriture comptable
  const lignes = [
    { compte_code: ab.compte_debit, libelle: ab.libelle_ecriture || ab.libelle, debit: parseFloat(ab.montant), credit: 0 },
    { compte_code: ab.compte_credit, libelle: ab.libelle_ecriture || ab.libelle, debit: 0, credit: parseFloat(ab.montant) },
  ];
  const result = await createEcriture({
    journal_code: ab.journal_code,
    date_ecriture: ab.prochaine_echeance,
    numero_piece: `ABO-${ab.libelle.substring(0, 10).replace(/\s/g, '_')}`,
    lignes,
    created_by: 'abonnement'
  });

  // Calculer la prochaine échéance
  const prochaine = new Date(ab.prochaine_echeance);
  if (ab.frequence === 'mensuel') prochaine.setMonth(prochaine.getMonth() + 1);
  else if (ab.frequence === 'trimestriel') prochaine.setMonth(prochaine.getMonth() + 3);
  else if (ab.frequence === 'annuel') prochaine.setFullYear(prochaine.getFullYear() + 1);
  else { ab.actif = 0; } // unique

  // Mettre à jour l'abonnement
  const nouvelleProchaine = ab.frequence !== 'unique' ? prochaine.toISOString().split('T')[0] : null;
  const dateFin = ab.date_fin ? new Date(ab.date_fin) : null;
  const encoreActif = ab.frequence === 'unique' ? false : (dateFin ? prochaine <= dateFin : true);

  await pool.execute(
    'UPDATE abonnements_comptables SET prochaine_echeance = ?, actif = ? WHERE id = ?',
    [nouvelleProchaine || ab.prochaine_echeance, encoreActif ? 1 : 0, id]
  );

  return { ecriture: result, prochaine_echeance: nouvelleProchaine, actif: encoreActif };
}

// ═══════════════════════════════════════════════════════════════
// 13. CLÔTURE D'EXERCICE
// ═══════════════════════════════════════════════════════════════

async function getClotureEtapes(annee) {
  // Vérifier statut exercice
  const [ex] = await pool.execute('SELECT * FROM exercices WHERE annee = ?', [annee]);
  const exercice = ex[0] || null;
  const estCloture = exercice?.statut === 'cloture';

  // 1. Vérification des écritures (balance équilibrée)
  const balance = await getBalanceGenerale({ exercice: annee });
  const ecrituresOk = balance.equilibre === true;

  // 2. Rapprochement bancaire
  const [rapprochements] = await pool.execute(
    `SELECT COUNT(*) as total FROM rapprochements WHERE YEAR(date_rapprochement) = ?`,
    [annee]
  ).catch(() => [[{ total: 0 }]]);
  const rapprochementOk = parseInt(rapprochements[0]?.total || 0) > 0;

  // 3. Amortissements
  const [amort] = await pool.execute(
    `SELECT COUNT(*) as total FROM ecritures_comptables 
     WHERE compte_code LIKE '28%' AND exercice_annee = ?`,
    [annee]
  ).catch(() => [[{ total: 0 }]]);
  const amortOk = parseInt(amort[0]?.total || 0) > 0;

  // 4. Provisions
  const [prov] = await pool.execute(
    `SELECT COUNT(*) as total FROM ecritures_comptables 
     WHERE (compte_code LIKE '29%' OR compte_code LIKE '39%' OR compte_code LIKE '49%') 
     AND exercice_annee = ?`,
    [annee]
  ).catch(() => [[{ total: 0 }]]);
  const provisionsOk = parseInt(prov[0]?.total || 0) > 0;

  return {
    exercice: annee,
    statut: exercice?.statut || 'ouvert',
    etapes: [
      { id: 1, label: 'Vérification des écritures (balance équilibrée)', statut: ecrituresOk ? 'done' : 'pending', action: 'balance' },
      { id: 2, label: 'Rapprochement bancaire', statut: rapprochementOk ? 'done' : 'pending', action: 'rapprochement' },
      { id: 3, label: 'Calcul des amortissements', statut: amortOk ? 'done' : 'pending', action: 'immobilisations' },
      { id: 4, label: 'Provisions et régularisations', statut: provisionsOk ? 'done' : (estCloture ? 'done' : 'current'), action: 'provisions' },
      { id: 5, label: 'Validation par la direction', statut: estCloture ? 'done' : 'pending', action: 'validation' },
      { id: 6, label: 'Clôture définitive', statut: estCloture ? 'done' : 'pending', action: 'cloture' }
    ],
    peut_cloturer: ecrituresOk && !estCloture
  };
}

async function cloturerExercice(annee) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Vérifier que l'exercice est ouvert
    const [ex] = await conn.execute('SELECT * FROM exercices WHERE annee = ?', [annee]);
    if (!ex.length || ex[0].statut === 'cloture') {
      throw new Error(`Exercice ${annee} déjà clôturé ou inexistant`);
    }

    // Calculer le résultat
    const cr = await getCompteResultat(annee);

    // Marquer l'exercice comme clôturé AVANT les insertions pour éviter l'auto-blocage
    await conn.execute('UPDATE exercices SET statut = ? WHERE annee = ?', ['cloture', annee]);

    // Créer l'exercice suivant
    const nextYear = annee + 1;
    await conn.execute(
      `INSERT IGNORE INTO exercices (annee, date_ouverture, date_cloture, statut, report_a_nouveau) VALUES (?, ?, ?, 'ouvert', ?)`,
      [nextYear, `${nextYear}-01-01`, `${nextYear}-12-31`, cr.resultat_net]
    );

    // ── ÉCRITURES D'À-NOUVEAU (N+1) — Reprise des soldes des comptes de bilan (classes 1-5) ──
    const [soldes] = await conn.execute(`
      SELECT e.compte_code, pc.libelle, pc.classe,
        SUM(e.debit) - SUM(e.credit) AS solde
      FROM ecritures_comptables e
      JOIN plan_comptable pc ON pc.code = e.compte_code
      WHERE e.exercice_annee = ? AND pc.classe IN (1,2,3,4,5)
      GROUP BY e.compte_code, pc.libelle, pc.classe
      HAVING solde != 0
    `, [annee]);

    // Ajout du résultat net en 13x
    const compteResultatCode = cr.resultat_net >= 0 ? '131' : '139';
    const lignesAN = soldes.map(s => {
      const sol = parseFloat(s.solde);
      return {
        compte_code: s.compte_code,
        libelle: `À-nouveau ${annee}`,
        debit: sol > 0 ? sol : 0,
        credit: sol < 0 ? -sol : 0
      };
    });
    if (cr.resultat_net !== 0) {
      lignesAN.push({
        compte_code: compteResultatCode,
        libelle: `Résultat ${annee} — ${cr.resultat_net >= 0 ? 'Bénéfice' : 'Perte'}`,
        debit: cr.resultat_net < 0 ? Math.abs(cr.resultat_net) : 0,
        credit: cr.resultat_net >= 0 ? cr.resultat_net : 0
      });
    }

    // Insérer l'écriture d'à-nouveau dans le journal AN de l'exercice N+1
    let totalDebit = 0, totalCredit = 0;
    for (const l of lignesAN) { totalDebit += l.debit; totalCredit += l.credit; }

    if (lignesAN.length > 0 && Math.abs(totalDebit - totalCredit) < 0.01) {
      const numeroAN = `AN${nextYear}-00001`;
      for (const l of lignesAN) {
        await conn.execute(
          `INSERT INTO ecritures_comptables
           (numero_ecriture, journal_code, date_ecriture, numero_piece, compte_code, libelle, debit, credit, exercice_annee, is_validated)
           VALUES (?, 'AN', ?, 'A-NOUVEAU', ?, ?, ?, ?, ?, 1)`,
          [numeroAN, `${nextYear}-01-01`, l.compte_code, l.libelle, l.debit, l.credit, nextYear]
        );
      }
    }

    await conn.commit();
    return { 
      success: true, 
      exercice_cloture: annee, 
      resultat: cr.resultat_net, 
      type: cr.type,
      exercice_suivant: nextYear 
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS — Mapping produits/catégories → comptes OHADA
// ═══════════════════════════════════════════════════════════════

function mapProductToCompte(productName) {
  if (!productName) return '707';
  const name = productName.toLowerCase();
  if (name.includes('béton') || name.includes('beton')) return '701';
  if (name.includes('ciment')) return '702';
  if (name.includes('gravier') || name.includes('agrégat') || name.includes('agregat')) return '703';
  if (name.includes('fer') || name.includes('acier')) return '704';
  if (name.includes('sable')) return '705';
  if (name.includes('service') || name.includes('prestation') || name.includes('transport')) return '706';
  return '707';
}

function mapPaymentMethodToCompte(method) {
  if (!method) return '571';
  const m = method.toLowerCase();
  if (m.includes('espece') || m.includes('cash') || m === 'especes') return '571';
  if (m.includes('wave') || m.includes('orange')) return '585';
  if (m.includes('virement') || m.includes('cheque') || m.includes('chèque') || m.includes('carte') || m.includes('banque')) return '511';
  return '571';
}

function mapCategoryToCompte(category, type) {
  if (!category) return type === 'recette' ? '758' : '658';
  const cat = category.toLowerCase();
  
  if (type === 'recette') {
    if (cat.includes('vente')) return '707';
    if (cat.includes('interet') || cat.includes('intérêt')) return '761';
    return '758';
  } else {
    if (cat.includes('salaire') || cat.includes('main d') || cat.includes('paie')) return '661';
    if (cat.includes('transport') || cat.includes('carburant') || cat.includes('gasoil')) return '611';
    if (cat.includes('achat') || cat.includes('matière') || cat.includes('matiere') || cat.includes('ciment') || cat.includes('béton')) return '601';
    if (cat.includes('loyer') || cat.includes('location')) return '622';
    if (cat.includes('entretien') || cat.includes('réparation') || cat.includes('reparation')) return '624';
    if (cat.includes('assurance')) return '625';
    if (cat.includes('bancaire') || cat.includes('frais bank')) return '631';
    if (cat.includes('honoraire') || cat.includes('comptable') || cat.includes('avocat')) return '632';
    if (cat.includes('impôt') || cat.includes('impot') || cat.includes('taxe') || cat.includes('patente')) return '641';
  }
  return type === 'recette' ? '758' : '658';
}

// ═══════════════════════════════════════════════════════════════
// EXPORT FEC (Fichier des Écritures Comptables) — Norme DGFiP
// ═══════════════════════════════════════════════════════════════

async function exportFEC(exercice) {
  const annee = exercice || new Date().getFullYear();
  const [rows] = await pool.execute(`
    SELECT e.numero_ecriture, e.date_ecriture, e.compte_code, e.libelle,
      e.debit, e.credit, e.numero_piece, e.journal_code, e.reference_type,
      e.section_analytique, e.exercice_annee, e.is_validated
    FROM ecritures_comptables e
    WHERE e.exercice_annee = ?
    ORDER BY e.date_ecriture, e.numero_ecriture, e.id
  `, [annee]);

  const header = 'JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise';
  const lignes = [header];
  for (const r of rows) {
    lignes.push([
      r.journal_code || '',
      '',
      r.numero_ecriture || '',
      (r.date_ecriture instanceof Date ? r.date_ecriture.toISOString().substring(0, 10) : String(r.date_ecriture || '').substring(0, 10)),
      r.compte_code || '',
      (r.libelle || '').replace(/[|]/g, ' '),
      '',
      r.numero_piece || '',
      '',
      (r.libelle || '').replace(/[|]/g, ' ').substring(0, 25),
      parseFloat(r.debit || 0).toFixed(2),
      parseFloat(r.credit || 0).toFixed(2),
      '', '', '',
      '', ''
    ].join('|'));
  }
  return { content: lignes.join('\n'), filename: `FEC_${annee}.txt`, count: rows.length };
}

// ═══════════════════════════════════════════════════════════════
// EXPORT EXCEL (HTML table format)
// ═══════════════════════════════════════════════════════════════

async function exportExcelComptable(type, exercice) {
  const annee = exercice || new Date().getFullYear();
  if (type === 'ecritures') {
    const [rows] = await pool.execute(`
      SELECT e.numero_ecriture, e.date_ecriture, e.journal_code, e.numero_piece,
        e.compte_code, e.libelle, e.debit, e.credit, e.is_validated
      FROM ecritures_comptables e
      WHERE e.exercice_annee = ?
      ORDER BY e.date_ecriture, e.numero_ecriture
    `, [annee]);
    return { data: rows, filename: `Ecritures_${annee}.xls` };
  }
  if (type === 'balance') {
    const result = await getBalanceGenerale({ exercice: annee });
    return { data: result.comptes, filename: `Balance_${annee}.xls` };
  }
  if (type === 'grand-livre') {
    const result = await getGrandLivre({ exercice: annee });
    return { data: result, filename: `GrandLivre_${annee}.xls` };
  }
  throw new Error('Type non supporté: ' + type);
}

module.exports = {
  // Plan comptable
  getPlanComptable,
  getCompte,
  createCompte,
  // Écritures
  createEcriture,
  validerEcritures,
  contrePasserEcriture,
  getJournal,
  // Mapping automatique
  comptabiliserVente,
  comptabiliserPaiement,
  comptabiliserMouvementCaisse,
  comptabiliserAchat,
  comptabiliserSalaire,
  comptabiliserAvoir,
  comptabiliserHistorique,
  // États financiers
  getGrandLivre,
  getBalanceGenerale,
  getCompteResultat,
  getBilan,
  getDashboardComptable,
  // TVA
  genererDeclarationTVA,
  getDeclarationsTVA,
  // Clôture
  cloturerExercice,
  getClotureEtapes,
  // Abonnements
  getAbonnements,
  createAbonnement,
  updateAbonnement,
  deleteAbonnement,
  executerAbonnement,
  // Balance âgée
  getBalanceAgee,
  // Tiers
  getTiers,
  createTiers,
  updateTiers,
  deleteTiers,
  // Échéancier
  getEcheancier,
  // Lettrage
  getEcrituresPourLettrage,
  lettrerEcritures,
  delettrerEcritures,
  getNextLettre,
  lettrageAutomatique,
  // Relances
  getClientsEnRetard,
  genererRelances,
  // Rapprochement
  getRapprochement,
  validerRapprochement,
  // Budgets
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  // Analytique
  getCentresAnalyse,
  createCentreAnalyse,
  deleteCentreAnalyse,
  // Immobilisations
  getImmobilisations,
  createImmobilisation,
  updateImmobilisation,
  deleteImmobilisation,
  calculerAmortissements,
  // Paramètres
  getParametres,
  saveParametres,
  // Export
  exportFEC,
  exportExcelComptable,
};
