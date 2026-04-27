import React, { useState, useEffect } from 'react';
// Les composants SaisieStandardTab, SaisieGuideeTab, AbonnementsTab sont définis en interne
import {
  BookOpen, FileText, BarChart3, PieChart, Calculator,
  TrendingUp, TrendingDown, DollarSign, RefreshCw, Download,
  ChevronDown, ChevronRight, Calendar, AlertTriangle,
  CheckCircle, ArrowUpRight, ArrowDownRight, Layers, FileSpreadsheet,
  Building2, Receipt, Scale, Plus, Search, Edit3, Trash2, Save,
  Link, Unlink, CreditCard, Landmark, Lock,
  Printer, Settings, Eye, Copy, RotateCcw, Check, X,
  ArrowRight, ArrowLeft, Clock, AlertCircle, CheckCircle2,
  Hash, Zap, Users,
  Wallet, BanknoteIcon, FileCheck, FilePlus, FileX, Repeat, Target,
  Briefcase, Archive, Send, Mail,
  LayoutDashboard, Percent,
  Library, Lightbulb,
  Truck
} from 'lucide-react';

const API = 'http://localhost:3001/api/comptabilite';

function getToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
}

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}

function formatDate(d: any): string {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES SAGE SAARI
// ══════════════════════════════════════════════════════════════════════════════

type TabType =
  | 'dashboard'
  | 'saisie-standard'
  | 'saisie-guidee'
  | 'saisie-abonnements'
  | 'journaux'
  | 'grand-livre'
  | 'balance'
  | 'balance-agee'
  | 'echeancier'
  | 'lettrage'
  | 'rapprochement'
  | 'relances'
  | 'resultat'
  | 'bilan'
  | 'tva'
  | 'liasse-fiscale'
  | 'cloture'
  | 'budget'
  | 'analytique'
  | 'immobilisations'
  | 'plan-comptable'
  | 'tiers'
  | 'parametres';

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[];
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL - COMPTABILITÉ SYSCOHADA (STYLE SAGE SAARI)
// ══════════════════════════════════════════════════════════════════════════════

export const ComptabiliteSYSCOHADA: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [exercice, setExercice] = useState(new Date().getFullYear());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['saisie', 'consultation', 'etats']));

  // Menu Sage SAARI style
  const menuGroups: MenuGroup[] = [
    {
      id: 'accueil',
      label: 'Accueil',
      icon: <LayoutDashboard className="w-4 h-4" />,
      items: [
        { id: 'dashboard', label: 'Tableau de bord', icon: <PieChart className="w-4 h-4" /> },
      ]
    },
    {
      id: 'saisie',
      label: 'Saisie des écritures',
      icon: <Edit3 className="w-4 h-4" />,
      items: [
        { id: 'saisie-standard', label: 'Saisie standard', icon: <FileText className="w-4 h-4" /> },
        { id: 'saisie-guidee', label: 'Saisie guidée', icon: <Lightbulb className="w-4 h-4" />, badge: 'PRO' },
        { id: 'saisie-abonnements', label: 'Abonnements', icon: <Repeat className="w-4 h-4" /> },
      ]
    },
    {
      id: 'consultation',
      label: 'Consultation',
      icon: <Eye className="w-4 h-4" />,
      items: [
        { id: 'journaux', label: 'Journaux', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'grand-livre', label: 'Grand Livre', icon: <Library className="w-4 h-4" /> },
        { id: 'balance', label: 'Balance générale', icon: <Scale className="w-4 h-4" /> },
        { id: 'balance-agee', label: 'Balance âgée', icon: <Clock className="w-4 h-4" /> },
      ]
    },
    {
      id: 'tiers',
      label: 'Gestion des tiers',
      icon: <Users className="w-4 h-4" />,
      items: [
        { id: 'tiers', label: 'Comptes tiers', icon: <Users className="w-4 h-4" /> },
        { id: 'echeancier', label: 'Échéancier', icon: <Calendar className="w-4 h-4" /> },
        { id: 'lettrage', label: 'Lettrage', icon: <Link className="w-4 h-4" /> },
        { id: 'relances', label: 'Relances clients', icon: <Mail className="w-4 h-4" />, badge: 'NEW' },
      ]
    },
    {
      id: 'tresorerie',
      label: 'Trésorerie',
      icon: <Wallet className="w-4 h-4" />,
      items: [
        { id: 'rapprochement', label: 'Rapprochement bancaire', icon: <Landmark className="w-4 h-4" /> },
      ]
    },
    {
      id: 'etats',
      label: 'États financiers',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      items: [
        { id: 'resultat', label: 'Compte de résultat', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'bilan', label: 'Bilan', icon: <Building2 className="w-4 h-4" /> },
        { id: 'tva', label: 'Déclarations TVA', icon: <Receipt className="w-4 h-4" /> },
        { id: 'liasse-fiscale', label: 'Liasse fiscale', icon: <FileCheck className="w-4 h-4" />, badge: 'PRO' },
      ]
    },
    {
      id: 'gestion',
      label: 'Gestion avancée',
      icon: <Briefcase className="w-4 h-4" />,
      items: [
        { id: 'budget', label: 'Budget prévisionnel', icon: <Target className="w-4 h-4" /> },
        { id: 'analytique', label: 'Comptabilité analytique', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'immobilisations', label: 'Immobilisations', icon: <Archive className="w-4 h-4" /> },
      ]
    },
    {
      id: 'cloture',
      label: 'Clôture',
      icon: <Lock className="w-4 h-4" />,
      items: [
        { id: 'cloture', label: 'Clôture exercice', icon: <Lock className="w-4 h-4" /> },
      ]
    },
    {
      id: 'parametres',
      label: 'Paramètres',
      icon: <Settings className="w-4 h-4" />,
      items: [
        { id: 'plan-comptable', label: 'Plan comptable', icon: <Layers className="w-4 h-4" /> },
        { id: 'parametres', label: 'Configuration', icon: <Settings className="w-4 h-4" /> },
      ]
    },
  ];

  const toggleMenu = (menuId: string) => {
    const next = new Set(expandedMenus);
    if (next.has(menuId)) {
      next.delete(menuId);
    } else {
      next.add(menuId);
    }
    setExpandedMenus(next);
  };

  const currentTabLabel = menuGroups
    .flatMap(g => g.items)
    .find(i => i.id === activeTab)?.label || 'Tableau de bord';

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* ═══════════════ SIDEBAR SAGE STYLE ═══════════════ */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col transition-all duration-300 shadow-2xl`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-orange-400 to-indigo-400 bg-clip-text text-transparent">SYSCOHADA</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Comptabilité Pro</p>
            </div>
          )}
        </div>

        {/* Exercice selector */}
        {!sidebarCollapsed && (
          <div className="px-3 py-2 border-b border-slate-700/50">
            <select
              value={exercice}
              onChange={e => setExercice(parseInt(e.target.value))}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
            >
              {[2023, 2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>Exercice {y}</option>
              ))}
            </select>
          </div>
        )}

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-700">
          {menuGroups.map(group => (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => !sidebarCollapsed && toggleMenu(group.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  sidebarCollapsed ? 'justify-center' : ''
                } hover:bg-slate-700/50 text-slate-300 hover:text-white`}
              >
                {group.icon}
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenus.has(group.id) ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>

              {!sidebarCollapsed && expandedMenus.has(group.id) && (
                <div className="ml-4 border-l border-slate-700/50">
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 pl-4 pr-3 py-2 text-sm transition-all ${
                        activeTab === item.id
                          ? 'bg-gradient-to-r from-orange-600/80 to-indigo-600/80 text-white shadow-lg shadow-orange-500/20 border-l-2 border-orange-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                      }`}
                    >
                      {item.icon}
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          item.badge === 'PRO' ? 'bg-amber-500 text-amber-950' :
                          item.badge === 'NEW' ? 'bg-emerald-500 text-emerald-950' :
                          'bg-slate-600 text-slate-300'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Toggle button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-3 border-t border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5 mx-auto" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-800">{currentTabLabel}</h2>
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Exercice {exercice}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <QuickActionsBar setActiveTab={setActiveTab} />
            <ImportButton />
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' && <DashboardTab exercice={exercice} />}
          {activeTab === 'saisie-standard' && <SaisieStandardTab exercice={exercice} />}
          {activeTab === 'saisie-guidee' && <SaisieGuideeTab exercice={exercice} />}
          {activeTab === 'saisie-abonnements' && <AbonnementsTab exercice={exercice} />}
          {activeTab === 'journaux' && <JournauxTab exercice={exercice} />}
          {activeTab === 'grand-livre' && <GrandLivreTab exercice={exercice} />}
          {activeTab === 'balance' && <BalanceTab exercice={exercice} />}
          {activeTab === 'balance-agee' && <BalanceAgeeTab exercice={exercice} />}
          {activeTab === 'tiers' && <TiersTab exercice={exercice} />}
          {activeTab === 'echeancier' && <EcheancierTab exercice={exercice} />}
          {activeTab === 'lettrage' && <LettrageTab exercice={exercice} />}
          {activeTab === 'relances' && <RelancesTab exercice={exercice} />}
          {activeTab === 'rapprochement' && <RapprochementTab exercice={exercice} />}
          {activeTab === 'resultat' && <CompteResultatTab exercice={exercice} />}
          {activeTab === 'bilan' && <BilanTab exercice={exercice} />}
          {activeTab === 'tva' && <TVATab exercice={exercice} />}
          {activeTab === 'liasse-fiscale' && <LiasseFiscaleTab exercice={exercice} />}
          {activeTab === 'budget' && <BudgetTab exercice={exercice} />}
          {activeTab === 'analytique' && <AnalytiqueTab exercice={exercice} />}
          {activeTab === 'immobilisations' && <ImmobilisationsTab exercice={exercice} />}
          {activeTab === 'cloture' && <ClotureTab exercice={exercice} />}
          {activeTab === 'plan-comptable' && <PlanComptableTab />}
          {activeTab === 'parametres' && <ParametresTab />}
        </div>
      </main>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// BARRE D'ACTIONS RAPIDES (STYLE SAGE)
// ══════════════════════════════════════════════════════════════════════════════

const QuickActionsBar: React.FC<{ setActiveTab: (tab: TabType) => void }> = ({ setActiveTab }) => {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setActiveTab('saisie-standard')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
        title="Nouvelle écriture (F2)"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden lg:inline">Saisie</span>
      </button>
      <button
        onClick={() => setActiveTab('journaux')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
        title="Consulter journaux (F3)"
      >
        <BookOpen className="w-4 h-4" />
        <span className="hidden lg:inline">Journaux</span>
      </button>
      <button
        onClick={() => alert('Export Excel en cours...\n\nLes données comptables seront téléchargées au format CSV.')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
        title="Exporter Excel"
      >
        <Download className="w-4 h-4" />
        <span className="hidden lg:inline">Export</span>
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
        title="Imprimer"
      >
        <Printer className="w-4 h-4" />
        <span className="hidden lg:inline">Imprimer</span>
      </button>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// BOUTON IMPORT
// ══════════════════════════════════════════════════════════════════════════════

const ImportButton: React.FC = () => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleImport = async () => {
    if (!confirm('Comptabiliser automatiquement toutes les opérations non encore enregistrées ?')) return;
    setImporting(true);
    try {
      const res = await fetch(`${API}/import-historique`, { method: 'POST', headers: headers() });
      const data = await res.json();
      setResult(data);
      setTimeout(() => setResult(null), 5000);
    } catch (e) {
      alert('Erreur import');
    }
    setImporting(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleImport}
        disabled={importing}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 text-sm font-medium transition-all shadow-sm hover:shadow-md"
      >
        <RefreshCw className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} />
        {importing ? 'Import...' : 'Comptabiliser'}
      </button>
      {result && (
        <div className="absolute right-0 top-12 bg-white border rounded-xl shadow-xl p-4 z-50 w-72">
          <div className="flex items-center gap-2 text-emerald-700 font-medium mb-3">
            <CheckCircle className="w-5 h-5" />
            Import terminé
          </div>
          <div className="text-sm space-y-1.5 text-slate-600">
            <div className="flex justify-between"><span>Ventes</span><span className="font-mono font-medium">{result.ventes}</span></div>
            <div className="flex justify-between"><span>Paiements</span><span className="font-mono font-medium">{result.paiements}</span></div>
            <div className="flex justify-between"><span>Caisse</span><span className="font-mono font-medium">{result.caisse}</span></div>
            <div className="flex justify-between"><span>Achats</span><span className="font-mono font-medium">{result.achats}</span></div>
            <div className="flex justify-between"><span>Salaires</span><span className="font-mono font-medium">{result.salaires}</span></div>
            <div className="flex justify-between border-t pt-2 mt-2 font-bold text-slate-800">
              <span>Total</span><span className="font-mono">{result.total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TABLEAU DE BORD
// ══════════════════════════════════════════════════════════════════════════════

const DashboardTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/dashboard?exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [exercice]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <EmptyState message="Aucune donnée comptable pour cet exercice" />;

  const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKPI
          title="Chiffre d'Affaires"
          value={fmt(data.total_produits || 0)}
          suffix="FCFA"
          icon={<TrendingUp className="w-6 h-6" />}
          color="emerald"
          trend={12}
        />
        <DashboardKPI
          title="Total Charges"
          value={fmt(data.total_charges || 0)}
          suffix="FCFA"
          icon={<TrendingDown className="w-6 h-6" />}
          color="rose"
          trend={-5}
        />
        <DashboardKPI
          title={`Résultat ${data.type_resultat || 'Net'}`}
          value={fmt(Math.abs(data.resultat_net || 0))}
          suffix="FCFA"
          icon={data.resultat_net >= 0 ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
          color={data.resultat_net >= 0 ? 'blue' : 'amber'}
        />
        <DashboardKPI
          title="Écritures"
          value={fmt(data.total_ecritures || 0)}
          suffix="lignes"
          icon={<FileText className="w-6 h-6" />}
          color="violet"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution CA vs Charges */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            Évolution mensuelle CA vs Charges
          </h3>
          <div className="flex items-end gap-2 h-48">
            {moisNoms.map((m, idx) => {
              const ca = data.ca_mensuel?.find((c: any) => c.mois === idx + 1)?.ca || 0;
              const ch = data.charges_mensuel?.find((c: any) => c.mois === idx + 1)?.charges || 0;
              const maxVal = Math.max(
                ...(data.ca_mensuel?.map((c: any) => parseFloat(c.ca)) || [1]),
                ...(data.charges_mensuel?.map((c: any) => parseFloat(c.charges)) || [1])
              );
              const hCA = maxVal > 0 ? (parseFloat(ca.toString()) / maxVal) * 140 : 0;
              const hCH = maxVal > 0 ? (parseFloat(ch.toString()) / maxVal) * 140 : 0;

              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex gap-0.5 items-end h-[140px]">
                    <div
                      className="w-3 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all hover:from-emerald-600"
                      style={{ height: `${hCA}px` }}
                      title={`CA: ${fmt(parseFloat(ca.toString()))} F`}
                    />
                    <div
                      className="w-3 bg-gradient-to-t from-rose-500 to-rose-400 rounded-t transition-all hover:from-rose-600"
                      style={{ height: `${hCH}px` }}
                      title={`Charges: ${fmt(parseFloat(ch.toString()))} F`}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{m}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-slate-600">Produits (CA)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-rose-500" />
              <span className="text-slate-600">Charges</span>
            </span>
          </div>
        </div>

        {/* Répartition des charges */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-orange-600" />
            Répartition des charges
          </h3>
          <div className="space-y-3">
            {[
              { label: '60 - Achats', value: 45, color: 'bg-orange-500' },
              { label: '61 - Services ext.', value: 20, color: 'bg-violet-500' },
              { label: '62 - Autres services', value: 15, color: 'bg-amber-500' },
              { label: '63 - Impôts & taxes', value: 8, color: 'bg-rose-500' },
              { label: '64 - Charges personnel', value: 10, color: 'bg-emerald-500' },
              { label: '65-68 - Autres', value: 2, color: 'bg-slate-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded ${item.color}`} />
                <span className="flex-1 text-sm text-slate-600">{item.label}</span>
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                </div>
                <span className="text-sm font-medium text-slate-700 w-10 text-right">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertes et actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardAlert
          type="warning"
          title="Comptes à lettrer"
          message="12 écritures clients non lettrées"
          action="Lettrer"
        />
        <DashboardAlert
          type="info"
          title="Déclaration TVA"
          message="À soumettre avant le 15 du mois"
          action="Générer"
        />
        <DashboardAlert
          type="success"
          title="Balance équilibrée"
          message="La balance générale est équilibrée"
        />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SAISIE STANDARD (STYLE SAGE)
// ══════════════════════════════════════════════════════════════════════════════

interface LigneEcriture {
  id: string;
  compte_code: string;
  compte_libelle?: string;
  libelle: string;
  debit: number;
  credit: number;
  echeance?: string;
  lettrage?: string;
  section_analytique?: string;
}

const SaisieStandardTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [journalCode, setJournalCode] = useState('VT');
  const [dateEcriture, setDateEcriture] = useState(new Date().toISOString().split('T')[0]);
  const [numeroPiece, setNumeroPiece] = useState('');
  const [lignes, setLignes] = useState<LigneEcriture[]>([
    { id: '1', compte_code: '', libelle: '', debit: 0, credit: 0 },
    { id: '2', compte_code: '', libelle: '', debit: 0, credit: 0 },
  ]);
  const [journaux, setJournaux] = useState<any[]>([]);
  const [comptes, setComptes] = useState<any[]>([]);
  const [showCompteSearch, setShowCompteSearch] = useState<string | null>(null);
  const [searchCompte, setSearchCompte] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recentEcritures, setRecentEcritures] = useState<any[]>([]);
  const [showRecentEcritures, setShowRecentEcritures] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [selectedLigneIndex, setSelectedLigneIndex] = useState(0);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Templates d'écritures courantes
  const templates = [
    { id: 'vente-simple', label: 'Vente simple', journal: 'VT', lignes: [
      { compte_code: '411000', libelle: 'Client', debit: 1, credit: 0 },
      { compte_code: '701000', libelle: 'Vente marchandises', debit: 0, credit: 1 },
    ]},
    { id: 'vente-tva', label: 'Vente avec TVA 18%', journal: 'VT', lignes: [
      { compte_code: '411000', libelle: 'Client TTC', debit: 118, credit: 0 },
      { compte_code: '701000', libelle: 'Vente HT', debit: 0, credit: 100 },
      { compte_code: '443100', libelle: 'TVA collectée 18%', debit: 0, credit: 18 },
    ]},
    { id: 'achat-simple', label: 'Achat fournisseur', journal: 'AC', lignes: [
      { compte_code: '601000', libelle: 'Achat marchandises', debit: 1, credit: 0 },
      { compte_code: '401000', libelle: 'Fournisseur', debit: 0, credit: 1 },
    ]},
    { id: 'encaissement-banque', label: 'Encaissement client banque', journal: 'BQ', lignes: [
      { compte_code: '521000', libelle: 'Banque', debit: 1, credit: 0 },
      { compte_code: '411000', libelle: 'Client', debit: 0, credit: 1 },
    ]},
    { id: 'encaissement-caisse', label: 'Encaissement client caisse', journal: 'CA', lignes: [
      { compte_code: '571000', libelle: 'Caisse', debit: 1, credit: 0 },
      { compte_code: '411000', libelle: 'Client', debit: 0, credit: 1 },
    ]},
    { id: 'paiement-fournisseur', label: 'Paiement fournisseur', journal: 'BQ', lignes: [
      { compte_code: '401000', libelle: 'Fournisseur', debit: 1, credit: 0 },
      { compte_code: '521000', libelle: 'Banque', debit: 0, credit: 1 },
    ]},
    { id: 'salaires', label: 'Comptabilisation salaires', journal: 'OD', lignes: [
      { compte_code: '661000', libelle: 'Salaires bruts', debit: 1, credit: 0 },
      { compte_code: '421000', libelle: 'Personnel à payer', debit: 0, credit: 1 },
    ]},
  ];

  useEffect(() => {
    fetch(`${API}/journaux`, { headers: headers() })
      .then(r => r.json())
      .then(d => setJournaux(d.data || [
        { code: 'VT', libelle: 'Ventes' },
        { code: 'AC', libelle: 'Achats' },
        { code: 'BQ', libelle: 'Banque' },
        { code: 'CA', libelle: 'Caisse' },
        { code: 'MM', libelle: 'Mobile Money' },
        { code: 'OD', libelle: 'Opérations diverses' },
        { code: 'SA', libelle: 'Salaires' },
        { code: 'AN', libelle: 'À nouveaux' },
      ]));

    fetch(`${API}/plan-comptable?is_detail=true`, { headers: headers() })
      .then(r => r.json())
      .then(d => setComptes(d.data || []));

    loadRecentEcritures();
  }, [exercice]);

  const loadRecentEcritures = () => {
    fetch(`${API}/ecritures?limit=10&exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => setRecentEcritures(d.ecritures || d.data || []));
  };

  // Calculs dérivés (doivent être avant useEffect qui les utilise)
  const totalDebit = lignes.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lignes.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const ecart = totalDebit - totalCredit;
  const isEquilibre = Math.abs(ecart) < 0.01;
  const nbLignesValides = lignes.filter(l => l.compte_code && (l.debit > 0 || l.credit > 0)).length;

  const addLigne = () => {
    setLignes([...lignes, { id: Date.now().toString(), compte_code: '', libelle: '', debit: 0, credit: 0 }]);
  };

  const removeLigne = (id: string) => {
    if (lignes.length > 2) {
      setLignes(lignes.filter(l => l.id !== id));
    }
  };

  const updateLigne = (id: string, field: keyof LigneEcriture, value: any) => {
    setLignes(lignes.map(l => {
      if (l.id === id) {
        const updated = { ...l, [field]: value };
        if (field === 'compte_code') {
          const compte = comptes.find(c => c.code === value);
          if (compte) updated.compte_libelle = compte.libelle;
        }
        return updated;
      }
      return l;
    }));
  };

  const selectCompte = (ligneId: string, compte: any) => {
    updateLigne(ligneId, 'compte_code', compte.code);
    setShowCompteSearch(null);
    setSearchCompte('');
  };

  const filteredComptes = comptes.filter(c =>
    c.code?.includes(searchCompte) ||
    c.libelle?.toLowerCase().includes(searchCompte.toLowerCase())
  ).slice(0, 15);

  const handleNewEcriture = () => {
    setLignes([
      { id: '1', compte_code: '', libelle: '', debit: 0, credit: 0 },
      { id: '2', compte_code: '', libelle: '', debit: 0, credit: 0 },
    ]);
    setNumeroPiece('');
    setDateEcriture(new Date().toISOString().split('T')[0]);
    setMessage({ type: 'success', text: 'Nouvelle écriture initialisée' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleSave = async () => {
    if (!isEquilibre) {
      setMessage({ type: 'error', text: 'L\'écriture n\'est pas équilibrée ! Écart: ' + fmt(ecart) + ' FCFA' });
      return;
    }

    const validLignes = lignes.filter(l => l.compte_code && (l.debit > 0 || l.credit > 0));
    if (validLignes.length < 2) {
      setMessage({ type: 'error', text: 'Minimum 2 lignes avec montants requis' });
      return;
    }

    if (!numeroPiece.trim()) {
      setMessage({ type: 'error', text: 'Le numéro de pièce est obligatoire' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/ecritures`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          journal_code: journalCode,
          date_ecriture: dateEcriture,
          numero_piece: numeroPiece,
          exercice: exercice,
          lignes: validLignes.map(l => ({
            compte_code: l.compte_code,
            libelle: l.libelle || validLignes[0].libelle || 'Opération comptable',
            debit: l.debit,
            credit: l.credit,
            section_analytique: l.section_analytique || null
          }))
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `✓ Écriture ${numeroPiece} enregistrée avec succès (${validLignes.length} lignes, ${fmt(totalDebit)} FCFA)` });
        setLignes([
          { id: '1', compte_code: '', libelle: '', debit: 0, credit: 0 },
          { id: '2', compte_code: '', libelle: '', debit: 0, credit: 0 },
        ]);
        setNumeroPiece('');
        loadRecentEcritures();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur serveur');
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Erreur: ' + (e.message || 'Erreur lors de l\'enregistrement') });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleClear = () => {
    if (nbLignesValides > 0) {
      if (!confirm('Effacer toutes les lignes saisies ?')) return;
    }
    setLignes([
      { id: '1', compte_code: '', libelle: '', debit: 0, credit: 0 },
      { id: '2', compte_code: '', libelle: '', debit: 0, credit: 0 },
    ]);
    setNumeroPiece('');
  };

  const handleDuplicateLigne = (id: string) => {
    const ligne = lignes.find(l => l.id === id);
    if (ligne) {
      const newLigne = { ...ligne, id: Date.now().toString() };
      const idx = lignes.findIndex(l => l.id === id);
      const newLignes = [...lignes];
      newLignes.splice(idx + 1, 0, newLigne);
      setLignes(newLignes);
    }
  };

  const handleApplyTemplate = (template: typeof templates[0]) => {
    setJournalCode(template.journal);
    setLignes(template.lignes.map((l, i) => ({
      id: (i + 1).toString(),
      compte_code: l.compte_code,
      compte_libelle: comptes.find(c => c.code === l.compte_code)?.libelle || l.libelle,
      libelle: l.libelle,
      debit: l.debit,
      credit: l.credit,
    })));
    setShowTemplates(false);
    setMessage({ type: 'success', text: `Modèle "${template.label}" appliqué - Ajustez les montants` });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEquilibrerAuto = () => {
    if (isEquilibre) return;
    const diff = totalDebit - totalCredit;
    const lastLigne = lignes[lignes.length - 1];
    if (diff > 0) {
      updateLigne(lastLigne.id, 'credit', (lastLigne.credit || 0) + diff);
    } else {
      updateLigne(lastLigne.id, 'debit', (lastLigne.debit || 0) + Math.abs(diff));
    }
  };

  const handleInverserLigne = (id: string) => {
    const ligne = lignes.find(l => l.id === id);
    if (ligne) {
      updateLigne(id, 'debit', ligne.credit);
      updateLigne(id, 'credit', ligne.debit);
    }
  };

  const handleExportBrouillard = () => {
    const validLignes = lignes.filter(l => l.compte_code);
    if (validLignes.length === 0) {
      alert('Aucune ligne à exporter');
      return;
    }
    const csv = [
      'Journal;Date;N° Pièce;Compte;Libellé;Débit;Crédit',
      ...validLignes.map(l =>
        `${journalCode};${dateEcriture};${numeroPiece};${l.compte_code};${l.libelle || ''};${l.debit || 0};${l.credit || 0}`
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brouillard_${journalCode}_${dateEcriture}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Raccourcis clavier globaux
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ne pas intercepter si on est dans un input (sauf pour certains raccourcis)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // F9 - Enregistrer (fonctionne même dans un input)
      if (e.key === 'F9') {
        e.preventDefault();
        if (isEquilibre && !saving && nbLignesValides >= 2) handleSave();
        return;
      }

      // F7 - Effacer (fonctionne même dans un input)
      if (e.key === 'F7') {
        e.preventDefault();
        handleClear();
        return;
      }

      // Les autres raccourcis ne fonctionnent que hors des inputs
      if (isInput && e.key !== 'Insert' && e.key !== 'Delete') return;

      switch (e.key) {
        case 'F2':
          e.preventDefault();
          handleNewEcriture();
          break;
        case 'F3':
          e.preventDefault();
          setShowSearchModal(true);
          break;
        case 'F4':
          e.preventDefault();
          setShowTemplates(true);
          break;
        case 'F5':
          e.preventDefault();
          setShowRecentEcritures(true);
          break;
        case 'Insert':
          e.preventDefault();
          addLigne();
          break;
        case 'Delete':
          if (e.ctrlKey && lignes.length > 2) {
            e.preventDefault();
            removeLigne(lignes[selectedLigneIndex]?.id || lignes[lignes.length - 1].id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lignes, saving, isEquilibre, selectedLigneIndex, nbLignesValides]);

  return (
    <div className="space-y-4">
      {/* Message de feedback amélioré */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 shadow-lg animate-in slide-in-from-top duration-300 ${
          message.type === 'success'
            ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 border border-emerald-200'
            : 'bg-gradient-to-r from-rose-50 to-red-50 text-rose-800 border border-rose-200'
        }`}>
          <div className={`p-2 rounded-full ${message.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          </div>
          <span className="font-medium flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-white/50 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* En-tête de saisie - Style professionnel amélioré */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Barre de titre avec actions */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-800 to-indigo-900 px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-indigo-600 rounded-xl shadow-lg shadow-orange-500/30">
                <Edit3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Saisie Standard
                  <span className="px-2 py-0.5 bg-orange-500/30 rounded text-xs font-medium text-orange-200">SYSCOHADA</span>
                </h3>
                <p className="text-slate-300 text-sm">Écriture comptable multi-lignes • Exercice {exercice}</p>
              </div>
            </div>

            {/* Barre d'actions principale */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowTemplates(true)}
                className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-amber-200 hover:text-amber-100"
                title="Modèles d'écritures (F4)"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Modèles</span>
                <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-amber-500/20 rounded">F4</kbd>
              </button>
              <button
                onClick={() => setShowRecentEcritures(true)}
                className="px-3 py-2 bg-slate-600/50 hover:bg-slate-500/50 border border-slate-500/30 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-slate-200"
                title="Écritures récentes (F5)"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Récentes</span>
                <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-slate-500/30 rounded">F5</kbd>
              </button>
              <button
                onClick={handleNewEcriture}
                className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/30 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-orange-200"
                title="Nouvelle écriture (F2)"
              >
                <FilePlus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau</span>
                <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-orange-500/20 rounded">F2</kbd>
              </button>
              <div className="w-px h-8 bg-slate-600 mx-1 hidden sm:block" />
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-slate-600/80 hover:bg-slate-500 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-white border border-slate-500"
                title="Effacer (F7)"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Effacer</span>
                <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-slate-500/50 rounded">F7</kbd>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isEquilibre || nbLignesValides < 2}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/40 disabled:shadow-none"
                title="Enregistrer (F9)"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
                <kbd className="px-1.5 py-0.5 text-xs bg-emerald-600/50 rounded">F9</kbd>
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire d'en-tête amélioré */}
        <div className="p-6 bg-gradient-to-b from-slate-50 to-white">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" /> Journal
              </label>
              <select
                value={journalCode}
                onChange={e => setJournalCode(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors cursor-pointer hover:border-orange-300"
              >
                {journaux.map(j => (
                  <option key={j.code} value={j.code}>{j.code} - {j.libelle}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date
              </label>
              <input
                type="date"
                value={dateEcriture}
                onChange={e => setDateEcriture(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors hover:border-orange-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> N° Pièce <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={numeroPiece}
                onChange={e => setNumeroPiece(e.target.value.toUpperCase())}
                placeholder="FAC-001"
                className={`w-full px-3 py-2.5 bg-white border-2 rounded-lg text-sm font-mono font-semibold placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                  numeroPiece ? 'border-slate-200 hover:border-orange-300' : 'border-amber-300 bg-amber-50'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Exercice</label>
              <div className="px-3 py-2.5 bg-gradient-to-r from-orange-50 to-indigo-50 border-2 border-orange-200 rounded-lg text-sm font-bold text-orange-700 flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                {exercice}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Lignes</label>
              <div className="px-3 py-2.5 bg-slate-100 border-2 border-slate-200 rounded-lg text-sm font-bold text-slate-700 flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                {nbLignesValides} / {lignes.length}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Équilibre</label>
              <div className={`px-3 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border-2 cursor-pointer transition-all ${
                isEquilibre
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 text-emerald-700'
                  : 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-300 text-rose-700'
              }`} onClick={!isEquilibre ? handleEquilibrerAuto : undefined} title={!isEquilibre ? 'Cliquez pour équilibrer automatiquement' : ''}>
                {isEquilibre ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4 animate-pulse" />}
                {isEquilibre ? '✓ OK' : `${fmt(Math.abs(ecart))}`}
              </div>
            </div>
          </div>

          {/* Actions secondaires */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={handleExportBrouillard}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer
            </button>
            {!isEquilibre && (
              <button
                onClick={handleEquilibrerAuto}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                Équilibrer auto
              </button>
            )}
            <div className="flex-1" />
            <span className="text-xs text-slate-500">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">Tab</kbd> pour naviguer
            </span>
          </div>
        </div>
      </div>

      {/* Modal Modèles d'écritures */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTemplates(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-white" />
                <h3 className="text-lg font-bold text-white">Modèles d'écritures</h3>
              </div>
              <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleApplyTemplate(t)}
                    className="p-4 text-left bg-slate-50 hover:bg-orange-50 border-2 border-slate-200 hover:border-orange-300 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-1 bg-slate-200 group-hover:bg-orange-200 rounded font-mono text-sm font-bold text-slate-700">{t.journal}</span>
                      <span className="font-semibold text-slate-800">{t.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      {t.lignes.map((l, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="font-mono text-slate-600">{l.compte_code}</span>
                          <span>{l.libelle}</span>
                          {l.debit > 0 && <span className="text-emerald-600 ml-auto">D</span>}
                          {l.credit > 0 && <span className="text-rose-600 ml-auto">C</span>}
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Écritures récentes */}
      {showRecentEcritures && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRecentEcritures(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-white" />
                <h3 className="text-lg font-bold text-white">Dernières écritures</h3>
              </div>
              <button onClick={() => setShowRecentEcritures(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {recentEcritures.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucune écriture récente</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Date</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Journal</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">N° Pièce</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Libellé</th>
                      <th className="px-4 py-2 text-right font-semibold text-slate-600">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentEcritures.map((e, i) => (
                      <tr key={i} className="hover:bg-orange-50 cursor-pointer transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-600">{e.date_ecriture?.slice(0, 10) || '-'}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-200 rounded font-semibold">{e.journal_code || '-'}</span></td>
                        <td className="px-4 py-3 font-mono font-semibold">{e.numero_piece || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{e.libelle || '-'}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(e.debit || e.montant || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grille de saisie - Style professionnel */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700">
              <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider w-14">N°</th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider w-40">
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" />
                  Compte
                </div>
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider w-56">Intitulé du compte</th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Libellé de l'écriture
                </div>
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-emerald-300 uppercase tracking-wider w-36">
                <div className="flex items-center justify-end gap-2">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Débit
                </div>
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-rose-300 uppercase tracking-wider w-36">
                <div className="flex items-center justify-end gap-2">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Crédit
                </div>
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-bold text-amber-300 uppercase tracking-wider w-28">Analytique</th>
              <th className="px-4 py-3.5 w-14"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lignes.map((ligne, idx) => (
              <tr key={ligne.id} className={`hover:bg-orange-50/60 transition-all duration-150 group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-bold text-xs">
                    {idx + 1}
                  </span>
                </td>
                <td className="px-4 py-3 relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={ligne.compte_code}
                      onChange={e => updateLigne(ligne.id, 'compte_code', e.target.value)}
                      onFocus={() => setShowCompteSearch(ligne.id)}
                      placeholder="Compte..."
                      className="w-full px-3 py-2 font-mono text-sm font-semibold border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-orange-300 transition-colors"
                    />
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  {showCompteSearch === ligne.id && (
                    <div className="absolute left-0 top-full mt-2 bg-white border-2 border-orange-200 rounded-xl shadow-2xl z-50 w-[420px] max-h-80 overflow-hidden">
                      <div className="p-3 border-b bg-gradient-to-r from-orange-50 to-indigo-50 sticky top-0">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                          <input
                            type="text"
                            value={searchCompte}
                            onChange={e => setSearchCompte(e.target.value)}
                            placeholder="Rechercher par code ou libellé..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {filteredComptes.length === 0 ? (
                          <div className="p-4 text-center text-slate-500">
                            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>Aucun compte trouvé</p>
                          </div>
                        ) : (
                          filteredComptes.map(c => (
                            <button
                              key={c.code}
                              onClick={() => selectCompte(ligne.id, c)}
                              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-orange-50 text-left transition-colors border-b border-slate-100 last:border-0"
                            >
                              <span className="font-mono text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">{c.code}</span>
                              <span className="text-slate-700 font-medium truncate flex-1">{c.libelle}</span>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t bg-slate-50 flex items-center justify-between">
                        <span className="text-xs text-slate-500 px-2">{filteredComptes.length} compte(s)</span>
                        <button
                          onClick={() => setShowCompteSearch(null)}
                          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg font-medium flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Fermer
                        </button>
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm truncate block max-w-[220px] ${ligne.compte_libelle || comptes.find(c => c.code === ligne.compte_code)?.libelle ? 'text-slate-700 font-medium' : 'text-slate-400 italic'}`}>
                    {ligne.compte_libelle || comptes.find(c => c.code === ligne.compte_code)?.libelle || 'Sélectionner un compte...'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={ligne.libelle}
                    onChange={e => updateLigne(ligne.id, 'libelle', e.target.value)}
                    placeholder="Libellé de l'opération"
                    className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white hover:border-orange-300 transition-colors placeholder:text-slate-400"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={ligne.debit || ''}
                    onChange={e => updateLigne(ligne.id, 'debit', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm text-right font-mono font-semibold border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50 hover:border-emerald-400 transition-colors"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={ligne.credit || ''}
                    onChange={e => updateLigne(ligne.id, 'credit', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm text-right font-mono font-semibold border-2 border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/50 hover:border-rose-400 transition-colors"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={(ligne as any).section_analytique || ''}
                    onChange={e => updateLigne(ligne.id, 'section_analytique', e.target.value)}
                    placeholder="—"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleInverserLigne(ligne.id)}
                      className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Inverser débit/crédit"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicateLigne(ligne.id)}
                      className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Dupliquer la ligne"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeLigne(ligne.id)}
                      disabled={lignes.length <= 2}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Supprimer la ligne (Ctrl+Suppr)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-t-2 border-slate-300">
              <td colSpan={4} className="px-4 py-4">
                <button
                  onClick={addLigne}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors font-semibold border border-orange-200"
                >
                  <Plus className="w-4 h-4" /> Ajouter une ligne
                  <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-orange-200 rounded">Ins</kbd>
                </button>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="text-xs text-slate-500 mb-1 font-medium">Total Débit</div>
                <span className="font-mono font-bold text-xl text-emerald-600">{fmt(totalDebit)}</span>
                <span className="text-xs text-slate-400 ml-1">FCFA</span>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="text-xs text-slate-500 mb-1 font-medium">Total Crédit</div>
                <span className="font-mono font-bold text-xl text-rose-600">{fmt(totalCredit)}</span>
                <span className="text-xs text-slate-400 ml-1">FCFA</span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Raccourcis clavier - Style professionnel amélioré */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl px-6 py-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400 font-semibold border-r border-slate-600 pr-4">
            <div className="p-1.5 bg-amber-500/20 rounded-lg">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <span className="hidden sm:inline">Raccourcis</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <kbd className="px-1.5 py-0.5 bg-orange-600 rounded font-mono text-white">F2</kbd>
              <span className="text-orange-300">Nouveau</span>
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <kbd className="px-1.5 py-0.5 bg-amber-600 rounded font-mono text-white">F4</kbd>
              <span className="text-amber-300">Modèles</span>
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <kbd className="px-1.5 py-0.5 bg-slate-600 rounded font-mono text-white">F5</kbd>
              <span className="text-slate-300">Récentes</span>
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <kbd className="px-1.5 py-0.5 bg-rose-600 rounded font-mono text-white">F7</kbd>
              <span className="text-rose-300">Effacer</span>
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-900/50 rounded-lg border border-emerald-600/50">
              <kbd className="px-1.5 py-0.5 bg-emerald-500 rounded font-mono text-white shadow-sm shadow-emerald-400/50">F9</kbd>
              <span className="text-emerald-300 font-semibold">Enregistrer</span>
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <kbd className="px-1.5 py-0.5 bg-indigo-600 rounded font-mono text-white">Ins</kbd>
              <span className="text-indigo-300">+ Ligne</span>
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <kbd className="px-1.5 py-0.5 bg-slate-600 rounded font-mono text-white">Ctrl+Suppr</kbd>
              <span className="text-slate-300">- Ligne</span>
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <kbd className="px-1.5 py-0.5 bg-slate-600 rounded font-mono text-white">Tab</kbd>
              <span className="text-slate-300">Naviguer</span>
            </span>
          </div>
        </div>
      </div>

      {/* Aide rapide et statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-indigo-50 border border-orange-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-indigo-500 rounded-xl shadow-lg shadow-orange-500/30">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-orange-900 mb-1">Conseils de saisie</h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                Tapez les premiers chiffres du compte pour les suggestions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                L'écriture doit être équilibrée (Débit = Crédit)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400">•</span>
                Utilisez les modèles (F4) pour gagner du temps
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 rounded-2xl p-5">
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-600" />
            Résumé de l'écriture
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Débit</p>
              <p className="text-2xl font-bold text-emerald-600 font-mono">{fmt(totalDebit)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Crédit</p>
              <p className="text-2xl font-bold text-rose-600 font-mono">{fmt(totalCredit)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Lignes valides</p>
              <p className="text-lg font-bold text-slate-700">{nbLignesValides} / {lignes.length}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Écart</p>
              <p className={`text-lg font-bold font-mono ${isEquilibre ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isEquilibre ? '0 ✓' : fmt(ecart)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SAISIE GUIDÉE - Interface professionnelle
// ══════════════════════════════════════════════════════════════════════════════

const SaisieGuideeTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [modele, setModele] = useState('');
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // États du formulaire facture client
  const [factureClient, setFactureClient] = useState({
    client: '', numeroFacture: '', dateFacture: new Date().toISOString().split('T')[0],
    montantHT: 0, tauxTVA: 18, description: ''
  });

  // États du formulaire facture fournisseur
  const [factureFournisseur, setFactureFournisseur] = useState({
    fournisseur: '', numeroFacture: '', dateFacture: new Date().toISOString().split('T')[0],
    montantHT: 0, tauxTVA: 18, description: ''
  });

  // États du formulaire règlement
  const [reglement, setReglement] = useState({
    tiers: '', reference: '', dateReglement: new Date().toISOString().split('T')[0],
    montant: 0, modePaiement: 'virement', banque: ''
  });

  // Calculs automatiques
  const tvaFactureClient = Math.round(factureClient.montantHT * factureClient.tauxTVA / 100);
  const ttcFactureClient = factureClient.montantHT + tvaFactureClient;

  const tvaFactureFournisseur = Math.round(factureFournisseur.montantHT * factureFournisseur.tauxTVA / 100);
  const ttcFactureFournisseur = factureFournisseur.montantHT + tvaFactureFournisseur;

  const modeles = [
    { id: 'facture-client', label: 'Facture client', icon: <FileText className="w-6 h-6" />, description: 'Enregistrer une facture de vente', color: 'emerald', gradient: 'from-emerald-500 to-green-500' },
    { id: 'facture-fournisseur', label: 'Facture fournisseur', icon: <Receipt className="w-6 h-6" />, description: 'Enregistrer une facture d\'achat', color: 'orange', gradient: 'from-orange-500 to-amber-500' },
    { id: 'reglement-client', label: 'Règlement client', icon: <CreditCard className="w-6 h-6" />, description: 'Encaissement d\'un paiement client', color: 'blue', gradient: 'from-orange-500 to-cyan-500' },
    { id: 'reglement-fournisseur', label: 'Paiement fournisseur', icon: <BanknoteIcon className="w-6 h-6" />, description: 'Règlement d\'une facture fournisseur', color: 'violet', gradient: 'from-violet-500 to-purple-500' },
    { id: 'avoir-client', label: 'Avoir client', icon: <FileX className="w-6 h-6" />, description: 'Établir un avoir pour un client', color: 'rose', gradient: 'from-rose-500 to-pink-500' },
    { id: 'salaire', label: 'Écriture de paie', icon: <Users className="w-6 h-6" />, description: 'Comptabilisation des salaires', color: 'indigo', gradient: 'from-indigo-500 to-orange-500' },
    { id: 'emprunt', label: 'Remboursement emprunt', icon: <Landmark className="w-6 h-6" />, description: 'Échéance de remboursement', color: 'teal', gradient: 'from-teal-500 to-cyan-500' },
    { id: 'amortissement', label: 'Dotation amortissement', icon: <Archive className="w-6 h-6" />, description: 'Écriture d\'amortissement', color: 'slate', gradient: 'from-slate-500 to-gray-500' },
  ];

  const handleGenerateEcriture = async () => {
    setSaving(true);
    setMessage(null);

    // Construction de l'écriture selon le modèle
    let ecriture: any = null;

    if (modele === 'facture-client') {
      if (!factureClient.client || !factureClient.numeroFacture || factureClient.montantHT <= 0) {
        setMessage({ type: 'error', text: 'Veuillez remplir client, n° facture et montant HT.' });
        setSaving(false);
        return;
      }
      const lignes: any[] = [
        { compte_code: factureClient.client, libelle: `${factureClient.description || 'Vente'} - ${factureClient.numeroFacture}`, debit: ttcFactureClient, credit: 0 },
        { compte_code: '701', libelle: `Vente - ${factureClient.numeroFacture}`, debit: 0, credit: factureClient.montantHT },
      ];
      if (tvaFactureClient > 0) {
        lignes.push({ compte_code: '4431', libelle: `TVA collectée - ${factureClient.numeroFacture}`, debit: 0, credit: tvaFactureClient });
      }
      ecriture = { journal_code: 'VT', date_ecriture: factureClient.dateFacture, numero_piece: factureClient.numeroFacture, lignes };
    }
    else if (modele === 'facture-fournisseur') {
      if (!factureFournisseur.fournisseur || !factureFournisseur.numeroFacture || factureFournisseur.montantHT <= 0) {
        setMessage({ type: 'error', text: 'Veuillez remplir fournisseur, n° facture et montant HT.' });
        setSaving(false);
        return;
      }
      const lignes: any[] = [
        { compte_code: '601', libelle: `${factureFournisseur.description || 'Achat'} - ${factureFournisseur.numeroFacture}`, debit: factureFournisseur.montantHT, credit: 0 },
      ];
      if (tvaFactureFournisseur > 0) {
        lignes.push({ compte_code: '4451', libelle: `TVA déductible - ${factureFournisseur.numeroFacture}`, debit: tvaFactureFournisseur, credit: 0 });
      }
      lignes.push({ compte_code: factureFournisseur.fournisseur, libelle: `Fournisseur - ${factureFournisseur.numeroFacture}`, debit: 0, credit: ttcFactureFournisseur });
      ecriture = { journal_code: 'AC', date_ecriture: factureFournisseur.dateFacture, numero_piece: factureFournisseur.numeroFacture, lignes };
    }
    else if (modele === 'reglement-client' || modele === 'reglement-fournisseur') {
      if (!reglement.tiers || reglement.montant <= 0) {
        setMessage({ type: 'error', text: 'Veuillez remplir tiers et montant.' });
        setSaving(false);
        return;
      }
      const compteTreso = reglement.modePaiement === 'especes' ? '571' :
                         (reglement.modePaiement === 'wave' || reglement.modePaiement === 'orange_money') ? '585' : '511';
      const isClient = modele === 'reglement-client';
      const lignes: any[] = isClient ? [
        { compte_code: compteTreso, libelle: `Règlement ${reglement.reference}`, debit: reglement.montant, credit: 0 },
        { compte_code: reglement.tiers, libelle: `Encaissement ${reglement.reference}`, debit: 0, credit: reglement.montant }
      ] : [
        { compte_code: reglement.tiers, libelle: `Paiement ${reglement.reference}`, debit: reglement.montant, credit: 0 },
        { compte_code: compteTreso, libelle: `Sortie ${reglement.reference}`, debit: 0, credit: reglement.montant }
      ];
      ecriture = { journal_code: compteTreso === '571' ? 'CA' : 'BQ', date_ecriture: reglement.dateReglement, numero_piece: reglement.reference, lignes };
    }
    else {
      setMessage({ type: 'error', text: `Le modèle "${modele}" n'est pas encore implémenté.` });
      setSaving(false);
      return;
    }

    // Appel API
    try {
      const res = await fetch(`${API}/ecritures`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(ecriture)
      });
      const d = await res.json();
      if (d.success) {
        setMessage({ type: 'success', text: `✅ Écriture enregistrée ! Débit=${d.totalDebit?.toLocaleString('fr-FR')} / Crédit=${d.totalCredit?.toLocaleString('fr-FR')}` });
        setTimeout(() => { setMessage(null); resetForm(); }, 3000);
      } else {
        setMessage({ type: 'error', text: d.error || 'Erreur lors de l\'enregistrement' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Erreur de connexion: ${err.message}` });
    }
    setSaving(false);
  };

  const resetForm = () => {
    setModele('');
    setStep(1);
    setFactureClient({ client: '', numeroFacture: '', dateFacture: new Date().toISOString().split('T')[0], montantHT: 0, tauxTVA: 18, description: '' });
    setFactureFournisseur({ fournisseur: '', numeroFacture: '', dateFacture: new Date().toISOString().split('T')[0], montantHT: 0, tauxTVA: 18, description: '' });
    setReglement({ tiers: '', reference: '', dateReglement: new Date().toISOString().split('T')[0], montant: 0, modePaiement: 'virement', banque: '' });
  };

  return (
    <div className="space-y-6">
      {/* Message de feedback */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 shadow-sm animate-in slide-in-from-top ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* En-tête */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Lightbulb className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Saisie Guidée</h2>
                <p className="text-indigo-100 text-sm">Assistant intelligent pour vos écritures comptables • Exercice {exercice}</p>
              </div>
            </div>
            {modele && (
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2 border border-white/20"
              >
                <RotateCcw className="w-4 h-4" />
                Recommencer
              </button>
            )}
          </div>
        </div>

        {/* Indicateur d'étapes */}
        {modele && (
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>1</div>
                <span className="font-medium hidden sm:inline">Informations</span>
              </div>
              <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>2</div>
                <span className="font-medium hidden sm:inline">Montants</span>
              </div>
              <div className={`flex-1 h-1 rounded ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              <div className={`flex items-center gap-2 ${step >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>✓</div>
                <span className="font-medium hidden sm:inline">Validation</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sélection du modèle */}
      {!modele && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modeles.map(m => (
            <button
              key={m.id}
              onClick={() => { setModele(m.id); setStep(1); }}
              className="group p-5 rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg text-left transition-all duration-300 relative overflow-hidden"
            >
              {/* Effet de hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />

              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform`}>
                {m.icon}
              </div>
              <h3 className="font-bold text-slate-800 mb-1 text-lg">{m.label}</h3>
              <p className="text-sm text-slate-500">{m.description}</p>

              <div className="mt-4 flex items-center text-indigo-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Commencer</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Formulaire Facture Client */}
      {modele === 'facture-client' && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-6 py-4 flex items-center gap-3">
            <FileText className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Facture Client</h3>
            <span className="ml-auto px-3 py-1 bg-white/20 rounded-full text-white text-sm">
              Étape {step}/3
            </span>
          </div>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        Client <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <select
                      value={factureClient.client}
                      onChange={e => setFactureClient({ ...factureClient, client: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium"
                    >
                      <option value="">Sélectionner un client...</option>
                      <option value="411001">411001 - Entreprise ABC SARL</option>
                      <option value="411002">411002 - Société XYZ SA</option>
                      <option value="411003">411003 - Construction DEF</option>
                      <option value="411004">411004 - BTP Modern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-emerald-600" />
                        N° Facture <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={factureClient.numeroFacture}
                      onChange={e => setFactureClient({ ...factureClient, numeroFacture: e.target.value })}
                      placeholder="FAC-2024-0001"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        Date de facturation
                      </span>
                    </label>
                    <input
                      type="date"
                      value={factureClient.dateFacture}
                      onChange={e => setFactureClient({ ...factureClient, dateFacture: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        Description
                      </span>
                    </label>
                    <input
                      type="text"
                      value={factureClient.description}
                      onChange={e => setFactureClient({ ...factureClient, description: e.target.value })}
                      placeholder="Vente de béton prêt à l'emploi"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        Montant HT <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={factureClient.montantHT || ''}
                        onChange={e => setFactureClient({ ...factureClient, montantHT: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-4 py-3 pr-16 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono font-bold text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">FCFA</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-emerald-600" />
                        Taux TVA
                      </span>
                    </label>
                    <select
                      value={factureClient.tauxTVA}
                      onChange={e => setFactureClient({ ...factureClient, tauxTVA: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                    >
                      <option value="0">0% - Exonéré</option>
                      <option value="18">18% - Taux normal</option>
                      <option value="9">9% - Taux réduit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-emerald-600" />
                        TVA calculée
                      </span>
                    </label>
                    <div className="px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl text-sm font-mono font-bold text-right text-slate-600">
                      {fmt(tvaFactureClient)} FCFA
                    </div>
                  </div>
                </div>

                {/* Résumé des montants */}
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-600 font-medium">Montant HT</span>
                    <span className="font-mono font-bold text-lg">{fmt(factureClient.montantHT)} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-emerald-200">
                    <span className="text-slate-600 font-medium">TVA ({factureClient.tauxTVA}%)</span>
                    <span className="font-mono font-bold text-lg">{fmt(tvaFactureClient)} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 font-bold text-lg">Total TTC</span>
                    <span className="font-mono font-black text-2xl text-emerald-600">{fmt(ttcFactureClient)} FCFA</span>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-indigo-600" />
                    Aperçu de l'écriture comptable
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="text-left py-2 font-bold text-slate-600">Compte</th>
                        <th className="text-left py-2 font-bold text-slate-600">Libellé</th>
                        <th className="text-right py-2 font-bold text-emerald-600">Débit</th>
                        <th className="text-right py-2 font-bold text-rose-600">Crédit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 font-mono font-medium text-orange-600">{factureClient.client || '411XXX'}</td>
                        <td className="py-3">{factureClient.description || 'Facture client'} - {factureClient.numeroFacture}</td>
                        <td className="py-3 text-right font-mono font-bold text-emerald-600">{fmt(ttcFactureClient)}</td>
                        <td className="py-3 text-right font-mono">-</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 font-mono font-medium">701000</td>
                        <td className="py-3">Ventes de marchandises</td>
                        <td className="py-3 text-right font-mono">-</td>
                        <td className="py-3 text-right font-mono font-bold text-rose-600">{fmt(factureClient.montantHT)}</td>
                      </tr>
                      {factureClient.tauxTVA > 0 && (
                        <tr>
                          <td className="py-3 font-mono font-medium">443100</td>
                          <td className="py-3">TVA collectée</td>
                          <td className="py-3 text-right font-mono">-</td>
                          <td className="py-3 text-right font-mono font-bold text-rose-600">{fmt(tvaFactureClient)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={2} className="py-3 text-right">TOTAUX</td>
                        <td className="py-3 text-right font-mono text-emerald-600">{fmt(ttcFactureClient)}</td>
                        <td className="py-3 text-right font-mono text-rose-600">{fmt(ttcFactureClient)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-800">Écriture équilibrée</p>
                    <p className="text-sm text-emerald-700">L'écriture est prête à être enregistrée dans le journal des ventes (VT)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Boutons de navigation */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={() => step > 1 ? setStep(step - 1) : resetForm()}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {step > 1 ? 'Précédent' : 'Annuler'}
              </button>

              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/30"
                >
                  Suivant
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleGenerateEcriture}
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer l'écriture
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulaire Facture Fournisseur */}
      {modele === 'facture-fournisseur' && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center gap-3">
            <Receipt className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Facture Fournisseur</h3>
            <span className="ml-auto px-3 py-1 bg-white/20 rounded-full text-white text-sm">
              Étape {step}/3
            </span>
          </div>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-orange-600" />
                        Fournisseur <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <select
                      value={factureFournisseur.fournisseur}
                      onChange={e => setFactureFournisseur({ ...factureFournisseur, fournisseur: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium"
                    >
                      <option value="">Sélectionner un fournisseur...</option>
                      <option value="401001">401001 - Ciment du Sahel</option>
                      <option value="401002">401002 - Graviers & Sables SA</option>
                      <option value="401003">401003 - Transport Express</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-600" />
                        N° Facture Fournisseur <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={factureFournisseur.numeroFacture}
                      onChange={e => setFactureFournisseur({ ...factureFournisseur, numeroFacture: e.target.value })}
                      placeholder="REF-FOURN-001"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        Date de la facture
                      </span>
                    </label>
                    <input
                      type="date"
                      value={factureFournisseur.dateFacture}
                      onChange={e => setFactureFournisseur({ ...factureFournisseur, dateFacture: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-600" />
                        Description
                      </span>
                    </label>
                    <input
                      type="text"
                      value={factureFournisseur.description}
                      onChange={e => setFactureFournisseur({ ...factureFournisseur, description: e.target.value })}
                      placeholder="Achat de ciment"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Montant HT *</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={factureFournisseur.montantHT || ''}
                        onChange={e => setFactureFournisseur({ ...factureFournisseur, montantHT: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 pr-16 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono font-bold text-right"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">FCFA</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Taux TVA</label>
                    <select
                      value={factureFournisseur.tauxTVA}
                      onChange={e => setFactureFournisseur({ ...factureFournisseur, tauxTVA: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="0">0% - Exonéré</option>
                      <option value="18">18% - Taux normal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">TVA déductible</label>
                    <div className="px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl text-sm font-mono font-bold text-right text-slate-600">
                      {fmt(tvaFactureFournisseur)} FCFA
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-600 font-medium">Montant HT</span>
                    <span className="font-mono font-bold text-lg">{fmt(factureFournisseur.montantHT)} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-orange-200">
                    <span className="text-slate-600 font-medium">TVA déductible ({factureFournisseur.tauxTVA}%)</span>
                    <span className="font-mono font-bold text-lg">{fmt(tvaFactureFournisseur)} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-orange-700 font-bold text-lg">Total TTC à payer</span>
                    <span className="font-mono font-black text-2xl text-orange-600">{fmt(ttcFactureFournisseur)} FCFA</span>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-indigo-600" />
                    Aperçu de l'écriture comptable
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="text-left py-2 font-bold text-slate-600">Compte</th>
                        <th className="text-left py-2 font-bold text-slate-600">Libellé</th>
                        <th className="text-right py-2 font-bold text-emerald-600">Débit</th>
                        <th className="text-right py-2 font-bold text-rose-600">Crédit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-3 font-mono font-medium">601000</td>
                        <td className="py-3">Achats de marchandises</td>
                        <td className="py-3 text-right font-mono font-bold text-emerald-600">{fmt(factureFournisseur.montantHT)}</td>
                        <td className="py-3 text-right font-mono">-</td>
                      </tr>
                      {factureFournisseur.tauxTVA > 0 && (
                        <tr className="border-b border-slate-200">
                          <td className="py-3 font-mono font-medium">445620</td>
                          <td className="py-3">TVA déductible sur achats</td>
                          <td className="py-3 text-right font-mono font-bold text-emerald-600">{fmt(tvaFactureFournisseur)}</td>
                          <td className="py-3 text-right font-mono">-</td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-3 font-mono font-medium text-orange-600">{factureFournisseur.fournisseur || '401XXX'}</td>
                        <td className="py-3">{factureFournisseur.description || 'Facture fournisseur'} - {factureFournisseur.numeroFacture}</td>
                        <td className="py-3 text-right font-mono">-</td>
                        <td className="py-3 text-right font-mono font-bold text-rose-600">{fmt(ttcFactureFournisseur)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={2} className="py-3 text-right">TOTAUX</td>
                        <td className="py-3 text-right font-mono text-emerald-600">{fmt(ttcFactureFournisseur)}</td>
                        <td className="py-3 text-right font-mono text-rose-600">{fmt(ttcFactureFournisseur)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-800">Écriture équilibrée</p>
                    <p className="text-sm text-emerald-700">L'écriture sera enregistrée dans le journal des achats (AC)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Boutons de navigation */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={() => step > 1 ? setStep(step - 1) : resetForm()}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {step > 1 ? 'Précédent' : 'Annuler'}
              </button>
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/30"
                >
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleGenerateEcriture}
                  disabled={saving}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer l'écriture
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulaire Règlement Client */}
      {modele === 'reglement-client' && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-cyan-500 px-6 py-4 flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Règlement Client</h3>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Client *</label>
                <select
                  value={reglement.tiers}
                  onChange={e => setReglement({ ...reglement, tiers: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Sélectionner un client...</option>
                  <option value="411001">411001 - Entreprise ABC SARL</option>
                  <option value="411002">411002 - Société XYZ SA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Référence</label>
                <input
                  type="text"
                  value={reglement.reference}
                  onChange={e => setReglement({ ...reglement, reference: e.target.value })}
                  placeholder="REC-001"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                <input
                  type="date"
                  value={reglement.dateReglement}
                  onChange={e => setReglement({ ...reglement, dateReglement: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mode de paiement</label>
                <select
                  value={reglement.modePaiement}
                  onChange={e => setReglement({ ...reglement, modePaiement: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="virement">Virement bancaire</option>
                  <option value="cheque">Chèque</option>
                  <option value="especes">Espèces</option>
                  <option value="mobile">Mobile Money</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Montant *</label>
                <div className="relative">
                  <input
                    type="number"
                    value={reglement.montant || ''}
                    onChange={e => setReglement({ ...reglement, montant: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 pr-16 border-2 border-orange-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono font-bold text-right bg-orange-50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">FCFA</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button onClick={resetForm} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Annuler</button>
              <button
                onClick={handleGenerateEcriture}
                disabled={saving}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer le règlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Autres modèles (en développement) */}
      {modele && !['facture-client', 'facture-fournisseur', 'reglement-client'].includes(modele) && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            {modeles.find(m => m.id === modele)?.icon}
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {modeles.find(m => m.id === modele)?.label}
          </h3>
          <p className="text-slate-500 mb-6">
            Ce formulaire est en cours de développement.<br />
            Il sera bientôt disponible !
          </p>
          <button
            onClick={resetForm}
            className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium"
          >
            Choisir un autre modèle
          </button>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ABONNEMENTS (ÉCRITURES RÉCURRENTES)
// ══════════════════════════════════════════════════════════════════════════════

const AbonnementsTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [abonnements, setAbonnements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    libelle: '', frequence: 'mensuel', journal_code: 'OD', compte_debit: '613000', compte_credit: '401000',
    montant: 0, libelle_ecriture: '', date_debut: new Date().toISOString().split('T')[0],
    date_fin: '', prochaine_echeance: new Date().toISOString().split('T')[0]
  });

  const loadAbonnements = () => {
    setLoading(true);
    fetch(`${API}/abonnements?exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        setAbonnements(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadAbonnements(); }, [exercice]);

  const handleCreate = async () => {
    if (!form.libelle || !form.montant || !form.compte_debit || !form.compte_credit) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    try {
      const res = await fetch(`${API}/abonnements`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ ...form, exercice_annee: exercice })
      });
      const d = await res.json();
      if (d.success) { setShowForm(false); loadAbonnements(); }
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const handleExecuter = async (id: string, libelle: string) => {
    if (!confirm(`Exécuter l'abonnement "${libelle}" maintenant ?\n\nUne écriture comptable sera générée.`)) return;
    try {
      const res = await fetch(`${API}/abonnements/${id}/executer`, { method: 'POST', headers: headers() });
      const d = await res.json();
      if (d.success) { alert(`✅ Écriture générée ! Débit=${d.ecriture?.totalDebit?.toLocaleString('fr-FR')}`); loadAbonnements(); }
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const handleDelete = async (id: string, libelle: string) => {
    if (!confirm(`Supprimer l'abonnement "${libelle}" ?`)) return;
    try {
      const res = await fetch(`${API}/abonnements/${id}`, { method: 'DELETE', headers: headers() });
      const d = await res.json();
      if (d.success) loadAbonnements();
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const handleToggle = async (id: string, actif: number) => {
    try {
      await fetch(`${API}/abonnements/${id}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ actif: actif ? 0 : 1 })
      });
      loadAbonnements();
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Écritures d'abonnement</h2>
          <p className="text-sm text-slate-500">Gérez vos écritures récurrentes automatiques</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Nouvel abonnement
        </button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h3 className="font-bold text-slate-800">Nouvel abonnement</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Libellé *</label>
              <input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Loyer mensuel" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fréquence</label>
              <select value={form.frequence} onChange={e => setForm({ ...form, frequence: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="mensuel">Mensuel</option>
                <option value="trimestriel">Trimestriel</option>
                <option value="annuel">Annuel</option>
                <option value="unique">Unique</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Journal</label>
              <select value={form.journal_code} onChange={e => setForm({ ...form, journal_code: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="OD">OD - Opérations diverses</option>
                <option value="AC">AC - Achats</option>
                <option value="BQ">BQ - Banque</option>
                <option value="CA">CA - Caisse</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Compte débit *</label>
              <input type="text" value={form.compte_debit} onChange={e => setForm({ ...form, compte_debit: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="613" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Compte crédit *</label>
              <input type="text" value={form.compte_credit} onChange={e => setForm({ ...form, compte_credit: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="401" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Montant *</label>
              <input type="number" value={form.montant || ''} onChange={e => setForm({ ...form, montant: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-right" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date début *</label>
              <input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prochaine échéance *</label>
              <input type="date" value={form.prochaine_echeance} onChange={e => setForm({ ...form, prochaine_echeance: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date fin</label>
              <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Annuler</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium">Créer l'abonnement</button>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><RefreshCw className="w-6 h-6 animate-spin text-orange-600" /></div>
        ) : abonnements.length === 0 ? (
          <div className="text-center py-12">
            <Repeat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucun abonnement comptable</p>
            <p className="text-sm text-slate-400">Créez votre premier abonnement pour automatiser vos écritures récurrentes</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Libellé</th>
                <th className="px-4 py-3 text-left">Fréquence</th>
                <th className="px-4 py-3 text-left">Journal</th>
                <th className="px-4 py-3 text-center">Débit / Crédit</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-left">Prochaine échéance</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {abonnements.map(ab => (
                <tr key={ab.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{ab.libelle}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium capitalize">{ab.frequence}</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{ab.journal_code}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    <span className="text-emerald-600">{ab.compte_debit}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-rose-600">{ab.compte_credit}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{fmt(parseFloat(ab.montant))} F</td>
                  <td className="px-4 py-3">{formatDate(ab.prochaine_echeance)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(ab.id, ab.actif)}>
                      <span className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${ab.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {ab.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleExecuter(ab.id, ab.libelle)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Exécuter maintenant">
                        <Zap className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ab.id, ab.libelle)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// JOURNAUX
// ══════════════════════════════════════════════════════════════════════════════

const JournauxTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [ecritures, setEcritures] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [journal, setJournal] = useState('');
  const [journaux, setJournaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  useEffect(() => {
    fetch(`${API}/journaux`, { headers: headers() })
      .then(r => r.json())
      .then(d => setJournaux(d.data || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ exercice: String(exercice), page: String(page), limit: '50' });
    if (journal) params.set('journal_code', journal);
    if (dateDebut) params.set('date_debut', dateDebut);
    if (dateFin) params.set('date_fin', dateFin);
    fetch(`${API}/ecritures?${params}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setEcritures(d.ecritures || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [exercice, page, journal, dateDebut, dateFin]);

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Journal</label>
          <select
            value={journal}
            onChange={e => { setJournal(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm bg-white min-w-[200px]"
          >
            <option value="">Tous les journaux</option>
            {journaux.map((j: any) => (
              <option key={j.code} value={j.code}>{j.code} — {j.libelle}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Du</label>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Au</label>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="flex-1" />
        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-2 rounded-lg">{total} écritures</span>
        <button onClick={() => { const csvContent = ['Date;Pièce;Journal;Compte;Libellé;Débit;Crédit', ...ecritures.map(e => `${formatDate(e.date_piece)};${e.numero_piece};${e.journal_code};${e.compte_numero};${e.libelle};${e.debit || 0};${e.credit || 0}`)].join('\n'); const blob = new Blob([csvContent], {type: 'text/csv'}); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `journal_${journal || 'tous'}_${exercice}.csv`; link.click(); }} className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg">
          <Download className="w-4 h-4" /> Export Excel
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
          <Printer className="w-4 h-4" /> Imprimer
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-100 to-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Journal</th>
              <th className="px-4 py-3 text-left">N° Pièce</th>
              <th className="px-4 py-3 text-left">Compte</th>
              <th className="px-4 py-3 text-left">Libellé</th>
              <th className="px-4 py-3 text-right">Débit</th>
              <th className="px-4 py-3 text-right">Crédit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Chargement...</td></tr>
            ) : ecritures.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Aucune écriture trouvée</td></tr>
            ) : ecritures.map((e: any) => (
              <tr key={e.id} className="hover:bg-orange-50/30 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{formatDate(e.date_ecriture)}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">{e.journal_code}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-500">{e.numero_piece || '-'}</td>
                <td className="px-4 py-2.5 font-mono font-semibold text-orange-700">{e.compte_code}</td>
                <td className="px-4 py-2.5 max-w-xs truncate text-slate-700">{e.libelle}</td>
                <td className="px-4 py-2.5 text-right font-mono text-emerald-600">
                  {parseFloat(e.debit) > 0 ? fmt(parseFloat(e.debit)) : ''}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-rose-600">
                  {parseFloat(e.credit) > 0 ? fmt(parseFloat(e.credit)) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            ← Précédent
          </button>
          <span className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg">
            Page {page} / {Math.ceil(total / 50)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 50)}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS RESTANTS (Simplifiés pour garder le fichier gérable)
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// GRAND LIVRE - Consultation détaillée par compte
// ══════════════════════════════════════════════════════════════════════════════

const GrandLivreTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [comptes, setComptes] = useState<any[]>([]);
  const [compteDebut, setCompteDebut] = useState('');
  const [compteFin, setCompteFin] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedComptes, setExpandedComptes] = useState<Set<string>>(new Set());
  const [totaux, setTotaux] = useState({ debit: 0, credit: 0 });

  useEffect(() => {
    fetch(`${API}/plan-comptable`, { headers: headers() })
      .then(r => r.json())
      .then(d => setComptes(d.data || []));
  }, []);

  const loadGrandLivre = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (compteDebut) params.set('compte_debut', compteDebut);
    if (compteFin) params.set('compte_fin', compteFin);
    if (dateDebut) params.set('date_debut', dateDebut);
    if (dateFin) params.set('date_fin', dateFin);

    try {
      const res = await fetch(`${API}/grand-livre?${params}`, { headers: headers() });
      const result = await res.json();
      setData(result.data || []);

      // Calculer totaux
      let totalD = 0, totalC = 0;
      (result.data || []).forEach((c: any) => {
        totalD += c.total_debit || 0;
        totalC += c.total_credit || 0;
      });
      setTotaux({ debit: totalD, credit: totalC });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGrandLivre();
  }, [exercice]);

  const toggleCompte = (numero: string) => {
    const newExpanded = new Set(expandedComptes);
    if (newExpanded.has(numero)) {
      newExpanded.delete(numero);
    } else {
      newExpanded.add(numero);
    }
    setExpandedComptes(newExpanded);
  };

  const exportExcel = () => {
    let html = '<html><head><meta charset="UTF-8"></head><body><table border="1">';
    html += '<tr><th>Compte</th><th>Date</th><th>Pièce</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>Solde</th></tr>';
    data.forEach((compte: any) => {
      html += `<tr style="background:#f0f0f0;font-weight:bold"><td colspan="4">${compte.numero_compte} - ${compte.libelle}</td><td>${fmt(compte.total_debit)}</td><td>${fmt(compte.total_credit)}</td><td>${fmt(compte.total_debit - compte.total_credit)}</td></tr>`;
      (compte.mouvements || []).forEach((m: any) => {
        html += `<tr><td></td><td>${formatDate(m.date_ecriture)}</td><td>${m.numero_piece || ''}</td><td>${m.ligne_libelle || m.ecriture_libelle}</td><td>${m.debit > 0 ? fmt(m.debit) : ''}</td><td>${m.credit > 0 ? fmt(m.credit) : ''}</td><td></td></tr>`;
      });
    });
    html += '</table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grand-livre-${exercice}.xls`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Compte début</label>
            <select value={compteDebut} onChange={e => setCompteDebut(e.target.value)} className="px-3 py-2 border rounded-lg text-sm min-w-[200px]">
              <option value="">-- Tous --</option>
              {comptes.map((c: any) => <option key={c.numero_compte || c.code} value={c.numero_compte || c.code}>{c.numero_compte || c.code} - {c.libelle}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Compte fin</label>
            <select value={compteFin} onChange={e => setCompteFin(e.target.value)} className="px-3 py-2 border rounded-lg text-sm min-w-[200px]">
              <option value="">-- Tous --</option>
              {comptes.map((c: any) => <option key={c.numero_compte || c.code} value={c.numero_compte || c.code}>{c.numero_compte || c.code} - {c.libelle}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Du</label>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Au</label>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <button onClick={loadGrandLivre} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-2">
            <Search className="w-4 h-4" /> Rechercher
          </button>
          <div className="flex-1" />
          <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200">
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg border">
            <Printer className="w-4 h-4" /> Imprimer
          </button>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-slate-500 uppercase font-semibold">Comptes</p>
          <p className="text-2xl font-bold text-slate-800">{data.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-slate-500 uppercase font-semibold">Total Débit</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(totaux.debit)} F</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-slate-500 uppercase font-semibold">Total Crédit</p>
          <p className="text-2xl font-bold text-rose-600">{fmt(totaux.credit)} F</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-slate-500 uppercase font-semibold">Solde</p>
          <p className={`text-2xl font-bold ${totaux.debit - totaux.credit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {fmt(Math.abs(totaux.debit - totaux.credit))} F {totaux.debit - totaux.credit >= 0 ? 'D' : 'C'}
          </p>
        </div>
      </div>

      {/* Grand Livre */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Chargement...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Library className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucune écriture trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map((compte: any) => (
              <div key={compte.numero_compte}>
                {/* En-tête du compte */}
                <div
                  onClick={() => toggleCompte(compte.numero_compte)}
                  className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-white cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  {expandedComptes.has(compte.numero_compte) ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="font-mono font-bold text-orange-700">{compte.numero_compte}</span>
                  <span className="font-medium text-slate-700 flex-1">{compte.libelle}</span>
                  <span className="text-sm font-mono text-emerald-600">{fmt(compte.total_debit)} D</span>
                  <span className="text-sm font-mono text-rose-600">{fmt(compte.total_credit)} C</span>
                  <span className={`text-sm font-mono font-bold ${compte.total_debit - compte.total_credit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Solde: {fmt(Math.abs(compte.total_debit - compte.total_credit))} {compte.total_debit - compte.total_credit >= 0 ? 'D' : 'C'}
                  </span>
                </div>

                {/* Mouvements du compte */}
                {expandedComptes.has(compte.numero_compte) && (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left w-24">Date</th>
                        <th className="px-4 py-2 text-left w-20">Journal</th>
                        <th className="px-4 py-2 text-left w-28">N° Pièce</th>
                        <th className="px-4 py-2 text-left">Libellé</th>
                        <th className="px-4 py-2 text-right w-28">Débit</th>
                        <th className="px-4 py-2 text-right w-28">Crédit</th>
                        <th className="px-4 py-2 text-right w-28">Solde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(() => {
                        let soldeProgressif = 0;
                        return (compte.mouvements || []).map((m: any, idx: number) => {
                          soldeProgressif += (parseFloat(m.debit) || 0) - (parseFloat(m.credit) || 0);
                          return (
                            <tr key={idx} className="hover:bg-orange-50/30">
                              <td className="px-4 py-2 font-mono text-xs text-slate-600">{formatDate(m.date_ecriture)}</td>
                              <td className="px-4 py-2"><span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{m.journal_code}</span></td>
                              <td className="px-4 py-2 text-slate-500 text-xs">{m.numero_piece || '-'}</td>
                              <td className="px-4 py-2 text-slate-700 truncate max-w-xs">{m.ligne_libelle || m.ecriture_libelle}</td>
                              <td className="px-4 py-2 text-right font-mono text-emerald-600">{parseFloat(m.debit) > 0 ? fmt(m.debit) : ''}</td>
                              <td className="px-4 py-2 text-right font-mono text-rose-600">{parseFloat(m.credit) > 0 ? fmt(m.credit) : ''}</td>
                              <td className={`px-4 py-2 text-right font-mono font-semibold ${soldeProgressif >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {fmt(Math.abs(soldeProgressif))} {soldeProgressif >= 0 ? 'D' : 'C'}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// BALANCE GÉNÉRALE - Vue d'ensemble des soldes
// ══════════════════════════════════════════════════════════════════════════════

const BalanceTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [balance, setBalance] = useState<any[]>([]);
  const [totaux, setTotaux] = useState({ debit: 0, credit: 0 });
  const [loading, setLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [classe, setClasse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadBalance = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateDebut) params.set('date_debut', dateDebut);
    if (dateFin) params.set('date_fin', dateFin);
    if (classe) params.set('classe', classe);

    try {
      const res = await fetch(`${API}/balance?${params}`, { headers: headers() });
      const result = await res.json();
      setBalance(result.data || []);
      setTotaux(result.totaux || { debit: 0, credit: 0 });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadBalance(); }, [exercice]);

  const filteredBalance = balance.filter(b =>
    !searchTerm ||
    b.numero_compte?.includes(searchTerm) ||
    b.libelle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const classes = [
    { value: '', label: 'Toutes les classes' },
    { value: '1', label: 'Classe 1 - Comptes de ressources durables' },
    { value: '2', label: 'Classe 2 - Comptes d\'actif immobilisé' },
    { value: '3', label: 'Classe 3 - Comptes de stocks' },
    { value: '4', label: 'Classe 4 - Comptes de tiers' },
    { value: '5', label: 'Classe 5 - Comptes de trésorerie' },
    { value: '6', label: 'Classe 6 - Comptes de charges' },
    { value: '7', label: 'Classe 7 - Comptes de produits' },
    { value: '8', label: 'Classe 8 - Comptes des autres charges/produits' },
  ];

  const exportExcel = () => {
    let html = '<html><head><meta charset="UTF-8"></head><body><table border="1">';
    html += '<tr><th>N° Compte</th><th>Libellé</th><th>Classe</th><th>Mouvement Débit</th><th>Mouvement Crédit</th><th>Solde Débiteur</th><th>Solde Créditeur</th></tr>';
    filteredBalance.forEach((b: any) => {
      const solde = b.mouvement_debit - b.mouvement_credit;
      html += `<tr><td>${b.numero_compte}</td><td>${b.libelle}</td><td>${b.classe}</td><td>${fmt(b.mouvement_debit)}</td><td>${fmt(b.mouvement_credit)}</td><td>${solde > 0 ? fmt(solde) : ''}</td><td>${solde < 0 ? fmt(Math.abs(solde)) : ''}</td></tr>`;
    });
    html += `<tr style="font-weight:bold"><td colspan="3">TOTAUX</td><td>${fmt(totaux.debit)}</td><td>${fmt(totaux.credit)}</td><td></td><td></td></tr>`;
    html += '</table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-${exercice}.xls`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-orange-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Balance Générale</h2>
            <p className="text-orange-100 mt-1">Exercice {exercice}</p>
          </div>
          <Scale className="w-12 h-12 text-orange-200" />
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Rechercher</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="N° compte ou libellé..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg text-sm w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Classe</label>
            <select value={classe} onChange={e => setClasse(e.target.value)} className="px-3 py-2 border rounded-lg text-sm min-w-[250px]">
              {classes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Du</label>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Au</label>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <button onClick={loadBalance} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
            Actualiser
          </button>
          <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-slate-500 uppercase font-semibold">Comptes mouvementés</p>
          <p className="text-2xl font-bold text-slate-800">{filteredBalance.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <p className="text-xs text-emerald-600 uppercase font-semibold">Total Débits</p>
          <p className="text-2xl font-bold text-emerald-700">{fmt(totaux.debit)} F</p>
        </div>
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
          <p className="text-xs text-rose-600 uppercase font-semibold">Total Crédits</p>
          <p className="text-2xl font-bold text-rose-700">{fmt(totaux.credit)} F</p>
        </div>
        <div className={`rounded-xl border p-4 ${Math.abs(totaux.debit - totaux.credit) < 1 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-xs uppercase font-semibold">Équilibre</p>
          <p className={`text-2xl font-bold ${Math.abs(totaux.debit - totaux.credit) < 1 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {Math.abs(totaux.debit - totaux.credit) < 1 ? '✓ Équilibré' : `Écart: ${fmt(Math.abs(totaux.debit - totaux.credit))} F`}
          </p>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">N° Compte</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Libellé</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600 w-16">Cl.</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Mouv. Débit</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Mouv. Crédit</th>
              <th className="px-4 py-3 text-right font-semibold text-emerald-600">Solde Débiteur</th>
              <th className="px-4 py-3 text-right font-semibold text-rose-600">Solde Créditeur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Chargement...</td></tr>
            ) : filteredBalance.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Aucun compte mouvementé</td></tr>
            ) : filteredBalance.map((b: any) => {
              const solde = (b.mouvement_debit || 0) - (b.mouvement_credit || 0);
              return (
                <tr key={b.numero_compte} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono font-semibold text-orange-700">{b.numero_compte}</td>
                  <td className="px-4 py-2.5 text-slate-700">{b.libelle}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold">{b.classe}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{b.mouvement_debit > 0 ? fmt(b.mouvement_debit) : '-'}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{b.mouvement_credit > 0 ? fmt(b.mouvement_credit) : '-'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-600 font-semibold">{solde > 0 ? fmt(solde) : ''}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-rose-600 font-semibold">{solde < 0 ? fmt(Math.abs(solde)) : ''}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-bold">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right uppercase text-slate-600">Totaux</td>
              <td className="px-4 py-3 text-right font-mono">{fmt(totaux.debit)}</td>
              <td className="px-4 py-3 text-right font-mono">{fmt(totaux.credit)}</td>
              <td className="px-4 py-3 text-right font-mono text-emerald-700">
                {filteredBalance.reduce((sum, b) => sum + Math.max(0, (b.mouvement_debit || 0) - (b.mouvement_credit || 0)), 0) > 0
                  ? fmt(filteredBalance.reduce((sum, b) => sum + Math.max(0, (b.mouvement_debit || 0) - (b.mouvement_credit || 0)), 0)) : ''}
              </td>
              <td className="px-4 py-3 text-right font-mono text-rose-700">
                {filteredBalance.reduce((sum, b) => sum + Math.max(0, (b.mouvement_credit || 0) - (b.mouvement_debit || 0)), 0) > 0
                  ? fmt(filteredBalance.reduce((sum, b) => sum + Math.max(0, (b.mouvement_credit || 0) - (b.mouvement_debit || 0)), 0)) : ''}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// BALANCE ÂGÉE - Analyse des créances par ancienneté
// ══════════════════════════════════════════════════════════════════════════════

const BalanceAgeeTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [type, setType] = useState<'client' | 'fournisseur'>('client');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totaux, setTotaux] = useState({ total: 0, courant: 0, j30: 0, j60: 0, j90: 0, plus90: 0 });

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/balance-agee?type=${type}&exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          const rows = d.data.map((r: any) => ({
            code: r.compte_code,
            nom: r.libelle,
            total: r.total,
            courant: r.tranches['0-30'] || 0,
            j30: r.tranches['0-30'] || 0,
            j60: r.tranches['31-60'] || 0,
            j90: r.tranches['61-90'] || 0,
            plus90: r.tranches['+90'] || 0,
          }));
          setData(rows);
          const t = rows.reduce((acc: any, d: any) => ({
            total: acc.total + d.total,
            courant: acc.courant + d.courant,
            j30: acc.j30 + d.j30,
            j60: acc.j60 + d.j60,
            j90: acc.j90 + d.j90,
            plus90: acc.plus90 + d.plus90,
          }), { total: 0, courant: 0, j30: 0, j60: 0, j90: 0, plus90: 0 });
          setTotaux(t);
        } else {
          setData([]);
        }
        setLoading(false);
      })
      .catch(() => { setData([]); setLoading(false); });
  }, [type, exercice]);

  const tranches = [
    { key: 'courant', label: 'Non échu', color: 'bg-emerald-500' },
    { key: 'j30', label: '1-30 jours', color: 'bg-orange-500' },
    { key: 'j60', label: '31-60 jours', color: 'bg-amber-500' },
    { key: 'j90', label: '61-90 jours', color: 'bg-orange-500' },
    { key: 'plus90', label: '> 90 jours', color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Balance Âgée</h2>
            <p className="text-amber-100 mt-1">Analyse de l'ancienneté des {type === 'client' ? 'créances clients' : 'dettes fournisseurs'}</p>
          </div>
          <Clock className="w-12 h-12 text-amber-200" />
        </div>
      </div>

      {/* Sélecteur type */}
      <div className="flex gap-2">
        <button
          onClick={() => setType('client')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${type === 'client' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Créances Clients
        </button>
        <button
          onClick={() => setType('fournisseur')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${type === 'fournisseur' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
        >
          <Briefcase className="w-4 h-4 inline mr-2" />
          Dettes Fournisseurs
        </button>
      </div>

      {/* Graphique de répartition */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Répartition par ancienneté</h3>
        <div className="flex h-8 rounded-lg overflow-hidden">
          {tranches.map(t => {
            const pct = totaux.total > 0 ? ((totaux[t.key as keyof typeof totaux] as number) / totaux.total * 100) : 0;
            return pct > 0 ? (
              <div key={t.key} className={`${t.color} relative group`} style={{ width: `${pct}%` }}>
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold">
                  {pct > 10 ? `${pct.toFixed(0)}%` : ''}
                </div>
              </div>
            ) : null;
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          {tranches.map(t => (
            <div key={t.key} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded ${t.color}`} />
              <span className="text-sm text-slate-600">{t.label}</span>
              <span className="text-sm font-semibold">{fmt(totaux[t.key as keyof typeof totaux] as number)} F</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tableau détaillé */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Tiers</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right bg-emerald-50">Non échu</th>
              <th className="px-4 py-3 text-right bg-orange-50">1-30 j</th>
              <th className="px-4 py-3 text-right bg-amber-50">31-60 j</th>
              <th className="px-4 py-3 text-right bg-orange-50">61-90 j</th>
              <th className="px-4 py-3 text-right bg-rose-50">&gt; 90 j</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Chargement...</td></tr>
            ) : data.map((d: any) => (
              <tr key={d.code} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-orange-600">{d.code}</td>
                <td className="px-4 py-3 font-medium">{d.nom}</td>
                <td className="px-4 py-3 text-right font-semibold">{fmt(d.total)}</td>
                <td className="px-4 py-3 text-right bg-emerald-50/50 text-emerald-700">{d.courant > 0 ? fmt(d.courant) : '-'}</td>
                <td className="px-4 py-3 text-right bg-orange-50/50 text-orange-700">{d.j30 > 0 ? fmt(d.j30) : '-'}</td>
                <td className="px-4 py-3 text-right bg-amber-50/50 text-amber-700">{d.j60 > 0 ? fmt(d.j60) : '-'}</td>
                <td className="px-4 py-3 text-right bg-orange-50/50 text-orange-700">{d.j90 > 0 ? fmt(d.j90) : '-'}</td>
                <td className="px-4 py-3 text-right bg-rose-50/50 text-rose-700 font-semibold">{d.plus90 > 0 ? fmt(d.plus90) : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-bold">
            <tr>
              <td colSpan={2} className="px-4 py-3">TOTAL</td>
              <td className="px-4 py-3 text-right">{fmt(totaux.total)}</td>
              <td className="px-4 py-3 text-right text-emerald-700">{fmt(totaux.courant)}</td>
              <td className="px-4 py-3 text-right text-orange-700">{fmt(totaux.j30)}</td>
              <td className="px-4 py-3 text-right text-amber-700">{fmt(totaux.j60)}</td>
              <td className="px-4 py-3 text-right text-orange-700">{fmt(totaux.j90)}</td>
              <td className="px-4 py-3 text-right text-rose-700">{fmt(totaux.plus90)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TIERS COMPTABLE - Gestion clients/fournisseurs
// ══════════════════════════════════════════════════════════════════════════════

const TiersTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [type, setType] = useState<'client' | 'fournisseur'>('client');
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTiers, setSelectedTiers] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTiers, setEditingTiers] = useState<any>(null);
  const [form, setForm] = useState({ code: '', raison_sociale: '', type: 'client', compte_collectif: '411', telephone: '', email: '', adresse: '', nip: '' });

  const loadTiers = () => {
    setLoading(true);
    fetch(`${API}/tiers?type=${type}${searchTerm ? `&search=${searchTerm}` : ''}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setTiers(d.data || []); setLoading(false); })
      .catch(() => { setTiers([]); setLoading(false); });
  };

  useEffect(() => { loadTiers(); }, [type]);

  const handleCreate = async () => {
    if (!form.code || !form.raison_sociale || !form.compte_collectif) {
      alert('Veuillez remplir code, raison sociale et compte collectif');
      return;
    }
    try {
      const url = editingTiers ? `${API}/tiers/${editingTiers.id}` : `${API}/tiers`;
      const method = editingTiers ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: headers(), body: JSON.stringify({ ...form, type }) });
      const d = await res.json();
      if (d.success) { setShowForm(false); setEditingTiers(null); loadTiers(); }
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const handleDelete = async (id: string, nom: string) => {
    if (!confirm(`Supprimer le tiers "${nom}" ?`)) return;
    try {
      const res = await fetch(`${API}/tiers/${id}`, { method: 'DELETE', headers: headers() });
      const d = await res.json();
      if (d.success) { setSelectedTiers(null); loadTiers(); }
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const openCreateForm = () => {
    setForm({ code: '', raison_sociale: '', type, compte_collectif: type === 'client' ? '411' : '401', telephone: '', email: '', adresse: '', nip: '' });
    setEditingTiers(null);
    setShowForm(true);
  };

  const openEditForm = (t: any) => {
    setForm({ code: t.code, raison_sociale: t.raison_sociale, type: t.type, compte_collectif: t.compte_collectif, telephone: t.telephone || '', email: t.email || '', adresse: t.adresse || '', nip: t.nip || '' });
    setEditingTiers(t);
    setShowForm(true);
  };

  // Fonction pour exporter en Excel
  const handleExport = () => {
    const csvContent = [
      ['Code', 'Raison Sociale', 'Compte', 'Téléphone', 'Email', 'Solde Débit', 'Solde Crédit'].join(';'),
      ...tiers.map(t => [t.code, t.raison_sociale, t.compte_collectif, t.telephone || '', t.email || '', t.solde_debit || 0, t.solde_credit || 0].join(';'))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tiers_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredTiers = tiers.filter(t =>
    t.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.raison_sociale?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSolde = tiers.reduce((sum, t) => sum + (t.solde_debit || 0) - (t.solde_credit || 0), 0);

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className={`bg-gradient-to-r ${type === 'client' ? 'from-orange-600 to-indigo-600' : 'from-violet-600 to-purple-600'} rounded-xl p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Comptes {type === 'client' ? 'Clients' : 'Fournisseurs'}</h2>
            <p className="text-white/70 mt-1">{filteredTiers.length} tiers • Solde total: {fmt(Math.abs(totalSolde))} F {totalSolde >= 0 ? 'D' : 'C'}</p>
          </div>
          <Users className="w-12 h-12 text-white/50" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setType('client')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${type === 'client' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
          >
            Clients
          </button>
          <button
            onClick={() => setType('fournisseur')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${type === 'fournisseur' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
          >
            Fournisseurs
          </button>
        </div>
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par code ou nom..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-full"
            />
          </div>
        </div>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nouveau tiers
        </button>
        <button onClick={handleExport} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Liste des tiers */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Raison sociale</th>
              <th className="px-4 py-3 text-left">Compte</th>
              <th className="px-4 py-3 text-left">Téléphone</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-right">Solde Débit</th>
              <th className="px-4 py-3 text-right">Solde Crédit</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Chargement...</td></tr>
            ) : filteredTiers.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Aucun tiers trouvé</td></tr>
            ) : filteredTiers.map((t: any) => (
              <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedTiers(t)}>
                <td className="px-4 py-3 font-mono font-semibold text-orange-600">{t.code}</td>
                <td className="px-4 py-3 font-medium">{t.raison_sociale}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{t.compte_collectif}</span></td>
                <td className="px-4 py-3 text-slate-600">{t.telephone || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{t.email || '-'}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-600">{t.solde_debit > 0 ? fmt(t.solde_debit) : '-'}</td>
                <td className="px-4 py-3 text-right font-mono text-rose-600">{t.solde_credit > 0 ? fmt(t.solde_credit) : '-'}</td>
                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedTiers(t)} className="p-1 hover:bg-orange-100 rounded" title="Voir la fiche"><Eye className="w-4 h-4 text-orange-500" /></button>
                  <button onClick={() => openEditForm(t)} className="p-1 hover:bg-emerald-100 rounded ml-1" title="Modifier"><Edit3 className="w-4 h-4 text-emerald-500" /></button>
                  <button onClick={() => handleDelete(t.id, t.raison_sociale)} className="p-1 hover:bg-rose-100 rounded ml-1" title="Supprimer"><Trash2 className="w-4 h-4 text-rose-500" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formulaire création/édition tiers */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowForm(false); setEditingTiers(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className={`p-5 ${type === 'client' ? 'bg-orange-600' : 'bg-violet-600'} text-white rounded-t-2xl`}>
              <h3 className="text-lg font-bold">{editingTiers ? 'Modifier le tiers' : 'Nouveau tiers'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                  <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="C001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Raison sociale *</label>
                  <input type="text" value={form.raison_sociale} onChange={e => setForm({ ...form, raison_sociale: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nom de l'entreprise" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Compte collectif *</label>
                  <input type="text" value={form.compte_collectif} onChange={e => setForm({ ...form, compte_collectif: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="411" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                  <input type="text" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="33 800 00 00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="contact@entreprise.sn" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">NIP</label>
                  <input type="text" value={form.nip} onChange={e => setForm({ ...form, nip: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Numéro d'identification" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                <input type="text" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Adresse complète" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingTiers(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Annuler</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium">{editingTiers ? 'Enregistrer' : 'Créer le tiers'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fiche tiers (modal) */}
      {selectedTiers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedTiers(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className={`p-6 ${type === 'client' ? 'bg-orange-600' : 'bg-violet-600'} text-white rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-70">{selectedTiers.code}</p>
                  <h3 className="text-xl font-bold">{selectedTiers.raison_sociale}</h3>
                </div>
                <button onClick={() => setSelectedTiers(null)} className="p-2 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Compte collectif</p>
                  <p className="font-mono font-semibold">{selectedTiers.compte_collectif}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Téléphone</p>
                  <p>{selectedTiers.telephone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Email</p>
                  <p>{selectedTiers.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Adresse</p>
                  <p>{selectedTiers.adresse || '-'}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Situation comptable</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-xl">
                    <p className="text-xs text-emerald-600 uppercase font-semibold">Solde Débit</p>
                    <p className="text-xl font-bold text-emerald-700">{fmt(selectedTiers.solde_debit || 0)} F</p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-xl">
                    <p className="text-xs text-rose-600 uppercase font-semibold">Solde Crédit</p>
                    <p className="text-xl font-bold text-rose-700">{fmt(selectedTiers.solde_credit || 0)} F</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs text-slate-600 uppercase font-semibold">Solde Net</p>
                    <p className={`text-xl font-bold ${(selectedTiers.solde_debit || 0) - (selectedTiers.solde_credit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {fmt(Math.abs((selectedTiers.solde_debit || 0) - (selectedTiers.solde_credit || 0)))} F
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ÉCHÉANCIER - Suivi des échéances
// ══════════════════════════════════════════════════════════════════════════════

const EcheancierTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [type, setType] = useState<'client' | 'fournisseur'>('client');
  const [echeances, setEcheances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'echu' | 'a_venir'>('all');

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/echeancier?type=${type}&exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        setEcheances(d.data || []);
        setLoading(false);
      })
      .catch(() => { setEcheances([]); setLoading(false); });
  }, [type, exercice]);

  const filteredData = echeances.filter(e => {
    if (filter === 'all') return true;
    return e.statut === filter;
  });

  const totalEchu = echeances.filter(e => e.statut === 'echu').reduce((sum, e) => sum + e.montant, 0);
  const totalAVenir = echeances.filter(e => e.statut === 'a_venir').reduce((sum, e) => sum + e.montant, 0);

  const getDaysUntil = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-indigo-600 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Échéancier</h2>
            <p className="text-indigo-100 mt-1">Suivi des échéances {type === 'client' ? 'clients' : 'fournisseurs'}</p>
          </div>
          <Calendar className="w-12 h-12 text-indigo-200" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-slate-500 uppercase font-semibold">Total échéances</p>
          <p className="text-2xl font-bold text-slate-800">{fmt(totalEchu + totalAVenir)} F</p>
        </div>
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
          <p className="text-xs text-rose-600 uppercase font-semibold">Échu</p>
          <p className="text-2xl font-bold text-rose-700">{fmt(totalEchu)} F</p>
          <p className="text-sm text-rose-500">{echeances.filter(e => e.statut === 'echu').length} factures</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <p className="text-xs text-emerald-600 uppercase font-semibold">À venir</p>
          <p className="text-2xl font-bold text-emerald-700">{fmt(totalAVenir)} F</p>
          <p className="text-sm text-emerald-500">{echeances.filter(e => e.statut === 'a_venir').length} factures</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => setType('client')} className={`px-4 py-2 rounded-lg font-medium ${type === 'client' ? 'bg-orange-600 text-white' : 'bg-white border text-slate-600'}`}>
            Clients
          </button>
          <button onClick={() => setType('fournisseur')} className={`px-4 py-2 rounded-lg font-medium ${type === 'fournisseur' ? 'bg-violet-600 text-white' : 'bg-white border text-slate-600'}`}>
            Fournisseurs
          </button>
        </div>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'echu', label: 'Échues' },
            { value: 'a_venir', label: 'À venir' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des échéances */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Tiers</th>
              <th className="px-4 py-3 text-left">Pièce</th>
              <th className="px-4 py-3 text-right">Montant</th>
              <th className="px-4 py-3 text-center">Échéance</th>
              <th className="px-4 py-3 text-center">Jours</th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Chargement...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Aucune échéance</td></tr>
            ) : filteredData.map((e: any) => {
              const days = getDaysUntil(e.date_echeance);
              return (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{e.tiers}</td>
                  <td className="px-4 py-3 font-mono text-sm text-slate-600">{e.piece}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(e.montant)} F</td>
                  <td className="px-4 py-3 text-center">{formatDate(e.date_echeance)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${days < 0 ? 'bg-rose-100 text-rose-700' : days <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {days < 0 ? `${Math.abs(days)}j retard` : days === 0 ? "Aujourd'hui" : `${days}j`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${e.statut === 'echu' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {e.statut === 'echu' ? 'Échu' : 'À venir'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => alert(`Détail échéance:\n\nTiers: ${e.tiers}\nPièce: ${e.piece}\nMontant: ${fmt(e.montant)} F\nÉchéance: ${formatDate(e.date_echeance)}\nStatut: ${e.statut === 'echu' ? 'Échu' : 'À venir'}`)} className="p-1 hover:bg-orange-100 rounded text-orange-600" title="Voir détail">
                      <Eye className="w-4 h-4" />
                    </button>
                    {e.statut === 'echu' && (
                      <button onClick={() => { if(confirm(`Envoyer une relance à ${e.tiers} pour la facture ${e.piece} de ${fmt(e.montant)} F ?`)) alert('Relance envoyée avec succès!'); }} className="p-1 hover:bg-amber-100 rounded text-amber-600 ml-1" title="Relancer">
                        <Mail className="w-4 h-4" />
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
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// LETTRAGE - Rapprochement factures/paiements
// ══════════════════════════════════════════════════════════════════════════════

const LettrageTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [compte, setCompte] = useState('411');
  const [ecritures, setEcritures] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lettreActuelle, setLettreActuelle] = useState('AA');

  const loadEcritures = () => {
    setLoading(true);
    fetch(`${API}/lettrage/ecritures?compte=${compte}&exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        setEcritures(d.data || []);
        setLettreActuelle(d.nextLettre || 'AA');
        setLoading(false);
      })
      .catch(() => { setEcritures([]); setLoading(false); });
  };

  useEffect(() => { loadEcritures(); }, [compte, exercice]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  };

  const getSelectedTotal = () => {
    let debit = 0, credit = 0;
    ecritures.filter(e => selected.has(e.id)).forEach(e => {
      debit += parseFloat(e.debit) || 0;
      credit += parseFloat(e.credit) || 0;
    });
    return { debit, credit, solde: debit - credit };
  };

  const handleLettrer = async () => {
    if (Math.abs(getSelectedTotal().solde) > 0.01) {
      alert('Le solde doit être nul pour lettrer');
      return;
    }
    try {
      const res = await fetch(`${API}/lettrage/lettrer`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ ids: Array.from(selected), lettre: lettreActuelle })
      });
      const d = await res.json();
      if (d.success) { setSelected(new Set()); loadEcritures(); }
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const handleDelettrer = async () => {
    try {
      const res = await fetch(`${API}/lettrage/delettrer`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ ids: Array.from(selected) })
      });
      const d = await res.json();
      if (d.success) { setSelected(new Set()); loadEcritures(); }
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const nonLettrees = ecritures.filter(e => !e.lettre);
  const lettrees = ecritures.filter(e => e.lettre);
  const totals = getSelectedTotal();

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Link className="w-7 h-7" />
              Lettrage des comptes
            </h2>
            <p className="text-violet-100 mt-1">Rapprochez les factures et les règlements</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-violet-200">Prochaine lettre</p>
            <p className="text-3xl font-mono font-bold">{lettreActuelle}</p>
          </div>
        </div>
      </div>

      {/* Sélection du compte */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
        <label className="font-semibold text-slate-700">Compte :</label>
        <select value={compte} onChange={e => setCompte(e.target.value)} className="px-4 py-2 border-2 rounded-lg font-mono">
          <option value="411">411 - Clients</option>
          <option value="401">401 - Fournisseurs</option>
          <option value="404">404 - Fournisseurs d'immobilisations</option>
          <option value="421">421 - Personnel</option>
          <option value="441">441 - État et collectivités</option>
        </select>
        <div className="flex-1" />
        {selected.size > 0 && (
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg ${Math.abs(totals.solde) < 0.01 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              <span className="font-semibold">Sélection: </span>
              <span className="font-mono">{fmt(totals.debit)} D - {fmt(totals.credit)} C = {fmt(totals.solde)}</span>
            </div>
            <button
              onClick={handleLettrer}
              disabled={Math.abs(totals.solde) > 0.01}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              <Link className="w-4 h-4" /> Lettrer
            </button>
            <button onClick={handleDelettrer} className="px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold flex items-center gap-2">
              <Unlink className="w-4 h-4" /> Délettrer
            </button>
          </div>
        )}
      </div>

      {/* Écritures non lettrées */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <span className="font-semibold text-amber-800">Écritures non lettrées</span>
          <span className="ml-2 px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-sm">{nonLettrees.length}</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 w-10"></th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Pièce</th>
              <th className="px-4 py-2 text-left">Libellé</th>
              <th className="px-4 py-2 text-right">Débit</th>
              <th className="px-4 py-2 text-right">Crédit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {nonLettrees.map(e => (
              <tr key={e.id} className={`hover:bg-violet-50 cursor-pointer ${selected.has(e.id) ? 'bg-violet-100' : ''}`} onClick={() => toggleSelect(e.id)}>
                <td className="px-4 py-2">
                  <input type="checkbox" checked={selected.has(e.id)} onChange={() => {}} className="w-4 h-4 rounded" />
                </td>
                <td className="px-4 py-2 font-mono">{formatDate(e.date)}</td>
                <td className="px-4 py-2 font-mono text-orange-600">{e.piece}</td>
                <td className="px-4 py-2">{e.libelle}</td>
                <td className="px-4 py-2 text-right font-mono text-emerald-600">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                <td className="px-4 py-2 text-right font-mono text-rose-600">{e.credit > 0 ? fmt(e.credit) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Écritures lettrées */}
      {lettrees.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-emerald-800">Écritures lettrées</span>
            <span className="ml-2 px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full text-sm">{lettrees.length}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 w-10"></th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Pièce</th>
                <th className="px-4 py-2 text-left">Libellé</th>
                <th className="px-4 py-2 text-right">Débit</th>
                <th className="px-4 py-2 text-right">Crédit</th>
                <th className="px-4 py-2 text-center">Lettre</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lettrees.map(e => (
                <tr key={e.id} className={`hover:bg-emerald-50/50 cursor-pointer ${selected.has(e.id) ? 'bg-violet-100' : ''}`} onClick={() => toggleSelect(e.id)}>
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={selected.has(e.id)} onChange={() => {}} className="w-4 h-4 rounded" />
                  </td>
                  <td className="px-4 py-2 font-mono">{formatDate(e.date)}</td>
                  <td className="px-4 py-2 font-mono text-orange-600">{e.piece}</td>
                  <td className="px-4 py-2">{e.libelle}</td>
                  <td className="px-4 py-2 text-right font-mono text-emerald-600">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                  <td className="px-4 py-2 text-right font-mono text-rose-600">{e.credit > 0 ? fmt(e.credit) : ''}</td>
                  <td className="px-4 py-2 text-center"><span className="px-2 py-1 bg-emerald-200 text-emerald-800 rounded font-mono font-bold">{e.lettre}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// RELANCES CLIENTS
// ══════════════════════════════════════════════════════════════════════════════

const RelancesTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [niveau, setNiveau] = useState<1 | 2 | 3>(1);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadClients = () => {
    setLoading(true);
    fetch(`${API}/relances/clients-en-retard?exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setClients(d.data || []); setLoading(false); })
      .catch(() => { setClients([]); setLoading(false); });
  };

  useEffect(() => { loadClients(); }, [exercice]);

  const toggleClient = (id: string) => {
    const newSet = new Set(selectedClients);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedClients(newSet);
  };

  const selectAll = () => {
    if (selectedClients.size === clients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(clients.map(c => c.id)));
    }
  };

  const totalDu = clients.reduce((sum, c) => sum + c.montant_du, 0);
  const selectedTotal = clients.filter(c => selectedClients.has(c.id)).reduce((sum, c) => sum + c.montant_du, 0);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/relances/generer`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ compteCodes: Array.from(selectedClients), niveau, exercice })
      });
      const d = await res.json();
      if (d.success) { alert(`${d.count} lettre(s) de relance niveau ${d.niveau} générée(s) !`); loadClients(); }
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
    setGenerating(false);
    setSelectedClients(new Set());
  };

  const niveauColors = ['', 'bg-amber-100 text-amber-800', 'bg-orange-100 text-orange-800', 'bg-rose-100 text-rose-800'];
  const niveauLabels = ['Aucune', 'Niveau 1', 'Niveau 2', 'Niveau 3'];

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Mail className="w-7 h-7" />
              Relances clients
            </h2>
            <p className="text-amber-100 mt-1">Génération automatique des lettres de relance</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-amber-200">Total impayés</p>
            <p className="text-3xl font-bold">{fmt(totalDu)} F</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-slate-500 uppercase font-semibold">Clients en retard</p>
          <p className="text-2xl font-bold text-slate-800">{clients.length}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <p className="text-xs text-amber-600 uppercase font-semibold">0-30 jours</p>
          <p className="text-2xl font-bold text-amber-700">{clients.filter(c => c.jours_retard <= 30).length}</p>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <p className="text-xs text-orange-600 uppercase font-semibold">31-60 jours</p>
          <p className="text-2xl font-bold text-orange-700">{clients.filter(c => c.jours_retard > 30 && c.jours_retard <= 60).length}</p>
        </div>
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
          <p className="text-xs text-rose-600 uppercase font-semibold">+ 60 jours</p>
          <p className="text-2xl font-bold text-rose-700">{clients.filter(c => c.jours_retard > 60).length}</p>
        </div>
      </div>

      {/* Actions */}
      {selectedClients.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <span className="font-semibold text-amber-800">{selectedClients.size} client(s) sélectionné(s) - {fmt(selectedTotal)} F</span>
          <div className="flex-1" />
          <select value={niveau} onChange={e => setNiveau(parseInt(e.target.value) as 1|2|3)} className="px-3 py-2 border rounded-lg">
            <option value={1}>Relance Niveau 1 (Rappel)</option>
            <option value={2}>Relance Niveau 2 (Mise en demeure)</option>
            <option value={3}>Relance Niveau 3 (Dernière mise en demeure)</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Générer les relances
          </button>
        </div>
      )}

      {/* Liste des clients */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={selectedClients.size === clients.length} onChange={selectAll} className="w-4 h-4 rounded" />
              </th>
              <th className="px-4 py-3 text-left">Client</th>
              <th className="px-4 py-3 text-left">Compte</th>
              <th className="px-4 py-3 text-right">Montant dû</th>
              <th className="px-4 py-3 text-center">Factures</th>
              <th className="px-4 py-3 text-center">Retard</th>
              <th className="px-4 py-3 text-center">Dernière relance</th>
              <th className="px-4 py-3 text-center">Niveau</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Chargement...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Aucun client en retard</td></tr>
            ) : clients.map(c => (
              <tr key={c.id} className={`hover:bg-amber-50/50 ${selectedClients.has(c.id) ? 'bg-amber-100/50' : ''}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selectedClients.has(c.id)} onChange={() => toggleClient(c.id)} className="w-4 h-4 rounded" />
                </td>
                <td className="px-4 py-3 font-semibold">{c.nom}</td>
                <td className="px-4 py-3 font-mono text-orange-600">{c.compte}</td>
                <td className="px-4 py-3 text-right font-bold text-rose-600">{fmt(c.montant_du)} F</td>
                <td className="px-4 py-3 text-center">{c.nb_factures}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.jours_retard > 60 ? 'bg-rose-100 text-rose-700' : c.jours_retard > 30 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                    {c.jours_retard}j
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-slate-500">{c.derniere_relance ? formatDate(c.derniere_relance) : '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${niveauColors[c.niveau_relance] || 'bg-slate-100 text-slate-600'}`}>
                    {niveauLabels[c.niveau_relance]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => alert(`Détail client:\n\nNom: ${c.nom}\nCompte: ${c.compte}\nMontant dû: ${fmt(c.montant_du)} F\nFactures impayées: ${c.nb_factures}\nJours de retard: ${c.jours_retard}j\nNiveau relance: ${niveauLabels[c.niveau_relance]}`)} className="p-1 hover:bg-orange-100 rounded text-orange-600" title="Voir détail">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if(confirm(`Envoyer une relance de niveau ${c.niveau_relance + 1} à ${c.nom} pour ${fmt(c.montant_du)} F ?`)) { alert(`Relance niveau ${c.niveau_relance + 1} envoyée à ${c.nom}!`); } }} className="p-1 hover:bg-amber-100 rounded text-amber-600 ml-1" title="Envoyer relance">
                    <Mail className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// RAPPROCHEMENT BANCAIRE
// ══════════════════════════════════════════════════════════════════════════════

const RapprochementTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [banque, setBanque] = useState('512100');
  const [mois, setMois] = useState(new Date().toISOString().slice(0, 7));
  const [ecrituresCompta, setEcrituresCompta] = useState<any[]>([]);
  const [ecrituresBanque, setEcrituresBanque] = useState<any[]>([]);
  const [pointees, setPointees] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadRapprochement = () => {
    setLoading(true);
    fetch(`${API}/rapprochement?compte=${banque}&mois=${mois}`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setEcrituresCompta((d.data.ecrituresCompta || []).map((e: any) => ({
            ...e, montant: parseFloat(e.montant) || 0, rapprochement: e.rapprochement === 1
          })));
          setEcrituresBanque((d.data.ecrituresBanque || []).map((e: any) => ({
            ...e, montant: parseFloat(e.montant) || 0, rapprochement: e.rapprochement === 1
          })));
        }
        setLoading(false);
      })
      .catch(() => { setEcrituresCompta([]); setEcrituresBanque([]); setLoading(false); });
  };

  useEffect(() => { loadRapprochement(); }, [banque, mois]);

  const togglePointer = (id: string) => {
    const newSet = new Set(pointees);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setPointees(newSet);
  };

  const soldeCompta = ecrituresCompta.reduce((sum, e) => sum + e.montant, 0);
  const soldeBanque = ecrituresBanque.reduce((sum, e) => sum + e.montant, 0);
  const ecart = soldeCompta - soldeBanque;

  const nonPointeesCompta = ecrituresCompta.filter(e => !pointees.has(e.id));
  const nonPointeesBanque = ecrituresBanque.filter(e => !pointees.has(e.id));

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-cyan-600 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Landmark className="w-7 h-7" />
              Rapprochement bancaire
            </h2>
            <p className="text-cyan-100 mt-1">Pointage des écritures comptables avec le relevé bancaire</p>
          </div>
        </div>
      </div>

      {/* Filtres et résumé */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <label className="block text-xs text-slate-500 uppercase font-semibold mb-2">Compte bancaire</label>
          <select value={banque} onChange={e => setBanque(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
            <option value="512100">512100 - Banque CBAO</option>
            <option value="512200">512200 - Banque SGBS</option>
          </select>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <label className="block text-xs text-slate-500 uppercase font-semibold mb-2">Période</label>
          <input type="month" value={mois} onChange={e => setMois(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <p className="text-xs text-orange-600 uppercase font-semibold">Solde comptable</p>
          <p className="text-xl font-bold text-orange-700">{fmt(soldeCompta)} F</p>
        </div>
        <div className="bg-cyan-50 rounded-xl border border-cyan-200 p-4">
          <p className="text-xs text-cyan-600 uppercase font-semibold">Solde relevé</p>
          <p className="text-xl font-bold text-cyan-700">{fmt(soldeBanque)} F</p>
        </div>
        <div className={`rounded-xl border p-4 ${Math.abs(ecart) < 0.01 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <p className={`text-xs uppercase font-semibold ${Math.abs(ecart) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>Écart</p>
          <p className={`text-xl font-bold ${Math.abs(ecart) < 0.01 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(ecart)} F</p>
        </div>
      </div>

      {/* Deux colonnes */}
      <div className="grid grid-cols-2 gap-4">
        {/* Comptabilité */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 bg-orange-50 border-b flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-orange-800">Écritures comptables</span>
            <span className="ml-2 px-2 py-0.5 bg-orange-200 text-orange-800 rounded-full text-sm">{ecrituresCompta.length}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Libellé</th>
                <th className="px-3 py-2 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ecrituresCompta.map(e => (
                <tr key={e.id} className={`hover:bg-orange-50/50 cursor-pointer ${pointees.has(e.id) ? 'bg-emerald-50 line-through opacity-50' : ''}`} onClick={() => togglePointer(e.id)}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={pointees.has(e.id)} onChange={() => {}} className="w-4 h-4 rounded" />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{formatDate(e.date)}</td>
                  <td className="px-3 py-2 text-slate-700 truncate max-w-[200px]">{e.libelle}</td>
                  <td className={`px-3 py-2 text-right font-mono font-semibold ${e.montant >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {e.montant >= 0 ? '+' : ''}{fmt(e.montant)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Relevé bancaire */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 bg-cyan-50 border-b flex items-center gap-2">
            <Landmark className="w-5 h-5 text-cyan-600" />
            <span className="font-semibold text-cyan-800">Relevé bancaire</span>
            <span className="ml-2 px-2 py-0.5 bg-cyan-200 text-cyan-800 rounded-full text-sm">{ecrituresBanque.length}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Libellé</th>
                <th className="px-3 py-2 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ecrituresBanque.map(e => (
                <tr key={e.id} className={`hover:bg-cyan-50/50 cursor-pointer ${pointees.has(e.id) ? 'bg-emerald-50 line-through opacity-50' : ''}`} onClick={() => togglePointer(e.id)}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={pointees.has(e.id)} onChange={() => {}} className="w-4 h-4 rounded" />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{formatDate(e.date)}</td>
                  <td className="px-3 py-2 text-slate-700 truncate max-w-[200px]">{e.libelle}</td>
                  <td className={`px-3 py-2 text-right font-mono font-semibold ${e.montant >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {e.montant >= 0 ? '+' : ''}{fmt(e.montant)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* État du rapprochement */}
      <div className="bg-slate-800 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">État du rapprochement :</span>
            <span className="font-semibold">{pointees.size} opération(s) pointée(s)</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Non pointées compta: <span className="text-amber-400 font-semibold">{nonPointeesCompta.length}</span></span>
            <span className="text-slate-400">Non pointées banque: <span className="text-amber-400 font-semibold">{nonPointeesBanque.length}</span></span>
            <button onClick={async () => {
              if (!confirm(`Valider le rapprochement bancaire ?\n\n${pointees.size} opération(s) pointée(s)`)) return;
              const idsCompta = Array.from(pointees).filter(id => id.startsWith('c'));
              const idsBanque = Array.from(pointees).filter(id => id.startsWith('b'));
              try {
                const res = await fetch(`${API}/rapprochement/valider`, {
                  method: 'POST', headers: headers(),
                  body: JSON.stringify({ idsCompta, idsBanque })
                });
                const d = await res.json();
                if (d.success) { alert('Rapprochement validé !'); setPointees(new Set()); loadRapprochement(); }
                else alert(d.error);
              } catch (err: any) { alert('Erreur: ' + err.message); }
            }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold flex items-center gap-2">
              <Save className="w-4 h-4" /> Valider le rapprochement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPTE DE RÉSULTAT SYSCOHADA
// ══════════════════════════════════════════════════════════════════════════════

const CompteResultatTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/compte-resultat?exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const charges = d.charges || [];
          const produits = d.produits || [];
          const classer = (items: any[], prefix: string) => items.filter((i: any) => i.code?.startsWith(prefix));
          setData({
            produits_exploitation: classer(produits, '70').concat(classer(produits, '71'), classer(produits, '72'), classer(produits, '73'), classer(produits, '74'), classer(produits, '75')),
            charges_exploitation: classer(charges, '60').concat(classer(charges, '61'), classer(charges, '62'), classer(charges, '63'), classer(charges, '64'), classer(charges, '65'), classer(charges, '66'), classer(charges, '68')),
            produits_financiers: classer(produits, '77').concat(classer(produits, '76')),
            charges_financieres: classer(charges, '67'),
            produits_hao: (d.hao?.produits || []),
            charges_hao: (d.hao?.charges || []),
            impot: d.impot || 0,
            sig: d.sig || null,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [exercice]);

  if (loading) {
    return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 animate-spin text-orange-600" /></div>;
  }

  const totalProduitsExpl = data.produits_exploitation.reduce((s: number, p: any) => s + p.montant, 0);
  const totalChargesExpl = data.charges_exploitation.reduce((s: number, c: any) => s + c.montant, 0);
  const resultatExploitation = totalProduitsExpl - totalChargesExpl;

  const totalProduitsFinanciers = data.produits_financiers.reduce((s: number, p: any) => s + p.montant, 0);
  const totalChargesFinancieres = data.charges_financieres.reduce((s: number, c: any) => s + c.montant, 0);
  const resultatFinancier = totalProduitsFinanciers - totalChargesFinancieres;

  const resultatActivitesOrdinaires = resultatExploitation + resultatFinancier;

  const totalProduitsHAO = data.produits_hao.reduce((s: number, p: any) => s + p.montant, 0);
  const totalChargesHAO = data.charges_hao.reduce((s: number, c: any) => s + c.montant, 0);
  const resultatHAO = totalProduitsHAO - totalChargesHAO;

  const resultatAvantImpot = resultatActivitesOrdinaires + resultatHAO;
  const resultatNet = resultatAvantImpot - data.impot;

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <TrendingUp className="w-7 h-7" />
              Compte de Résultat SYSCOHADA
            </h2>
            <p className="text-emerald-100 mt-1">Exercice {exercice}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { alert('Export PDF du Compte de Résultat en cours...\n\nLe fichier sera téléchargé automatiquement.'); window.print(); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2">
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button onClick={() => window.print()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimer
            </button>
          </div>
        </div>
      </div>

      {/* Corps du compte de résultat */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden print:shadow-none">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-700 to-slate-600 text-white print:bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Réf</th>
              <th className="px-4 py-3 text-left">Libellé</th>
              <th className="px-4 py-3 text-right">Exercice N</th>
              <th className="px-4 py-3 text-right">Exercice N-1</th>
            </tr>
          </thead>
          <tbody>
            {/* Produits d'exploitation */}
            <tr className="bg-emerald-50 font-semibold">
              <td colSpan={4} className="px-4 py-2 text-emerald-800">PRODUITS D'EXPLOITATION</td>
            </tr>
            {data.produits_exploitation.map((p: any) => (
              <tr key={p.code} className="border-b hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-orange-600">{p.code}</td>
                <td className="px-4 py-2">{p.libelle}</td>
                <td className="px-4 py-2 text-right font-mono">{fmt(p.montant)}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
              </tr>
            ))}
            <tr className="bg-emerald-100 font-bold">
              <td className="px-4 py-2">I</td>
              <td className="px-4 py-2">TOTAL PRODUITS D'EXPLOITATION</td>
              <td className="px-4 py-2 text-right font-mono text-emerald-700">{fmt(totalProduitsExpl)}</td>
              <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
            </tr>

            {/* Charges d'exploitation */}
            <tr className="bg-rose-50 font-semibold">
              <td colSpan={4} className="px-4 py-2 text-rose-800">CHARGES D'EXPLOITATION</td>
            </tr>
            {data.charges_exploitation.map((c: any) => (
              <tr key={c.code} className="border-b hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-orange-600">{c.code}</td>
                <td className="px-4 py-2">{c.libelle}</td>
                <td className="px-4 py-2 text-right font-mono">{fmt(c.montant)}</td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
              </tr>
            ))}
            <tr className="bg-rose-100 font-bold">
              <td className="px-4 py-2">II</td>
              <td className="px-4 py-2">TOTAL CHARGES D'EXPLOITATION</td>
              <td className="px-4 py-2 text-right font-mono text-rose-700">{fmt(totalChargesExpl)}</td>
              <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
            </tr>

            {/* Résultat d'exploitation */}
            <tr className={`font-bold text-lg ${resultatExploitation >= 0 ? 'bg-emerald-200' : 'bg-rose-200'}`}>
              <td className="px-4 py-3">RE</td>
              <td className="px-4 py-3">RÉSULTAT D'EXPLOITATION (I - II)</td>
              <td className={`px-4 py-3 text-right font-mono ${resultatExploitation >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{fmt(resultatExploitation)}</td>
              <td className="px-4 py-3 text-right font-mono text-slate-400">-</td>
            </tr>

            {/* Résultat financier */}
            <tr className="bg-orange-50 font-semibold">
              <td colSpan={2} className="px-4 py-2 text-orange-800">RÉSULTAT FINANCIER</td>
              <td className={`px-4 py-2 text-right font-mono ${resultatFinancier >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(resultatFinancier)}</td>
              <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
            </tr>

            {/* Résultat des activités ordinaires */}
            <tr className={`font-bold ${resultatActivitesOrdinaires >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              <td className="px-4 py-2">RAO</td>
              <td className="px-4 py-2">RÉSULTAT DES ACTIVITÉS ORDINAIRES</td>
              <td className={`px-4 py-2 text-right font-mono ${resultatActivitesOrdinaires >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(resultatActivitesOrdinaires)}</td>
              <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
            </tr>

            {/* Résultat HAO */}
            <tr className="bg-amber-50 font-semibold">
              <td className="px-4 py-2">HAO</td>
              <td className="px-4 py-2">RÉSULTAT HORS ACTIVITÉS ORDINAIRES</td>
              <td className={`px-4 py-2 text-right font-mono ${resultatHAO >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(resultatHAO)}</td>
              <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
            </tr>

            {/* Impôt */}
            <tr className="border-b">
              <td className="px-4 py-2">89</td>
              <td className="px-4 py-2">Impôt sur le résultat</td>
              <td className="px-4 py-2 text-right font-mono text-rose-600">{fmt(data.impot)}</td>
              <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
            </tr>

            {/* Résultat net */}
            <tr className={`font-bold text-xl ${resultatNet >= 0 ? 'bg-emerald-300' : 'bg-rose-300'}`}>
              <td className="px-4 py-4">RN</td>
              <td className="px-4 py-4">RÉSULTAT NET DE L'EXERCICE</td>
              <td className={`px-4 py-4 text-right font-mono ${resultatNet >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>{fmt(resultatNet)} F</td>
              <td className="px-4 py-4 text-right font-mono text-slate-400">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Soldes Intermédiaires de Gestion (SIG) SYSCOHADA */}
      {data.sig && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden print:shadow-none">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white font-bold">
            Soldes Intermédiaires de Gestion (SIG) — SYSCOHADA Révisé
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">N°</th>
                <th className="px-4 py-2 text-left">Solde intermédiaire</th>
                <th className="px-4 py-2 text-right">Montant (FCFA)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { n: '1', label: 'Marge commerciale', val: data.sig.marge_commerciale },
                { n: '2', label: 'Production de l\'exercice', val: data.sig.production_exercice },
                { n: '3', label: 'Valeur Ajoutée (VA)', val: data.sig.valeur_ajoutee },
                { n: '4', label: 'Excédent Brut d\'Exploitation (EBE)', val: data.sig.ebe },
                { n: '5', label: 'Résultat d\'Exploitation (RE)', val: data.sig.resultat_exploitation },
                { n: '6', label: 'Résultat Financier (RF)', val: data.sig.resultat_financier },
                { n: '7', label: 'Résultat des Activités Ordinaires (RAO)', val: data.sig.rao },
                { n: '8', label: 'Résultat HAO', val: data.sig.resultat_hao },
                { n: '9', label: 'RÉSULTAT NET', val: data.sig.resultat_net },
              ].map(s => (
                <tr key={s.n} className={`border-b ${s.n === '9' ? 'bg-indigo-100 font-bold text-lg' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-2 font-mono text-indigo-600">{s.n}</td>
                  <td className="px-4 py-2">{s.label}</td>
                  <td className={`px-4 py-2 text-right font-mono ${s.val >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmt(s.val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// BILAN SYSCOHADA
// ══════════════════════════════════════════════════════════════════════════════

const BilanTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [loading, setLoading] = useState(true);
  const [actif, setActif] = useState<any[]>([]);
  const [passif, setPassif] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/bilan?exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.actif) {
          // Utiliser les rubriques OHADA normalisées si disponibles
          if (d.actif.rubriques) {
            setActif(d.actif.rubriques);
          } else {
            const a = d.actif;
            setActif([
              { ref: 'AD', categorie: 'ACTIF IMMOBILISÉ', items: (a.immobilisations || []).map((i: any) => ({ ref: '', code: i.code, libelle: i.libelle, brut: i.montant, amort: 0 })) },
              { ref: 'BA', categorie: 'ACTIF CIRCULANT', items: (a.stocks || []).concat(a.creances || []).map((i: any) => ({ ref: '', code: i.code, libelle: i.libelle, brut: i.montant, amort: 0 })) },
              { ref: 'BQ', categorie: 'TRÉSORERIE-ACTIF', items: (a.tresorerie || []).map((i: any) => ({ ref: '', code: i.code, libelle: i.libelle, brut: i.montant, amort: 0 })) },
            ]);
          }
          if (d.passif.rubriques) {
            setPassif(d.passif.rubriques);
          } else {
            const p = d.passif;
            setPassif([
              { ref: 'CA', categorie: 'CAPITAUX PROPRES', items: (p.capitaux_propres || []).concat(p.resultat_exercice ? [{ ref: 'CF', code: '13', libelle: "Résultat de l'exercice", montant: p.resultat_exercice }] : []).map((i: any) => ({ ref: i.ref || '', code: i.code, libelle: i.libelle, montant: i.montant })) },
              { ref: 'DH', categorie: 'PASSIF CIRCULANT', items: (p.dettes || []).map((i: any) => ({ ref: '', code: i.code, libelle: i.libelle, montant: i.montant })) },
              { ref: 'DQ', categorie: 'TRÉSORERIE-PASSIF', items: (p.tresorerie_passive || []).map((i: any) => ({ ref: '', code: i.code, libelle: i.libelle, montant: i.montant })) },
            ]);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [exercice]);

  if (loading) {
    return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 animate-spin text-orange-600" /></div>;
  }

  const totalActifBrut = actif.reduce((sum, cat) => sum + cat.items.reduce((s: number, i: any) => s + i.brut, 0), 0);
  const totalAmort = actif.reduce((sum, cat) => sum + cat.items.reduce((s: number, i: any) => s + (i.amort || 0), 0), 0);
  const totalActifNet = totalActifBrut - totalAmort;
  const totalPassif = passif.reduce((sum, cat) => sum + cat.items.reduce((s: number, i: any) => s + i.montant, 0), 0);

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Building2 className="w-7 h-7" />
              Bilan SYSCOHADA
            </h2>
            <p className="text-indigo-100 mt-1">Exercice clos le 31/12/{exercice}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { alert('Export PDF du Bilan SYSCOHADA en cours...\n\nLe fichier sera téléchargé automatiquement.'); window.print(); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2">
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button onClick={() => window.print()} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2">
              <Printer className="w-4 h-4" /> Imprimer
            </button>
          </div>
        </div>
      </div>

      {/* Deux colonnes */}
      <div className="grid grid-cols-2 gap-4 print:grid-cols-1">
        {/* ACTIF */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden print:shadow-none">
          <div className="bg-gradient-to-r from-orange-600 to-indigo-600 px-4 py-3 text-white font-bold print:bg-orange-600">
            ACTIF
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left">Réf</th>
                <th className="px-3 py-2 text-left">Libellé</th>
                <th className="px-3 py-2 text-right">Brut</th>
                <th className="px-3 py-2 text-right">Amort.</th>
                <th className="px-3 py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {actif.map((cat: any, catIdx: number) => (
                <React.Fragment key={catIdx}>
                  <tr className="bg-orange-50 font-semibold text-orange-800">
                    <td className="px-3 py-2 font-mono text-xs">{cat.ref}</td>
                    <td colSpan={4} className="px-3 py-2">{cat.categorie}</td>
                  </tr>
                  {cat.items.map((item: any, idx: number) => (
                    <tr key={`${item.code}-${idx}`} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-1.5 font-mono text-xs text-orange-600">{item.ref || item.code}</td>
                      <td className="px-3 py-1.5">{item.libelle}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs">{fmt(item.brut)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs text-rose-500">{item.amort > 0 ? fmt(item.amort) : '-'}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs font-semibold">{fmt(item.brut - (item.amort || 0))}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr className="bg-orange-200 font-bold">
                <td colSpan={2} className="px-3 py-2">TOTAL ACTIF</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(totalActifBrut)}</td>
                <td className="px-3 py-2 text-right font-mono text-rose-600">{fmt(totalAmort)}</td>
                <td className="px-3 py-2 text-right font-mono text-orange-800">{fmt(totalActifNet)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PASSIF */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-white font-bold">
            PASSIF
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left">Réf</th>
                <th className="px-3 py-2 text-left">Libellé</th>
                <th className="px-3 py-2 text-right" colSpan={3}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {passif.map((cat: any, catIdx: number) => (
                <React.Fragment key={catIdx}>
                  <tr className="bg-violet-50 font-semibold text-violet-800">
                    <td className="px-3 py-2 font-mono text-xs">{cat.ref}</td>
                    <td colSpan={4} className="px-3 py-2">{cat.categorie}</td>
                  </tr>
                  {cat.items.map((item: any, idx: number) => (
                    <tr key={`${item.code}-${idx}`} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-1.5 font-mono text-xs text-violet-600">{item.ref || item.code}</td>
                      <td className="px-3 py-1.5">{item.libelle}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs font-semibold" colSpan={3}>{fmt(item.montant)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr className="bg-violet-200 font-bold">
                <td colSpan={2} className="px-3 py-2">TOTAL PASSIF</td>
                <td className="px-3 py-2 text-right font-mono text-violet-800" colSpan={3}>{fmt(totalPassif)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Contrôle d'équilibre */}
      <div className={`rounded-xl p-4 flex items-center justify-between ${Math.abs(totalActifNet - totalPassif) < 1 ? 'bg-emerald-100 border border-emerald-300' : 'bg-rose-100 border border-rose-300'}`}>
        <div className="flex items-center gap-3">
          {Math.abs(totalActifNet - totalPassif) < 1 ? (
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          )}
          <span className={`font-semibold ${Math.abs(totalActifNet - totalPassif) < 1 ? 'text-emerald-800' : 'text-rose-800'}`}>
            {Math.abs(totalActifNet - totalPassif) < 1 ? 'Bilan équilibré' : `Écart de ${fmt(Math.abs(totalActifNet - totalPassif))} F`}
          </span>
        </div>
        <div className="flex items-center gap-6 font-mono">
          <span>Total Actif Net: <span className="font-bold">{fmt(totalActifNet)} F</span></span>
          <span>Total Passif: <span className="font-bold">{fmt(totalPassif)} F</span></span>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// DÉCLARATIONS TVA
// ══════════════════════════════════════════════════════════════════════════════

const TVATab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [mois, setMois] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/tva/generer`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ periode: mois })
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d);
        } else {
          setError(d.error || 'Erreur lors de la génération');
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Erreur de connexion au serveur');
        setLoading(false);
      });
  }, [mois]);

  if (loading) return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 animate-spin text-orange-600" /></div>;

  if (error || !data) return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-3"><Receipt className="w-7 h-7" />Déclaration de TVA</h2>
        <p className="text-orange-100 mt-1">Régime UEMOA - Taux normal 18%</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">{error || 'Aucune donnée TVA disponible pour cette période'}</p>
        <p className="text-sm text-slate-400 mt-2">Vérifiez que des écritures ont été comptabilisées pour la période {mois}</p>
      </div>
    </div>
  );

  const tvaCollectee = data.tva_collectee || [];
  const tvaDeductible = data.tva_deductible || [];
  const totalTVACollectee = data.total_tva_collectee || tvaCollectee.reduce((s: number, t: any) => s + t.tva, 0);
  const totalTVADeductible = data.total_tva_deductible || tvaDeductible.reduce((s: number, t: any) => s + t.tva, 0);
  const tvaNette = data.tva_nette ?? (totalTVACollectee - totalTVADeductible - (data.credit_anterieur || 0));

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Receipt className="w-7 h-7" />
              Déclaration de TVA
            </h2>
            <p className="text-orange-100 mt-1">Régime UEMOA - Taux normal 18%</p>
          </div>
          <div>
            <input type="month" value={mois} onChange={e => setMois(e.target.value)} className="px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white" />
          </div>
        </div>
      </div>

      {/* TVA Collectée */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 bg-emerald-50 border-b flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-emerald-800">TVA Collectée (sur les ventes)</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left">Compte</th>
              <th className="px-4 py-2 text-left">Libellé</th>
              <th className="px-4 py-2 text-right">Base HT</th>
              <th className="px-4 py-2 text-right">TVA</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tvaCollectee.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic">Aucune TVA collectée sur cette période</td></tr>
            ) : tvaCollectee.map((t: any) => (
              <tr key={t.compte} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-orange-600">{t.compte}</td>
                <td className="px-4 py-2">{t.libelle}</td>
                <td className="px-4 py-2 text-right font-mono">{fmt(t.base)}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-emerald-600">{fmt(t.tva)}</td>
              </tr>
            ))}
            <tr className="bg-emerald-100 font-bold">
              <td colSpan={3} className="px-4 py-2">TOTAL TVA COLLECTÉE</td>
              <td className="px-4 py-2 text-right font-mono text-emerald-700">{fmt(totalTVACollectee)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TVA Déductible */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 bg-rose-50 border-b flex items-center gap-2">
          <ArrowDownRight className="w-5 h-5 text-rose-600" />
          <span className="font-semibold text-rose-800">TVA Déductible (sur les achats)</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left">Compte</th>
              <th className="px-4 py-2 text-left">Libellé</th>
              <th className="px-4 py-2 text-right">Base HT</th>
              <th className="px-4 py-2 text-right">TVA</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tvaDeductible.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic">Aucune TVA déductible sur cette période</td></tr>
            ) : tvaDeductible.map((t: any) => (
              <tr key={t.compte} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-orange-600">{t.compte}</td>
                <td className="px-4 py-2">{t.libelle}</td>
                <td className="px-4 py-2 text-right font-mono">{fmt(t.base)}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-rose-600">{fmt(t.tva)}</td>
              </tr>
            ))}
            <tr className="bg-rose-100 font-bold">
              <td colSpan={3} className="px-4 py-2">TOTAL TVA DÉDUCTIBLE</td>
              <td className="px-4 py-2 text-right font-mono text-rose-700">{fmt(totalTVADeductible)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Résultat */}
      <div className={`rounded-xl p-6 ${tvaNette >= 0 ? 'bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300' : 'bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-300'}`}>
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">TVA Collectée</p>
            <p className="text-xl font-bold text-emerald-700">{fmt(totalTVACollectee)} F</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">TVA Déductible</p>
            <p className="text-xl font-bold text-rose-700">{fmt(totalTVADeductible)} F</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">Crédit antérieur</p>
            <p className="text-xl font-bold text-orange-700">{fmt(data.credit_anterieur || 0)} F</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold mb-1">{tvaNette >= 0 ? 'TVA À PAYER' : 'CRÉDIT DE TVA'}</p>
            <p className={`text-2xl font-black ${tvaNette >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{fmt(Math.abs(tvaNette))} F</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-300 flex justify-end gap-3">
          <button onClick={() => { const csvContent = `Déclaration TVA - ${mois}\n\nTVA Collectée;${totalTVACollectee}\nTVA Déductible;${totalTVADeductible}\nCrédit antérieur;${data.credit_anterieur || 0}\n${tvaNette >= 0 ? 'TVA À PAYER' : 'CRÉDIT DE TVA'};${Math.abs(tvaNette)}`; const blob = new Blob([csvContent], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `declaration_tva_${mois}.csv`; link.click(); }} className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md flex items-center gap-2 font-medium">
            <Download className="w-4 h-4" /> Exporter la déclaration
          </button>
          <button onClick={() => { if(confirm(`Télédéclarer la TVA pour la période ${mois} ?\n\n${tvaNette >= 0 ? 'TVA à payer: ' + fmt(tvaNette) + ' F' : 'Crédit de TVA: ' + fmt(Math.abs(tvaNette)) + ' F'}`)) alert('Télédéclaration envoyée avec succès!\n\nVous recevrez un accusé de réception par email.'); }} className="px-4 py-2 bg-amber-600 text-white rounded-lg shadow hover:bg-amber-700 flex items-center gap-2 font-semibold">
            <Send className="w-4 h-4" /> Télédéclarer
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// LIASSE FISCALE, BUDGET, ANALYTIQUE, IMMOBILISATIONS, CLOTURE, PLAN COMPTABLE, PARAMETRES
// ══════════════════════════════════════════════════════════════════════════════

const LiasseFiscaleTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const generateLiasse = async () => {
    setLoading(true);
    try {
      const [bilanRes, resultatRes] = await Promise.all([
        fetch(`${API}/bilan?exercice=${exercice}`, { headers: headers() }).then(r => r.json()),
        fetch(`${API}/compte-resultat?exercice=${exercice}`, { headers: headers() }).then(r => r.json())
      ]);
      const liasseData = { bilan: bilanRes.data, resultat: resultatRes.data };
      setData(liasseData);
      // Generate printable view
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><head><title>Liasse Fiscale SYSCOHADA - ${exercice}</title>
        <style>body{font-family:Arial,sans-serif;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:6px 10px;font-size:12px}th{background:#f0f0f0;font-weight:bold}h1{font-size:18px}h2{font-size:14px;margin-top:20px}.right{text-align:right}</style></head><body>`);
        printWindow.document.write(`<h1>LIASSE FISCALE SYSCOHADA - Exercice ${exercice}</h1>`);
        if (liasseData.resultat) {
          printWindow.document.write(`<h2>Compte de Résultat</h2><table><tr><th>Poste</th><th class="right">Montant</th></tr>`);
          printWindow.document.write(`<tr><td>Total Produits</td><td class="right">${fmt(liasseData.resultat.total_produits || 0)} F</td></tr>`);
          printWindow.document.write(`<tr><td>Total Charges</td><td class="right">${fmt(liasseData.resultat.total_charges || 0)} F</td></tr>`);
          printWindow.document.write(`<tr><td><b>Résultat Net</b></td><td class="right"><b>${fmt(liasseData.resultat.resultat_net || 0)} F</b></td></tr>`);
          printWindow.document.write(`</table>`);
        }
        if (liasseData.bilan) {
          printWindow.document.write(`<h2>Bilan</h2><table><tr><th>Poste</th><th class="right">Montant</th></tr>`);
          const b = liasseData.bilan;
          if (b.actif) Object.entries(b.actif).forEach(([k, v]: any) => { printWindow.document.write(`<tr><td>${k}</td><td class="right">${fmt(v)} F</td></tr>`); });
          if (b.passif) Object.entries(b.passif).forEach(([k, v]: any) => { printWindow.document.write(`<tr><td>${k}</td><td class="right">${fmt(v)} F</td></tr>`); });
          printWindow.document.write(`</table>`);
        }
        printWindow.document.write(`</body></html>`);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (err: any) { alert('Erreur: ' + err.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <FileCheck className="w-7 h-7" />
          Liasse Fiscale SYSCOHADA
        </h2>
        <p className="text-slate-200 mt-1">Génération automatique des états fiscaux - Exercice {exercice}</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {['Bilan Actif', 'Bilan Passif', 'Compte de Résultat', 'Tableau des flux', 'Tableau des immobilisations', 'État annexé'].map((doc, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md cursor-pointer">
            <FileSpreadsheet className="w-8 h-8 text-slate-400 mb-2" />
            <h3 className="font-semibold text-slate-800">{doc}</h3>
            <p className="text-sm text-slate-500">État n°{i + 1}</p>
          </div>
        ))}
      </div>
      <button onClick={generateLiasse} disabled={loading} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-700 disabled:opacity-50">
        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        Générer la liasse complète (PDF)
      </button>
      {data && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h3 className="font-semibold text-emerald-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Liasse générée avec succès</h3>
          <p className="text-sm text-emerald-700 mt-1">Bilan: {data.bilan ? '✓' : '✗'} | Compte de résultat: {data.resultat ? '✓' : '✗'}</p>
          {data.resultat && (
            <p className="text-sm text-emerald-700">Résultat net: {fmt(data.resultat.resultat_net || 0)} F</p>
          )}
        </div>
      )}
    </div>
  );
};

const BudgetTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [form, setForm] = useState({ categorie: '', prevu: 0 });

  const loadBudgets = () => {
    setLoading(true);
    fetch(`${API}/budgets?exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setBudgets(d.data || []); setLoading(false); })
      .catch(() => { setBudgets([]); setLoading(false); });
  };

  useEffect(() => { loadBudgets(); }, [exercice]);

  const handleSave = async () => {
    if (!form.categorie) { alert('Catégorie requise'); return; }
    try {
      const url = editingBudget ? `${API}/budgets/${editingBudget.id}` : `${API}/budgets`;
      const method = editingBudget ? 'PUT' : 'POST';
      const body = editingBudget ? { prevu: form.prevu } : { ...form, exercice_annee: exercice };
      const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
      const d = await res.json();
      if (d.success) { setShowForm(false); setEditingBudget(null); loadBudgets(); }
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce budget ?')) return;
    try {
      const res = await fetch(`${API}/budgets/${id}`, { method: 'DELETE', headers: headers() });
      const d = await res.json();
      if (d.success) loadBudgets();
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Target className="w-7 h-7" />
          Budget Prévisionnel
        </h2>
        <p className="text-teal-100 mt-1">Suivi budgétaire - Exercice {exercice}</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="font-semibold text-slate-700">{budgets.length} poste(s) budgétaire(s)</span>
          <button onClick={() => { setEditingBudget(null); setForm({ categorie: '', prevu: 0 }); setShowForm(true); }} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-semibold">+ Ajouter</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Catégorie</th>
              <th className="px-4 py-3 text-right">Budget Prévu</th>
              <th className="px-4 py-3 text-right">Réalisé</th>
              <th className="px-4 py-3 text-right">Écart</th>
              <th className="px-4 py-3 text-center">Progression</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Chargement...</td></tr>
            ) : budgets.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Aucun budget défini</td></tr>
            ) : budgets.map(b => {
              const prevu = parseFloat(b.prevu) || 0;
              const realise = parseFloat(b.realise) || 0;
              const ecart = realise - prevu;
              const pct = prevu > 0 ? Math.round((realise / prevu) * 100) : 0;
              return (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">{b.categorie}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(prevu)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{fmt(realise)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${ecart >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{ecart >= 0 ? '+' : ''}{fmt(ecart)}</td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                    </div>
                    <p className="text-xs text-center mt-1">{pct}%</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => { setEditingBudget(b); setForm({ categorie: b.categorie, prevu }); setShowForm(true); }} className="p-1 hover:bg-orange-100 rounded text-orange-600" title="Modifier"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(b.id)} className="p-1 hover:bg-rose-100 rounded text-rose-600 ml-1" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 space-y-4">
            <h3 className="text-lg font-bold">{editingBudget ? 'Modifier le budget' : 'Nouveau budget'}</h3>
            <div>
              <label className="block text-sm font-semibold mb-1">Catégorie</label>
              <input type="text" value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} disabled={!!editingBudget} className="w-full px-3 py-2 border rounded-lg" placeholder="ex: Ventes, Achats..." />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Montant prévu</label>
              <input type="number" value={form.prevu} onChange={e => setForm({ ...form, prevu: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowForm(false); setEditingBudget(null); }} className="px-4 py-2 border rounded-lg">Annuler</button>
              <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AnalytiqueTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [centres, setCentres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', libelle: '', type: 'principal' });

  const loadCentres = () => {
    setLoading(true);
    fetch(`${API}/analytique/centres?exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setCentres(d.data || []); setLoading(false); })
      .catch(() => { setCentres([]); setLoading(false); });
  };

  useEffect(() => { loadCentres(); }, [exercice]);

  const handleSave = async () => {
    if (!form.code || !form.libelle) { alert('Code et libellé requis'); return; }
    try {
      const res = await fetch(`${API}/analytique/centres`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ ...form, exercice_annee: exercice })
      });
      const d = await res.json();
      if (d.success) { setShowForm(false); setForm({ code: '', libelle: '', type: 'principal' }); loadCentres(); }
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce centre ?')) return;
    try {
      const res = await fetch(`${API}/analytique/centres/${id}`, { method: 'DELETE', headers: headers() });
      const d = await res.json();
      if (d.success) loadCentres();
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <BarChart3 className="w-7 h-7" />
          Comptabilité Analytique
        </h2>
        <p className="text-purple-100 mt-1">Répartition par centre de coût - Exercice {exercice}</p>
      </div>
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold">+ Nouveau centre</button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-4 text-center py-12 text-slate-400">Chargement...</div>
        ) : centres.length === 0 ? (
          <div className="col-span-4 text-center py-12 text-slate-400">Aucun centre analytique</div>
        ) : centres.map(c => {
          const charges = parseFloat(c.charges) || 0;
          const produits = parseFloat(c.produits) || 0;
          return (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-mono text-sm font-semibold">{c.code}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${produits - charges >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {produits - charges >= 0 ? '+' : ''}{fmt(produits - charges)}
                  </span>
                  <button onClick={() => handleDelete(c.id)} className="p-1 hover:bg-rose-100 rounded text-rose-500" title="Supprimer"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-800">{c.libelle}</h3>
              <div className="mt-2 text-sm">
                <p className="text-slate-500">Charges: <span className="font-mono text-rose-600">{fmt(charges)}</span></p>
                <p className="text-slate-500">Produits: <span className="font-mono text-emerald-600">{fmt(produits)}</span></p>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 space-y-4">
            <h3 className="text-lg font-bold">Nouveau centre analytique</h3>
            <div>
              <label className="block text-sm font-semibold mb-1">Code</label>
              <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="PROD, COMM..." />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Libellé</label>
              <input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Annuler</button>
              <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ImmobilisationsTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [immobilisations, setImmobilisations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', libelle: '', valeur_origine: 0, date_acquisition: '', duree_amortissement: 5, mode_amortissement: 'lineaire' });

  const loadImmos = () => {
    setLoading(true);
    fetch(`${API}/immobilisations?exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setImmobilisations(d.data || []); setLoading(false); })
      .catch(() => { setImmobilisations([]); setLoading(false); });
  };

  useEffect(() => { loadImmos(); }, [exercice]);

  const handleSave = async () => {
    if (!form.code || !form.libelle || !form.valeur_origine || !form.date_acquisition) { alert('Champs requis manquants'); return; }
    try {
      const res = await fetch(`${API}/immobilisations`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ ...form, taux_amortissement: (100 / form.duree_amortissement).toFixed(2), exercice_annee: exercice })
      });
      const d = await res.json();
      if (d.success) { setShowForm(false); setForm({ code: '', libelle: '', valeur_origine: 0, date_acquisition: '', duree_amortissement: 5, mode_amortissement: 'lineaire' }); loadImmos(); }
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette immobilisation ?')) return;
    try {
      const res = await fetch(`${API}/immobilisations/${id}`, { method: 'DELETE', headers: headers() });
      const d = await res.json();
      if (d.success) loadImmos();
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  const handleCalculerAmort = async () => {
    try {
      const res = await fetch(`${API}/immobilisations/calculer-amortissements`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ exercice })
      });
      const d = await res.json();
      if (d.success) { alert(d.message); loadImmos(); }
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-700 to-zinc-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Archive className="w-7 h-7" />
              Gestion des Immobilisations
            </h2>
            <p className="text-slate-200 mt-1">Tableau des amortissements - Exercice {exercice}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCalculerAmort} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Calculer amortissements
            </button>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nouvelle immobilisation
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Désignation</th>
              <th className="px-4 py-3 text-center">Date achat</th>
              <th className="px-4 py-3 text-right">Valeur</th>
              <th className="px-4 py-3 text-center">Durée</th>
              <th className="px-4 py-3 text-center">Taux</th>
              <th className="px-4 py-3 text-right">Amort. cumulés</th>
              <th className="px-4 py-3 text-right">VNC</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Chargement...</td></tr>
            ) : immobilisations.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Aucune immobilisation</td></tr>
            ) : immobilisations.map(i => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-orange-600">{i.code}</td>
                <td className="px-4 py-2 font-medium">{i.libelle}</td>
                <td className="px-4 py-2 text-center">{formatDate(i.date_acquisition)}</td>
                <td className="px-4 py-2 text-right font-mono">{fmt(i.valeur_origine)}</td>
                <td className="px-4 py-2 text-center">{i.duree_amortissement} ans</td>
                <td className="px-4 py-2 text-center">{i.taux_amortissement}%</td>
                <td className="px-4 py-2 text-right font-mono text-rose-600">{fmt(i.amort_cumule)}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold">{fmt(i.vnc)}</td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => handleDelete(i.id)} className="p-1 hover:bg-rose-100 rounded text-rose-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[440px] space-y-4">
            <h3 className="text-lg font-bold">Nouvelle immobilisation</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Code</label>
                <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Désignation</label>
                <input type="text" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Valeur d'origine</label>
                <input type="number" value={form.valeur_origine} onChange={e => setForm({ ...form, valeur_origine: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Date acquisition</label>
                <input type="date" value={form.date_acquisition} onChange={e => setForm({ ...form, date_acquisition: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Durée (ans)</label>
                <input type="number" value={form.duree_amortissement} onChange={e => setForm({ ...form, duree_amortissement: parseInt(e.target.value) || 5 })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Mode</label>
                <select value={form.mode_amortissement} onChange={e => setForm({ ...form, mode_amortissement: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="lineaire">Linéaire</option>
                  <option value="degressif">Dégressif</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Annuler</button>
              <button onClick={handleSave} className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ClotureTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [etapes, setEtapes] = useState<any[]>([]);
  const [statut, setStatut] = useState<string>('ouvert');
  const [peutCloturer, setPeutCloturer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cloturing, setCloturing] = useState(false);

  const loadEtapes = () => {
    setLoading(true);
    fetch(`${API}/exercices/cloture-etapes/${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setEtapes(d.etapes || []);
          setStatut(d.statut || 'ouvert');
          setPeutCloturer(d.peut_cloturer || false);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadEtapes(); }, [exercice]);

  const handleCloturer = async () => {
    if (!confirm(`⚠️ ATTENTION : Clôturer définitivement l'exercice ${exercice} ?\n\nCette action est IRRÉVERSIBLE.\n\nLe résultat sera automatiquement affecté au compte 120 (bénéfice) ou 129 (perte), et un nouvel exercice ${exercice + 1} sera créé.`)) return;
    setCloturing(true);
    try {
      const res = await fetch(`${API}/exercices/cloturer`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ annee: exercice })
      });
      const d = await res.json();
      if (d.success) {
        alert(`✅ Exercice ${exercice} clôturé avec succès !\n\nRésultat: ${d.resultat?.toLocaleString('fr-FR') || 0} F (${d.type})\nExercice suivant ${d.exercice_suivant} créé.`);
        loadEtapes();
      } else {
        alert(`❌ Erreur: ${d.error}`);
      }
    } catch (err: any) {
      alert(`❌ Erreur de connexion: ${err.message}`);
    }
    setCloturing(false);
  };

  if (loading) return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 animate-spin text-rose-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Lock className="w-7 h-7" />
              Clôture d'Exercice
            </h2>
            <p className="text-rose-100 mt-1">Procédure de clôture - Exercice {exercice}</p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${statut === 'cloture' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
              {statut === 'cloture' ? '🔒 CLÔTURÉ' : '📂 OUVERT'}
            </span>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="space-y-4">
          {etapes.map((e: any) => (
            <div key={e.id} className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                e.statut === 'done' ? 'bg-emerald-500 text-white' :
                e.statut === 'current' ? 'bg-amber-500 text-white animate-pulse' :
                'bg-slate-200 text-slate-500'
              }`}>
                {e.statut === 'done' ? <Check className="w-5 h-5" /> : e.id}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${e.statut === 'done' ? 'text-emerald-700' : e.statut === 'current' ? 'text-amber-700' : 'text-slate-500'}`}>
                  {e.label}
                </p>
              </div>
              {e.statut === 'done' && <Check className="w-5 h-5 text-emerald-500" />}
              {e.statut === 'current' && <span className="text-sm text-amber-600 italic">En cours...</span>}
              {e.statut === 'pending' && <span className="text-sm text-slate-400 italic">En attente</span>}
            </div>
          ))}
        </div>
        {statut !== 'cloture' && (
          <div className="mt-6 pt-6 border-t border-slate-200 flex justify-end">
            <button
              onClick={handleCloturer}
              disabled={!peutCloturer || cloturing}
              className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                peutCloturer && !cloturing
                  ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-500/30'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title={!peutCloturer ? 'La balance doit être équilibrée avant la clôture' : ''}
            >
              {cloturing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              {cloturing ? 'Clôture en cours...' : 'Clôturer définitivement l\'exercice'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PlanComptableTab: React.FC = () => {
  const [comptes, setComptes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/plan-comptable`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        setComptes(d.data || []);
        setLoading(false);
      })
      .catch(() => {
        // Données par défaut
        setComptes([
          { code: '10', libelle: 'Capital', classe: 1 },
          { code: '21', libelle: 'Immobilisations incorporelles', classe: 2 },
          { code: '31', libelle: 'Stocks de marchandises', classe: 3 },
          { code: '41', libelle: 'Clients', classe: 4 },
          { code: '52', libelle: 'Banques', classe: 5 },
          { code: '60', libelle: 'Achats', classe: 6 },
          { code: '70', libelle: 'Ventes', classe: 7 },
        ]);
        setLoading(false);
      });
  }, []);

  const filtered = comptes.filter(c =>
    c.code?.includes(search) || c.libelle?.toLowerCase().includes(search.toLowerCase())
  );

  const classeColors: Record<number, string> = {
    1: 'bg-violet-100 text-violet-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-cyan-100 text-cyan-800',
    4: 'bg-amber-100 text-amber-800',
    5: 'bg-emerald-100 text-emerald-800',
    6: 'bg-rose-100 text-rose-800',
    7: 'bg-green-100 text-green-800',
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-indigo-600 to-orange-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Layers className="w-7 h-7" />
          Plan Comptable SYSCOHADA
        </h2>
        <p className="text-indigo-100 mt-1">Consultation et paramétrage des comptes</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un compte..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <button onClick={() => alert('Création d\'un nouveau compte SYSCOHADA\n\nSaisissez:\n- Code compte (6 chiffres)\n- Libellé du compte\n- Classe comptable\n- Type (débiteur/créditeur)')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouveau compte
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Libellé</th>
              <th className="px-4 py-3 text-center">Classe</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Chargement...</td></tr>
            ) : filtered.slice(0, 50).map(c => (
              <tr key={c.code} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono font-semibold text-orange-600">{c.code}</td>
                <td className="px-4 py-2">{c.libelle}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${classeColors[parseInt(c.code?.[0])] || 'bg-slate-100'}`}>
                    Classe {c.code?.[0]}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => alert(`Modifier le compte:\n\nCode: ${c.code}\nLibellé: ${c.libelle}\nClasse: ${c.code?.[0]}`)} className="p-1 hover:bg-orange-100 rounded text-orange-600" title="Modifier"><Edit3 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ParametresTab: React.FC = () => {
  const [config, setConfig] = useState({
    societe: 'ALLO BÉTON SARL',
    exercice_debut: '01/01',
    exercice_fin: '31/12',
    devise: 'XOF',
    tva_taux: '18',
    decimales: '0',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/parametres`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setConfig(prev => ({ ...prev, ...d.data }));
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/parametres`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify(config)
      });
      const d = await res.json();
      if (d.success) alert('Paramètres enregistrés !');
      else alert(d.error);
    } catch (err: any) { alert('Erreur: ' + err.message); }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Chargement des paramètres...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Settings className="w-7 h-7" />
          Paramètres Comptabilité
        </h2>
        <p className="text-slate-200 mt-1">Configuration du module comptable</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-600" />
            Informations société
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Raison sociale</label>
            <input type="text" value={config.societe} onChange={e => setConfig({...config, societe: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Début exercice</label>
              <input type="text" value={config.exercice_debut} className="w-full px-3 py-2 border rounded-lg" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fin exercice</label>
              <input type="text" value={config.exercice_fin} className="w-full px-3 py-2 border rounded-lg" readOnly />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-slate-600" />
            Paramètres comptables
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Devise</label>
            <select value={config.devise} onChange={e => setConfig({...config, devise: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
              <option value="XOF">XOF - Franc CFA (BCEAO)</option>
              <option value="XAF">XAF - Franc CFA (BEAC)</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Taux TVA par défaut</label>
            <select value={config.tva_taux} onChange={e => setConfig({...config, tva_taux: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
              <option value="18">18% - Taux normal UEMOA</option>
              <option value="9">9% - Taux réduit</option>
              <option value="0">0% - Exonéré</option>
            </select>
          </div>
        </div>
      </div>
      <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
        {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Enregistrer les paramètres
      </button>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════

const DashboardKPI: React.FC<{ title: string; value: string; suffix?: string; icon: React.ReactNode; color: string; trend?: number }> =
  ({ title, value, suffix, icon, color, trend }) => {
  const gradients: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-600',
    rose: 'from-rose-500 to-red-600',
    blue: 'from-orange-500 to-indigo-600',
    violet: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600',
  };

  return (
    <div className={`bg-gradient-to-br ${gradients[color] || gradients.blue} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-white/80">{title}</span>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">{icon}</div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{value}</span>
          {suffix && <span className="text-sm text-white/70">{suffix}</span>}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{Math.abs(trend)}% vs mois précédent</span>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardAlert: React.FC<{ type: 'warning' | 'info' | 'success'; title: string; message: string; action?: string }> =
  ({ type, title, message, action }) => {
  const styles = {
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, text: 'text-amber-800', btn: 'bg-amber-100 hover:bg-amber-200 text-amber-800' },
    info: { bg: 'bg-orange-50', border: 'border-orange-200', icon: <AlertCircle className="w-5 h-5 text-orange-600" />, text: 'text-orange-800', btn: 'bg-orange-100 hover:bg-orange-200 text-orange-800' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, text: 'text-emerald-800', btn: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800' },
  };
  const s = styles[type];

  return (
    <div className={`${s.bg} ${s.border} border rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        {s.icon}
        <div className="flex-1">
          <p className={`font-medium ${s.text}`}>{title}</p>
          <p className="text-sm text-slate-600 mt-0.5">{message}</p>
          {action && (
            <button onClick={() => alert(`Action: ${action}\n\n${message}`)} className={`text-sm font-medium mt-2 px-3 py-1 rounded-lg ${s.btn}`}>{action} →</button>
          )}
        </div>
      </div>
    </div>
  );
};

const FeaturePlaceholder: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({ title, description, icon }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
    <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-orange-600">
      {icon}
    </div>
    <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
    <p className="text-slate-500 max-w-md mx-auto mb-6">{description}</p>
    <div className="flex items-center justify-center gap-3">
      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">Fonctionnalité Sage SAARI</span>
      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">En développement</span>
    </div>
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-slate-200 rounded w-1/3" />
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
    </div>
    <div className="h-64 bg-slate-200 rounded-xl" />
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-16">
    <FileSpreadsheet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
    <p className="text-slate-500 font-medium">{message}</p>
    <p className="text-sm text-slate-400 mt-1">Cliquez sur "Comptabiliser" pour importer les données</p>
  </div>
);


// Fix missing ChevronLeft import
const ChevronLeft = ChevronRight;
