import React, { useState, useEffect } from 'react';
import { X, Plus, RotateCcw, AlertTriangle, Truck, FileText, Archive, Clock, ArrowUpRight } from 'lucide-react';
import { Product, StockMovement } from '../../types';
import { useDataContext } from '../../contexts/DataContext';
import { productsAPI } from '../../services/mysql-api';

interface RestockFormProps {
  onClose: () => void;
  onSave: (restockData: any) => void;
  product: Product;
}

export const RestockForm: React.FC<RestockFormProps> = ({ onClose, onSave, product }) => {
  const { refreshProducts } = useDataContext();
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 0,
    unitCost: product.price || product.selling_price || 0,
    supplier: '',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    const loadMovements = async () => {
      setMovementsLoading(true);
      try {
        const result = await productsAPI.getMovements(product.id, 10);
        if (result.success) {
          setMovements((result.data.movements || []).filter((m: StockMovement) => m.movement_type === 'in'));
        }
      } catch (e) {
        console.error('Erreur chargement historique:', e);
      } finally {
        setMovementsLoading(false);
      }
    };
    loadMovements();
  }, [product.id]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await productsAPI.restock(product.id, {
        quantity: formData.quantity,
        unitCost: formData.unitCost,
        supplier: formData.supplier,
        reference: formData.reference,
        notes: formData.notes,
      });
      if (result.success) {
        await refreshProducts();
        onSave({
          productId: product.id,
          productName: product.name,
          ...formData,
          totalCost: formData.quantity * formData.unitCost,
          date: new Date().toISOString(),
          previousStock: result.data.previousStock,
          newStock: result.data.newStock,
        });
      } else {
        alert(result.error || 'Erreur lors du réapprovisionnement');
      }
    } catch (error: any) {
      alert(error.message || 'Erreur lors du réapprovisionnement');
    } finally {
      setLoading(false);
    }
  };

  const currentStock = product.stock || 0;
  const minStock = product.minStock || product.min_stock || 0;
  const newStock = currentStock + formData.quantity;
  const stockPercent = Math.min(100, (newStock / Math.max(minStock * 3, 1)) * 100);
  const isLowStock = currentStock <= minStock && minStock > 0;

  const inputClass = "w-full px-3.5 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-800 bg-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/25 focus:border-violet-300 hover:border-gray-300 transition-all shadow-sm shadow-gray-100/50";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200/40">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Réapprovisionner</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">{product.name} {product.unit ? `(${product.unit})` : ''}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Current Stock Status */}
          <div className={`rounded-xl border p-4 ${isLowStock ? 'bg-gradient-to-br from-red-50/60 to-rose-50/30 border-red-200/40' : 'bg-gradient-to-br from-emerald-50/60 to-teal-50/30 border-emerald-200/40'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isLowStock ? 'bg-red-100' : 'bg-emerald-100'}`}>
                  {isLowStock ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <Archive className="w-4 h-4 text-emerald-600" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Stock Actuel</p>
                  <p className={`text-[10px] font-semibold ${isLowStock ? 'text-red-500' : 'text-emerald-500'}`}>
                    {isLowStock ? 'Niveau critique' : 'Niveau acceptable'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${isLowStock ? 'text-red-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent'}`}>
                  {currentStock}
                </div>
                <div className="text-[10px] text-gray-400">{product.unit || 'm³'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/70 rounded-xl p-2.5 text-center border border-gray-100/50">
                <div className="text-sm font-bold text-gray-900">{minStock} {product.unit || 'm³'}</div>
                <div className="text-[10px] text-gray-400">Stock minimum</div>
              </div>
              <div className="bg-white/70 rounded-xl p-2.5 text-center border border-gray-100/50">
                <div className="text-sm font-bold text-emerald-600">{minStock * 3} {product.unit || 'm³'}</div>
                <div className="text-[10px] text-gray-400">Objectif idéal</div>
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="bg-gradient-to-br from-violet-50/50 to-purple-50/30 rounded-xl border border-violet-200/40 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-violet-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Quantité à ajouter <span className="text-red-400">*</span></h3>
            </div>
            <input
              type="number"
              min="1"
              value={formData.quantity || ''}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-3 text-xl font-bold border border-violet-200/60 rounded-xl text-center bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/25 focus:border-violet-300 hover:border-violet-200 transition-all shadow-sm"
              placeholder="0"
              required
            />
            <div className="flex gap-2 mt-2.5">
              {[10, 25, 50, 100].map(qty => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => handleInputChange('quantity', formData.quantity + qty)}
                  className="flex-1 py-2 bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 rounded-xl text-xs font-bold hover:from-violet-100 hover:to-purple-100 transition-all border border-violet-200/50"
                >
                  +{qty}
                </button>
              ))}
            </div>
          </div>

          {/* Cost & Supplier */}
          <div className="bg-gradient-to-br from-sky-50/50 to-orange-50/30 rounded-xl border border-sky-200/40 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-sky-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Coût & Fournisseur</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Coût unitaire (FCFA)</label>
                <input type="number" min="0" step="0.01" value={formData.unitCost} onChange={(e) => handleInputChange('unitCost', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fournisseur</label>
                <input type="text" value={formData.supplier} onChange={(e) => handleInputChange('supplier', e.target.value)} className={inputClass} placeholder="Nom du fournisseur" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gradient-to-br from-slate-50/50 to-gray-50/30 rounded-xl border border-slate-200/40 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Référence / Notes</h3>
            </div>
            <textarea value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="N° commande, notes sur la livraison..." />
          </div>

          {/* Summary Preview */}
          {formData.quantity > 0 && (
            <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/30 rounded-xl border border-emerald-200/40 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Archive className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Aperçu du Réapprovisionnement</h4>
              </div>
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                <div className="bg-white/70 rounded-xl p-3 text-center border border-emerald-100/50">
                  <div className="text-lg font-bold text-gray-400 line-through">{currentStock}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Ancien Stock</div>
                </div>
                <div className="bg-white/70 rounded-xl p-3 text-center border border-violet-100/50">
                  <div className="text-lg font-bold text-violet-600">+{formData.quantity}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Ajouté</div>
                </div>
                <div className="bg-white/70 rounded-xl p-3 text-center border border-emerald-100/50">
                  <div className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{newStock}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Nouveau Stock</div>
                </div>
              </div>
              {formData.unitCost > 0 && (
                <div className="bg-white/70 rounded-xl p-2.5 text-center border border-emerald-100/50 mb-3">
                  <div className="text-sm font-bold text-gray-900">{(formData.quantity * formData.unitCost).toLocaleString('fr-FR')} FCFA</div>
                  <div className="text-[10px] text-gray-400">Coût Total</div>
                </div>
              )}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Niveau après réapprovisionnement</span>
                  <span className="text-sm font-bold text-emerald-600">{stockPercent.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${stockPercent}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Historique des Réapprovisionnements */}
          <div className="bg-gradient-to-br from-gray-50/50 to-slate-50/30 rounded-xl border border-gray-200/40 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-gray-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Historique des Réapprovisionnements</h3>
            </div>
            {movementsLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-violet-100 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : movements.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">Aucun réapprovisionnement enregistré</p>
            ) : (
              <div className="space-y-2">
                {movements.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 bg-white/70 rounded-lg p-2.5 border border-gray-100/50">
                    <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600">+{m.quantity} {product.unit || 'm³'}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(m.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {m.supplier_name && <span className="text-[10px] text-gray-500">{m.supplier_name}</span>}
                        {m.unit_cost && <span className="text-[10px] text-gray-400">· {Number(m.unit_cost).toLocaleString('fr-FR')} FCFA/u</span>}
                        {m.previous_stock != null && m.new_stock != null && (
                          <span className="text-[10px] text-gray-400">· {m.previous_stock} → {m.new_stock}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 bg-gray-50 border border-gray-200/60 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium">
              Annuler
            </button>
            <button
              type="submit"
              disabled={formData.quantity <= 0 || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-bold shadow-md shadow-violet-200/30"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>En cours...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Réapprovisionner</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
