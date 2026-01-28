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
      `SELECT s.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
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
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    const safeNumber = (sale.sale_number || sale.id || 'sale')
      .toString()
      .replace(/[^\w\-]/g, '_');

    const fileName = `${type}_${safeNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // --- CONTENU PDF ---
    doc.fontSize(18).text('ALLO BÉTON', { align: 'left' });
    doc.moveDown(0.5);

    const title = type === 'quote' ? 'DEVIS' : type === 'receipt' ? 'REÇU' : 'FACTURE';
    doc.fontSize(16).text(title, { align: 'right' });

    doc.moveDown(1);

    const dateValue = sale.created_at || sale.createdAt || Date.now();
    doc.fontSize(11).text(`N° Vente: ${sale.sale_number || sale.id}`);
    doc.text(`Date: ${new Date(dateValue).toLocaleDateString('fr-FR')}`);
    doc.moveDown(0.5);

    doc.text(`Client: ${sale.customer_name || '—'}`);
    doc.text(`Téléphone: ${sale.customer_phone || '—'}`);
    doc.text(`Email: ${sale.customer_email || '—'}`);

    doc.moveDown(1);

    // Tableau items
    doc.fontSize(12).text('Détails', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10);
    doc.text('Produit', 40, doc.y, { continued: true });
    doc.text('Qté', 300, doc.y, { continued: true });
    doc.text('PU', 360, doc.y, { continued: true });
    doc.text('Total', 450, doc.y);

    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    let computedTotal = 0;

    if (!itemRows || itemRows.length === 0) {
      doc.text('Aucun article trouvé pour cette vente.', 40, doc.y);
      doc.moveDown(1);
    } else {
      for (const it of itemRows) {
        const qty = Number(it.quantity || 0);
        const unit = Number(it.unit_price || it.price || 0);
        const lineTotal = Number(it.total || qty * unit);
        computedTotal += lineTotal;

        doc.text(it.product_name || it.product_id || 'Produit', 40, doc.y, { continued: true });
        doc.text(String(qty), 300, doc.y, { continued: true });
        doc.text(unit.toLocaleString('fr-FR'), 360, doc.y, { continued: true });
        doc.text(lineTotal.toLocaleString('fr-FR'), 450, doc.y);
      }
    }

    // Si la vente a déjà un total côté DB, on l'utilise, sinon on prend computedTotal
    const saleTotal = Number(sale.total ?? sale.total_amount ?? sale.amount);
    const finalTotal = Number.isFinite(saleTotal) && saleTotal > 0 ? saleTotal : computedTotal;

    doc.moveDown(0.8);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.8);

    doc.fontSize(12).text(`TOTAL: ${finalTotal.toLocaleString('fr-FR')} FCFA`, { align: 'right' });

    doc.moveDown(2);
    doc.fontSize(10).text('Merci pour votre confiance.', { align: 'center' });

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

module.exports = router;

