import React, { useState, useMemo } from 'react';
import {
  Truck, Search, Plus, Eye, Edit2, Printer,
  Package, Calendar, MapPin, User, FileText,
  ChevronLeft, ChevronRight, ArrowRight, BarChart3
} from 'lucide-react';
import { ModuleAnalytics } from '../Analytics/ModuleAnalytics';
import { DeliveryNote } from '../../types';
import { useDataContext } from '../../contexts/DataContext';
import { deliveryNotesAPI } from '../../services/mysql-api';

interface DeliveryNotesListProps {
  onNewDeliveryNote: () => void;
  onEditDeliveryNote: (note: DeliveryNote) => void;
  onViewDeliveryNote: (note: DeliveryNote) => void;
}

export const DeliveryNotesList: React.FC<DeliveryNotesListProps> = ({
  onNewDeliveryNote,
  onEditDeliveryNote,
  onViewDeliveryNote
}) => {
  const { customers } = useDataContext();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  React.useEffect(() => {
    const loadDeliveryNotes = async () => {
      setLoading(true);
      try {
        const response = await deliveryNotesAPI.getAll();
        if (response?.success && Array.isArray(response.data)) {
          setDeliveryNotes(response.data);
        }
      } catch (error) {
        console.error('Erreur chargement bons de transport:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDeliveryNotes();
  }, []);

  const getCustomerName = (customerId: string | number): string => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || customer?.company || 'Client inconnu';
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { dot: string; label: string }> = {
      pending: { dot: 'bg-yellow-500', label: 'En attente' },
      in_transit: { dot: 'bg-orange-500', label: 'En transit' },
      delivered: { dot: 'bg-emerald-500', label: 'Livré' },
      cancelled: { dot: 'bg-red-500', label: 'Annulé' },
    };
    return config[status] || { dot: 'bg-gray-400', label: status };
  };

  const stats = useMemo(() => {
    return {
      total: deliveryNotes.length,
      pending: deliveryNotes.filter(n => n.status === 'pending').length,
      inTransit: deliveryNotes.filter(n => n.status === 'in_transit').length,
      delivered: deliveryNotes.filter(n => n.status === 'delivered').length,
      totalTonnage: deliveryNotes.reduce((sum, n) => sum + (Number(n.weight_tons) || 0), 0)
    };
  }, [deliveryNotes]);

  const filteredNotes = useMemo(() => {
    let result = deliveryNotes;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(note =>
        (note.delivery_number || '').toLowerCase().includes(term) ||
        (note.driver_name || '').toLowerCase().includes(term) ||
        (note.vehicle_plate || '').toLowerCase().includes(term) ||
        (note.product_type || '').toLowerCase().includes(term) ||
        getCustomerName(note.customer_id || '').toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(note => note.status === statusFilter);
    }
    return result;
  }, [deliveryNotes, searchTerm, statusFilter, customers]);

  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const paginatedNotes = filteredNotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  /* ── KPI config ── */
  const kpis = [
    { label: 'Total Bons', value: stats.total.toString(), icon: FileText, fill: 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40', border: 'border-l-emerald-400', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', ring: 'border-emerald-200/50', valClr: 'text-gray-900' },
    { label: 'Tonnage Total', value: `${stats.totalTonnage.toFixed(1)} T`, icon: Package, fill: 'bg-gradient-to-br from-teal-50/70 to-cyan-50/40', border: 'border-l-teal-400', iconBg: 'bg-teal-100', iconClr: 'text-teal-600', ring: 'border-teal-200/50', valClr: 'text-teal-700' },
    { label: 'En attente', value: stats.pending.toString(), icon: Calendar, fill: 'bg-gradient-to-br from-amber-50/70 to-yellow-50/40', border: 'border-l-amber-400', iconBg: 'bg-amber-100', iconClr: 'text-amber-600', ring: 'border-amber-200/50', valClr: 'text-amber-700' },
    { label: 'En transit', value: stats.inTransit.toString(), icon: Truck, fill: 'bg-gradient-to-br from-orange-50/70 to-indigo-50/40', border: 'border-l-orange-400', iconBg: 'bg-orange-100', iconClr: 'text-orange-600', ring: 'border-orange-200/50', valClr: 'text-orange-700' },
    { label: 'Livrés', value: stats.delivered.toString(), icon: Package, fill: 'bg-gradient-to-br from-emerald-50/70 to-green-50/40', border: 'border-l-emerald-400', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', ring: 'border-emerald-200/50', valClr: 'text-emerald-700' },
  ];

  const filterBtns = [
    { value: 'all', label: 'Tous', active: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/30' },
    { value: 'pending', label: 'En attente', active: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md shadow-amber-200/30' },
    { value: 'in_transit', label: 'En transit', active: 'bg-gradient-to-r from-orange-500 to-indigo-500 text-white shadow-md shadow-orange-200/30' },
    { value: 'delivered', label: 'Livrés', active: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-200/30' },
    { value: 'cancelled', label: 'Annulés', active: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md shadow-red-200/30' },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(16,185,129,0.08)] p-5 overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 absolute top-0 left-0" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200/40">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bons de Transport</h1>
              <p className="text-sm text-gray-400 mt-0.5">Suivi des livraisons et mouvements</p>
            </div>
          </div>
          <button
            onClick={onNewDeliveryNote}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/30"
          >
            <Plus className="w-4 h-4" />Nouveau Bon
          </button>
          <button onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-all shadow-sm ${showAnalytics ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-gray-200/80 text-gray-600 hover:bg-gray-50'}`}>
            <BarChart3 className="w-4 h-4" />{showAnalytics ? 'Liste' : 'Analytics'}
          </button>
        </div>
      </div>

      {showAnalytics ? (
        <ModuleAnalytics module="transport" title="Analytics Transport" />
      ) : (
      <>
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
              placeholder="Rechercher par n° bon, chauffeur, véhicule, produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-800 bg-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-300 hover:border-gray-300 transition-all shadow-sm shadow-gray-100/50"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {filterBtns.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === f.value ? f.active : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {paginatedNotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Aucun bon de transport</h3>
          <p className="text-sm text-gray-400 mb-5">
            {searchTerm || statusFilter !== 'all'
              ? 'Aucun bon ne correspond à vos critères'
              : 'Créez votre premier bon de transport'}
          </p>
          <button
            onClick={onNewDeliveryNote}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold shadow-md shadow-emerald-200/30"
          >
            <Plus className="w-5 h-5" />Créer un bon
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-br from-gray-50/80 to-slate-50/40 border-b border-gray-100/80">
                <tr>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">N° Bon</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Chauffeur</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Véhicule</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Trajet</th>
                  <th className="px-6 py-3.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tonnage</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedNotes.map((note) => {
                  const statusConfig = getStatusConfig(note.status);
                  const customerName = getCustomerName(note.customer_id || '');
                  return (
                    <tr key={note.id} className="hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-teal-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-emerald-600 text-sm">{note.delivery_number}</span>
                        {note.product_type && (
                          <p className="text-[10px] text-gray-400">{note.product_type}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-3.5 h-3.5 text-gray-300" />
                          {formatDate(note.delivery_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-emerald-200/40">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{customerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-300" />
                          <span className="text-sm text-gray-700">{note.driver_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-gray-300" />
                          <span className="text-sm font-medium text-gray-700">{note.vehicle_plate || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <MapPin className="w-3 h-3 text-emerald-500" />
                          <span className="text-gray-600 truncate max-w-[70px]">{note.loading_location || '-'}</span>
                          <ArrowRight className="w-3 h-3 text-gray-300" />
                          <MapPin className="w-3 h-3 text-teal-500" />
                          <span className="text-gray-600 truncate max-w-[70px]">{note.delivery_location || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-gray-900">
                          {Number(note.weight_tons || 0).toFixed(1)} T
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200/60">
                          <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></span>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onViewDeliveryNote(note)}
                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditDeliveryNote(note)}
                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onViewDeliveryNote(note)}
                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50/50 to-slate-50/30 border-t border-gray-100/80">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{((currentPage - 1) * itemsPerPage) + 1}</span>–<span className="font-semibold text-gray-700">{Math.min(currentPage * itemsPerPage, filteredNotes.length)}</span> sur <span className="font-semibold text-gray-700">{filteredNotes.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/30'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </>)}
    </div>
  );
};
