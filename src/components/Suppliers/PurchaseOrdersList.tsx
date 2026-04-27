import React, { useState, useEffect } from 'react';
import { X, Eye, FileText, Calendar, DollarSign, Package, ClipboardList, TrendingUp, ShoppingBag } from 'lucide-react';
import { purchaseOrdersAPI } from '../../services/mysql-api';
import { PurchaseOrderDetail } from './PurchaseOrderDetail';
import { formatCurrency as formatCurrencyFn, getSettings, AppSettings } from '../../services/settings';

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
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    loadOrders();
    getSettings().then(setSettings);
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

  const getStatusDot = (status: string) => {
    const statusMap: { [key: string]: { dot: string; bg: string; text: string; label: string } } = {
      draft: { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-700', label: 'Brouillon' },
      sent: { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', label: 'Envoyée' },
      confirmed: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Confirmée' },
      received: { dot: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', label: 'Reçue' },
      cancelled: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'Annulée' }
    };

    const s = statusMap[status] || statusMap['draft'];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${s.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
        <span className={`text-[10px] font-medium ${s.text}`}>{s.label}</span>
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
    return formatCurrencyFn(amount, settings || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-orange-500 to-indigo-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Historique des Commandes</h2>
                <p className="text-[11px] text-white/80">{supplierName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="p-4">
            {loading && (
              <div className="flex justify-center items-center py-10">
                <div className="w-6 h-6 border-3 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {!loading && orders.length === 0 && (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Package className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">Aucune commande trouvée</p>
                <p className="text-[11px] text-gray-400 mt-1">Ce fournisseur n'a pas encore de commandes</p>
              </div>
            )}

            {!loading && orders.length > 0 && (
              <>
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-3 border border-orange-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium text-orange-600 mb-0.5">Total Commandes</p>
                        <p className="text-lg font-bold text-orange-800">{orders.length}</p>
                      </div>
                      <div className="w-8 h-8 bg-orange-200/50 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-orange-600" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium text-emerald-600 mb-0.5">Montant Total</p>
                        <p className="text-lg font-bold text-emerald-800">{formatCurrency(orders.reduce((sum, o) => sum + o.total_amount, 0))}</p>
                      </div>
                      <div className="w-8 h-8 bg-emerald-200/50 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-3 border border-amber-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium text-amber-600 mb-0.5">Moyenne/Cmd</p>
                        <p className="text-lg font-bold text-amber-800">{formatCurrency(orders.reduce((sum, o) => sum + o.total_amount, 0) / orders.length)}</p>
                      </div>
                      <div className="w-8 h-8 bg-amber-200/50 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase">N° Commande</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Articles</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Montant</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Livraison</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase">Statut</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center text-[11px] text-gray-700">
                              <Calendar className="w-3 h-3 text-gray-400 mr-1.5" />
                              {formatDate(order.order_date)}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[11px] font-semibold text-gray-800">{order.order_number}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {order.items && order.items.length > 0 ? (
                                <>
                                  {order.items.slice(0, 2).map((item: OrderItem, idx: number) => (
                                    <span key={idx} className="inline-flex items-center px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded text-[9px] font-medium">
                                      {item.product_name} ({item.quantity})
                                    </span>
                                  ))}
                                  {order.items.length > 2 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px]">
                                      +{order.items.length - 2}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[11px] text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[11px] font-semibold text-emerald-700">{formatCurrency(order.total_amount)}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[11px] text-gray-600">
                              {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {getStatusDot(order.status)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition-colors text-[10px] font-medium"
                            >
                              <Eye className="w-3 h-3" />
                              Voir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Détail de commande */}
        {selectedOrder && (
          <PurchaseOrderDetail
            order={selectedOrder}
            supplierName={supplierName}
            onClose={() => setSelectedOrder(null)}
            onOrderUpdated={() => { loadOrders(); setSelectedOrder(null); }}
          />
        )}
      </div>
    </div>
  );
};
