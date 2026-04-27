import React, { useState, useMemo } from 'react';
import {
  X, Truck, User, MapPin, Calendar, Package,
  AlertCircle, Clock, FileText
} from 'lucide-react';
import { DeliveryNote } from '../../types';
import { useDataContext } from '../../contexts/DataContext';
import { deliveryNotesAPI } from '../../services/mysql-api';

interface DeliveryNoteFormProps {
  onClose: () => void;
  onSave: (note: DeliveryNote) => void;
  deliveryNote?: DeliveryNote;
}

export const DeliveryNoteForm: React.FC<DeliveryNoteFormProps> = ({ onClose, onSave, deliveryNote }) => {
  const { customers } = useDataContext();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    delivery_number: deliveryNote?.delivery_number || `BT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    customer_id: deliveryNote?.customer_id || '',
    delivery_date: deliveryNote?.delivery_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    delivery_time: deliveryNote?.delivery_date
      ? new Date(deliveryNote.delivery_date).toTimeString().slice(0, 5)
      : new Date().toTimeString().slice(0, 5),
    driver_name: deliveryNote?.driver_name || '',
    vehicle_plate: deliveryNote?.vehicle_plate || '',
    product_type: deliveryNote?.product_type || '',
    loading_location: deliveryNote?.loading_location || '',
    delivery_location: deliveryNote?.delivery_location || '',
    weight_tons: deliveryNote?.weight_tons || 0,
    status: deliveryNote?.status || 'pending',
    notes: deliveryNote?.notes || '',
    invoice_number: deliveryNote?.invoice_number || '',
  });

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === formData.customer_id);
  }, [customers, formData.customer_id]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (!formData.customer_id) {
        setErrorMsg('Veuillez sélectionner un client.');
        setLoading(false);
        return;
      }

      if (!formData.driver_name || !formData.vehicle_plate) {
        setErrorMsg('Veuillez renseigner le chauffeur et le véhicule.');
        setLoading(false);
        return;
      }

      const fullDate = `${formData.delivery_date}T${formData.delivery_time}:00`;

      const payload = {
        ...formData,
        delivery_date: fullDate,
        weight_tons: Number(formData.weight_tons),
      };

      let result: any;
      if (deliveryNote?.id) {
        result = await deliveryNotesAPI.update(deliveryNote.id, payload);
      } else {
        result = await deliveryNotesAPI.create(payload);
      }

      if (result?.success) {
        onSave(result.data);
        onClose();
      } else {
        setErrorMsg(result?.error || 'Erreur lors de la sauvegarde.');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      setErrorMsg(error?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const productTypes = [
    'ARGILE SF18D', 'BÉTON 8/16', 'BÉTON 3/8',
    'SABLE', 'GRAVIER', 'CIMENT', 'AUTRE'
  ];

  const locations = [
    'CARRIÈRE SARAYA', 'USINE SINDIA', 'DÉPÔT DAKAR',
    'DÉPÔT THIÈS', 'CHANTIER DIAMNIADIO', 'AUTRE'
  ];

  const statusButtons = [
    { value: 'pending', label: 'En attente', active: 'bg-yellow-600', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    { value: 'in_transit', label: 'En transit', active: 'bg-orange-600', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    { value: 'delivered', label: 'Livré', active: 'bg-emerald-600', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    { value: 'cancelled', label: 'Annulé', active: 'bg-red-600', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {deliveryNote ? 'Modifier le Bon' : 'Nouveau Bon de Transport'}
              </h2>
              <p className="text-sm text-gray-500">{formData.delivery_number}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Client */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              <User className="w-4 h-4 text-emerald-500" />
              Client *
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => handleInputChange('customer_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              required
            >
              <option value="">Sélectionner un client</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.company ? `- ${customer.company}` : ''}
                </option>
              ))}
            </select>
            {selectedCustomer && (
              <div className="mt-2 p-2.5 bg-emerald-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                <p className="text-xs text-gray-500">{selectedCustomer.phone} • {selectedCustomer.email}</p>
              </div>
            )}
          </div>

          {/* Date / Heure / Facture */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Date *
              </label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => handleInputChange('delivery_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                Heure
              </label>
              <input
                type="time"
                value={formData.delivery_time}
                onChange={(e) => handleInputChange('delivery_time', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <FileText className="w-4 h-4 text-emerald-500" />
                N° Facture
              </label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="FAC-2025-XXXX"
              />
            </div>
          </div>

          {/* Chauffeur & Véhicule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <User className="w-4 h-4 text-emerald-500" />
                Chauffeur *
              </label>
              <input
                type="text"
                value={formData.driver_name}
                onChange={(e) => handleInputChange('driver_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Nom du chauffeur"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <Truck className="w-4 h-4 text-emerald-500" />
                Matricule Véhicule *
              </label>
              <input
                type="text"
                value={formData.vehicle_plate}
                onChange={(e) => handleInputChange('vehicle_plate', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all uppercase"
                placeholder="AA 1234 AB"
                required
              />
            </div>
          </div>

          {/* Produit & Poids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <Package className="w-4 h-4 text-emerald-500" />
                Type de Produit
              </label>
              <select
                value={formData.product_type}
                onChange={(e) => handleInputChange('product_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="">Sélectionner un produit</option>
                {productTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <Package className="w-4 h-4 text-emerald-500" />
                Poids (Tonnes)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.weight_tons || ''}
                onChange={(e) => handleInputChange('weight_tons', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Trajet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <MapPin className="w-4 h-4 text-emerald-500" />
                Lieu de Chargement
              </label>
              <select
                value={formData.loading_location}
                onChange={(e) => handleInputChange('loading_location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="">Sélectionner un lieu</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <MapPin className="w-4 h-4 text-teal-500" />
                Lieu de Livraison
              </label>
              <select
                value={formData.delivery_location}
                onChange={(e) => handleInputChange('delivery_location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="">Sélectionner un lieu</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Statut</label>
            <div className="flex flex-wrap gap-2">
              {statusButtons.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleInputChange('status', s.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.status === s.value
                      ? `${s.active} text-white`
                      : s.inactive
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
              placeholder="Observations, remarques..."
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <span>{deliveryNote ? 'Modifier' : 'Créer le Bon'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
