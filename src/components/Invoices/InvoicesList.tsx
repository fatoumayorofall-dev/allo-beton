import React, { useMemo, useState, useEffect } from 'react';
import {
  Plus, Search, FileText, Eye, Edit, Printer,
  Calendar, DollarSign, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { Invoice } from '../../types';
import { invoicesAPI } from '../../services/mysql-api';

interface InvoicesListProps {
  onNewInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onViewInvoice: (invoice: Invoice) => void;
}

export const InvoicesList: React.FC<InvoicesListProps> = ({
  onNewInvoice,
  onEditInvoice,
  onViewInvoice
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchInvoices = async () => {
    try {
      const result = await invoicesAPI.getAll();
      if (result.success) {
        setInvoices(result.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement factures:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const stats = useMemo(() => {
    const total = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    const paid = invoices.filter(inv => inv.status === 'paid').length;
    const pending = invoices.filter(inv => inv.status === 'sent' || inv.status === 'draft').length;
    const overdue = invoices.filter(inv => inv.status === 'overdue').length;
    return { total, totalAmount, paid, pending, overdue };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    let result = invoices;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(inv =>
        (inv.invoice_number || '').toLowerCase().includes(term) ||
        (inv.customer_name || inv.customer?.name || '').toLowerCase().includes(term)
      );
    }
    if (filterStatus !== 'all') {
      result = result.filter(inv => inv.status === filterStatus);
    }
    return result.sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
  }, [invoices, searchTerm, filterStatus]);

  const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusDot = (status: string) => {
    const config: Record<string, { dot: string; label: string }> = {
      draft: { dot: 'bg-gray-400', label: 'Brouillon' },
      sent: { dot: 'bg-orange-500', label: 'Envoyée' },
      paid: { dot: 'bg-emerald-500', label: 'Payée' },
      overdue: { dot: 'bg-red-500', label: 'En retard' },
      cancelled: { dot: 'bg-gray-300', label: 'Annulée' },
    };
    const s = config[status] || config.draft;
    return (
      <span className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${s.dot}`}></span>
        <span className="text-sm text-gray-700">{s.label}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  /* ── KPI config ── */
  const kpis = [
    { label: 'Total Factures', value: stats.total.toString(), icon: FileText, fill: 'bg-gradient-to-br from-orange-50/70 to-amber-50/40', border: 'border-l-orange-400', iconBg: 'bg-orange-100', iconClr: 'text-orange-600', ring: 'border-orange-200/50', valClr: 'text-gray-900' },
    { label: 'Montant Total', value: formatMoney(stats.totalAmount), icon: DollarSign, fill: 'bg-gradient-to-br from-orange-50/70 to-indigo-50/40', border: 'border-l-orange-400', iconBg: 'bg-orange-100', iconClr: 'text-orange-600', ring: 'border-orange-200/50', valClr: 'text-orange-700' },
    { label: 'Payées', value: stats.paid.toString(), icon: CheckCircle, fill: 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40', border: 'border-l-emerald-400', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', ring: 'border-emerald-200/50', valClr: 'text-emerald-700' },
    { label: 'En attente', value: stats.pending.toString(), icon: Clock, fill: 'bg-gradient-to-br from-amber-50/70 to-yellow-50/40', border: 'border-l-amber-400', iconBg: 'bg-amber-100', iconClr: 'text-amber-600', ring: 'border-amber-200/50', valClr: 'text-amber-700' },
    { label: 'En retard', value: stats.overdue.toString(), icon: AlertCircle, fill: stats.overdue > 0 ? 'bg-gradient-to-br from-red-50/70 to-rose-50/40' : 'bg-gradient-to-br from-gray-50/70 to-slate-50/40', border: stats.overdue > 0 ? 'border-l-red-400' : 'border-l-gray-300', iconBg: stats.overdue > 0 ? 'bg-red-100' : 'bg-gray-100', iconClr: stats.overdue > 0 ? 'text-red-600' : 'text-gray-500', ring: stats.overdue > 0 ? 'border-red-200/50' : 'border-gray-200/50', valClr: stats.overdue > 0 ? 'text-red-700' : 'text-gray-900' },
  ];

  const filterBtns = [
    { value: 'all', label: 'Toutes', active: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-200/30' },
    { value: 'draft', label: 'Brouillons', active: 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-md shadow-gray-200/30' },
    { value: 'sent', label: 'Envoyées', active: 'bg-gradient-to-r from-orange-500 to-indigo-500 text-white shadow-md shadow-orange-200/30' },
    { value: 'paid', label: 'Payées', active: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/30' },
    { value: 'overdue', label: 'En retard', active: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md shadow-red-200/30' },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(249,115,22,0.08)] p-5 overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 absolute top-0 left-0" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200/40">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Factures</h1>
              <p className="text-sm text-gray-400 mt-0.5">Créez et gérez vos factures professionnelles</p>
            </div>
          </div>
          <button
            onClick={onNewInvoice}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-amber-700 transition-all shadow-md shadow-orange-200/30"
          >
            <Plus className="w-4 h-4" />Nouvelle Facture
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className={`rounded-xl ${k.fill} border-l-4 ${k.border} border ${k.ring} p-4 shadow-sm hover:shadow-md transition-all duration-200`}>
              <div className="flex items-start justify-between mb-2">
                <div className={`w-10 h-10 ${k.iconBg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${k.iconClr}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${k.valClr} leading-tight`}>{k.value}</p>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1">{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Search & Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher une facture, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-800 bg-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400/25 focus:border-orange-300 hover:border-gray-300 transition-all shadow-sm shadow-gray-100/50"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {filterBtns.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterStatus === f.value ? f.active : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Aucune facture trouvée</h3>
          <p className="text-sm text-gray-400 mb-5">
            {searchTerm ? "Aucun résultat pour votre recherche" : "Créez votre première facture"}
          </p>
          <button
            onClick={onNewInvoice}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all font-semibold shadow-md shadow-orange-200/30"
          >
            <Plus className="w-5 h-5" />Créer une Facture
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-br from-gray-50/80 to-slate-50/40 border-b border-gray-100/80">
                <tr>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">N° Facture</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Montant TTC</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.map((invoice) => {
                  const customerName = invoice.customer_name || invoice.customer?.name || 'Client inconnu';
                  return (
                    <tr key={invoice.id} className="hover:bg-gradient-to-r hover:from-orange-50/30 hover:to-amber-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-orange-600 text-sm">{invoice.invoice_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-orange-200/40">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{customerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-3.5 h-3.5 text-gray-300" />
                          {formatDate(invoice.invoice_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">{formatMoney(Number(invoice.total_amount))}</span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusDot(invoice.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onViewInvoice(invoice)}
                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditInvoice(invoice)}
                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onViewInvoice(invoice)}
                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
