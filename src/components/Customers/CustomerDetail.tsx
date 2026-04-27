import React, { useMemo, useState, useEffect } from 'react';
import {
  X, User, Mail, Phone, MapPin, Building2, CreditCard, ShoppingCart,
  Wallet, FileText, BarChart3, Banknote, Download, AlertCircle, CheckCircle2,
  Percent, Receipt, TrendingUp, Calendar, Clock, History, ArrowRight, Package,
  Shield, ChevronDown, Globe, Zap, Navigation, UserCheck
} from 'lucide-react';
import { Customer, ClientQuota } from '../../types';
import { useDataContext } from '../../contexts/DataContext';
import { formatCurrency, getSettings, AppSettings } from '../../services/settings';
import { quotasAPI, customersAPI } from '../../services/mysql-api';

/* ═══ Types ═══ */
interface DepositAllocation {
  saleId: string;
  saleNumber: string;
  saleDate: string;
  saleTotal: number;
  productDetails: string;
  amountAllocated: number;
  previousBalance: number;
  newBalance: number;
}

interface ClientDeposit {
  id: number;
  deposit_number: string;
  amount: number;
  amount_to_debt: number;
  amount_to_prepaid: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  previous_debt: number;
  new_debt: number;
  previous_prepaid: number;
  new_prepaid: number;
  created_at: string;
  allocations: DepositAllocation[];
}

interface CustomerDetailProps {
  customer: Customer;
  onClose: () => void;
  onEdit?: () => void;
}

/* ═══ Section Wrapper ═══ */
const Section: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  iconColor?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon: Icon, title, subtitle, iconColor = 'text-orange-600 bg-orange-50', collapsible = false, defaultOpen = true, badge, action, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const bgClass = iconColor.split(' ').find(c => c.startsWith('bg-')) || 'bg-orange-50';
  const textClass = iconColor.split(' ').find(c => c.startsWith('text-')) || 'text-orange-600';

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
      <div
        onClick={() => collapsible && setOpen(!open)}
        className={`flex items-center gap-3 px-5 py-4 ${collapsible ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bgClass}`}>
          <Icon className={`w-[18px] h-[18px] ${textClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {badge}
        {action}
        {collapsible && (
          <div className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        )}
      </div>
      {(!collapsible || open) && (
        <div className="px-5 pb-5 space-y-4">
          <div className="border-t border-gray-50 -mx-5 mb-1" />
          {children}
        </div>
      )}
    </div>
  );
};

/* ═══ Main Component ═══ */
export const CustomerDetail: React.FC<CustomerDetailProps> = ({ customer, onClose, onEdit }) => {
  const { sales } = useDataContext();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [quotas, setQuotas] = useState<ClientQuota[]>([]);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [deposits, setDeposits] = useState<ClientDeposit[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => { getSettings().then(setSettings); }, []);

  // ─── Customer Properties ───
  const customerType = customer?.customerType || customer?.customer_type || 'simple';
  const prepaidBalance = Number(customer?.prepaidBalance ?? customer?.prepaid_balance ?? 0);
  const creditLimit = Number(customer?.creditLimit ?? customer?.credit_limit ?? 0);
  const balance = Number(customer?.balance ?? customer?.current_balance ?? 0);
  const tvaExempt = !!customer?.tva_exempt;
  const isReseller = !!customer?.is_reseller;
  const wholesaleDiscount = Number(customer?.wholesale_discount ?? 0);
  const notes = customer?.notes || '';
  const city = customer?.city || '';
  const address = customer?.address || '';
  const company = customer?.company || '';
  const postalCode = customer?.postal_code || '';
  const country = customer?.country || '';
  const taxNumber = customer?.tax_number || '';
  const paymentTerms = Number(customer?.payment_terms ?? 30);
  const responsableCommercial = customer?.responsable_commercial || customer?.responsableCommercial || '';
  const gpsLat = customer?.gps_lat ?? customer?.gpsLat ?? null;
  const gpsLng = customer?.gps_lng ?? customer?.gpsLng ?? null;
  const customerStatus = customer?.status || 'active';

  const fmt = (amount: number) => formatCurrency(amount, settings || undefined);

  // ─── Load Quotas ───
  useEffect(() => {
    if (!customer?.id || customerType !== 'quotataire') return;
    setQuotaLoading(true);
    quotasAPI.getAll({ customer_id: customer.id })
      .then(r => { if (r.success) setQuotas(r.data || []); })
      .catch(e => console.error('Erreur quotas:', e))
      .finally(() => setQuotaLoading(false));
  }, [customer?.id, customerType]);

  // ─── Load Deposits ───
  useEffect(() => {
    if (!customer?.id) return;
    setDepositsLoading(true);
    customersAPI.getDeposits(customer.id)
      .then((r: any) => { if (r.success) setDeposits(r.data || []); })
      .catch((e: any) => console.error('Erreur dépôts:', e))
      .finally(() => setDepositsLoading(false));
  }, [customer?.id]);

  // ─── Sales Calculations ───
  const customerSales = useMemo(() => {
    return (sales || []).filter((s: any) => s.customerId === customer.id || s.customer_id === customer.id);
  }, [sales, customer.id]);

  const totalSales = customerSales.length;

  const totalAmount = useMemo(() => {
    return customerSales.reduce((sum: number, sale: any) => {
      return sum + (Number(sale?.total ?? 0) || Number(sale?.total_amount ?? 0) || Number(sale?.totalAmount ?? 0) || 0);
    }, 0);
  }, [customerSales]);

  const paidAmount = useMemo(() => {
    return customerSales.reduce((sum: number, sale: any) => {
      if (sale?.status === 'paid' || sale?.payment_status === 'paid') {
        return sum + (Number(sale?.total ?? 0) || Number(sale?.total_amount ?? 0) || 0);
      }
      return sum;
    }, 0);
  }, [customerSales]);

  // ─── PDF ───
  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/pdf/customer-statement/${customer.id}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erreur PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etat-client-${customer.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur PDF:', error);
      alert('Erreur lors de la génération du PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ─── Type Config ───
  const typeConfigs: Record<string, { label: string; gradient: string; bg: string; text: string; border: string; badgeBg: string; icon: React.ElementType }> = {
    occasionnel: { label: 'Client Occasionnel', gradient: 'from-cyan-500 to-sky-600', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', badgeBg: 'bg-cyan-100', icon: Zap },
    simple: { label: 'Client Simple', gradient: 'from-slate-500 to-gray-600', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badgeBg: 'bg-gray-100', icon: User },
    quotataire: { label: 'Client Quotataire', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', badgeBg: 'bg-violet-100', icon: Package },
    revendeur: { label: 'Revendeur', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badgeBg: 'bg-amber-100', icon: TrendingUp },
  };
  const typeConfig = typeConfigs[customerType] || { label: 'Client Simple', gradient: 'from-slate-500 to-gray-600', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badgeBg: 'bg-gray-100', icon: User };

  const paymentMethodLabel = (m: string) => {
    const map: Record<string, string> = {
      especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money',
      banque: 'Banque', cheque: 'Chèque', virement: 'Virement',
    };
    return map[m] || m || 'Espèces';
  };

  /* ═══ RENDER ═══ */
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-gradient-to-b from-gray-50 to-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden border border-gray-200/50">

        {/* ═══ Header ═══ */}
        <div className={`relative bg-gradient-to-r ${typeConfig.gradient} px-6 py-6 overflow-hidden`}>
          {/* Decorative */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 right-1/3 w-12 h-12 bg-white/5 rounded-full" />

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                <span className="text-2xl font-black text-white">
                  {customer.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-white">{customer.name}</h2>
                  <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white/90 border border-white/20">
                    {typeConfig.label}
                  </span>
                </div>
                <p className="text-white/60 text-sm">{company || 'Client particulier'}</p>
                {city && (
                  <p className="text-white/50 text-xs flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {city}
                  </p>
                )}
                {customerStatus !== 'active' && (
                  <span className={`mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    customerStatus === 'bloque' ? 'bg-red-500/20 text-red-200 border border-red-400/30' :
                    customerStatus === 'suspended' ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30' :
                    'bg-gray-500/20 text-gray-200 border border-gray-400/30'
                  }`}>
                    {customerStatus === 'bloque' ? 'Bloqué' : customerStatus === 'suspended' ? 'Suspendu' : customerStatus === 'inactive' ? 'Inactif' : customerStatus}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* PDF */}
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={generatingPdf}
                className="w-9 h-9 flex items-center justify-center bg-white/15 hover:bg-white/25 text-white rounded-xl transition-all duration-200 disabled:opacity-50"
                title="Télécharger PDF"
              >
                {generatingPdf ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
              {/* Edit */}
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20"
                >
                  Modifier
                </button>
              )}
              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="relative z-10 grid grid-cols-4 gap-3 mt-5">
            {[
              ...(customerType === 'quotataire'
                ? [{ icon: Banknote, label: 'Solde Prépayé', value: fmt(prepaidBalance), highlight: prepaidBalance <= 0 }]
                : [{ icon: CreditCard, label: 'Limite Crédit', value: fmt(creditLimit), highlight: false }]),
              { icon: Wallet, label: 'Dette', value: fmt(balance), highlight: balance > 0 },
              { icon: TrendingUp, label: 'Total Achats', value: fmt(totalAmount), highlight: false },
              { icon: Receipt, label: 'Commandes', value: totalSales.toString(), highlight: false },
            ].map((stat, i) => (
              <div key={i} className={`rounded-xl p-3 ${stat.highlight ? 'bg-red-500/20 border border-red-300/30' : 'bg-white/10 border border-white/10'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{stat.label}</span>
                </div>
                <p className={`text-lg font-black ${stat.highlight ? 'text-red-200' : 'text-white'}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Body ═══ */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">

          {/* ─── Alertes ─── */}
          {customerType === 'quotataire' && prepaidBalance <= 50000 && (
            <div className={`flex items-start gap-3 p-4 rounded-2xl border ${
              prepaidBalance <= 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                prepaidBalance <= 0 ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                <AlertCircle className={`w-5 h-5 ${prepaidBalance <= 0 ? 'text-red-500' : 'text-amber-500'}`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${prepaidBalance <= 0 ? 'text-red-700' : 'text-amber-700'}`}>
                  {prepaidBalance <= 0 ? 'Solde prépayé épuisé' : 'Solde prépayé faible'}
                </p>
                <p className={`text-xs mt-0.5 ${prepaidBalance <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {prepaidBalance <= 0
                    ? 'Ce client ne peut plus acheter sans recharger son solde.'
                    : 'Le solde est faible, pensez à le recharger.'}
                </p>
              </div>
            </div>
          )}

          {balance > 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-700">Ce client a une dette de {fmt(balance)}</p>
                <p className="text-xs text-red-600 mt-0.5">Lors du prochain dépôt, la dette sera remboursée en priorité.</p>
              </div>
            </div>
          )}

          {/* ─── Contact ─── */}
          <Section icon={User} title="Informations de contact" iconColor="text-orange-600 bg-orange-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Mail, label: 'Email', value: customer.email },
                { icon: Phone, label: 'Téléphone', value: customer.phone },
                { icon: MapPin, label: 'Adresse', value: address ? `${address}${postalCode ? ` ${postalCode}` : ''}${city ? `, ${city}` : ''}${country ? `, ${country}` : ''}` : null },
                { icon: Building2, label: 'Entreprise', value: company },
                ...(customerType !== 'occasionnel' ? [{ icon: Shield, label: 'N° fiscal / NINEA', value: taxNumber || null }] : []),
                ...(responsableCommercial ? [{ icon: UserCheck, label: 'Responsable commercial', value: responsableCommercial }] : []),
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{item.value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* GPS Coordinates */}
            {gpsLat && gpsLng && (
              <div className="mt-4 p-3.5 bg-orange-50/50 rounded-2xl border border-orange-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Navigation className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Coordonnées GPS</p>
                      <p className="text-sm font-medium text-gray-800">{Number(gpsLat).toFixed(6)}, {Number(gpsLng).toFixed(6)}</p>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${gpsLat},${gpsLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-xl hover:bg-orange-200 transition-colors"
                  >
                    Voir sur Maps
                  </a>
                </div>
              </div>
            )}
          </Section>

          {/* ─── Paramètres Fiscaux (hidden for occasionnel) ─── */}
          {customerType !== 'occasionnel' && (
          <Section
            icon={Shield}
            title="Paramètres Fiscaux"
            iconColor="text-emerald-600 bg-emerald-50"
            collapsible
            defaultOpen={tvaExempt || isReseller || (customerType !== 'quotataire' && creditLimit > 0)}
          >
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                tvaExempt ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-center gap-3">
                  <Percent className={`w-4 h-4 ${tvaExempt ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium text-gray-700">Exonéré TVA</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  tvaExempt ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tvaExempt ? 'Oui' : 'Non'}
                </span>
              </div>

              <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                isReseller ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-center gap-3">
                  <TrendingUp className={`w-4 h-4 ${isReseller ? 'text-amber-600' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium text-gray-700">Revendeur</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isReseller ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {isReseller ? `Oui • ${wholesaleDiscount}%` : 'Non'}
                </span>
              </div>

              {/* Délai de paiement */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-gray-50 border-gray-100">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Délai de paiement</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                  {paymentTerms} jours
                </span>
              </div>

              {/* Credit bar for non-quotataires */}
              {customerType !== 'quotataire' && creditLimit > 0 && (
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Utilisation du crédit</span>
                    <span className={`font-bold ${(balance / creditLimit) > 0.8 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {Math.round((balance / creditLimit) * 100)}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        (balance / creditLimit) > 0.8 ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (balance / creditLimit) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Disponible : <span className="font-bold text-gray-700">{fmt(creditLimit - balance)}</span>
                  </p>
                </div>
              )}
            </div>
          </Section>
          )}

          {/* ─── Bannière info pour occasionnel ─── */}
          {customerType === 'occasionnel' && (
            <div className="flex items-start gap-3 p-4 bg-cyan-50 border border-cyan-200 rounded-2xl">
              <div className="w-9 h-9 bg-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-cyan-800">Client occasionnel — Paiement comptant uniquement</p>
                <p className="text-xs text-cyan-600 mt-0.5">Pas de crédit, pas de remise, pas de solde prépayé ni de délai de paiement.</p>
              </div>
            </div>
          )}

          {/* ─── Historique des Achats ─── */}
          <Section
            icon={ShoppingCart}
            title="Historique des achats"
            subtitle={`${totalSales} commande(s) • ${fmt(totalAmount)}`}
            iconColor="text-indigo-600 bg-indigo-50"
            collapsible
            defaultOpen={totalSales > 0}
            badge={totalSales > 0 ? (
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">{totalSales}</span>
            ) : undefined}
          >
            {totalSales > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Payé</p>
                  <p className="text-sm font-black text-emerald-700 mt-1">{fmt(paidAmount)}</p>
                </div>
                <div className="text-center p-3 bg-red-50/50 rounded-xl border border-red-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500">Impayé</p>
                  <p className="text-sm font-black text-red-600 mt-1">{fmt(totalAmount - paidAmount)}</p>
                </div>
                <div className="text-center p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-500">Total</p>
                  <p className="text-sm font-black text-orange-700 mt-1">{fmt(totalAmount)}</p>
                </div>
              </div>
            )}

            {customerSales.length > 0 ? (
              <div className="space-y-2">
                {customerSales.slice().sort((a: any, b: any) => {
                  const dA = new Date(a?.sale_date || a?.created_at || 0).getTime();
                  const dB = new Date(b?.sale_date || b?.created_at || 0).getTime();
                  return dB - dA;
                }).map((sale: any) => {
                  const amount = Number(sale?.total ?? 0) || Number(sale?.total_amount ?? 0) || Number(sale?.totalAmount ?? 0) || 0;
                  const paid = Number(sale?.amount_paid ?? sale?.amountPaid ?? 0);
                  const remaining = Math.max(0, amount - paid);
                  const createdAt = sale?.sale_date || sale?.createdAt || sale?.created_at || sale?.date || new Date().toISOString();
                  const status = sale?.status || sale?.payment_status || 'draft';
                  const items = sale?.items || sale?.sale_items || [];
                  const productSummary = items.length > 0
                    ? items.slice(0, 2).map((i: any) => i.productName || i.product_name || 'Produit').join(', ') + (items.length > 2 ? ` +${items.length - 2}` : '')
                    : '—';

                  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                    paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Payé' },
                    confirmed: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Confirmé' },
                    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' },
                  };
                  const sConf = statusConfig[status] || { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' };

                  return (
                    <div key={sale.id} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">
                            #{sale.sale_number || (typeof sale.id === 'string' ? sale.id.substring(0, 8) : sale.id)}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sConf.bg} ${sConf.text}`}>
                            {sConf.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {productSummary !== '—' && <span className="ml-1">• {productSummary}</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">{fmt(amount)}</p>
                        {remaining > 0 && (
                          <p className="text-[11px] font-semibold text-red-500">Dû: {fmt(remaining)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="w-8 h-8 text-indigo-300" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Aucune commande</p>
                <p className="text-xs text-gray-400 mt-1">Ce client n'a pas encore effectué d'achats</p>
              </div>
            )}
          </Section>

          {/* ─── Quotas (quotataire only) ─── */}
          {customerType === 'quotataire' && (
            <Section
              icon={Package}
              title="État des Quotas"
              subtitle="Suivi de la consommation par produit"
              iconColor="text-violet-600 bg-violet-50"
              collapsible
              defaultOpen={quotas.length > 0}
              badge={quotas.length > 0 ? (
                <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">{quotas.length}</span>
              ) : undefined}
              action={onEdit ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="px-3 py-1.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-xl hover:bg-violet-200 transition-colors"
                >
                  Gérer
                </button>
              ) : undefined}
            >
              {quotaLoading ? (
                <div className="flex flex-col items-center py-10">
                  <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400 mt-3">Chargement...</p>
                </div>
              ) : quotas.length > 0 ? (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Produits', value: quotas.length.toString(), color: 'text-violet-700 bg-violet-50 border-violet-100' },
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
                    const progress = q.quota_initial > 0 ? ((q.quota_consumed || 0) / q.quota_initial) * 100 : 0;
                    const remaining = Number(q.quota_remaining || 0);
                    const isCompleted = q.status === 'completed' || remaining <= 0;
                    const isCritical = remaining > 0 && remaining < q.quota_initial * 0.1;
                    const isLow = remaining > 0 && remaining < q.quota_initial * 0.2;

                    return (
                      <div key={q.id} className={`p-4 bg-white rounded-2xl border border-gray-100 shadow-sm ${isCompleted ? 'opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              q.product_type === 'beton' ? 'bg-orange-100 text-orange-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              <BarChart3 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {q.product_type === 'beton' ? 'Béton' : 'Carrière'} {q.product_variant}
                              </p>
                              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(q.created_at || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isCompleted ? 'bg-gray-100 text-gray-500' :
                            isCritical ? 'bg-red-100 text-red-600' :
                            isLow ? 'bg-amber-100 text-amber-600' :
                            'bg-emerald-100 text-emerald-600'
                          }`}>
                            {isCompleted ? 'Épuisé' : isCritical ? 'Critique' : isLow ? 'Bas' : 'Actif'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center p-2 bg-orange-50/50 rounded-xl">
                            <p className="text-xs text-orange-500 font-medium">Initial</p>
                            <p className="text-sm font-black text-orange-700">{Number(q.quota_initial).toLocaleString('fr-FR')} T</p>
                          </div>
                          <div className="text-center p-2 bg-orange-50/50 rounded-xl">
                            <p className="text-xs text-orange-500 font-medium">Consommé</p>
                            <p className="text-sm font-black text-orange-600">{Number(q.quota_consumed || 0).toLocaleString('fr-FR')} T</p>
                          </div>
                          <div className={`text-center p-2 rounded-xl ${
                            isCompleted ? 'bg-gray-50' : isCritical ? 'bg-red-50/50' : isLow ? 'bg-amber-50/50' : 'bg-emerald-50/50'
                          }`}>
                            <p className={`text-xs font-medium ${
                              isCompleted ? 'text-gray-400' : isCritical ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-emerald-500'
                            }`}>Restant</p>
                            <p className={`text-sm font-black ${
                              isCompleted ? 'text-gray-400' : isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
                            }`}>{remaining.toLocaleString('fr-FR')} T</p>
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
                          <p className="text-xs text-gray-500 italic mt-2 p-2 bg-gray-50 rounded-xl">{q.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Package className="w-8 h-8 text-violet-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Aucun quota défini</p>
                  <p className="text-xs text-gray-400 mt-1">Les quotas suivent la consommation par produit</p>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={onEdit}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all active:scale-95"
                    >
                      <Package className="w-4 h-4" />
                      Créer un quota
                    </button>
                  )}
                </div>
              )}
            </Section>
          )}

          {/* ─── Historique des Dépôts ─── */}
          <Section
            icon={History}
            title="Historique des dépôts"
            iconColor="text-emerald-600 bg-emerald-50"
            collapsible
            defaultOpen={deposits.length > 0}
            badge={deposits.length > 0 ? (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">{deposits.length}</span>
            ) : undefined}
          >
            {depositsLoading ? (
              <div className="flex flex-col items-center py-10">
                <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-400 mt-3">Chargement...</p>
              </div>
            ) : deposits.length > 0 ? (
              <div className="space-y-4">
                {/* Deposit Summary */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Total déposé</p>
                    <p className="text-sm font-black text-emerald-700 mt-1">{fmt(deposits.reduce((s, d) => s + Number(d.amount), 0))}</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-500">Dettes remboursées</p>
                    <p className="text-sm font-black text-orange-700 mt-1">{fmt(deposits.reduce((s, d) => s + Number(d.amount_to_debt), 0))}</p>
                  </div>
                  <div className="text-center p-3 bg-violet-50/50 rounded-xl border border-violet-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500">Vers prépayé</p>
                    <p className="text-sm font-black text-violet-700 mt-1">{fmt(deposits.reduce((s, d) => s + Number(d.amount_to_prepaid), 0))}</p>
                  </div>
                </div>

                {/* Deposit List */}
                {deposits.map((deposit) => (
                  <DepositCard key={deposit.id} deposit={deposit} fmt={fmt} paymentMethodLabel={paymentMethodLabel} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <History className="w-8 h-8 text-emerald-300" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Aucun dépôt enregistré</p>
                <p className="text-xs text-gray-400 mt-1">Les dépôts apparaîtront ici avec leur traçabilité</p>
              </div>
            )}
          </Section>

          {/* ─── Notes ─── */}
          {notes && (
            <Section
              icon={FileText}
              title="Notes internes"
              iconColor="text-gray-500 bg-gray-100"
              collapsible
              defaultOpen
            >
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{notes}</p>
              </div>
            </Section>
          )}
        </div>

        {/* ═══ Footer ═══ */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white/80">
          <p className="text-xs text-gray-400">
            Créé le {new Date(customer.created_at || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 text-sm font-semibold transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══ Deposit Card Sub-Component ═══ */
const DepositCard: React.FC<{
  deposit: ClientDeposit;
  fmt: (n: number) => string;
  paymentMethodLabel: (m: string) => string;
}> = ({ deposit, fmt, paymentMethodLabel }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Deposit Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
      >
        <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200/50">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-800">{deposit.deposit_number}</p>
            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] font-semibold text-gray-500">
              {paymentMethodLabel(deposit.payment_method)}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3" />
            {new Date(deposit.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-black text-emerald-600">+{fmt(deposit.amount)}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-0' : '-rotate-90'}`} />
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
          {/* Allocation summary */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            {Number(deposit.amount_to_debt) > 0 && (
              <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-500">Remboursement dette</p>
                <p className="text-sm font-black text-orange-700 mt-1">{fmt(deposit.amount_to_debt)}</p>
              </div>
            )}
            {Number(deposit.amount_to_prepaid) > 0 && (
              <div className="p-3 bg-violet-50/50 rounded-xl border border-violet-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500">Ajouté au solde</p>
                <p className="text-sm font-black text-violet-700 mt-1">{fmt(deposit.amount_to_prepaid)}</p>
              </div>
            )}
          </div>

          {/* Balance evolution */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-sm">
            <div className="flex-1 text-center">
              <p className="text-[10px] text-gray-400 font-semibold">Dette avant</p>
              <p className="font-bold text-red-600">{fmt(deposit.previous_debt)}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <div className="flex-1 text-center">
              <p className="text-[10px] text-gray-400 font-semibold">Dette après</p>
              <p className="font-bold text-emerald-600">{fmt(deposit.new_debt)}</p>
            </div>
            <div className="w-px h-8 bg-gray-200 mx-1" />
            <div className="flex-1 text-center">
              <p className="text-[10px] text-gray-400 font-semibold">Prépayé avant</p>
              <p className="font-bold text-gray-600">{fmt(deposit.previous_prepaid)}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <div className="flex-1 text-center">
              <p className="text-[10px] text-gray-400 font-semibold">Prépayé après</p>
              <p className="font-bold text-emerald-600">{fmt(deposit.new_prepaid)}</p>
            </div>
          </div>

          {/* Sales allocations */}
          {deposit.allocations && deposit.allocations.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-orange-500" />
                Ventes remboursées ({deposit.allocations.length})
              </p>
              <div className="space-y-2">
                {deposit.allocations.map((alloc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Vente {alloc.saleNumber}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(alloc.saleDate).toLocaleDateString('fr-FR')} • {alloc.productDetails}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-700">-{fmt(alloc.amountAllocated)}</p>
                      {alloc.newBalance === 0 && (
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3 h-3" /> Soldée
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes / Reference */}
          {(deposit.notes || deposit.reference_number) && (
            <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
              {deposit.reference_number && <p><span className="font-semibold">Réf :</span> {deposit.reference_number}</p>}
              {deposit.notes && <p><span className="font-semibold">Notes :</span> {deposit.notes}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
