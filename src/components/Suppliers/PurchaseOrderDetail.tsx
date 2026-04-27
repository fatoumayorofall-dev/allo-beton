import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, Calendar, Package, Truck, CheckCircle, Clock, AlertCircle, Hash, PackageCheck, Check } from 'lucide-react';
import { formatCurrency as formatCurrencyFn, getSettings, AppSettings } from '../../services/settings';
import { purchaseOrdersAPI, productsAPI } from '../../services/mysql-api';
import { Product } from '../../types';
import { useDataContext } from '../../contexts/DataContext';

interface OrderItem {
  id: string;
  product_name: string;
  product_id?: string;
  quantity: number;
  received_quantity?: number;
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

interface PurchaseOrderDetailProps {
  order: Order;
  supplierName: string;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

interface ReceiveItem {
  item_id: string;
  product_name: string;
  ordered_quantity: number;
  already_received: number;
  received_quantity: number;
  product_id: string;
  unit_cost: number;
}

export const PurchaseOrderDetail: React.FC<PurchaseOrderDetailProps> = ({
  order,
  supplierName,
  onClose,
  onOrderUpdated
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [receiving, setReceiving] = useState(false);
  const [receiveSuccess, setReceiveSuccess] = useState('');
  const [receiveError, setReceiveError] = useState('');
  const { refreshProducts } = useDataContext();

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const loadProducts = async () => {
    try {
      const res = await productsAPI.getAll();
      if (res.success) setProducts(res.data || []);
    } catch (e) {
      console.error('Erreur chargement produits:', e);
    }
  };

  const openReceiveModal = async () => {
    await loadProducts();
    const items: ReceiveItem[] = (order.items || []).map(item => {
      const alreadyReceived = Number(item.received_quantity) || 0;
      // Try to auto-match product by name
      const matchedProduct = products.find(p =>
        p.name?.toLowerCase().includes(item.product_name?.toLowerCase()) ||
        item.product_name?.toLowerCase().includes(p.name?.toLowerCase())
      );
      return {
        item_id: item.id,
        product_name: item.product_name,
        ordered_quantity: item.quantity,
        already_received: alreadyReceived,
        received_quantity: Math.max(0, item.quantity - alreadyReceived),
        product_id: matchedProduct?.id || item.product_id || '',
        unit_cost: item.unit_cost,
      };
    });
    setReceiveItems(items);
    setReceiveSuccess('');
    setReceiveError('');
    setShowReceiveModal(true);
  };

  const handleReceive = async () => {
    setReceiving(true);
    setReceiveError('');
    setReceiveSuccess('');
    try {
      const itemsToReceive = receiveItems
        .filter(i => i.received_quantity > 0)
        .map(i => ({
          item_id: i.item_id,
          received_quantity: i.received_quantity,
          product_id: i.product_id || null,
        }));

      if (itemsToReceive.length === 0) {
        setReceiveError('Aucun article à réceptionner');
        setReceiving(false);
        return;
      }

      const result = await purchaseOrdersAPI.receive(order.id, itemsToReceive);
      if (result.success) {
        setReceiveSuccess(`${result.data.totalReceived} article(s) réceptionné(s) — stock mis à jour`);
        await refreshProducts();
        if (onOrderUpdated) onOrderUpdated();
        setTimeout(() => setShowReceiveModal(false), 1500);
      } else {
        setReceiveError(result.error || 'Erreur');
      }
    } catch (e: any) {
      setReceiveError(e.message || 'Erreur lors de la réception');
    } finally {
      setReceiving(false);
    }
  };

  const updateReceiveItem = (idx: number, field: keyof ReceiveItem, value: any) => {
    setReceiveItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    ));
  };

  const canReceive = order.status !== 'received' && order.status !== 'cancelled';

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; dot: string; icon: React.ReactNode }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400', icon: <Clock className="w-3 h-3" /> },
      sent: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', icon: <Truck className="w-3 h-3" /> },
      confirmed: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: <CheckCircle className="w-3 h-3" /> },
      received: { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500', icon: <CheckCircle className="w-3 h-3" /> },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', icon: <AlertCircle className="w-3 h-3" /> },
    };
    return colors[status] || colors['draft'];
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      confirmed: 'Confirmée',
      received: 'Reçue',
      cancelled: 'Annulée',
    };
    return labels[status] || status;
  };

  const statusStyle = getStatusColor(order.status);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden">
        {/* Compact Header with Gradient */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">{order.order_number}</h2>
                <p className="text-[11px] text-white/80">{supplierName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                {statusStyle.icon}
                {getStatusLabel(order.status)}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="p-4 space-y-4">
            {/* Info Cards - Compact Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[9px] font-medium text-gray-500 uppercase mb-1">Date Commande</p>
                <div className="flex items-center text-[11px] font-semibold text-gray-800">
                  <Calendar className="w-3 h-3 text-indigo-500 mr-1.5" />
                  {formatDate(order.order_date)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[9px] font-medium text-gray-500 uppercase mb-1">Livraison Prévue</p>
                <div className="flex items-center text-[11px] font-semibold text-gray-800">
                  <Truck className="w-3 h-3 text-purple-500 mr-1.5" />
                  {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '—'}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[9px] font-medium text-gray-500 uppercase mb-1">Articles</p>
                <div className="flex items-center text-[11px] font-semibold text-gray-800">
                  <Package className="w-3 h-3 text-teal-500 mr-1.5" />
                  {order.items?.length || 0} produit(s)
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3 border border-indigo-100">
                <p className="text-[9px] font-medium text-indigo-600 uppercase mb-1">Montant Total</p>
                <p className="text-lg font-bold text-indigo-700">{formatCurrency(order.total_amount)}</p>
              </div>
            </div>

            {/* Items Table - Compact */}
            <div>
              <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <div className="w-5 h-5 bg-indigo-100 rounded flex items-center justify-center">
                  <Package className="w-3 h-3 text-indigo-600" />
                </div>
                Articles de Commande
              </h3>
              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Produit</th>
                      <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase">Quantité</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">Prix Unitaire</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-indigo-100 rounded flex items-center justify-center">
                                <Package className="w-3 h-3 text-indigo-600" />
                              </div>
                              <span className="text-[11px] font-medium text-gray-800">{item.product_name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded text-[11px] font-semibold text-gray-700">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-[11px] text-gray-600">{formatCurrency(item.unit_cost)}</td>
                          <td className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-800">{formatCurrency(item.line_total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-[11px] text-gray-500">
                          Aucun article dans cette commande
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals - Compact */}
              <div className="mt-3 flex justify-end">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 w-64 border border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-600">Sous-Total:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(order.total_amount)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-800">Total:</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes - Compact */}
            {order.notes && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-indigo-700 uppercase mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  Notes
                </p>
                <p className="text-[11px] text-indigo-800">{order.notes}</p>
              </div>
            )}

            {/* Actions - Compact */}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-xs font-medium"
              >
                Fermer
              </button>
              {canReceive && (
                <button
                  onClick={openReceiveModal}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all text-xs font-medium shadow-sm"
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  Réceptionner
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all text-xs font-medium shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Receive Modal ── */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-200/30">
                  <PackageCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Réception de commande</h3>
                  <p className="text-[11px] text-gray-400">{order.order_number} — {supplierName}</p>
                </div>
              </div>
              <button onClick={() => setShowReceiveModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-180px)] p-5 space-y-4">
              {receiveError && (
                <div className="p-3 bg-red-50 border border-red-200/60 rounded-xl text-xs text-red-700">{receiveError}</div>
              )}
              {receiveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                  <Check className="w-4 h-4" />{receiveSuccess}
                </div>
              )}

              <p className="text-xs text-gray-500">Saisissez les quantités reçues et liez chaque article à un produit en stock pour mettre à jour automatiquement l'inventaire.</p>

              <div className="space-y-3">
                {receiveItems.map((item, idx) => (
                  <div key={item.item_id} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Package className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-800">{item.product_name}</span>
                          <p className="text-[10px] text-gray-400">
                            Commandé: {item.ordered_quantity} · Déjà reçu: {item.already_received} · Coût: {formatCurrency(item.unit_cost)}/u
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Produit en stock</label>
                        <select
                          value={item.product_id}
                          onChange={(e) => updateReceiveItem(idx, 'product_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-300"
                        >
                          <option value="">-- Non lié --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.stock ?? 0} {p.unit || 'm³'})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Quantité reçue</label>
                        <input
                          type="number"
                          min="0"
                          max={item.ordered_quantity - item.already_received}
                          step="0.01"
                          value={item.received_quantity}
                          onChange={(e) => updateReceiveItem(idx, 'received_quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-300"
                        />
                      </div>
                    </div>

                    {item.product_id && item.received_quantity > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1.5 border border-emerald-100">
                        <Check className="w-3 h-3" />
                        +{item.received_quantity} unités seront ajoutées au stock de «{products.find(p => p.id === item.product_id)?.name}»
                      </div>
                    )}
                    {!item.product_id && item.received_quantity > 0 && (
                      <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
                        Article non lié — le stock ne sera pas mis à jour pour cet article
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200/60 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReceive}
                disabled={receiving || receiveItems.every(i => i.received_quantity <= 0)}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-200/30"
              >
                {receiving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <PackageCheck className="w-4 h-4" />
                )}
                Confirmer la réception
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
