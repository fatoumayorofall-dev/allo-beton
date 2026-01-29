import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, CreditCard, DollarSign, Calendar, Eye, Trash2 } from 'lucide-react';
import { getPayments } from '../../services/supabase';

interface PaymentsListProps {
  onCreatePayment: () => void;
}

export const PaymentsList: React.FC<PaymentsListProps> = ({ onCreatePayment }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPayments();
    
    // Écouter les changements de données
    const handleRefresh = () => {
      loadPayments();
    };
    
    window.addEventListener('refreshData', handleRefresh);
    window.addEventListener('paymentCreated', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshData', handleRefresh);
      window.removeEventListener('paymentCreated', handleRefresh);
    };
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const result = await getPayments();
      if (result.success) {
        setPayments(result.data || []);
      } else {
        console.error('Erreur récupération paiements:', result.error);
        setPayments([]);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filter !== 'all' && payment.method !== filter && payment.payment_method !== filter) {
      return false;
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        payment.payment_number?.toLowerCase().includes(term) ||
        payment.customer_name?.toLowerCase().includes(term) ||
        payment.reference?.toLowerCase().includes(term) ||
        payment.reference_number?.toLowerCase().includes(term) ||
        payment.sale_number?.toLowerCase().includes(term)
      );
    }
    
    return true;
  });


  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'cash': return <DollarSign className="w-4 h-4" />;
      case 'transfer': return <Calendar className="w-4 h-4" />;
      case 'check': return <Calendar className="w-4 h-4" />;
      case 'mobile': return <DollarSign className="w-4 h-4" />;
      case 'bank_transfer': return <Calendar className="w-4 h-4" />;
      case 'online': return <DollarSign className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case 'card': return 'Carte bancaire';
      case 'cash': return 'Espèces';
      case 'transfer': return 'Virement';
      case 'bank_transfer': return 'Virement bancaire';
      case 'check': return 'Chèque';
      case 'mobile': return 'Mobile Money';
      case 'online': return 'Paiement en ligne';
      default: return method;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'refunded':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Complété';
      case 'pending': return 'En attente';
      case 'failed': return 'Échoué';
      case 'refunded': return 'Remboursé';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0';
    return value.toLocaleString('fr-FR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  // Calculate totals - utiliser les paiements non filtrés pour les statistiques globales
  const totalAmount = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  const completedPayments = filteredPayments.filter(p => p.status === 'completed').length;
  const filteredTotal = filteredPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Paiements</h1>
          <p className="text-gray-600">Suivez vos encaissements et créances</p>
        </div>
        
        <button 
          onClick={onCreatePayment}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Paiement</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Encaissements Complétés</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalAmount)}
              </p>
              <p className="text-xs text-gray-500 mt-1">FCFA</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                {filter !== 'all' ? 'Paiements Filtrés' : 'Nombre de Paiements'}
              </p>
              <p className="text-2xl font-bold text-blue-600">{filteredPayments.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {filter !== 'all' ? 'Résultats' : 'Total'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Montant Filtré</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(filteredPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0))}
              </p>
              <p className="text-xs text-gray-500 mt-1">FCFA</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher par numéro, client, référence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border-0 focus:ring-0 bg-transparent text-sm"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Toutes les méthodes</option>
          <option value="cash">Espèces</option>
          <option value="card">Carte bancaire</option>
          <option value="transfer">Virement</option>
          <option value="bank_transfer">Virement bancaire</option>
          <option value="check">Chèque</option>
          <option value="mobile">Mobile Money</option>
          <option value="online">Paiement en ligne</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Numéro de Paiement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Méthode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-gray-600" colSpan={8}>
                    Chargement...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-gray-600" colSpan={8}>
                    Aucun paiement à afficher.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment: any) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.payment_number}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.sale_number || '—'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.customer_name || '—'}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {(payment.amount || 0).toLocaleString()} FCFA
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getMethodIcon(payment.method || payment.payment_method)}
                        <span className="text-sm text-gray-600">
                          {getMethodText(payment.method || payment.payment_method)}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(payment.status || 'pending')}`}>
                        {getStatusText(payment.status || 'pending')}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.date || payment.created_at || payment.payment_date
                        ? new Date(payment.date || payment.created_at || payment.payment_date).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                          title="Supprimer"
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