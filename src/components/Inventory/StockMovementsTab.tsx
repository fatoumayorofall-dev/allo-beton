import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpRight, ArrowDownRight, Settings2, Search, Calendar,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  TrendingUp, TrendingDown, RefreshCw, Clock, Filter, Package
} from 'lucide-react';
import { StockMovement } from '../../types';
import { productsAPI } from '../../services/mysql-api';

const ITEMS_PER_PAGE = 25;

interface MovementStats {
  total_in: number;
  total_out: number;
  total_adjustment: number;
  total_movements: number;
  total_cost_in: number;
}

export const StockMovementsTab: React.FC = () => {
  const [movements, setMovements] = useState<(StockMovement & { product_unit?: string; product_type?: string; variant?: string })[]>([]);
  const [stats, setStats] = useState<MovementStats>({ total_in: 0, total_out: 0, total_adjustment: 0, total_movements: 0, total_cost_in: 0 });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  const getDateRange = (period: string) => {
    const now = new Date();
    if (period === 'today') {
      return { from: now.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    }
    if (period === '7d') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      return { from: d.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    }
    if (period === '30d') {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      return { from: d.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    }
    return {};
  };

  const loadMovements = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
      };
      if (typeFilter !== 'all') params.type = typeFilter;
      if (searchTerm) params.search = searchTerm;
      const range = getDateRange(periodFilter);
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;

      const result = await productsAPI.getAllMovements(params);
      if (result.success) {
        setMovements(result.data.movements || []);
        setTotal(result.data.total || 0);
        if (result.data.stats) setStats(result.data.stats);
      }
    } catch (e) {
      console.error('Erreur chargement mouvements:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [currentPage, typeFilter, periodFilter]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1);
      loadMovements();
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const formatMoney = (v: number) => v.toLocaleString('fr-FR') + ' FCFA';
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const kpis = [
    {
      label: 'Entrées', value: Number(stats.total_in || 0).toLocaleString('fr-FR'), sub: 'Réapprovisionnements',
      icon: TrendingUp, fill: 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40', border: 'border-l-emerald-400',
      iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', ring: 'border-emerald-200/50', valClr: 'text-emerald-700'
    },
    {
      label: 'Sorties', value: Number(stats.total_out || 0).toLocaleString('fr-FR'), sub: 'Ventes & déductions',
      icon: TrendingDown, fill: 'bg-gradient-to-br from-red-50/70 to-rose-50/40', border: 'border-l-red-400',
      iconBg: 'bg-red-100', iconClr: 'text-red-600', ring: 'border-red-200/50', valClr: 'text-red-700'
    },
    {
      label: 'Ajustements', value: Number(stats.total_adjustment || 0).toLocaleString('fr-FR'), sub: 'Corrections manuelles',
      icon: Settings2, fill: 'bg-gradient-to-br from-amber-50/70 to-yellow-50/40', border: 'border-l-amber-400',
      iconBg: 'bg-amber-100', iconClr: 'text-amber-600', ring: 'border-amber-200/50', valClr: 'text-amber-700'
    },
    {
      label: 'Coût Entrées', value: formatMoney(Number(stats.total_cost_in || 0)), sub: `${Number(stats.total_movements || 0)} mouvements`,
      icon: Package, fill: 'bg-gradient-to-br from-violet-50/70 to-purple-50/40', border: 'border-l-violet-400',
      iconBg: 'bg-violet-100', iconClr: 'text-violet-600', ring: 'border-violet-200/50', valClr: 'text-violet-700'
    },
  ];

  const typeFilterBtns = [
    { value: 'all', label: 'Tous', active: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200/30' },
    { value: 'in', label: 'Entrées', active: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/30' },
    { value: 'out', label: 'Sorties', active: 'bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-md shadow-red-200/30' },
    { value: 'adjustment', label: 'Ajustements', active: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200/30' },
  ];

  const periodBtns = [
    { value: 'all', label: 'Tout' },
    { value: 'today', label: "Aujourd'hui" },
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`rounded-xl ${kpi.fill} border-l-4 ${kpi.border} border ${kpi.ring} p-4 shadow-sm hover:shadow-md transition-all duration-200`}>
              <div className="flex items-start justify-between mb-2">
                <div className={`w-10 h-10 ${kpi.iconBg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.iconClr}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${kpi.valClr} leading-tight`}>{kpi.value}</p>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1">{kpi.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100/80 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par produit, fournisseur, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-800 bg-white/80 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/25 focus:border-violet-300 hover:border-gray-300 transition-all shadow-sm shadow-gray-100/50"
            />
          </div>
          <button onClick={loadMovements} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200/80 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
            <RefreshCw className="w-4 h-4" />Actualiser
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
            {typeFilterBtns.map(btn => (
              <button
                key={btn.value}
                onClick={() => { setTypeFilter(btn.value); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  typeFilter === btn.value ? btn.active : 'bg-gray-50 text-gray-500 border border-gray-200/60 hover:bg-gray-100'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1" />
            {periodBtns.map(btn => (
              <button
                key={btn.value}
                onClick={() => { setPeriodFilter(btn.value); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  periodFilter === btn.value ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200/30' : 'bg-gray-50 text-gray-500 border border-gray-200/60 hover:bg-gray-100'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto flex items-center">
            <span className="px-3 py-1.5 bg-violet-50/60 border border-violet-200/50 rounded-xl text-sm font-bold text-violet-700">
              {total} mouvement(s)
            </span>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(139,92,246,0.06)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg flex items-center justify-center border border-violet-200/40">
              <Clock className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Mouvements de Stock</h3>
              <p className="text-[11px] text-gray-400">Historique complet des entrées, sorties et ajustements</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-violet-100 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-4">Chargement des mouvements...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl flex items-center justify-center ring-1 ring-violet-100/50">
              <Clock className="w-7 h-7 text-violet-400" />
            </div>
            <h4 className="text-sm font-bold text-gray-700 mt-4">Aucun mouvement de stock</h4>
            <p className="text-xs text-gray-400 mt-1">Les mouvements apparaîtront lorsque du stock sera ajouté ou retiré</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200/60">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Produit</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Quantité</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fournisseur</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Coût Unit.</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {movements.map((m) => {
                    const isIn = m.movement_type === 'in';
                    const isAdj = m.movement_type === 'adjustment';
                    return (
                      <tr key={m.id} className={`hover:bg-gray-50/60 transition-colors ${isIn ? 'border-l-[3px] border-l-emerald-300' : isAdj ? 'border-l-[3px] border-l-amber-300' : 'border-l-[3px] border-l-red-300'}`}>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600 font-medium">{formatDate(m.created_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isIn ? 'bg-emerald-50' : isAdj ? 'bg-amber-50' : 'bg-red-50'}`}>
                              {isIn ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> : isAdj ? <Settings2 className="w-3.5 h-3.5 text-amber-600" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-gray-800 text-xs block truncate">{m.product_name || 'Produit supprimé'}</span>
                              {(m as any).product_type && (
                                <span className="text-[10px] text-gray-400">
                                  {(m as any).product_type === 'beton' ? 'Béton' : (m as any).product_type === 'carriere' ? 'Carrière' : 'Autre'}
                                  {(m as any).variant ? ` · ${(m as any).variant}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                            isIn ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                            isAdj ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                            'bg-red-50 text-red-700 border-red-200/60'
                          }`}>
                            {isIn ? 'Entrée' : isAdj ? 'Ajustement' : 'Sortie'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${isIn ? 'text-emerald-600' : isAdj ? 'text-amber-600' : 'text-red-600'}`}>
                            {isIn ? '+' : isAdj ? '±' : '-'}{m.quantity}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1">{(m as any).product_unit || 'm³'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {m.previous_stock != null && m.new_stock != null ? (
                            <span className="text-[11px] text-gray-500 font-medium">
                              {m.previous_stock} <span className="text-gray-300">→</span> {m.new_stock}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">{m.supplier_name || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {m.unit_cost ? (
                            <span className="text-xs font-medium text-gray-700">{Number(m.unit_cost).toLocaleString('fr-FR')}</span>
                          ) : (
                            <span className="text-[10px] text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500 truncate block max-w-[150px]">{m.notes || m.reference_number || '-'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50/50 to-slate-50/30 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <strong>{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, total)}-{Math.min(currentPage * ITEMS_PER_PAGE, total)}</strong> sur <strong>{total}</strong>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-all">
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1.5 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200/50 rounded-lg">
                    {currentPage} / {totalPages}
                  </span>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-all">
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
