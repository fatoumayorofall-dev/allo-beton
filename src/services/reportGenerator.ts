import html2pdf from 'html2pdf.js';

interface ReportData {
  date: string;
  openingBalance: number;
  totalRecettes: number;
  totalDepenses: number;
  closingBalance: number;
  operatingScore: number;
  byCategory: Record<string, { recettes: number; depenses: number }>;
  byPaymentMethod: Record<string, { recettes: number; depenses: number }>;
  movements: any[];
}

export async function generateCashReportPDF(reportData: ReportData) {
  const element = document.createElement('div');
  element.innerHTML = generateHTMLReport(reportData);

  const options = {
    margin: 10,
    filename: `rapport-tresorerie-${reportData.date}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait' as const, unit: 'mm' as const, format: 'a4' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as const }
  };

  return new Promise((resolve, reject) => {
    html2pdf()
      .set(options)
      .from(element)
      .save()
      .then(() => resolve(null))
      .catch((error: any) => reject(error));
  });
}

function generateHTMLReport(reportData: ReportData): string {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDateFR = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return new Date(`${year}-${month}-${day}`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const categoryRows = Object.entries(reportData.byCategory)
    .map(([category, data]) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #10b981;">${formatNumber(data.recettes)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #ef4444;">${formatNumber(data.depenses)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold; color: ${data.recettes - data.depenses >= 0 ? '#10b981' : '#ef4444'};">${formatNumber(data.recettes - data.depenses)}</td>
      </tr>
    `)
    .join('');

  const movementRows = reportData.movements
    .map(m => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px solid #eee; font-size: 12px;">${m.created_at?.substring(11, 16) || '-'}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; font-size: 12px;">${m.category}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; font-size: 12px;">${m.description}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; font-size: 12px;">${m.payment_method}</td>
        <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; font-size: 12px; color: ${m.type === 'recette' ? '#10b981' : '#ef4444'}; font-weight: bold;">${m.type === 'recette' ? '+' : '-'}${formatNumber(m.amount)}</td>
      </tr>
    `)
    .join('');

  const netFlow = reportData.totalRecettes - reportData.totalDepenses;

  return `
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          text-align: center;
          margin-bottom: 20px;
          border-radius: 5px;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 5px;
        }
        .header p {
          font-size: 14px;
          opacity: 0.9;
        }
        .date-info {
          text-align: right;
          font-size: 12px;
          color: #666;
          margin-bottom: 20px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        .stat-box {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 15px;
          text-align: center;
        }
        .stat-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: bold;
          color: #333;
        }
        .stat-box.positive .stat-value {
          color: #10b981;
        }
        .stat-box.negative .stat-value {
          color: #ef4444;
        }
        .stat-box.neutral .stat-value {
          color: #667eea;
        }
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: white;
          background-color: #667eea;
          padding: 10px 15px;
          margin-bottom: 15px;
          border-radius: 3px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        thead th {
          background-color: #f5f5f5;
          padding: 10px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
          font-size: 13px;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #ddd;
        }
        .total-row {
          background-color: #f9fafb;
          font-weight: bold;
          border-top: 2px solid #ddd;
        }
        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-top: 15px;
        }
        .analysis-box {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 15px;
          text-align: center;
          background-color: #f9fafb;
        }
        .analysis-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        .analysis-value {
          font-size: 20px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 5px;
        }
        .analysis-sub {
          font-size: 11px;
          color: #999;
        }
        .footer {
          text-align: center;
          font-size: 11px;
          color: #999;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 RAPPORT JOURNALIER</h1>
        <p>Gestion de Trésorerie et de Caisse</p>
      </div>

      <div class="date-info">
        <strong>Date du rapport:</strong> ${formatDateFR(reportData.date)}<br>
        <strong>Généré le:</strong> ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
      </div>

      <!-- Statistiques principales -->
      <div class="stats-grid">
        <div class="stat-box neutral">
          <div class="stat-label">Solde Ouverture</div>
          <div class="stat-value">${formatNumber(reportData.openingBalance)}</div>
        </div>
        <div class="stat-box positive">
          <div class="stat-label">Entrées</div>
          <div class="stat-value">${formatNumber(reportData.totalRecettes)}</div>
        </div>
        <div class="stat-box negative">
          <div class="stat-label">Sorties</div>
          <div class="stat-value">${formatNumber(reportData.totalDepenses)}</div>
        </div>
        <div class="stat-box ${reportData.closingBalance >= 0 ? 'positive' : 'negative'}">
          <div class="stat-label">Solde Clôture</div>
          <div class="stat-value">${formatNumber(reportData.closingBalance)}</div>
        </div>
        <div class="stat-box neutral">
          <div class="stat-label">Score</div>
          <div class="stat-value">${reportData.operatingScore.toFixed(1)}%</div>
        </div>
      </div>

      <!-- Tableau des catégories -->
      <div class="section">
        <div class="section-title">📋 Détail par Catégorie</div>
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th style="text-align: right;">Entrées</th>
              <th style="text-align: right;">Sorties</th>
              <th style="text-align: right;">Différence</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows}
          </tbody>
        </table>
      </div>

      <!-- Tableau des opérations -->
      <div class="section">
        <div class="section-title">📝 Détail des Opérations</div>
        <table>
          <thead>
            <tr>
              <th>Heure</th>
              <th>Catégorie</th>
              <th>Description</th>
              <th>Méthode</th>
              <th style="text-align: right;">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${movementRows}
          </tbody>
        </table>
      </div>

      <!-- Analyse détaillée -->
      <div class="section">
        <div class="section-title">📈 Analyse Détaillée</div>
        <div class="analysis-grid">
          <div class="analysis-box">
            <div class="analysis-label">Flux Net</div>
            <div class="analysis-value" style="color: ${netFlow >= 0 ? '#10b981' : '#ef4444'};">
              ${netFlow >= 0 ? '+' : '-'}${formatNumber(Math.abs(netFlow))}
            </div>
            <div class="analysis-sub">${((netFlow / reportData.totalRecettes) * 100).toFixed(1)}% du chiffre</div>
          </div>
          <div class="analysis-box">
            <div class="analysis-label">Taux de Dépense</div>
            <div class="analysis-value">
              ${((reportData.totalDepenses / (reportData.totalRecettes || 1)) * 100).toFixed(1)}%
            </div>
            <div class="analysis-sub">par rapport aux entrées</div>
          </div>
          <div class="analysis-box">
            <div class="analysis-label">Rentabilité</div>
            <div class="analysis-value">
              ${(((reportData.totalRecettes - reportData.totalDepenses) / (reportData.totalRecettes || 1)) * 100).toFixed(1)}%
            </div>
            <div class="analysis-sub">marge nette</div>
          </div>
        </div>
      </div>

      <div class="footer">
        Document confidentiel - Allo Béton CRM<br>
        Rapport généré automatiquement par le système de gestion
      </div>
    </body>
    </html>
  `;
}
