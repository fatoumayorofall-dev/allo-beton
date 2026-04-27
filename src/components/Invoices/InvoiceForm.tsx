import React, { useState, useMemo } from 'react';
import {
  X, FileText, Plus, Trash2, Calendar,
  User, Package, Calculator, AlertCircle, Building2
} from 'lucide-react';
import { Invoice, InvoiceItem } from '../../types';
import { useDataContext } from '../../contexts/DataContext';
import { invoicesAPI } from '../../services/mysql-api';

interface InvoiceFormProps {
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
  invoice?: Invoice;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ onClose, onSave, invoice }) => {
  const { customers } = useDataContext();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'client' | 'items' | 'summary'>('client');

  const [formData, setFormData] = useState({
    invoice_number: invoice?.invoice_number || `FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    customer_id: invoice?.customer_id || '',
    invoice_date: invoice?.invoice_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date?.split('T')[0] || '',
    tax_rate: Number(invoice?.tax_rate) || 18,
    notes: invoice?.notes || '',
    status: invoice?.status || 'draft',
    company_name: invoice?.company_name || 'ICOPS',
    company_rc: invoice?.company_rc || 'SN DKR 2022 B 765',
    company_ninea: invoice?.company_ninea || '009106073 2E2',
    company_phone: invoice?.company_phone || '+221 77 426 25 11',
    company_email: invoice?.company_email || 'icops@icops.sn',
    company_address: invoice?.company_address || 'VDN, Station Elton, Imm. Bilguiss, 1er étage',
  });

  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.items || [
      { id: '1', description: '', quantity: 0, unit: 'Tonne', unit_price: 0, line_total: 0 }
    ]
  );

  const selectedCustomer = useMemo(() => {
    return customers.find(c => String(c.id) === String(formData.customer_id));
  }, [customers, formData.customer_id]);

  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
    const taxAmount = subtotal * (formData.tax_rate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  }, [items, formData.tax_rate]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
        line_total: field === 'quantity' || field === 'unit_price'
          ? Number(field === 'quantity' ? value : updated[index].quantity) *
            Number(field === 'unit_price' ? value : updated[index].unit_price)
          : updated[index].line_total
      };
      return updated;
    });
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { id: String(Date.now()), description: '', quantity: 0, unit: 'Tonne', unit_price: 0, line_total: 0 }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
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
      if (items.every(item => !item.description || item.quantity === 0)) {
        setErrorMsg('Ajoutez au moins une ligne de facturation.');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        subtotal: calculations.subtotal,
        tax_amount: calculations.taxAmount,
        total_amount: calculations.total,
        items: items.filter(item => item.description && item.quantity > 0)
      };

      let result: any;
      if (invoice?.id) {
        result = await invoicesAPI.update(invoice.id, payload);
      } else {
        result = await invoicesAPI.create(payload);
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

  const isValid = {
    customer: !!formData.customer_id,
    items: items.some(item => item.description && item.quantity > 0),
    date: !!formData.invoice_date
  };
  const allValid = isValid.customer && isValid.items && isValid.date;

  const tabs = [
    { key: 'client' as const, label: 'Client', icon: User },
    { key: 'items' as const, label: 'Produits', icon: Package },
    { key: 'summary' as const, label: 'Résumé', icon: Calculator },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg shadow-orange-200">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {invoice ? 'Modifier la Facture' : 'Nouvelle Facture'}
              </h2>
              <p className="text-sm text-gray-500">{formData.invoice_number}</p>
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

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{errorMsg}</span>
            </div>
          )}

          {/* Tab: Client */}
          {activeTab === 'client' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Client *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => handleInputChange('customer_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.company ? `- ${customer.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{selectedCustomer.name}</div>
                    <div className="text-xs text-gray-500">
                      {selectedCustomer.email}{selectedCustomer.phone ? ` • ${selectedCustomer.phone}` : ''}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Date de facture *
                  </label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Taux TVA (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.tax_rate}
                    onChange={(e) => handleInputChange('tax_rate', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Items */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Lignes de facturation</span>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 md:col-span-5">
                        <label className="text-xs text-gray-500 mb-1 block">Désignation</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Ex: Transport d'argile..."
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Quantité</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Prix unitaire</label>
                        <input
                          type="number"
                          min="0"
                          value={item.unit_price || ''}
                          onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Total HT</label>
                        <div className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-sm font-semibold text-orange-700">
                          {formatMoney(Number(item.quantity) * Number(item.unit_price))}
                        </div>
                      </div>
                      <div className="col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Running Totals */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Sous-total HT</span>
                      <span className="font-medium">{formatMoney(calculations.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>TVA ({formData.tax_rate}%)</span>
                      <span className="font-medium">{formatMoney(calculations.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total TTC</span>
                      <span className="text-orange-600">{formatMoney(calculations.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-5">
              {/* Full recap */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-800">Récapitulatif</span>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Client</span>
                    <span className="font-medium">{selectedCustomer?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span className="font-medium">{formData.invoice_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Articles</span>
                    <span className="font-medium">{items.filter(i => i.description && i.quantity > 0).length}</span>
                  </div>
                  <div className="border-t border-orange-200 mt-2 pt-2 flex justify-between text-base font-bold">
                    <span>Total TTC</span>
                    <span className="text-orange-700">{formatMoney(calculations.total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Notes / Mentions</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                  placeholder="Arrêté la facture à la somme de..."
                />
              </div>

              {/* Company Info */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Informations Entreprise</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nom entreprise"
                  />
                  <input
                    type="text"
                    value={formData.company_rc}
                    onChange={(e) => handleInputChange('company_rc', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="RC"
                  />
                  <input
                    type="text"
                    value={formData.company_ninea}
                    onChange={(e) => handleInputChange('company_ninea', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="NINEA"
                  />
                  <input
                    type="text"
                    value={formData.company_phone}
                    onChange={(e) => handleInputChange('company_phone', e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Téléphone"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !allValid}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Sauvegarde...
                </>
              ) : (
                <>{invoice ? 'Modifier' : 'Créer la Facture'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
