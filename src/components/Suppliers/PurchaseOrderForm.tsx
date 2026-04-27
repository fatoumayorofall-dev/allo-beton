import React, { useState } from 'react';
import { X, ShoppingCart, Save, Package, Calendar, Hash, Plus, Trash2, FileText } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden">
        {/* Compact Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-indigo-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Nouvelle Commande</h2>
                <p className="text-[11px] text-white/80">{supplier.name}</p>
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

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="p-4 space-y-4">
            {/* Order Info - Compact Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600 uppercase mb-1.5">
                  <Hash className="w-3 h-3 text-orange-500" />
                  Numéro de Commande
                </label>
                <input
                  type="text"
                  value={formData.order_number}
                  onChange={(e) => handleInputChange('order_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600 uppercase mb-1.5">
                  <Calendar className="w-3 h-3 text-indigo-500" />
                  Date de Livraison Prévue
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                />
              </div>
            </div>

            {/* Notes - Compact */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600 uppercase mb-1.5">
                <FileText className="w-3 h-3 text-gray-500" />
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 resize-none"
                placeholder="Notes sur la commande..."
              />
            </div>

            {/* Order Items - Compact */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-5 h-5 bg-orange-100 rounded flex items-center justify-center">
                    <Package className="w-3 h-3 text-orange-600" />
                  </div>
                  Articles de Commande
                </h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Ajouter Article
                </button>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 mb-2 px-2">
                <span className="col-span-5 text-[9px] font-semibold text-gray-500 uppercase">Produit</span>
                <span className="col-span-2 text-[9px] font-semibold text-gray-500 uppercase text-center">Qté</span>
                <span className="col-span-2 text-[9px] font-semibold text-gray-500 uppercase text-center">Prix Unit.</span>
                <span className="col-span-2 text-[9px] font-semibold text-gray-500 uppercase text-right">Total</span>
                <span className="col-span-1"></span>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center bg-white rounded-lg p-2 border border-gray-100">
                    <input
                      type="text"
                      value={item.product_name}
                      onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                      placeholder="Nom du produit"
                      className="col-span-5 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[11px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Qté"
                      className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] text-center focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      min="1"
                    />
                    <input
                      type="number"
                      value={item.unit_cost}
                      onChange={(e) => handleItemChange(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                      placeholder="Prix"
                      className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] text-center focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      step="0.01"
                    />
                    <span className="col-span-2 text-[11px] font-semibold text-gray-800 text-right">
                      {(item.quantity * item.unit_cost).toLocaleString('fr-FR')} F
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="col-span-1 flex items-center justify-center p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Total - Compact */}
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                <div className="bg-gradient-to-br from-orange-50 to-indigo-50 rounded-xl p-3 border border-orange-100">
                  <p className="text-[10px] font-medium text-orange-600 mb-0.5">Total :</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-orange-600 to-indigo-600 bg-clip-text text-transparent">
                    {calculateTotal().toLocaleString('fr-FR')} F
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions - Compact */}
          <div className="flex justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 text-xs font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-indigo-600 text-white rounded-xl hover:from-orange-600 hover:to-indigo-700 text-xs font-medium transition-all shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
