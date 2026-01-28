import React, { useState } from 'react';
import { FileText, Printer, Mail, Download } from 'lucide-react';
import { generatePDF, downloadPDF, printPDF, emailPDF } from '../../services/pdf';
import { sendAutomaticNotifications } from '../../services/notifications';

import { Sale } from '../../types';

interface SaleActionsProps {
  sale: Sale;
  onClose?: () => void;
}

export const SaleActions: React.FC<SaleActionsProps> = ({ sale }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState((sale as any)?.customer?.email || '');

  const handleGeneratePDF = async (type: 'invoice' | 'quote' | 'receipt') => {
    const userId = (sale as any)?.user_id || (sale as any)?.userId;
    if (!userId) {
      alert("Impossible : user_id manquant sur la vente.");
      return;
    }

    setLoading(type);
    try {
      const result = await generatePDF({ type, saleId: (sale as any).id, userId });

      if (result.success) {
        await sendAutomaticNotifications.onOrderConfirmed(
          userId,
          (sale as any).sale_number || (sale as any).id,
          (sale as any)?.customer?.name || (sale as any)?.customerName || 'Client'
        );

        alert(
          `${type === 'invoice' ? 'Facture' : type === 'quote' ? 'Devis' : 'Reçu'} généré (mode simulation).`
        );
      } else {
        alert('Erreur lors de la génération du PDF');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadPDF = async (type: 'invoice' | 'quote' | 'receipt') => {
    const userId = (sale as any)?.user_id || (sale as any)?.userId;
    if (!userId) return;

    setLoading(`download-${type}`);
    try {
      const result = await generatePDF({ type, saleId: (sale as any).id, userId });
      await downloadPDF(result?.data?.url || '', result?.data?.fileName || 'document.pdf');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du téléchargement');
    } finally {
      setLoading(null);
    }
  };

  const handlePrintPDF = async (type: 'invoice' | 'quote' | 'receipt') => {
    const userId = (sale as any)?.user_id || (sale as any)?.userId;
    if (!userId) return;

    setLoading(`print-${type}`);
    try {
      const result = await generatePDF({ type, saleId: (sale as any).id, userId });
      await printPDF(result?.data?.url || '');
    } catch (error) {
      console.error('Erreur:', error);
      alert("Erreur lors de l'impression");
    } finally {
      setLoading(null);
    }
  };

  const handleEmailPDF = async (type: 'invoice' | 'quote' | 'receipt') => {
    const userId = (sale as any)?.user_id || (sale as any)?.userId;
    if (!userId || !emailAddress) return;

    setLoading(`email-${type}`);
    try {
      const result = await generatePDF({ type, saleId: (sale as any).id, userId });
      const emailResult = await emailPDF(
        result?.data?.url || '',
        emailAddress,
        (sale as any).sale_number || (sale as any).id,
        type
      );

      if (emailResult.success) {
        alert('Email envoyé (mode simulation).');
        setShowEmailModal(false);
      } else {
        alert("Erreur lors de l'envoi de l'email");
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert("Erreur lors de l'envoi");
    } finally {
      setLoading(null);
    }
  };

  const isLoading = (action: string) => loading === action;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Actions sur la vente</h3>

      {/* Facture */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">Facture</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleGeneratePDF('invoice')}
            disabled={isLoading('invoice')}
            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            <FileText className="w-4 h-4" />
            <span>{isLoading('invoice') ? 'Génération...' : 'Générer'}</span>
          </button>

          <button
            onClick={() => handleDownloadPDF('invoice')}
            disabled={isLoading('download-invoice')}
            className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            <Download className="w-4 h-4" />
            <span>{isLoading('download-invoice') ? 'Téléchargement...' : 'Télécharger'}</span>
          </button>

          <button
            onClick={() => handlePrintPDF('invoice')}
            disabled={isLoading('print-invoice')}
            className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{isLoading('print-invoice') ? 'Impression...' : 'Imprimer'}</span>
          </button>

          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
          >
            <Mail className="w-4 h-4" />
            <span>Envoyer par email</span>
          </button>
        </div>
      </div>

      {/* Devis */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-gray-900">Devis</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleGeneratePDF('quote')}
            disabled={isLoading('quote')}
            className="flex items-center space-x-1 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm"
          >
            <FileText className="w-4 h-4" />
            <span>{isLoading('quote') ? 'Génération...' : 'Générer'}</span>
          </button>

          <button
            onClick={() => handleDownloadPDF('quote')}
            disabled={isLoading('download-quote')}
            className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            <Download className="w-4 h-4" />
            <span>{isLoading('download-quote') ? 'Téléchargement...' : 'Télécharger'}</span>
          </button>
        </div>
      </div>

      {/* Modal Email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Envoyer par email</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adresse email</label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="client@email.com"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEmailPDF('invoice')}
                    disabled={!emailAddress || isLoading('email-invoice')}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {isLoading('email-invoice') ? 'Envoi...' : 'Facture'}
                  </button>

                  <button
                    onClick={() => handleEmailPDF('quote')}
                    disabled={!emailAddress || isLoading('email-quote')}
                    className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm"
                  >
                    {isLoading('email-quote') ? 'Envoi...' : 'Devis'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
