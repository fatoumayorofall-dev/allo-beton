import React, { useMemo } from 'react';
import { X, User, Mail, Phone, MapPin, Building, CreditCard, ShoppingCart } from 'lucide-react';
import { Customer } from '../../types';
import { useDataContext } from '../../contexts/DataContext';

interface CustomerDetailProps {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({ customer, onClose, onEdit }) => {
  const { sales } = useDataContext();

  const customerSales = useMemo(() => {
    return (sales || []).filter((s: any) => s.customerId === customer.id || s.customer_id === customer.id);
  }, [sales, customer.id]);

  const totalSales = customerSales.length;

  const totalAmount = useMemo(() => {
    return customerSales.reduce((sum: number, sale: any) => {
      const v =
        Number(sale?.total ?? 0) ||
        Number(sale?.total_amount ?? 0) ||
        Number(sale?.totalAmount ?? 0) ||
        0;
      return sum + v;
    }, 0);
  }, [customerSales]);

  const creditLimit = Number((customer as any)?.creditLimit ?? (customer as any)?.credit_limit ?? 0);
  const balance = Number((customer as any)?.balance ?? (customer as any)?.current_balance ?? 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
              <p className="text-gray-600">{(customer as any).company || ''}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              type="button"
            >
              Modifier
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Informations de Contact</h3>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{(customer as any).email || '—'}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{(customer as any).phone || '—'}</span>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <span className="text-gray-900">{(customer as any).address || '—'}</span>
                </div>

                {(customer as any).company && (
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900">{(customer as any).company}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Informations Financières</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Limite de crédit:</span>
                  <span className="font-medium text-gray-900">{creditLimit.toLocaleString()} FCFA</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Solde actuel:</span>
                  <span className={`font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {balance.toLocaleString()} FCFA
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Crédit disponible:</span>
                  <span className="font-medium text-gray-900">
                    {(creditLimit - balance).toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Achats</p>
                  <p className="text-2xl font-bold text-blue-900">{totalAmount.toLocaleString()} FCFA</p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Nombre de Commandes</p>
                  <p className="text-2xl font-bold text-green-900">{totalSales}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">Panier Moyen</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {totalSales > 0 ? Math.round(totalAmount / totalSales).toLocaleString() : '0'} FCFA
                  </p>
                </div>
                <User className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Recent Sales */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Commandes Récentes</h3>

            {customerSales.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commande</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerSales.slice(0, 5).map((sale: any) => {
                      const amount =
                        Number(sale?.total ?? 0) ||
                        Number(sale?.total_amount ?? 0) ||
                        Number(sale?.totalAmount ?? 0) ||
                        0;

                      const createdAt = sale?.createdAt || sale?.created_at || sale?.date || new Date().toISOString();
                      const status = sale?.status || 'draft';

                      return (
                        <tr key={sale.id}>
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">#{sale.id}</td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Date(createdAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">
                            {amount.toLocaleString()} FCFA
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : status === 'confirmed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {status === 'paid' ? 'Payé' : status === 'confirmed' ? 'Confirmé' : 'Brouillon'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Aucune commande trouvée pour ce client</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
