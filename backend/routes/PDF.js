const express = require('express');
const PDFDocument = require('pdfkit');

const { pool } = require('../config/database'); // ✅ IMPORTANT: on récupère pool

const router = express.Router();

/**
 * GET /api/pdf/sales/:saleId?type=invoice|quote|receipt
 * Retourne un PDF en téléchargement
 */
router.get('/sales/:saleId', async (req, res) => {
  const { saleId } = req.params;
  const type = (req.query.type || 'invoice').toString();

  try {
    // 1) Charger la vente
    const [saleRows] = await pool.execute(
      `SELECT s.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
              c.company AS customer_company, c.address AS customer_address, c.city AS customer_city
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.id = ?`,
      [saleId]
    );

    if (!saleRows || saleRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vente introuvable' });
    }

    const sale = saleRows[0];

    // 2) Charger les items
    const [itemRows] = await pool.execute(
      `SELECT si.*, p.name AS product_name
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`,
      [saleId]
    );

    // 3) Préparer la réponse PDF
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });

    const safeNumber = (sale.sale_number || sale.id || 'sale')
      .toString()
      .replace(/[^\w\-]/g, '_');

    const fileName = `${type}_${safeNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // ══════════════════════════════════════════════════════
    // PALETTE ÉLÉGANTE — TONS SOBRES & DOUX
    // ══════════════════════════════════════════════════════
    const C = {
      primary:      '#2c5f7c',   // bleu-ardoise profond
      primaryLight: '#3d7a9c',   // bleu-ardoise clair
      primarySoft:  '#e8f1f5',   // bleu très pâle (fonds)
      accent:       '#c8985e',   // doré sobre / beige chaud
      accentLight:  '#f5efe6',   // doré très pâle
      dark:         '#2d3436',   // texte principal
      medium:       '#636e72',   // texte secondaire
      light:        '#b2bec3',   // texte discret
      veryLight:    '#f8f9fa',   // fond alterné
      white:        '#ffffff',
      border:       '#dfe6e9',   // bordures douces
      success:      '#27ae60',
      successBg:    '#eafaf1',
      tableHead:    '#2c5f7c',   // entête tableau
      tableHeadTxt: '#ffffff',
      rowEven:      '#f4f7f9',
    };

    const PW = 595.28;
    const PH = 841.89;
    const M = 45;
    const CW = PW - M * 2;

    const TITLES = {
      invoice: 'FACTURE',
      quote: 'DEVIS',
      receipt: 'REÇU',
      order: 'BON DE COMMANDE',
    };
    const docTitle = TITLES[type] || 'FACTURE';

    // ══════════════════════════════════════════════════════
    // EN-TÊTE — BANDE SUPÉRIEURE SOBRE
    // ══════════════════════════════════════════════════════

    // Bande principale
    doc.rect(0, 0, PW, 95).fill(C.primary);
    // Filet doré fin sous la bande
    doc.rect(0, 95, PW, 3).fill(C.accent);

    // Logo / Nom entreprise
    doc.fontSize(24).fillColor(C.white).text('ALLO BÉTON', M, 22, { characterSpacing: 3 });
    doc.fontSize(8.5).fillColor('#b8d4e3').text('Matériaux de Construction & BTP', M, 52);
    doc.fontSize(7.5).fillColor('#9ec0d4').text('Dakar, Sénégal  ·  +221 XX XXX XX XX  ·  contact@allobeton.sn', M, 65);

    // Titre du document (côté droit)
    doc.fontSize(20).fillColor(C.white).text(docTitle, PW - M - 220, 24, { width: 220, align: 'right', characterSpacing: 2 });

    // Numéro et date dans l'en-tête
    const dateValue = sale.created_at || sale.createdAt || Date.now();
    const dateStr = new Date(dateValue).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.fontSize(8.5).fillColor('#b8d4e3').text(`N° ${sale.sale_number || sale.id}`, PW - M - 220, 52, { width: 220, align: 'right' });
    doc.text(`${dateStr}`, PW - M - 220, 65, { width: 220, align: 'right' });

    let y = 115;

    // ══════════════════════════════════════════════════════
    // BLOC INFOS : ÉMETTEUR + CLIENT
    // ══════════════════════════════════════════════════════

    // 2 colonnes côte à côte
    const halfW = (CW - 20) / 2;

    // -- Émetteur (gauche) --
    doc.roundedRect(M, y, halfW, 90, 6).fillAndStroke(C.veryLight, C.border);
    doc.rect(M, y, 4, 90).fill(C.primary);
    doc.fontSize(7).fillColor(C.light).text('ÉMETTEUR', M + 16, y + 10);
    doc.fontSize(10).fillColor(C.dark).text('ALLO BÉTON', M + 16, y + 24);
    doc.fontSize(8.5).fillColor(C.medium).text('Dakar, Sénégal', M + 16, y + 40);
    doc.text('+221 XX XXX XX XX', M + 16, y + 54);
    doc.text('contact@allobeton.sn', M + 16, y + 68);

    // -- Client (droite) --
    const cx = M + halfW + 20;
    doc.roundedRect(cx, y, halfW, 90, 6).fillAndStroke(C.accentLight, C.border);
    doc.rect(cx, y, 4, 90).fill(C.accent);
    doc.fontSize(7).fillColor(C.light).text('CLIENT', cx + 16, y + 10);
    doc.fontSize(10).fillColor(C.dark).text(sale.customer_name || '—', cx + 16, y + 24);
    const companyLine = sale.customer_company ? sale.customer_company : '';
    if (companyLine) doc.fontSize(8.5).fillColor(C.medium).text(companyLine, cx + 16, y + 40);
    const addrLine = [sale.customer_address, sale.customer_city].filter(Boolean).join(', ') || '';
    const phoneEmail = [sale.customer_phone, sale.customer_email].filter(Boolean).join('  ·  ') || '—';
    let clientDetailY = y + (companyLine ? 54 : 40);
    if (addrLine) { doc.fontSize(8.5).fillColor(C.medium).text(addrLine, cx + 16, clientDetailY); clientDetailY += 14; }
    doc.fontSize(8.5).fillColor(C.medium).text(phoneEmail, cx + 16, clientDetailY);

    y += 110;

    // ══════════════════════════════════════════════════════
    // TABLEAU DES ARTICLES
    // ══════════════════════════════════════════════════════

    // Section header avec barre colorée
    doc.rect(M, y, 4, 18).fill(C.primaryLight);
    doc.fontSize(11).fillColor(C.primary).text('DÉTAIL DES ARTICLES', M + 14, y + 3, { characterSpacing: 1 });
    y += 30;

    // Colonnes du tableau
    const cols = [
      { label: '#',       x: M,       w: 30,  align: 'center' },
      { label: 'Désignation', x: M + 30,  w: 220, align: 'left' },
      { label: 'Qté',     x: M + 250, w: 60,  align: 'center' },
      { label: 'P.U. (FCFA)', x: M + 310, w: 100, align: 'right' },
      { label: 'Total (FCFA)', x: M + 410, w: CW - 410 + M, align: 'right' },
    ];

    // En-tête du tableau
    doc.roundedRect(M, y, CW, 28, 5).fill(C.tableHead);
    doc.fontSize(8).fillColor(C.tableHeadTxt);
    for (const col of cols) {
      doc.text(col.label.toUpperCase(), col.x + 6, y + 9, { width: col.w - 12, align: col.align });
    }
    y += 28;

    // Lignes des articles
    let computedTotal = 0;

    if (!itemRows || itemRows.length === 0) {
      doc.roundedRect(M, y, CW, 32, 0).fill(C.veryLight);
      doc.fontSize(9).fillColor(C.light).text('Aucun article trouvé pour cette vente.', M + 16, y + 10);
      y += 36;
    } else {
      for (let i = 0; i < itemRows.length; i++) {
        const it = itemRows[i];
        const qty = Number(it.quantity || 0);
        const unit = Number(it.unit_price || it.price || 0);
        const lineTotal = Number(it.total || qty * unit);
        computedTotal += lineTotal;

        const rowH = 26;
        const rowColor = i % 2 === 0 ? C.rowEven : C.white;
        doc.rect(M, y, CW, rowH).fill(rowColor);

        // Fine separator
        doc.save().moveTo(M, y + rowH).lineTo(M + CW, y + rowH).lineWidth(0.3).strokeColor(C.border).stroke().restore();

        doc.fontSize(8.5).fillColor(C.medium);
        doc.text(String(i + 1), cols[0].x + 6, y + 8, { width: cols[0].w - 12, align: 'center' });
        doc.fillColor(C.dark);
        doc.text(it.product_name || it.product_id || 'Produit', cols[1].x + 6, y + 8, { width: cols[1].w - 12, align: 'left' });
        doc.fillColor(C.medium);
        doc.text(String(qty), cols[2].x + 6, y + 8, { width: cols[2].w - 12, align: 'center' });
        doc.text(unit.toLocaleString('fr-FR'), cols[3].x + 6, y + 8, { width: cols[3].w - 12, align: 'right' });
        doc.fillColor(C.dark).fontSize(9);
        doc.text(lineTotal.toLocaleString('fr-FR'), cols[4].x + 6, y + 8, { width: cols[4].w - 12, align: 'right' });

        y += rowH;
      }
    }

    // Ligne de séparation sous tableau
    doc.save().moveTo(M, y).lineTo(M + CW, y).lineWidth(1).strokeColor(C.primary).stroke().restore();
    y += 6;

    // ══════════════════════════════════════════════════════
    // BLOC TOTAL — ALIGNÉ À DROITE, SOBRE & ÉLÉGANT
    // ══════════════════════════════════════════════════════
    const saleTotal = Number(sale.total ?? sale.total_amount ?? sale.amount);
    const finalTotal = Number.isFinite(saleTotal) && saleTotal > 0 ? saleTotal : computedTotal;

    const totalBlockW = 230;
    const totalBlockX = M + CW - totalBlockW;

    // Sous-total
    doc.fontSize(9).fillColor(C.medium);
    doc.text('Sous-total HT', totalBlockX, y + 4, { width: 130, align: 'right' });
    doc.fillColor(C.dark).text(`${computedTotal.toLocaleString('fr-FR')} FCFA`, totalBlockX + 140, y + 4, { width: 90, align: 'right' });
    y += 20;

    // Ligne fine
    doc.save().moveTo(totalBlockX, y).lineTo(totalBlockX + totalBlockW, y).lineWidth(0.5).strokeColor(C.border).stroke().restore();
    y += 6;

    // TVA si applicable
    doc.fontSize(9).fillColor(C.medium);
    doc.text('TVA (18%)', totalBlockX, y, { width: 130, align: 'right' });
    const tva = Math.round(computedTotal * 0.18);
    doc.fillColor(C.dark).text(`${tva.toLocaleString('fr-FR')} FCFA`, totalBlockX + 140, y, { width: 90, align: 'right' });
    y += 22;

    // Encadré TOTAL — fond léger doré
    doc.roundedRect(totalBlockX - 5, y - 2, totalBlockW + 10, 32, 6).fill(C.accentLight);
    doc.roundedRect(totalBlockX - 5, y - 2, totalBlockW + 10, 32, 6).strokeColor(C.accent).lineWidth(1).stroke();
    doc.fontSize(12).fillColor(C.primary).text('TOTAL TTC', totalBlockX, y + 7, { width: 120, align: 'right' });
    doc.fontSize(14).fillColor(C.primary).text(`${finalTotal.toLocaleString('fr-FR')} FCFA`, totalBlockX + 130, y + 5, { width: 100, align: 'right' });
    y += 50;

    // ══════════════════════════════════════════════════════
    // ZONE CONDITIONS & SIGNATURE
    // ══════════════════════════════════════════════════════
    if (y < PH - 200) {
      // Conditions de paiement
      doc.rect(M, y, 4, 18).fill(C.primaryLight);
      doc.fontSize(10).fillColor(C.primary).text('CONDITIONS', M + 14, y + 3, { characterSpacing: 1 });
      y += 28;

      doc.fontSize(8).fillColor(C.medium);
      doc.text('• Paiement à réception de facture sauf accord préalable.', M + 14, y);
      y += 14;
      doc.text('• Tout retard de paiement entraînera des pénalités conformes à la réglementation en vigueur.', M + 14, y);
      y += 14;
      doc.text('• Les marchandises restent la propriété du vendeur jusqu\'au paiement intégral.', M + 14, y);
      y += 30;

      // Zone signature
      const sigW = 180;
      const sigX = M + CW - sigW;
      doc.save().moveTo(sigX, y + 40).lineTo(sigX + sigW, y + 40).lineWidth(0.5).strokeColor(C.light).dash(3, { space: 3 }).stroke().restore();
      doc.fontSize(8).fillColor(C.light).text('Signature & Cachet', sigX, y + 46, { width: sigW, align: 'center' });
    }

    // ══════════════════════════════════════════════════════
    // PIED DE PAGE — TOUTES LES PAGES
    // ══════════════════════════════════════════════════════
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Filet doré fin
      doc.save();
      doc.rect(0, PH - 42, PW, 2).fill(C.accent);
      doc.restore();

      // Bande de pied
      doc.rect(0, PH - 40, PW, 40).fill(C.primary);

      // Texte gauche
      doc.fontSize(7).fillColor('#a8c8dc').text('ALLO BÉTON — Système de Gestion Intégré', M, PH - 30);
      doc.fontSize(6.5).fillColor('#7fafc6').text('Document confidentiel · Merci pour votre confiance', M, PH - 20);

      // Pagination droite
      doc.fontSize(8).fillColor(C.white).text(`${i + 1} / ${totalPages}`, PW - M - 50, PH - 26, { width: 50, align: 'right' });
    }

    doc.end();
  } catch (err) {
    console.error('Erreur génération PDF:', err);
    return res.status(500).json({
      success: false,
      error: 'Erreur génération PDF',
      details: err?.message || String(err),
    });
  }
});

/**
 * GET /api/pdf/customer-statement/:customerId
 * Génère un PDF professionnel de l'état du client (relevé de compte)
 */
router.get('/customer-statement/:customerId', async (req, res) => {
  const { customerId } = req.params;

  try {
    // 1) Charger le client
    const [customerRows] = await pool.execute(
      `SELECT * FROM customers WHERE id = ?`,
      [customerId]
    );

    if (!customerRows || customerRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client introuvable' });
    }

    const customer = customerRows[0];
    const customerType = customer.customer_type || 'simple';
    const prepaidBalance = Number(customer.prepaid_balance || 0);
    const balance = Number(customer.current_balance || customer.balance || 0);
    const creditLimit = Number(customer.credit_limit || 0);
    const customerStatus = customer.status || 'active';

    // 2) Charger les ventes du client
    const [salesRows] = await pool.execute(
      `SELECT s.*,
              (SELECT SUM(si.quantity * si.unit_price) FROM sale_items si WHERE si.sale_id = s.id) as calc_total
       FROM sales s
       WHERE s.customer_id = ?
       ORDER BY s.sale_date DESC, s.created_at DESC
       LIMIT 50`,
      [customerId]
    );

    // 3) Charger les quotas si quotataire
    let quotas = [];
    if (customerType === 'quotataire') {
      const [quotaRows] = await pool.execute(
        `SELECT q.*,
                COALESCE((
                  SELECT SUM(si.quantity)
                  FROM sales s
                  JOIN sale_items si ON si.sale_id = s.id
                  WHERE s.customer_id = q.customer_id
                    AND s.sale_type = 'quotataire'
                    AND DATE(s.sale_date) = q.quota_date
                    AND s.status != 'cancelled'
                ), 0) as quota_consumed
         FROM client_quotas q
         WHERE q.customer_id = ?
         ORDER BY q.quota_date DESC
         LIMIT 10`,
        [customerId]
      );
      quotas = quotaRows || [];
    }

    // 4) Charger les paiements récents
    let payments = [];
    try {
      const [paymentRows] = await pool.execute(
        `SELECT p.* FROM payments p WHERE p.customer_id = ? ORDER BY p.payment_date DESC LIMIT 10`,
        [customerId]
      );
      payments = paymentRows || [];
    } catch (e) { /* table may not exist */ }

    // 5) Créer le PDF
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });

    const safeName = (customer.name || 'client')
      .toString()
      .replace(/[^\w\-\s]/g, '')
      .replace(/\s+/g, '_');

    const fileName = `etat_client_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // ══════════════════════════════════════════════════════
    // PALETTE ÉLÉGANTE — TONS SOBRES & DOUX
    // ══════════════════════════════════════════════════════
    const C = {
      primary:      '#2c5f7c',
      primaryLight: '#3d7a9c',
      primarySoft:  '#e8f1f5',
      accent:       '#c8985e',
      accentLight:  '#f5efe6',
      accentMuted:  '#d4b88c',
      success:      '#3a8a6a',
      successSoft:  '#e9f5ef',
      danger:       '#b85450',
      dangerSoft:   '#fbeae9',
      warning:      '#c6913a',
      warningSoft:  '#faf3e6',
      dark:         '#2d3436',
      medium:       '#636e72',
      light:        '#b2bec3',
      veryLight:    '#f8f9fa',
      white:        '#ffffff',
      border:       '#dfe6e9',
      rowEven:      '#f4f7f9',
      tableHead:    '#2c5f7c',
      tableHeadTxt: '#ffffff',
    };

    const PW = 595.28;
    const PH = 841.89;
    const M = 45;
    const CW = PW - M * 2;

    // Type config — tons sobres
    const TYPE_CONFIG = {
      occasionnel: { label: 'Occasionnel', color: '#7c6e9b', bg: '#f0edf5' },
      simple:      { label: 'Client Simple', color: '#3d7a9c', bg: '#e8f1f5' },
      quotataire:  { label: 'Quotataire', color: '#3a8a6a', bg: '#e9f5ef' },
      revendeur:   { label: 'Revendeur', color: '#c8985e', bg: '#f5efe6' },
    };
    const STATUS_CONFIG = {
      active:    { label: 'Actif', color: '#3a8a6a', bg: '#e9f5ef' },
      inactive:  { label: 'Inactif', color: '#9ca3af', bg: '#f3f4f6' },
      suspended: { label: 'Suspendu', color: '#c6913a', bg: '#faf3e6' },
      bloque:    { label: 'Bloqué', color: '#b85450', bg: '#fbeae9' },
    };

    const typeConf = TYPE_CONFIG[customerType] || TYPE_CONFIG.simple;
    const statusConf = STATUS_CONFIG[customerStatus] || STATUS_CONFIG.active;

    // ══════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════
    function rr(x, y, w, h, r, fill, stroke) {
      doc.save();
      doc.roundedRect(x, y, w, h, r);
      if (fill) doc.fill(fill);
      if (stroke) { doc.roundedRect(x, y, w, h, r); doc.strokeColor(stroke).lineWidth(0.8).stroke(); }
      doc.restore();
    }

    function badge(x, y, text, bg, fg, sz) {
      sz = sz || 7.5;
      doc.fontSize(sz);
      const tw = doc.widthOfString(text);
      const bw = tw + 14;
      const bh = sz + 7;
      rr(x, y, bw, bh, bh / 2, bg);
      doc.fontSize(sz).fillColor(fg).text(text, x + 7, y + 3.5, { width: bw - 14 });
      return bw;
    }

    function sectionTitle(y, title) {
      doc.rect(M, y, 4, 18).fill(C.primaryLight);
      doc.fontSize(11).fillColor(C.primary).text(title.toUpperCase(), M + 14, y + 2, { characterSpacing: 0.8 });
      return y + 28;
    }

    function tableHead(y, columns) {
      rr(M, y, CW, 26, 5, C.tableHead);
      doc.fontSize(7.5).fillColor(C.tableHeadTxt);
      for (const col of columns) {
        doc.text(col.label.toUpperCase(), col.x + 6, y + 8, { width: col.w - 12, align: col.align || 'left' });
      }
      return y + 26;
    }

    function tableRow(y, columns, data, even) {
      if (even) doc.rect(M, y, CW, 22).fill(C.rowEven);
      doc.save().moveTo(M, y + 22).lineTo(M + CW, y + 22).lineWidth(0.3).strokeColor(C.border).stroke().restore();
      doc.fontSize(8.5).fillColor(C.dark);
      for (const col of columns) {
        if (col.colorFn) doc.fillColor(col.colorFn(data));
        doc.text(col.valueFn(data), col.x + 6, y + 6, { width: col.w - 12, align: col.align || 'left' });
        doc.fillColor(C.dark);
      }
      return y + 22;
    }

    function pageBreak(y, needed) {
      if (y + needed > PH - 60) {
        doc.addPage({ size: 'A4', margin: 0 });
        return 50;
      }
      return y;
    }

    // ══════════════════════════════════════════════════════
    // EN-TÊTE — BANDE BLEU-ARDOISE + FILET DORÉ
    // ══════════════════════════════════════════════════════
    doc.rect(0, 0, PW, 95).fill(C.primary);
    doc.rect(0, 95, PW, 3).fill(C.accent);

    doc.fontSize(24).fillColor(C.white).text('ALLO BÉTON', M, 20, { characterSpacing: 3 });
    doc.fontSize(8.5).fillColor('#b8d4e3').text('Matériaux de Construction & BTP', M, 50);
    doc.fontSize(7.5).fillColor('#9ec0d4').text('Dakar, Sénégal  ·  +221 XX XXX XX XX  ·  contact@allobeton.sn', M, 63);

    doc.fontSize(18).fillColor(C.white).text('RELEVÉ DE COMPTE', PW - M - 230, 22, { width: 230, align: 'right', characterSpacing: 2 });
    doc.fontSize(8.5).fillColor('#b8d4e3').text('CLIENT', PW - M - 230, 48, { width: 230, align: 'right' });

    const today = new Date();
    doc.fontSize(7.5).fillColor('#9ec0d4').text(
      `Généré le ${today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      PW - M - 230, 63, { width: 230, align: 'right' }
    );
    doc.text(`Réf: RC-${(customer.id || '').toString().substring(0, 8).toUpperCase()}`, PW - M - 230, 76, { width: 230, align: 'right' });

    let currentY = 115;

    // ══════════════════════════════════════════════════════
    // CARTE CLIENT — FOND BLANC, BORD DOUX
    // ══════════════════════════════════════════════════════
    const cardH = customerType === 'occasionnel' ? 115 : 135;
    rr(M, currentY, CW, cardH, 8, C.white, C.border);
    doc.rect(M, currentY, 4, cardH).fill(typeConf.color);

    // Nom client
    doc.fontSize(16).fillColor(C.dark).text(customer.name || '—', M + 18, currentY + 12);

    // Badges type + status
    const bY = currentY + 14;
    const nw = doc.widthOfString(customer.name || '—');
    let bX = M + 22 + nw + 10;
    if (bX > 340) bX = 340;
    const tbw = badge(bX, bY, typeConf.label, typeConf.bg, typeConf.color);
    badge(bX + tbw + 6, bY, statusConf.label, statusConf.bg, statusConf.color);

    // Infos — 2 colonnes
    const colL = M + 18;
    const colR = M + 265;
    let dY = currentY + 40;

    doc.fontSize(7).fillColor(C.light).text('ENTREPRISE', colL, dY);
    doc.fontSize(9.5).fillColor(C.dark).text(customer.company || '—', colL, dY + 11);
    doc.fontSize(7).fillColor(C.light).text('TÉLÉPHONE', colR, dY);
    doc.fontSize(9.5).fillColor(C.dark).text(customer.phone || '—', colR, dY + 11);
    dY += 28;

    doc.fontSize(7).fillColor(C.light).text('EMAIL', colL, dY);
    doc.fontSize(9.5).fillColor(C.dark).text(customer.email || '—', colL, dY + 11);
    doc.fontSize(7).fillColor(C.light).text('ADRESSE', colR, dY);
    doc.fontSize(9.5).fillColor(C.dark).text(
      `${customer.address || '—'}${customer.city ? ', ' + customer.city : ''}`, colR, dY + 11
    );
    dY += 28;

    if (customerType !== 'occasionnel') {
      doc.fontSize(7).fillColor(C.light).text('RESPONSABLE COMMERCIAL', colL, dY);
      doc.fontSize(9.5).fillColor(C.dark).text(customer.responsable_commercial || '—', colL, dY + 11);
      if (customer.gps_lat && customer.gps_lng) {
        doc.fontSize(7).fillColor(C.light).text('COORDONNÉES GPS', colR, dY);
        doc.fontSize(9.5).fillColor(C.primaryLight).text(
          `${Number(customer.gps_lat).toFixed(6)}, ${Number(customer.gps_lng).toFixed(6)}`, colR, dY + 11
        );
      }
    }

    currentY += cardH + 18;

    // ══════════════════════════════════════════════════════
    // SITUATION FINANCIÈRE — 3 CARTES SOBRES
    // ══════════════════════════════════════════════════════
    currentY = sectionTitle(currentY, 'Situation Financière');

    if (customerType === 'occasionnel') {
      rr(M, currentY, CW, 44, 6, '#f0edf5', '#d7d0e4');
      doc.rect(M, currentY, 4, 44).fill('#7c6e9b');
      doc.fontSize(9).fillColor('#7c6e9b').text('CLIENT OCCASIONNEL — PAIEMENT COMPTANT UNIQUEMENT', M + 16, currentY + 10);
      doc.fontSize(8).fillColor(C.medium).text('Ce client effectue des achats ponctuels. Pas de crédit ni de quota attribué.', M + 16, currentY + 25);
      currentY += 54;
    } else {
      const cw3 = (CW - 20) / 3;
      const fH = 65;

      // Card 1
      if (customerType === 'quotataire') {
        rr(M, currentY, cw3, fH, 6, C.successSoft, '#b8dcc8');
        doc.rect(M, currentY, 3, fH).fill(C.success);
        doc.fontSize(7).fillColor(C.success).text('SOLDE PRÉPAYÉ', M + 12, currentY + 10);
        doc.fontSize(18).fillColor('#2d7a5a').text(`${prepaidBalance.toLocaleString('fr-FR')}`, M + 12, currentY + 24);
        doc.fontSize(8).fillColor(C.success).text('FCFA', M + 12, currentY + 47);
      } else {
        rr(M, currentY, cw3, fH, 6, C.primarySoft, '#b8d4e3');
        doc.rect(M, currentY, 3, fH).fill(C.primary);
        doc.fontSize(7).fillColor(C.primary).text('LIMITE DE CRÉDIT', M + 12, currentY + 10);
        doc.fontSize(18).fillColor('#1e4d66').text(`${creditLimit.toLocaleString('fr-FR')}`, M + 12, currentY + 24);
        doc.fontSize(8).fillColor(C.primary).text('FCFA', M + 12, currentY + 47);
      }

      // Card 2: Dette
      const debtBg = balance > 0 ? C.dangerSoft : C.successSoft;
      const debtLine = balance > 0 ? C.danger : C.success;
      const debtTxt = balance > 0 ? '#943c39' : '#2d7a5a';
      const debtBorder = balance > 0 ? '#e0b3b1' : '#b8dcc8';
      rr(M + cw3 + 10, currentY, cw3, fH, 6, debtBg, debtBorder);
      doc.rect(M + cw3 + 10, currentY, 3, fH).fill(debtLine);
      doc.fontSize(7).fillColor(debtLine).text('DETTE EN COURS', M + cw3 + 22, currentY + 10);
      doc.fontSize(18).fillColor(debtTxt).text(`${balance.toLocaleString('fr-FR')}`, M + cw3 + 22, currentY + 24);
      doc.fontSize(8).fillColor(debtLine).text('FCFA', M + cw3 + 22, currentY + 47);

      // Card 3
      if (customerType === 'quotataire') {
        rr(M + (cw3 + 10) * 2, currentY, cw3, fH, 6, C.warningSoft, '#e3d0a8');
        doc.rect(M + (cw3 + 10) * 2, currentY, 3, fH).fill(C.warning);
        doc.fontSize(7).fillColor(C.warning).text('ACHATS TOTAUX', M + (cw3 + 10) * 2 + 12, currentY + 10);
        doc.fontSize(18).fillColor('#8a6420').text(`${salesRows.length}`, M + (cw3 + 10) * 2 + 12, currentY + 24);
        doc.fontSize(8).fillColor(C.warning).text('commandes', M + (cw3 + 10) * 2 + 12, currentY + 47);
      } else {
        const avail = Math.max(0, creditLimit - balance);
        const avBg = avail > 0 ? C.successSoft : C.dangerSoft;
        const avLine = avail > 0 ? C.success : C.danger;
        const avTxt = avail > 0 ? '#2d7a5a' : '#943c39';
        const avBorder = avail > 0 ? '#b8dcc8' : '#e0b3b1';
        rr(M + (cw3 + 10) * 2, currentY, cw3, fH, 6, avBg, avBorder);
        doc.rect(M + (cw3 + 10) * 2, currentY, 3, fH).fill(avLine);
        doc.fontSize(7).fillColor(avLine).text('CRÉDIT DISPONIBLE', M + (cw3 + 10) * 2 + 12, currentY + 10);
        doc.fontSize(18).fillColor(avTxt).text(`${avail.toLocaleString('fr-FR')}`, M + (cw3 + 10) * 2 + 12, currentY + 24);
        doc.fontSize(8).fillColor(avLine).text('FCFA', M + (cw3 + 10) * 2 + 12, currentY + 47);
      }

      currentY += fH + 8;

      const fiscalParts = [];
      if (customer.tva_exempt) fiscalParts.push('Exonéré TVA');
      if (customer.is_reseller && customer.wholesale_discount > 0) fiscalParts.push(`Remise grossiste: ${customer.wholesale_discount}%`);
      if (fiscalParts.length > 0) {
        doc.fontSize(7.5).fillColor(C.medium).text(`Paramètres fiscaux: ${fiscalParts.join('  ·  ')}`, M, currentY + 2);
        currentY += 14;
      }
    }

    currentY += 10;

    // ══════════════════════════════════════════════════════
    // QUOTAS (si quotataire)
    // ══════════════════════════════════════════════════════
    if (customerType === 'quotataire' && quotas.length > 0) {
      currentY = pageBreak(currentY, 120);
      currentY = sectionTitle(currentY, 'État des Quotas');

      const qCols = [
        { label: 'Date',          x: M,       w: 100, align: 'left' },
        { label: 'Quota Initial', x: M + 100, w: 100, align: 'right' },
        { label: 'Consommé',      x: M + 200, w: 100, align: 'right' },
        { label: 'Restant',       x: M + 300, w: 85,  align: 'right' },
        { label: 'Utilisation',   x: M + 385, w: CW - 385, align: 'center' },
      ];

      currentY = tableHead(currentY, qCols);

      for (let i = 0; i < quotas.length; i++) {
        currentY = pageBreak(currentY, 26);
        const q = quotas[i];
        const consumed = Number(q.quota_consumed || 0);
        const initial = Number(q.quota_initial || 0);
        const remaining = initial - consumed;
        const pct = initial > 0 ? Math.round((consumed / initial) * 100) : 0;
        const dateStr = new Date(q.quota_date).toLocaleDateString('fr-FR');

        if (i % 2 === 0) doc.rect(M, currentY, CW, 24).fill(C.rowEven);
        doc.save().moveTo(M, currentY + 24).lineTo(M + CW, currentY + 24).lineWidth(0.3).strokeColor(C.border).stroke().restore();

        doc.fontSize(8.5).fillColor(C.dark);
        doc.text(dateStr, M + 6, currentY + 7, { width: 88 });
        doc.text(`${initial} T`, M + 106, currentY + 7, { width: 88, align: 'right' });
        doc.text(`${consumed} T`, M + 206, currentY + 7, { width: 88, align: 'right' });

        const remCol = remaining <= 0 ? C.danger : remaining < initial * 0.2 ? C.warning : C.success;
        doc.fillColor(remCol).text(`${remaining} T`, M + 306, currentY + 7, { width: 73, align: 'right' });

        // Progress bar élégante
        const barX = M + 400;
        const barY2 = currentY + 9;
        const barW = 60;
        const barH = 7;
        rr(barX, barY2, barW, barH, 3.5, '#e2e8f0');
        if (pct > 0) {
          const fillW = Math.min(barW, (pct / 100) * barW);
          const barC = pct >= 100 ? C.danger : pct >= 80 ? C.warning : C.success;
          rr(barX, barY2, fillW, barH, 3.5, barC);
        }
        doc.fontSize(7).fillColor(C.medium).text(`${pct}%`, barX + barW + 4, barY2, { width: 25 });

        doc.fillColor(C.dark);
        currentY += 24;
      }

      currentY += 12;
    }

    // ══════════════════════════════════════════════════════
    // HISTORIQUE DES ACHATS
    // ══════════════════════════════════════════════════════
    currentY = pageBreak(currentY, 80);
    currentY = sectionTitle(currentY, `Historique des Achats (${salesRows.length} dernières)`);

    if (salesRows.length === 0) {
      rr(M, currentY, CW, 36, 6, C.veryLight, C.border);
      doc.fontSize(9).fillColor(C.light).text('Aucune commande enregistrée pour ce client.', M + 16, currentY + 12);
      currentY += 46;
    } else {
      const sCols = [
        { label: 'Date', x: M, w: 80, align: 'left',
          valueFn: (s) => new Date(s.sale_date || s.created_at).toLocaleDateString('fr-FR') },
        { label: 'N° Vente', x: M + 80, w: 115, align: 'left',
          valueFn: (s) => s.sale_number || (s.id || '').toString().substring(0, 10) },
        { label: 'Type', x: M + 195, w: 75, align: 'left',
          valueFn: (s) => {
            const t = s.sale_type || 'standard';
            return t === 'quotataire' ? 'Quota' : t === 'cash' ? 'Comptant' : t.charAt(0).toUpperCase() + t.slice(1);
          }
        },
        { label: 'Montant (FCFA)', x: M + 270, w: 110, align: 'right',
          valueFn: (s) => `${Number(s.total_amount || s.calc_total || 0).toLocaleString('fr-FR')}` },
        { label: 'Statut', x: M + 380, w: CW - 380, align: 'center',
          valueFn: (s) => {
            const st = s.status || 'pending';
            return st === 'paid' ? 'Payé' : st === 'confirmed' ? 'Confirmé' :
                   st === 'cancelled' ? 'Annulé' : st === 'delivered' ? 'Livré' : 'En attente';
          },
          colorFn: (s) => {
            const st = s.status || 'pending';
            return st === 'paid' ? C.success : st === 'cancelled' ? C.danger :
                   st === 'confirmed' ? C.primary : st === 'delivered' ? '#6a5fa0' : C.light;
          }
        },
      ];

      currentY = tableHead(currentY, sCols);

      let totalPurchases = 0;
      let paidTotal = 0;

      for (let i = 0; i < salesRows.length; i++) {
        currentY = pageBreak(currentY, 26);
        const sale = salesRows[i];
        const amount = Number(sale.total_amount || sale.calc_total || 0);
        const status = sale.status || 'pending';
        totalPurchases += amount;
        if (status === 'paid') paidTotal += amount;
        currentY = tableRow(currentY, sCols, sale, i % 2 === 0);
      }

      // Séparateur fin
      currentY += 4;
      doc.save().moveTo(M, currentY).lineTo(M + CW, currentY).lineWidth(0.8).strokeColor(C.primary).stroke().restore();
      currentY += 10;

      // 3 cartes récapitulatives — design sobre
      const sw = (CW - 20) / 3;
      const sh = 40;

      // Total achats
      rr(M, currentY, sw, sh, 6, C.primarySoft, '#b8d4e3');
      doc.rect(M, currentY, 3, sh).fill(C.primary);
      doc.fontSize(7).fillColor(C.primary).text('TOTAL ACHATS', M + 12, currentY + 6);
      doc.fontSize(12).fillColor('#1e4d66').text(`${totalPurchases.toLocaleString('fr-FR')} F`, M + 12, currentY + 20);

      // Total payé
      rr(M + sw + 10, currentY, sw, sh, 6, C.successSoft, '#b8dcc8');
      doc.rect(M + sw + 10, currentY, 3, sh).fill(C.success);
      doc.fontSize(7).fillColor(C.success).text('TOTAL PAYÉ', M + sw + 22, currentY + 6);
      doc.fontSize(12).fillColor('#2d7a5a').text(`${paidTotal.toLocaleString('fr-FR')} F`, M + sw + 22, currentY + 20);

      // Impayé
      const unpaid = totalPurchases - paidTotal;
      const uBg = unpaid > 0 ? C.dangerSoft : C.successSoft;
      const uLine = unpaid > 0 ? C.danger : C.success;
      const uTxt = unpaid > 0 ? '#943c39' : '#2d7a5a';
      const uBorder = unpaid > 0 ? '#e0b3b1' : '#b8dcc8';
      rr(M + (sw + 10) * 2, currentY, sw, sh, 6, uBg, uBorder);
      doc.rect(M + (sw + 10) * 2, currentY, 3, sh).fill(uLine);
      doc.fontSize(7).fillColor(uLine).text('IMPAYÉ', M + (sw + 10) * 2 + 12, currentY + 6);
      doc.fontSize(12).fillColor(uTxt).text(`${unpaid.toLocaleString('fr-FR')} F`, M + (sw + 10) * 2 + 12, currentY + 20);

      currentY += sh + 12;
    }

    // ══════════════════════════════════════════════════════
    // PAIEMENTS RÉCENTS (si existants)
    // ══════════════════════════════════════════════════════
    if (payments && payments.length > 0) {
      currentY = pageBreak(currentY, 80);
      currentY = sectionTitle(currentY, 'Paiements Récents');

      const pCols = [
        { label: 'Date', x: M, w: 100, align: 'left',
          valueFn: (p) => new Date(p.payment_date || p.created_at).toLocaleDateString('fr-FR') },
        { label: 'Montant (FCFA)', x: M + 100, w: 130, align: 'right',
          valueFn: (p) => `${Number(p.amount || 0).toLocaleString('fr-FR')}` },
        { label: 'Méthode', x: M + 230, w: 120, align: 'left',
          valueFn: (p) => {
            const m = p.payment_method || '—';
            return m === 'cash' ? 'Espèces' : m === 'transfer' ? 'Virement' : m === 'check' ? 'Chèque' : m === 'mobile' ? 'Mobile' : m;
          }
        },
        { label: 'Référence', x: M + 350, w: CW - 350, align: 'left',
          valueFn: (p) => p.reference || p.payment_number || '—' },
      ];

      currentY = tableHead(currentY, pCols);

      for (let i = 0; i < payments.length; i++) {
        currentY = pageBreak(currentY, 26);
        currentY = tableRow(currentY, pCols, payments[i], i % 2 === 0);
      }

      currentY += 12;
    }

    // ══════════════════════════════════════════════════════
    // NOTES & OBSERVATIONS
    // ══════════════════════════════════════════════════════
    if (customer.notes) {
      currentY = pageBreak(currentY, 60);
      currentY = sectionTitle(currentY, 'Notes & Observations');

      rr(M, currentY, CW, 42, 6, C.accentLight, '#ddd0b8');
      doc.rect(M, currentY, 4, 42).fill(C.accent);
      doc.fontSize(8.5).fillColor(C.medium).text(customer.notes, M + 16, currentY + 10, {
        width: CW - 32,
        height: 26,
        ellipsis: true,
      });
      currentY += 52;
    }

    // ══════════════════════════════════════════════════════
    // PIED DE PAGE — TOUTES LES PAGES
    // ══════════════════════════════════════════════════════
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Filet doré
      doc.save();
      doc.rect(0, PH - 42, PW, 2).fill(C.accent);
      doc.restore();

      // Bande de pied bleu-ardoise
      doc.rect(0, PH - 40, PW, 40).fill(C.primary);

      doc.fontSize(7).fillColor('#a8c8dc').text('ALLO BÉTON — Système de Gestion Intégré', M, PH - 30);
      doc.fontSize(6.5).fillColor('#7fafc6').text('Document confidentiel · Merci pour votre confiance', M, PH - 20);

      doc.fontSize(8).fillColor(C.white).text(`${i + 1} / ${totalPages}`, PW - M - 50, PH - 26, { width: 50, align: 'right' });
    }

    doc.end();
  } catch (err) {
    console.error('Erreur génération PDF client:', err);
    return res.status(500).json({
      success: false,
      error: 'Erreur génération PDF',
      details: err?.message || String(err),
    });
  }
});

module.exports = router;


// ═══════════════════════════════════════════════════════════
// BULLETIN DE PAIE PDF
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/pdf/payslip/:payslipId
 * Génère un bulletin de paie PDF professionnel
 */
router.get('/payslip/:payslipId', async (req, res) => {
  const { payslipId } = req.params;

  try {
    // 1) Charger le bulletin + employé
    const [rows] = await pool.execute(`
      SELECT sp.*, 
             e.first_name, e.last_name, e.employee_number, e.position, e.department,
             e.hire_date, e.contract_type, e.email, e.phone, e.rib, e.bank_name
      FROM salary_payments sp
      JOIN employees e ON sp.employee_id = e.id
      WHERE sp.id = ?
    `, [payslipId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bulletin introuvable' });
    }

    const p = rows[0];
    const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const periodLabel = `${MONTHS[p.payment_month - 1]} ${p.payment_year}`;

    const gross = Number(p.gross_salary || 0);
    const baseSalary = Number(p.base_salary || 0);
    const transport = Number(p.transport_allowance || 0);
    const housing = Number(p.housing_allowance || 0);
    const bonuses = Number(p.bonuses || 0);
    const deductions = Number(p.deductions || 0);
    const advanceDeducted = Number(p.advance_deducted || 0);
    const totalDeductions = deductions + advanceDeducted;
    const net = Number(p.net_salary || 0);

    // 2) Créer le PDF
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    const safeName = `${p.last_name}_${p.first_name}`.replace(/[^\w]/g, '_');
    const fileName = `bulletin_${safeName}_${MONTHS[p.payment_month - 1]}_${p.payment_year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // ── Colors ──
    const primary = '#4f46e5';    // indigo
    const secondary = '#6366f1';  // indigo-500
    const dark = '#0f172a';       // slate-900
    const muted = '#64748b';      // slate-500  
    const light = '#f1f5f9';      // slate-100
    const success = '#059669';    // emerald-600
    const danger = '#dc2626';     // red-600

    // ── En-tête entreprise ──
    doc.rect(0, 0, 595.28, 100).fill(primary);
    doc.fontSize(24).fillColor('#ffffff').text('ALLO BÉTON', 50, 25, { continued: false });
    doc.fontSize(10).fillColor('rgba(255,255,255,0.8)').text('Société de vente de béton prêt à l\'emploi', 50, 55);
    doc.fontSize(9).fillColor('rgba(255,255,255,0.6)').text('Dakar, Sénégal · contact@allobeton.sn', 50, 72);
    
    // Badge période
    doc.roundedRect(400, 28, 160, 45, 8).fill('#ffffff');
    doc.fontSize(9).fillColor(muted).text('BULLETIN DE PAIE', 410, 35, { width: 140, align: 'center' });
    doc.fontSize(13).fillColor(primary).text(periodLabel, 410, 50, { width: 140, align: 'center' });

    // ── Informations employé ──
    const infoY = 120;
    doc.roundedRect(40, infoY, 515.28, 90, 6).fillAndStroke(light, '#e2e8f0');
    
    doc.fontSize(10).fillColor(primary).text('EMPLOYÉ', 55, infoY + 12, { underline: false });
    doc.fontSize(10).fillColor(dark);
    doc.text(`${p.first_name} ${p.last_name}`, 55, infoY + 28);
    doc.fontSize(9).fillColor(muted);
    doc.text(`N° ${p.employee_number}`, 55, infoY + 44);
    doc.text(`${p.position || '—'} · ${p.department || '—'}`, 55, infoY + 58);
    doc.text(`Contrat : ${p.contract_type || 'CDI'}`, 55, infoY + 72);

    doc.fontSize(10).fillColor(primary).text('COORDONNÉES', 320, infoY + 12);
    doc.fontSize(9).fillColor(muted);
    doc.text(`Email : ${p.email || '—'}`, 320, infoY + 28);
    doc.text(`Tél : ${p.phone || '—'}`, 320, infoY + 44);
    doc.text(`Banque : ${p.bank_name || '—'}`, 320, infoY + 58);
    doc.text(`RIB : ${p.rib || '—'}`, 320, infoY + 72);

    // ── Tableau des éléments de paie ──
    const tableY = 230;
    
    // En-tête tableau
    doc.rect(40, tableY, 515.28, 28).fill(primary);
    doc.fontSize(9).fillColor('#ffffff');
    doc.text('DÉSIGNATION', 55, tableY + 9, { width: 250 });
    doc.text('GAINS', 350, tableY + 9, { width: 100, align: 'right' });
    doc.text('RETENUES', 450, tableY + 9, { width: 100, align: 'right' });

    let rowY = tableY + 28;
    const rowH = 26;

    const addRow = (label, gain, retenue, highlight) => {
      if (highlight) {
        doc.rect(40, rowY, 515.28, rowH).fill('#f8fafc');
      }
      doc.moveTo(40, rowY + rowH).lineTo(555.28, rowY + rowH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.fontSize(9).fillColor(dark).text(label, 55, rowY + 8, { width: 280 });
      if (gain > 0) doc.fontSize(9).fillColor(success).text(gain.toLocaleString('fr-FR') + ' F', 350, rowY + 8, { width: 100, align: 'right' });
      if (retenue > 0) doc.fontSize(9).fillColor(danger).text(retenue.toLocaleString('fr-FR') + ' F', 450, rowY + 8, { width: 100, align: 'right' });
      rowY += rowH;
    };

    addRow('Salaire de base', baseSalary, 0, false);
    addRow('Indemnité de transport', transport, 0, true);
    addRow('Indemnité de logement', housing, 0, false);
    if (bonuses > 0) addRow(`Primes${p.bonus_description ? ' — ' + p.bonus_description : ''}`, bonuses, 0, true);
    if (deductions > 0) addRow(`Retenues${p.deduction_description ? ' — ' + p.deduction_description : ''}`, 0, deductions, false);
    if (advanceDeducted > 0) addRow('Remboursement avance sur salaire', 0, advanceDeducted, true);

    // Ligne totaux
    rowY += 4;
    doc.rect(40, rowY, 515.28, 30).fill(light);
    doc.moveTo(40, rowY).lineTo(555.28, rowY).strokeColor('#cbd5e1').lineWidth(1).stroke();
    doc.fontSize(10).fillColor(dark).text('TOTAUX', 55, rowY + 9, { width: 280 });
    doc.fontSize(10).fillColor(success).text(gross.toLocaleString('fr-FR') + ' F', 350, rowY + 9, { width: 100, align: 'right' });
    if (totalDeductions > 0) doc.fontSize(10).fillColor(danger).text(totalDeductions.toLocaleString('fr-FR') + ' F', 450, rowY + 9, { width: 100, align: 'right' });
    rowY += 40;

    // ── Bloc NET À PAYER ──
    doc.roundedRect(40, rowY, 515.28, 60, 8).fill(primary);
    doc.fontSize(11).fillColor('rgba(255,255,255,0.7)').text('NET À PAYER', 55, rowY + 12);
    doc.fontSize(28).fillColor('#ffffff').text(net.toLocaleString('fr-FR') + ' FCFA', 55, rowY + 26, { width: 500, align: 'center' });
    rowY += 75;

    // ── Informations de paiement ──
    const paymentDate = p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-FR') : 'Non spécifiée';
    const methodLabels = { virement: 'Virement bancaire', espèces: 'Espèces', chèque: 'Chèque', mobile_money: 'Mobile Money' };
    const statusLabels = { draft: 'Brouillon', paid: 'Payé', cancelled: 'Annulé' };

    doc.roundedRect(40, rowY, 250, 65, 6).fillAndStroke('#f0fdf4', '#bbf7d0');
    doc.fontSize(9).fillColor(success).text('PAIEMENT', 55, rowY + 10);
    doc.fontSize(9).fillColor(dark);
    doc.text(`Mode : ${methodLabels[p.payment_method] || p.payment_method || '—'}`, 55, rowY + 26);
    doc.text(`Date : ${paymentDate}`, 55, rowY + 40);

    const statusColor = p.status === 'paid' ? success : p.status === 'cancelled' ? danger : muted;
    doc.roundedRect(305, rowY, 250, 65, 6).fillAndStroke(p.status === 'paid' ? '#f0fdf4' : '#fff7ed', p.status === 'paid' ? '#bbf7d0' : '#fed7aa');
    doc.fontSize(9).fillColor(statusColor).text('STATUT', 320, rowY + 10);
    doc.fontSize(14).fillColor(statusColor).text(statusLabels[p.status] || p.status, 320, rowY + 30);
    rowY += 80;

    // ── Notes ──
    if (p.notes) {
      doc.fontSize(9).fillColor(muted).text('Notes :', 40, rowY);
      doc.fontSize(9).fillColor(dark).text(p.notes, 40, rowY + 14, { width: 515 });
      rowY += 40;
    }

    // ── Pied de page ──
    const footerY = 770;
    doc.moveTo(40, footerY).lineTo(555.28, footerY).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.fontSize(8).fillColor(muted).text(
      `Bulletin généré le ${new Date().toLocaleDateString('fr-FR')} · ALLO BÉTON · Ce document est confidentiel`,
      40, footerY + 8, { width: 515.28, align: 'center' }
    );

    doc.end();
  } catch (err) {
    console.error('Erreur génération bulletin PDF:', err);
    return res.status(500).json({ success: false, error: 'Erreur génération PDF', details: err?.message });
  }
});

/**
 * GET /api/pdf/payslip-batch/:year/:month
 * Génère tous les bulletins du mois en un seul PDF multi-pages
 */
router.get('/payslip-batch/:year/:month', async (req, res) => {
  const { year, month } = req.params;

  try {
    const [rows] = await pool.execute(`
      SELECT sp.*, 
             e.first_name, e.last_name, e.employee_number, e.position, e.department,
             e.hire_date, e.contract_type, e.email, e.phone, e.rib, e.bank_name
      FROM salary_payments sp
      JOIN employees e ON sp.employee_id = e.id
      WHERE sp.payment_year = ? AND sp.payment_month = ?
      ORDER BY e.last_name, e.first_name
    `, [parseInt(year), parseInt(month)]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Aucun bulletin trouvé pour cette période' });
    }

    const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const periodLabel = `${MONTHS[parseInt(month) - 1]} ${year}`;

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const fileName = `bulletins_${MONTHS[parseInt(month) - 1]}_${year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    const primary = '#4f46e5';
    const dark = '#0f172a';
    const muted = '#64748b';
    const light = '#f1f5f9';
    const success = '#059669';
    const danger = '#dc2626';

    rows.forEach((p, idx) => {
      if (idx > 0) doc.addPage();

      const gross = Number(p.gross_salary || 0);
      const baseSalary = Number(p.base_salary || 0);
      const transport = Number(p.transport_allowance || 0);
      const housing = Number(p.housing_allowance || 0);
      const bonuses = Number(p.bonuses || 0);
      const deductions = Number(p.deductions || 0);
      const advanceDeducted = Number(p.advance_deducted || 0);
      const totalDeductions = deductions + advanceDeducted;
      const net = Number(p.net_salary || 0);

      // En-tête
      doc.rect(0, 0, 595.28, 85).fill(primary);
      doc.fontSize(20).fillColor('#ffffff').text('ALLO BÉTON', 50, 20);
      doc.fontSize(9).fillColor('rgba(255,255,255,0.7)').text('Bulletin de paie — ' + periodLabel, 50, 48);
      doc.fontSize(9).fillColor('rgba(255,255,255,0.5)').text(`${idx + 1} / ${rows.length}`, 50, 62);
      doc.roundedRect(400, 20, 155, 40, 6).fill('#ffffff');
      doc.fontSize(12).fillColor(primary).text(periodLabel, 410, 33, { width: 135, align: 'center' });

      // Employé
      const iy = 100;
      doc.roundedRect(40, iy, 515.28, 55, 4).fillAndStroke(light, '#e2e8f0');
      doc.fontSize(11).fillColor(dark).text(`${p.first_name} ${p.last_name}`, 55, iy + 10);
      doc.fontSize(8).fillColor(muted).text(`N° ${p.employee_number} · ${p.position || '—'} · ${p.department || '—'} · ${p.contract_type || 'CDI'}`, 55, iy + 28);
      doc.fontSize(8).fillColor(muted).text(`${p.bank_name || '—'} · ${p.rib || '—'}`, 55, iy + 40);

      // Tableau
      const tY = 170;
      doc.rect(40, tY, 515.28, 22).fill(primary);
      doc.fontSize(8).fillColor('#ffffff');
      doc.text('DÉSIGNATION', 55, tY + 7, { width: 250 });
      doc.text('GAINS', 350, tY + 7, { width: 95, align: 'right' });
      doc.text('RETENUES', 450, tY + 7, { width: 100, align: 'right' });

      let rY = tY + 22;
      const rH = 20;
      const drawRow = (label, gain, ret, alt) => {
        if (alt) doc.rect(40, rY, 515.28, rH).fill('#f8fafc');
        doc.moveTo(40, rY + rH).lineTo(555.28, rY + rH).strokeColor('#e2e8f0').lineWidth(0.4).stroke();
        doc.fontSize(8).fillColor(dark).text(label, 55, rY + 6, { width: 280 });
        if (gain > 0) doc.fontSize(8).fillColor(success).text(gain.toLocaleString('fr-FR') + ' F', 350, rY + 6, { width: 95, align: 'right' });
        if (ret > 0) doc.fontSize(8).fillColor(danger).text(ret.toLocaleString('fr-FR') + ' F', 450, rY + 6, { width: 100, align: 'right' });
        rY += rH;
      };

      drawRow('Salaire de base', baseSalary, 0, false);
      drawRow('Ind. transport', transport, 0, true);
      drawRow('Ind. logement', housing, 0, false);
      if (bonuses > 0) drawRow(`Primes${p.bonus_description ? ' — ' + p.bonus_description : ''}`, bonuses, 0, true);
      if (deductions > 0) drawRow(`Retenues${p.deduction_description ? ' — ' + p.deduction_description : ''}`, 0, deductions, false);
      if (advanceDeducted > 0) drawRow('Remb. avance', 0, advanceDeducted, true);

      rY += 3;
      doc.rect(40, rY, 515.28, 24).fill(light);
      doc.fontSize(9).fillColor(dark).text('TOTAUX', 55, rY + 7);
      doc.fontSize(9).fillColor(success).text(gross.toLocaleString('fr-FR') + ' F', 350, rY + 7, { width: 95, align: 'right' });
      if (totalDeductions > 0) doc.fontSize(9).fillColor(danger).text(totalDeductions.toLocaleString('fr-FR') + ' F', 450, rY + 7, { width: 100, align: 'right' });
      rY += 34;

      // NET
      doc.roundedRect(40, rY, 515.28, 50, 6).fill(primary);
      doc.fontSize(10).fillColor('rgba(255,255,255,0.7)').text('NET À PAYER', 55, rY + 8);
      doc.fontSize(24).fillColor('#ffffff').text(net.toLocaleString('fr-FR') + ' FCFA', 55, rY + 20, { width: 500, align: 'center' });

      // Pied
      doc.fontSize(7).fillColor(muted).text(
        `Généré le ${new Date().toLocaleDateString('fr-FR')} · ALLO BÉTON · Confidentiel`,
        40, 775, { width: 515.28, align: 'center' }
      );
    });

    doc.end();
  } catch (err) {
    console.error('Erreur génération batch PDF:', err);
    return res.status(500).json({ success: false, error: 'Erreur génération PDF batch', details: err?.message });
  }
});

module.exports = router;
