import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Search, CreditCard, Banknote, ArrowLeftRight, FileCheck, Wallet,
  CheckCircle2, RefreshCw, Clock, XCircle, RotateCcw, Calendar,
  Receipt, User, Download, Eye, X, Filter,
  ChevronLeft, ChevronRight, Ban, AlertTriangle, CheckCircle, AlertCircle,
  FileSpreadsheet, TrendingUp, BarChart3
} from 'lucide-react';
import { ModuleAnalytics } from '../Analytics/ModuleAnalytics';
import { useDataContext } from '../../contexts/DataContext';
import { formatCurrency as formatCurrencyFn, getSettings, AppSettings } from '../../services/settings';
import { paymentsAPI } from '../../services/mysql-api';
import { translatePaymentStatus, translatePaymentMethod, getStatusColor } from '../../services/translations';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentsListProps {
  onCreatePayment?: () => void;
}

interface PaymentRow {
  id: string;
  payment_number: string;
  amount: number | string;
  payment_method: string;
  method?: string;
  status: string;
  notes?: string;
  sale_number?: string;
  customer_name?: string;
  customer_id?: string;
  created_at?: string;
  payment_date?: string;
  date?: string;
  reference_number?: string;
}

interface PendingSale {
  id: string;
  sale_number: string;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  payment_status: 'pending' | 'partial';
  customer_name: string;
  customer_company?: string;
  created_at: string;
  payment_progress: number;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  React.useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold animate-slide-in ${
      type === 'success' ? 'bg-emerald-50 border-emerald-200/60 text-emerald-800' : 'bg-red-50 border-red-200/60 text-red-800'
    }`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
      {message}
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
    </div>
  );
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces', card: 'Carte bancaire', transfer: 'Virement',
  check: 'Chèque', mobile: 'Mobile Money', prepaid: 'Prépayé',
  bank_transfer: 'Virement bancaire',
};

const METHOD_ICONS: Record<string, React.FC<{ className?: string }>> = {
  cash: Banknote, card: CreditCard, transfer: ArrowLeftRight,
  check: FileCheck, mobile: Wallet, prepaid: Wallet,
};

const METHOD_COLORS: Record<string, { bg: string; text: string; border: string; pill: string; pillActive: string }> = {
  cash:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', pill: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', pillActive: 'bg-emerald-600 text-white shadow-sm' },
  card:     { bg: 'bg-orange-50',    text: 'text-orange-700',    border: 'border-orange-200',    pill: 'bg-orange-50 text-orange-700 hover:bg-orange-100',    pillActive: 'bg-orange-600 text-white shadow-sm' },
  transfer: { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  pill: 'bg-violet-50 text-violet-700 hover:bg-violet-100',  pillActive: 'bg-violet-600 text-white shadow-sm' },
  check:    { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   pill: 'bg-amber-50 text-amber-700 hover:bg-amber-100',   pillActive: 'bg-amber-600 text-white shadow-sm' },
  mobile:   { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  pill: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',  pillActive: 'bg-indigo-600 text-white shadow-sm' },
  prepaid:  { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    pill: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100',    pillActive: 'bg-cyan-600 text-white shadow-sm' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.FC<{ className?: string }> }> = {
  completed: { label: 'Complété',   bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
  pending:   { label: 'En attente', bg: 'bg-yellow-50',  text: 'text-yellow-700',  icon: Clock },
  failed:    { label: 'Échoué',     bg: 'bg-red-50',     text: 'text-red-700',     icon: XCircle },
  cancelled: { label: 'Annulé',     bg: 'bg-gray-100',   text: 'text-gray-500',    icon: Ban },
  refunded:  { label: 'Remboursé',  bg: 'bg-orange-50',  text: 'text-orange-700',  icon: RotateCcw },
};

const ITEMS_PER_PAGE = 20;

// ─── Composant principal ──────────────────────────────────────────────────────

export const PaymentsList: React.FC<PaymentsListProps> = ({ onCreatePayment }) => {
  const { payments: paymentsData, loading, refreshPayments, refreshSales, refreshCustomers } = useDataContext();

  // State
  const [activeTab, setActiveTab] = useState<'payments' | 'pending' | 'analytics'>('payments');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<PaymentRow | null>(null);

  // Pending sales
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [pendingStats, setPendingStats] = useState<any>(null);
  const [loadingPending, setLoadingPending] = useState(false);

  // Init
  useEffect(() => { getSettings().then(setSettings).catch(() => {}); }, []);

  const fmt = useCallback((n: number | string) => formatCurrencyFn(Number(n) || 0, settings || undefined), [settings]);
  const formatDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
  const formatDateLong = (d: string | undefined) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const getMethod = (p: PaymentRow) => p.method || p.payment_method || 'cash';

  // ─── Pending sales loader ───────────────────────────────────────────────────
  const loadPendingSales = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await paymentsAPI.getPendingSales();
      if (res?.success) {
        setPendingSales(res.data || []);
        setPendingStats(res.stats || null);
      }
    } catch { /* ignore */ } finally { setLoadingPending(false); }
  }, []);

  useEffect(() => { if (activeTab === 'pending') loadPendingSales(); }, [activeTab, loadPendingSales]);

  // ─── Payments data ──────────────────────────────────────────────────────────
  const payments: PaymentRow[] = useMemo(() => {
    if (!Array.isArray(paymentsData)) return [];
    return paymentsData.map((p: any) => ({
      id: p.id,
      payment_number: p.payment_number || '',
      amount: p.amount,
      payment_method: p.payment_method || p.method || '',
      method: p.method || p.payment_method || '',
      status: p.status || 'pending',
      notes: p.notes || '',
      sale_number: p.sale_number || '',
      customer_name: p.customer_name || '',
      customer_id: p.customer_id || '',
      created_at: p.created_at,
      payment_date: p.payment_date,
      date: p.date,
      reference_number: p.reference_number || p.reference || '',
    }));
  }, [paymentsData]);

  // ─── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const method = getMethod(p);
      const dateStr = p.payment_date || p.date || p.created_at;

      if (methodFilter !== 'all' && method !== methodFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;

      // Date range
      if (dateFrom && dateStr) {
        const d = new Date(dateStr);
        if (d < new Date(dateFrom)) return false;
      }
      if (dateTo && dateStr) {
        const d = new Date(dateStr);
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        if (d >= end) return false;
      }

      // Search
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        return (
          (p.payment_number || '').toLowerCase().includes(t) ||
          (p.customer_name || '').toLowerCase().includes(t) ||
          (p.sale_number || '').toLowerCase().includes(t) ||
          String(p.amount).includes(t)
        );
      }
      return true;
    });
  }, [payments, methodFilter, statusFilter, dateFrom, dateTo, searchTerm]);

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const completed = payments.filter(p => p.status === 'completed');
    const cancelled = payments.filter(p => p.status === 'cancelled' || p.status === 'failed');
    const totalCompleted = completed.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalCancelled = cancelled.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    // Today
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayPayments = completed.filter(p => {
      const dateStr = p.payment_date || p.date || p.created_at;
      return dateStr && new Date(dateStr) >= today;
    });
    const todayTotal = todayPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthPayments = completed.filter(p => {
      const dateStr = p.payment_date || p.date || p.created_at;
      return dateStr && new Date(dateStr) >= monthStart;
    });
    const monthTotal = monthPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    // By method
    const byMethod: Record<string, number> = {};
    completed.forEach(p => {
      const m = getMethod(p);
      byMethod[m] = (byMethod[m] || 0) + (Number(p.amount) || 0);
    });

    return {
      total: payments.length,
      completedCount: completed.length,
      completedTotal: totalCompleted,
      cancelledCount: cancelled.length,
      cancelledTotal: totalCancelled,
      todayCount: todayPayments.length,
      todayTotal,
      monthTotal,
      monthCount: monthPayments.length,
      byMethod,
      filteredTotal: filtered.filter(p => p.status === 'completed').reduce((s, p) => s + (Number(p.amount) || 0), 0),
    };
  }, [payments, filtered]);

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [methodFilter, statusFilter, dateFrom, dateTo, searchTerm]);

  // ─── Cancel payment ─────────────────────────────────────────────────────────
  const handleCancelPayment = async (payment: PaymentRow) => {
    setCancellingId(payment.id);
    try {
      const res = await paymentsAPI.cancel(payment.id);
      if (res?.success) {
        setToast({ message: `Paiement ${payment.payment_number} annulé`, type: 'success' });
        refreshPayments();
        refreshSales();
        refreshCustomers();
      } else {
        setToast({ message: res?.error || 'Erreur lors de l\'annulation', type: 'error' });
      }
    } catch {
      setToast({ message: 'Erreur réseau', type: 'error' });
    } finally {
      setCancellingId(null);
      setConfirmCancel(null);
    }
  };

  // ─── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Numéro', 'Client', 'Vente', 'Montant', 'Méthode', 'Statut', 'Date', 'Référence'];
    const rows = filtered.map(p => [
      p.payment_number,
      p.customer_name || '',
      p.sale_number || '',
      Number(p.amount) || 0,
      METHOD_LABELS[getMethod(p)] || getMethod(p),
      STATUS_CONFIG[p.status]?.label || p.status,
      formatDate(p.payment_date || p.date || p.created_at),
      p.reference_number || '',
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    let html = '<table><thead><tr><th>Numéro</th><th>Client</th><th>Vente</th><th>Montant</th><th>Méthode</th><th>Statut</th><th>Date</th><th>Référence</th></tr></thead><tbody>';
    filtered.forEach(p => {
      html += `<tr><td>${p.payment_number}</td><td>${p.customer_name || ''}</td><td>${p.sale_number || ''}</td><td>${Number(p.amount) || 0}</td><td>${METHOD_LABELS[getMethod(p)] || getMethod(p)}</td><td>${STATUS_CONFIG[p.status]?.label || p.status}</td><td>${formatDate(p.payment_date || p.date || p.created_at)}</td><td>${p.reference_number || ''}</td></tr>`;
    });
    html += '</tbody></table>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paiements_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset filters
  const hasFilters = methodFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo || searchTerm;
  const resetFilters = () => { setMethodFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); setSearchTerm(''); };

  // ─── Renderers ──────────────────────────────────────────────────────────────

  const renderMethodBadge = (method: string) => {
    const colors = METHOD_COLORS[method] || METHOD_COLORS.cash;
    const Icon = METHOD_ICONS[method] || Banknote;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
        <Icon className="w-3.5 h-3.5" />
        {METHOD_LABELS[method] || method}
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </span>
    );
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_1px_15px_-3px_rgba(99,102,241,0.08)] border border-gray-100/80 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Paiements</h1>
                <p className="text-sm text-gray-500">{stats.total} paiement{stats.total > 1 ? 's' : ''} enregistré{stats.total > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { refreshPayments(); if (activeTab === 'pending') loadPendingSales(); }}
                className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                title="Actualiser">
                <RefreshCw className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {onCreatePayment && (
                <button onClick={onCreatePayment}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200/40">
                  <Plus className="w-4.5 h-4.5" />
                  Nouveau paiement
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">Encaissé total</p>
              <p className="text-lg font-bold text-gray-900 truncate">{fmt(stats.completedTotal)}</p>
              <p className="text-xs text-gray-400">{stats.completedCount} paiement{stats.completedCount > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">Aujourd'hui</p>
              <p className="text-lg font-bold text-gray-900 truncate">{fmt(stats.todayTotal)}</p>
              <p className="text-xs text-gray-400">{stats.todayCount} paiement{stats.todayCount > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">Ce mois</p>
              <p className="text-lg font-bold text-gray-900 truncate">{fmt(stats.monthTotal)}</p>
              <p className="text-xs text-gray-400">{stats.monthCount} paiement{stats.monthCount > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">Annulés</p>
              <p className="text-lg font-bold text-gray-900 truncate">{fmt(stats.cancelledTotal)}</p>
              <p className="text-xs text-gray-400">{stats.cancelledCount} annulation{stats.cancelledCount > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button onClick={() => setActiveTab('payments')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors ${
              activeTab === 'payments'
                ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/40'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            <Receipt className="w-4 h-4" />
            Historique ({payments.length})
          </button>
          <button onClick={() => setActiveTab('pending')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors ${
              activeTab === 'pending'
                ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50/40'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            <Clock className="w-4 h-4" />
            Impayées ({pendingSales.length})
            {pendingSales.length > 0 && (
              <span className="ml-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingSales.length > 9 ? '9+' : pendingSales.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('analytics')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors ${
              activeTab === 'analytics'
                ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50/40'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
        </div>

        {/* ── Tab: Historique ──────────────────────────────────────────────── */}
        {activeTab === 'payments' && (
          <div>
            {/* Search & Filters Bar */}
            <div className="p-4 border-b border-gray-50 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par n°, client, vente, montant..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all" />
                </div>
                {/* Filter toggle */}
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    showFilters || hasFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  <Filter className="w-4 h-4" />
                  Filtres
                  {hasFilters && <span className="w-2 h-2 bg-indigo-500 rounded-full" />}
                </button>
                {/* Export */}
                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-10 hidden group-hover:block min-w-[160px]">
                    <button onClick={exportCSV} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <Download className="w-4 h-4 text-gray-400" /> CSV
                    </button>
                    <button onClick={exportExcel} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded filters */}
              {showFilters && (
                <div className="bg-gray-50/60 rounded-xl p-4 space-y-3 border border-gray-100">
                  {/* Method pills */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Méthode</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => setMethodFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${methodFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                        Tous
                      </button>
                      {Object.entries(METHOD_COLORS).map(([key, colors]) => (
                        <button key={key} onClick={() => setMethodFilter(key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${methodFilter === key ? colors.pillActive : colors.pill + ' border border-transparent'}`}>
                          {METHOD_LABELS[key] || key}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Status pills */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Statut</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[{ key: 'all', label: 'Tous' }, { key: 'completed', label: 'Complétés' }, { key: 'cancelled', label: 'Annulés' }, { key: 'pending', label: 'En attente' }].map(s => (
                        <button key={s.key} onClick={() => setStatusFilter(s.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Date range */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Du</p>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Au</p>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    {hasFilters && (
                      <button onClick={resetFilters} className="mt-4 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        Réinitialiser
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Results info */}
            {hasFilters && (
              <div className="px-4 py-2.5 bg-indigo-50/40 border-b border-indigo-100/50 flex items-center justify-between">
                <span className="text-xs font-medium text-indigo-700">
                  {filtered.length} résultat{filtered.length > 1 ? 's' : ''} — Total: {fmt(stats.filteredTotal)}
                </span>
                <button onClick={resetFilters} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                  <X className="w-3 h-3" /> Effacer
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">N° Paiement</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vente</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Méthode</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading && !paginated.length ? (
                    <tr><td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                        <p className="text-sm text-gray-500">Chargement...</p>
                      </div>
                    </td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                          <Receipt className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Aucun paiement trouvé</p>
                        {hasFilters && <button onClick={resetFilters} className="text-xs text-indigo-600 hover:underline">Réinitialiser les filtres</button>}
                      </div>
                    </td></tr>
                  ) : paginated.map(p => (
                    <tr key={p.id} className={`hover:bg-gray-50/60 transition-colors ${p.status === 'cancelled' ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-indigo-600">{p.payment_number}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-800 font-medium truncate max-w-[140px]">{p.customer_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-600">{p.sale_number || '—'}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`text-sm font-bold ${p.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {fmt(Number(p.amount) || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {renderMethodBadge(getMethod(p))}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {renderStatusBadge(p.status)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-500">{formatDate(p.payment_date || p.date || p.created_at)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {p.status === 'completed' && (
                          <button onClick={() => setConfirmCancel(p)} disabled={cancellingId === p.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Annuler ce paiement">
                            {cancellingId === p.id
                              ? <RefreshCw className="w-4 h-4 animate-spin" />
                              : <Ban className="w-4 h-4" />
                            }
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Page {currentPage}/{totalPages} — {filtered.length} paiement{filtered.length > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" /><ChevronLeft className="w-4 h-4 -ml-2.5" />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) page = i + 1;
                    else if (currentPage <= 3) page = i + 1;
                    else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                    else page = currentPage - 2 + i;
                    return (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${currentPage === page ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {page}
                      </button>
                    );
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight className="w-4 h-4" /><ChevronRight className="w-4 h-4 -ml-2.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Impayées ───────────────────────────────────────────────── */}
        {activeTab === 'pending' && (
          <div>
            {/* Pending stats bar */}
            {pendingStats && (
              <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-500 font-medium">Total impayé</p>
                  <p className="text-lg font-bold text-red-600">{fmt(pendingStats.total_remaining)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-500 font-medium">En attente totale</p>
                  <p className="text-lg font-bold text-amber-600">{pendingStats.total_pending}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-500 font-medium">Partiellement payées</p>
                  <p className="text-lg font-bold text-orange-600">{pendingStats.total_partial}</p>
                </div>
              </div>
            )}

            {loadingPending ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : pendingSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">Toutes les ventes sont payées !</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {pendingSales.map(sale => (
                  <div key={sale.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                          <Receipt className="w-4.5 h-4.5 text-amber-600" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900">{sale.sale_number}</span>
                          <p className="text-xs text-gray-500">{sale.customer_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">{fmt(sale.remaining_amount)}</p>
                        <p className="text-xs text-gray-400">reste sur {fmt(sale.total_amount)}</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${sale.payment_progress >= 50 ? 'bg-orange-500' : 'bg-amber-400'}`}
                          style={{ width: `${sale.payment_progress}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 w-10 text-right">{sale.payment_progress}%</span>
                      {onCreatePayment && (
                        <button onClick={onCreatePayment}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                          Payer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="p-5">
            <ModuleAnalytics module="payments" title="Analytics Paiements" />
          </div>
        )}
      </div>

      {/* ── Cancel confirm modal ──────────────────────────────────────────── */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Annuler ce paiement ?</h3>
                <p className="text-sm text-gray-500">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">N° Paiement</span>
                <span className="font-semibold text-gray-900">{confirmCancel.payment_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Client</span>
                <span className="font-semibold text-gray-900">{confirmCancel.customer_name || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Montant</span>
                <span className="font-bold text-red-600">{fmt(Number(confirmCancel.amount) || 0)}</span>
              </div>
              <p className="text-xs text-red-600 pt-1">
                Le montant sera restauré sur la dette du client et la vente repassera en impayé.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmCancel(null)}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Non, garder
              </button>
              <button onClick={() => handleCancelPayment(confirmCancel)} disabled={cancellingId !== null}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:bg-gray-300 transition-colors">
                {cancellingId ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Oui, annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
