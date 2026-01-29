import React, { useState } from 'react';
import { X, Download, Printer, FileText, Calendar, DollarSign, Package } from 'lucide-react';

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

interface PurchaseOrderDetailProps {
  order: Order;
  supplierName: string;
  onClose: () => void;
  onGeneratePDF?: () => void;
}

export const PurchaseOrderDetail: React.FC<PurchaseOrderDetailProps> = ({
  order,
  supplierName,
  onClose,
  onGeneratePDF
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      received: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  const handleGeneratePDF = async () => {
    if (onGeneratePDF) {
      setIsGeneratingPDF(true);
      try {
        await onGeneratePDF();
      } finally {
        setIsGeneratingPDF(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{order.order_number}</h2>
              <p className="text-sm text-gray-600">{supplierName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Date Commande</p>
              <div className="flex items-center text-sm text-gray-900">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                {formatDate(order.order_date)}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Livraison Prévue</p>
              <div className="flex items-center text-sm text-gray-900">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '—'}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Statut</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs font-medium text-blue-600 uppercase mb-1">Montant Total</p>
              <div className="flex items-center text-lg font-bold text-blue-900">
                <DollarSign className="w-4 h-4 mr-1" />
                {formatCurrency(order.total_amount)}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Articles de Commande</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix Unitaire</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{item.product_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900">{formatCurrency(item.unit_cost)}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(item.line_total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                        Aucun article
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="bg-gray-50 rounded-lg p-6 w-full md:w-80">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Sous-Total:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(order.total_amount)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-2xl font-bold text-blue-600">{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Notes</p>
              <p className="text-sm text-blue-800">{order.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPDF ? 'Génération...' : 'Télécharger PDF'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
