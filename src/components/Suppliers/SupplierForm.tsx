import React, { useMemo, useState } from 'react';
import {
  X, Building2, MapPin,
  Star, Package, CheckCircle,
  AlertCircle, Plus, Trash2, Mail, Phone, User, Save
} from 'lucide-react';
import { Supplier } from '../../types';
import { useDataContext } from '../../contexts/DataContext';
import { suppliersAPI } from '../../services/mysql-api';

interface SupplierFormProps {
  onClose: () => void;
  onSave: (supplierData: any) => void;
  supplier?: Supplier;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ onClose, onSave, supplier }) => {
  const { refreshSuppliers } = useDataContext();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'products' | 'rating'>('info');
  const [newProduct, setNewProduct] = useState('');

  const initial = useMemo(() => ({
    name: supplier?.name || '',
    contact_person: supplier?.contact_person || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    productsSupplied: supplier?.productsSupplied || [],
    rating: supplier?.rating || 5
  }), [supplier]);

  const [formData, setFormData] = useState(initial);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // Le backend attend 'contactPerson' et non 'contact_person'
      const payload = {
        name: String(formData.name || '').trim(),
        contactPerson: String(formData.contact_person || '').trim(),
        email: String(formData.email || '').trim(),
        phone: String(formData.phone || '').trim(),
        address: String(formData.address || '').trim(),
        rating: Number(formData.rating) || 5,
        productsSupplied: formData.productsSupplied || [],
      };

      if (!payload.name) {
        setErrorMsg('Le nom du fournisseur est obligatoire.');
        setLoading(false);
        return;
      }

      console.log('📤 Envoi des données fournisseur:', payload);

      let result: any;
      if (supplier?.id) {
        result = await suppliersAPI.update(supplier.id, payload);
      } else {
        result = await suppliersAPI.create(payload);
      }

      console.log('📥 Réponse du serveur:', result);

      if (result?.success) {
        const data = result.data ?? { ...payload, id: supplier?.id };
        onSave(data);
        await refreshSuppliers();
        onClose();
      } else {
        setErrorMsg(result?.error || 'Erreur lors de la sauvegarde.');
      }
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      setErrorMsg(error?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const isValid = {
    name: formData.name.trim().length > 0,
    email: formData.email.trim().length > 0,
    phone: formData.phone.trim().length > 0,
  };
  const allValid = isValid.name && isValid.email && isValid.phone;

  const renderStars = (rating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, index) => (
      <button
        key={index}
        type="button"
        disabled={!interactive}
        onClick={() => interactive && handleInputChange('rating', index + 1)}
        className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
      >
        <Star
          className={`w-6 h-6 ${
            index < Math.floor(rating)
              ? 'text-amber-400 fill-current'
              : 'text-gray-300'
          }`}
        />
      </button>
    ));
  };

  const tabs = [
    { key: 'info' as const, label: 'Informations', icon: Building2 },
    { key: 'products' as const, label: 'Produits', icon: Package },
    { key: 'rating' as const, label: 'Évaluation', icon: Star },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Compact Header with Gradient */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  {supplier ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
                </h2>
                <p className="text-[11px] text-white/80">
                  {supplier ? 'Mettez à jour les informations' : 'Ajoutez un nouveau partenaire'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Compact Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-[11px] text-red-700">{errorMsg}</span>
            </div>
          )}

          {/* Tab: Informations */}
          {activeTab === 'info' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600 uppercase mb-1">
                    <Building2 className="w-3 h-3 text-teal-500" />
                    Nom de l'entreprise *
                    {isValid.name && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="Ex: Ciments du Sahel"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600 uppercase mb-1">
                    <User className="w-3 h-3 text-gray-500" />
                    Personne de contact
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => handleInputChange('contact_person', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="Nom du contact principal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600 uppercase mb-1">
                    <Mail className="w-3 h-3 text-orange-500" />
                    Email *
                    {isValid.email && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="contact@fournisseur.com"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600 uppercase mb-1">
                    <Phone className="w-3 h-3 text-green-500" />
                    Téléphone *
                    {isValid.phone && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="+221 33 123 45 67"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-600 uppercase mb-1">
                  <MapPin className="w-3 h-3 text-red-500" />
                  Adresse
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all resize-none"
                  placeholder="Adresse complète du fournisseur"
                />
              </div>
            </div>
          )}

          {/* Tab: Produits */}
          {activeTab === 'products' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addProduct())}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="Ex: Ciment, Sable, Gravier..."
                />
                <button
                  type="button"
                  onClick={addProduct}
                  className="px-3 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {formData.productsSupplied.length === 0 ? (
                <div className="p-6 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Aucun produit ajouté</p>
                  <p className="text-[10px] text-gray-400">Ajoutez les produits que ce fournisseur vous livre</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {formData.productsSupplied.map((product, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 hover:border-teal-200 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-teal-100 rounded-lg flex items-center justify-center">
                          <Package className="w-3 h-3 text-teal-600" />
                        </div>
                        <span className="text-[11px] font-medium text-gray-800">{product}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProduct(product)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Rating */}
          {activeTab === 'rating' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 text-center">
                <p className="text-[11px] text-gray-600 mb-2">Cliquez sur les étoiles pour noter ce fournisseur</p>
                <div className="flex items-center justify-center gap-0.5 mb-2">
                  {renderStars(formData.rating, true)}
                </div>
                <div className="text-xl font-bold text-amber-600">{formData.rating}/5</div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {formData.rating >= 4 ? 'Excellent fournisseur' :
                   formData.rating >= 3 ? 'Bon fournisseur' :
                   formData.rating >= 2 ? 'Fournisseur moyen' :
                   'Fournisseur à améliorer'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { stars: 5, label: 'Excellent', desc: 'Livraison rapide, qualité parfaite' },
                  { stars: 4, label: 'Très bien', desc: 'Bon rapport qualité-prix' },
                  { stars: 3, label: 'Correct', desc: 'Satisfait les besoins de base' },
                  { stars: 2, label: 'À améliorer', desc: 'Quelques problèmes occasionnels' },
                ].map((item) => (
                  <button
                    key={item.stars}
                    type="button"
                    onClick={() => handleInputChange('rating', item.stars)}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                      formData.rating === item.stars
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="flex">
                        {Array.from({ length: item.stars }, (_, i) => (
                          <Star key={i} className="w-3 h-3 text-amber-400 fill-current" />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold text-gray-800">{item.label}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Validation Status - Compact */}
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(['name', 'email', 'phone'] as const).map((field) => (
                  <div key={field} className={`flex items-center gap-1 text-[10px] ${isValid[field] ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {isValid[field] ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>{field === 'name' ? 'Nom' : field === 'email' ? 'Email' : 'Téléphone'}</span>
                  </div>
                ))}
              </div>
              {allValid && (
                <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">✓ Prêt</span>
              )}
            </div>
          </div>
        </form>

        {/* Footer - Compact */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !allValid}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                {supplier ? 'Modifier' : 'Créer le Fournisseur'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
