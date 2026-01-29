import React, { useState } from 'react';
import { X, ShoppingCart, Save } from 'lucide-react';
import { Supplier } from '../../types';

interface PurchaseOrderFormProps {
  onClose: () => void;
  onSave: (orderData: any) => void;
  supplier: Supplier;
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({ onClose, onSave, supplier }) => {
  const [formData, setFormData] = useState({
    supplier_id: supplier.id,
    order_number: `CMD-${Date.now()}`,
    expectedDeliveryDate: '',
    notes: ''
  });

  const [items, setItems] = useState([
    { product_name: '', quantity: 1, unit_cost: 0 }
  ]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_name: '', quantity: 1, unit_cost: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = {
      ...formData,
      items,
      total_amount: calculateTotal()
    };
    onSave(dataToSend);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Nouvelle Commande</h2>
              <p className="text-sm text-gray-600">{supplier.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de Commande
              </label>
              <input
                type="text"
                value={formData.order_number}
                onChange={(e) => handleInputChange('order_number', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de Livraison Prévue
              </label>
              <input
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notes sur la commande..."
            />
          </div>

          {/* Order Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Articles de Commande</h3>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Ajouter Article
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <input
                    type="text"
                    value={item.product_name}
                    onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                    placeholder="Nom du produit"
                    className="col-span-5 px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    placeholder="Qté"
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded text-sm"
                    min="1"
                  />
                  <input
                    type="number"
                    value={item.unit_cost}
                    onChange={(e) => handleItemChange(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                    placeholder="Prix unitaire"
                    className="col-span-3 px-3 py-2 border border-gray-300 rounded text-sm"
                    step="0.01"
                  />
                  <span className="col-span-1 text-sm font-medium text-gray-900">
                    {(item.quantity * item.unit_cost).toFixed(2)} F
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="col-span-1 text-red-600 hover:text-red-800 text-sm"
                  >
                    Suppr.
                  </button>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
              <div className="text-right">
                <p className="text-gray-600 mb-1">Total :</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calculateTotal().toFixed(2)} F
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
