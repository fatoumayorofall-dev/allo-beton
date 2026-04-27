import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Package, Download, ArrowUp, ArrowDown, Eye, FileText } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { salesAPI, paymentsAPI, dashboardAPI } from '../../services/mysql-api';
import { formatCurrency as formatCurrencyFn, getSettings, AppSettings } from '../../services/settings';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SaleItem {
  productName: string;
  total: number;
}

interface Sale {
  id: string;
  sale_number?: string;
  customerName?: string;
  status?: string;
  sale_date?: string;
  created_at?: string;
  total_amount?: number;
  items?: SaleItem[];
}

interface Payment {
  id: string;
  amount?: number;
  payment_method?: string;
  created_at?: string;
}

interface Stats {
  totalSales: number;
  monthlyRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  lowStockItems: number;
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function getDateRange(range: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start: Date;

  switch (range) {
    case 'week': {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'quarter': {
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qStart, 1, 0, 0, 0, 0);
      break;
    }
    case 'year': {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    }
    default: // month
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  return { start, end };
}

function filterSalesByRange(sales: Sale[], range: string): Sale[] {
  const { start, end } = getDateRange(range);
  return sales.filter(s => {
    const d = new Date(s.sale_date || s.created_at || 0);
    return d >= start && d <= end;
  });
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces', especes: 'Espèces', 'Espèces': 'Espèces',
  transfer: 'Virement', virement: 'Virement', 'Virement': 'Virement',
  card: 'Carte', carte: 'Carte', 'Carte': 'Carte',
  check: 'Chèque', cheque: 'Chèque', 'Chèque': 'Chèque',
};

function normalizeMethod(raw: string): string {
  return METHOD_LABELS[raw] || METHOD_LABELS[raw.toLowerCase()] || raw;
}

const COLORS = ['#f97316', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const PIE_COLORS: Record<string, string> = {
  'Espèces': '#10B981',
  'Virement': '#f97316',
  'Carte': '#8B5CF6',
  'Chèque': '#F59E0B',
};

// ─── Composant principal ─────────────────────────────────────────────────────

export const ReportsPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, pRes, dRes] = await Promise.all([
          salesAPI.getAll(),
          paymentsAPI.getAll(),
          dashboardAPI.getStats(),
        ]);
        if (sRes?.success) setSales(sRes.data);
        if (pRes?.success) setPayments(pRes.data);
        if (dRes?.success) setStats(dRes.data);
        setSettings(await getSettings().catch(() => null));
      } catch (e) {
        console.error('Erreur chargement rapports:', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const fmt = (n: number) => formatCurrencyFn(n, settings || undefined);

  // ─── Données filtrées ──────────────────────────────────────────────────
  const filtered = useMemo(() => filterSalesByRange(sales, dateRange), [sales, dateRange]);

  const totalRevenue = useMemo(() => filtered.reduce((s, sale) => s + Number(sale.total_amount || 0), 0), [filtered]);
  const avgOrderValue = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;

  const monthlyGrowth = useMemo(() => {
    const now = new Date();
    const cm = now.getMonth(), cy = now.getFullYear();
    const pm = cm === 0 ? 11 : cm - 1;
    const py = cm === 0 ? cy - 1 : cy;
    let cur = 0, prev = 0;

    sales.forEach(s => {
      const d = new Date(s.sale_date || s.created_at || 0);
      const amt = Number(s.total_amount || 0);
      if (d.getMonth() === cm && d.getFullYear() === cy) cur += amt;
      if (d.getMonth() === pm && d.getFullYear() === py) prev += amt;
    });

    return prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);
  }, [sales]);

  // Ventes par mois → tableau pour AreaChart
  const salesByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(s => {
      const d = new Date(s.sale_date || s.created_at || 0);
      const key = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      map[key] = (map[key] || 0) + Number(s.total_amount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Top produits → tableau pour BarChart horizontal
  const topProducts = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(s => {
      (s.items || []).forEach(item => {
        map[item.productName] = (map[item.productName] || 0) + Number(item.total || 0);
      });
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Top clients → tableau pour BarChart horizontal
  const topCustomers = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(s => {
      const name = s.customerName || 'Inconnu';
      map[name] = (map[name] || 0) + Number(s.total_amount || 0);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Méthodes de paiement → tableau pour PieChart (donut)
  const paymentMethods = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(p => {
      const method = normalizeMethod(p.payment_method || 'Autre');
      map[method] = (map[method] || 0) + Number(p.amount || 0);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [payments]);

  const payTotal = paymentMethods.reduce((s, p) => s + p.value, 0);

  // ─── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Tooltips personnalisés ────────────────────────────────────────────
  const RevenueTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900 text-sm">{label}</p>
          <p className="text-sm text-orange-600 font-semibold">{fmt(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; color?: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900 text-sm truncate" style={{ maxWidth: 140 }}>{label}</p>
          <p className="text-sm font-semibold" style={{ color: payload[0].color }}>{fmt(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (active && payload && payload.length) {
      const pct = payTotal > 0 ? ((payload[0].value / payTotal) * 100).toFixed(1) : '0';
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900 text-sm">{payload[0].name}</p>
          <p className="text-sm font-semibold text-gray-600">{fmt(payload[0].value)}</p>
          <p className="text-xs text-gray-400">{pct}% du total</p>
        </div>
      );
    }
    return null;
  };

  // Formateur d'axes Y compact
  const fmtAxis = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : String(v);

  const recentSales = [...sales]
    .sort((a, b) => new Date(b.sale_date || b.created_at || 0).getTime() - new Date(a.sale_date || a.created_at || 0).getTime())
    .slice(0, 10);

  // ─── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(59,130,246,0.08)] p-5 overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-indigo-400 to-violet-400 absolute top-0 left-0" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200/40">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Rapports & Analytics</h1>
              <p className="text-sm text-gray-400 mt-0.5">Vue complète de vos performances commerciales</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-orange-400/25 focus:border-orange-300 bg-white text-gray-700 shadow-sm transition-all"
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            <button className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:from-orange-600 hover:to-indigo-700 text-sm font-semibold transition-all shadow-md shadow-orange-200/30">
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-emerald-50/70 to-green-50/40 border-l-4 border-l-emerald-400 border border-emerald-200/40 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Chiffre d'Affaires</p>
              <p className="text-2xl font-bold text-emerald-700">
                {totalRevenue >= 1_000_000 ? `${(totalRevenue / 1_000_000).toFixed(1)}M` : fmt(totalRevenue)}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${monthlyGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {monthlyGrowth >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(monthlyGrowth).toFixed(1)}%
                </div>
                <span className="text-xs text-gray-400">vs mois prec.</span>
              </div>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-orange-50/70 to-indigo-50/40 border-l-4 border-l-orange-400 border border-orange-200/40 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Ventes</p>
              <p className="text-2xl font-bold text-orange-700">{filtered.length}</p>
              <p className="text-xs text-gray-400 mt-2">{sales.length} au total</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-orange-50/70 to-amber-50/40 border-l-4 border-l-orange-400 border border-orange-200/40 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Panier Moyen</p>
              <p className="text-2xl font-bold text-orange-700">
                {avgOrderValue >= 1_000_000 ? `${(avgOrderValue / 1_000_000).toFixed(1)}M` : fmt(avgOrderValue)}
              </p>
              <p className="text-xs text-gray-400 mt-2">par vente</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-purple-50/70 to-violet-50/40 border-l-4 border-l-purple-400 border border-purple-200/40 p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Clients</p>
              <p className="text-2xl font-bold text-purple-700">{stats?.totalCustomers ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-2">{stats?.totalProducts ?? '—'} produits</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 1 : AreaChart (CA mensuel) + PieChart (Méthodes de paiement) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AreaChart — Évolution du CA */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Évolution du Chiffre d'Affaires</h3>
          </div>
          <p className="text-xs text-gray-500 ml-9 mb-5">CA mensuel sur la période sélectionnée</p>

          {salesByMonth.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-sm text-gray-400">Aucune vente sur cette période</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={salesByMonth} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={fmtAxis} />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f97316"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCA)"
                  dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#ea580c', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* PieChart — Méthodes de paiement (donut) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
          <p className="text-xs text-gray-500 mt-0.5 mb-4">Répartition par type</p>

          {paymentMethods.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-sm text-gray-400">Aucun paiement</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    stroke="none"
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Légende manuelle du donut */}
              <div className="mt-2 space-y-2">
                {paymentMethods.map((entry, index) => {
                  const pct = payTotal > 0 ? ((entry.value / payTotal) * 100).toFixed(1) : '0';
                  const color = PIE_COLORS[entry.name] || COLORS[index % COLORS.length];
                  return (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs text-gray-700 font-medium">{entry.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-semibold">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2 : BarChart horizontal Top Produits + Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Produits */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
              <Package className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Top 5 Produits</h3>
          </div>
          <p className="text-xs text-gray-500 ml-9 mb-4">Par chiffre d'affaires</p>

          {topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-56">
              <p className="text-sm text-gray-400">Aucun produit vendu</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 90, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 10 }} tickFormatter={fmtAxis} />
                <YAxis dataKey="name" type="category" width={85} stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#374151' }} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                  {topProducts.map((_, index) => (
                    <Cell key={index} fill={index === 0 ? '#7C3AED' : '#8B5CF6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 5 Clients */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Top 5 Clients</h3>
          </div>
          <p className="text-xs text-gray-500 ml-9 mb-4">Par dépenses totales</p>

          {topCustomers.length === 0 ? (
            <div className="flex items-center justify-center h-56">
              <p className="text-sm text-gray-400">Aucun client</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topCustomers} layout="vertical" margin={{ top: 5, right: 30, left: 90, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 10 }} tickFormatter={fmtAxis} />
                <YAxis dataKey="name" type="category" width={85} stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#374151' }} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                  {topCustomers.map((_, index) => (
                    <Cell key={index} fill={index === 0 ? '#059669' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tableau des dernières ventes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100/80 bg-gradient-to-br from-gray-50/50 to-slate-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Dernières Ventes</h3>
              <p className="text-xs text-gray-400">10 ventes les plus récentes</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-indigo-600 text-white rounded-xl hover:from-orange-600 hover:to-indigo-700 text-xs font-medium transition-all shadow-sm">
            <Eye className="w-3.5 h-3.5" /> Voir tout
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-br from-gray-50/80 to-slate-50/40 border-b border-gray-100/80">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">N° Vente</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Montant</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">Aucune vente enregistrée</td>
                </tr>
              ) : recentSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gradient-to-r hover:from-orange-50/30 hover:to-indigo-50/20 transition-all duration-150">
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">{sale.sale_number || `#${sale.id}`}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{sale.customerName || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {new Date(sale.sale_date || sale.created_at || 0).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">{fmt(Number(sale.total_amount || 0))}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        sale.status === 'confirmed' ? 'bg-orange-500' :
                        sale.status === 'cancelled' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <span className={`text-xs font-semibold ${
                        sale.status === 'confirmed' ? 'text-orange-700' :
                        sale.status === 'cancelled' ? 'text-red-700' : 'text-yellow-700'
                      }`}>
                        {sale.status === 'confirmed' ? 'Confirmé' :
                         sale.status === 'cancelled' ? 'Annulé' : 'Brouillon'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Résumé bas de page */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-50/70 to-indigo-50/40 rounded-xl p-5 border-l-4 border-l-orange-400 border border-orange-200/40 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-700" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Croissance mensuelle</p>
              <p className={`text-2xl font-bold mt-0.5 ${monthlyGrowth >= 0 ? 'text-orange-900' : 'text-red-700'}`}>
                {monthlyGrowth >= 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">vs mois précédent</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/70 to-green-50/40 rounded-xl p-5 border-l-4 border-l-emerald-400 border border-emerald-200/40 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Clients actifs</p>
              <p className="text-2xl font-bold text-green-900 mt-0.5">{stats?.totalCustomers ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-1">dans la base</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50/70 to-amber-50/40 rounded-xl p-5 border-l-4 border-l-orange-400 border border-orange-200/40 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-700" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Produits en stock</p>
              <p className="text-2xl font-bold text-orange-900 mt-0.5">{stats?.totalProducts ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats?.lowStockItems ? `${stats.lowStockItems} en rupture` : 'Tout OK'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
