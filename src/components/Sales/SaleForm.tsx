import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Product, Customer, SaleItem } from '../../types';
import { getProducts, getCustomers, createSale } from '../../services/supabase';
import { useDataContext } from '../../contexts/DataContext';

interface SaleFormProps {
  onClose: () => void;
  onSave: (saleData: any) => void;
}

export const SaleForm: React.FC<SaleFormProps> = ({ onClose, onSave }) => {
  const { refreshSales } = useDataContext();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [productsResult, customersResult] = await Promise.all([getProducts(), getCustomers()]);

    if (productsResult.success) {
      setProducts(productsResult.data || []);
    }
    if (customersResult.success) {
      setCustomers(customersResult.data || []);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `temp-${Date.now()}`,
        productId: '',
        productName: '',
        quantity: 1,
        price: 0,
        total: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      if (product) {
        item.productId = value;
        item.productName = (product as any).name;
        item.price = (product as any).selling_price || (product as any).price || 0;
        item.total = item.quantity * item.price;
      }
    } else if (field === 'quantity') {
      item.quantity = value;
      item.total = item.quantity * item.price;
    } else if (field === 'price') {
      item.price = value;
      item.total = item.quantity * item.price;
    } else {
      (item as any)[field] = value;
    }

    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const tax = subtotal * 0.18; // TVA 18%
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer || items.length === 0) {
      alert('Veuillez sélectionner un client et ajouter au moins un article');
      return;
    }

    setLoading(true);

    try {
      const saleData = {
        customerId: selectedCustomer,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        deliveryDate,
        notes,
        status: 'draft',
      };

      const result = await createSale(saleData);

      if (result.success) {
        // 1) informe le parent
        onSave(result.data);

        // 2) IMPORTANT: recharge la liste depuis MySQL
        await refreshSales();

        // 3) ferme
        onClose();
      } else {
        alert('Erreur lors de la création de la vente: ' + result.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de la vente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Nouvelle Vente</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Sélectionner un client</option>
                {customers.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.company ? `- ${customer.company}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de Livraison</label>
              <input
                type="datetime-local"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Articles</h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un article</span>
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                  <div className="col-span-4">
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(index, 'productId', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Sélectionner un produit</option>
                      {products.map((product: any) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {(product.selling_price || product.price || 0).toLocaleString()} FCFA/
                          {product.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Qté"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Prix"
                      required
                    />
                  </div>

                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      value={item.total}
                      readOnly
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100 font-medium"
                      placeholder="Total"
                    />
                  </div>

                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700 transition-colors duration-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Instructions de livraison, remarques..."
            />
          </div>

          {/* Summary */}
          {items.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total:</span>
                  <span>{subtotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA (18%):</span>
                  <span>{tax.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-blue-200">
                  <span>Total:</span>
                  <span>{total.toLocaleString()} FCFA</span>
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
              disabled={!selectedCustomer || items.length === 0 || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
