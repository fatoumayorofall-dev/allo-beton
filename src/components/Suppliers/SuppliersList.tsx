import React, { useMemo, useState } from 'react';
import {
  Plus, Search, Phone, Mail, Eye, Edit,
  Truck, MapPin, Star, Package, Users, TrendingUp, Zap, Building2, Award, Filter, BarChart3
} from 'lucide-react';
import { ModuleAnalytics } from '../Analytics/ModuleAnalytics';
import { Supplier } from '../../types';
import { useDataContext } from '../../contexts/DataContext';

interface SuppliersListProps {
  onCreateSupplier: () => void;
  onViewSupplier: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
}

export const SuppliersList: React.FC<SuppliersListProps> = ({
  onCreateSupplier,
  onViewSupplier,
  onEditSupplier
}) => {
  const { suppliers = [] } = useDataContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'top'>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const safeSuppliers = useMemo(() => Array.isArray(suppliers) ? suppliers : [], [suppliers]);

  const stats = useMemo(() => {
    const totalSuppliers = safeSuppliers.length;
    const totalOrders = safeSuppliers.reduce((sum, s) => sum + (s.totalOrders || 0), 0);
    const avgRating = safeSuppliers.length > 0
      ? safeSuppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / safeSuppliers.length
      : 0;
    const topSuppliers = safeSuppliers.filter(s => (s.rating || 0) >= 4).length;
    return { totalSuppliers, totalOrders, avgRating, topSuppliers };
  }, [safeSuppliers]);

  const filteredSuppliers = useMemo(() => {
    let result = safeSuppliers;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(supplier =>
        (supplier.name || '').toLowerCase().includes(term) ||
        (supplier.contact_person?.toLowerCase().includes(term) ?? false) ||
        (supplier.email?.toLowerCase().includes(term) ?? false) ||
        (supplier.productsSupplied?.some(product =>
          product.toLowerCase().includes(term)
        ) ?? false)
      );
    }
    if (filterType === 'top') {
      result = result.filter(s => (s.rating || 0) >= 4);
    }
    return result;
  }, [safeSuppliers, searchTerm, filterType]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-3 h-3 ${
          index < Math.floor(rating)
            ? 'text-amber-400 fill-amber-400'
            : index < rating
            ? 'text-amber-400 fill-amber-400 opacity-50'
            : 'text-gray-200'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(20,184,166,0.08)] p-5 overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400 absolute top-0 left-0" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-200/40">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Fournisseurs</h1>
              <p className="text-sm text-gray-400 mt-0.5">Partenaires & approvisionnements</p>
            </div>
          </div>
          <button
            onClick={onCreateSupplier}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl text-sm font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-md shadow-teal-200/30"
          >
            <Plus className="w-4 h-4" />Nouveau Fournisseur
          </button>
          <button onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all shadow-sm ${showAnalytics ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-gray-200/80 text-gray-600 hover:bg-gray-50'}`}>
            <BarChart3 className="w-4 h-4" />{showAnalytics ? 'Liste' : 'Analytics'}
          </button>
        </div>
      </div>

      {showAnalytics ? (
        <ModuleAnalytics module="suppliers" title="Analytics Fournisseurs" />
      ) : (
      <>
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Fournisseurs', value: stats.totalSuppliers.toString(), icon: Users, fill: 'bg-gradient-to-br from-teal-50/70 to-cyan-50/40', border: 'border-l-teal-400', iconBg: 'bg-teal-100', iconClr: 'text-teal-600', ring: 'border-teal-200/50', valClr: 'text-gray-900' },
          { label: 'Commandes', value: stats.totalOrders.toString(), icon: Package, fill: 'bg-gradient-to-br from-orange-50/70 to-indigo-50/40', border: 'border-l-orange-400', iconBg: 'bg-orange-100', iconClr: 'text-orange-600', ring: 'border-orange-200/50', valClr: 'text-orange-700' },
          { label: 'Note Moyenne', value: stats.avgRating.toFixed(1), icon: Star, fill: 'bg-gradient-to-br from-amber-50/70 to-yellow-50/40', border: 'border-l-amber-400', iconBg: 'bg-amber-100', iconClr: 'text-amber-600', ring: 'border-amber-200/50', valClr: 'text-amber-700' },
          { label: 'Top Fournisseurs', value: stats.topSuppliers.toString(), icon: Award, fill: 'bg-gradient-to-br from-emerald-50/70 to-green-50/40', border: 'border-l-emerald-400', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', ring: 'border-emerald-200/50', valClr: 'text-emerald-700' },
        ].map((k, i) => {
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
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-800 bg-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400/25 focus:border-teal-300 hover:border-gray-300 transition-all shadow-sm shadow-gray-100/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-200/30'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200/60'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Tous ({safeSuppliers.length})
            </button>
            <button
              onClick={() => setFilterType('top')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterType === 'top'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/30'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200/60'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Top ({stats.topSuppliers})
            </button>
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-teal-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Aucun fournisseur trouvé</h3>
          <p className="text-sm text-gray-400 mb-5">
            {searchTerm ? "Aucun résultat" : "Ajoutez votre premier fournisseur"}
          </p>
          <button
            onClick={onCreateSupplier}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-teal-200/30"
          >
            <Plus className="w-4 h-4" />Ajouter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => {
            const rating = Number(supplier.rating) || 0;
            const isTop = rating >= 4;

            return (
              <div
                key={supplier.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-lg group ${
                  isTop ? 'border-amber-200/60 bg-gradient-to-br from-amber-50/20 to-white shadow-sm' : 'border-gray-100/80 shadow-sm'
                }`}
              >
                {/* Gradient accent */}
                <div className={`h-1 w-full ${isTop ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400' : 'bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400'}`} />

                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${
                        isTop
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200/40'
                          : 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-200/40'
                      }`}>
                        {supplier.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{supplier.name}</h3>
                        {supplier.contact_person && (
                          <p className="text-[11px] text-gray-400">{supplier.contact_person}</p>
                        )}
                      </div>
                    </div>
                    {isTop && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200/50">
                        <Award className="w-3 h-3" />
                        TOP
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 mt-2.5">
                    {renderStars(rating)}
                    <span className="ml-1.5 text-[11px] font-medium text-gray-400">({rating.toFixed(1)})</span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="px-4 pb-3 space-y-1.5">
                  {supplier.email && (
                    <div className="flex items-center gap-2.5 text-[11px] text-gray-500">
                      <Mail className="w-3.5 h-3.5 text-gray-300" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2.5 text-[11px] text-gray-500">
                      <Phone className="w-3.5 h-3.5 text-gray-300" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2.5 text-[11px] text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-gray-300" />
                      <span className="truncate">{supplier.address}</span>
                    </div>
                  )}
                </div>

                {/* Products & Orders */}
                <div className="px-4 pb-3 border-t border-gray-50 pt-3">
                  {supplier.productsSupplied && supplier.productsSupplied.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {supplier.productsSupplied.slice(0, 3).map((product, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 text-[10px] rounded-lg font-medium border border-teal-200/40"
                        >
                          {product}
                        </span>
                      ))}
                      {supplier.productsSupplied.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] rounded-lg border border-gray-200/40">
                          +{supplier.productsSupplied.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Package className="w-3.5 h-3.5" />
                    {supplier.totalOrders || 0} commandes
                  </div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-gray-100/80">
                  <button
                    onClick={() => onViewSupplier(supplier)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-all rounded-bl-2xl"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">Voir</span>
                  </button>
                  <div className="w-px bg-gray-100/80"></div>
                  <button
                    onClick={() => onEditSupplier(supplier)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-gray-400 hover:bg-cyan-50 hover:text-cyan-600 transition-all rounded-br-2xl"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">Modifier</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>)}
    </div>
  );
};
