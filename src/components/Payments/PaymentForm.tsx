import React, { useState, useEffect, useMemo } from 'react';
import { X, CreditCard, Banknote, ArrowLeftRight, FileCheck, Wallet, Check, AlertTriangle, CheckCircle } from 'lucide-react';
import { paymentsAPI } from '../../services/mysql-api';
import { formatCurrency as formatCurrencyFn, getSettings, AppSettings } from '../../services/settings';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentFormProps {
  onClose: () => void;
  onPaymentCreated: (data?: any) => void;
  preSelectedSaleId?: string | null;
}

// ─── Méthodes de paiement ─────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { key: 'cash',     label: 'Espèces',  icon: Banknote,       color: 'emerald' },
  { key: 'card',     label: 'Carte',    icon: CreditCard,     color: 'blue' },
  { key: 'transfer', label: 'Virement', icon: ArrowLeftRight, color: 'violet' },
  { key: 'check',    label: 'Chèque',   icon: FileCheck,      color: 'amber' },
  { key: 'mobile',   label: 'Mobile',   icon: Wallet,         color: 'indigo' },
];

const TILE_COLORS: Record<string, { bg: string; border: string; text: string; activeBg: string; activeBorder: string; activeText: string }> = {
  emerald: { bg: 'bg-white', border: 'border-gray-200', text: 'text-emerald-600', activeBg: 'bg-emerald-50',  activeBorder: 'border-emerald-500', activeText: 'text-emerald-700' },
  blue:    { bg: 'bg-white', border: 'border-gray-200', text: 'text-orange-600',    activeBg: 'bg-orange-50',     activeBorder: 'border-orange-500',    activeText: 'text-orange-700' },
  violet:  { bg: 'bg-white', border: 'border-gray-200', text: 'text-violet-600',  activeBg: 'bg-violet-50',   activeBorder: 'border-violet-500',  activeText: 'text-violet-700' },
  amber:   { bg: 'bg-white', border: 'border-gray-200', text: 'text-amber-600',   activeBg: 'bg-amber-50',    activeBorder: 'border-amber-500',   activeText: 'text-amber-700' },
  indigo:  { bg: 'bg-white', border: 'border-gray-200', text: 'text-indigo-600',  activeBg: 'bg-indigo-50',   activeBorder: 'border-indigo-500',  activeText: 'text-indigo-700' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatNumber = (n: number | string): string => {
  const num = typeof n === 'string' ? parseFloat(String(n).replace(/\s/g, '')) || 0 : n;
  return num.toLocaleString('fr-FR').replace(/,/g, ' ');
};

const parseFormattedNumber = (s: string): number => {
  return parseFloat(String(s).replace(/\s/g, '').replace(/,/g, '.')) || 0;
};

// ─── Composant ────────────────────────────────────────────────────────────────

export const PaymentForm: React.FC<PaymentFormProps> = ({ onClose, onPaymentCreated, preSelectedSaleId }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [salesLoading, setSalesLoading] = useState(true);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [formData, setFormData] = useState({
    saleId: preSelectedSaleId || '',
    amount: '',
    method: 'cash',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await paymentsAPI.getPendingSales();
        if (res?.success) {
          setSales(res.data || []);
          if (preSelectedSaleId) {
            const sel = (res.data || []).find((s: any) => s.id === preSelectedSaleId);
            if (sel) {
              setFormData(prev => ({
                ...prev,
                saleId: preSelectedSaleId,
                amount: formatNumber(Number(sel.remaining_amount) || 0)
              }));
            }
          }
        }
      } catch { /* ignore */ } finally { setSalesLoading(false); }
    };
    load();
    getSettings().then(s => setSettings(s)).catch(() => {});
  }, [preSelectedSaleId]);

  const fmt = (n: number) => formatCurrencyFn(n, settings || undefined);

  const selectedSale = sales.find(s => s.id === formData.saleId);
  const saleTotal = selectedSale ? Number(selectedSale.total_amount || 0) : 0;
  const alreadyPaid = selectedSale ? Number(selectedSale.amount_paid || 0) : 0;
  const remainingAmount = Math.max(0, saleTotal - alreadyPaid);
  const enteredAmount = parseFormattedNumber(formData.amount);

  const paymentType = useMemo(() => {
    if (!selectedSale || enteredAmount <= 0) return null;
    if (enteredAmount >= remainingAmount) return 'total';
    return 'partial';
  }, [selectedSale, enteredAmount, remainingAmount]);

  const handleSaleChange = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    const remaining = sale ? Number(sale.remaining_amount || 0) : 0;
    setFormData(prev => ({
      ...prev,
      saleId,
      amount: formatNumber(remaining > 0 ? remaining : (Number(sale?.total_amount) || 0)),
    }));
    setError('');
  };

  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^\d\s]/g, '').replace(/\s+/g, '');
    const numValue = parseInt(cleanValue, 10) || 0;
    setFormData(prev => ({ ...prev, amount: numValue > 0 ? formatNumber(numValue) : '' }));
    setError('');
  };

  const setAmount = (value: number) => {
    setFormData(prev => ({ ...prev, amount: formatNumber(value) }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFormattedNumber(formData.amount);
    if (!formData.saleId) { setError('Veuillez sélectionner une vente.'); return; }
    if (!amount || amount <= 0) { setError('Le montant doit être supérieur à zéro.'); return; }
    if (selectedSale && amount > remainingAmount + 0.01) {
      setError(`Le montant dépasse le reste à payer (${fmt(remainingAmount)})`);
      return;
    }

    setLoading(true);
    try {
      const result = await paymentsAPI.create({
        saleId: formData.saleId,
        amount,
        method: formData.method,
        reference: formData.reference,
        notes: formData.notes,
      });

      if (result?.success) {
        onPaymentCreated(result.data);
      } else {
        setError(result?.error || 'Erreur lors de la création du paiement.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const refPlaceholder = formData.method === 'transfer' ? 'Numéro de virement' :
    formData.method === 'check' ? 'Numéro de chèque' : 'Numéro de transaction';

  // ─── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nouveau Paiement</h2>
              <p className="text-xs text-gray-500">Encaisser un paiement sur une vente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-500 text-sm font-bold shrink-0 leading-5">!</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Sale select */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Vente à payer</label>
            {salesLoading ? (
              <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Chargement des ventes...</span>
              </div>
            ) : (
              <select value={formData.saleId} onChange={e => handleSaleChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white cursor-pointer">
                <option value="">Sélectionner une vente...</option>
                {sales.map(sale => (
                  <option key={sale.id} value={sale.id}>
                    {sale.sale_number} — {sale.customer_name || 'Inconnu'} — Reste: {fmt(Number(sale.remaining_amount || 0))}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Sale preview card */}
          {selectedSale && (
            <div className="bg-gradient-to-br from-indigo-50/80 to-orange-50/80 rounded-xl p-4 border border-indigo-100/80 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-xs text-indigo-600 font-medium">Client</span>
                <span className="text-sm font-semibold text-gray-900">{selectedSale.customer_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-indigo-600 font-medium">Montant total</span>
                <span className="text-sm font-semibold text-gray-900">{fmt(saleTotal)}</span>
              </div>
              {alreadyPaid > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-indigo-600 font-medium">Déjà payé</span>
                  <span className="text-sm font-semibold text-green-600">{fmt(alreadyPaid)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-indigo-200/60 pt-2">
                <span className="text-xs text-indigo-700 font-bold">Reste à payer</span>
                <span className="text-sm font-bold text-indigo-700">{fmt(remainingAmount)}</span>
              </div>
              {/* Progress bar */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${saleTotal > 0 ? Math.min(100, Math.round((alreadyPaid / saleTotal) * 100)) : 0}%` }} />
                </div>
                <span className="text-[10px] font-semibold text-indigo-500">
                  {saleTotal > 0 ? Math.round((alreadyPaid / saleTotal) * 100) : 0}%
                </span>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Montant à encaisser</label>
            <div className="relative">
              <input type="text" inputMode="numeric" value={formData.amount}
                onChange={e => handleAmountChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-20 text-right"
                placeholder="0" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">FCFA</span>
            </div>

            {/* Quick amount buttons */}
            {selectedSale && remainingAmount > 0 && (
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setAmount(remainingAmount)}
                  className="flex-1 px-3 py-2 text-sm font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 border border-indigo-200/60 transition-colors">
                  Tout ({fmt(remainingAmount)})
                </button>
                {remainingAmount > 10000 && (
                  <button type="button" onClick={() => setAmount(Math.round(remainingAmount / 2))}
                    className="flex-1 px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 border border-amber-200/60 transition-colors">
                    50% ({fmt(Math.round(remainingAmount / 2))})
                  </button>
                )}
              </div>
            )}

            {/* Payment type indicator */}
            {selectedSale && enteredAmount > 0 && (
              <div className={`flex items-center gap-2.5 mt-3 p-3 rounded-xl ${
                paymentType === 'total' ? 'bg-emerald-50 border border-emerald-200/60' : 'bg-amber-50 border border-amber-200/60'
              }`}>
                {paymentType === 'total' ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Paiement Total</p>
                      <p className="text-xs text-emerald-600">Vente marquée comme payée</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Paiement Partiel</p>
                      <p className="text-xs text-amber-600">Reste après: {fmt(remainingAmount - enteredAmount)}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Payment method tiles */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Méthode de paiement</label>
            <div className="grid grid-cols-5 gap-2">
              {PAYMENT_METHODS.map(m => {
                const isActive = formData.method === m.key;
                const colors = TILE_COLORS[m.color];
                const Icon = m.icon;
                return (
                  <button key={m.key} type="button"
                    onClick={() => { setFormData(prev => ({ ...prev, method: m.key })); setError(''); }}
                    className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                      isActive ? `${colors.activeBg} ${colors.activeBorder}` : `${colors.bg} ${colors.border} hover:bg-gray-50`
                    }`}>
                    <Icon className={`w-5 h-5 ${isActive ? colors.activeText : colors.text}`} />
                    <span className={`text-[10px] font-semibold text-center leading-tight ${isActive ? colors.activeText : 'text-gray-500'}`}>
                      {m.label}
                    </span>
                    {isActive && (
                      <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm">
                        <Check className={`w-3 h-3 ${colors.activeText}`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference (conditional) */}
          {(formData.method === 'transfer' || formData.method === 'check' || formData.method === 'mobile') && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Référence</label>
              <input type="text" value={formData.reference}
                onChange={e => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder={refPlaceholder}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <textarea value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2} placeholder="Notes sur ce paiement..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={!formData.saleId || !formData.amount || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-sm font-semibold transition-all shadow-lg shadow-indigo-200/40 disabled:shadow-none">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Encaissement...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Encaisser {enteredAmount > 0 ? fmt(enteredAmount) : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
