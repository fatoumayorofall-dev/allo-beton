/**
 * ALLO BETON - RELEVE DE COMPTE CLIENT PDF
 * Version 4.0 - Tres professionnel, zero debordement
 */

const express = require('express');
const PDFDocument = require('pdfkit');
const { pool } = require('../config/database');

const router = express.Router();

/* ========== Helpers ========== */

const fmtMoney = (n) => {
  const num = Math.round(Number(n) || 0);
  if (num === 0) return '0';
  const neg = num < 0;
  const abs = Math.abs(num).toString();
  let out = '';
  for (let i = abs.length - 1, c = 0; i >= 0; i--, c++) {
    if (c > 0 && c % 3 === 0) out = ' ' + out;
    out = abs[i] + out;
  }
  return neg ? '-' + out : out;
};

const fmtCompact = (n) => {
  const num = Number(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.', ',') + 'M';
  if (num >= 10000) return Math.round(num / 1000) + 'K';
  return fmtMoney(num);
};

const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return '-'; }
};

const fmtDateLong = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

/** Tronquer un texte pour qu'il ne depasse jamais la largeur donnee */
const truncate = (str, maxChars) => {
  if (!str) return '-';
  return str.length > maxChars ? str.substring(0, maxChars - 1) + '..' : str;
};

/* ========== Route ========== */
router.get('/customer-statement/:customerId', async (req, res) => {
  const { customerId } = req.params;

  try {
    /* --- Donnees --- */
    const [customerRows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!customerRows || !customerRows.length) return res.status(404).json({ success: false, error: 'Client introuvable' });
    const customer = customerRows[0];

    const [salesRows] = await pool.execute(
      `SELECT s.*, COALESCE(s.total_amount, 0) AS amount,
              COALESCE((SELECT SUM(si.quantity) FROM sale_items si WHERE si.sale_id = s.id), 0) AS qty
       FROM sales s WHERE s.customer_id = ? ORDER BY s.sale_date DESC LIMIT 50`, [customerId]);

    const [paymentsRows] = await pool.execute(
      `SELECT p.* FROM payments p JOIN sales s ON s.id = p.sale_id
       WHERE s.customer_id = ? ORDER BY p.payment_date DESC LIMIT 50`, [customerId]);

    const [monthlyStats] = await pool.execute(
      `SELECT DATE_FORMAT(s.sale_date,'%Y-%m') AS month, DATE_FORMAT(s.sale_date,'%b') AS month_name,
              SUM(s.total_amount) AS total
       FROM sales s WHERE s.customer_id = ? AND s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY month, month_name ORDER BY month ASC`, [customerId]);

    const [topProducts] = await pool.execute(
      `SELECT p.name, SUM(si.quantity) AS qty, SUM(si.quantity * si.unit_price) AS value
       FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN products p ON p.id = si.product_id
       WHERE s.customer_id = ? GROUP BY p.id, p.name ORDER BY value DESC LIMIT 5`, [customerId]);

    /* --- PDF Setup --- */
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const safeName = (customer.name || 'client').replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="releve_${safeName}_${new Date().toISOString().split('T')[0]}.pdf"`);
    doc.pipe(res);

    /* --- Dimensions --- */
    const W = 595, H = 842;
    const M = 42;           // marge gauche/droite
    const CW = W - M * 2;   // largeur utile = 511
    const R = M + CW;       // bord droit

    /* --- Palette --- */
    const C = {
      navy:     '#1B2A4A',
      navyMid:  '#2C4A7C',
      gold:     '#C8922A',
      dark:     '#111827',
      text:     '#1F2937',
      textMid:  '#4B5563',
      textLt:   '#6B7280',
      muted:    '#9CA3AF',
      line:     '#E5E7EB',
      lineD:    '#D1D5DB',
      bg:       '#F9FAFB',
      bgAlt:    '#F3F4F6',
      white:    '#FFFFFF',
      green:    '#047857',
      greenBg:  '#ECFDF5',
      red:      '#B91C1C',
      redBg:    '#FEF2F2',
      orange:   '#B45309',
      orangeBg: '#FEF3C7',
      blue:     '#1E40AF',
      blueBg:   '#DBEAFE',
    };

    const footerH = 40;
    let pageNum = 1;
    let y = 0;

    /* ===== Utilitaires de dessin ===== */

    /** Texte contraint: ecrit dans une boite stricte, jamais de debordement */
    const txt = (text, x, ty, w, opts = {}) => {
      doc.text(String(text || '-'), x, ty, { width: w, lineBreak: false, ellipsis: true, ...opts });
    };

    const needPage = (needed) => {
      if (y + needed > H - footerH - 20) {
        drawFooter();
        pageNum++;
        doc.addPage({ size: 'A4', margin: 0 });
        y = 36;
        return true;
      }
      return false;
    };

    const sectionTitle = (title, atY) => {
      doc.rect(M, atY + 1, 3, 13).fill(C.gold);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navy);
      txt(title, M + 12, atY + 1, CW - 12);
    };

    const drawFooter = () => {
      const fy = H - footerH;
      doc.rect(0, fy, W, footerH).fill(C.navy);
      doc.rect(0, fy, W, 1.5).fill(C.gold);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.white);
      txt('ALLO BETON  -  Materiaux de Construction', M, fy + 10, 300);
      doc.font('Helvetica').fontSize(6.5).fillColor('#8899B0');
      txt('Dakar, Senegal  |  +221 33 860 12 34  |  contact@allobeton.sn', M, fy + 22, 340);

      doc.font('Helvetica').fontSize(7).fillColor('#8899B0');
      txt('Document confidentiel', W / 2 - 40, fy + 22, 80, { align: 'center' });

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.white);
      txt('Page ' + pageNum, R - 50, fy + 14, 50, { align: 'right' });
    };


    /* =============================================
     *  EN-TETE
     * ============================================= */

    doc.rect(0, 0, W, 96).fill(C.navy);
    doc.rect(0, 96, W, 2).fill(C.gold);

    // Gauche : logo
    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.white);
    txt('ALLO BETON', M, 22, 200);
    doc.rect(M, 48, 36, 2).fill(C.gold);
    doc.font('Helvetica').fontSize(8).fillColor('#B0BEC5');
    txt('Materiaux de Construction - Dakar, Senegal', M, 56, 260);
    doc.font('Helvetica').fontSize(7).fillColor('#7E8FA6');
    txt('+221 33 860 12 34  |  contact@allobeton.sn', M, 70, 260);

    // Droite : titre
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.white);
    txt('RELEVE DE COMPTE', R - 150, 24, 150, { align: 'right' });
    doc.font('Helvetica').fontSize(8).fillColor('#B0BEC5');
    txt(fmtDateLong(), R - 150, 42, 150, { align: 'right' });
    doc.font('Helvetica').fontSize(7).fillColor('#7E8FA6');
    const refId = customer.id ? 'RC-' + customer.id.substring(0, 8).toUpperCase() : '-';
    txt('Ref : ' + refId, R - 150, 58, 150, { align: 'right' });

    y = 112;


    /* =============================================
     *  CARTE CLIENT
     * ============================================= */

    const cardH = 68;
    doc.roundedRect(M, y, CW, cardH, 4).fill(C.white);
    doc.roundedRect(M, y, CW, cardH, 4).lineWidth(0.5).strokeColor(C.line).stroke();
    doc.rect(M, y, 3, cardH).fill(C.gold);

    // Avatar
    const avX = M + 30, avY = y + cardH / 2;
    doc.circle(avX, avY, 16).fill(C.navy);
    const initials = customer.name ? customer.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '??';
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.white);
    txt(initials, avX - 12, avY - 6, 24, { align: 'center' });

    // Nom + type (zone gauche: de avX+24 jusqu'a rcX-10)
    const nameX = M + 58;
    const nameW = 200;
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark);
    txt(truncate(customer.name || 'Client', 30), nameX, y + 14, nameW);

    const typeMap = { simple: 'Client Standard', quotataire: 'Quotataire', revendeur: 'Revendeur Pro', occasionnel: 'Occasionnel' };
    const typeTxt = typeMap[customer.customer_type] || 'Client';
    const companyTxt = customer.company ? ' - ' + truncate(customer.company, 20) : '';
    doc.font('Helvetica').fontSize(7.5).fillColor(C.textLt);
    txt(typeTxt + companyTxt, nameX, y + 32, nameW);

    // Contact (colonne droite)
    const rcX = M + 280;
    const rcW1 = 100;
    const rcW2 = R - rcX - rcW1 - 10;

    doc.font('Helvetica').fontSize(6.5).fillColor(C.muted);
    txt('TELEPHONE', rcX, y + 8, rcW1);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text);
    txt(customer.phone || '-', rcX, y + 19, rcW1);

    doc.font('Helvetica').fontSize(6.5).fillColor(C.muted);
    txt('EMAIL', rcX + rcW1, y + 8, rcW2);
    doc.font('Helvetica').fontSize(7.5).fillColor(C.text);
    txt(truncate(customer.email, 22) || '-', rcX + rcW1, y + 19, rcW2);

    doc.font('Helvetica').fontSize(6.5).fillColor(C.muted);
    txt('ADRESSE', rcX, y + 38, rcW1 + rcW2);
    doc.font('Helvetica').fontSize(7.5).fillColor(C.text);
    const addrTxt = [customer.address, customer.city].filter(Boolean).join(', ') || '-';
    txt(truncate(addrTxt, 40), rcX, y + 49, rcW1 + rcW2);

    y += cardH + 18;


    /* =============================================
     *  SYNTHESE FINANCIERE (4 KPIs)
     * ============================================= */

    sectionTitle('SYNTHESE FINANCIERE', y);
    y += 22;

    const totalSales = salesRows.length;
    const totalRevenue = salesRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalPaid = paymentsRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const balance = Number(customer.current_balance || customer.balance || 0);
    const avgOrder = totalSales > 0 ? totalRevenue / totalSales : 0;

    const kpis = [
      { label: 'TOTAL ACHATS',  val: fmtMoney(totalRevenue),        unit: 'FCFA',       col: C.navy },
      { label: 'TOTAL PAYE',    val: fmtMoney(totalPaid),           unit: 'FCFA',       col: C.green },
      { label: 'SOLDE',         val: fmtMoney(Math.abs(balance)),   unit: balance > 0 ? 'FCFA du' : (balance < 0 ? 'FCFA credit' : 'FCFA'), col: balance > 0 ? C.red : C.green },
      { label: 'PANIER MOYEN',  val: fmtMoney(Math.round(avgOrder)),unit: 'FCFA / cmd', col: C.navyMid },
    ];

    const kpiGap = 8;
    const kpiW = (CW - kpiGap * 3) / 4;
    const kpiH = 60;

    kpis.forEach((k, i) => {
      const kx = M + i * (kpiW + kpiGap);
      const innerW = kpiW - 16;

      doc.roundedRect(kx, y, kpiW, kpiH, 4).fill(C.white);
      doc.roundedRect(kx, y, kpiW, kpiH, 4).lineWidth(0.5).strokeColor(C.line).stroke();
      // Barre couleur haut
      doc.roundedRect(kx + 10, y, kpiW - 20, 2.5, 1).fill(k.col);

      doc.font('Helvetica').fontSize(6.5).fillColor(C.muted);
      txt(k.label, kx + 8, y + 12, innerW);

      doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark);
      txt(k.val, kx + 8, y + 25, innerW);

      doc.font('Helvetica').fontSize(6.5).fillColor(C.textLt);
      txt(k.unit, kx + 8, y + 44, innerW);
    });

    y += kpiH + 20;


    /* =============================================
     *  GRAPHIQUE + TOP PRODUITS
     * ============================================= */

    const colGap = 12;
    const halfW = (CW - colGap) / 2;

    // Titre gauche
    doc.rect(M, y + 1, 3, 12).fill(C.gold);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.navy);
    txt('EVOLUTION (6 MOIS)', M + 10, y, halfW - 10);

    // Titre droite
    const rx = M + halfW + colGap;
    doc.rect(rx, y + 1, 3, 12).fill(C.gold);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.navy);
    txt('TOP PRODUITS', rx + 10, y, halfW - 10);
    y += 18;

    const chartH = 95;

    // --- Graphique barres ---
    doc.roundedRect(M, y, halfW, chartH, 4).fill(C.white);
    doc.roundedRect(M, y, halfW, chartH, 4).lineWidth(0.5).strokeColor(C.line).stroke();

    if (monthlyStats && monthlyStats.length) {
      const data = monthlyStats.map(m => Number(m.total) || 0);
      const maxVal = Math.max(...data, 1);
      const barMax = 46;
      const count = data.length;
      const totalBarArea = halfW - 40;
      const gap = 5;
      const barW = Math.min(26, (totalBarArea / count) - gap);
      const startX = M + 20;
      const baseY = y + chartH - 20;

      data.forEach((val, i) => {
        const barH = Math.max(2, (val / maxVal) * barMax);
        const bx = startX + i * (barW + gap);
        doc.roundedRect(bx, baseY - barH, barW, barH, 2).fill(C.navy);
        if (val > 0) {
          doc.font('Helvetica-Bold').fontSize(5.5).fillColor(C.navy);
          txt(fmtCompact(val), bx - 2, baseY - barH - 10, barW + 4, { align: 'center' });
        }
        doc.font('Helvetica').fontSize(5.5).fillColor(C.textMid);
        txt((monthlyStats[i].month_name || '').substring(0, 3), bx, baseY + 4, barW, { align: 'center' });
      });
    } else {
      doc.font('Helvetica').fontSize(8).fillColor(C.muted);
      txt('Pas de donnees', M + 20, y + 40, halfW - 40, { align: 'center' });
    }

    // --- Top produits ---
    doc.roundedRect(rx, y, halfW, chartH, 4).fill(C.white);
    doc.roundedRect(rx, y, halfW, chartH, 4).lineWidth(0.5).strokeColor(C.line).stroke();

    if (topProducts && topProducts.length) {
      const topMax = Number(topProducts[0].value) || 1;
      const nameColW = halfW - 120;
      const barTotalW = 36;
      let py = y + 10;

      topProducts.forEach((p, i) => {
        const pval = Number(p.value) || 0;
        const pct = Math.round((pval / topMax) * 100);

        // Pastille
        doc.circle(rx + 14, py + 4, 6.5).fill(C.navy);
        doc.font('Helvetica-Bold').fontSize(6).fillColor(C.white);
        txt(String(i + 1), rx + 9, py + 1, 10, { align: 'center' });

        // Nom produit (tronque)
        doc.font('Helvetica').fontSize(7).fillColor(C.text);
        txt(truncate(p.name, 18), rx + 26, py, nameColW);

        // Barre progression
        const barX = rx + halfW - 80;
        doc.roundedRect(barX, py + 1, barTotalW, 6, 3).fill(C.bgAlt);
        doc.roundedRect(barX, py + 1, Math.max(2, (pct / 100) * barTotalW), 6, 3).fill(C.navy);

        // Montant
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.textMid);
        txt(fmtCompact(pval), rx + halfW - 40, py, 30, { align: 'right' });

        py += 17;
      });
    } else {
      doc.font('Helvetica').fontSize(8).fillColor(C.muted);
      txt('Aucun produit', rx + 20, y + 40, halfW - 40, { align: 'center' });
    }

    y += chartH + 20;


    /* =============================================
     *  TABLEAU DES TRANSACTIONS
     * ============================================= */

    needPage(70);
    sectionTitle('HISTORIQUE DES TRANSACTIONS', y);
    y += 22;

    // Colonnes du tableau - positions et largeurs strictes
    const tbl = {
      date:    { x: M + 8, w: 62 },
      ref:     { x: M + 74, w: 110 },
      qty:     { x: M + 190, w: 50 },
      amount:  { x: M + 246, w: 100 },
      status:  { x: M + 360, w: CW - 360 + M },
    };

    const drawTblHead = (atY) => {
      doc.roundedRect(M, atY, CW, 20, 3).fill(C.navy);
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.white);
      txt('DATE',       tbl.date.x,   atY + 6, tbl.date.w);
      txt('REFERENCE',  tbl.ref.x,    atY + 6, tbl.ref.w);
      txt('QTE (T)',    tbl.qty.x,    atY + 6, tbl.qty.w,    { align: 'right' });
      txt('MONTANT',    tbl.amount.x, atY + 6, tbl.amount.w, { align: 'right' });
      txt('STATUT',     tbl.status.x, atY + 6, tbl.status.w, { align: 'center' });
    };

    drawTblHead(y);
    y += 22;

    const rowH = 20;
    const statusMap = {
      pending:   { label: 'En attente', bg: C.orangeBg, fg: C.orange },
      confirmed: { label: 'Confirme',   bg: C.blueBg,   fg: C.blue },
      paid:      { label: 'Paye',       bg: C.greenBg,  fg: C.green },
      delivered: { label: 'Livre',      bg: '#E0E7FF',  fg: '#3730A3' },
      cancelled: { label: 'Annule',     bg: C.redBg,    fg: C.red },
    };

    if (!salesRows.length) {
      doc.roundedRect(M, y, CW, 30, 3).fill(C.bg);
      doc.font('Helvetica').fontSize(8).fillColor(C.muted);
      txt('Aucune transaction enregistree', M, y + 10, CW, { align: 'center' });
      y += 42;
    } else {
      for (let i = 0; i < salesRows.length; i++) {
        if (needPage(rowH + 6)) {
          drawTblHead(y);
          y += 22;
        }

        const s = salesRows[i];
        if (i % 2 === 0) doc.rect(M, y, CW, rowH).fill(C.bg);

        const st = statusMap[s.status] || statusMap.pending;

        doc.font('Helvetica').fontSize(7).fillColor(C.text);
        txt(fmtDate(s.sale_date || s.created_at), tbl.date.x, y + 5, tbl.date.w);

        doc.font('Helvetica').fontSize(7).fillColor(C.textMid);
        txt(truncate(s.sale_number || (s.id ? s.id.substring(0, 12) : '-'), 16), tbl.ref.x, y + 5, tbl.ref.w);

        doc.font('Helvetica').fontSize(7).fillColor(C.text);
        txt(Number(s.qty || 0).toFixed(1), tbl.qty.x, y + 5, tbl.qty.w, { align: 'right' });

        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.dark);
        txt(fmtMoney(s.amount), tbl.amount.x, y + 5, tbl.amount.w, { align: 'right' });

        // Badge statut
        const bw = 50, bx = tbl.status.x + (tbl.status.w - bw) / 2;
        doc.roundedRect(bx, y + 3, bw, 14, 7).fill(st.bg);
        doc.font('Helvetica-Bold').fontSize(5.5).fillColor(st.fg);
        txt(st.label, bx, y + 6, bw, { align: 'center' });

        y += rowH;
      }

      // Total
      y += 4;
      doc.rect(M, y, CW, 0.8).fill(C.navy);
      y += 8;

      doc.roundedRect(M, y, CW, 26, 4).fill(C.bgAlt);
      doc.roundedRect(M, y, CW, 26, 4).lineWidth(0.5).strokeColor(C.line).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor(C.textMid);
      txt(salesRows.length + ' transaction(s)', M + 12, y + 8, 120);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(C.dark);
      txt(fmtMoney(totalRevenue) + '  FCFA', R - 200, y + 6, 188, { align: 'right' });
      y += 38;
    }


    /* =============================================
     *  PAIEMENTS RECUS
     * ============================================= */

    if (paymentsRows.length > 0) {
      needPage(100);
      sectionTitle('PAIEMENTS RECUS', y);
      y += 22;

      // Colonnes paiements - strictes
      const pc = {
        date: { x: M + 8, w: 70 },
        meth: { x: M + 84, w: 90 },
        ref:  { x: M + 180, w: 140 },
        amt:  { x: M + 330, w: R - M - 340 },
      };

      const drawPayHead = (atY) => {
        doc.roundedRect(M, atY, CW, 18, 3).fill(C.bgAlt);
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(C.textMid);
        txt('DATE',     pc.date.x, atY + 5, pc.date.w);
        txt('METHODE',  pc.meth.x, atY + 5, pc.meth.w);
        txt('REFERENCE',pc.ref.x,  atY + 5, pc.ref.w);
        txt('MONTANT',  pc.amt.x,  atY + 5, pc.amt.w, { align: 'right' });
      };

      drawPayHead(y);
      y += 22;

      const mtdMap = { cash: 'Especes', bank_transfer: 'Virement', check: 'Cheque', mobile_money: 'Mobile Money', wave: 'Wave', om: 'Orange Money' };
      const showPay = Math.min(paymentsRows.length, 10);

      for (let i = 0; i < showPay; i++) {
        if (needPage(20)) {
          drawPayHead(y);
          y += 22;
        }
        const p = paymentsRows[i];
        if (i % 2 === 0) doc.rect(M, y, CW, 18).fill(C.bg);

        doc.font('Helvetica').fontSize(7).fillColor(C.text);
        txt(fmtDate(p.payment_date || p.created_at), pc.date.x, y + 4, pc.date.w);

        doc.font('Helvetica').fontSize(7).fillColor(C.textMid);
        txt(mtdMap[p.payment_method] || p.payment_method || '-', pc.meth.x, y + 4, pc.meth.w);

        doc.font('Helvetica').fontSize(6.5).fillColor(C.muted);
        txt(truncate(p.reference || (p.id ? p.id.substring(0, 12) : '-'), 22), pc.ref.x, y + 4, pc.ref.w);

        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.green);
        txt(fmtMoney(p.amount), pc.amt.x, y + 4, pc.amt.w, { align: 'right' });

        y += 18;
      }

      // Total paye
      y += 6;
      const payTotalW = CW / 2;
      const payTotalX = R - payTotalW;
      doc.roundedRect(payTotalX, y, payTotalW, 24, 4).fill(C.greenBg);
      doc.roundedRect(payTotalX, y, payTotalW, 24, 4).lineWidth(0.5).strokeColor(C.green).stroke();

      doc.font('Helvetica').fontSize(7).fillColor(C.green);
      txt('Total paye', payTotalX + 10, y + 7, 60);
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.green);
      txt(fmtMoney(totalPaid) + '  FCFA', payTotalX + 70, y + 5, payTotalW - 82, { align: 'right' });
      y += 36;
    }


    /* =============================================
     *  SOLDE FINAL
     * ============================================= */

    needPage(52);

    const soldePos = balance > 0;
    const soldeCol = soldePos ? C.red : C.green;
    const soldeBg  = soldePos ? C.redBg : C.greenBg;
    const soldeLbl = soldePos ? 'SOLDE DU PAR LE CLIENT' : (balance < 0 ? 'CREDIT EN FAVEUR DU CLIENT' : 'SOLDE EQUILIBRE');

    doc.roundedRect(M, y, CW, 44, 4).fill(soldeBg);
    doc.roundedRect(M, y, CW, 44, 4).lineWidth(0.8).strokeColor(soldeCol).stroke();
    doc.rect(M, y, 4, 44).fill(soldeCol);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(soldeCol);
    txt(soldeLbl, M + 14, y + 8, 200);
    doc.font('Helvetica').fontSize(6.5).fillColor(C.textLt);
    txt('Arrete au ' + fmtDateLong(), M + 14, y + 24, 200);

    doc.font('Helvetica-Bold').fontSize(18).fillColor(soldeCol);
    txt(fmtMoney(Math.abs(balance)) + '  FCFA', R - 230, y + 8, 218, { align: 'right' });


    /* ===== FOOTER ===== */
    drawFooter();
    doc.end();

  } catch (err) {
    console.error('Erreur PDF releve client:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
