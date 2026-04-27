import React, { useMemo, useState, useCallback } from 'react';
import {
  Plus, Eye, Trash2, ShoppingCart, Search, Download, RefreshCw,
  FileText, Package, Clock, CheckCircle, AlertTriangle, Wallet, Calendar,
  TrendingUp, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Copy, Filter, X, FileSpreadsheet, Truck, BarChart3, Globe, Phone, Store
} from 'lucide-react';
import { ModuleAnalytics } from '../Analytics/ModuleAnalytics';
import { Sale } from '../../types';
import { useDataContext } from '../../contexts/DataContext';
import { salesAPI } from '../../services/mysql-api';
import { formatCurrency, getSettings, AppSettings } from '../../services/settings';

interface SalesListProps {
  onCreateSale: () => void;
  onViewSale: (sale: Sale) => void;
  onEditSale?: (sale: Sale) => void;
  onDuplicateSale?: (sale: Sale) => void;
  onCreateDeliveryNote?: (sale: Sale) => void;
}

// Toast component
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  React.useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold animate-slide-in ${
      type === 'success' ? 'bg-emerald-50 border-emerald-200/60 text-emerald-800' : 'bg-red-50 border-red-200/60 text-red-800'
    }`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
      {message}
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
    </div>
  );
};

export const SalesList: React.FC<SalesListProps> = ({ onCreateSale, onViewSale, onDuplicateSale, onCreateDeliveryNote }) => {
  const { sales, loading, refreshSales } = useDataContext();
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const ITEMS_PER_PAGE = 20;

  // Date range filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  React.useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  const formatMoney = (amount: number): string => formatCurrency(amount, settings || undefined);
  const formatDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

  const filteredSales = useMemo(() => {
    return (sales || []).filter((sale: any) => {
      // Type filter
      if (filter !== 'all') {
        if (filter === 'cash' && sale.sale_type !== 'cash') return false;
        if (filter === 'quotataire' && sale.sale_type !== 'quotataire') return false;
        if (filter === '8/16' && sale.type_beton !== '8/16') return false;
        if (filter === '3/8' && sale.type_beton !== '3/8') return false;
      }
      // Source filter (omnichannel)
      if (sourceFilter !== 'all') {
        const saleSource = sale.source || 'counter';
        if (sourceFilter === 'online' && saleSource !== 'online') return false;
        if (sourceFilter === 'phone' && saleSource !== 'phone') return false;
        if (sourceFilter === 'counter' && saleSource !== 'counter') return false;
      }
      // Date filter
      if (dateFrom) {
        const saleDate = sale.sale_date || sale.created_at;
        if (saleDate && new Date(saleDate) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const saleDate = sale.sale_date || sale.created_at;
        if (saleDate && new Date(saleDate) > new Date(dateTo + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [sales, filter, sourceFilter, dateFrom, dateTo]);

  const searchedSales = useMemo(() => {
    if (!searchTerm) return filteredSales;
    const term = searchTerm.toLowerCase();
    return filteredSales.filter((sale: any) =>
      (sale.sale_number || '').toLowerCase().includes(term) ||
      (sale.customerName || sale.customer_name || sale.client_name || '').toLowerCase().includes(term) ||
      (sale.camion || '').toLowerCase().includes(term) ||
      String(sale.total || sale.total_amount || '').includes(term)
    );
  }, [filteredSales, searchTerm]);

  const stats = useMemo(() => {
    const allSales = sales || [];
    const totalVolume = allSales.reduce((sum: number, s: any) => sum + Number(s.items?.[0]?.quantity || 0), 0);
    const cashCount = allSales.filter((s: any) => s.sale_type === 'cash').length;
    const quotaCount = allSales.filter((s: any) => s.sale_type === 'quotataire').length;
    const totalCA = allSales.reduce((sum: number, s: any) => sum + Number(s.total || s.total_amount || 0), 0);
    const totalPaid = allSales.reduce((sum: number, s: any) => sum + Number(s.amount_paid || 0), 0);
    const totalUnpaid = totalCA - totalPaid;
    const unpaidSales = allSales.filter((s: any) => {
      const tot = Number(s.total || s.total_amount || 0);
      const pd = Number(s.amount_paid || 0);
      return (s.payment_status === 'pending' || s.payment_status === 'partial') && (tot - pd) > 0;
    });
    // Omnichannel stats
    const counterCount = allSales.filter((s: any) => (s.source || 'counter') === 'counter').length;
    const phoneCount = allSales.filter((s: any) => s.source === 'phone').length;
    const onlineCount = allSales.filter((s: any) => s.source === 'online').length;
    const counterCA = allSales.filter((s: any) => (s.source || 'counter') === 'counter').reduce((sum: number, s: any) => sum + Number(s.total || s.total_amount || 0), 0);
    const phoneCA = allSales.filter((s: any) => s.source === 'phone').reduce((sum: number, s: any) => sum + Number(s.total || s.total_amount || 0), 0);
    const onlineCA = allSales.filter((s: any) => s.source === 'online').reduce((sum: number, s: any) => sum + Number(s.total || s.total_amount || 0), 0);
    return { total: allSales.length, totalVolume, cashCount, quotaCount, totalCA, totalPaid, totalUnpaid, unpaidSales, counterCount, phoneCount, onlineCount, counterCA, phoneCA, onlineCA };
  }, [sales]);

  const handleDelete = async (sale: any) => { setConfirmDelete(sale); };

  const confirmDeleteSale = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await salesAPI.update(confirmDelete.id, { status: 'cancelled' });
      await refreshSales();
      setConfirmDelete(null);
      setToast({ message: 'Vente annulée avec succès', type: 'success' });
    } catch (e: any) {
      setDeleteError(e?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDuplicate = useCallback(async (sale: any) => {
    if (onDuplicateSale) {
      onDuplicateSale(sale);
    } else {
      try {
        const result = await salesAPI.duplicate(sale.id);
        if (result.success) {
          await refreshSales();
          setToast({ message: `Vente dupliquée: ${result.data.sale_number}`, type: 'success' });
        }
      } catch (e: any) {
        setToast({ message: e?.message || 'Erreur lors de la duplication', type: 'error' });
      }
    }
  }, [onDuplicateSale, refreshSales]);

  // Date presets
  const setDatePreset = (preset: string) => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    switch (preset) {
      case 'today':
        setDateFrom(fmt(today)); setDateTo(fmt(today)); break;
      case 'week': {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay() + 1);
        setDateFrom(fmt(start)); setDateTo(fmt(today)); break;
      }
      case 'month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateFrom(fmt(start)); setDateTo(fmt(today)); break;
      }
      case 'all':
        setDateFrom(''); setDateTo(''); break;
    }
    setCurrentPage(1);
  };

  // ── Export CSV ──
  const handleExportCSV = () => {
    const headers = ['N°', 'Date', 'Client', 'Camion', 'Type Béton', 'Quantité', 'Sous-total', 'TVA', 'Total', 'Payé', 'Reste', 'Type', 'Statut'];
    const csvData = searchedSales.map((s: any) => {
      const total = Number(s.total || s.total_amount || 0);
      const paid = Number(s.amount_paid || 0);
      return [
        s.sale_number || s.id,
        s.sale_date ? new Date(s.sale_date).toLocaleDateString('fr-FR') : '',
        s.customerName || s.customer_name || s.client_name || '',
        s.camion || '',
        s.type_beton || '',
        s.items?.[0]?.quantity || 0,
        Number(s.subtotal || 0),
        Number(s.tax_amount || 0),
        total, paid, total - paid,
        s.sale_type || 'cash',
        s.payment_status || 'pending'
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ventes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToast({ message: 'Export CSV téléchargé', type: 'success' });
  };

  // ── Export Excel (XLSX via html table) ──
  const handleExportExcel = () => {
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Ventes</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1">';
    html += '<tr><th>N°</th><th>Date</th><th>Client</th><th>Camion</th><th>Type Béton</th><th>Qté</th><th>Sous-total</th><th>TVA</th><th>Total</th><th>Payé</th><th>Reste</th><th>Type</th><th>Statut</th></tr>';
    searchedSales.forEach((s: any) => {
      const total = Number(s.total || s.total_amount || 0);
      const paid = Number(s.amount_paid || 0);
      html += `<tr>
        <td>${s.sale_number || s.id}</td>
        <td>${s.sale_date ? new Date(s.sale_date).toLocaleDateString('fr-FR') : ''}</td>
        <td>${s.customerName || s.customer_name || s.client_name || ''}</td>
        <td>${s.camion || ''}</td>
        <td>${s.type_beton || ''}</td>
        <td>${s.items?.[0]?.quantity || 0}</td>
        <td>${Number(s.subtotal || 0)}</td>
        <td>${Number(s.tax_amount || 0)}</td>
        <td>${total}</td>
        <td>${paid}</td>
        <td>${total - paid}</td>
        <td>${s.sale_type || 'cash'}</td>
        <td>${s.payment_status || 'pending'}</td>
      </tr>`;
    });
    html += '</table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ventes_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToast({ message: 'Export Excel téléchargé', type: 'success' });
  };

  const totalPages = Math.ceil(searchedSales.length / ITEMS_PER_PAGE);
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return searchedSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [searchedSales, currentPage]);

  /* ── KPI config ── */
  const kpis = [
    {
      label: 'Total Ventes', value: stats.total.toString(), sub: `${stats.cashCount} cash · ${stats.quotaCount} quota`,
      icon: FileText, fill: 'bg-gradient-to-br from-orange-50/70 to-indigo-50/40', border: 'border-l-orange-400',
      iconBg: 'bg-orange-100', iconClr: 'text-orange-600', ring: 'border-orange-200/50', valClr: 'text-gray-900'
    },
    {
      label: "Chiffre d'Affaires", value: formatMoney(stats.totalCA), sub: `Payé: ${formatMoney(stats.totalPaid)}`,
      icon: TrendingUp, fill: 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40', border: 'border-l-emerald-400',
      iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', ring: 'border-emerald-200/50', valClr: 'text-emerald-700'
    },
    {
      label: 'Volume Total', value: `${stats.totalVolume} T`, sub: 'Béton livré',
      icon: Package, fill: 'bg-gradient-to-br from-violet-50/70 to-purple-50/40', border: 'border-l-violet-400',
      iconBg: 'bg-violet-100', iconClr: 'text-violet-600', ring: 'border-violet-200/50', valClr: 'text-gray-900'
    },
    {
      label: 'Impayés', value: formatMoney(stats.totalUnpaid), sub: `${stats.unpaidSales.length} vente(s)`,
      icon: Wallet,
      fill: stats.totalUnpaid > 0 ? 'bg-gradient-to-br from-red-50/70 to-rose-50/40' : 'bg-gradient-to-br from-gray-50/70 to-slate-50/40',
      border: stats.totalUnpaid > 0 ? 'border-l-red-400' : 'border-l-gray-300',
      iconBg: stats.totalUnpaid > 0 ? 'bg-red-100' : 'bg-gray-100',
      iconClr: stats.totalUnpaid > 0 ? 'text-red-600' : 'text-gray-500',
      ring: stats.totalUnpaid > 0 ? 'border-red-200/50' : 'border-gray-200/50',
      valClr: stats.totalUnpaid > 0 ? 'text-red-700' : 'text-gray-900'
    },
  ];

  const filterBtns = [
    { value: 'all', label: 'Toutes', active: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/30' },
    { value: 'cash', label: 'Cash', active: 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-md shadow-emerald-200/30' },
    { value: 'quotataire', label: 'Quotataire', active: 'bg-gradient-to-r from-violet-400 to-purple-500 text-white shadow-md shadow-violet-200/30' },
    { value: '8/16', label: '8/16', active: 'bg-gradient-to-r from-orange-400 to-indigo-500 text-white shadow-md shadow-orange-200/30' },
    { value: '3/8', label: '3/8', active: 'bg-gradient-to-r from-teal-400 to-cyan-500 text-white shadow-md shadow-teal-200/30' },
  ];

  const sourceBtns = [
    { value: 'all', label: 'Tous canaux', icon: ShoppingCart, active: 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md shadow-gray-200/30' },
    { value: 'counter', label: `Comptoir (${stats.counterCount})`, icon: Store, active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/30' },
    { value: 'phone', label: `Téléphone (${stats.phoneCount})`, icon: Phone, active: 'bg-gradient-to-r from-sky-500 to-orange-500 text-white shadow-md shadow-sky-200/30' },
    { value: 'online', label: `En ligne (${stats.onlineCount})`, icon: Globe, active: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-200/30' },
  ];

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'online': return { icon: Globe, label: 'En ligne', cls: 'bg-green-50 text-green-700 border-green-200/60' };
      case 'phone': return { icon: Phone, label: 'Tél.', cls: 'bg-sky-50 text-sky-700 border-sky-200/60' };
      case 'counter': return { icon: Store, label: 'Comptoir', cls: 'bg-amber-50 text-amber-700 border-amber-200/60' };
      default: return { icon: Store, label: 'Comptoir', cls: 'bg-gray-50 text-gray-600 border-gray-200/60' };
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Delete Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-red-400 via-rose-400 to-pink-400" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-rose-100 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Annuler cette vente ?</h3>
                  <p className="text-sm text-gray-500">Cette action est irréversible</p>
                </div>
              </div>
              <div className="bg-red-50/50 rounded-xl p-3 border border-red-100/60 mb-4">
                <p className="text-sm text-gray-600">
                  Vente <strong className="text-red-700">#{confirmDelete.sale_number || confirmDelete.id}</strong><br />
                  Client: <strong>{confirmDelete.customerName || confirmDelete.customer_name || confirmDelete.client_name || '—'}</strong>
                </p>
              </div>
              {deleteError && (
                <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 rounded-xl flex items-center gap-2 text-sm text-red-700">
                  <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0"><AlertCircle className="w-3.5 h-3.5" /></div>
                  {deleteError}
                </div>
              )}
              <div className="flex items-center gap-3 justify-end">
                <button onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors">
                  Annuler
                </button>
                <button onClick={confirmDeleteSale} disabled={deleteLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-semibold rounded-xl hover:from-red-600 hover:to-rose-700 disabled:opacity-50 transition-all shadow-md shadow-red-200/30">
                  {deleteLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Suppression...</>
                  ) : (
                    <><Trash2 className="w-4 h-4" />Confirmer</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(16,185,129,0.08)] p-5 overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 absolute top-0 left-0" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200/40">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Situation de Vente</h1>
              <p className="text-sm text-gray-400 mt-0.5">Suivi des ventes de béton — {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button onClick={() => refreshSales()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
              <RefreshCw className="w-4 h-4" />Actualiser
            </button>
            <button onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all shadow-sm ${showAnalytics ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-gray-200/80 text-gray-600 hover:bg-gray-50'}`}>
              <BarChart3 className="w-4 h-4" />{showAnalytics ? 'Liste' : 'Analytics'}
            </button>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all shadow-sm ${showFilters ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-200/80 text-gray-600 hover:bg-gray-50'}`}>
              <Filter className="w-4 h-4" />{showFilters ? 'Masquer' : 'Filtres'}
              {(dateFrom || dateTo) && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                <Download className="w-4 h-4" />Export
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[160px]">
                <button onClick={handleExportCSV} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl transition-colors">
                  <FileText className="w-4 h-4 text-emerald-500" /> Export CSV
                </button>
                <button onClick={handleExportExcel} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-xl transition-colors">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export Excel
                </button>
              </div>
            </div>
            <button onClick={onCreateSale}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/30">
              <Plus className="w-4 h-4" />Nouvelle Vente
            </button>
          </div>
        </div>
      </div>

      {showAnalytics ? (
        <ModuleAnalytics module="sales" title="Analytics Ventes" />
      ) : (
      <>
      {/* ── Date Filters Panel ── */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-100/80 shadow-sm p-4 animate-fade-in">
          <div className="flex items-center gap-2.5 mb-3">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm">Filtrer par période</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500">Du</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-200/80 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-300 shadow-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500">Au</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-200/80 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-300 shadow-sm" />
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { label: "Aujourd'hui", value: 'today' },
                { label: 'Cette semaine', value: 'week' },
                { label: 'Ce mois', value: 'month' },
                { label: 'Tout', value: 'all' },
              ].map(p => (
                <button key={p.value} onClick={() => setDatePreset(p.value)}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200/60 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all">
                  {p.label}
                </button>
              ))}
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setCurrentPage(1); }}
                className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200/60 rounded-xl hover:bg-red-100 transition-all flex items-center gap-1">
                <X className="w-3 h-3" /> Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Répartition par Canal (Omnichannel) ── */}
      {(stats.phoneCount > 0 || stats.onlineCount > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 border border-amber-200/50 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Store className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Comptoir</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{stats.counterCount} <span className="text-xs font-normal text-gray-400">ventes</span></p>
            <p className="text-xs text-amber-600 font-semibold mt-0.5">{formatMoney(stats.counterCA)}</p>
          </div>
          <div className="bg-gradient-to-br from-sky-50/70 to-orange-50/40 border border-sky-200/50 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 text-sky-600" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Téléphone</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{stats.phoneCount} <span className="text-xs font-normal text-gray-400">ventes</span></p>
            <p className="text-xs text-sky-600 font-semibold mt-0.5">{formatMoney(stats.phoneCA)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50/70 to-emerald-50/40 border border-green-200/50 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">En ligne</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{stats.onlineCount} <span className="text-xs font-normal text-gray-400">ventes</span></p>
            <p className="text-xs text-green-600 font-semibold mt-0.5">{formatMoney(stats.onlineCA)}</p>
          </div>
        </div>
      )}

      {/* ── Alertes Impayés ── */}
      {stats.unpaidSales.length > 0 && (
        <div className="bg-gradient-to-br from-red-50/60 to-rose-50/30 border border-red-200/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="font-bold text-red-800 text-sm">Ventes impayées</h3>
            <span className="px-2.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm">{stats.unpaidSales.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.unpaidSales.slice(0, 8).map((s: any) => {
              const rem = Number(s.total || s.total_amount || 0) - Number(s.amount_paid || 0);
              return (
                <button key={s.id} onClick={() => onViewSale(s)}
                  className="text-xs bg-white/80 border border-red-200/60 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100/60 transition-all flex items-center gap-2 shadow-sm">
                  <span className="font-semibold">{s.customerName || s.customer_name || s.client_name || 'Client'}</span>
                  <span className="text-red-500 font-bold">{formatMoney(rem)}</span>
                </button>
              );
            })}
            {stats.unpaidSales.length > 8 && (
              <span className="text-xs text-red-500 font-medium flex items-center">+{stats.unpaidSales.length - 8} autres</span>
            )}
          </div>
        </div>
      )}

      {/* ── Search & Filters ── */}
      <div className="bg-white rounded-xl border border-gray-100/80 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" placeholder="Rechercher client, camion, facture, montant..."
              value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-800 bg-white/80 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-300 hover:border-gray-300 transition-all shadow-sm shadow-gray-100/50"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterBtns.map((f) => (
              <button key={f.value} onClick={() => { setFilter(f.value); setCurrentPage(1); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  filter === f.value ? f.active : 'bg-gray-50 text-gray-500 border border-gray-200/60 hover:bg-gray-100'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50/60 border border-emerald-200/50 rounded-xl text-sm font-bold text-emerald-700">
            <ShoppingCart className="w-4 h-4" />
            <span>{searchedSales.length}</span>
          </div>
        </div>
        {/* Source filter (Omnichannel) */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-gray-100">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mr-1">Canal :</span>
          {sourceBtns.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.value} onClick={() => { setSourceFilter(s.value); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  sourceFilter === s.value ? s.active : 'bg-gray-50 text-gray-500 border border-gray-200/60 hover:bg-gray-100'
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(16,185,129,0.06)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg flex items-center justify-center border border-emerald-200/40">
              <FileText className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Liste des Ventes</h3>
              <p className="text-[11px] text-gray-400">
                {dateFrom || dateTo ? `Du ${dateFrom || '...'} au ${dateTo || '...'}` : `Toutes les ventes`}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200/60">
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Camion</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Facture</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Qté (T)</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Béton</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && sales.length === 0 ? (
                <tr>
                  <td className="py-16 text-center" colSpan={9}>
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-2 border-emerald-100 border-t-emerald-400 rounded-full animate-spin" />
                      <span className="mt-3 text-sm text-gray-400">Chargement…</span>
                    </div>
                  </td>
                </tr>
              ) : searchedSales.length === 0 ? (
                <tr>
                  <td className="py-16 text-center" colSpan={9}>
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center ring-1 ring-emerald-100/50">
                        <ShoppingCart className="w-7 h-7 text-emerald-400" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-700 mt-4">Aucune vente trouvée</h4>
                      <p className="text-xs text-gray-400 mt-1">Créez votre première vente</p>
                      <button onClick={onCreateSale}
                        className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/30">
                        <Plus className="w-4 h-4" />Créer une vente
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale: any, index: number) => {
                  const clientName = sale.customerName || sale.customer_name || sale.client_name || '—';
                  const quantity = sale.items?.[0]?.quantity || 0;
                  const saleType = sale.sale_type || 'cash';
                  const total = Number(sale.total || sale.total_amount || 0);
                  const paid = Number(sale.amount_paid || 0);
                  const hasDebt = total - paid > 0;
                  const saleDate = sale.sale_date || sale.created_at;
                  const srcBadge = getSourceBadge(sale.source || 'counter');
                  const SrcIcon = srcBadge.icon;

                  return (
                    <tr key={sale.id} className={`hover:bg-gray-50/60 transition-colors ${hasDebt ? 'border-l-[3px] border-l-red-400' : ''}`}>
                      {/* Date column */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="font-medium">{formatDate(saleDate)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] text-gray-300 font-medium w-5 text-right">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</span>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white flex-shrink-0 ${
                            saleType === 'quotataire' ? 'bg-gradient-to-br from-violet-400 to-purple-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                          }`}>
                            {clientName[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-800 text-sm">{clientName}</span>
                            {hasDebt && <span className="ml-1.5 text-[9px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-bold border border-red-100/60">IMPAYÉ</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{sale.camion || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 rounded-full font-medium">
                            {sale.sale_number || sale.id}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${srcBadge.cls}`}>
                            <SrcIcon className="w-3 h-3" />
                            {srcBadge.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{quantity}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-gray-900">{formatMoney(total)}</span>
                        {hasDebt && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Reste: {formatMoney(total - paid)}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                          sale.type_beton === '8/16' ? 'bg-orange-50 text-orange-700 border-orange-200/60'
                          : sale.type_beton === '3/8' ? 'bg-teal-50 text-teal-700 border-teal-200/60'
                          : 'bg-gray-50 text-gray-400 border-gray-200/60'
                        }`}>
                          {sale.type_beton || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                          saleType === 'quotataire'
                            ? 'bg-violet-50 text-violet-700 border-violet-200/60'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                        }`}>
                          {saleType === 'quotataire' ? 'Quotataire' : 'Cash'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => onViewSale(sale)} title="Voir détail"
                            className="w-7 h-7 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-all">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDuplicate(sale)} title="Dupliquer"
                            className="w-7 h-7 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 flex items-center justify-center transition-all">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {onCreateDeliveryNote && (
                            <button onClick={() => onCreateDeliveryNote(sale)} title="Bon de livraison"
                              className="w-7 h-7 rounded-lg text-gray-400 hover:text-sky-600 hover:bg-sky-50 flex items-center justify-center transition-all">
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(sale)} title="Annuler"
                            className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {searchedSales.length > 0 && (
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50/50 to-slate-50/30 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                <strong className="text-gray-900">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, searchedSales.length)}</strong> sur {searchedSales.length}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-500" />
                <strong className="text-emerald-700">{searchedSales.reduce((sum: number, s: any) => sum + Number(s.items?.[0]?.quantity || 0), 0)} T</strong>
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <strong className="text-emerald-700">{formatMoney(searchedSales.reduce((sum: number, s: any) => sum + Number(s.total || s.total_amount || 0), 0))}</strong>
              </span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center disabled:opacity-30 transition-colors">
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 rounded-lg">
                  {currentPage} / {totalPages}
                </span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center disabled:opacity-30 transition-colors">
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
