import React, { useState, useEffect } from 'react';
import { X, Download, Eye, FileText, Calendar, DollarSign, Package } from 'lucide-react';
import { purchaseOrdersAPI } from '../../services/mysql-api';
import { PurchaseOrderDetail } from './PurchaseOrderDetail';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  order_date: string;
  expected_delivery_date?: string;
  total_amount: number;
  notes?: string;
  items?: OrderItem[];
}

interface PurchaseOrdersListProps {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
}

export const PurchaseOrdersList: React.FC<PurchaseOrdersListProps> = ({ 
  supplierId, 
  supplierName, 
  onClose 
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, [supplierId]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const result = await purchaseOrdersAPI.getBySupplier(supplierId);
      if (result && result.success) {
        setOrders(result.data || []);
        setError(null);
      } else {
        setError(result?.error || 'Erreur lors du chargement');
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string; label: string } } = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Brouillon' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Envoyée' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmée' },
      received: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Reçue' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Annulée' }
    };

    const s = statusMap[status] || statusMap['draft'];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Historique des Commandes</h2>
              <p className="text-sm text-gray-600">{supplierName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <p className="text-gray-600">Chargement des commandes...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && orders.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Aucune commande trouvée</p>
            </div>
          )}

          {!loading && orders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N° Commande
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Articles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Livraison Prévue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          {formatDate(order.order_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{order.order_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.items && order.items.length > 0 ? (
                            <div className="space-y-1">
                              {order.items.slice(0, 2).map((item: OrderItem, idx: number) => (
                                <span key={idx} className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium mr-1 mb-1">
                                  {item.product_name} ({item.quantity})
                                </span>
                              ))}
                              {order.items.length > 2 && (
                                <span className="inline-block bg-gray-50 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                  +{order.items.length - 2} autre(s)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-medium text-gray-900">
                          <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                          {formatCurrency(order.total_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedOrder(order);
                            setTimeout(() => window.print(), 100);
                          }}
                          className="inline-flex items-center px-2 py-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Total des Commandes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(orders.reduce((sum, o) => sum + o.total_amount, 0))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Détail de commande */}
        {selectedOrder && (
          <PurchaseOrderDetail
            order={selectedOrder}
            supplierName={supplierName}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </div>
    </div>
  );
};
