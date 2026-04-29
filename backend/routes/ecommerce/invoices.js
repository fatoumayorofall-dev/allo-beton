/**
 * ALLO BÉTON - API FACTURES E-COMMERCE
 * Génération et gestion des factures PDF
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const pool = require('../../db');

const { authenticateCustomer, authenticateCustomerOrAdmin } = require('../../middleware/ecommerceAuth');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { sendEmail } = require('../../services/emailService');

// ============================================================
// HELPERS
// ============================================================

/**
 * Générer un numéro de facture unique
 */
const generateInvoiceNumber = async (type = 'invoice') => {
  const seqName = type === 'proforma' ? 'proforma' : type === 'credit_note' ? 'credit_note' : 'invoice';

  await pool.query(
    'UPDATE ecom_sequences SET current_value = current_value + 1 WHERE name = ?',
    [seqName]
  );
  const [seq] = await pool.query('SELECT * FROM ecom_sequences WHERE name = ?', [seqName]);

  const prefix = seq[0].prefix;
  const value = seq[0].current_value;
  const year = new Date().getFullYear();

  return `${prefix}-${year}-${String(value).padStart(6, '0')}`;
};

/**
 * Récupérer les paramètres de l'entreprise
 */
const getCompanySettings = async () => {
  const [settings] = await pool.query(
    'SELECT `key`, value FROM ecom_settings WHERE `group` = "company"'
  );
  const result = {};
  settings.forEach(s => result[s.key] = s.value);
  return result;
};

/**
 * Formater un prix
 */
const formatPrice = (amount) => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

/**
 * Formater une date
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

// ============================================================
// SERVICE GÉNÉRATION PDF
// ============================================================

/**
 * Générer le HTML de la facture
 */
const generateInvoiceHTML = async (invoice, items, company) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      color: #333;
      line-height: 1.5;
    }
    .invoice {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4F46E5;
    }
    .logo-section h1 {
      font-size: 28px;
      color: #4F46E5;
      margin-bottom: 5px;
    }
    .logo-section p {
      color: #666;
      font-size: 11px;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-info h2 {
      font-size: 24px;
      color: #4F46E5;
      margin-bottom: 10px;
    }
    .invoice-number {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .invoice-date {
      color: #666;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .party {
      width: 45%;
    }
    .party-title {
      font-size: 11px;
      text-transform: uppercase;
      color: #999;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    .party-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .party-details {
      color: #666;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #4F46E5;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
    }
    th:last-child, td:last-child {
      text-align: right;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .product-name {
      font-weight: 500;
    }
    .product-sku {
      font-size: 10px;
      color: #999;
    }
    .totals {
      margin-left: auto;
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .totals-row.total {
      border-top: 2px solid #4F46E5;
      border-bottom: none;
      font-size: 18px;
      font-weight: bold;
      color: #4F46E5;
      padding-top: 15px;
    }
    .payment-info {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .payment-info h4 {
      margin-bottom: 10px;
      color: #4F46E5;
    }
    .footer {
      text-align: center;
      padding-top: 30px;
      border-top: 1px solid #eee;
      color: #999;
      font-size: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-paid { background: #DEF7EC; color: #03543F; }
    .status-pending { background: #FEF3C7; color: #92400E; }
    .status-overdue { background: #FEE2E2; color: #991B1B; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="logo-section">
        <h1>${company.company_name || 'Allo Béton'}</h1>
        <p>${company.company_address || 'Dakar, Sénégal'}</p>
        <p>Tél: ${company.company_phone || '+221 77 307 45 34'}</p>
        <p>Email: ${company.company_email || 'contact@allobeton.sn'}</p>
        ${company.company_ninea ? `<p>NINEA: ${company.company_ninea}</p>` : ''}
        ${company.company_rc ? `<p>RC: ${company.company_rc}</p>` : ''}
      </div>
      <div class="invoice-info">
        <h2>${invoice.type === 'proforma' ? 'PROFORMA' : invoice.type === 'credit_note' ? 'AVOIR' : 'FACTURE'}</h2>
        <div class="invoice-number">${invoice.invoice_number}</div>
        <div class="invoice-date">
          Date: ${formatDate(invoice.issue_date)}<br>
          Échéance: ${formatDate(invoice.due_date)}
        </div>
        <div style="margin-top: 10px;">
          <span class="status-badge status-${invoice.status === 'paid' ? 'paid' : invoice.status === 'overdue' ? 'overdue' : 'pending'}">
            ${invoice.status === 'paid' ? 'PAYÉE' : invoice.status === 'overdue' ? 'EN RETARD' : 'EN ATTENTE'}
          </span>
        </div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-title">Facturé à</div>
        <div class="party-name">${invoice.customer_name}</div>
        <div class="party-details">
          ${invoice.customer_address || ''}<br>
          ${invoice.customer_phone ? `Tél: ${invoice.customer_phone}` : ''}<br>
          ${invoice.customer_email ? `Email: ${invoice.customer_email}` : ''}
          ${invoice.customer_ninea ? `<br>NINEA: ${invoice.customer_ninea}` : ''}
        </div>
      </div>
      <div class="party">
        <div class="party-title">Commande</div>
        <div class="party-name">${invoice.order_number || 'N/A'}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40%">Désignation</th>
          <th style="width: 15%">Qté</th>
          <th style="width: 15%">Prix Unit.</th>
          <th style="width: 15%">TVA</th>
          <th style="width: 15%">Total HT</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>
              <div class="product-name">${item.name}</div>
              ${item.sku ? `<div class="product-sku">Réf: ${item.sku}</div>` : ''}
              ${item.description ? `<div class="product-sku">${item.description}</div>` : ''}
            </td>
            <td>${item.quantity} ${item.unit || ''}</td>
            <td>${formatPrice(item.unit_price)}</td>
            <td>${item.tax_rate}%</td>
            <td>${formatPrice(item.quantity * item.unit_price)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Sous-total HT</span>
        <span>${formatPrice(invoice.subtotal)}</span>
      </div>
      ${invoice.discount_amount > 0 ? `
        <div class="totals-row">
          <span>Remise</span>
          <span>-${formatPrice(invoice.discount_amount)}</span>
        </div>
      ` : ''}
      <div class="totals-row">
        <span>TVA (${invoice.tax_rate}%)</span>
        <span>${formatPrice(invoice.tax_amount)}</span>
      </div>
      ${invoice.shipping_amount > 0 ? `
        <div class="totals-row">
          <span>Frais de livraison</span>
          <span>${formatPrice(invoice.shipping_amount)}</span>
        </div>
      ` : ''}
      <div class="totals-row total">
        <span>Total TTC</span>
        <span>${formatPrice(invoice.total)}</span>
      </div>
      ${invoice.amount_paid > 0 ? `
        <div class="totals-row">
          <span>Montant payé</span>
          <span>${formatPrice(invoice.amount_paid)}</span>
        </div>
        <div class="totals-row" style="font-weight: bold;">
          <span>Reste à payer</span>
          <span>${formatPrice(invoice.amount_due)}</span>
        </div>
      ` : ''}
    </div>

    ${invoice.notes ? `
      <div class="payment-info">
        <h4>Notes</h4>
        <p>${invoice.notes}</p>
      </div>
    ` : ''}

    ${invoice.terms ? `
      <div class="payment-info">
        <h4>Conditions</h4>
        <p>${invoice.terms}</p>
      </div>
    ` : ''}

    <div class="footer">
      <p>${company.company_name || 'Allo Béton'} - ${company.company_address || 'Dakar, Sénégal'}</p>
      <p>Tél: ${company.company_phone || '+221 77 307 45 34'} | Email: ${company.company_email || 'contact@allobeton.sn'}</p>
      ${company.company_ninea ? `<p>NINEA: ${company.company_ninea} | RC: ${company.company_rc || ''}</p>` : ''}
      <p style="margin-top: 10px;">Merci de votre confiance !</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
};

// ============================================================
// GÉNÉRATION PDF NATIVE (pdfkit)
// ============================================================

const BRAND_COLOR = [230, 115, 0]; // Orange Allo Béton
const DARK = [30, 30, 30];
const GRAY = [100, 100, 100];
const LIGHT_GRAY = [240, 240, 240];

/**
 * Génère un PDF de facture via pdfkit.
 * @returns {Promise<Buffer>}
 */
const generateInvoicePDF = (invoice, items, company) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  const buffers = [];
  doc.on('data', b => buffers.push(b));
  doc.on('end', () => resolve(Buffer.concat(buffers)));
  doc.on('error', reject);

  const W = doc.page.width - 100; // zone utile
  const LEFT = 50;
  const RIGHT = LEFT + W;

  /* ── Helpers ─────────────────────────────────────── */
  const setColor = ([r, g, b]) => doc.fillColor(`rgb(${r},${g},${b})`);
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';
  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }); }
    catch { return String(d || ''); }
  };

  /* ── EN-TÊTE ─────────────────────────────────────── */
  // Bande supérieure orange
  doc.rect(LEFT - 50, 0, doc.page.width, 6).fill(`rgb(${BRAND_COLOR.join(',')})`);

  // Nom de l'entreprise
  setColor(BRAND_COLOR);
  doc.font('Helvetica-Bold').fontSize(22).text(company.company_name || 'Allo Béton', LEFT, 20);
  setColor(GRAY);
  doc.font('Helvetica').fontSize(9)
     .text(company.company_address || 'Dakar, Sénégal', LEFT, 48)
     .text(`Tél: ${company.company_phone || '+221 77 307 45 34'}`, LEFT, 60)
     .text(`Email: ${company.company_email || 'contact@allobeton.sn'}`, LEFT, 72);
  if (company.company_ninea) doc.text(`NINEA: ${company.company_ninea}${company.company_rc ? ' | RC: ' + company.company_rc : ''}`, LEFT, 84);

  // Type de facture (droite)
  const typeLabel = invoice.type === 'proforma' ? 'PROFORMA' : invoice.type === 'credit_note' ? 'AVOIR' : 'FACTURE';
  setColor(BRAND_COLOR);
  doc.font('Helvetica-Bold').fontSize(26).text(typeLabel, 0, 20, { align: 'right', width: doc.page.width - 50 });
  setColor(DARK);
  doc.font('Helvetica-Bold').fontSize(11).text(invoice.invoice_number, 0, 54, { align: 'right', width: doc.page.width - 50 });
  setColor(GRAY);
  doc.font('Helvetica').fontSize(9)
     .text(`Date : ${fmtDate(invoice.issue_date)}`, 0, 68, { align: 'right', width: doc.page.width - 50 })
     .text(`Échéance : ${fmtDate(invoice.due_date)}`, 0, 80, { align: 'right', width: doc.page.width - 50 });

  // Séparateur
  let y = 105;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(`rgb(${BRAND_COLOR.join(',')})`).lineWidth(2).stroke();
  y += 18;

  /* ── PARTIES ──────────────────────────────────────── */
  setColor(GRAY); doc.font('Helvetica-Bold').fontSize(8).text('FACTURÉ À', LEFT, y);
  doc.text('COMMANDE', LEFT + W * 0.55, y);
  y += 14;
  setColor(DARK); doc.font('Helvetica-Bold').fontSize(11).text(invoice.customer_name || '', LEFT, y);
  doc.text(invoice.order_number || 'N/A', LEFT + W * 0.55, y);
  y += 14;
  setColor(GRAY); doc.font('Helvetica').fontSize(9);
  if (invoice.customer_address) { doc.text(invoice.customer_address, LEFT, y); y += 12; }
  if (invoice.customer_phone) { doc.text(`Tél: ${invoice.customer_phone}`, LEFT, y); y += 12; }
  if (invoice.customer_email) { doc.text(`Email: ${invoice.customer_email}`, LEFT, y); y += 12; }
  if (invoice.customer_ninea) { doc.text(`NINEA: ${invoice.customer_ninea}`, LEFT, y); y += 12; }
  y += 10;

  /* ── TABLEAU DES ARTICLES ─────────────────────────── */
  // En-tête tableau
  doc.rect(LEFT, y, W, 22).fill(`rgb(${BRAND_COLOR.join(',')})`);
  setColor([255,255,255]); doc.font('Helvetica-Bold').fontSize(9);
  const cols = [
    { label: 'DÉSIGNATION', x: LEFT + 4, w: W * 0.38 },
    { label: 'QTÉ', x: LEFT + W * 0.42, w: 50 },
    { label: 'PRIX UNIT.', x: LEFT + W * 0.55, w: 80 },
    { label: 'TVA', x: LEFT + W * 0.74, w: 40 },
    { label: 'TOTAL HT', x: RIGHT - 75, w: 75 },
  ];
  cols.forEach(c => doc.text(c.label, c.x, y + 7, { width: c.w }));
  y += 22;

  // Lignes
  items.forEach((item, i) => {
    const rowH = 30;
    if (i % 2 === 1) doc.rect(LEFT, y, W, rowH).fill(`rgb(${LIGHT_GRAY.join(',')})`).fillOpacity(1);
    setColor(DARK); doc.font('Helvetica-Bold').fontSize(9).text(item.name || '', LEFT + 4, y + 5, { width: cols[0].w });
    if (item.sku) { setColor(GRAY); doc.font('Helvetica').fontSize(8).text(`Réf: ${item.sku}`, LEFT + 4, y + 17, { width: cols[0].w }); }
    setColor(DARK); doc.font('Helvetica').fontSize(9);
    doc.text(`${item.quantity} ${item.unit || ''}`, cols[1].x, y + 10, { width: cols[1].w });
    doc.text(fmt(item.unit_price), cols[2].x, y + 10, { width: cols[2].w });
    doc.text(`${item.tax_rate || 0}%`, cols[3].x, y + 10, { width: cols[3].w });
    doc.text(fmt(item.quantity * item.unit_price), cols[4].x, y + 10, { width: cols[4].w });
    y += rowH;
  });
  y += 15;

  /* ── TOTAUX ───────────────────────────────────────── */
  const totX = LEFT + W * 0.57;
  const totW = W * 0.43;
  const totLine = (label, val, bold = false, big = false) => {
    doc.moveTo(totX, y).lineTo(RIGHT, y).strokeColor('#dddddd').lineWidth(0.5).stroke();
    setColor(big ? BRAND_COLOR : DARK);
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(big ? 13 : 9);
    doc.text(label, totX, y + 5, { width: totW * 0.6 });
    doc.text(val, totX + totW * 0.6, y + 5, { width: totW * 0.4, align: 'right' });
    y += (big ? 22 : 18);
  };

  totLine('Sous-total HT', fmt(invoice.subtotal));
  if (invoice.discount_amount > 0) totLine('Remise', `-${fmt(invoice.discount_amount)}`);
  totLine(`TVA (${invoice.tax_rate || 0}%)`, fmt(invoice.tax_amount));
  if (invoice.shipping_amount > 0) totLine('Frais de livraison', fmt(invoice.shipping_amount));
  totLine('TOTAL TTC', fmt(invoice.total), true, true);
  if (invoice.amount_paid > 0) {
    totLine('Montant payé', fmt(invoice.amount_paid));
    totLine('Reste à payer', fmt(invoice.amount_due), true);
  }

  /* ── NOTES ────────────────────────────────────────── */
  if (invoice.notes || invoice.terms) {
    y += 10;
    doc.rect(LEFT, y, W, 1).fill('#eeeeee');
    y += 8;
    if (invoice.notes) {
      setColor(GRAY); doc.font('Helvetica-Bold').fontSize(9).text('Notes', LEFT, y);
      y += 12;
      setColor(DARK); doc.font('Helvetica').fontSize(9).text(invoice.notes, LEFT, y, { width: W });
      y += doc.heightOfString(invoice.notes, { width: W }) + 8;
    }
    if (invoice.terms) {
      setColor(GRAY); doc.font('Helvetica-Bold').fontSize(9).text('Conditions', LEFT, y);
      y += 12;
      setColor(DARK); doc.font('Helvetica').fontSize(9).text(invoice.terms, LEFT, y, { width: W });
    }
  }

  /* ── PIED DE PAGE ─────────────────────────────────── */
  const pageH = doc.page.height;
  doc.rect(LEFT - 50, pageH - 50, doc.page.width, 50).fill(`rgb(${BRAND_COLOR.join(',')})`);
  doc.fillColor('white').font('Helvetica').fontSize(8)
     .text(
       `${company.company_name || 'Allo Béton'} — ${company.company_address || 'Dakar, Sénégal'} — Tél: ${company.company_phone || ''} — Merci de votre confiance !`,
       LEFT, pageH - 34, { align: 'center', width: W }
     );

  doc.end();
});

// ============================================================
// ROUTES
// ============================================================

/**
 * POST /api/ecommerce/invoices
 * Créer une facture depuis une commande
 */
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { order_id, type = 'invoice', notes, terms, due_days = 30 } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, error: 'Commande requise' });
    }

    // Récupérer la commande
    const [orders] = await pool.query(`
      SELECT o.*, c.first_name, c.last_name, c.email, c.phone,
             c.company_name, c.company_ninea, c.company_rc
      FROM ecom_orders o
      JOIN ecom_customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `, [order_id]);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }

    const order = orders[0];

    // Vérifier si facture existe déjà (sauf proforma)
    if (type === 'invoice') {
      const [existing] = await pool.query(
        'SELECT id FROM ecom_invoices WHERE order_id = ? AND type = "invoice"',
        [order_id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: 'Une facture existe déjà pour cette commande' });
      }
    }

    // Générer numéro
    const invoiceNumber = await generateInvoiceNumber(type);
    const invoiceId = uuidv4();
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + due_days * 24 * 60 * 60 * 1000);

    // Créer la facture
    await pool.query(`
      INSERT INTO ecom_invoices (
        id, invoice_number, order_id, customer_id, type, status,
        subtotal, tax_rate, tax_amount, discount_amount, shipping_amount, total,
        amount_paid, customer_name, customer_email, customer_phone, customer_address,
        customer_ninea, customer_rc, issue_date, due_date, notes, terms
      ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoiceId, invoiceNumber, order_id, order.customer_id, type,
      order.subtotal, order.tax_rate, order.tax_amount, order.discount_amount,
      order.shipping_amount, order.total, order.amount_paid,
      order.company_name || `${order.first_name} ${order.last_name}`,
      order.email, order.phone, order.billing_address,
      order.company_ninea, order.company_rc, issueDate, dueDate, notes, terms
    ]);

    // Créer les lignes
    const [orderItems] = await pool.query(
      'SELECT * FROM ecom_order_items WHERE order_id = ?',
      [order_id]
    );

    for (const item of orderItems) {
      await pool.query(`
        INSERT INTO ecom_invoice_items (
          id, invoice_id, order_item_id, product_id, sku, name, description,
          unit, quantity, unit_price, discount_amount, tax_rate, tax_amount, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), invoiceId, item.id, item.product_id, item.sku, item.name,
        item.description, item.unit, item.quantity, item.unit_price,
        item.discount_amount, item.tax_rate, item.tax_amount, item.total
      ]);
    }

    const [invoice] = await pool.query('SELECT * FROM ecom_invoices WHERE id = ?', [invoiceId]);

    res.status(201).json({
      success: true,
      message: 'Facture créée',
      data: invoice[0]
    });

  } catch (error) {
    console.error('Erreur création facture:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/invoices/:id
 * Détail d'une facture
 */
router.get('/:id', authenticateCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.customer_id;
    const isAdmin = req.user.role === 'admin';

    let query = 'SELECT i.*, o.order_number FROM ecom_invoices i LEFT JOIN ecom_orders o ON i.order_id = o.id WHERE i.id = ?';
    const params = [id];

    if (!isAdmin) {
      query += ' AND i.customer_id = ?';
      params.push(customerId);
    }

    const [invoices] = await pool.query(query, params);

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }

    const [items] = await pool.query(
      'SELECT * FROM ecom_invoice_items WHERE invoice_id = ?',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...invoices[0],
        items
      }
    });

  } catch (error) {
    console.error('Erreur détail facture:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/invoices/:id/pdf
 * Générer/télécharger le PDF
 */
router.get('/:id/pdf', authenticateCustomerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.customer_id;
    const isAdmin = req.user.role === 'admin';

    let query = 'SELECT i.*, o.order_number FROM ecom_invoices i LEFT JOIN ecom_orders o ON i.order_id = o.id WHERE i.id = ?';
    const params = [id];

    if (!isAdmin) {
      query += ' AND i.customer_id = ?';
      params.push(customerId);
    }

    const [invoices] = await pool.query(query, params);

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }

    const invoice = invoices[0];

    const [items] = await pool.query(
      'SELECT * FROM ecom_invoice_items WHERE invoice_id = ?',
      [id]
    );

    const company = await getCompanySettings();

    // Générer le vrai PDF via pdfkit
    const pdfBuffer = await generateInvoicePDF(invoice, items, company);

    const filename = `facture-${invoice.invoice_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);

  } catch (error) {
    console.error('Erreur génération PDF:', error);
    res.status(500).json({ success: false, error: 'Erreur génération PDF' });
  }
});

/**
 * GET /api/ecommerce/invoices
 * Liste des factures (client)
 */
router.get('/', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user.customer_id;
    const { page = 1, limit = 10, type, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE i.customer_id = ?';
    const params = [customerId];

    if (type) {
      whereClause += ' AND i.type = ?';
      params.push(type);
    }

    if (status) {
      whereClause += ' AND i.status = ?';
      params.push(status);
    }

    const [invoices] = await pool.query(`
      SELECT i.*, o.order_number
      FROM ecom_invoices i
      LEFT JOIN ecom_orders o ON i.order_id = o.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM ecom_invoices i ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur liste factures:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/ecommerce/invoices/:id/send
 * Envoyer la facture par email
 */
router.put('/:id/send', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const [invoices] = await pool.query('SELECT * FROM ecom_invoices WHERE id = ?', [id]);

    if (invoices.length === 0) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }

    const invoice = invoices[0];

    // Destinataire — email de la facture ou du body
    const { email: overrideEmail } = req.body;
    const recipientEmail = overrideEmail || invoice.customer_email;

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'Aucune adresse email disponible pour ce client. Spécifiez-en une dans le corps de la requête.'
      });
    }

    // Récupérer les articles et les paramètres société
    const [items] = await pool.query('SELECT * FROM ecom_invoice_items WHERE invoice_id = ?', [id]);
    const company = await getCompanySettings();

    // Générer le PDF
    const pdfBuffer = await generateInvoicePDF(invoice, items, company);
    const typeLabel = invoice.type === 'proforma' ? 'Proforma' : invoice.type === 'credit_note' ? 'Avoir' : 'Facture';
    const filename = `${typeLabel.toLowerCase()}-${invoice.invoice_number}.pdf`;

    // Corps email HTML
    const total = formatPrice(invoice.total);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #E67300; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${company.company_name || 'Allo Béton'}</h1>
        </div>
        <div style="padding: 30px 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Votre ${typeLabel.toLowerCase()} est disponible</h2>
          <p>Bonjour <strong>${invoice.customer_name || ''}</strong>,</p>
          <p>Veuillez trouver en pièce jointe votre ${typeLabel.toLowerCase()} <strong>${invoice.invoice_number}</strong> d'un montant de <strong>${total}</strong>.</p>
          ${invoice.due_date ? `<p>Date d'échéance : <strong>${formatDate(invoice.due_date)}</strong></p>` : ''}
          <p>Pour toute question, contactez-nous :</p>
          <ul>
            <li>Tél : ${company.company_phone || '+221 77 307 45 34'}</li>
            <li>Email : ${company.company_email || 'contact@allobeton.sn'}</li>
          </ul>
          <p style="margin-top: 20px; color: #666; font-size: 13px;">Merci de votre confiance !</p>
        </div>
        <div style="background: #E67300; padding: 10px; text-align: center;">
          <p style="color: white; margin: 0; font-size: 12px;">${company.company_name || 'Allo Béton'} — ${company.company_address || 'Dakar, Sénégal'}</p>
        </div>
      </div>
    `;

    const emailResult = await sendEmail(
      recipientEmail,
      `${typeLabel} ${invoice.invoice_number} — ${company.company_name || 'Allo Béton'}`,
      `Bonjour ${invoice.customer_name || ''},\n\nVeuillez trouver en pièce jointe votre ${typeLabel.toLowerCase()} ${invoice.invoice_number} d'un montant de ${total}.\n\nMerci de votre confiance !\n${company.company_name || 'Allo Béton'}`,
      html,
      [{ filename, content: pdfBuffer, contentType: 'application/pdf' }]
    );

    // Mettre à jour le statut
    await pool.query(
      'UPDATE ecom_invoices SET status = "sent", sent_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: `Facture envoyée à ${recipientEmail}`,
      simulated: emailResult.simulated || false,
    });

  } catch (error) {
    console.error('Erreur envoi facture:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * GET /api/ecommerce/invoices/admin/list
 * Liste admin des factures
 */
router.get('/admin/list', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, search, overdue } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (type) {
      whereClause += ' AND i.type = ?';
      params.push(type);
    }

    if (status) {
      whereClause += ' AND i.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (i.invoice_number LIKE ? OR i.customer_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (overdue === 'true') {
      whereClause += ' AND i.due_date < CURDATE() AND i.status NOT IN ("paid", "cancelled")';
    }

    const [invoices] = await pool.query(`
      SELECT i.*, o.order_number
      FROM ecom_invoices i
      LEFT JOIN ecom_orders o ON i.order_id = o.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM ecom_invoices i ${whereClause}`,
      params
    );

    // Stats
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as total_paid,
        SUM(CASE WHEN status NOT IN ('paid', 'cancelled') THEN (total - COALESCE(amount_paid, 0)) ELSE 0 END) as total_due,
        SUM(CASE WHEN due_date < CURDATE() AND status NOT IN ('paid', 'cancelled') THEN 1 ELSE 0 END) as overdue_count
      FROM ecom_invoices
    `);

    res.json({
      success: true,
      data: invoices,
      stats: stats[0],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur admin factures:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
