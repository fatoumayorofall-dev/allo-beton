import React, { useState, useEffect } from 'react';
import {
  X, ShoppingCart, User, Package, Truck, Calendar, FileText, Printer,
  Download, Copy, CreditCard, CheckCircle, Clock, AlertTriangle, Wallet,
  ChevronDown, ChevronUp, Banknote, Receipt, MapPin, Phone, Mail
} from 'lucide-react';
import { Sale } from '../../types';
import { salesAPI } from '../../services/mysql-api';
import { formatCurrency, getSettings, AppSettings } from '../../services/settings';

interface SaleDetailProps {
  sale: Sale;
  onClose: () => void;
  onDuplicate?: (sale: Sale) => void;
  onAddPayment?: (saleId: string) => void;
}

export const SaleDetail: React.FC<SaleDetailProps> = ({ sale: initialSale, onClose, onDuplicate, onAddPayment }) => {
  const [sale, setSale] = useState<any>(initialSale);
  const [loading, setLoading] = useState(true);
  const [showPayments, setShowPayments] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
    loadSaleDetail();
  }, []);

  const loadSaleDetail = async () => {
    try {
      const result = await salesAPI.getById((initialSale as any).id);
      if (result.success) setSale(result.data);
    } catch (e) {
      console.error('Erreur chargement détail:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number) => formatCurrency(amount, settings || undefined);
  const formatDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const formatDateTime = (d: string | undefined) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const result = await salesAPI.duplicate(sale.id);
      if (result.success && onDuplicate) {
        onDuplicate(result.data);
      }
    } catch (e: any) {
      alert(e?.message || 'Erreur lors de la duplication');
    } finally {
      setDuplicating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const total = Number(sale.total || sale.total_amount || 0);
  const paid = Number(sale.amount_paid || 0);
  const remaining = total - paid;
  const isPaid = remaining <= 0;
  const saleType = sale.sale_type || 'cash';
  const items = sale.items || [];
  const payments = sale.payments || [];
  const taxRate = Number(sale.tax_rate || 18);
  const taxAmount = Number(sale.tax_amount || 0);
  const subtotal = Number(sale.subtotal || 0);

  const statusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
    draft: { label: 'Brouillon', bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock },
    confirmed: { label: 'Confirmée', bg: 'bg-orange-50', text: 'text-orange-700', icon: CheckCircle },
    cancelled: { label: 'Annulée', bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle },
  };
  const st = statusConfig[sale.status] || statusConfig.draft;
  const StatusIcon = st.icon;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200/40">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{sale.sale_number || sale.id}</h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full ${st.bg} ${st.text}`}>
                  <StatusIcon className="w-3 h-3" />
                  {st.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(sale.sale_date || sale.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-all" title="Imprimer">
              <Printer className="w-4 h-4" />
            </button>
            {onDuplicate && (
              <button onClick={handleDuplicate} disabled={duplicating} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200/60 rounded-xl hover:bg-teal-100 transition-all disabled:opacity-50" title="Dupliquer">
                <Copy className="w-3.5 h-3.5" />
                {duplicating ? 'Duplication...' : 'Dupliquer'}
              </button>
            )}
            <button onClick={onClose} className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-2 border-emerald-100 border-t-emerald-400 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Top grid: Client + Infos vente */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Client card */}
                <div className="bg-gradient-to-br from-indigo-50/60 to-violet-50/30 rounded-xl border border-indigo-200/40 p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">Client</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${saleType === 'quotataire' ? 'bg-violet-50 text-violet-700 border-violet-200/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'}`}>
                      {saleType === 'quotataire' ? 'Quotataire' : 'Cash'}
                    </span>
                  </div>
                  <p className="text-base font-bold text-gray-900">{sale.customerName || sale.client_name || '—'}</p>
                  {sale.customerCompany && <p className="text-xs text-gray-500 mt-0.5">{sale.customerCompany}</p>}
                  {sale.customer && (
                    <div className="mt-3 space-y-1.5">
                      {sale.customer.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Phone className="w-3 h-3" /> {sale.customer.phone}
                        </div>
                      )}
                      {sale.customer.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail className="w-3 h-3" /> {sale.customer.email}
                        </div>
                      )}
                      {sale.customer.address && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" /> {sale.customer.address}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Infos vente */}
                <div className="bg-gradient-to-br from-sky-50/60 to-orange-50/30 rounded-xl border border-sky-200/40 p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-sky-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">Informations</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Date</span>
                      <p className="font-semibold text-gray-800 mt-0.5">{formatDate(sale.sale_date || sale.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Échéance</span>
                      <p className="font-semibold text-gray-800 mt-0.5">{formatDate(sale.due_date)}</p>
                    </div>
                    {sale.camion && (
                      <div>
                        <span className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Camion</span>
                        <p className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1"><Truck className="w-3 h-3 text-sky-500" />{sale.camion}</p>
                      </div>
                    )}
                    {sale.type_beton && (
                      <div>
                        <span className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Type Béton</span>
                        <p className="font-semibold text-gray-800 mt-0.5">{sale.type_beton}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">TVA</span>
                      <p className="font-semibold text-gray-800 mt-0.5">{taxRate}%</p>
                    </div>
                    <div>
                      <span className="text-gray-400 uppercase tracking-wide font-semibold text-[10px]">Vendeur</span>
                      <p className="font-semibold text-gray-800 mt-0.5">{sale.sellerName || '—'}</p>
                    </div>
                  </div>
                  {sale.notes && (
                    <div className="mt-3 p-2 bg-white/60 rounded-lg border border-sky-100/60">
                      <p className="text-xs text-gray-600 italic">{sale.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Produits table */}
              <div className="bg-white rounded-xl border border-gray-100/80 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-gray-50/80 to-slate-50/40 border-b border-gray-100">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">Produits ({items.length})</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase">Produit</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase">Qté</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase">Prix Unit.</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-800">{item.productName || 'Produit'}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatMoney(item.price || item.unit_price || 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatMoney(item.total || item.line_total || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gradient-to-r from-gray-50/50 to-slate-50/30 border-t border-gray-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500 font-medium">Sous-total HT</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-800">{formatMoney(subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-1.5 text-right text-xs text-gray-500 font-medium">TVA ({taxRate}%)</td>
                      <td className="px-4 py-1.5 text-right text-gray-600">{formatMoney(taxAmount)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-bold text-gray-900">Total TTC</td>
                      <td className="px-4 py-2.5 text-right text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{formatMoney(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Paiement summary */}
              <div className={`rounded-xl border p-4 ${isPaid ? 'bg-gradient-to-br from-emerald-50/60 to-teal-50/30 border-emerald-200/40' : 'bg-gradient-to-br from-red-50/60 to-rose-50/30 border-red-200/40'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPaid ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      <CreditCard className={`w-4 h-4 ${isPaid ? 'text-emerald-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Paiement</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {isPaid ? 'Payé' : remaining === total ? 'Non payé' : 'Partiellement payé'}
                      </span>
                    </div>
                  </div>
                  {!isPaid && onAddPayment && (
                    <button onClick={() => onAddPayment(sale.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/30">
                      <Banknote className="w-3.5 h-3.5" /> Ajouter un paiement
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Total</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5">{formatMoney(total)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Payé</p>
                    <p className="text-base font-bold text-emerald-600 mt-0.5">{formatMoney(paid)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Reste</p>
                    <p className={`text-base font-bold mt-0.5 ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatMoney(remaining)}</p>
                  </div>
                </div>

                {/* Payments accordion */}
                {payments.length > 0 && (
                  <div className="mt-4">
                    <button onClick={() => setShowPayments(!showPayments)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors">
                      {showPayments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      Historique des paiements ({payments.length})
                    </button>
                    {showPayments && (
                      <div className="mt-2 space-y-1.5">
                        {payments.map((p: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-white/70 rounded-lg border border-gray-100/60 text-xs">
                            <div className="flex items-center gap-2">
                              <Wallet className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-medium text-gray-700">{formatDateTime(p.payment_date)}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500 capitalize">{p.payment_method || '—'}</span>
                            </div>
                            <span className="font-bold text-emerald-700">{formatMoney(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-600 bg-gray-50 border border-gray-200/60 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
