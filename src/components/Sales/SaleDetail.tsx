import React from 'react';
import { X, FileText, Printer, Mail } from 'lucide-react';
import { Sale } from '../../types';

interface SaleDetailProps {
  sale: Sale;
  onClose: () => void;
}

export const SaleDetail: React.FC<SaleDetailProps> = ({ sale, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Détail de la Vente #{sale.id}</h2>
            <p className="text-gray-600">{sale.customerName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
              <Printer className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
              <Mail className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Sale Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Informations Générale</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date de création:</span>
                    <span className="font-medium">{new Date(sale.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {sale.deliveryDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date de livraison:</span>
                      <span className="font-medium">{new Date(sale.deliveryDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      sale.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      sale.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {sale.status === 'draft' ? 'Brouillon' :
                       sale.status === 'confirmed' ? 'Confirmé' :
                       sale.status === 'delivered' ? 'Livré' : 'Payé'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paiement:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.paymentStatus === 'pending' ? 'bg-red-100 text-red-800' :
                      sale.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {sale.paymentStatus === 'pending' ? 'En attente' :
                       sale.paymentStatus === 'partial' ? 'Partiel' : 'Payé'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Client</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">{sale.customerName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Articles</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix Unitaire
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sale.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {item.productName}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {item.price.toLocaleString()} FCFA
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {item.total.toLocaleString()} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Sous-total:</span>
                <span className="font-medium">{sale.subtotal.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">TVA (20%):</span>
                <span className="font-medium">{sale.tax.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-blue-200">
                <span>Total:</span>
                <span>{sale.total.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Notes</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{sale.notes}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200">
              Modifier
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
              Générer Facture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};