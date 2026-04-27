import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Edit2, Trash2, Eye, X, Save,
  Calendar, AlertTriangle,
  RefreshCw, CreditCard, Clock, CheckCircle, XCircle,
  Landmark, Search, ArrowUpRight,
  ArrowDownRight, PieChart, ChevronRight, BarChart3
} from 'lucide-react';
import { ModuleAnalytics } from '../Analytics/ModuleAnalytics';
import { banksAPI } from '../../services/mysql-api';

// ============================================================
// TYPES
// ============================================================
interface Bank {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  contact_person: string;
  account_number: string;
  iban: string;
  swift_bic: string;
  notes: string;
  is_active: number;
  accounts_count: number;
  total_balance: number;
  active_loans_count: number;
  total_remaining_debt: number;
}

interface BankAccount {
  id: number;
  bank_id: number;
  account_name: string;
  account_number: string;
  account_type: string;
  currency: string;
  current_balance: number;
  is_active: number;
}

interface BankLoan {
  id: number;
  bank_id: number;
  bank_name: string;
  loan_type: string;
  label: string;
  description: string;
  principal_amount: number;
  interest_rate: number;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  notes: string;
}

interface LoanSchedule {
  id: number;
  loan_id: number;
  due_date: string;
  amount: number;
  principal_part: number;
  interest_part: number;
  status: string;
  paid_date: string;
  paid_amount: number;
  notes: string;
  loan_label?: string;
  loan_type?: string;
  bank_name?: string;
}

interface Summary {
  total_balance: number;
  total_debt: number;
  active_loans: number;
  month_due: number;
  month_schedules_count: number;
  overdue_amount: number;
  overdue_count: number;
  banks_count: number;
}

// ============================================================
// HELPERS
// ============================================================
const formatMoney = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' F';

const formatDate = (d: string) => {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR');
};

const daysUntil = (d: string) => {
  if (!d) return 999;
  const diff = new Date(d).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const LOAN_TYPES = [
  { value: 'pret', label: 'Prêt bancaire' },
  { value: 'dette', label: 'Dette' },
  { value: 'credit', label: 'Crédit' },
  { value: 'decouvert', label: 'Découvert' },
];

const loanTypeStyle = (v: string) => {
  switch (v) {
    case 'pret': return 'bg-orange-100 text-orange-700';
    case 'dette': return 'bg-red-100 text-red-700';
    case 'credit': return 'bg-orange-100 text-orange-700';
    case 'decouvert': return 'bg-purple-100 text-purple-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const loanStatusStyle = (v: string) => {
  switch (v) {
    case 'en_cours': return { cls: 'bg-orange-100 text-orange-700', icon: Clock, label: 'En cours' };
    case 'termine': return { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Terminé' };
    case 'en_retard': return { cls: 'bg-red-100 text-red-700', icon: AlertTriangle, label: 'En retard' };
    case 'annule': return { cls: 'bg-gray-100 text-gray-600', icon: XCircle, label: 'Annulé' };
    default: return { cls: 'bg-gray-100 text-gray-600', icon: Clock, label: v };
  }
};

const scheduleStatusStyle = (v: string) => {
  switch (v) {
    case 'a_payer': return { cls: 'bg-amber-100 text-amber-700', label: 'À payer' };
    case 'paye': return { cls: 'bg-emerald-100 text-emerald-700', label: 'Payé' };
    case 'en_retard': return { cls: 'bg-red-100 text-red-700', label: 'En retard' };
    case 'partiel': return { cls: 'bg-orange-100 text-orange-700', label: 'Partiel' };
    default: return { cls: 'bg-gray-100 text-gray-600', label: v };
  }
};

// Toast component
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium flex items-center gap-2 animate-[slideUp_0.3s_ease-out] ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
};

// Input style helper
const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all text-sm bg-white";
const selectCls = inputCls;
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const BankManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'banks' | 'loans' | 'schedules' | 'analytics'>('overview');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loans, setLoans] = useState<BankLoan[]>([]);
  const [upcomingSchedules, setUpcomingSchedules] = useState<LoanSchedule[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  // Search / Filters
  const [bankSearch, setBankSearch] = useState('');
  const [loanFilter, setLoanFilter] = useState({ status: '', type: '', bank_id: '' });
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');

  // Modals
  const [showBankForm, setShowBankForm] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showBankDetail, setShowBankDetail] = useState(false);
  const [showLoanDetail, setShowLoanDetail] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);

  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [editingLoan, setEditingLoan] = useState<BankLoan | null>(null);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [selectedBank, setSelectedBank] = useState<(Bank & { accounts: BankAccount[]; loans: BankLoan[] }) | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<BankLoan | null>(null);
  const [loanSchedules, setLoanSchedules] = useState<LoanSchedule[]>([]);
  const [payingSchedule, setPayingSchedule] = useState<LoanSchedule | null>(null);
  const [generatingForLoan, setGeneratingForLoan] = useState<BankLoan | null>(null);

  // Forms
  const emptyBankForm = { name: '', code: '', address: '', phone: '', email: '', contact_person: '', account_number: '', iban: '', swift_bic: '', notes: '' };
  const emptyLoanForm = { bank_id: '', loan_type: 'pret', label: '', description: '', principal_amount: '', interest_rate: '', total_amount: '', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' };
  const emptyAccountForm = { account_name: '', account_number: '', account_type: 'courant', currency: 'XOF', current_balance: '' };
  const emptyScheduleForm = { due_date: '', amount: '', principal_part: '', interest_part: '', notes: '' };

  const [bankForm, setBankForm] = useState(emptyBankForm);
  const [loanForm, setLoanForm] = useState(emptyLoanForm);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
  const [payForm, setPayForm] = useState({ paid_amount: '', paid_date: new Date().toISOString().split('T')[0] });
  const [generateForm, setGenerateForm] = useState({ num_months: '12', monthly_amount: '' });

  // ============================================================
  // DATA LOADING
  // ============================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [banksRes, summaryRes, upcomingRes] = await Promise.all([
        banksAPI.getAll(),
        banksAPI.getSummary(),
        banksAPI.getUpcomingSchedules(90),
      ]);
      setBanks(banksRes.data || []);
      setSummary(summaryRes.data || null);
      setUpcomingSchedules(upcomingRes.data || []);
    } catch (err: any) {
      showToast(err.message || 'Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLoans = useCallback(async () => {
    try {
      const res = await banksAPI.getAllLoans();
      setLoans(res.data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, []);

  useEffect(() => {
    loadData();
    loadLoans();
  }, [loadData, loadLoans]);

  // ============================================================
  // HANDLERS BANQUES
  // ============================================================
  const handleSaveBank = async () => {
    if (!bankForm.name.trim()) { showToast('Le nom de la banque est requis', 'error'); return; }
    try {
      if (editingBank) {
        await banksAPI.update(editingBank.id, bankForm);
        showToast('Banque modifiée avec succès');
      } else {
        await banksAPI.create(bankForm);
        showToast('Banque ajoutée avec succès');
      }
      setShowBankForm(false);
      setEditingBank(null);
      setBankForm(emptyBankForm);
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleDeleteBank = async (id: number) => {
    if (!confirm('Supprimer cette banque et tous ses comptes/prêts ?')) return;
    try {
      await banksAPI.delete(id);
      showToast('Banque supprimée');
      loadData();
      loadLoans();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleViewBank = async (id: number) => {
    try {
      const res = await banksAPI.getById(id);
      setSelectedBank(res.data);
      setShowBankDetail(true);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleEditBank = (bank: Bank) => {
    setEditingBank(bank);
    setBankForm({ name: bank.name, code: bank.code || '', address: bank.address || '', phone: bank.phone || '', email: bank.email || '', contact_person: bank.contact_person || '', account_number: bank.account_number || '', iban: bank.iban || '', swift_bic: bank.swift_bic || '', notes: bank.notes || '' });
    setShowBankForm(true);
  };

  // ============================================================
  // HANDLERS COMPTES
  // ============================================================
  const handleSaveAccount = async () => {
    if (!selectedBank) return;
    try {
      const payload = { ...accountForm, current_balance: parseFloat(accountForm.current_balance) || 0 };
      if (editingAccount) {
        await banksAPI.updateAccount(editingAccount.id, payload);
        showToast('Compte modifié');
      } else {
        await banksAPI.createAccount(selectedBank.id, payload);
        showToast('Compte ajouté');
      }
      const res = await banksAPI.getById(selectedBank.id);
      setSelectedBank(res.data);
      setShowAccountForm(false);
      setEditingAccount(null);
      setAccountForm(emptyAccountForm);
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleEditAccount = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      account_name: acc.account_name,
      account_number: acc.account_number,
      account_type: acc.account_type,
      currency: acc.currency,
      current_balance: String(acc.current_balance),
    });
    setShowAccountForm(true);
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!selectedBank || !confirm('Supprimer ce compte ?')) return;
    try {
      await banksAPI.deleteAccount(accountId);
      showToast('Compte supprimé');
      const res = await banksAPI.getById(selectedBank.id);
      setSelectedBank(res.data);
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  // ============================================================
  // HANDLERS PRÊTS
  // ============================================================
  const handleSaveLoan = async () => {
    if (!loanForm.bank_id || !loanForm.label || !loanForm.principal_amount) { showToast('Banque, libellé et montant principal requis', 'error'); return; }
    try {
      const data = { ...loanForm, principal_amount: parseFloat(loanForm.principal_amount), interest_rate: parseFloat(loanForm.interest_rate) || 0, total_amount: parseFloat(loanForm.total_amount) || parseFloat(loanForm.principal_amount) };
      if (editingLoan) {
        await banksAPI.updateLoan(editingLoan.id, data);
        showToast('Prêt/dette modifié');
      } else {
        await banksAPI.createLoan(data);
        showToast('Prêt/dette ajouté');
      }
      setShowLoanForm(false);
      setEditingLoan(null);
      setLoanForm(emptyLoanForm);
      loadLoans();
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleDeleteLoan = async (id: number) => {
    if (!confirm('Supprimer ce prêt/dette et ses échéances ?')) return;
    try {
      await banksAPI.deleteLoan(id);
      showToast('Prêt/dette supprimé');
      loadLoans();
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleViewLoan = async (loan: BankLoan) => {
    setSelectedLoan(loan);
    try {
      const res = await banksAPI.getSchedules(loan.id);
      setLoanSchedules(res.data || []);
      setShowLoanDetail(true);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleEditLoan = (loan: BankLoan) => {
    setEditingLoan(loan);
    setLoanForm({
      bank_id: String(loan.bank_id), loan_type: loan.loan_type, label: loan.label, description: loan.description || '',
      principal_amount: String(loan.principal_amount), interest_rate: String(loan.interest_rate), total_amount: String(loan.total_amount),
      start_date: loan.start_date ? loan.start_date.split('T')[0] : '', end_date: loan.end_date ? loan.end_date.split('T')[0] : '', notes: loan.notes || '',
    });
    setShowLoanForm(true);
  };

  // ============================================================
  // HANDLERS ÉCHÉANCES
  // ============================================================
  const handleSaveSchedule = async () => {
    if (!selectedLoan) return;
    try {
      await banksAPI.createSchedule(selectedLoan.id, { ...scheduleForm, amount: parseFloat(scheduleForm.amount), principal_part: parseFloat(scheduleForm.principal_part) || 0, interest_part: parseFloat(scheduleForm.interest_part) || 0 });
      showToast('Échéance ajoutée');
      const res = await banksAPI.getSchedules(selectedLoan.id);
      setLoanSchedules(res.data || []);
      setShowScheduleForm(false);
      setScheduleForm(emptyScheduleForm);
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handlePaySchedule = async () => {
    if (!payingSchedule) return;
    try {
      await banksAPI.paySchedule(payingSchedule.id, { paid_amount: parseFloat(payForm.paid_amount) || payingSchedule.amount, paid_date: payForm.paid_date });
      showToast('Paiement enregistré');
      if (selectedLoan) {
        const res = await banksAPI.getSchedules(selectedLoan.id);
        setLoanSchedules(res.data || []);
      }
      setShowPayModal(false);
      setPayingSchedule(null);
      loadLoans();
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleGenerateSchedules = async () => {
    if (!generatingForLoan) return;
    try {
      const result = await banksAPI.generateSchedules(generatingForLoan.id, { num_months: parseInt(generateForm.num_months), monthly_amount: parseFloat(generateForm.monthly_amount) || undefined });
      showToast(result.message || 'Échéances générées');
      if (selectedLoan && selectedLoan.id === generatingForLoan.id) {
        const res = await banksAPI.getSchedules(selectedLoan.id);
        setLoanSchedules(res.data || []);
      }
      setShowGenerateModal(false);
      setGeneratingForLoan(null);
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm('Supprimer cette échéance ?')) return;
    try {
      await banksAPI.deleteSchedule(id);
      showToast('Échéance supprimée');
      if (selectedLoan) {
        const res = await banksAPI.getSchedules(selectedLoan.id);
        setLoanSchedules(res.data || []);
      }
      loadData();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  // ============================================================
  // FILTERED DATA
  // ============================================================
  const filteredBanks = banks.filter(b => !bankSearch || b.name.toLowerCase().includes(bankSearch.toLowerCase()) || (b.code || '').toLowerCase().includes(bankSearch.toLowerCase()));

  const filteredLoans = loans.filter(l => {
    if (loanFilter.status && l.status !== loanFilter.status) return false;
    if (loanFilter.type && l.loan_type !== loanFilter.type) return false;
    if (loanFilter.bank_id && String(l.bank_id) !== loanFilter.bank_id) return false;
    return true;
  });

  const filteredSchedules = upcomingSchedules.filter(s => {
    if (scheduleFilter === 'overdue') return s.status === 'en_retard';
    if (scheduleFilter === 'upcoming') return s.status === 'a_payer' && daysUntil(s.due_date) <= 7;
    return true;
  });

  // ============================================================
  // TABS
  // ============================================================
  const tabs = [
    { id: 'overview' as const, label: 'Vue d\'ensemble', icon: PieChart },
    { id: 'banks' as const, label: 'Banques', icon: Landmark },
    { id: 'loans' as const, label: 'Prêts & Dettes', icon: CreditCard },
    { id: 'schedules' as const, label: 'Échéances', icon: Calendar },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            Gestion Bancaire
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Banques, prêts, dettes, soldes et suivi des échéances</p>
        </div>
        <button onClick={() => { loadData(); loadLoans(); }} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors shadow-sm">
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
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-gray-200/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CONTENU */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'banks' && renderBanks()}
      {activeTab === 'loans' && renderLoans()}
      {activeTab === 'schedules' && renderSchedules()}
      {activeTab === 'analytics' && <ModuleAnalytics module="banks" title="Analytics Gestion Bancaire" />}

      {/* MODALS */}
      {showBankForm && renderBankFormModal()}
      {showBankDetail && selectedBank && renderBankDetailModal()}
      {showLoanForm && renderLoanFormModal()}
      {showLoanDetail && selectedLoan && renderLoanDetailModal()}
      {showPayModal && payingSchedule && renderPayModal()}
      {showGenerateModal && generatingForLoan && renderGenerateModal()}
      {showAccountForm && renderAccountFormModal()}
      {showScheduleForm && renderScheduleFormModal()}

      {/* TOAST */}
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

    const s = summary || { total_balance: 0, total_debt: 0, active_loans: 0, month_due: 0, month_schedules_count: 0, overdue_amount: 0, overdue_count: 0, banks_count: 0 };
    const netPosition = s.total_balance - s.total_debt;
    const isHealthy = netPosition >= 0;

    return (
      <div className="space-y-6">
        {/* Position nette */}
        <div className={`rounded-2xl p-6 border ${isHealthy ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200' : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className={`text-sm font-medium ${isHealthy ? 'text-emerald-700' : 'text-red-700'}`}>Position nette</p>
              <p className={`text-3xl font-bold mt-1 ${isHealthy ? 'text-emerald-800' : 'text-red-800'}`}>
                {netPosition >= 0 ? '+' : ''}{formatMoney(netPosition)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Soldes bancaires − Dettes en cours</p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="flex items-center gap-1 text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="font-bold">{formatMoney(s.total_balance)}</span>
                </div>
                <p className="text-gray-500 text-xs">Soldes</p>
              </div>
              <div className="w-px h-8 bg-gray-300" />
              <div className="text-center">
                <div className="flex items-center gap-1 text-red-600">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="font-bold">{formatMoney(s.total_debt)}</span>
                </div>
                <p className="text-gray-500 text-xs">Dettes</p>
              </div>
            </div>
          </div>
          {/* Barre ratio */}
          {(s.total_balance > 0 || s.total_debt > 0) && (
            <div className="mt-4 flex rounded-full h-3 overflow-hidden bg-gray-200">
              <div className="bg-emerald-500 transition-all" style={{ width: `${(s.total_balance / Math.max(s.total_balance + s.total_debt, 1)) * 100}%` }} />
              <div className="bg-red-400 transition-all" style={{ width: `${(s.total_debt / Math.max(s.total_balance + s.total_debt, 1)) * 100}%` }} />
            </div>
          )}
        </div>

        {/* Cards KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={Landmark} label="Banques" value={String(s.banks_count)} gradient="from-indigo-500 to-purple-500" onClick={() => setActiveTab('banks')} />
          <KPICard icon={CreditCard} label="Prêts actifs" value={String(s.active_loans)} gradient="from-orange-500 to-cyan-500" onClick={() => setActiveTab('loans')} />
          <KPICard icon={Calendar} label="Échéances du mois" value={formatMoney(s.month_due)} sub={`${s.month_schedules_count} paiement(s)`} gradient="from-amber-500 to-orange-500" onClick={() => setActiveTab('schedules')} />
          <KPICard icon={AlertTriangle} label="En retard" value={s.overdue_count > 0 ? formatMoney(s.overdue_amount) : '0 F'} sub={s.overdue_count > 0 ? `${s.overdue_count} échéance(s)` : 'Aucune'} gradient="from-red-500 to-rose-500" alert={s.overdue_count > 0} onClick={() => { setScheduleFilter('overdue'); setActiveTab('schedules'); }} />
        </div>

        {/* Échéances à venir */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Prochaines échéances
            </h3>
            {upcomingSchedules.length > 0 && (
              <button onClick={() => setActiveTab('schedules')} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                Tout voir <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {upcomingSchedules.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Aucune échéance à venir</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcomingSchedules.slice(0, 8).map(sch => {
                const st = scheduleStatusStyle(sch.status);
                const days = daysUntil(sch.due_date);
                const isOverdue = sch.status === 'en_retard';
                const isUrgent = days <= 7 && days >= 0;
                return (
                  <div key={sch.id} className={`px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50/40' : isUrgent ? 'bg-amber-50/30' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-500 animate-pulse' : isUrgent ? 'bg-amber-500' : 'bg-orange-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{sch.bank_name} — {sch.loan_label}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(sch.due_date)}
                          {isOverdue && <span className="ml-1.5 text-red-600 font-medium">({Math.abs(days)} j en retard)</span>}
                          {isUrgent && !isOverdue && <span className="ml-1.5 text-amber-600 font-medium">(dans {days} j)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatMoney(sch.amount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      </div>
                      <button
                        onClick={() => { setPayingSchedule(sch); setPayForm({ paid_amount: String(sch.amount), paid_date: new Date().toISOString().split('T')[0] }); setShowPayModal(true); }}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs hover:bg-emerald-100 font-medium transition-colors"
                      >
                        Payer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Répartition par banque */}
        {banks.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Répartition par banque</h3>
            <div className="space-y-3">
              {banks.map(bank => {
                const balance = parseFloat(String(bank.total_balance)) || 0;
                const debt = parseFloat(String(bank.total_remaining_debt)) || 0;
                const maxVal = Math.max(...banks.map(b => Math.max(parseFloat(String(b.total_balance)) || 0, parseFloat(String(b.total_remaining_debt)) || 0)), 1);
                return (
                  <div key={bank.id} className="group cursor-pointer" onClick={() => handleViewBank(bank.id)}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">{bank.name}</span>
                      <div className="flex gap-4 text-xs">
                        <span className="text-emerald-600 font-medium">{formatMoney(balance)}</span>
                        {debt > 0 && <span className="text-red-500 font-medium">-{formatMoney(debt)}</span>}
                      </div>
                    </div>
                    <div className="flex rounded-full h-2 overflow-hidden bg-gray-100">
                      <div className="bg-emerald-400 transition-all" style={{ width: `${(balance / maxVal) * 100}%` }} />
                    </div>
                    {debt > 0 && (
                      <div className="flex rounded-full h-1.5 overflow-hidden bg-gray-100 mt-1">
                        <div className="bg-red-300 transition-all" style={{ width: `${(debt / maxVal) * 100}%` }} />
                      </div>
                    )}
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
  // LISTE DES BANQUES
  // ============================================================
  function renderBanks() {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher une banque..." value={bankSearch} onChange={e => setBankSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 bg-white" />
          </div>
          <button onClick={() => { setEditingBank(null); setBankForm(emptyBankForm); setShowBankForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-200/50 text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> Ajouter une banque
          </button>
        </div>

        {filteredBanks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Landmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{bankSearch ? 'Aucun résultat' : 'Aucune banque enregistrée'}</p>
            {!bankSearch && (
              <button onClick={() => { setEditingBank(null); setBankForm(emptyBankForm); setShowBankForm(true); }} className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm hover:bg-indigo-100">
                Ajouter votre première banque
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBanks.map(bank => {
              const balance = parseFloat(String(bank.total_balance)) || 0;
              const debt = parseFloat(String(bank.total_remaining_debt)) || 0;
              return (
                <div key={bank.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200/40 flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{bank.name}</h3>
                        {bank.code && <p className="text-xs text-gray-400">{bank.code}</p>}
                      </div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => handleViewBank(bank.id)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500" title="Détails"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleEditBank(bank)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500" title="Modifier"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteBank(bank.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Solde total</span>
                      <span className="font-bold text-emerald-600">{formatMoney(balance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Dettes en cours</span>
                      <span className={`font-bold ${debt > 0 ? 'text-red-600' : 'text-gray-400'}`}>{debt > 0 ? formatMoney(debt) : '—'}</span>
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>{bank.accounts_count} compte{bank.accounts_count > 1 ? 's' : ''}</span>
                      <span>{bank.active_loans_count} prêt{bank.active_loans_count > 1 ? 's' : ''} actif{bank.active_loans_count > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {bank.contact_person && (
                    <div className="mt-3 pt-2.5 border-t border-gray-100 text-xs text-gray-400 truncate">
                      👤 {bank.contact_person} {bank.phone && `• ${bank.phone}`}
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
  // LISTE DES PRÊTS
  // ============================================================
  function renderLoans() {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Filtres */}
          <div className="flex flex-wrap gap-2">
            <select value={loanFilter.status} onChange={e => setLoanFilter({ ...loanFilter, status: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/40">
              <option value="">Tous statuts</option>
              <option value="en_cours">En cours</option>
              <option value="termine">Terminé</option>
              <option value="en_retard">En retard</option>
              <option value="annule">Annulé</option>
            </select>
            <select value={loanFilter.type} onChange={e => setLoanFilter({ ...loanFilter, type: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/40">
              <option value="">Tous types</option>
              {LOAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={loanFilter.bank_id} onChange={e => setLoanFilter({ ...loanFilter, bank_id: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/40">
              <option value="">Toutes banques</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button onClick={() => { setEditingLoan(null); setLoanForm(emptyLoanForm); setShowLoanForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-200/50 text-sm font-medium" disabled={banks.length === 0}>
            <Plus className="w-4 h-4" /> Nouveau prêt / dette
          </button>
        </div>

        {filteredLoans.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun prêt ou dette {loanFilter.status || loanFilter.type || loanFilter.bank_id ? 'correspondant' : 'enregistré'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLoans.map(loan => {
              const ltype = LOAN_TYPES.find(t => t.value === loan.loan_type);
              const lstatus = loanStatusStyle(loan.status);
              const progress = loan.total_amount > 0 ? (loan.amount_paid / loan.total_amount) * 100 : 0;
              const StatusIcon = lstatus.icon;

              return (
                <div key={loan.id} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{loan.label}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${loanTypeStyle(loan.loan_type)}`}>{ltype?.label}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${lstatus.cls}`}>
                            <StatusIcon className="w-3 h-3" /> {lstatus.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{loan.bank_name} • Depuis le {formatDate(loan.start_date)}{loan.interest_rate > 0 && ` • ${loan.interest_rate}% d'intérêt`}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Payé / Total</p>
                        <p className="text-sm">
                          <span className="font-semibold text-emerald-600">{formatMoney(loan.amount_paid)}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="font-semibold text-gray-700">{formatMoney(loan.total_amount)}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Reste</p>
                        <p className="text-lg font-bold text-red-600">{formatMoney(loan.remaining_amount)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-gradient-to-r from-emerald-500 to-green-400 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-500 w-12 text-right">{progress.toFixed(0)}%</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleViewLoan(loan)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500" title="Échéances"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => { setGeneratingForLoan(loan); setGenerateForm({ num_months: '12', monthly_amount: '' }); setShowGenerateModal(true); }} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title="Générer échéances"><Calendar className="w-4 h-4" /></button>
                      <button onClick={() => handleEditLoan(loan)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500" title="Modifier"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteLoan(loan.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
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
  // ÉCHÉANCES
  // ============================================================
  function renderSchedules() {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex gap-2">
            {([['all', 'Toutes'], ['overdue', 'En retard'], ['upcoming', 'Cette semaine']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setScheduleFilter(val)} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${scheduleFilter === val ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {label}
                {val === 'overdue' && summary && summary.overdue_count > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{summary.overdue_count}</span>}
              </button>
            ))}
          </div>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{scheduleFilter !== 'all' ? 'Aucune échéance correspondante' : 'Aucune échéance à venir'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left">
                    <th className="px-5 py-3.5 font-medium text-gray-600">Date</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600">Banque</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600">Prêt</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600 text-right">Montant</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600">Statut</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600">Délai</th>
                    <th className="px-5 py-3.5 font-medium text-gray-600 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSchedules.map(sch => {
                    const st = scheduleStatusStyle(sch.status);
                    const days = daysUntil(sch.due_date);
                    const isOverdue = sch.status === 'en_retard';
                    return (
                      <tr key={sch.id} className={`hover:bg-gray-50/50 transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}>
                        <td className={`px-5 py-3.5 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>{formatDate(sch.due_date)}</td>
                        <td className="px-5 py-3.5 text-gray-600">{sch.bank_name}</td>
                        <td className="px-5 py-3.5 text-gray-900 font-medium">{sch.loan_label}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-900">{formatMoney(sch.amount)}</td>
                        <td className="px-5 py-3.5"><span className={`px-2.5 py-1 text-xs rounded-full font-medium ${st.cls}`}>{st.label}</span></td>
                        <td className="px-5 py-3.5 text-xs">
                          {isOverdue ? <span className="text-red-600 font-semibold">{Math.abs(days)}j retard</span>
                            : days <= 7 ? <span className="text-amber-600 font-semibold">{days}j</span>
                            : <span className="text-gray-500">{days}j</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => { setPayingSchedule(sch); setPayForm({ paid_amount: String(sch.amount), paid_date: new Date().toISOString().split('T')[0] }); setShowPayModal(true); }}
                            className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs hover:bg-emerald-100 font-semibold transition-colors"
                          >
                            Payer
                          </button>
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

  function ModalFooter({ onCancel, onSave, saveLabel, saveColor }: { onCancel: () => void; onSave: () => void; saveLabel: string; saveColor?: string }) {
    return (
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
        <button onClick={onCancel} className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors">Annuler</button>
        <button onClick={onSave} className={`px-5 py-2.5 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md transition-all ${saveColor || 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-200/50'}`}>
          <Save className="w-4 h-4" /> {saveLabel}
        </button>
      </div>
    );
  }

  // --- Bank Form ---
  function renderBankFormModal() {
    return (
      <ModalWrapper onClose={() => setShowBankForm(false)}>
        <ModalHeader title={editingBank ? 'Modifier la banque' : 'Nouvelle banque'} onClose={() => setShowBankForm(false)} />
        <div className="p-6 space-y-4">
          <div><label className={labelCls}>Nom de la banque *</label><input type="text" value={bankForm.name} onChange={e => setBankForm({ ...bankForm, name: e.target.value })} className={inputCls} placeholder="Ex: CBAO, BHS, BSIC..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Code</label><input type="text" value={bankForm.code} onChange={e => setBankForm({ ...bankForm, code: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Téléphone</label><input type="text" value={bankForm.phone} onChange={e => setBankForm({ ...bankForm, phone: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Email</label><input type="email" value={bankForm.email} onChange={e => setBankForm({ ...bankForm, email: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Adresse</label><input type="text" value={bankForm.address} onChange={e => setBankForm({ ...bankForm, address: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Personne de contact</label><input type="text" value={bankForm.contact_person} onChange={e => setBankForm({ ...bankForm, contact_person: e.target.value })} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>IBAN</label><input type="text" value={bankForm.iban} onChange={e => setBankForm({ ...bankForm, iban: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>SWIFT / BIC</label><input type="text" value={bankForm.swift_bic} onChange={e => setBankForm({ ...bankForm, swift_bic: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Notes</label><textarea value={bankForm.notes} onChange={e => setBankForm({ ...bankForm, notes: e.target.value })} className={inputCls} rows={2} /></div>
        </div>
        <ModalFooter onCancel={() => setShowBankForm(false)} onSave={handleSaveBank} saveLabel={editingBank ? 'Modifier' : 'Enregistrer'} />
      </ModalWrapper>
    );
  }

  // --- Bank Detail ---
  function renderBankDetailModal() {
    if (!selectedBank) return null;
    return (
      <ModalWrapper onClose={() => setShowBankDetail(false)} wide>
        <ModalHeader title={selectedBank.name} onClose={() => setShowBankDetail(false)} />
        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {selectedBank.code && <div><span className="text-gray-500">Code:</span> <span className="font-medium">{selectedBank.code}</span></div>}
            {selectedBank.phone && <div><span className="text-gray-500">Tél:</span> <span className="font-medium">{selectedBank.phone}</span></div>}
            {selectedBank.email && <div><span className="text-gray-500">Email:</span> <span className="font-medium">{selectedBank.email}</span></div>}
            {selectedBank.contact_person && <div><span className="text-gray-500">Contact:</span> <span className="font-medium">{selectedBank.contact_person}</span></div>}
            {selectedBank.address && <div className="col-span-2"><span className="text-gray-500">Adresse:</span> <span className="font-medium">{selectedBank.address}</span></div>}
          </div>

          {/* Comptes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Comptes bancaires</h4>
              <button onClick={() => { setEditingAccount(null); setAccountForm(emptyAccountForm); setShowAccountForm(true); }} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
            {selectedBank.accounts.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">Aucun compte enregistré</p>
            ) : (
              <div className="space-y-2">
                {selectedBank.accounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{acc.account_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">N° {acc.account_number} • {acc.account_type === 'courant' ? 'Courant' : acc.account_type === 'epargne' ? 'Épargne' : 'Pro'} • {acc.currency}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-emerald-600">{formatMoney(parseFloat(String(acc.current_balance)) || 0)}</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditAccount(acc)} className="p-1 hover:bg-amber-100 rounded text-amber-500"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteAccount(acc.id)} className="p-1 hover:bg-red-100 rounded text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prêts */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Prêts & Dettes liés</h4>
            {selectedBank.loans.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">Aucun prêt ou dette</p>
            ) : (
              <div className="space-y-2">
                {selectedBank.loans.map(loan => {
                  const ltype = LOAN_TYPES.find(t => t.value === loan.loan_type);
                  const progress = loan.total_amount > 0 ? (loan.amount_paid / loan.total_amount) * 100 : 0;
                  return (
                    <div key={loan.id} className="p-3.5 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{loan.label}</p>
                          <p className="text-xs text-gray-500">{ltype?.label} • {loanStatusStyle(loan.status).label}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-600">{formatMoney(loan.remaining_amount)}</p>
                          <p className="text-xs text-gray-400">/ {formatMoney(loan.total_amount)}</p>
                        </div>
                      </div>
                      <div className="bg-gray-200 rounded-full h-1.5">
                        <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ModalWrapper>
    );
  }

  // --- Loan Form ---
  function renderLoanFormModal() {
    return (
      <ModalWrapper onClose={() => setShowLoanForm(false)}>
        <ModalHeader title={editingLoan ? 'Modifier le prêt/dette' : 'Nouveau prêt / dette'} onClose={() => setShowLoanForm(false)} />
        <div className="p-6 space-y-4">
          <div><label className={labelCls}>Banque *</label>
            <select value={loanForm.bank_id} onChange={e => setLoanForm({ ...loanForm, bank_id: e.target.value })} className={selectCls}>
              <option value="">Sélectionner une banque</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Type *</label>
            <select value={loanForm.loan_type} onChange={e => setLoanForm({ ...loanForm, loan_type: e.target.value })} className={selectCls}>
              {LOAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Libellé *</label><input type="text" value={loanForm.label} onChange={e => setLoanForm({ ...loanForm, label: e.target.value })} className={inputCls} placeholder="Ex: Crédit équipement..." /></div>
          <div><label className={labelCls}>Description</label><textarea value={loanForm.description} onChange={e => setLoanForm({ ...loanForm, description: e.target.value })} className={inputCls} rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Montant principal *</label><input type="number" value={loanForm.principal_amount} onChange={e => setLoanForm({ ...loanForm, principal_amount: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Taux d'intérêt (%)</label><input type="number" step="0.01" value={loanForm.interest_rate} onChange={e => setLoanForm({ ...loanForm, interest_rate: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Montant total (avec intérêts)</label><input type="number" value={loanForm.total_amount} onChange={e => setLoanForm({ ...loanForm, total_amount: e.target.value })} className={inputCls} placeholder="Laissez vide = montant principal" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Date de début *</label><input type="date" value={loanForm.start_date} onChange={e => setLoanForm({ ...loanForm, start_date: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Date de fin</label><input type="date" value={loanForm.end_date} onChange={e => setLoanForm({ ...loanForm, end_date: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Notes</label><textarea value={loanForm.notes} onChange={e => setLoanForm({ ...loanForm, notes: e.target.value })} className={inputCls} rows={2} /></div>
        </div>
        <ModalFooter onCancel={() => setShowLoanForm(false)} onSave={handleSaveLoan} saveLabel={editingLoan ? 'Modifier' : 'Enregistrer'} />
      </ModalWrapper>
    );
  }

  // --- Loan Detail ---
  function renderLoanDetailModal() {
    if (!selectedLoan) return null;
    const progress = selectedLoan.total_amount > 0 ? (selectedLoan.amount_paid / selectedLoan.total_amount) * 100 : 0;
    return (
      <ModalWrapper onClose={() => setShowLoanDetail(false)} wide>
        <ModalHeader title={selectedLoan.label} onClose={() => setShowLoanDetail(false)} />
        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Total</p><p className="text-lg font-bold text-gray-900">{formatMoney(selectedLoan.total_amount)}</p></div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Payé</p><p className="text-lg font-bold text-emerald-600">{formatMoney(selectedLoan.amount_paid)}</p></div>
            <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Reste</p><p className="text-lg font-bold text-red-600">{formatMoney(selectedLoan.remaining_amount)}</p></div>
            <div className="bg-orange-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Progression</p><p className="text-lg font-bold text-orange-600">{progress.toFixed(1)}%</p></div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-gradient-to-r from-emerald-500 to-green-400 h-3 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>

          {/* Échéances */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Échéances ({loanSchedules.length})</h4>
              <div className="flex gap-2">
                <button onClick={() => { setGeneratingForLoan(selectedLoan); setGenerateForm({ num_months: '12', monthly_amount: '' }); setShowGenerateModal(true); }} className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 font-medium"><Calendar className="w-4 h-4" /> Générer</button>
                <button onClick={() => { setScheduleForm(emptyScheduleForm); setShowScheduleForm(true); }} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"><Plus className="w-4 h-4" /> Ajouter</button>
              </div>
            </div>
            {loanSchedules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucune échéance. Cliquez sur "Générer" pour créer automatiquement.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50/80 text-left">
                    <th className="px-4 py-2.5 font-medium text-gray-600">Date</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Montant</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Statut</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Payé le</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {loanSchedules.map(sch => {
                      const st = scheduleStatusStyle(sch.status);
                      return (
                        <tr key={sch.id} className={sch.status === 'en_retard' ? 'bg-red-50/30' : ''}>
                          <td className="px-4 py-2.5">{formatDate(sch.due_date)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">{formatMoney(sch.amount)}</td>
                          <td className="px-4 py-2.5"><span className={`px-2 py-0.5 text-xs rounded-full ${st.cls}`}>{st.label}</span></td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{sch.paid_date ? `${formatDate(sch.paid_date)} (${formatMoney(sch.paid_amount)})` : '-'}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-1">
                              {sch.status !== 'paye' && (
                                <button onClick={() => { setPayingSchedule(sch); setPayForm({ paid_amount: String(sch.amount), paid_date: new Date().toISOString().split('T')[0] }); setShowPayModal(true); }} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs hover:bg-emerald-100 font-medium">Payer</button>
                              )}
                              <button onClick={() => handleDeleteSchedule(sch.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </ModalWrapper>
    );
  }

  // --- Pay Modal ---
  function renderPayModal() {
    if (!payingSchedule) return null;
    return (
      <ModalWrapper onClose={() => setShowPayModal(false)}>
        <ModalHeader title="Payer l'échéance" onClose={() => setShowPayModal(false)} />
        <div className="px-6 pt-2 pb-1">
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Échéance du {formatDate(payingSchedule.due_date)}</p>
            <p className="text-xl font-bold text-emerald-700">{formatMoney(payingSchedule.amount)}</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={labelCls}>Montant payé</label><input type="number" value={payForm.paid_amount} onChange={e => setPayForm({ ...payForm, paid_amount: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Date de paiement</label><input type="date" value={payForm.paid_date} onChange={e => setPayForm({ ...payForm, paid_date: e.target.value })} className={inputCls} /></div>
        </div>
        <ModalFooter onCancel={() => setShowPayModal(false)} onSave={handlePaySchedule} saveLabel="Confirmer le paiement" saveColor="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/50" />
      </ModalWrapper>
    );
  }

  // --- Generate Modal ---
  function renderGenerateModal() {
    if (!generatingForLoan) return null;
    return (
      <ModalWrapper onClose={() => setShowGenerateModal(false)}>
        <ModalHeader title="Générer les échéances" onClose={() => setShowGenerateModal(false)} />
        <div className="px-6 pt-2 pb-1">
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">{generatingForLoan.label}</p>
            <p className="text-lg font-bold text-indigo-700">Reste: {formatMoney(generatingForLoan.remaining_amount)}</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div><label className={labelCls}>Nombre de mois</label><input type="number" value={generateForm.num_months} onChange={e => setGenerateForm({ ...generateForm, num_months: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Montant mensuel (optionnel)</label><input type="number" value={generateForm.monthly_amount} onChange={e => setGenerateForm({ ...generateForm, monthly_amount: e.target.value })} className={inputCls} placeholder="Auto-calculé si vide" /></div>
        </div>
        <ModalFooter onCancel={() => setShowGenerateModal(false)} onSave={handleGenerateSchedules} saveLabel="Générer" />
      </ModalWrapper>
    );
  }

  // --- Account Form ---
  function renderAccountFormModal() {
    return (
      <ModalWrapper onClose={() => { setShowAccountForm(false); setEditingAccount(null); }}>
        <ModalHeader title={editingAccount ? 'Modifier le compte' : 'Nouveau compte bancaire'} onClose={() => { setShowAccountForm(false); setEditingAccount(null); }} />
        <div className="p-6 space-y-4">
          <div><label className={labelCls}>Nom du compte *</label><input type="text" value={accountForm.account_name} onChange={e => setAccountForm({ ...accountForm, account_name: e.target.value })} className={inputCls} placeholder="Ex: Compte courant principal" /></div>
          <div><label className={labelCls}>Numéro de compte *</label><input type="text" value={accountForm.account_number} onChange={e => setAccountForm({ ...accountForm, account_number: e.target.value })} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Type</label>
              <select value={accountForm.account_type} onChange={e => setAccountForm({ ...accountForm, account_type: e.target.value })} className={selectCls}>
                <option value="courant">Courant</option><option value="epargne">Épargne</option><option value="professionnel">Professionnel</option>
              </select>
            </div>
            <div><label className={labelCls}>Devise</label>
              <select value={accountForm.currency} onChange={e => setAccountForm({ ...accountForm, currency: e.target.value })} className={selectCls}>
                <option value="XOF">XOF (FCFA)</option><option value="EUR">EUR</option><option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div><label className={labelCls}>Solde actuel</label><input type="number" value={accountForm.current_balance} onChange={e => setAccountForm({ ...accountForm, current_balance: e.target.value })} className={inputCls} placeholder="0" /></div>
        </div>
        <ModalFooter onCancel={() => { setShowAccountForm(false); setEditingAccount(null); }} onSave={handleSaveAccount} saveLabel={editingAccount ? 'Modifier' : 'Enregistrer'} />
      </ModalWrapper>
    );
  }

  // --- Schedule Form ---
  function renderScheduleFormModal() {
    return (
      <ModalWrapper onClose={() => setShowScheduleForm(false)}>
        <ModalHeader title="Nouvelle échéance" onClose={() => setShowScheduleForm(false)} />
        <div className="p-6 space-y-4">
          <div><label className={labelCls}>Date d'échéance *</label><input type="date" value={scheduleForm.due_date} onChange={e => setScheduleForm({ ...scheduleForm, due_date: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Montant total *</label><input type="number" value={scheduleForm.amount} onChange={e => setScheduleForm({ ...scheduleForm, amount: e.target.value })} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Part capital</label><input type="number" value={scheduleForm.principal_part} onChange={e => setScheduleForm({ ...scheduleForm, principal_part: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Part intérêts</label><input type="number" value={scheduleForm.interest_part} onChange={e => setScheduleForm({ ...scheduleForm, interest_part: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Notes</label><textarea value={scheduleForm.notes} onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })} className={inputCls} rows={2} /></div>
        </div>
        <ModalFooter onCancel={() => setShowScheduleForm(false)} onSave={handleSaveSchedule} saveLabel="Enregistrer" />
      </ModalWrapper>
    );
  }
};

// ============================================================
// KPI Card Component
// ============================================================
const KPICard: React.FC<{ icon: any; label: string; value: string; sub?: string; gradient: string; alert?: boolean; onClick?: () => void }> = ({ icon: Icon, label, value, sub, gradient, alert, onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${alert ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-100'}`}>
    <div className="flex items-start justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-1 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-9 h-9 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center flex-shrink-0 ${alert ? 'animate-pulse' : ''}`}>
        <Icon className="w-4.5 h-4.5 text-white" />
      </div>
    </div>
  </div>
);

export default BankManagement;
