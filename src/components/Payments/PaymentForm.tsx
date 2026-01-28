import React, { useState, useEffect } from 'react';
import { X, CreditCard, Save } from 'lucide-react';
import { Sale } from '../../types';
import { getSales, createPayment } from '../../services/supabase';

interface PaymentFormProps {
  onClose: () => void;
  onSave: (paymentData: any) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ onClose, onSave }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    saleId: '',
    amount: 0,
    method: 'cash' as const,
    reference: '',
    notes: ''
  });

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const result = await getSales();
    if (result.success) {
      // Filtrer les ventes non payées
      const unpaidSales = result.data.filter(sale => 
        sale.payment_status !== 'paid' && sale.status !== 'cancelled'
      );
      setSales(unpaidSales);
    }
  };

  const selectedSale = sales.find(sale => sale.id === formData.saleId);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaleChange = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    setFormData(prev => ({
      ...prev,
      saleId,
      amount: sale ? sale.total_amount || sale.total || 0 : 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.saleId || formData.amount <= 0) {
      alert('Veuillez sélectionner une vente et saisir un montant valide');
      return;
    }

    setLoading(true);

    try {
      const result = await createPayment({
        saleId: formData.saleId,
        amount: formData.amount,
        method: formData.method,
        reference: formData.reference,
        notes: formData.notes
      });

      if (result.success) {
        onSave(result.data);
        onClose();
      } else {
        alert('Erreur lors de la création du paiement: ' + result.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Nouveau Paiement</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commande à payer *
            </label>
            <select
              value={formData.saleId}
              onChange={(e) => handleSaleChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Sélectionner une commande</option>
              {sales.map(sale => (
                <option key={sale.id} value={sale.id}>
                  {sale.sale_number} - {sale.customerName || sale.customer?.name} - {(sale.total_amount || sale.total || 0).toLocaleString()} FCFA
                </option>
              ))}
            </select>
          </div>

          {selectedSale && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Client:</span>
                  <span className="font-medium text-gray-900">{selectedSale.customerName || selectedSale.customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Montant total:</span>
                  <span className="font-medium text-gray-900">{(selectedSale.total_amount || selectedSale.total || 0).toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Statut paiement:</span>
                  <span className={`text-sm font-medium ${
                    selectedSale.payment_status === 'pending' ? 'text-red-600' :
                    selectedSale.payment_status === 'partial' ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {selectedSale.payment_status === 'pending' ? 'En attente' :
                     selectedSale.payment_status === 'partial' ? 'Partiel' : 'Payé'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant à encaisser (FCFA) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Méthode de paiement *
            </label>
            <select
              value={formData.method}
              onChange={(e) => handleInputChange('method', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="cash">Espèces</option>
              <option value="card">Carte bancaire</option>
              <option value="transfer">Virement</option>
              <option value="check">Chèque</option>
              <option value="mobile">Mobile Money</option>
            </select>
          </div>

          {(formData.method === 'transfer' || formData.method === 'check' || formData.method === 'mobile') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Référence
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  formData.method === 'transfer' ? 'Numéro de virement' :
                  formData.method === 'check' ? 'Numéro de chèque' :
                  'Numéro de transaction'
                }
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notes sur le paiement..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!formData.saleId || formData.amount <= 0 || loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Encaissement...' : 'Encaisser'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};