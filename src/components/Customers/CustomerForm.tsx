import React, { useMemo, useState } from 'react';
import { X, User, Save } from 'lucide-react';
import { Customer } from '../../types';
import { createCustomer, updateCustomer } from '../../services/supabase';

interface CustomerFormProps {
  onClose: () => void;
  onSave: (customerData: any) => void;
  customer?: Customer;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onClose, onSave, customer }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initial = useMemo(() => {
    return {
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: (customer as any)?.address || '',
      city: (customer as any)?.city || '',
      company: customer?.company || '',
      creditLimit: Number((customer as any)?.creditLimit ?? (customer as any)?.credit_limit ?? 0),
      balance: Number((customer as any)?.balance ?? (customer as any)?.current_balance ?? 0),
      notes: (customer as any)?.notes || '',
    };
  }, [customer]);

  const [formData, setFormData] = useState(initial);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toSafeNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...formData,
        name: String(formData.name || '').trim(),
        email: String(formData.email || '').trim(),
        phone: String(formData.phone || '').trim(),
        address: String(formData.address || '').trim(),
        city: String(formData.city || '').trim(),
        company: String(formData.company || '').trim(),
        notes: String(formData.notes || '').trim(),
        creditLimit: toSafeNumber(formData.creditLimit),
        balance: toSafeNumber(formData.balance),
      };

      if (!payload.name) {
        setErrorMsg('Le nom du client est obligatoire.');
        setLoading(false);
        return;
      }

      let result: any;

      if (customer?.id) {
        // ✅ UPDATE
        result = await updateCustomer(customer.id, payload);

        if (result?.success) {
          // L’API corrigée renvoie data. Si jamais pas de data, on reconstruit.
          const updated = result.data ?? { ...payload, id: customer.id };
          onSave(updated);
          onClose();
        } else {
          setErrorMsg(result?.error || 'Erreur lors de la modification du client.');
        }
      } else {
        // ✅ CREATE
        result = await createCustomer(payload);

        if (result?.success) {
          const created = result.data ?? payload;
          onSave(created);
          onClose();
        } else {
          setErrorMsg(result?.error || 'Erreur lors de la création du client.');
        }
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      setErrorMsg(error?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {customer ? 'Modifier le Client' : 'Nouveau Client'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Jean Dupont"
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
                placeholder="jean.dupont@email.com"
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
                placeholder="77 123 45 67"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entreprise
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom de l'entreprise"
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
                Ville
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dakar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limite de crédit (FCFA)
              </label>
              <input
                type="number"
                min="0"
                value={formData.creditLimit}
                onChange={(e) => handleInputChange('creditLimit', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
              <p className="text-sm text-gray-500 mt-1">
                Montant maximum que le client peut devoir
              </p>
            </div>

            {customer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solde actuel (FCFA)
                </label>
                <input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => handleInputChange('balance', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Montant que le client doit actuellement
                </p>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Informations complémentaires..."
              />
            </div>
          </div>

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
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Sauvegarde...' : (customer ? 'Modifier' : 'Créer')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
