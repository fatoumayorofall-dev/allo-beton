import React, { useMemo, useState } from 'react';
import { Plus, Eye, Edit, Trash2, Filter } from 'lucide-react';
import { Sale } from '../../types';
import { useDataContext } from '../../contexts/DataContext';
import { salesAPI } from '../../services/mysql-api';

interface SalesListProps {
  onCreateSale: () => void;
  onViewSale: (sale: Sale) => void;
  onEditSale?: (sale: Sale) => void; // optionnel si vous n’avez pas encore l’écran modifier
}

export const SalesList: React.FC<SalesListProps> = ({ onCreateSale, onViewSale, onEditSale }) => {
  const { sales, loading, refreshSales } = useDataContext();
  const [filter, setFilter] = useState<string>('all');

  const filteredSales = useMemo(() => {
    return (sales || []).filter((sale: any) => {
      if (filter === 'all') return true;
      return (sale.status || '').toString() === filter;
    });
  }, [sales, filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'confirmed':
        return 'Confirmée';
      case 'delivered':
        return 'Livrée';
      case 'paid':
        return 'Payée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status || '—';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-orange-100 text-orange-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'partial':
        return 'Partiel';
      case 'paid':
        return 'Payé';
      default:
        return status || '—';
    }
  };

  const formatMoney = (value: any) => {
    const n = Number(value ?? 0);
    if (Number.isNaN(n)) return '0 FCFA';
    return `${n.toLocaleString('fr-FR')} FCFA`;
  };

  const handleEdit = (sale: Sale) => {
    if (!onEditSale) return;
    onEditSale(sale);
  };

  const handleDelete = async (sale: any) => {
    const ok = window.confirm(
      `Voulez-vous vraiment annuler/supprimer cette vente ?\n\nVente: ${sale.sale_number || sale.id}`
    );
    if (!ok) return;

    try {
      // Beaucoup de backends ne font pas DELETE; on annule via update.
      await salesAPI.update(sale.id, { status: 'cancelled' });
      await refreshSales();
      alert('Vente annulée avec succès.');
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Erreur lors de la suppression/annulation.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Ventes</h1>
          <p className="text-gray-600">Gérez vos commandes et devis</p>
        </div>

        <button
          onClick={onCreateSale}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Vente</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <Filter className="w-4 h-4 text-gray-500" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tous les statuts</option>
          <option value="draft">Brouillons</option>
          <option value="confirmed">Confirmées</option>
          <option value="delivered">Livrées</option>
          <option value="paid">Payées</option>
          <option value="cancelled">Annulées</option>
        </select>

        <div className="ml-auto text-sm text-gray-600">
          {filteredSales.length} vente(s)
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commande
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paiement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-gray-600" colSpan={7}>
                    Chargement...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-gray-600" colSpan={7}>
                    Aucune vente à afficher.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{sale.sale_number || sale.id}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(sale.items?.length ?? sale.total_items ?? 0)} article(s)
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {sale.customerName || sale.customer_name || sale.customer?.name || '—'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.createdAt || sale.created_at
                        ? new Date(sale.createdAt || sale.created_at).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatMoney(sale.total ?? sale.total_amount ?? sale.amount)}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          sale.status
                        )}`}
                      >
                        {getStatusText(sale.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(
                          sale.paymentStatus || sale.payment_status || 'pending'
                        )}`}
                      >
                        {getPaymentStatusText(sale.paymentStatus || sale.payment_status || 'pending')}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onViewSale(sale)}
                          className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleEdit(sale)}
                          className={`transition-colors duration-200 ${
                            onEditSale ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 cursor-not-allowed'
                          }`}
                          disabled={!onEditSale}
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(sale)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                          title="Annuler/Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
