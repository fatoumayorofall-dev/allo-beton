import React, { useState } from 'react';
import { FileText, Printer, Mail, Download, X, Send, Sparkles, Receipt, ClipboardList } from 'lucide-react';
import { generatePDF, downloadPDF, printPDF, emailPDF } from '../../services/PDF';
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

  const inputClass = "w-full px-3.5 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-800 bg-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400/25 focus:border-orange-300 hover:border-gray-300 transition-all shadow-sm shadow-gray-100/50";

  const ActionButton: React.FC<{
    onClick: () => void;
    disabled?: boolean;
    loadingText: string;
    text: string;
    icon: React.ReactNode;
    variant: 'blue' | 'emerald' | 'slate' | 'violet' | 'amber';
    isActive?: boolean;
  }> = ({ onClick, disabled, loadingText, text, icon, variant, isActive }) => {
    const variants = {
      blue: 'from-orange-500 to-indigo-600 hover:from-orange-600 hover:to-indigo-700 shadow-orange-200/40',
      emerald: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-200/40',
      slate: 'from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 shadow-slate-200/40',
      violet: 'from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-200/40',
      amber: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-200/40',
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${variants[variant]} text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md`}
      >
        {isActive ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : icon}
        <span>{isActive ? loadingText : text}</span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200/40">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">Actions sur la vente</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Générer, télécharger ou envoyer des documents</p>
        </div>
      </div>

      {/* Facture Section */}
      <div className="bg-gradient-to-br from-orange-50/60 to-indigo-50/30 rounded-xl border border-orange-200/40 p-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <Receipt className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Facture</h4>
            <p className="text-[10px] text-gray-400">Document officiel de facturation</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <ActionButton
            onClick={() => handleGeneratePDF('invoice')}
            disabled={isLoading('invoice')}
            loadingText="Génération..."
            text="Générer"
            icon={<FileText className="w-4 h-4" />}
            variant="blue"
            isActive={isLoading('invoice')}
          />
          <ActionButton
            onClick={() => handleDownloadPDF('invoice')}
            disabled={isLoading('download-invoice')}
            loadingText="Téléchargement..."
            text="Télécharger"
            icon={<Download className="w-4 h-4" />}
            variant="emerald"
            isActive={isLoading('download-invoice')}
          />
          <ActionButton
            onClick={() => handlePrintPDF('invoice')}
            disabled={isLoading('print-invoice')}
            loadingText="Impression..."
            text="Imprimer"
            icon={<Printer className="w-4 h-4" />}
            variant="slate"
            isActive={isLoading('print-invoice')}
          />
          <ActionButton
            onClick={() => setShowEmailModal(true)}
            loadingText=""
            text="Envoyer par email"
            icon={<Mail className="w-4 h-4" />}
            variant="violet"
          />
        </div>
      </div>

      {/* Devis Section */}
      <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/30 rounded-xl border border-amber-200/40 p-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Devis</h4>
            <p className="text-[10px] text-gray-400">Estimation de prix pour le client</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <ActionButton
            onClick={() => handleGeneratePDF('quote')}
            disabled={isLoading('quote')}
            loadingText="Génération..."
            text="Générer"
            icon={<FileText className="w-4 h-4" />}
            variant="amber"
            isActive={isLoading('quote')}
          />
          <ActionButton
            onClick={() => handleDownloadPDF('quote')}
            disabled={isLoading('download-quote')}
            loadingText="Téléchargement..."
            text="Télécharger"
            icon={<Download className="w-4 h-4" />}
            variant="emerald"
            isActive={isLoading('download-quote')}
          />
        </div>
      </div>

      {/* Modal Email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Gradient accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400" />

            <div className="p-5">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200/40">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Envoyer par email</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Envoi du document au client</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Email input */}
              <div className="bg-gradient-to-br from-violet-50/50 to-purple-50/30 rounded-xl border border-violet-200/40 p-4 mb-4">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Adresse email du destinataire
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className={`${inputClass} pl-10`}
                    placeholder="client@email.com"
                  />
                </div>
              </div>

              {/* Send buttons */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Type de document à envoyer</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleEmailPDF('invoice')}
                    disabled={!emailAddress || isLoading('email-invoice')}
                    className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-orange-500 to-indigo-600 text-white rounded-xl hover:from-orange-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-all shadow-md shadow-orange-200/30"
                  >
                    {isLoading('email-invoice') ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isLoading('email-invoice') ? 'Envoi...' : 'Facture'}
                  </button>

                  <button
                    onClick={() => handleEmailPDF('quote')}
                    disabled={!emailAddress || isLoading('email-quote')}
                    className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-all shadow-md shadow-amber-200/30"
                  >
                    {isLoading('email-quote') ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isLoading('email-quote') ? 'Envoi...' : 'Devis'}
                  </button>
                </div>
              </div>

              {/* Cancel */}
              <div className="flex justify-end mt-5 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-5 py-2 text-gray-600 bg-gray-50 border border-gray-200/60 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium"
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
