import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  X, User, Building2, Mail, Phone, MapPin,
  CreditCard, Wallet, FileText, CheckCircle2,
  AlertCircle, Plus, Trash2, Banknote, Package,
  ChevronDown, Shield, Percent, Globe,
  Save, UserPlus, Sparkles, TrendingUp,
  Navigation, Zap, UserCheck
} from 'lucide-react';
import { Customer, ClientQuota } from '../../types';
import { useDataContext } from '../../contexts/DataContext';
import { customersAPI, quotasAPI, productsAPI } from '../../services/mysql-api';
import { formatCurrency, getSettings, AppSettings } from '../../services/settings';

interface CustomerFormProps {
  onClose: () => void;
  onSave?: (customerData: any) => void;
  onCustomerCreated?: (customerData: any) => void;
  customer?: Customer;
  editingCustomer?: Customer;
}

const PRODUCT_TYPES = ['beton', 'carriere'];
const DEFAULT_VARIANTS: Record<string, string[]> = {
  beton: ['3/8', '8/16'],
  carriere: ['Gravier 5/15', 'Gravier 15/25', 'Sable fin', 'Sable grossier', 'Tout-venant', 'Latérite', 'Basalte'],
};

/* ═══════════════════════════════════════════════════
   Section Wrapper – carte pliable avec icône
   ═══════════════════════════════════════════════════ */
const Section: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  iconColor?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}> = ({ icon: Icon, title, subtitle, iconColor = 'text-orange-600 bg-orange-50', collapsible = false, defaultOpen = true, children, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  const bgClass = iconColor.split(' ').find(c => c.startsWith('bg-')) || 'bg-orange-50';
  const textClass = iconColor.split(' ').find(c => c.startsWith('text-')) || 'text-orange-600';

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
      <button
        type="button"
        onClick={() => collapsible && setOpen(!open)}
        className={`w-full flex items-center gap-3 px-5 py-4 ${collapsible ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'} transition-colors`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bgClass}`}>
          <Icon className={`w-[18px] h-[18px] ${textClass}`} />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {badge}
        {collapsible && (
          <div className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        )}
      </button>
      {(!collapsible || open) && (
        <div className="px-5 pb-5 space-y-4">
          <div className="border-t border-gray-50 -mx-5 mb-1" />
          {children}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   Input Field Label
   ═══════════════════════════════════════════════════ */
const InputField: React.FC<{
  icon?: React.ElementType;
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}> = ({ icon: Icon, label, required, children, hint }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
      {label}
      {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-gray-400 mt-1.5">{hint}</p>}
  </div>
);

const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-200 outline-none";
const inputClassLg = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-semibold text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-200 outline-none";

/* ═══════════════════════════════════════════════════
   CustomerForm – Composant principal
   ═══════════════════════════════════════════════════ */
export const CustomerForm: React.FC<CustomerFormProps> = ({ 
  onClose, 
  onSave, 
  onCustomerCreated,
  customer: customerProp, 
  editingCustomer 
}) => {
  // Support both: customer ou editingCustomer
  const customer = customerProp || editingCustomer;
  // Support both: onSave ou onCustomerCreated
  const handleSave = onSave || onCustomerCreated || (() => {});
  
  const { refreshCustomers } = useDataContext();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [_successMsg] = useState<string | null>(null);
  const [quotas, setQuotas] = useState<ClientQuota[]>([]);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [showQuotaForm, setShowQuotaForm] = useState(false);

  // Quota form
  const [newQuotaProductType, setNewQuotaProductType] = useState<string>('beton');
  const [newQuotaVariant, setNewQuotaVariant] = useState<string>('');
  const [newQuotaAmount, setNewQuotaAmount] = useState<string>('');
  const [newQuotaNotes, setNewQuotaNotes] = useState<string>('');
  const [productVariants, setProductVariants] = useState<Record<string, string[]>>(DEFAULT_VARIANTS);

  // Deposit
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  const [prepaidBalance, setPrepaidBalance] = useState(Number(customer?.prepaidBalance ?? customer?.prepaid_balance ?? 0));
  const [initialPrepaidAmount, setInitialPrepaidAmount] = useState<string>('');

  // Settings
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  const initial = useMemo(() => ({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    city: customer?.city || '',
    postal_code: customer?.postal_code || '',
    country: customer?.country || 'Sénégal',
    company: customer?.company || '',
    tax_number: customer?.tax_number || '',
    creditLimit: Number(customer?.creditLimit ?? customer?.credit_limit ?? 0),
    balance: Number(customer?.balance ?? customer?.current_balance ?? 0),
    payment_terms: Number(customer?.payment_terms ?? 30),
    notes: customer?.notes || '',
    tva_exempt: !!customer?.tva_exempt,
    is_reseller: !!customer?.is_reseller,
    wholesale_discount: Number(customer?.wholesale_discount ?? 0),
    customer_type: customer?.customerType || customer?.customer_type || 'simple',
    responsable_commercial: customer?.responsable_commercial || customer?.responsableCommercial || '',
    gps_lat: customer?.gps_lat ?? customer?.gpsLat ?? '',
    gps_lng: customer?.gps_lng ?? customer?.gpsLng ?? '',
  }), [customer]);

  const [formData, setFormData] = useState(initial);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMsg(null);
  }, []);

  const toSafeNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const formatMoney = useCallback((amount: number): string => {
    return formatCurrency(amount, appSettings || undefined);
  }, [appSettings]);

  // ─── Effects ───────────────────────────────────
  useEffect(() => { getSettings().then(setAppSettings).catch(() => {}); }, []);
  useEffect(() => { loadProductTypes(); }, []);
  useEffect(() => { setNewQuotaVariant(''); }, [newQuotaProductType]);
  useEffect(() => { if (customer?.id) loadQuotas(); }, [customer?.id]);

  const loadProductTypes = async () => {
    try {
      const result = await productsAPI.getTypes();
      if (result.success && result.data?.variants) setProductVariants(result.data.variants);
    } catch (e) { console.error('Erreur chargement types:', e); }
  };

  const loadQuotas = async () => {
    if (!customer?.id) return;
    setQuotaLoading(true);
    try {
      const result = await quotasAPI.getAll({ customer_id: customer.id });
      if (result.success) setQuotas(result.data || []);
    } catch (e) { console.error('Erreur quotas:', e); }
    finally { setQuotaLoading(false); }
  };

  const handleAddQuota = async () => {
    if (!customer?.id) { setErrorMsg('Sauvegardez d\'abord le client.'); return; }
    if (!newQuotaProductType || !newQuotaVariant) { setErrorMsg('Sélectionnez un produit et une variante.'); return; }
    if (!newQuotaAmount || Number(newQuotaAmount) <= 0) { setErrorMsg('Entrez une quantité valide.'); return; }

    setQuotaLoading(true);
    setErrorMsg(null);
    try {
      const result = await quotasAPI.create({
        customer_id: customer.id,
        product_type: newQuotaProductType,
        product_variant: newQuotaVariant,
        quota_initial: Number(newQuotaAmount),
        notes: newQuotaNotes || null,
      });
      if (result.success) {
        setShowQuotaForm(false);
        setNewQuotaProductType('beton');
        setNewQuotaVariant('');
        setNewQuotaAmount('');
        setNewQuotaNotes('');
        await loadQuotas();
      } else {
        setErrorMsg(result.error || 'Erreur lors de la création du quota.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erreur lors de la création du quota.');
    } finally { setQuotaLoading(false); }
  };

  const handleDeleteQuota = async (id: string) => {
    if (!confirm('Supprimer ce quota ?')) return;
    try { await quotasAPI.delete(id); await loadQuotas(); }
    catch (e) { console.error('Erreur suppression quota:', e); }
  };

  const handleDeposit = async () => {
    if (!customer?.id || !depositAmount || Number(depositAmount) <= 0) return;
    setDepositLoading(true);
    setDepositSuccess(null);
    setErrorMsg(null);
    try {
      const result = await customersAPI.deposit(customer.id, Number(depositAmount), depositNotes);
      if (result.success) {
        const newBalance = Number(result.data?.newBalance ?? 0);
        setPrepaidBalance(newBalance);
        setDepositSuccess(`Dépôt effectué ! Nouveau solde : ${formatMoney(newBalance)}`);
        setDepositAmount('');
        setDepositNotes('');
        await refreshCustomers();
        setTimeout(() => { setShowDepositModal(false); setDepositSuccess(null); }, 2500);
      } else {
        setErrorMsg(result.error || 'Erreur lors du dépôt');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erreur lors du dépôt');
    } finally { setDepositLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        ...formData,
        name: String(formData.name || '').trim(),
        email: String(formData.email || '').trim(),
        phone: String(formData.phone || '').trim(),
        address: String(formData.address || '').trim(),
        city: String(formData.city || '').trim(),
        postal_code: String(formData.postal_code || '').trim(),
        country: String(formData.country || '').trim(),
        company: String(formData.company || '').trim(),
        tax_number: String(formData.tax_number || '').trim(),
        notes: String(formData.notes || '').trim(),
        creditLimit: toSafeNumber(formData.creditLimit),
        balance: toSafeNumber(formData.balance),
        payment_terms: toSafeNumber(formData.payment_terms),
        tva_exempt: formData.tva_exempt ? 1 : 0,
        is_reseller: formData.is_reseller ? 1 : 0,
        wholesale_discount: toSafeNumber(formData.wholesale_discount),
        customer_type: formData.customer_type || 'simple',
        responsable_commercial: String(formData.responsable_commercial || '').trim() || null,
        gps_lat: formData.gps_lat !== '' && formData.gps_lat != null ? toSafeNumber(formData.gps_lat) : null,
        gps_lng: formData.gps_lng !== '' && formData.gps_lng != null ? toSafeNumber(formData.gps_lng) : null,
      };

      if (formData.customer_type === 'quotataire') {
        payload.prepaidBalance = !customer?.id ? toSafeNumber(initialPrepaidAmount) : prepaidBalance;
      }

      if (!payload.name) { setErrorMsg('Le nom du client est obligatoire.'); setLoading(false); return; }

      let result: any;
      if (customer?.id) {
        result = await customersAPI.update(customer.id, payload);
      } else {
        result = await customersAPI.create(payload);
      }

      if (result?.success) {
        handleSave(result.data ?? { ...payload, id: customer?.id });
        await refreshCustomers();
        onClose();
      } else {
        setErrorMsg(result?.error || 'Erreur lors de la sauvegarde.');
      }
    } catch (error: any) {
      setErrorMsg(error?.message || 'Erreur lors de la sauvegarde.');
    } finally { setLoading(false); }
  };

  const allValid = formData.name.trim().length > 0;
  const availableVariants = productVariants[newQuotaProductType] || [];

  const CUSTOMER_TYPES = [
    {
      value: 'occasionnel',
      label: 'Occasionnel',
      desc: 'Achat ponctuel, cash',
      icon: Zap,
      gradient: 'from-cyan-500 to-sky-600',
      ring: 'ring-cyan-300',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      text: 'text-cyan-700',
    },
    {
      value: 'simple',
      label: 'Simple',
      desc: 'Client régulier',
      icon: User,
      gradient: 'from-slate-500 to-gray-600',
      ring: 'ring-gray-300',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
    },
    {
      value: 'quotataire',
      label: 'Quotataire',
      desc: 'Wallet prépayé',
      icon: Package,
      gradient: 'from-violet-500 to-purple-600',
      ring: 'ring-violet-300',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      text: 'text-violet-700',
    },
    {
      value: 'revendeur',
      label: 'Revendeur',
      desc: 'Grossiste & remises',
      icon: TrendingUp,
      gradient: 'from-amber-500 to-orange-600',
      ring: 'ring-amber-300',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
    },
  ];

  const selectedType = CUSTOMER_TYPES.find(t => t.value === formData.customer_type) || CUSTOMER_TYPES[0];

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-gradient-to-b from-gray-50 to-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden border border-gray-200/50"
      >
        {/* ═══ Header ═══ */}
        <div className={`relative bg-gradient-to-r ${selectedType.gradient} px-6 py-5 flex items-center justify-between overflow-hidden`}>
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              {customer ? (
                <span className="text-xl font-bold text-white">
                  {formData.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              ) : (
                <UserPlus className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {customer ? 'Modifier le client' : 'Nouveau client'}
              </h2>
              <p className="text-white/70 text-sm">
                {customer ? formData.name || 'Mise à jour des informations' : 'Remplissez les informations ci-dessous'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative z-10 w-9 h-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ═══ Body ═══ */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
          {/* Alerts */}
          {errorMsg && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-800 flex-1">{errorMsg}</p>
              <button type="button" onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {_successMsg && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-700">{_successMsg}</p>
            </div>
          )}

          {/* ─── Type de Client ─── */}
          <Section icon={Sparkles} title="Type de client" subtitle="Définit les fonctionnalités disponibles" iconColor="text-indigo-600 bg-indigo-50">
            {formData.customer_type === 'occasionnel' && (
              <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl">
                <p className="text-xs font-semibold text-cyan-700">💡 Client occasionnel : paiement comptant uniquement, pas de crédit ni remise. Interface simplifiée.</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CUSTOMER_TYPES.map((type) => {
                const isActive = formData.customer_type === type.value;
                const TypeIcon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      handleInputChange('customer_type', type.value);
                      handleInputChange('is_reseller', type.value === 'revendeur');
                    }}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 ${
                      isActive
                        ? `${type.bg} ${type.border} ring-2 ${type.ring} scale-[1.02]`
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className={`w-4 h-4 ${type.text}`} />
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isActive ? `bg-gradient-to-br ${type.gradient} text-white shadow-lg` : 'bg-gray-100 text-gray-400'
                    }`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-bold ${isActive ? type.text : 'text-gray-700'}`}>{type.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{type.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ─── Informations Générales ─── */}
          <Section icon={User} title="Informations générales" subtitle="Coordonnées du client" iconColor="text-orange-600 bg-orange-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField icon={User} label="Nom complet" required>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={inputClass}
                  placeholder="Ex: Amadou Diallo"
                  required
                  autoFocus={!customer}
                />
              </InputField>

              <InputField icon={Building2} label="Entreprise">
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className={inputClass}
                  placeholder="Nom de la société"
                />
              </InputField>

              <InputField icon={Phone} label="Téléphone">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={inputClass}
                  placeholder="+221 77 123 45 67"
                />
              </InputField>

              <InputField icon={Mail} label="Email">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={inputClass}
                  placeholder="client@email.com"
                />
              </InputField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <InputField icon={MapPin} label="Adresse">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className={inputClass}
                    placeholder="Rue, quartier..."
                  />
                </InputField>
              </div>
              <InputField icon={Globe} label="Ville">
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={inputClass}
                  placeholder="Dakar"
                />
              </InputField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InputField icon={MapPin} label="Code postal">
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  className={inputClass}
                  placeholder="12000"
                />
              </InputField>
              <InputField icon={Globe} label="Pays">
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className={inputClass}
                  placeholder="Sénégal"
                />
              </InputField>
              <InputField icon={FileText} label="N° fiscal / NINEA">
                <input
                  type="text"
                  value={formData.tax_number}
                  onChange={(e) => handleInputChange('tax_number', e.target.value)}
                  className={inputClass}
                  placeholder="NINEA..."
                />
              </InputField>
            </div>
          </Section>

          {/* ─── Responsable commercial & GPS (sauf occasionnel) ─── */}
          {formData.customer_type !== 'occasionnel' && (
            <Section
              icon={UserCheck}
              title="Responsable & Localisation"
              subtitle="Commercial assigné et position GPS"
              iconColor="text-indigo-600 bg-indigo-50"
              collapsible
              defaultOpen={!!(formData.responsable_commercial || formData.gps_lat)}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <InputField icon={UserCheck} label="Responsable commercial">
                    <input
                      type="text"
                      value={formData.responsable_commercial}
                      onChange={(e) => handleInputChange('responsable_commercial', e.target.value)}
                      className={inputClass}
                      placeholder="Nom du commercial..."
                    />
                  </InputField>
                </div>
                <InputField icon={Navigation} label="Latitude GPS">
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.gps_lat}
                    onChange={(e) => handleInputChange('gps_lat', e.target.value)}
                    className={inputClass}
                    placeholder="14.6937"
                  />
                </InputField>
                <InputField icon={Navigation} label="Longitude GPS">
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.gps_lng}
                    onChange={(e) => handleInputChange('gps_lng', e.target.value)}
                    className={inputClass}
                    placeholder="-17.4441"
                  />
                </InputField>
              </div>
            </Section>
          )}

          {/* ─── Crédit / Solde Prépayé (pas pour occasionnel) ─── */}
          {formData.customer_type !== 'occasionnel' && (
          <>
          {formData.customer_type === 'quotataire' ? (
            <Section
              icon={Banknote}
              title="Solde Prépayé"
              subtitle={customer ? 'Gérez le solde du client quotataire' : 'Définissez le montant initial'}
              iconColor="text-violet-600 bg-violet-50"
              badge={
                customer ? (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    prepaidBalance > 50000 ? 'bg-emerald-100 text-emerald-700' :
                    prepaidBalance > 0 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {formatMoney(prepaidBalance)}
                  </span>
                ) : undefined
              }
            >
              {!customer ? (
                /* Nouveau client quotataire */
                <div className="space-y-4">
                  <InputField icon={Banknote} label="Montant initial (FCFA)" hint="Ce montant sera crédité au solde prépayé du client à sa création.">
                    <input
                      type="number"
                      value={initialPrepaidAmount}
                      onChange={(e) => setInitialPrepaidAmount(e.target.value)}
                      placeholder="Ex: 500 000"
                      min="0"
                      step="10000"
                      className={inputClassLg}
                    />
                  </InputField>
                  <div className="flex flex-wrap gap-2">
                    {[100000, 250000, 500000, 1000000, 2000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setInitialPrepaidAmount(val.toString())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          initialPrepaidAmount === val.toString()
                            ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                            : 'bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100'
                        }`}
                      >
                        {formatMoney(val)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Client quotataire existant */
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100">
                    <div>
                      <p className="text-xs font-medium text-violet-500 uppercase tracking-wider">Solde disponible</p>
                      <p className={`text-3xl font-black mt-1 ${prepaidBalance > 0 ? 'text-violet-700' : 'text-gray-300'}`}>
                        {formatMoney(prepaidBalance)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {prepaidBalance <= 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                          <AlertCircle className="w-3 h-3" /> Épuisé
                        </span>
                      )}
                      {prepaidBalance > 0 && prepaidBalance < 50000 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-600 text-xs font-bold rounded-full">
                          <AlertCircle className="w-3 h-3" /> Faible
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowDepositModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-200 transition-all duration-200 active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter un dépôt
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Section>
          ) : (
            <Section icon={CreditCard} title="Gestion du Crédit" subtitle="Limite de crédit et dette actuelle" iconColor="text-orange-600 bg-orange-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <InputField icon={CreditCard} label="Limite de crédit (FCFA)" hint="Montant maximum autorisé en dette">
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={formData.creditLimit}
                      onChange={(e) => handleInputChange('creditLimit', e.target.value)}
                      className={inputClassLg}
                      placeholder="0"
                    />
                  </InputField>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {[100000, 250000, 500000, 1000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleInputChange('creditLimit', val)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          toSafeNumber(formData.creditLimit) === val
                            ? 'bg-orange-600 text-white'
                            : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-50'
                        }`}
                      >
                        {formatMoney(val)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <InputField icon={Wallet} label={customer ? 'Dette actuelle (FCFA)' : 'Dette initiale (FCFA)'} hint={customer ? 'Encours actuel du client' : 'Optionnel : dette au départ'}>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.balance}
                      onChange={(e) => handleInputChange('balance', e.target.value)}
                      className={inputClassLg}
                      placeholder="0"
                    />
                  </InputField>

                  {toSafeNumber(formData.creditLimit) > 0 && toSafeNumber(formData.balance) > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500 font-medium">Utilisation</span>
                        <span className={`font-bold ${
                          (toSafeNumber(formData.balance) / toSafeNumber(formData.creditLimit)) > 0.8 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {Math.round((toSafeNumber(formData.balance) / toSafeNumber(formData.creditLimit)) * 100)}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (toSafeNumber(formData.balance) / toSafeNumber(formData.creditLimit)) > 0.8
                              ? 'bg-gradient-to-r from-red-400 to-red-500'
                              : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (toSafeNumber(formData.balance) / toSafeNumber(formData.creditLimit)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}
          </>
          )}

          {/* ─── Paramètres Fiscaux (pas pour occasionnel) ─── */}
          {formData.customer_type !== 'occasionnel' && (
          <Section
            icon={Shield}
            title="Paramètres Fiscaux"
            subtitle="TVA, remises et options avancées"
            iconColor="text-emerald-600 bg-emerald-50"
            collapsible
            defaultOpen={!!(formData.tva_exempt || formData.is_reseller)}
          >
            <div className="space-y-3">
              {/* TVA */}
              <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors duration-200 ${
                formData.tva_exempt ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    formData.tva_exempt ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    <Percent className={`w-4 h-4 ${formData.tva_exempt ? 'text-emerald-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Exonéré de TVA</p>
                    <p className="text-xs text-gray-400">La TVA ne sera pas appliquée sur les ventes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('tva_exempt', !formData.tva_exempt)}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${
                    formData.tva_exempt ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                    formData.tva_exempt ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Revendeur */}
              <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors duration-200 ${
                formData.is_reseller ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    formData.is_reseller ? 'bg-amber-100' : 'bg-gray-100'
                  }`}>
                    <TrendingUp className={`w-4 h-4 ${formData.is_reseller ? 'text-amber-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Revendeur / Grossiste</p>
                    <p className="text-xs text-gray-400">Remise automatique sur les ventes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('is_reseller', !formData.is_reseller)}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${
                    formData.is_reseller ? 'bg-amber-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                    formData.is_reseller ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Remise Grossiste */}
              {formData.is_reseller && (
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 ml-4">
                  <InputField icon={Percent} label="Remise grossiste (%)" hint={`Réduction de ${formData.wholesale_discount || 0}% appliquée automatiquement`}>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.wholesale_discount}
                        onChange={(e) => handleInputChange('wholesale_discount', e.target.value)}
                        min="0"
                        max="50"
                        step="0.5"
                        className={inputClass + ' pr-10'}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-500">%</span>
                    </div>
                  </InputField>
                  <div className="flex gap-2 mt-3">
                    {[5, 10, 15, 20].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleInputChange('wholesale_discount', v)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                          toSafeNumber(formData.wholesale_discount) === v
                            ? 'bg-amber-600 text-white'
                            : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50'
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Délai de paiement */}
              <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                <InputField icon={CreditCard} label="Délai de paiement (jours)" hint="Nombre de jours accordés pour régler les factures">
                  <input
                    type="number"
                    value={formData.payment_terms}
                    onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                    min="0"
                    max="365"
                    step="1"
                    className={inputClass}
                    placeholder="30"
                  />
                </InputField>
                <div className="flex gap-2 mt-3">
                  {[0, 15, 30, 45, 60, 90].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInputChange('payment_terms', v)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                        toSafeNumber(formData.payment_terms) === v
                          ? 'bg-orange-600 text-white'
                          : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-50'
                      }`}
                    >
                      {v}j
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>
          )}

          {/* ─── Notes ─── */}
          <Section icon={FileText} title="Notes" subtitle="Informations internes" iconColor="text-gray-500 bg-gray-100" collapsible defaultOpen={!!formData.notes}>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className={inputClass + ' resize-none'}
              placeholder="Informations complémentaires, préférences du client, historique des interactions..."
            />
            <p className="text-[11px] text-gray-400">Ces notes ne sont visibles que par votre équipe.</p>
          </Section>

          {/* ─── Quotas (client existant seulement) ─── */}
          {customer?.id && (
            <Section
              icon={Package}
              title="Quotas sur Produits"
              subtitle="Quotas définis pour ce client"
              iconColor="text-violet-600 bg-violet-50"
              collapsible
              defaultOpen={quotas.length > 0}
              badge={quotas.length > 0 ? (
                <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">
                  {quotas.length}
                </span>
              ) : undefined}
            >
              {/* Add Quota Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowQuotaForm(!showQuotaForm)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-violet-200 transition-all duration-200 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un quota
                </button>
              </div>

              {/* Quota Form */}
              {showQuotaForm && (
                <div className="p-5 bg-violet-50/50 border border-violet-200 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-violet-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Nouveau Quota
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    {PRODUCT_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewQuotaProductType(type)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          newQuotaProductType === type
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300'
                        }`}
                      >
                        {type === 'beton' ? 'Béton' : 'Carrière'}
                      </button>
                    ))}
                  </div>

                  <InputField label="Variante" required>
                    <select
                      value={newQuotaVariant}
                      onChange={(e) => setNewQuotaVariant(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">-- Sélectionner une variante --</option>
                      {availableVariants.map((v) => (
                        <option key={v} value={v}>
                          {newQuotaProductType === 'beton' ? `Béton ${v}` : v}
                        </option>
                      ))}
                    </select>
                  </InputField>

                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Quantité (Tonnes)" required>
                      <input
                        type="number"
                        value={newQuotaAmount}
                        onChange={(e) => setNewQuotaAmount(e.target.value)}
                        placeholder="100"
                        min="0.5"
                        step="0.5"
                        className={inputClass}
                      />
                    </InputField>
                    <InputField label="Notes">
                      <input
                        type="text"
                        value={newQuotaNotes}
                        onChange={(e) => setNewQuotaNotes(e.target.value)}
                        placeholder="Contrat annuel..."
                        className={inputClass}
                      />
                    </InputField>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAddQuota}
                      disabled={quotaLoading || !newQuotaVariant || !newQuotaAmount}
                      className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {quotaLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {quotaLoading ? 'Création...' : 'Confirmer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuotaForm(false)}
                      className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Quotas List */}
              {quotaLoading && !showQuotaForm ? (
                <div className="flex flex-col items-center py-10">
                  <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400 mt-3">Chargement des quotas...</p>
                </div>
              ) : quotas.length === 0 && !showQuotaForm ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Package className="w-8 h-8 text-violet-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Aucun quota défini</p>
                  <p className="text-xs text-gray-400 mt-1">Cliquez sur « Ajouter un quota » pour commencer</p>
                </div>
              ) : quotas.length > 0 && (
                <div className="space-y-3">
                  {/* Global Summary */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Quotas', value: quotas.length.toString(), color: 'text-violet-700 bg-violet-50 border-violet-100' },
                      { label: 'Initial', value: `${quotas.reduce((s, q) => s + Number(q.quota_initial || 0), 0).toLocaleString('fr-FR')} T`, color: 'text-orange-700 bg-orange-50 border-orange-100' },
                      { label: 'Consommé', value: `${quotas.reduce((s, q) => s + Number(q.quota_consumed || 0), 0).toLocaleString('fr-FR')} T`, color: 'text-orange-600 bg-orange-50 border-orange-100' },
                      { label: 'Restant', value: `${quotas.reduce((s, q) => s + Number(q.quota_remaining || 0), 0).toLocaleString('fr-FR')} T`, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                    ].map(stat => (
                      <div key={stat.label} className={`p-3 rounded-xl border text-center ${stat.color}`}>
                        <p className="text-lg font-black">{stat.value}</p>
                        <p className="text-[10px] uppercase tracking-wider font-semibold opacity-60">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quota Cards */}
                  {quotas.map((q) => {
                    const progress = q.quota_initial > 0 ? (q.quota_consumed / q.quota_initial) * 100 : 0;
                    const isCompleted = q.status === 'completed';
                    const isCritical = q.quota_remaining > 0 && q.quota_remaining < q.quota_initial * 0.1;
                    const isLow = q.quota_remaining > 0 && q.quota_remaining < q.quota_initial * 0.2;

                    return (
                      <div key={q.id} className={`p-4 bg-white rounded-2xl border border-gray-100 shadow-sm ${isCompleted ? 'opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              q.product_type === 'beton' ? 'bg-orange-100 text-orange-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {q.product_type === 'beton' ? 'Béton' : 'Carrière'} {q.product_variant}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {new Date(q.created_at || '').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isCompleted ? 'bg-gray-100 text-gray-500' :
                              isCritical ? 'bg-red-100 text-red-600' :
                              isLow ? 'bg-amber-100 text-amber-600' :
                              'bg-emerald-100 text-emerald-600'
                            }`}>
                              {isCompleted ? 'Épuisé' : isCritical ? 'Critique' : isLow ? 'Bas' : 'Actif'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuota(q.id)}
                              className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center p-2 bg-orange-50/50 rounded-xl">
                            <p className="text-xs text-orange-500 font-medium">Initial</p>
                            <p className="text-sm font-black text-orange-700">{Number(q.quota_initial).toLocaleString('fr-FR')} T</p>
                          </div>
                          <div className="text-center p-2 bg-orange-50/50 rounded-xl">
                            <p className="text-xs text-orange-500 font-medium">Consommé</p>
                            <p className="text-sm font-black text-orange-600">{Number(q.quota_consumed).toLocaleString('fr-FR')} T</p>
                          </div>
                          <div className={`text-center p-2 rounded-xl ${
                            isCompleted ? 'bg-gray-50' : isCritical ? 'bg-red-50/50' : isLow ? 'bg-amber-50/50' : 'bg-emerald-50/50'
                          }`}>
                            <p className={`text-xs font-medium ${
                              isCompleted ? 'text-gray-400' : isCritical ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-emerald-500'
                            }`}>Restant</p>
                            <p className={`text-sm font-black ${
                              isCompleted ? 'text-gray-400' : isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
                            }`}>{Number(q.quota_remaining).toLocaleString('fr-FR')} T</p>
                          </div>
                        </div>

                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              progress >= 90 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                              progress >= 70 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                              'bg-gradient-to-r from-violet-400 to-purple-500'
                            }`}
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 text-right mt-1">{Math.round(progress)}% utilisé</p>

                        {q.notes && (
                          <p className="text-xs text-gray-500 italic mt-2 p-2 bg-gray-50 rounded-xl">
                            {q.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          )}
        </div>

        {/* ═══ Footer ═══ */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
          <p className="text-xs text-gray-400 hidden sm:block">
            {customer ? `ID: ${customer.id?.toString().slice(0, 8)}...` : '* Champ obligatoire'}
          </p>
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 text-sm font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !allValid}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-300 shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none bg-gradient-to-r ${selectedType.gradient} hover:shadow-xl`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {customer ? 'Enregistrer' : 'Créer le client'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ═══ Modal de Dépôt ═══ */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            {/* Deposit Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Ajouter un dépôt</h3>
                  <p className="text-white/60 text-sm">Recharger le solde prépayé</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowDepositModal(false); setDepositAmount(''); setDepositNotes(''); }}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 rounded-xl transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {depositSuccess ? (
                <div className="flex flex-col items-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <p className="text-center text-emerald-700 font-bold text-lg">{depositSuccess}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 bg-violet-50 rounded-2xl">
                    <span className="text-sm text-violet-600 font-medium">Solde actuel</span>
                    <span className="text-lg font-black text-violet-800">{formatMoney(prepaidBalance)}</span>
                  </div>

                  <InputField icon={Banknote} label="Montant du dépôt (FCFA)" required>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Ex: 100 000"
                      min="1000"
                      step="1000"
                      className={inputClassLg}
                      autoFocus
                    />
                  </InputField>

                  <div className="flex flex-wrap gap-2">
                    {[50000, 100000, 200000, 500000, 1000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setDepositAmount(val.toString())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          depositAmount === val.toString()
                            ? 'bg-violet-600 text-white shadow-md'
                            : 'bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100'
                        }`}
                      >
                        {formatMoney(val)}
                      </button>
                    ))}
                  </div>

                  <InputField icon={FileText} label="Notes (optionnel)">
                    <input
                      type="text"
                      value={depositNotes}
                      onChange={(e) => setDepositNotes(e.target.value)}
                      placeholder="Paiement espèces, chèque n°..."
                      className={inputClass}
                    />
                  </InputField>

                  {depositAmount && Number(depositAmount) > 0 && (
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <span className="text-sm text-emerald-600 font-medium">Nouveau solde</span>
                      <span className="text-lg font-black text-emerald-700">{formatMoney(prepaidBalance + Number(depositAmount))}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {!depositSuccess && (
              <div className="flex gap-3 px-6 pb-6">
                <button
                  type="button"
                  onClick={() => { setShowDepositModal(false); setDepositAmount(''); setDepositNotes(''); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-semibold text-sm transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeposit}
                  disabled={depositLoading || !depositAmount || Number(depositAmount) <= 0}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {depositLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Banknote className="w-4 h-4" />
                  )}
                  {depositLoading ? 'En cours...' : 'Confirmer le dépôt'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
