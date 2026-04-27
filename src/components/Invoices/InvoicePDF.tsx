import React, { useRef } from 'react';
import { Invoice } from '../../types';
import { Printer, X, FileText, Phone, Mail, MapPin } from 'lucide-react';

interface InvoicePDFProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR').format(amount);
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const numberToWords = (amount: number): string => {
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

    if (amount === 0) return 'zéro';
    if (amount >= 1000000000) return formatMoney(amount) + ' FCFA';

    let words = '';
    let remaining = amount;

    if (remaining >= 1000000) {
      const millions = Math.floor(remaining / 1000000);
      words += (millions === 1 ? 'un million ' : convertHundreds(millions) + ' millions ');
      remaining %= 1000000;
    }

    if (remaining >= 1000) {
      const thousands = Math.floor(remaining / 1000);
      words += (thousands === 1 ? 'mille ' : convertHundreds(thousands) + ' mille ');
      remaining %= 1000;
    }

    words += convertHundreds(remaining);

    return words.trim() + ' francs CFA';

    function convertHundreds(n: number): string {
      let str = '';
      if (n >= 100) {
        const h = Math.floor(n / 100);
        str += (h === 1 ? 'cent ' : units[h] + ' cent ');
        n %= 100;
      }
      if (n >= 20) {
        const t = Math.floor(n / 10);
        str += tens[t];
        n %= 10;
        if (n === 1 && t !== 8) str += ' et ';
        else if (n > 0) str += '-';
      } else if (n >= 10) {
        str += teens[n - 10];
        return str;
      }
      str += units[n];
      return str;
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Facture ${invoice.invoice_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; line-height: 1.5; }
            .invoice-container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #f97316; }
            .company-info h1 { font-size: 28px; color: #f97316; margin-bottom: 5px; }
            .company-info p { font-size: 11px; color: #6b7280; }
            .invoice-meta { text-align: right; }
            .invoice-meta h2 { font-size: 24px; color: #374151; margin-bottom: 10px; }
            .invoice-meta p { font-size: 12px; color: #6b7280; }
            .client-section { background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
            .client-section h3 { color: #92400e; font-size: 14px; margin-bottom: 5px; }
            .client-section p { font-size: 16px; font-weight: bold; color: #1f2937; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .items-table th { background: #f97316; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
            .items-table th:last-child { text-align: right; }
            .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            .items-table td:last-child { text-align: right; font-weight: 600; }
            .items-table tr:nth-child(even) { background: #fef7ed; }
            .totals { display: flex; justify-content: flex-end; margin-bottom: 30px; }
            .totals-table { width: 300px; }
            .totals-table tr td { padding: 8px 12px; font-size: 13px; }
            .totals-table tr td:last-child { text-align: right; font-weight: 600; }
            .totals-table .total-row { background: #f97316; color: white; font-size: 16px; }
            .totals-table .total-row td { padding: 12px; font-weight: bold; }
            .amount-words { background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-style: italic; font-size: 12px; color: #92400e; }
            .signature-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
            .signature-box { text-align: center; width: 200px; }
            .signature-box p { font-size: 12px; color: #6b7280; margin-bottom: 50px; }
            .signature-box .line { border-top: 1px solid #6b7280; padding-top: 5px; font-size: 11px; }
            .footer { text-align: center; padding-top: 20px; border-top: 2px solid #f97316; font-size: 11px; color: #6b7280; }
            .footer .contact { display: flex; justify-content: center; gap: 20px; margin-top: 5px; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const customerName = invoice.customer_name || invoice.customer?.name || 'Client inconnu';
  const customerAddress = invoice.customer?.address || '';
  const items = invoice.items || [];
  const subtotal = Number(invoice.subtotal) || 0;
  const taxRate = Number(invoice.tax_rate) || 18;
  const taxAmount = Number(invoice.tax_amount) || (subtotal * taxRate / 100);
  const total = Number(invoice.total_amount) || (subtotal + taxAmount);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Aperçu Facture</h2>
              <p className="text-sm text-gray-500">{invoice.invoice_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div ref={printRef} className="bg-white p-8 rounded-xl shadow-sm max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b-4 border-orange-500">
              <div>
                <h1 className="text-3xl font-bold text-orange-600 mb-2">
                  {invoice.company_name || 'ICOPS'}
                </h1>
                <p className="text-sm text-gray-600">RC: {invoice.company_rc || 'SN DKR 2022 B 765'}</p>
                <p className="text-sm text-gray-600">NINEA: {invoice.company_ninea || '009106073 2E2'}</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{invoice.invoice_number}</h2>
                <p className="text-sm text-gray-600">Date: {formatDate(invoice.invoice_date)}</p>
                {invoice.due_date && (
                  <p className="text-sm text-gray-600">Échéance: {formatDate(invoice.due_date)}</p>
                )}
              </div>
            </div>

            {/* Client */}
            <div className="bg-amber-100 p-4 rounded-lg mb-6">
              <h3 className="text-sm font-medium text-amber-800 mb-1">CLIENT:</h3>
              <p className="text-lg font-bold text-gray-900">{customerName}</p>
              {customerAddress && (
                <p className="text-sm text-gray-600 mt-1">{customerAddress}</p>
              )}
            </div>

            {/* Items Table */}
            <table className="w-full mb-6">
              <thead>
                <tr className="bg-orange-500 text-white">
                  <th className="py-3 px-4 text-left text-sm font-semibold">DÉSIGNATION</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold">POIDS (Tonne)</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold">PRIX UNITAIRE</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold">PRIX TOTAL HT</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-orange-50'}>
                    <td className="py-3 px-4 text-gray-800">{item.description}</td>
                    <td className="py-3 px-4 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatMoney(Number(item.unit_price))} FCFA</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-800">{formatMoney(Number(item.line_total))} FCFA</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">Aucun article</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <table className="w-64">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-4 text-sm text-gray-600">TOTAL HT</td>
                    <td className="py-2 px-4 text-right text-sm font-semibold">{formatMoney(subtotal)} FCFA</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 px-4 text-sm text-gray-600">TVA {taxRate}%</td>
                    <td className="py-2 px-4 text-right text-sm font-semibold">{formatMoney(taxAmount)} FCFA</td>
                  </tr>
                  <tr className="bg-orange-500 text-white">
                    <td className="py-3 px-4 text-sm font-bold">TOTAL TTC</td>
                    <td className="py-3 px-4 text-right font-bold">{formatMoney(total)} FCFA</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount in Words */}
            <div className="bg-amber-100 p-4 rounded-lg mb-6">
              <p className="text-sm text-amber-900 italic">
                <strong>Arrêté la facture à la somme de:</strong><br/>
                {numberToWords(Math.round(total))}
              </p>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}

            {/* Signature */}
            <div className="flex justify-end mb-8">
              <div className="text-center w-48">
                <p className="text-sm text-gray-500 mb-12">La Comptabilité</p>
                <div className="border-t border-gray-400 pt-2">
                  <span className="text-xs text-gray-500">Signature</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t-2 border-orange-500">
              <p className="text-sm font-semibold text-orange-600 mb-2">{invoice.company_name || 'ICOPS'}</p>
              <div className="flex justify-center gap-6 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {invoice.company_phone || '+221 77 426 25 11'}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {invoice.company_email || 'icops@icops.sn'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" />
                {invoice.company_address || 'VDN, Station Elton, Imm. Bilguiss, 1er étage'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
