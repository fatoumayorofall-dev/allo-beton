import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Activity, RefreshCw,
  ArrowUpRight, ArrowDownRight, Calendar,
  Package, Users, CreditCard, Truck, Building2, Wallet,
  ShoppingCart, UserCheck, Repeat, ClipboardList, CheckCircle,
  Clock, AlertTriangle, Grid3X3, Banknote, FileText, Handshake,
  Printer, FileDown, X
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────
interface KPI {
  label: string;
  value: number;
  format?: 'currency' | 'percent';
  icon?: string;
  change?: number;
}

interface ChartDataPoint {
  label: string;
  value: number;
  value2?: number;
  count?: number;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'donut' | 'dual-bar' | 'horizontal-bar';
  title: string;
  data: ChartDataPoint[];
  legend?: string[];
}

interface TableConfig {
  title: string;
  columns: string[];
  rows: string[][];
}

interface AnalyticsData {
  kpis: KPI[];
  charts: ChartConfig[];
  tables: TableConfig[];
  summary?: string;
}

interface ModuleAnalyticsProps {
  module: string;
  title?: string;
}

type PeriodKey = '7d' | '30d' | '90d' | '6m' | '12m' | 'custom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7j' },
  { key: '30d', label: '30j' },
  { key: '90d', label: '3 mois' },
  { key: '6m', label: '6 mois' },
  { key: '12m', label: '12 mois' },
  { key: 'custom', label: 'Période' },
];

const MODULE_LABELS: Record<string, string> = {
  sales: 'Ventes', customers: 'Clients', inventory: 'Produits & Stock',
  suppliers: 'Fournisseurs', payments: 'Paiements', transport: 'Transport & Livraisons',
  cash: 'Caisse', banks: 'Banques', partners: 'Partenaires & Investisseurs',
  hr: 'Ressources Humaines', ecommerce: 'E-Commerce',
};

const ICON_MAP: Record<string, React.ReactNode> = {
  'package': <Package className="w-5 h-5" />, 'trending-up': <TrendingUp className="w-5 h-5" />,
  'trending-down': <TrendingDown className="w-5 h-5" />, 'bar-chart': <BarChart3 className="w-5 h-5" />,
  'activity': <Activity className="w-5 h-5" />, 'users': <Users className="w-5 h-5" />,
  'user-check': <UserCheck className="w-5 h-5" />, 'user-plus': <Users className="w-5 h-5" />,
  'credit-card': <CreditCard className="w-5 h-5" />, 'check-circle': <CheckCircle className="w-5 h-5" />,
  'clock': <Clock className="w-5 h-5" />, 'alert-triangle': <AlertTriangle className="w-5 h-5" />,
  'truck': <Truck className="w-5 h-5" />, 'clipboard': <ClipboardList className="w-5 h-5" />,
  'building': <Building2 className="w-5 h-5" />, 'wallet': <Wallet className="w-5 h-5" />,
  'shopping-cart': <ShoppingCart className="w-5 h-5" />, 'repeat': <Repeat className="w-5 h-5" />,
  'grid': <Grid3X3 className="w-5 h-5" />, 'banknote': <Banknote className="w-5 h-5" />,
  'file-text': <FileText className="w-5 h-5" />, 'file-check': <FileText className="w-5 h-5" />,
  'handshake': <Handshake className="w-5 h-5" />,
  'arrow-down-circle': <ArrowDownRight className="w-5 h-5" />,
  'arrow-up-circle': <ArrowUpRight className="w-5 h-5" />,
  'arrow-up-right': <ArrowUpRight className="w-5 h-5" />,
};

const DONUT_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316','#14b8a6','#64748b'];

const KPI_STYLES = [
  { bg: 'from-indigo-500 to-indigo-600', border: 'border-indigo-100' },
  { bg: 'from-emerald-500 to-emerald-600', border: 'border-emerald-100' },
  { bg: 'from-amber-500 to-amber-600', border: 'border-amber-100' },
  { bg: 'from-rose-500 to-rose-600', border: 'border-rose-100' },
];

// ─── Formatage ────────────────────────────────────────────────────────────
function fmtVal(value: number, format?: string): string {
  if (format === 'currency') {
    if (value >= 1e9) return (value / 1e9).toFixed(2) + ' Mrd F';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M F';
    if (value >= 1e3) return Math.round(value / 1e3).toLocaleString('fr-FR') + 'K F';
    return value.toLocaleString('fr-FR') + ' F';
  }
  if (format === 'percent') return value.toFixed(1) + '%';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toLocaleString('fr-FR');
}

// ─── KPI Card ─────────────────────────────────────────────────────────────
const KPICard: React.FC<{ kpi: KPI; index: number }> = ({ kpi, index }) => {
  const s = KPI_STYLES[index % KPI_STYLES.length];
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white border ${s.border} shadow-sm hover:shadow-lg transition-all duration-300 group`}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{kpi.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-gray-900 tracking-tight">{fmtVal(kpi.value, kpi.format)}</p>
            {kpi.change !== undefined && kpi.change !== 0 && (
              <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                kpi.change > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}>
                {kpi.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(kpi.change)}% <span className="font-normal text-gray-400 ml-0.5">vs préc.</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${s.bg} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {ICON_MAP[kpi.icon || 'bar-chart'] || <BarChart3 className="w-5 h-5" />}
          </div>
        </div>
      </div>
      <div className={`h-1 bg-gradient-to-r ${s.bg} opacity-80`} />
    </div>
  );
};

// ─── Bar Chart ────────────────────────────────────────────────────────────
const BarChart: React.FC<{ chart: ChartConfig }> = ({ chart }) => {
  const maxVal = Math.max(...chart.data.map(d => d.value), 1);
  const total = chart.data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-gray-800">{chart.title}</h3>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
          Total: {fmtVal(total, total > 10000 ? 'currency' : undefined)}
        </span>
      </div>
      <p className="text-[10px] text-gray-400 mb-4">{chart.data.length} éléments</p>
      <div className="flex items-end gap-1.5 h-52">
        {chart.data.map((d, i) => {
          const h = (d.value / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-10 shadow-xl pointer-events-none">
                <div className="font-semibold">{d.label}</div>
                <div>{fmtVal(d.value, maxVal > 10000 ? 'currency' : undefined)}{d.count ? ` • ${d.count} ops` : ''}</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 bg-gray-900 rotate-45" />
              </div>
              <div className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 via-indigo-500 to-indigo-400 hover:from-indigo-700 hover:to-indigo-500 transition-all cursor-default min-h-[3px] shadow-sm"
                style={{ height: `${Math.max(h, 2)}%` }} />
              <span className="text-[8px] text-gray-500 truncate w-full text-center font-medium">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────
const HorizontalBarChart: React.FC<{ chart: ChartConfig }> = ({ chart }) => {
  const maxVal = Math.max(...chart.data.map(d => d.value), 1);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <h3 className="text-sm font-bold text-gray-800 mb-4">{chart.title}</h3>
      <div className="space-y-3">
        {chart.data.slice(0, 8).map((d, i) => {
          const w = (d.value / maxVal) * 100;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700 truncate flex-1">{d.label}</span>
                <span className="text-xs font-bold text-gray-900 ml-2 tabular-nums">{fmtVal(d.value, maxVal > 10000 ? 'currency' : undefined)}</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500" style={{ width: `${Math.max(w, 2)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Dual Bar Chart ───────────────────────────────────────────────────────
const DualBarChart: React.FC<{ chart: ChartConfig }> = ({ chart }) => {
  const maxVal = Math.max(...chart.data.map(d => Math.max(d.value, d.value2 || 0)), 1);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">{chart.title}</h3>
        {chart.legend && (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /><span className="font-medium text-gray-600">{chart.legend[0]}</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400" /><span className="font-medium text-gray-600">{chart.legend[1]}</span></span>
          </div>
        )}
      </div>
      <div className="flex items-end gap-1 h-52">
        {chart.data.map((d, i) => {
          const h1 = (d.value / maxVal) * 100;
          const h2 = ((d.value2 || 0) / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="flex items-end gap-0.5 w-full h-full">
                <div className="flex-1 flex flex-col justify-end h-full">
                  <div className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 min-h-[3px] shadow-sm" style={{ height: `${Math.max(h1, 2)}%` }} />
                </div>
                <div className="flex-1 flex flex-col justify-end h-full">
                  <div className="w-full rounded-t-md bg-gradient-to-t from-red-500 to-red-300 min-h-[3px] shadow-sm" style={{ height: `${Math.max(h2, 2)}%` }} />
                </div>
              </div>
              <span className="text-[8px] text-gray-500 truncate w-full text-center font-medium">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Line Chart (SVG) ─────────────────────────────────────────────────────
const LineChart: React.FC<{ chart: ChartConfig }> = ({ chart }) => {
  const data = chart.data;
  if (data.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-800 mb-3">{chart.title}</h3>
      <p className="text-center text-gray-400 py-10 text-sm">Aucune donnée</p>
    </div>
  );

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = Math.min(...data.map(d => d.value), 0);
  const range = maxVal - minVal || 1;
  const W = 520, H = 200, pad = 35;

  const points = data.map((d, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * (W - 2 * pad),
    y: H - pad - ((d.value - minVal) / range) * (H - 2 * pad)
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = pathD + ` L${points[points.length - 1].x},${H - pad} L${points[0].x},${H - pad} Z`;

  const mid = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, mid).reduce((s, d) => s + d.value, 0) / Math.max(mid, 1);
  const secondHalf = data.slice(mid).reduce((s, d) => s + d.value, 0) / Math.max(data.length - mid, 1);
  const trendUp = secondHalf >= firstHalf;
  const gradId = `lg-${chart.title.replace(/[^a-zA-Z0-9]/g, '')}`;
  const color = trendUp ? '#10b981' : '#ef4444';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800">{chart.title}</h3>
        <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trendUp ? 'Hausse' : 'Baisse'}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-52">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const yy = H - pad - pct * (H - 2 * pad);
          return <g key={i}><line x1={pad} y1={yy} x2={W - pad} y2={yy} stroke="#f3f4f6" strokeWidth="1" />
            <text x={pad - 4} y={yy + 3} textAnchor="end" fontSize="7" fill="#9ca3af">{fmtVal(minVal + pct * range)}</text></g>;
        })}
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="white" strokeWidth="2" />
            {(data.length <= 10 || i === 0 || i === points.length - 1 || i % Math.max(Math.floor(data.length / 5), 1) === 0) && (
              <text x={p.x} y={H - 10} textAnchor="middle" fontSize="7.5" fill="#9ca3af" fontWeight="500">{data[i].label}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

// ─── Donut Chart ──────────────────────────────────────────────────────────
const DonutChart: React.FC<{ chart: ChartConfig }> = ({ chart }) => {
  const total = chart.data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-800 mb-3">{chart.title}</h3>
      <p className="text-center text-gray-400 py-10 text-sm">Aucune donnée</p>
    </div>
  );

  let cum = 0;
  const segs = chart.data.map((d, i) => {
    const start = cum;
    const pct = (d.value / total) * 100;
    cum += pct;
    return { ...d, start, end: cum, color: DONUT_COLORS[i % DONUT_COLORS.length], pct };
  });
  const grad = segs.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <h3 className="text-sm font-bold text-gray-800 mb-4">{chart.title}</h3>
      <div className="flex items-center gap-6">
        <div className="relative w-36 h-36 flex-shrink-0">
          <div className="w-full h-full rounded-full shadow-inner" style={{ background: `conic-gradient(${grad})` }} />
          <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center shadow-sm">
            <div className="text-center">
              <p className="text-xl font-extrabold text-gray-900">{total >= 1e6 ? (total / 1e6).toFixed(1) + 'M' : total >= 1e3 ? (total / 1e3).toFixed(1) + 'K' : total}</p>
              <p className="text-[8px] text-gray-400 font-semibold uppercase tracking-widest">Total</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2 max-h-36 overflow-y-auto pr-1">
          {segs.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs group cursor-default">
              <span className="w-3 h-3 rounded flex-shrink-0 shadow-sm group-hover:scale-125 transition-transform" style={{ backgroundColor: s.color }} />
              <span className="text-gray-600 truncate flex-1 group-hover:text-gray-900 transition-colors">{s.label}</span>
              <span className="font-bold text-gray-800 tabular-nums">{s.pct.toFixed(1)}%</span>
              <span className="text-gray-400 tabular-nums text-[10px]">({s.value})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Data Table ───────────────────────────────────────────────────────────
const DataTable: React.FC<{ table: TableConfig }> = ({ table }) => {
  if (table.rows.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-5 py-3 border-b bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">{table.title}</h3>
          <span className="text-[10px] font-medium text-gray-400">{table.rows.length} entrées</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50/50">
              {table.columns.map((col, i) => (
                <th key={i} className={`px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {table.rows.map((row, i) => (
              <tr key={i} className="hover:bg-indigo-50/40 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-3 ${j === 0 ? 'text-left font-medium text-gray-800' : 'text-right text-gray-600 tabular-nums'}`}>
                    {j === 0 ? (
                      <span className="inline-flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shadow-sm ${
                          i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-indigo-600'
                        }`}>{i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</span>
                        {cell}
                      </span>
                    ) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Export PDF Professionnel ──────────────────────────────────────────────
function fmtCurrencyPDF(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + ' Mrd F CFA';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + ' M F CFA';
  return v.toLocaleString('fr-FR') + ' F CFA';
}

function fmtValPDF(v: number, fmt?: string): string {
  if (fmt === 'currency') return fmtCurrencyPDF(v);
  if (fmt === 'percent') return v.toFixed(1) + '%';
  return v.toLocaleString('fr-FR');
}

const PDF_COLORS = ['#4f46e5','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#ea580c','#0d9488','#475569'];

async function generatePDF(data: AnalyticsData, moduleLabel: string, periodLabel: string) {
  const html2pdf = (await import('html2pdf.js')).default;
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const refNum = `RAP-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

  // ── Build KPI section
  const kpiCards = data.kpis.map((k, i) => {
    const colors = ['#4f46e5','#059669','#d97706','#dc2626'];
    const c = colors[i % colors.length];
    const changeHtml = k.change !== undefined && k.change !== 0
      ? `<div style="margin-top:4px;font-size:10px;color:${k.change > 0 ? '#059669' : '#dc2626'};font-weight:600;">${k.change > 0 ? '▲' : '▼'} ${Math.abs(k.change)}% vs période préc.</div>`
      : '';
    return `<td style="width:25%;padding:8px;">
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;border-left:4px solid ${c};">
        <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${k.label}</div>
        <div style="font-size:22px;font-weight:800;color:#111827;margin-top:4px;line-height:1.2;">${fmtValPDF(k.value, k.format)}</div>
        ${changeHtml}
      </div>
    </td>`;
  }).join('');

  // ── Build Charts section (render as tables with visual bars)
  const chartsHtml = data.charts.map(chart => {
    if (chart.data.length === 0) return '';

    if (chart.type === 'donut') {
      const total = chart.data.reduce((s, d) => s + d.value, 0);
      if (total === 0) return '';
      const rows = chart.data.map((d, i) => {
        const pct = ((d.value / total) * 100).toFixed(1);
        const c = PDF_COLORS[i % PDF_COLORS.length];
        return `<tr>
          <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${c};margin-right:8px;vertical-align:middle;"></span>
            <span style="font-size:11px;color:#374151;">${d.label}</span>
          </td>
          <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:11px;font-weight:600;color:#111827;">${d.value.toLocaleString('fr-FR')}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:11px;color:#6b7280;">${pct}%</td>
          <td style="padding:5px 12px;border-bottom:1px solid #f3f4f6;width:120px;">
            <div style="background:#f3f4f6;border-radius:10px;height:8px;overflow:hidden;">
              <div style="background:${c};height:100%;border-radius:10px;width:${pct}%;"></div>
            </div>
          </td>
        </tr>`;
      }).join('');

      return `<div style="break-inside:avoid;margin-bottom:16px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:12px;font-weight:700;color:#1f2937;">◉ ${chart.title}</span>
          <span style="float:right;font-size:10px;color:#9ca3af;">Total: ${total.toLocaleString('fr-FR')}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#fafafa;">
            <th style="padding:5px 8px;text-align:left;font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Élément</th>
            <th style="padding:5px 8px;text-align:right;font-size:9px;color:#9ca3af;text-transform:uppercase;">Valeur</th>
            <th style="padding:5px 8px;text-align:right;font-size:9px;color:#9ca3af;text-transform:uppercase;">Part</th>
            <th style="padding:5px 8px;font-size:9px;color:#9ca3af;text-transform:uppercase;">Répartition</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }

    // Bar / line / dual-bar / horizontal-bar → render as horizontal bar table
    const maxVal = Math.max(...chart.data.map(d => Math.max(d.value, d.value2 || 0)), 1);
    const isDual = chart.type === 'dual-bar';

    const rows = chart.data.map((d) => {
      const pct1 = ((d.value / maxVal) * 100).toFixed(0);
      const pct2 = isDual ? (((d.value2 || 0) / maxVal) * 100).toFixed(0) : '0';
      const val1Fmt = d.value >= 10000 ? fmtCurrencyPDF(d.value) : d.value.toLocaleString('fr-FR');
      const val2Fmt = isDual ? (d.value2! >= 10000 ? fmtCurrencyPDF(d.value2!) : (d.value2 || 0).toLocaleString('fr-FR')) : '';
      const countStr = d.count ? ` (${d.count})` : '';

      const bar1 = `<div style="background:#e0e7ff;border-radius:6px;height:7px;overflow:hidden;margin-bottom:${isDual ? '2px' : '0'};">
        <div style="background:#4f46e5;height:100%;border-radius:6px;width:${pct1}%;"></div>
      </div>`;
      const bar2 = isDual ? `<div style="background:#fce7f3;border-radius:6px;height:7px;overflow:hidden;">
        <div style="background:#dc2626;height:100%;border-radius:6px;width:${pct2}%;"></div>
      </div>` : '';

      return `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #f3f4f6;font-size:11px;color:#374151;white-space:nowrap;width:80px;">${d.label}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #f3f4f6;font-size:11px;font-weight:600;color:#111827;text-align:right;white-space:nowrap;">${val1Fmt}${countStr}</td>
        ${isDual ? `<td style="padding:4px 8px;border-bottom:1px solid #f3f4f6;font-size:11px;font-weight:600;color:#dc2626;text-align:right;white-space:nowrap;">${val2Fmt}</td>` : ''}
        <td style="padding:4px 12px;border-bottom:1px solid #f3f4f6;width:160px;">${bar1}${bar2}</td>
      </tr>`;
    }).join('');

    const legendHtml = isDual && chart.legend
      ? `<span style="float:right;font-size:9px;"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#4f46e5;margin-right:3px;vertical-align:middle;"></span>${chart.legend[0]} <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#dc2626;margin:0 3px 0 8px;vertical-align:middle;"></span>${chart.legend[1]}</span>`
      : `<span style="float:right;font-size:10px;color:#9ca3af;">${chart.data.length} données</span>`;

    const typeIcon = chart.type === 'line' ? '📈' : chart.type === 'dual-bar' ? '📊' : '▊';

    return `<div style="break-inside:avoid;margin-bottom:16px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:12px;font-weight:700;color:#1f2937;">${typeIcon} ${chart.title}</span>
        ${legendHtml}
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#fafafa;">
          <th style="padding:4px 8px;text-align:left;font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Période</th>
          <th style="padding:4px 8px;text-align:right;font-size:9px;color:#9ca3af;text-transform:uppercase;">${isDual ? chart.legend?.[0] || 'Val. 1' : 'Valeur'}</th>
          ${isDual ? `<th style="padding:4px 8px;text-align:right;font-size:9px;color:#9ca3af;text-transform:uppercase;">${chart.legend?.[1] || 'Val. 2'}</th>` : ''}
          <th style="padding:4px 8px;font-size:9px;color:#9ca3af;text-transform:uppercase;">Graphique</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  // ── Build Tables section  
  const tablesHtml = data.tables.filter(t => t.rows.length > 0).map(table => {
    const thead = table.columns.map((col, i) =>
      `<th style="padding:6px 10px;text-align:${i === 0 ? 'left' : 'right'};font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;background:#f8fafc;border-bottom:2px solid #e5e7eb;">${col}</th>`
    ).join('');
    const tbody = table.rows.map((row, ri) => {
      const cells = row.map((cell, ci) =>
        `<td style="padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:11px;${ci === 0 ? 'font-weight:600;color:#1f2937;' : 'text-align:right;color:#374151;'}">
          ${ci === 0 ? `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${ri < 3 ? ['#fef3c7','#e5e7eb','#ffedd5'][ri] : '#eef2ff'};text-align:center;line-height:18px;font-size:9px;font-weight:700;margin-right:6px;color:${ri < 3 ? ['#92400e','#374151','#9a3412'][ri] : '#4338ca'};">${ri < 3 ? ['🥇','🥈','🥉'][ri] : ri + 1}</span>` : ''}${cell}
        </td>`
      ).join('');
      return `<tr style="background:${ri % 2 === 0 ? '#fff' : '#fafafa'};">${cells}</tr>`;
    }).join('');

    return `<div style="break-inside:avoid;margin-bottom:16px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
        <span style="font-size:12px;font-weight:700;color:#1f2937;">📋 ${table.title}</span>
        <span style="float:right;font-size:10px;color:#9ca3af;">${table.rows.length} entrées</span>
      </div>
      <table style="width:100%;border-collapse:collapse;"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    </div>`;
  }).join('');

  // ── Summary section
  const summaryHtml = data.summary ? `
    <div style="break-inside:avoid;margin-top:8px;padding:14px 18px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;border-left:4px solid #4f46e5;">
      <div style="font-size:11px;font-weight:700;color:#3730a3;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">📝 Synthèse du rapport</div>
      <div style="font-size:11px;color:#374151;line-height:1.6;">${data.summary}</div>
    </div>` : '';

  // ══ Assemble full document
  const html = `
  <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;background:#fff;padding:0;">
    <!-- ═══ EN-TÊTE ═══ -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #4f46e5;margin-bottom:20px;">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div style="width:40px;height:40px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:10px;display:flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-size:20px;font-weight:900;">AB</span>
          </div>
          <div>
            <div style="font-size:22px;font-weight:900;color:#1f2937;letter-spacing:-0.5px;">Rapport Analytics</div>
            <div style="font-size:13px;font-weight:600;color:#4f46e5;">${moduleLabel}</div>
          </div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#6b7280;">
          <div style="margin-bottom:2px;"><strong>Réf :</strong> ${refNum}</div>
          <div style="margin-bottom:2px;"><strong>Période :</strong> ${periodLabel}</div>
          <div style="margin-bottom:2px;"><strong>Généré :</strong> ${dateStr} à ${timeStr}</div>
          <div><strong>Par :</strong> Système Allo Béton</div>
        </div>
      </div>
    </div>

    <!-- ═══ INDICATEURS CLÉS ═══ -->
    <div style="margin-bottom:20px;">
      <div style="font-size:13px;font-weight:800;color:#1f2937;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;border-left:4px solid #4f46e5;padding-left:10px;">Indicateurs clés de performance</div>
      <table style="width:100%;border-collapse:collapse;"><tr>${kpiCards}</tr></table>
    </div>

    <!-- ═══ GRAPHIQUES & ANALYSES ═══ -->
    <div style="margin-bottom:16px;">
      <div style="font-size:13px;font-weight:800;color:#1f2937;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;border-left:4px solid #059669;padding-left:10px;">Analyses détaillées</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${chartsHtml}</div>
    </div>

    <!-- ═══ TABLEAUX ═══ -->
    ${tablesHtml ? `<div style="margin-bottom:16px;">
      <div style="font-size:13px;font-weight:800;color:#1f2937;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;border-left:4px solid #d97706;padding-left:10px;">Classements & Détails</div>
      ${tablesHtml}
    </div>` : ''}

    <!-- ═══ SYNTHÈSE ═══ -->
    ${summaryHtml}

    <!-- ═══ PIED DE PAGE ═══ -->
    <div style="margin-top:24px;padding-top:12px;border-top:2px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:12px;font-weight:700;color:#4f46e5;">Allo Béton</div>
        <div style="font-size:9px;color:#9ca3af;">Système de Gestion Intégré • Dakar, Sénégal</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:8px;color:#9ca3af;">Document généré automatiquement</div>
        <div style="font-size:8px;color:#9ca3af;">Ce rapport est strictement confidentiel</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;color:#9ca3af;">${dateStr}</div>
        <div style="font-size:9px;color:#9ca3af;">Réf: ${refNum}</div>
      </div>
    </div>
  </div>`;

  const container = document.createElement('div');
  container.innerHTML = html;

  await html2pdf().set({
    margin: [10, 10, 12, 10],
    filename: `rapport_analytics_${moduleLabel.toLowerCase().replace(/[^a-z0-9àâéèêëïôùûüçñ]/g, '_')}_${now.toISOString().slice(0, 10)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  } as any).from(container).save();
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export const ModuleAnalytics: React.FC<ModuleAnalyticsProps> = ({ module, title }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('12m');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [exporting, setExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const moduleLabel = MODULE_LABELS[module] || module;

  const getPeriodLabel = useCallback((): string => {
    if (period === 'custom' && dateFrom && dateTo) {
      const f = new Date(dateFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
      const t = new Date(dateTo).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
      return `Du ${f} au ${t}`;
    }
    return `Derniers ${PERIODS.find(p => p.key === period)?.label || '12 mois'}`;
  }, [period, dateFrom, dateTo]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({ period });
      if (period === 'custom' && dateFrom) params.set('from', dateFrom);
      if (period === 'custom' && dateTo) params.set('to', dateTo);

      const res = await fetch(`${API_BASE}/analytics/${module}?${params}`, {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error('Erreur serveur');
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    }
    setLoading(false);
  }, [module, period, dateFrom, dateTo]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const handleExportPDF = async () => {
    if (!data || exporting) return;
    setExporting(true);
    try { await generatePDF(data, moduleLabel, getPeriodLabel()); }
    catch (e) { console.error('PDF export error:', e); }
    setExporting(false);
  };

  const handlePeriod = (k: PeriodKey) => {
    if (k === 'custom') { setShowCustom(true); setPeriod('custom'); }
    else { setShowCustom(false); setPeriod(k); }
  };

  // Loading
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-100 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin" />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-500">Chargement des analytics...</p>
    </div>
  );

  // Error
  if (error) return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">Impossible de charger les données</p>
      <p className="text-xs text-gray-400 mb-4">{error}</p>
      <button onClick={fetchAnalytics} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200">Réessayer</button>
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-6" ref={contentRef}>
      {/* ═══ Header ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">{title || `Rapport & Analytics — ${moduleLabel}`}</h2>
              <p className="text-xs text-gray-400 font-medium">{getPeriodLabel()} • Données en temps réel</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap" data-no-pdf>
            {/* Période */}
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => handlePeriod(p.key)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1 ${
                    period === p.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {p.key === 'custom' && <Calendar className="w-3 h-3" />}{p.label}
                </button>
              ))}
            </div>

            <button onClick={() => window.print()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Imprimer">
              <Printer className="w-4 h-4" />
            </button>

            <button onClick={handleExportPDF} disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 disabled:opacity-50">
              {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {exporting ? 'Génération...' : 'Export PDF'}
            </button>

            <button onClick={fetchAnalytics} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Actualiser">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom Date Picker */}
        {showCustom && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Date début</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Date fin</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <button onClick={() => { if (dateFrom && dateTo) fetchAnalytics(); }} disabled={!dateFrom || !dateTo}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Appliquer
            </button>
            <button onClick={() => { setShowCustom(false); setPeriod('12m'); }} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ═══ KPIs ═══ */}
      {data.kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.kpis.map((kpi, i) => <KPICard key={i} kpi={kpi} index={i} />)}
        </div>
      )}

      {/* ═══ Charts ═══ */}
      {data.charts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.charts.map((chart, i) => {
            switch (chart.type) {
              case 'bar': return <BarChart key={i} chart={chart} />;
              case 'horizontal-bar': return <HorizontalBarChart key={i} chart={chart} />;
              case 'dual-bar': return <DualBarChart key={i} chart={chart} />;
              case 'line': return <LineChart key={i} chart={chart} />;
              case 'donut': return <DonutChart key={i} chart={chart} />;
              default: return null;
            }
          })}
        </div>
      )}

      {/* ═══ Tables ═══ */}
      {data.tables.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.tables.map((table, i) => <DataTable key={i} table={table} />)}
        </div>
      )}

      {/* ═══ Résumé ═══ */}
      {data.summary && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg"><FileText className="w-4 h-4 text-indigo-600" /></div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">Résumé du rapport</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{data.summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleAnalytics;
