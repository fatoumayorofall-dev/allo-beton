import React, { useState, useEffect } from 'react';
import { X, Package, Save, DollarSign, Archive, Tag, FileText } from 'lucide-react';
import { Product, Category } from '../../types';
import { productsAPI } from '../../services/mysql-api';
import { useDataContext } from '../../contexts/DataContext';

interface ProductFormProps {
  onClose: () => void;
  onSave: (productData: any) => void;
  product?: Product;
}

export const ProductForm: React.FC<ProductFormProps> = ({ onClose, onSave, product }) => {
  const { refreshProducts } = useDataContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [productTypes, setProductTypes] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    price: product?.selling_price || product?.price || 0,
    cost_price: product?.cost_price || 0,
    stock: product?.stock || 0,
    minStock: product?.minStock || product?.min_stock || 0,
    unit: product?.unit || 'm³',
    product_type: product?.product_type || product?.productType || 'autre',
    variant: product?.variant || ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [typesResult] = await Promise.allSettled([
        productsAPI.getTypes()
      ]);
      if (typesResult.status === 'fulfilled' && typesResult.value.success) {
        setProductTypes(typesResult.value.data);
      }
    } catch (e) {
      console.error('Erreur chargement données:', e);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...formData,
        selling_price: formData.price,
      };

      let result;
      if (product) {
        result = await productsAPI.update(product.id, payload);
      } else {
        result = await productsAPI.create(payload);
      }

      if (result.success) {
        await refreshProducts();
        onSave(result.data);
        onClose();
      } else {
        setErrorMsg(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const margin = formData.price - formData.cost_price;
  const marginPercent = formData.cost_price > 0 ? ((margin / formData.cost_price) * 100).toFixed(1) : 0;
  const isValid = formData.name.trim().length > 0 && formData.price > 0;

  const variants = productTypes?.variants?.[formData.product_type] || [];

  const inputClass = "w-full px-3.5 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-800 bg-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/25 focus:border-violet-300 hover:border-gray-300 transition-all shadow-sm shadow-gray-100/50";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200/40">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {product ? 'Modifier le Produit' : 'Nouveau Produit'}
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Remplissez les informations du produit</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 rounded-xl flex items-center gap-2 text-sm text-red-700">
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Preview Card */}
          {formData.name && (
            <div className="bg-gradient-to-br from-violet-50/60 to-purple-50/30 rounded-xl border border-violet-200/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{formData.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {formData.product_type === 'beton' ? 'Béton' : formData.product_type === 'carriere' ? 'Carrière' : 'Autre'}
                      {formData.variant ? ` · ${formData.variant}` : ''} · {formData.unit} · {formData.stock} en stock
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">{formData.price.toLocaleString('fr-FR')} FCFA</div>
                  <div className="text-[10px] text-gray-400">/{formData.unit}</div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Informations de base */}
          <div className="bg-gradient-to-br from-violet-50/50 to-purple-50/30 rounded-xl border border-violet-200/40 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <Tag className="w-4 h-4 text-violet-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Informations de base</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Nom du produit <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={inputClass}
                  placeholder="Ex: Béton C25/30"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type de produit</label>
                  <select
                    value={formData.product_type}
                    onChange={(e) => {
                      handleInputChange('product_type', e.target.value);
                      handleInputChange('variant', '');
                    }}
                    className={inputClass}
                  >
                    <option value="beton">Béton</option>
                    <option value="carriere">Carrière</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Variante</label>
                  {variants.length > 0 ? (
                    <select value={formData.variant} onChange={(e) => handleInputChange('variant', e.target.value)} className={inputClass}>
                      <option value="">Sélectionner</option>
                      {variants.map((v: string) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={formData.variant} onChange={(e) => handleInputChange('variant', e.target.value)} className={inputClass} placeholder="Variante" />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Unité <span className="text-red-400">*</span>
                  </label>
                  <select value={formData.unit} onChange={(e) => handleInputChange('unit', e.target.value)} className={inputClass} required>
                    <option value="m³">m³ (Mètre cube)</option>
                    <option value="kg">kg (Kilogramme)</option>
                    <option value="L">L (Litre)</option>
                    <option value="sac">sac</option>
                    <option value="unité">unité</option>
                    <option value="tonne">tonne</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Prix */}
          <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 rounded-xl border border-emerald-200/40 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Prix et Tarification</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Prix de vente (FCFA) <span className="text-red-400">*</span>
                </label>
                <input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0" required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Prix d'achat (FCFA)</label>
                <input type="number" min="0" step="0.01" value={formData.cost_price} onChange={(e) => handleInputChange('cost_price', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Marge</label>
                <div className={`w-full py-2.5 px-3.5 rounded-xl text-sm text-center font-bold border ${
                  margin > 0 ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60' :
                  margin < 0 ? 'bg-red-50/80 text-red-700 border-red-200/60' :
                  'bg-gray-50/80 text-gray-600 border-gray-200/60'
                }`}>
                  {margin.toLocaleString('fr-FR')} FCFA ({marginPercent}%)
                </div>
              </div>
            </div>
          </div>

          {/* Section: Stock */}
          <div className="bg-gradient-to-br from-cyan-50/50 to-orange-50/30 rounded-xl border border-cyan-200/40 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Archive className="w-4 h-4 text-cyan-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Gestion du Stock</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Stock actuel ({formData.unit})</label>
                <input type="number" min="0" step="0.1" value={formData.stock} onChange={(e) => handleInputChange('stock', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Stock minimum (alerte)</label>
                <input type="number" min="0" step="0.1" value={formData.minStock} onChange={(e) => handleInputChange('minStock', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0" />
                <p className="text-[10px] text-gray-400 mt-1.5">Alerte si le stock descend en dessous de cette valeur</p>
              </div>

              {/* Stock progress preview */}
              {formData.stock > 0 && (
                <div className="md:col-span-2 bg-white/60 rounded-xl border border-cyan-100/50 p-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500 font-medium">Niveau de stock</span>
                    <span className={`font-bold ${
                      formData.stock <= formData.minStock ? 'text-red-600' :
                      formData.stock <= formData.minStock * 2 ? 'text-amber-600' :
                      'text-emerald-600'
                    }`}>{formData.stock} {formData.unit}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        formData.stock <= formData.minStock ? 'bg-gradient-to-r from-red-400 to-red-500' :
                        formData.stock <= formData.minStock * 2 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                        'bg-gradient-to-r from-emerald-400 to-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, (formData.stock / Math.max(formData.minStock * 3, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Description */}
          <div className="bg-gradient-to-br from-slate-50/50 to-gray-50/30 rounded-xl border border-slate-200/40 p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Description</h3>
            </div>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Description détaillée du produit, caractéristiques, composition..."
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 bg-gray-50 border border-gray-200/60 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium">
              Annuler
            </button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-bold shadow-md shadow-violet-200/30"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{product ? 'Enregistrer' : 'Créer le produit'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
