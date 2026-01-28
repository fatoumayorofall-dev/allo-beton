import React, { useState } from 'react';
import { X, Truck, Save } from 'lucide-react';
import { Supplier } from '../../types';

interface SupplierFormProps {
  onClose: () => void;
  onSave: (supplierData: Omit<Supplier, 'id' | 'totalOrders' | 'lastOrderDate'>) => void;
  supplier?: Supplier;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ onClose, onSave, supplier }) => {
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    productsSupplied: supplier?.productsSupplied || [],
    rating: supplier?.rating || 5
  });

  const [newProduct, setNewProduct] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addProduct = () => {
    if (newProduct.trim() && !formData.productsSupplied.includes(newProduct.trim())) {
      setFormData(prev => ({
        ...prev,
        productsSupplied: [...prev.productsSupplied, newProduct.trim()]
      }));
      setNewProduct('');
    }
  };

  const removeProduct = (product: string) => {
    setFormData(prev => ({
      ...prev,
      productsSupplied: prev.productsSupplied.filter(p => p !== product)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {supplier ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Ciments du Sahel"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personne de contact *
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Amadou Diallo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contact@fournisseur.sn"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="33 821 45 67"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse *
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Adresse complète"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (sur 5)
              </label>
              <select
                value={formData.rating}
                onChange={(e) => handleInputChange('rating', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5 - Excellent</option>
                <option value={4.5}>4.5 - Très bien</option>
                <option value={4}>4 - Bien</option>
                <option value={3.5}>3.5 - Correct</option>
                <option value={3}>3 - Moyen</option>
                <option value={2.5}>2.5 - Médiocre</option>
                <option value={2}>2 - Mauvais</option>
                <option value={1.5}>1.5 - Très mauvais</option>
                <option value={1}>1 - Terrible</option>
              </select>
            </div>
          </div>

          {/* Products Supplied */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Produits fournis
            </label>
            
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ajouter un produit"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addProduct())}
              />
              <button
                type="button"
                onClick={addProduct}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Ajouter
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.productsSupplied.map((product, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                >
                  {product}
                  <button
                    type="button"
                    onClick={() => removeProduct(product)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
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
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Save className="w-4 h-4" />
              <span>{supplier ? 'Modifier' : 'Créer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};