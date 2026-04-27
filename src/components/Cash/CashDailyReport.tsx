import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, Download, TrendingUp, TrendingDown, DollarSign,
  ArrowUpCircle, ArrowDownCircle, RefreshCw, FileText, 
  WalletCards, ChevronDown, Printer, Clock, Activity,
  BarChart3, Layers, ArrowRight, CheckCircle2, AlertTriangle,
  Banknote, CreditCard, Smartphone, Building2, Eye
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../services/mysql-api';
import { generateCashReportPDF } from '../../services/reportGenerator.js';

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
  trends?: Array<{ date: string; solde: number; entrees: number; sorties: number }>;
}

const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#84cc16'
];

const CashDailyReport: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/cash/daily-report?date=${selectedDate}`);
      const data = response?.data || response;
      if (data && (data.date || data.movements)) {
        setReportData({
          date: data.date || selectedDate,
          openingBalance: data.openingBalance || 0,
          totalRecettes: data.totalRecettes || 0,
          totalDepenses: data.totalDepenses || 0,
          closingBalance: data.closingBalance || 0,
          operatingScore: data.operatingScore || 0,
          byCategory: data.byCategory || {},
          byPaymentMethod: data.byPaymentMethod || {},
          movements: data.movements || [],
          trends: data.trends || []
        });
      } else {
        setReportData(null);
      }
    } catch (error: any) {
      console.error('Erreur chargement rapport:', error);
      showToast('error', error?.message || 'Impossible de charger le rapport');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData) return;
    setExporting(true);
    setShowExportMenu(false);
    try {
      await generateCashReportPDF(reportData);
      showToast('success', 'PDF téléchargé avec succès');
    } catch (error) {
      console.error('Erreur export:', error);
      showToast('error', "Erreur lors de l'export PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    setShowExportMenu(false);
    const csv = generateCSV(reportData);
    downloadFile(csv, `rapport-tresorerie-${selectedDate}.csv`, 'text/csv');
    showToast('success', 'CSV exporté avec succès');
  };

  const handlePrint = () => {
    setShowExportMenu(false);
    window.print();
  };

  const fmt = (num: number) => new Intl.NumberFormat('fr-FR').format(Math.round(num));

  const fmtShort = (num: number) => {
    if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}Md`;
    if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return fmt(num);
  };

  const formatDateFR = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const getCategoryChartData = () => {
    if (!reportData) return [];
    return Object.entries(reportData.byCategory).map(([category, data]) => ({
      name: category.length > 18 ? category.substring(0, 16) + '…' : category,
      fullName: category,
      recettes: data.recettes,
      depenses: data.depenses,
      net: data.recettes - data.depenses
    }));
  };

  const getPaymentMethodData = () => {
    if (!reportData) return [];
    return Object.entries(reportData.byPaymentMethod).map(([method, data]) => ({
      name: method,
      total: data.recettes + data.depenses,
      recettes: data.recettes,
      depenses: data.depenses
    }));
  };

  const getPaymentIcon = (method: string) => {
    const lower = method.toLowerCase();
    if (lower.includes('espèce') || lower.includes('cash')) return Banknote;
    if (lower.includes('carte') || lower.includes('cb')) return CreditCard;
    if (lower.includes('mobile') || lower.includes('wave') || lower.includes('om')) return Smartphone;
    if (lower.includes('virement') || lower.includes('banque') || lower.includes('chèque')) return Building2;
    return WalletCards;
  };

  const getScoreConfig = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-500', stroke: '#10b981', emoji: '🟢' };
    if (score >= 60) return { label: 'Bon', color: 'text-orange-600', bg: 'bg-orange-500', stroke: '#6366f1', emoji: '🔵' };
    if (score >= 40) return { label: 'Moyen', color: 'text-amber-600', bg: 'bg-amber-500', stroke: '#f59e0b', emoji: '🟡' };
    return { label: 'Faible', color: 'text-red-600', bg: 'bg-red-500', stroke: '#ef4444', emoji: '🔴' };
  };

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
            <BarChart3 className="absolute inset-0 m-auto w-8 h-8 text-indigo-400" />
          </div>
          <p className="text-gray-600 font-medium text-lg">Chargement du rapport…</p>
          <p className="text-gray-400 text-sm">Analyse des données de trésorerie</p>
        </div>
      </div>
    );
  }

  // ===== NO DATA =====
  if (!reportData) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-2xl p-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          <div className="relative flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Rapport Journalier</h1>
              <p className="text-indigo-200 text-lg">Trésorerie & Caisse — ALLO BÉTON</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Sélectionnez une date</p>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1 text-lg font-semibold text-gray-900 border-0 p-0 focus:ring-0 cursor-pointer bg-transparent" />
              </div>
            </div>
            <button onClick={loadReport}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all font-medium shadow-lg shadow-indigo-200">
              <RefreshCw className="w-4 h-4" /> Charger le rapport
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl p-10 text-center">
          <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-5">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune donnée pour le {formatDateFR(selectedDate)}</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Saisissez des mouvements de caisse dans <span className="font-semibold text-indigo-600">Gestion de Caisse</span> puis revenez consulter votre rapport.
          </p>
        </div>
        {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ===== COMPUTED =====
  const netFlow = reportData.totalRecettes - reportData.totalDepenses;
  const scoreConfig = getScoreConfig(reportData.operatingScore);
  const categoryData = getCategoryChartData();
  const paymentData = getPaymentMethodData();
  const pieData = categoryData.map(item => ({ name: item.fullName || item.name, value: Math.abs(item.recettes) + Math.abs(item.depenses) }));
  const trendData = (reportData.trends || []).map(t => ({ ...t, date: formatShortDate(t.date) }));

  // ===== MAIN REPORT =====
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8 print:p-0">
      {/* HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-2xl p-6 lg:p-8 text-white shadow-xl print:rounded-none print:shadow-none">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/[0.03] rounded-full -translate-x-1/2 -translate-y-1/2"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <BarChart3 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Rapport Journalier</h1>
                <p className="text-indigo-200 text-sm">ALLO BÉTON — Trésorerie & Caisse</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-indigo-200">
              <Calendar className="w-4 h-4" />
              <span className="capitalize text-white font-semibold">{formatDateFR(selectedDate)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer [color-scheme:dark]" />
            <button onClick={loadReport} title="Actualiser"
              className="p-2.5 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all backdrop-blur-sm">
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="relative" ref={exportRef}>
              <button onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 active:scale-95 transition-all shadow-lg">
                <Download className="w-4 h-4" /> Exporter
                <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <button onClick={handleExportPDF} disabled={exporting}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-3 text-gray-700 transition-colors">
                    <FileText className="w-4 h-4 text-red-500" />
                    <div><p className="font-medium text-sm">Télécharger PDF</p><p className="text-xs text-gray-400">Rapport complet</p></div>
                  </button>
                  <button onClick={handleExportCSV}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-3 text-gray-700 transition-colors border-t border-gray-50">
                    <Layers className="w-4 h-4 text-green-500" />
                    <div><p className="font-medium text-sm">Exporter CSV</p><p className="text-xs text-gray-400">Données brutes</p></div>
                  </button>
                  <button onClick={handlePrint}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-3 text-gray-700 transition-colors border-t border-gray-50">
                    <Printer className="w-4 h-4 text-orange-500" />
                    <div><p className="font-medium text-sm">Imprimer</p><p className="text-xs text-gray-400">Aperçu impression</p></div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Solde d'Ouverture" value={fmt(reportData.openingBalance)} suffix="FCFA"
          icon={<WalletCards className="w-5 h-5" />} gradient="from-slate-500 to-slate-700" trend={null} />
        <KPICard label="Entrées du Jour" value={fmtShort(reportData.totalRecettes)} suffix="FCFA"
          icon={<ArrowUpCircle className="w-5 h-5" />} gradient="from-emerald-500 to-emerald-700" trend="up" />
        <KPICard label="Sorties du Jour" value={fmtShort(reportData.totalDepenses)} suffix="FCFA"
          icon={<ArrowDownCircle className="w-5 h-5" />} gradient="from-rose-500 to-rose-700" trend="down" />
        <KPICard label="Solde de Clôture" value={fmtShort(reportData.closingBalance)} suffix="FCFA"
          icon={<DollarSign className="w-5 h-5" />}
          gradient={reportData.closingBalance >= 0 ? 'from-indigo-500 to-indigo-700' : 'from-red-600 to-red-800'}
          trend={netFlow >= 0 ? 'up' : 'down'} />
        {/* Score circulaire */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center justify-center">
          <div className="relative w-20 h-20 mb-2">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={scoreConfig.stroke} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(reportData.operatingScore / 100) * 213.6} 213.6`}
                style={{ transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold ${scoreConfig.color}`}>{reportData.operatingScore.toFixed(0)}%</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium">Score Opérationnel</p>
          <span className={`text-xs font-semibold mt-1 px-2 py-0.5 rounded-full ${scoreConfig.color}`}>
            {scoreConfig.emoji} {scoreConfig.label}
          </span>
        </div>
      </div>

      {/* NET FLOW BANNER */}
      <div className={`rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${
        netFlow >= 0
          ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60'
          : 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${netFlow >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
            {netFlow >= 0 ? <TrendingUp className="w-6 h-6 text-emerald-600" /> : <TrendingDown className="w-6 h-6 text-red-600" />}
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Flux Net du Jour</p>
            <p className={`text-2xl font-bold ${netFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {netFlow >= 0 ? '+' : ''}{fmt(netFlow)} <span className="text-sm font-normal text-gray-500">FCFA</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-gray-500">Taux d'épargne</p>
            <p className={`text-lg font-bold ${netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {reportData.totalRecettes > 0 ? ((netFlow / reportData.totalRecettes) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-500">Opérations</p>
            <p className="text-lg font-bold text-gray-800">{reportData.movements.length}</p>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Répartition des Flux
          </h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none" paddingAngle={3}>
                    {pieData.map((_e, i) => <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${fmt(Number(value))} FCFA`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {pieData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                      <span className="text-gray-600 truncate max-w-[140px]" title={item.name}>{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{fmtShort(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-[280px] flex items-center justify-center text-gray-400">Pas de données</div>}
        </div>

        {/* Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" /> Entrées vs Sorties
          </h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={categoryData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtShort(v)} />
                <Tooltip formatter={(value: any) => `${fmt(Number(value))} FCFA`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="recettes" fill="#10b981" name="Entrées" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depenses" fill="#ef4444" name="Sorties" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[320px] flex items-center justify-center text-gray-400">Pas de données</div>}
        </div>

        {/* Trends */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Tendance 7 Jours
          </h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtShort(v)} />
                <Tooltip formatter={(value: any) => `${fmt(Number(value))} FCFA`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="entrees" stroke="#10b981" fill="url(#gE)" name="Entrées" strokeWidth={2} />
                <Area type="monotone" dataKey="sorties" stroke="#ef4444" fill="url(#gS)" name="Sorties" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-[320px] flex items-center justify-center text-gray-400">Pas de tendances</div>}
        </div>
      </div>

      {/* PAYMENT METHODS */}
      {paymentData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-500" /> Par Mode de Paiement
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {paymentData.map((method, idx) => {
              const MethodIcon = getPaymentIcon(method.name);
              return (
                <div key={idx} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-gray-50 to-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-indigo-50 rounded-lg"><MethodIcon className="w-5 h-5 text-indigo-600" /></div>
                    <p className="font-semibold text-gray-800 text-sm">{method.name}</p>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Entrées</span><span className="font-semibold text-emerald-600">+{fmt(method.recettes)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Sorties</span><span className="font-semibold text-red-500">-{fmt(method.depenses)}</span></div>
                    <div className="pt-1.5 border-t border-gray-100 flex justify-between"><span className="text-gray-600 font-medium">Total</span><span className="font-bold text-gray-800">{fmt(method.total)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* OPERATIONS TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" /> Détail des Opérations
            <span className="ml-2 px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full">{reportData.movements.length}</span>
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-400"><Clock className="w-3.5 h-3.5" /> Triées par heure</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Heure</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégorie</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Méthode</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reportData.movements.map((m, idx) => (
                <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{m.created_at?.substring(11, 16) || '--:--'}</span>
                  </td>
                  <td className="px-6 py-3.5"><span className="text-sm font-medium text-gray-800">{m.category}</span></td>
                  <td className="px-6 py-3.5"><span className="text-sm text-gray-600">{m.description || '—'}</span></td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{m.payment_method}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className={`text-sm font-bold ${m.type === 'recette' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {m.type === 'recette' ? '+' : '-'}{fmt(m.amount)} <span className="text-xs font-normal text-gray-400">F</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={4} className="px-6 py-3 text-right text-sm font-bold text-gray-700 uppercase">Total Entrées</td>
                <td className="px-6 py-3 text-right text-sm font-bold text-emerald-600">+{fmt(reportData.totalRecettes)} F</td>
              </tr>
              <tr className="bg-gray-50">
                <td colSpan={4} className="px-6 py-3 text-right text-sm font-bold text-gray-700 uppercase">Total Sorties</td>
                <td className="px-6 py-3 text-right text-sm font-bold text-red-500">-{fmt(reportData.totalDepenses)} F</td>
              </tr>
              <tr className="bg-indigo-50">
                <td colSpan={4} className="px-6 py-3 text-right text-sm font-extrabold text-indigo-800 uppercase">Solde Net</td>
                <td className={`px-6 py-3 text-right text-base font-extrabold ${netFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {netFlow >= 0 ? '+' : ''}{fmt(netFlow)} F
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ANALYSIS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnalysisCard title="Flux Net" value={`${netFlow >= 0 ? '+' : ''}${fmt(netFlow)}`} unit="FCFA"
          subtitle={`${reportData.totalRecettes > 0 ? ((netFlow / reportData.totalRecettes) * 100).toFixed(1) : '0.0'}% des entrées`}
          icon={<ArrowRight className="w-5 h-5" />} color={netFlow >= 0 ? 'emerald' : 'red'} />
        <AnalysisCard title="Taux de Dépense" value={`${(reportData.totalDepenses / (reportData.totalRecettes || 1) * 100).toFixed(1)}%`} unit=""
          subtitle="Rapport sorties / entrées" icon={<TrendingDown className="w-5 h-5" />} color="amber" />
        <AnalysisCard title="Rentabilité" value={`${((reportData.totalRecettes - reportData.totalDepenses) / (reportData.totalRecettes || 1) * 100).toFixed(1)}%`} unit=""
          subtitle="Marge nette du jour" icon={<CheckCircle2 className="w-5 h-5" />} color="indigo" />
      </div>

      {/* FOOTER */}
      <div className="text-center py-4 text-xs text-gray-400 border-t border-gray-100">
        <p>Rapport généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')} — ALLO BÉTON CRM</p>
      </div>

      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
};

// ===== SUB-COMPONENTS =====

interface KPICardProps { label: string; value: string; suffix: string; icon: React.ReactNode; gradient: string; trend: 'up' | 'down' | null; }

const KPICard: React.FC<KPICardProps> = ({ label, value, suffix, icon, gradient, trend }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow group">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>{icon}</div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        </div>
      )}
    </div>
    <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
    <p className="text-xl font-bold text-gray-900 tracking-tight">{value}</p>
    <p className="text-[10px] text-gray-400 mt-0.5">{suffix}</p>
  </div>
);

interface AnalysisCardProps { title: string; value: string; unit: string; subtitle: string; icon: React.ReactNode; color: string; }

const AnalysisCard: React.FC<AnalysisCardProps> = ({ title, value, unit, subtitle, icon, color }) => {
  const map: Record<string, { bg: string; text: string; iconBg: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
    red: { bg: 'bg-red-50', text: 'text-red-700', iconBg: 'bg-red-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', iconBg: 'bg-indigo-100' },
  };
  const c = map[color] || map.indigo;
  return (
    <div className={`${c.bg} rounded-2xl p-5 border border-gray-100/50`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">{title}</p>
          <p className={`text-2xl font-extrabold ${c.text}`}>{value} <span className="text-sm font-normal">{unit}</span></p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`${c.iconBg} p-2.5 rounded-xl ${c.text}`}>{icon}</div>
      </div>
    </div>
  );
};

const ToastNotif: React.FC<{ toast: { type: string; message: string }; onClose: () => void }> = ({ toast, onClose }) => {
  const colors: Record<string, string> = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-indigo-600' };
  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <AlertTriangle className="w-5 h-5" />,
    info: <Eye className="w-5 h-5" />,
  };
  return (
    <div className={`fixed bottom-6 right-6 ${colors[toast.type] || colors.info} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[9999]`}>
      {icons[toast.type] || icons.info}
      <span className="font-medium text-sm">{toast.message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-lg p-1 transition-colors">✕</button>
    </div>
  );
};

// ===== UTILITIES =====

function generateCSV(reportData: ReportData): string {
  const lines: any[][] = [
    ['RAPPORT JOURNALIER - TRÉSORERIE ET CAISSE'],
    [`Date: ${reportData.date}`], [],
    ['RÉSUMÉ DU JOUR'],
    ['Solde Ouverture', reportData.openingBalance],
    ['Total Entrées', reportData.totalRecettes],
    ['Total Sorties', reportData.totalDepenses],
    ['Solde Clôture', reportData.closingBalance], [],
    ['DÉTAIL DES OPÉRATIONS'],
    ['Heure', 'Catégorie', 'Description', 'Méthode', 'Montant', 'Type']
  ];
  reportData.movements.forEach(m => {
    lines.push([m.created_at?.substring(11, 16) || '', m.category, m.description, m.payment_method, m.amount, m.type]);
  });
  return lines.map(line => line.join(';')).join('\n');
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob(['\ufeff' + content], { type: type + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default CashDailyReport;
