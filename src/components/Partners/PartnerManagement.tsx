import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Eye, X, Save, RefreshCw,
  Calendar, CheckCircle, XCircle, Clock,
  Search, Users, FileText,
  Banknote, TrendingUp, ArrowUpRight, ArrowDownRight,
  PieChart, Handshake, AlertCircle, CreditCard, BarChart3
} from 'lucide-react';
import { ModuleAnalytics } from '../Analytics/ModuleAnalytics';
import { partnersAPI } from '../../services/mysql-api';

// ============================================================
// TYPES
// ============================================================
interface Partner {
  id: number;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  id_number: string;
  notes: string;
  is_active: number;
  contracts_count: number;
  total_invested: number;
  total_remaining: number;
  active_contracts: number;
}

interface Contract {
  id: number;
  partner_id: number;
  partner_name: string;
  partner_company: string;
  label: string;
  description: string;
  invested_amount: number;
  monthly_return: number;
  duration_months: number;
  start_date: string;
  end_date: string;
  total_expected_return: number;
  total_paid: number;
  remaining_to_pay: number;
  actual_paid: number;
  payments_count: number;
  status: string;
  notes: string;
}

interface Payment {
  id: number;
  contract_id: number;
  partner_id: number;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference: string;
  month_label: string;
  notes: string;
  contract_label?: string;
}

interface UpcomingPayment {
  contract_id: number;
  label: string;
  monthly_return: number;
  invested_amount: number;
  total_paid: number;
  remaining_to_pay: number;
  duration_months: number;
  partner_id: number;
  partner_name: string;
  partner_company: string;
  start_date: string;
  end_date: string;
  paid_this_month: number;
}

interface Summary {
  partners_count: number;
  active_contracts: number;
  total_invested: number;
  total_expected_return: number;
  total_paid: number;
  total_remaining: number;
  monthly_obligations: number;
  paid_this_month: number;
}

// ============================================================
// HELPERS
// ============================================================
const formatMoney = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' F';

const formatDate = (d: string) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR');
};

const contractStatusStyle = (v: string) => {
  switch (v) {
    case 'actif': return { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Actif' };
    case 'termine': return { cls: 'bg-orange-100 text-orange-700', icon: CheckCircle, label: 'Terminé' };
    case 'suspendu': return { cls: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Suspendu' };
    case 'annule': return { cls: 'bg-gray-100 text-gray-600', icon: XCircle, label: 'Annulé' };
    default: return { cls: 'bg-gray-100 text-gray-600', icon: Clock, label: v };
  }
};

const PAYMENT_METHODS = [
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'especes', label: 'Espèces' },
  { value: 'mobile', label: 'Mobile Money' },
];

// Toast
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium flex items-center gap-2 ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
};

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 transition-all text-sm bg-white";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const PartnerManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'partners' | 'contracts' | 'payments' | 'analytics'>('overview');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  // Search / Filters
  const [partnerSearch, setPartnerSearch] = useState('');
  const [contractFilter, setContractFilter] = useState({ status: '', partner_id: '' });

  // Modals
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [showPartnerDetail, setShowPartnerDetail] = useState(false);
  const [showContractDetail, setShowContractDetail] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<(Partner & { contracts: Contract[]; payments: Payment[] }) | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [contractPayments, setContractPayments] = useState<Payment[]>([]);
  const [payingContract, setPayingContract] = useState<Contract | UpcomingPayment | null>(null);

  // Forms
  const emptyPartnerForm = { name: '', company: '', phone: '', email: '', address: '', id_number: '', notes: '' };
  const emptyContractForm = { partner_id: '', label: '', description: '', invested_amount: '', monthly_return: '', duration_months: '6', start_date: new Date().toISOString().split('T')[0], notes: '' };
  const emptyPaymentForm = { contract_id: '', payment_date: new Date().toISOString().split('T')[0], amount: '', payment_method: 'virement', reference: '', month_label: '', notes: '' };

  const [partnerForm, setPartnerForm] = useState(emptyPartnerForm);
  const [contractForm, setContractForm] = useState(emptyContractForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);

  // ============================================================
  // DATA
  // ============================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [partnersRes, summaryRes, upcomingRes] = await Promise.all([
        partnersAPI.getAll(),
        partnersAPI.getSummary(),
        partnersAPI.getUpcomingPayments(),
      ]);
      setPartners(partnersRes.data || []);
      setSummary(summaryRes.data || null);
      setUpcomingPayments(upcomingRes.data || []);
    } catch (err: any) {
      showToast(err.message || 'Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadContracts = useCallback(async () => {
    try {
      const res = await partnersAPI.getAllContracts();
      setContracts(res.data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, []);

  useEffect(() => { loadData(); loadContracts(); }, [loadData, loadContracts]);

  // ============================================================
  // HANDLERS PARTENAIRES
  // ============================================================
  const handleSavePartner = async () => {
    if (!partnerForm.name.trim()) { showToast('Le nom est requis', 'error'); return; }
    try {
      if (editingPartner) {
        await partnersAPI.update(editingPartner.id, partnerForm);
        showToast('Partenaire modifié');
      } else {
        await partnersAPI.create(partnerForm);
        showToast('Partenaire ajouté');
      }
      setShowPartnerForm(false);
      setEditingPartner(null);
      setPartnerForm(emptyPartnerForm);
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleDeletePartner = async (id: number) => {
    if (!confirm('Supprimer ce partenaire et tous ses contrats/paiements ?')) return;
    try {
      await partnersAPI.delete(id);
      showToast('Partenaire supprimé');
      loadData();
      loadContracts();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleViewPartner = async (id: number) => {
    try {
      const res = await partnersAPI.getById(id);
      setSelectedPartner(res.data);
      setShowPartnerDetail(true);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleEditPartner = (p: Partner) => {
    setEditingPartner(p);
    setPartnerForm({ name: p.name, company: p.company || '', phone: p.phone || '', email: p.email || '', address: p.address || '', id_number: p.id_number || '', notes: p.notes || '' });
    setShowPartnerForm(true);
  };

  // ============================================================
  // HANDLERS CONTRATS
  // ============================================================
  const handleSaveContract = async () => {
    if (!contractForm.partner_id || !contractForm.label || !contractForm.invested_amount || !contractForm.monthly_return) {
      showToast('Partenaire, libellé, montant investi et retour mensuel requis', 'error'); return;
    }
    try {
      if (editingContract) {
        await partnersAPI.updateContract(editingContract.id, contractForm);
        showToast('Contrat modifié');
      } else {
        await partnersAPI.createContract(contractForm);
        showToast('Contrat créé');
      }
      setShowContractForm(false);
      setEditingContract(null);
      setContractForm(emptyContractForm);
      loadContracts();
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleDeleteContract = async (id: number) => {
    if (!confirm('Supprimer ce contrat et ses paiements ?')) return;
    try {
      await partnersAPI.deleteContract(id);
      showToast('Contrat supprimé');
      loadContracts();
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleViewContract = async (contract: Contract) => {
    setSelectedContract(contract);
    try {
      const res = await partnersAPI.getContractPayments(contract.id);
      setContractPayments(res.data || []);
      setShowContractDetail(true);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleEditContract = (c: Contract) => {
    setEditingContract(c);
    setContractForm({
      partner_id: String(c.partner_id), label: c.label, description: c.description || '',
      invested_amount: String(c.invested_amount), monthly_return: String(c.monthly_return),
      duration_months: String(c.duration_months), start_date: c.start_date ? c.start_date.split('T')[0] : '',
      notes: c.notes || '',
    });
    setShowContractForm(true);
  };

  // ============================================================
  // HANDLERS PAIEMENTS
  // ============================================================
  const handleSavePayment = async () => {
    if (!paymentForm.contract_id || !paymentForm.amount || !paymentForm.payment_date) {
      showToast('Contrat, montant et date requis', 'error'); return;
    }
    try {
      await partnersAPI.createPayment(paymentForm);
      showToast('Paiement enregistré');
      setShowPaymentForm(false);
      setPayingContract(null);
      setPaymentForm(emptyPaymentForm);
      if (selectedContract) {
        const res = await partnersAPI.getContractPayments(selectedContract.id);
        setContractPayments(res.data || []);
      }
      loadContracts();
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleDeletePayment = async (id: number) => {
    if (!confirm('Supprimer ce paiement ?')) return;
    try {
      await partnersAPI.deletePayment(id);
      showToast('Paiement supprimé');
      if (selectedContract) {
        const res = await partnersAPI.getContractPayments(selectedContract.id);
        setContractPayments(res.data || []);
      }
      loadContracts();
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  // ============================================================
  // FILTRES
  // ============================================================
  const filteredPartners = partners.filter(p =>
    !partnerSearch || p.name.toLowerCase().includes(partnerSearch.toLowerCase()) || (p.company || '').toLowerCase().includes(partnerSearch.toLowerCase())
  );

  const filteredContracts = contracts.filter(c => {
    if (contractFilter.status && c.status !== contractFilter.status) return false;
    if (contractFilter.partner_id && String(c.partner_id) !== contractFilter.partner_id) return false;
    return true;
  });

  // ============================================================
  // TABS
  // ============================================================
  const tabs = [
    { id: 'overview' as const, label: 'Vue d\'ensemble', icon: PieChart },
    { id: 'partners' as const, label: 'Partenaires', icon: Users },
    { id: 'contracts' as const, label: 'Contrats', icon: FileText },
    { id: 'payments' as const, label: 'Paiements', icon: Banknote },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-200/50">
              <Handshake className="w-5 h-5 text-white" />
            </div>
            Partenaires & Investisseurs
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Suivi des contrats d'investissement et retour sur investissement</p>
        </div>
        <button onClick={() => { loadData(); loadContracts(); }} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors shadow-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {/* ONGLETS */}
      <div className="flex space-x-1 bg-gray-100/80 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-teal-700 shadow-sm ring-1 ring-gray-200/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'partners' && renderPartners()}
      {activeTab === 'contracts' && renderContracts()}
      {activeTab === 'payments' && renderPaymentsTab()}
      {activeTab === 'analytics' && <ModuleAnalytics module="partners" title="Analytics Partenaires" />}

      {showPartnerForm && renderPartnerFormModal()}
      {showPartnerDetail && selectedPartner && renderPartnerDetailModal()}
      {showContractForm && renderContractFormModal()}
      {showContractDetail && selectedContract && renderContractDetailModal()}
      {showPaymentForm && renderPaymentFormModal()}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );

  // ============================================================
  // VUE D'ENSEMBLE
  // ============================================================
  function renderOverview() {
    if (loading && !summary) return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-32" />
          </div>
        ))}
      </div>
    );

    const s = summary || { partners_count: 0, active_contracts: 0, total_invested: 0, total_expected_return: 0, total_paid: 0, total_remaining: 0, monthly_obligations: 0, paid_this_month: 0 };
    const monthProgress = s.monthly_obligations > 0 ? (s.paid_this_month / s.monthly_obligations) * 100 : 0;
    const globalProgress = s.total_expected_return > 0 ? (s.total_paid / s.total_expected_return) * 100 : 0;

    return (
      <div className="space-y-6">
        {/* Bandeau principal */}
        <div className="rounded-2xl p-6 border bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">Capital investi par les partenaires</p>
              <p className="text-3xl font-bold mt-1 text-teal-800">{formatMoney(s.total_invested)}</p>
              <p className="text-xs text-gray-500 mt-1">{s.partners_count} partenaire(s) • {s.active_contracts} contrat(s) actif(s)</p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="flex items-center gap-1 text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="font-bold">{formatMoney(s.total_paid)}</span>
                </div>
                <p className="text-gray-500 text-xs">Déjà versé</p>
              </div>
              <div className="w-px h-8 bg-gray-300" />
              <div className="text-center">
                <div className="flex items-center gap-1 text-red-600">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="font-bold">{formatMoney(s.total_remaining)}</span>
                </div>
                <p className="text-gray-500 text-xs">Reste à verser</p>
              </div>
            </div>
          </div>
          {/* Barre progression globale */}
          {s.total_expected_return > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progression des remboursements</span>
                <span>{globalProgress.toFixed(1)}%</span>
              </div>
              <div className="flex rounded-full h-3 overflow-hidden bg-gray-200">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-400 transition-all" style={{ width: `${Math.min(globalProgress, 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={Users} label="Partenaires" value={String(s.partners_count)} gradient="from-teal-500 to-cyan-500" onClick={() => setActiveTab('partners')} />
          <KPICard icon={FileText} label="Contrats actifs" value={String(s.active_contracts)} gradient="from-orange-500 to-indigo-500" onClick={() => setActiveTab('contracts')} />
          <KPICard
            icon={CreditCard}
            label="Obligation mensuelle"
            value={formatMoney(s.monthly_obligations)}
            sub={`${formatMoney(s.paid_this_month)} versé ce mois`}
            gradient="from-amber-500 to-orange-500"
            onClick={() => setActiveTab('payments')}
          />
          <KPICard
            icon={TrendingUp}
            label="Retour total attendu"
            value={formatMoney(s.total_expected_return)}
            gradient="from-purple-500 to-pink-500"
          />
        </div>

        {/* Paiements du mois en cours */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Paiements du mois en cours
            </h3>
            {/* Progression mois */}
            {s.monthly_obligations > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${monthProgress >= 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(monthProgress, 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-500">{monthProgress.toFixed(0)}%</span>
              </div>
            )}
          </div>
          {upcomingPayments.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Handshake className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Aucun contrat actif</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcomingPayments.map(up => {
                const isPaid = parseFloat(String(up.paid_this_month)) >= parseFloat(String(up.monthly_return));
                const partialPaid = parseFloat(String(up.paid_this_month)) > 0 && !isPaid;
                return (
                  <div key={up.contract_id} className={`px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors ${isPaid ? 'bg-emerald-50/30' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPaid ? 'bg-emerald-500' : partialPaid ? 'bg-amber-500' : 'bg-red-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{up.partner_name}{up.partner_company ? ` — ${up.partner_company}` : ''}</p>
                        <p className="text-xs text-gray-500">{up.label} • Investissement: {formatMoney(up.invested_amount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatMoney(up.monthly_return)}</p>
                        {isPaid ? (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-0.5 justify-end"><CheckCircle className="w-3 h-3" /> Payé</span>
                        ) : partialPaid ? (
                          <span className="text-xs text-amber-600 font-medium">{formatMoney(up.paid_this_month)} versé</span>
                        ) : (
                          <span className="text-xs text-red-500 font-medium">Non payé</span>
                        )}
                      </div>
                      {!isPaid && (
                        <button
                          onClick={() => {
                            setPayingContract(up);
                            setPaymentForm({
                              contract_id: String(up.contract_id),
                              payment_date: new Date().toISOString().split('T')[0],
                              amount: String(parseFloat(String(up.monthly_return)) - parseFloat(String(up.paid_this_month))),
                              payment_method: 'virement',
                              reference: '',
                              month_label: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                              notes: '',
                            });
                            setShowPaymentForm(true);
                          }}
                          className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs hover:bg-teal-100 font-medium transition-colors"
                        >
                          Payer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Répartition par partenaire */}
        {partners.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Répartition des investissements</h3>
            <div className="space-y-3">
              {partners.filter(p => parseFloat(String(p.total_invested)) > 0).map(p => {
                const invested = parseFloat(String(p.total_invested)) || 0;
                const remaining = parseFloat(String(p.total_remaining)) || 0;
                const maxVal = Math.max(...partners.map(pp => parseFloat(String(pp.total_invested)) || 0), 1);
                const paidPct = invested > 0 ? ((invested - remaining) / invested) * 100 : 0;
                return (
                  <div key={p.id} className="group cursor-pointer" onClick={() => handleViewPartner(p.id)}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-gray-800 group-hover:text-teal-600 transition-colors truncate">{p.name}</span>
                        {p.company && <span className="text-xs text-gray-400 truncate">({p.company})</span>}
                      </div>
                      <div className="flex gap-4 text-xs flex-shrink-0">
                        <span className="text-teal-600 font-medium">{formatMoney(invested)}</span>
                        <span className="text-gray-400">{paidPct.toFixed(0)}% remboursé</span>
                      </div>
                    </div>
                    <div className="flex rounded-full h-2 overflow-hidden bg-gray-100">
                      <div className="bg-teal-400 transition-all" style={{ width: `${(invested / maxVal) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // PARTENAIRES
  // ============================================================
  function renderPartners() {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher un partenaire..." value={partnerSearch} onChange={e => setPartnerSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 bg-white" />
          </div>
          <button onClick={() => { setEditingPartner(null); setPartnerForm(emptyPartnerForm); setShowPartnerForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 shadow-md shadow-teal-200/50 text-sm font-medium">
            <Plus className="w-4 h-4" /> Nouveau partenaire
          </button>
        </div>

        {filteredPartners.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{partnerSearch ? 'Aucun résultat' : 'Aucun partenaire enregistré'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPartners.map(p => {
              const invested = parseFloat(String(p.total_invested)) || 0;
              const remaining = parseFloat(String(p.total_remaining)) || 0;
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md shadow-teal-200/40 flex-shrink-0">
                        <span className="text-white font-bold text-sm">{p.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                        {p.company && <p className="text-xs text-gray-400 truncate">{p.company}</p>}
                      </div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => handleViewPartner(p.id)} className="p-1.5 hover:bg-teal-50 rounded-lg text-teal-500" title="Détails"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleEditPartner(p)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500" title="Modifier"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeletePartner(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Investi</span>
                      <span className="font-bold text-teal-600">{formatMoney(invested)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Reste à verser</span>
                      <span className={`font-bold ${remaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>{remaining > 0 ? formatMoney(remaining) : '—'}</span>
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>{p.active_contracts} contrat{p.active_contracts > 1 ? 's' : ''} actif{p.active_contracts > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {p.phone && (
                    <div className="mt-3 pt-2.5 border-t border-gray-100 text-xs text-gray-400 truncate">
                      📞 {p.phone} {p.email && `• ${p.email}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // CONTRATS
  // ============================================================
  function renderContracts() {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <select value={contractFilter.status} onChange={e => setContractFilter({ ...contractFilter, status: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500/40">
              <option value="">Tous statuts</option>
              <option value="actif">Actif</option>
              <option value="termine">Terminé</option>
              <option value="suspendu">Suspendu</option>
              <option value="annule">Annulé</option>
            </select>
            <select value={contractFilter.partner_id} onChange={e => setContractFilter({ ...contractFilter, partner_id: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500/40">
              <option value="">Tous partenaires</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button onClick={() => { setEditingContract(null); setContractForm(emptyContractForm); setShowContractForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 shadow-md shadow-teal-200/50 text-sm font-medium" disabled={partners.length === 0}>
            <Plus className="w-4 h-4" /> Nouveau contrat
          </button>
        </div>

        {filteredContracts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{contractFilter.status || contractFilter.partner_id ? 'Aucun résultat' : 'Aucun contrat enregistré'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContracts.map(c => {
              const cst = contractStatusStyle(c.status);
              const StatusIcon = cst.icon;
              const progress = c.total_expected_return > 0 ? (parseFloat(String(c.total_paid)) / c.total_expected_return) * 100 : 0;
              const monthsDone = c.total_paid > 0 && c.monthly_return > 0 ? Math.floor(c.total_paid / c.monthly_return) : 0;

              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{c.label}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${cst.cls}`}>
                          <StatusIcon className="w-3 h-3" /> {cst.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {c.partner_name}{c.partner_company ? ` (${c.partner_company})` : ''} • {c.duration_months} mois • {formatDate(c.start_date)} → {formatDate(c.end_date)}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Investi</p>
                        <p className="text-sm font-bold text-teal-700">{formatMoney(c.invested_amount)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Retour mensuel</p>
                        <p className="text-sm font-bold text-orange-600">{formatMoney(c.monthly_return)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Reste</p>
                        <p className="text-lg font-bold text-red-600">{formatMoney(c.remaining_to_pay)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-500 w-20 text-right">{monthsDone}/{c.duration_months} mois</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleViewContract(c)} className="p-1.5 hover:bg-teal-50 rounded-lg text-teal-500" title="Détails"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => {
                        setPayingContract(c);
                        setPaymentForm({ contract_id: String(c.id), payment_date: new Date().toISOString().split('T')[0], amount: String(c.monthly_return), payment_method: 'virement', reference: '', month_label: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), notes: '' });
                        setShowPaymentForm(true);
                      }} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600" title="Payer"><Banknote className="w-4 h-4" /></button>
                      <button onClick={() => handleEditContract(c)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500" title="Modifier"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteContract(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // ONGLET PAIEMENTS
  // ============================================================
  function renderPaymentsTab() {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Paiements mensuels à effectuer</h3>
          <button onClick={() => {
            setPayingContract(null);
            setPaymentForm({ ...emptyPaymentForm, month_label: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) });
            setShowPaymentForm(true);
          }} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 shadow-md shadow-teal-200/50 text-sm font-medium">
            <Plus className="w-4 h-4" /> Enregistrer un paiement
          </button>
        </div>

        {upcomingPayments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun contrat actif — aucun paiement à effectuer</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left">
                    <th className="px-5 py-3.5 font-medium text-gray-600">Partenaire</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600">Contrat</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600 text-right">Investi</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600 text-right">Mensualité</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600 text-right">Versé ce mois</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600">Statut</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {upcomingPayments.map(up => {
                    const isPaid = parseFloat(String(up.paid_this_month)) >= parseFloat(String(up.monthly_return));
                    const partialPaid = parseFloat(String(up.paid_this_month)) > 0 && !isPaid;
                    return (
                      <tr key={up.contract_id} className={`hover:bg-gray-50/50 transition-colors ${isPaid ? 'bg-emerald-50/30' : ''}`}>
                        <td className="px-5 py-3.5 font-medium text-gray-900">
                          {up.partner_name}
                          {up.partner_company && <span className="text-xs text-gray-400 block">{up.partner_company}</span>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">{up.label}</td>
                        <td className="px-5 py-3.5 text-right font-medium text-teal-700">{formatMoney(up.invested_amount)}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900">{formatMoney(up.monthly_return)}</td>
                        <td className="px-5 py-3.5 text-right font-medium">{formatMoney(up.paid_this_month)}</td>
                        <td className="px-5 py-3.5">
                          {isPaid ? (
                            <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-emerald-100 text-emerald-700 inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Payé</span>
                          ) : partialPaid ? (
                            <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-amber-100 text-amber-700">Partiel</span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-red-100 text-red-700 inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Non payé</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {!isPaid && (
                            <button
                              onClick={() => {
                                setPayingContract(up);
                                setPaymentForm({
                                  contract_id: String(up.contract_id),
                                  payment_date: new Date().toISOString().split('T')[0],
                                  amount: String(parseFloat(String(up.monthly_return)) - parseFloat(String(up.paid_this_month))),
                                  payment_method: 'virement',
                                  reference: '',
                                  month_label: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                                  notes: '',
                                });
                                setShowPaymentForm(true);
                              }}
                              className="px-3.5 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs hover:bg-teal-100 font-semibold transition-colors"
                            >
                              Payer
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // MODALS
  // ============================================================
  function ModalWrapper({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className={`bg-white rounded-2xl shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'} w-full max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
          {children}
        </div>
      </div>
    );
  }

  function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
    return (
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
      </div>
    );
  }

  function ModalFooter({ onCancel, onSave, saveLabel }: { onCancel: () => void; onSave: () => void; saveLabel: string }) {
    return (
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
        <button onClick={onCancel} className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors">Annuler</button>
        <button onClick={onSave} className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md shadow-teal-200/50 transition-all">
          <Save className="w-4 h-4" /> {saveLabel}
        </button>
      </div>
    );
  }

  // Partner Form
  function renderPartnerFormModal() {
    return (
      <ModalWrapper onClose={() => setShowPartnerForm(false)}>
        <ModalHeader title={editingPartner ? 'Modifier le partenaire' : 'Nouveau partenaire'} onClose={() => setShowPartnerForm(false)} />
        <div className="p-6 space-y-4">
          <div><label className={labelCls}>Nom complet *</label><input type="text" value={partnerForm.name} onChange={e => setPartnerForm({ ...partnerForm, name: e.target.value })} className={inputCls} placeholder="Prénom et Nom" /></div>
          <div><label className={labelCls}>Entreprise / Société</label><input type="text" value={partnerForm.company} onChange={e => setPartnerForm({ ...partnerForm, company: e.target.value })} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Téléphone</label><input type="text" value={partnerForm.phone} onChange={e => setPartnerForm({ ...partnerForm, phone: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Email</label><input type="email" value={partnerForm.email} onChange={e => setPartnerForm({ ...partnerForm, email: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Adresse</label><input type="text" value={partnerForm.address} onChange={e => setPartnerForm({ ...partnerForm, address: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>N° Identité / Registre commerce</label><input type="text" value={partnerForm.id_number} onChange={e => setPartnerForm({ ...partnerForm, id_number: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Notes</label><textarea value={partnerForm.notes} onChange={e => setPartnerForm({ ...partnerForm, notes: e.target.value })} className={inputCls} rows={2} /></div>
        </div>
        <ModalFooter onCancel={() => setShowPartnerForm(false)} onSave={handleSavePartner} saveLabel={editingPartner ? 'Modifier' : 'Enregistrer'} />
      </ModalWrapper>
    );
  }

  // Partner Detail
  function renderPartnerDetailModal() {
    if (!selectedPartner) return null;
    return (
      <ModalWrapper onClose={() => setShowPartnerDetail(false)} wide>
        <ModalHeader title={selectedPartner.name} onClose={() => setShowPartnerDetail(false)} />
        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {selectedPartner.company && <div><span className="text-gray-500">Société:</span> <span className="font-medium">{selectedPartner.company}</span></div>}
            {selectedPartner.phone && <div><span className="text-gray-500">Tél:</span> <span className="font-medium">{selectedPartner.phone}</span></div>}
            {selectedPartner.email && <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedPartner.email}</span></div>}
            {selectedPartner.id_number && <div><span className="text-gray-500">ID:</span> <span className="font-medium">{selectedPartner.id_number}</span></div>}
            {selectedPartner.address && <div className="col-span-2"><span className="text-gray-500">Adresse:</span> <span className="font-medium">{selectedPartner.address}</span></div>}
          </div>

          {/* Contrats */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Contrats d'investissement</h4>
            {selectedPartner.contracts.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">Aucun contrat</p>
            ) : (
              <div className="space-y-2">
                {selectedPartner.contracts.map(c => {
                  const progress = c.total_expected_return > 0 ? (parseFloat(String(c.total_paid)) / c.total_expected_return) * 100 : 0;
                  return (
                    <div key={c.id} className="p-3.5 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.label}</p>
                          <p className="text-xs text-gray-500">{c.duration_months} mois • {contractStatusStyle(c.status).label} • {formatMoney(c.monthly_return)}/mois</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-teal-700">{formatMoney(c.invested_amount)}</p>
                          <p className="text-xs text-gray-400">Reste: {formatMoney(c.remaining_to_pay)}</p>
                        </div>
                      </div>
                      <div className="bg-gray-200 rounded-full h-1.5">
                        <div className="bg-teal-400 h-1.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historique paiements */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Historique des paiements ({selectedPartner.payments.length})</h4>
            {selectedPartner.payments.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">Aucun paiement enregistré</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50/80 text-left">
                    <th className="px-4 py-2.5 font-medium text-gray-600">Date</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Contrat</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Montant</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Mode</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Mois</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedPartner.payments.slice(0, 20).map(pay => (
                      <tr key={pay.id}>
                        <td className="px-4 py-2.5 text-gray-900">{formatDate(pay.payment_date)}</td>
                        <td className="px-4 py-2.5 text-gray-600">{pay.contract_label}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{formatMoney(pay.amount)}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{PAYMENT_METHODS.find(m => m.value === pay.payment_method)?.label || pay.payment_method}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{pay.month_label || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </ModalWrapper>
    );
  }

  // Contract Form
  function renderContractFormModal() {
    const invested = parseFloat(contractForm.invested_amount) || 0;
    const monthly = parseFloat(contractForm.monthly_return) || 0;
    const months = parseInt(contractForm.duration_months) || 0;
    const totalReturn = monthly * months;
    const roi = invested > 0 ? ((totalReturn - invested) / invested * 100) : 0;

    return (
      <ModalWrapper onClose={() => setShowContractForm(false)}>
        <ModalHeader title={editingContract ? 'Modifier le contrat' : 'Nouveau contrat d\'investissement'} onClose={() => setShowContractForm(false)} />
        <div className="p-6 space-y-4">
          <div><label className={labelCls}>Partenaire *</label>
            <select value={contractForm.partner_id} onChange={e => setContractForm({ ...contractForm, partner_id: e.target.value })} className={inputCls}>
              <option value="">Sélectionner un partenaire</option>
              {partners.map(p => <option key={p.id} value={p.id}>{p.name}{p.company ? ` (${p.company})` : ''}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Libellé du contrat *</label><input type="text" value={contractForm.label} onChange={e => setContractForm({ ...contractForm, label: e.target.value })} className={inputCls} placeholder="Ex: Investissement BTP Lot 3" /></div>
          <div><label className={labelCls}>Description</label><textarea value={contractForm.description} onChange={e => setContractForm({ ...contractForm, description: e.target.value })} className={inputCls} rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Montant investi (F) *</label><input type="number" value={contractForm.invested_amount} onChange={e => setContractForm({ ...contractForm, invested_amount: e.target.value })} className={inputCls} placeholder="10 000 000" /></div>
            <div><label className={labelCls}>Retour mensuel (F) *</label><input type="number" value={contractForm.monthly_return} onChange={e => setContractForm({ ...contractForm, monthly_return: e.target.value })} className={inputCls} placeholder="1 500 000" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Durée (mois) *</label><input type="number" min="1" value={contractForm.duration_months} onChange={e => setContractForm({ ...contractForm, duration_months: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Date de début *</label><input type="date" value={contractForm.start_date} onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })} className={inputCls} /></div>
          </div>

          {/* Résumé calculé */}
          {invested > 0 && monthly > 0 && months > 0 && (
            <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
              <h4 className="text-sm font-semibold text-teal-800 mb-2">Résumé du contrat</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Total à verser :</span><span className="font-bold text-gray-900">{formatMoney(totalReturn)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Bénéfice partenaire :</span><span className="font-bold text-emerald-600">{formatMoney(totalReturn - invested)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">ROI :</span><span className="font-bold text-orange-600">{roi.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Fin du contrat :</span><span className="font-medium">{contractForm.start_date ? formatDate((() => { const d = new Date(contractForm.start_date); d.setMonth(d.getMonth() + months); return d.toISOString(); })()) : '-'}</span></div>
              </div>
            </div>
          )}

          <div><label className={labelCls}>Notes</label><textarea value={contractForm.notes} onChange={e => setContractForm({ ...contractForm, notes: e.target.value })} className={inputCls} rows={2} /></div>
        </div>
        <ModalFooter onCancel={() => setShowContractForm(false)} onSave={handleSaveContract} saveLabel={editingContract ? 'Modifier' : 'Créer le contrat'} />
      </ModalWrapper>
    );
  }

  // Contract Detail
  function renderContractDetailModal() {
    if (!selectedContract) return null;
    const progress = selectedContract.total_expected_return > 0 ? (parseFloat(String(selectedContract.total_paid)) / selectedContract.total_expected_return) * 100 : 0;
    const roi = selectedContract.invested_amount > 0 ? ((selectedContract.total_expected_return - selectedContract.invested_amount) / selectedContract.invested_amount * 100) : 0;

    return (
      <ModalWrapper onClose={() => setShowContractDetail(false)} wide>
        <ModalHeader title={selectedContract.label} onClose={() => setShowContractDetail(false)} />
        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-teal-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Investi</p><p className="text-lg font-bold text-teal-700">{formatMoney(selectedContract.invested_amount)}</p></div>
            <div className="bg-orange-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Mensualité</p><p className="text-lg font-bold text-orange-600">{formatMoney(selectedContract.monthly_return)}</p></div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Versé</p><p className="text-lg font-bold text-emerald-600">{formatMoney(selectedContract.total_paid)}</p></div>
            <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Reste</p><p className="text-lg font-bold text-red-600">{formatMoney(selectedContract.remaining_to_pay)}</p></div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl text-center"><p className="text-xs text-gray-500">Durée</p><p className="font-bold">{selectedContract.duration_months} mois</p></div>
            <div className="bg-gray-50 p-3 rounded-xl text-center"><p className="text-xs text-gray-500">ROI</p><p className="font-bold text-purple-600">{roi.toFixed(1)}%</p></div>
            <div className="bg-gray-50 p-3 rounded-xl text-center"><p className="text-xs text-gray-500">Progression</p><p className="font-bold text-teal-600">{progress.toFixed(1)}%</p></div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-3 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>

          {/* Historique paiements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Paiements effectués ({contractPayments.length})</h4>
              <button onClick={() => {
                setPayingContract(selectedContract);
                setPaymentForm({ contract_id: String(selectedContract.id), payment_date: new Date().toISOString().split('T')[0], amount: String(selectedContract.monthly_return), payment_method: 'virement', reference: '', month_label: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), notes: '' });
                setShowPaymentForm(true);
              }} className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1 font-medium">
                <Plus className="w-4 h-4" /> Payer
              </button>
            </div>
            {contractPayments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucun paiement enregistré</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50/80 text-left">
                    <th className="px-4 py-2.5 font-medium text-gray-600">Date</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Montant</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Mode</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Mois</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Réf.</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {contractPayments.map(pay => (
                      <tr key={pay.id}>
                        <td className="px-4 py-2.5">{formatDate(pay.payment_date)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{formatMoney(pay.amount)}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{PAYMENT_METHODS.find(m => m.value === pay.payment_method)?.label || pay.payment_method}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{pay.month_label || '-'}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{pay.reference || '-'}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => handleDeletePayment(pay.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </ModalWrapper>
    );
  }

  // Payment Form
  function renderPaymentFormModal() {
    return (
      <ModalWrapper onClose={() => { setShowPaymentForm(false); setPayingContract(null); }}>
        <ModalHeader title="Enregistrer un paiement" onClose={() => { setShowPaymentForm(false); setPayingContract(null); }} />
        {payingContract && (
          <div className="px-6 pt-2 pb-1">
            <div className="bg-teal-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">{'partner_name' in payingContract ? payingContract.partner_name : (payingContract as Contract).partner_name} — {'label' in payingContract ? payingContract.label : ''}</p>
              <p className="text-xl font-bold text-teal-700">{formatMoney(parseFloat(String('monthly_return' in payingContract ? payingContract.monthly_return : 0)))}</p>
              <p className="text-xs text-gray-400">Retour mensuel</p>
            </div>
          </div>
        )}
        <div className="p-6 space-y-4">
          {!payingContract && (
            <div><label className={labelCls}>Contrat *</label>
              <select value={paymentForm.contract_id} onChange={e => setPaymentForm({ ...paymentForm, contract_id: e.target.value })} className={inputCls}>
                <option value="">Sélectionner un contrat</option>
                {contracts.filter(c => c.status === 'actif').map(c => <option key={c.id} value={c.id}>{c.partner_name} — {c.label}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Montant *</label><input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Date *</label><input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Mode de paiement</label>
              <select value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} className={inputCls}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Mois concerné</label><input type="text" value={paymentForm.month_label} onChange={e => setPaymentForm({ ...paymentForm, month_label: e.target.value })} className={inputCls} placeholder="Ex: avril 2026" /></div>
          </div>
          <div><label className={labelCls}>Référence / N° reçu</label><input type="text" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Notes</label><textarea value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} className={inputCls} rows={2} /></div>
        </div>
        <ModalFooter onCancel={() => { setShowPaymentForm(false); setPayingContract(null); }} onSave={handleSavePayment} saveLabel="Enregistrer le paiement" />
      </ModalWrapper>
    );
  }
};

// ============================================================
// KPI Card
// ============================================================
const KPICard: React.FC<{ icon: any; label: string; value: string; sub?: string; gradient: string; onClick?: () => void }> = ({ icon: Icon, label, value, sub, gradient, onClick }) => (
  <div onClick={onClick} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer">
    <div className="flex items-start justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-1 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-9 h-9 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4.5 h-4.5 text-white" />
      </div>
    </div>
  </div>
);

export default PartnerManagement;
