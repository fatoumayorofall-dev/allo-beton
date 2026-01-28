import React, { useState } from 'react';
import { X, Package, Plus } from 'lucide-react';
import { Product } from '../../types';

interface RestockFormProps {
  onClose: () => void;
  onSave: (restockData: any) => void;
  product: Product;
}

export const RestockForm: React.FC<RestockFormProps> = ({ onClose, onSave, product }) => {
  const [formData, setFormData] = useState({
    quantity: 0,
    unitCost: product.price,
    supplier: '',
    reference: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      productId: product.id,
      productName: product.name,
      ...formData,
      totalCost: formData.quantity * formData.unitCost,
      date: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Réapprovisionner</h2>
              <p className="text-sm text-gray-600">{product.name}</p>
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
          {/* Current Stock Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Stock actuel:</span>
              <span className="font-medium text-gray-900">{product.stock} {product.unit}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Stock minimum:</span>
              <span className="font-medium text-gray-900">{product.minStock} {product.unit}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantité à ajouter *
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                required
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                {product.unit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coût unitaire (FCFA) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.unitCost}
              onChange={(e) => handleInputChange('unitCost', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fournisseur
            </label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => handleInputChange('supplier', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nom du fournisseur"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Référence commande
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => handleInputChange('reference', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Numéro de commande ou facture"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notes sur la livraison..."
            />
          </div>

          {/* Summary */}
          {formData.quantity > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Nouveau stock:</span>
                  <span className="font-medium text-gray-900">
                    {product.stock + formData.quantity} {product.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Coût total:</span>
                  <span className="font-medium text-gray-900">
                    {(formData.quantity * formData.unitCost).toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>
          )}

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
              disabled={formData.quantity <= 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Réapprovisionner
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};