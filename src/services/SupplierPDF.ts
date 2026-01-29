import { Supplier } from '../types';

export async function generateSupplierPDF(supplier: Supplier) {
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    
    const ratingValue = (supplier.rating || 5.0).toFixed(1);
    const ratingStars = Math.round(supplier.rating || 5);
    const ratingStatus = 
      (supplier.rating || 5) <= 2
        ? 'À améliorer'
        : (supplier.rating || 5) <= 3
        ? 'Satisfaisant'
        : (supplier.rating || 5) <= 4
        ? 'Bon fournisseur'
        : 'Excellent fournisseur';

    const contactPerson = supplier.contact_person || 'N/A';
    const formattedDate = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: Arial, sans-serif;
            color: #333;
            background: white;
            padding: 0;
          }

          .pdf-document {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 40px 30px;
          }

          .header {
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
            color: white;
            padding: 40px;
            margin: -40px -30px 40px -30px;
            border-bottom: 5px solid #ff6b35;
            text-align: center;
          }

          .header h1 {
            font-size: 48px;
            margin-bottom: 5px;
            font-weight: bold;
            letter-spacing: 2px;
          }

          .header p {
            font-size: 14px;
            opacity: 0.95;
          }

          .document-type {
            background: rgba(255,255,255,0.2);
            display: inline-block;
            padding: 8px 16px;
            border-radius: 4px;
            margin-top: 15px;
            font-size: 12px;
            font-weight: bold;
          }

          .section {
            margin-bottom: 35px;
          }

          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #ff6b35;
            border-bottom: 3px solid #ff6b35;
            padding-bottom: 10px;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .info-row {
            display: flex;
            margin-bottom: 15px;
            padding: 12px;
            background: #f9f9f9;
            border-left: 4px solid #ff6b35;
            border-radius: 4px;
          }

          .info-label {
            font-weight: bold;
            width: 150px;
            color: #ff6b35;
            flex-shrink: 0;
          }

          .info-value {
            color: #333;
            flex: 1;
          }

          .rating-box {
            background: linear-gradient(135deg, #fff9e6 0%, #ffe8cc 100%);
            border: 3px solid #ff6b35;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 25px 0;
          }

          .rating-score {
            font-size: 64px;
            font-weight: bold;
            color: #ff6b35;
            margin: 10px 0;
          }

          .rating-max {
            font-size: 18px;
            color: #999;
            margin-bottom: 15px;
          }

          .rating-stars {
            font-size: 32px;
            letter-spacing: 8px;
            margin: 15px 0;
          }

          .rating-status {
            font-size: 16px;
            font-weight: bold;
            color: #ff6b35;
            margin-top: 15px;
          }

          .notes-box {
            background: #f0f4f8;
            padding: 20px;
            border-left: 4px solid #f7931e;
            border-radius: 4px;
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.6;
          }

          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #ff6b35;
            text-align: center;
            font-size: 12px;
            color: #666;
          }

          .footer-date {
            color: #ff6b35;
            font-weight: bold;
            margin-top: 8px;
          }

          .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #ff6b35, transparent);
            margin: 30px 0;
          }

          @page {
            size: A4;
            margin: 0;
          }

          @media print {
            body { padding: 0; margin: 0; }
            .pdf-document { padding: 30px; margin: 0; }
            .header { margin: 0 -30px 30px -30px; }
          }
        </style>
      </head>
      <body>
        <div class="pdf-document">
          <div class="header">
            <h1>🏢 ALLO BÉTON</h1>
            <p>Système de Gestion Fournisseurs</p>
            <div class="document-type">FICHE FOURNISSEUR</div>
          </div>

          <div class="section">
            <h2 class="section-title">📋 Informations Générales</h2>
            
            <div class="info-row">
              <span class="info-label">Raison Sociale:</span>
              <span class="info-value"><strong>${supplier.name || 'N/A'}</strong></span>
            </div>

            <div class="info-row">
              <span class="info-label">Contact Principal:</span>
              <span class="info-value">${contactPerson}</span>
            </div>

            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${supplier.email || 'N/A'}</span>
            </div>

            <div class="info-row">
              <span class="info-label">Téléphone:</span>
              <span class="info-value">${supplier.phone || 'N/A'}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <h2 class="section-title">📍 Localisation</h2>
            
            <div class="info-row">
              <span class="info-label">Adresse:</span>
              <span class="info-value">${supplier.address || 'N/A'}</span>
            </div>

            <div class="info-row">
              <span class="info-label">Ville:</span>
              <span class="info-value">${supplier.city || 'N/A'}</span>
            </div>

            <div class="info-row">
              <span class="info-label">Pays:</span>
              <span class="info-value">Sénégal</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <h2 class="section-title">⭐ Évaluation & Performance</h2>
            
            <div class="rating-box">
              <div class="rating-max">SCORE DE PERFORMANCE</div>
              <div class="rating-score">${ratingValue}</div>
              <div class="rating-max">/5.0</div>
              <div class="rating-stars">${'⭐'.repeat(ratingStars)}</div>
              <div class="rating-status">${ratingStatus}</div>
            </div>
          </div>

          ${
            supplier.notes
              ? `
          <div class="divider"></div>
          <div class="section">
            <h2 class="section-title">📝 Observations & Remarques</h2>
            <div class="notes-box">${supplier.notes}</div>
          </div>
          `
              : ''
          }

          <div class="footer">
            <div>Document généré par ALLO BÉTON</div>
            <div class="footer-date">${formattedDate}</div>
            <div style="margin-top: 8px; font-size: 11px; opacity: 0.7;">Fiche Confidentielle - Impression Interdite</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const element = document.createElement('div');
    element.innerHTML = htmlContent;

    const options: any = {
      margin: 0,
      filename: `ALLO-BETON_Fournisseur_${supplier.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'export'}_${formattedDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        orientation: 'portrait' as const, 
        unit: 'mm', 
        format: 'a4',
        compress: true
      }
    };

    console.log('Génération PDF...', supplier.name);
    await html2pdf().set(options).from(element).save();
    console.log('PDF généré avec succès');
    
    return { success: true };
  } catch (error: any) {
    console.error('Erreur génération PDF:', error);
    alert('Erreur lors de la génération du PDF: ' + error.message);
    return { success: false, error: error.message };
  }
}

export async function printSupplierPDF(supplier: Supplier) {
  try {
    const contactPerson = supplier.contact_person || 'N/A';
    const ratingValue = (supplier.rating || 5.0).toFixed(1);
    const ratingStars = Math.round(supplier.rating || 5);
    
    const formattedDate = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ALLO BÉTON - ${supplier.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: Arial, sans-serif;
            color: #333;
            background: white;
          }

          .print-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
          }

          .header {
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
            color: white;
            padding: 40px;
            margin: -20px -20px 30px -20px;
            border-bottom: 5px solid #ff6b35;
            text-align: center;
          }

          .header h1 {
            font-size: 42px;
            margin-bottom: 5px;
            font-weight: bold;
            letter-spacing: 2px;
          }

          .header p {
            font-size: 14px;
            opacity: 0.95;
          }

          .section {
            margin-bottom: 30px;
          }

          .section-title {
            font-size: 15px;
            font-weight: bold;
            color: #ff6b35;
            border-bottom: 3px solid #ff6b35;
            padding-bottom: 8px;
            margin-bottom: 15px;
            text-transform: uppercase;
          }

          .info-row {
            display: flex;
            margin-bottom: 12px;
            padding: 10px;
            background: #f9f9f9;
            border-left: 4px solid #ff6b35;
          }

          .info-label {
            font-weight: bold;
            width: 140px;
            color: #ff6b35;
          }

          .info-value {
            color: #333;
            flex: 1;
          }

          .rating-box {
            background: linear-gradient(135deg, #fff9e6 0%, #ffe8cc 100%);
            border: 3px solid #ff6b35;
            border-radius: 8px;
            padding: 25px;
            text-align: center;
            margin: 20px 0;
          }

          .rating-score {
            font-size: 56px;
            font-weight: bold;
            color: #ff6b35;
          }

          .rating-stars {
            font-size: 28px;
            letter-spacing: 6px;
            margin: 10px 0;
          }

          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 2px solid #ff6b35;
            text-align: center;
            font-size: 11px;
            color: #666;
          }

          .print-button {
            background: #ff6b35;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 20px;
          }

          .print-button:hover {
            background: #f7931e;
          }

          @media print {
            .print-button { display: none; }
            .print-container { padding: 0; margin: 0; }
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <button class="print-button" onclick="window.print()">🖨️ Imprimer ce document</button>

          <div class="header">
            <h1>🏢 ALLO BÉTON</h1>
            <p>Fiche Fournisseur</p>
          </div>

          <div class="section">
            <h2 class="section-title">📋 Informations Générales</h2>
            
            <div class="info-row">
              <span class="info-label">Raison Sociale:</span>
              <span class="info-value"><strong>${supplier.name || 'N/A'}</strong></span>
            </div>

            <div class="info-row">
              <span class="info-label">Contact:</span>
              <span class="info-value">${contactPerson}</span>
            </div>

            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${supplier.email || 'N/A'}</span>
            </div>

            <div class="info-row">
              <span class="info-label">Téléphone:</span>
              <span class="info-value">${supplier.phone || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">📍 Localisation</h2>
            
            <div class="info-row">
              <span class="info-label">Adresse:</span>
              <span class="info-value">${supplier.address || 'N/A'}</span>
            </div>

            <div class="info-row">
              <span class="info-label">Ville:</span>
              <span class="info-value">${supplier.city || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">⭐ Évaluation</h2>
            
            <div class="rating-box">
              <div>SCORE DE PERFORMANCE</div>
              <div class="rating-score">${ratingValue}/5</div>
              <div class="rating-stars">${'⭐'.repeat(ratingStars)}</div>
            </div>
          </div>

          <div class="footer">
            <div>ALLO BÉTON - ${formattedDate}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez les paramètres du navigateur.');
      return { success: false };
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);

    return { success: true };
  } catch (error: any) {
    console.error('Erreur impression:', error);
    alert('Erreur lors de l\'impression: ' + error.message);
    return { success: false };
  }
}
