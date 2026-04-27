import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, FileText, BarChart3, PieChart, Calculator,
  TrendingUp, TrendingDown, DollarSign, RefreshCw, Download,
  ChevronDown, ChevronRight, Filter, Calendar, AlertTriangle,
  CheckCircle, ArrowUpRight, ArrowDownRight, Layers, FileSpreadsheet,
  Building2, Receipt, Scale
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

// ══════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════

type Tab = 'dashboard' | 'journal' | 'grand-livre' | 'balance' | 'resultat' | 'bilan' | 'tva' | 'plan-comptable';

export const ComptabiliteOHADA: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [exercice, setExercice] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <PieChart className="w-4 h-4" /> },
    { id: 'journal', label: 'Journal', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'grand-livre', label: 'Grand Livre', icon: <FileText className="w-4 h-4" /> },
    { id: 'balance', label: 'Balance', icon: <Scale className="w-4 h-4" /> },
    { id: 'resultat', label: 'Compte de Résultat', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'bilan', label: 'Bilan', icon: <Building2 className="w-4 h-4" /> },
    { id: 'tva', label: 'TVA', icon: <Receipt className="w-4 h-4" /> },
    { id: 'plan-comptable', label: 'Plan Comptable', icon: <Layers className="w-4 h-4" /> },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-indigo-600" />
            Comptabilité OHADA
          </h1>
          <p className="text-sm text-gray-500 mt-1">Module conforme SYSCOHADA révisé — Zone UEMOA / BCEAO</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={exercice}
            onChange={e => setExercice(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>Exercice {y}</option>
            ))}
          </select>
          <ImportButton />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div>
        {activeTab === 'dashboard' && <DashboardTab exercice={exercice} />}
        {activeTab === 'journal' && <JournalTab exercice={exercice} />}
        {activeTab === 'grand-livre' && <GrandLivreTab exercice={exercice} />}
        {activeTab === 'balance' && <BalanceTab exercice={exercice} />}
        {activeTab === 'resultat' && <CompteResultatTab exercice={exercice} />}
        {activeTab === 'bilan' && <BilanTab exercice={exercice} />}
        {activeTab === 'tva' && <TVATab exercice={exercice} />}
        {activeTab === 'plan-comptable' && <PlanComptableTab />}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// BOUTON IMPORT HISTORIQUE
// ══════════════════════════════════════════════

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
      setTimeout(() => setResult(null), 8000);
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
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
      >
        <RefreshCw className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} />
        {importing ? 'Import...' : 'Comptabiliser'}
      </button>
      {result && (
        <div className="absolute right-0 top-12 bg-white border rounded-lg shadow-lg p-4 z-50 w-72">
          <p className="font-medium text-green-700 mb-2">✅ Import terminé</p>
          <div className="text-sm space-y-1">
            <p>Ventes: {result.ventes}</p>
            <p>Paiements: {result.paiements}</p>
            <p>Caisse: {result.caisse}</p>
            <p>Achats: {result.achats}</p>
            <p>Salaires: {result.salaires}</p>
            <p>Avoirs: {result.avoirs}</p>
            <p className="font-bold border-t pt-1 mt-1">Total: {result.total}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════
// DASHBOARD COMPTABLE
// ══════════════════════════════════════════════

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
  if (!data) return <EmptyState message="Aucune donnée comptable" />;

  const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Chiffre d'Affaires"
          value={`${fmt(data.total_produits)} F`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
        />
        <KPICard
          title="Total Charges"
          value={`${fmt(data.total_charges)} F`}
          icon={<TrendingDown className="w-5 h-5" />}
          color="red"
        />
        <KPICard
          title={`Résultat Net (${data.type_resultat})`}
          value={`${fmt(Math.abs(data.resultat_net))} F`}
          icon={data.resultat_net >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          color={data.resultat_net >= 0 ? 'blue' : 'orange'}
        />
        <KPICard
          title="Écritures Comptables"
          value={fmt(data.total_ecritures)}
          icon={<FileText className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Graphique CA vs Charges mensuel */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-800 mb-4">📊 Évolution mensuelle — CA vs Charges</h3>
        <div className="flex items-end gap-2 h-48">
          {moisNoms.map((m, idx) => {
            const ca = data.ca_mensuel?.find((c: any) => c.mois === idx + 1)?.ca || 0;
            const ch = data.charges_mensuel?.find((c: any) => c.mois === idx + 1)?.charges || 0;
            const maxVal = Math.max(...(data.ca_mensuel?.map((c: any) => parseFloat(c.ca)) || [1]), ...(data.charges_mensuel?.map((c: any) => parseFloat(c.charges)) || [1]));
            const hCA = maxVal > 0 ? (parseFloat(ca.toString()) / maxVal) * 150 : 0;
            const hCH = maxVal > 0 ? (parseFloat(ch.toString()) / maxVal) * 150 : 0;

            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex gap-0.5 items-end h-[150px]">
                  <div className="w-3 bg-emerald-400 rounded-t" style={{ height: `${hCA}px` }} title={`CA: ${fmt(parseFloat(ca.toString()))}`} />
                  <div className="w-3 bg-red-400 rounded-t" style={{ height: `${hCH}px` }} title={`Charges: ${fmt(parseFloat(ch.toString()))}`} />
                </div>
                <span className="text-xs text-gray-500">{m}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400" /> Produits</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> Charges</span>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// JOURNAL COMPTABLE
// ══════════════════════════════════════════════

const JournalTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [ecritures, setEcritures] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [journal, setJournal] = useState('');
  const [journaux, setJournaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/journaux`, { headers: headers() })
      .then(r => r.json())
      .then(d => setJournaux(d.data || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ exercice: String(exercice), page: String(page), limit: '50' });
    if (journal) params.set('journal_code', journal);
    fetch(`${API}/ecritures?${params}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setEcritures(d.ecritures || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [exercice, page, journal]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={journal}
          onChange={e => { setJournal(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Tous les journaux</option>
          {journaux.map((j: any) => (
            <option key={j.code} value={j.code}>{j.code} — {j.libelle}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{total} écritures</span>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-3 text-left">Date</th>
              <th className="px-3 py-3 text-left">Journal</th>
              <th className="px-3 py-3 text-left">N° Pièce</th>
              <th className="px-3 py-3 text-left">Compte</th>
              <th className="px-3 py-3 text-left">Libellé</th>
              <th className="px-3 py-3 text-right">Débit</th>
              <th className="px-3 py-3 text-right">Crédit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : ecritures.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Aucune écriture</td></tr>
            ) : ecritures.map((e: any) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{formatDate(e.date_ecriture)}</td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">{e.journal_code}</span></td>
                <td className="px-3 py-2 text-gray-500">{e.numero_piece || '-'}</td>
                <td className="px-3 py-2 font-mono font-medium">{e.compte_code}</td>
                <td className="px-3 py-2 max-w-xs truncate">{e.libelle}</td>
                <td className="px-3 py-2 text-right font-mono">{parseFloat(e.debit) > 0 ? fmt(parseFloat(e.debit)) : ''}</td>
                <td className="px-3 py-2 text-right font-mono">{parseFloat(e.credit) > 0 ? fmt(parseFloat(e.credit)) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-40">← Précédent</button>
          <span className="px-3 py-1 text-sm text-gray-600">Page {page} / {Math.ceil(total / 50)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Suivant →</button>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════
// GRAND LIVRE
// ══════════════════════════════════════════════

const GrandLivreTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [data, setData] = useState<any[]>([]);
  const [compteFilter, setCompteFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ exercice: String(exercice) });
    if (compteFilter) params.set('compte_code', compteFilter);
    fetch(`${API}/grand-livre?${params}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [exercice, compteFilter]);

  const toggleExpand = (code: string) => {
    const next = new Set(expanded);
    next.has(code) ? next.delete(code) : next.add(code);
    setExpanded(next);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtrer par compte (ex: 411, 57...)"
          value={compteFilter}
          onChange={e => setCompteFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm w-64"
        />
        <span className="text-sm text-gray-500">{data.length} comptes</span>
      </div>

      <div className="space-y-2">
        {data.map((compte: any) => (
          <div key={compte.code} className="bg-white rounded-xl border">
            <button
              onClick={() => toggleExpand(compte.code)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {expanded.has(compte.code) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-mono font-bold text-indigo-700">{compte.code}</span>
                <span className="text-gray-700">{compte.libelle}</span>
                <span className="text-xs text-gray-400">({compte.ecritures.length} écritures)</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">D: {fmt(compte.total_debit)}</span>
                <span className="text-gray-500">C: {fmt(compte.total_credit)}</span>
                <span className={`font-bold ${compte.solde >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                  Solde: {fmt(Math.abs(compte.solde))} {compte.solde >= 0 ? 'D' : 'C'}
                </span>
              </div>
            </button>
            {expanded.has(compte.code) && (
              <div className="border-t overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Libellé</th>
                      <th className="px-3 py-2 text-right">Débit</th>
                      <th className="px-3 py-2 text-right">Crédit</th>
                      <th className="px-3 py-2 text-right">Solde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {compte.ecritures.map((e: any) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-mono text-xs">{formatDate(e.date_ecriture)}</td>
                        <td className="px-3 py-1.5 max-w-md truncate">{e.libelle}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{parseFloat(e.debit) > 0 ? fmt(parseFloat(e.debit)) : ''}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{parseFloat(e.credit) > 0 ? fmt(parseFloat(e.credit)) : ''}</td>
                        <td className="px-3 py-1.5 text-right font-mono font-medium">{fmt(Math.abs(parseFloat(e.solde_progressif)))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// BALANCE GÉNÉRALE
// ══════════════════════════════════════════════

const BalanceTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/balance?exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [exercice]);

  if (loading) return <LoadingSkeleton />;
  if (!data?.comptes) return <EmptyState message="Aucune donnée" />;

  const classes: Record<number, string> = {
    1: 'Capitaux', 2: 'Immobilisations', 3: 'Stocks', 4: 'Tiers',
    5: 'Finance', 6: 'Charges', 7: 'Produits', 8: 'Engagements'
  };

  const grouped: Record<number, any[]> = {};
  data.comptes.forEach((c: any) => {
    if (!grouped[c.classe]) grouped[c.classe] = [];
    grouped[c.classe].push(c);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Balance Générale — Exercice {exercice}</h2>
        {data.totaux && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${data.totaux.equilibre ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {data.totaux.equilibre ? '✅ Équilibrée' : '⚠️ Déséquilibrée'}
          </span>
        )}
      </div>

      {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([classe, comptes]) => (
        <div key={classe} className="bg-white rounded-xl border">
          <div className="px-4 py-3 bg-indigo-50 border-b font-semibold text-indigo-800">
            Classe {classe} — {classes[Number(classe)] || ''}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Libellé</th>
                <th className="px-3 py-2 text-right">Total Débit</th>
                <th className="px-3 py-2 text-right">Total Crédit</th>
                <th className="px-3 py-2 text-right">Solde Débiteur</th>
                <th className="px-3 py-2 text-right">Solde Créditeur</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {comptes.map((c: any) => (
                <tr key={c.code} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono font-bold">{c.code}</td>
                  <td className="px-3 py-2">{c.libelle}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(c.total_debit)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(c.total_credit)}</td>
                  <td className="px-3 py-2 text-right font-mono text-orange-600">{c.solde_debiteur > 0 ? fmt(c.solde_debiteur) : ''}</td>
                  <td className="px-3 py-2 text-right font-mono text-red-600">{c.solde_crediteur > 0 ? fmt(c.solde_crediteur) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {data.totaux && (
        <div className="bg-indigo-900 text-white rounded-xl p-4 flex justify-between items-center text-sm font-medium">
          <span>TOTAUX</span>
          <div className="flex gap-8">
            <span>Débit: {fmt(data.totaux.total_debit)} F</span>
            <span>Crédit: {fmt(data.totaux.total_credit)} F</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════
// COMPTE DE RÉSULTAT
// ══════════════════════════════════════════════

const CompteResultatTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/compte-resultat?exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [exercice]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <EmptyState message="Aucune donnée" />;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Compte de Résultat — Exercice {exercice}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHARGES */}
        <div className="bg-white rounded-xl border">
          <div className="px-4 py-3 bg-red-50 border-b font-semibold text-red-800 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" /> CHARGES (Classe 6)
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {(data.charges || []).map((c: any) => (
                <tr key={c.code} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                  <td className="px-3 py-2">{c.libelle}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">{fmt(c.montant)} F</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-red-50 font-bold">
                <td colSpan={2} className="px-3 py-3">Total Charges</td>
                <td className="px-3 py-3 text-right font-mono">{fmt(data.total_charges)} F</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* PRODUITS */}
        <div className="bg-white rounded-xl border">
          <div className="px-4 py-3 bg-emerald-50 border-b font-semibold text-emerald-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> PRODUITS (Classe 7)
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {(data.produits || []).map((p: any) => (
                <tr key={p.code} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                  <td className="px-3 py-2">{p.libelle}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">{fmt(p.montant)} F</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50 font-bold">
                <td colSpan={2} className="px-3 py-3">Total Produits</td>
                <td className="px-3 py-3 text-right font-mono">{fmt(data.total_produits)} F</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* RÉSULTAT NET */}
      <div className={`rounded-xl p-6 text-center ${data.resultat_net >= 0 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-orange-600'} text-white`}>
        <p className="text-sm opacity-80 mb-1">{data.type}</p>
        <p className="text-3xl font-bold">{fmt(Math.abs(data.resultat_net))} FCFA</p>
        <p className="text-sm opacity-80 mt-1">Résultat net de l'exercice {exercice}</p>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// BILAN OHADA
// ══════════════════════════════════════════════

const BilanTab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/bilan?exercice=${exercice}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [exercice]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <EmptyState message="Aucune donnée" />;

  const BilanSection: React.FC<{ title: string; items: any[]; color: string }> = ({ title, items, color }) => (
    <div className="mb-4">
      <h4 className={`font-semibold text-sm mb-2 text-${color}-700`}>{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Aucune donnée</p>
      ) : items.map((item: any) => (
        <div key={item.code} className="flex justify-between py-1 text-sm border-b border-gray-100 last:border-0">
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400">{item.code}</span>
            {item.libelle}
          </span>
          <span className="font-mono font-medium">{fmt(Math.abs(item.montant))} F</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bilan OHADA — Exercice {exercice}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${data.equilibre ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {data.equilibre ? '✅ Bilan équilibré' : '⚠️ Bilan déséquilibré'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACTIF */}
        <div className="bg-white rounded-xl border">
          <div className="px-4 py-3 bg-orange-50 border-b font-bold text-orange-800">ACTIF</div>
          <div className="p-4">
            <BilanSection title="Immobilisations (Classe 2)" items={data.actif?.immobilisations || []} color="blue" />
            <BilanSection title="Stocks (Classe 3)" items={data.actif?.stocks || []} color="violet" />
            <BilanSection title="Créances & Tiers (Classe 4)" items={data.actif?.creances || []} color="amber" />
            <BilanSection title="Trésorerie Active (Classe 5)" items={data.actif?.tresorerie || []} color="emerald" />
          </div>
          <div className="px-4 py-3 bg-orange-100 border-t font-bold text-right text-orange-900">
            Total Actif: {fmt(data.actif?.total || 0)} F
          </div>
        </div>

        {/* PASSIF */}
        <div className="bg-white rounded-xl border">
          <div className="px-4 py-3 bg-orange-50 border-b font-bold text-orange-800">PASSIF</div>
          <div className="p-4">
            <BilanSection title="Capitaux Propres (Classe 1)" items={data.passif?.capitaux_propres || []} color="orange" />
            <BilanSection title="Dettes (Classe 4)" items={data.passif?.dettes || []} color="red" />
            <BilanSection title="Trésorerie Passive (Classe 5)" items={data.passif?.tresorerie_passive || []} color="gray" />
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm font-bold">
                <span>Résultat de l'exercice</span>
                <span className={data.passif?.resultat_exercice >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {fmt(data.passif?.resultat_exercice || 0)} F
                </span>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 bg-orange-100 border-t font-bold text-right text-orange-900">
            Total Passif: {fmt(data.passif?.total || 0)} F
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// DÉCLARATIONS TVA
// ══════════════════════════════════════════════

const TVATab: React.FC<{ exercice: number }> = ({ exercice }) => {
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [periode, setPeriode] = useState(`${exercice}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/tva`, { headers: headers() })
      .then(r => r.json())
      .then(d => setDeclarations(d.data || []));
  }, [result]);

  const generer = async () => {
    setLoading(true);
    const res = await fetch(`${API}/tva/generer`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ periode })
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Déclarations TVA — 18% UEMOA</h2>

      {/* Générateur */}
      <div className="bg-white rounded-xl border p-4 flex items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
          <input type="month" value={periode} onChange={e => setPeriode(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
        </div>
        <button onClick={generer} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
          {loading ? 'Calcul...' : '📊 Générer déclaration'}
        </button>
      </div>

      {/* Résultat dernière génération */}
      {result && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Déclaration TVA — {result.periode}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500">CA HT</p>
              <p className="text-lg font-bold">{fmt(result.chiffre_affaires_ht)} F</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-gray-500">TVA Collectée</p>
              <p className="text-lg font-bold text-emerald-700">{fmt(result.tva_collectee)} F</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-gray-500">TVA Déductible</p>
              <p className="text-lg font-bold text-orange-700">{fmt(result.tva_deductible)} F</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-gray-500">Achats HT</p>
              <p className="text-lg font-bold text-orange-700">{fmt(result.achats_ht)} F</p>
            </div>
            <div className={`p-3 rounded-lg ${result.tva_nette >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className="text-gray-500">{result.tva_nette >= 0 ? 'TVA à payer' : 'Crédit de TVA'}</p>
              <p className={`text-lg font-bold ${result.tva_nette >= 0 ? 'text-red-700' : 'text-green-700'}`}>{fmt(Math.abs(result.tva_nette))} F</p>
            </div>
          </div>
        </div>
      )}

      {/* Historique */}
      {declarations.length > 0 && (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left">Période</th>
                <th className="px-3 py-3 text-right">CA HT</th>
                <th className="px-3 py-3 text-right">TVA Collectée</th>
                <th className="px-3 py-3 text-right">TVA Déductible</th>
                <th className="px-3 py-3 text-right">TVA Nette</th>
                <th className="px-3 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {declarations.map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{d.periode}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(parseFloat(d.chiffre_affaires_ht))}</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-600">{fmt(parseFloat(d.tva_collectee))}</td>
                  <td className="px-3 py-2 text-right font-mono text-orange-600">{fmt(parseFloat(d.tva_deductible))}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{fmt(parseFloat(d.tva_nette))}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      d.statut === 'payee' ? 'bg-green-100 text-green-700' :
                      d.statut === 'declaree' ? 'bg-orange-100 text-orange-700' :
                      d.statut === 'validee' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{d.statut}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════
// PLAN COMPTABLE
// ══════════════════════════════════════════════

const PlanComptableTab: React.FC = () => {
  const [comptes, setComptes] = useState<any[]>([]);
  const [classeFilter, setClasseFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = classeFilter ? `${API}/plan-comptable?classe=${classeFilter}` : `${API}/plan-comptable`;
    fetch(url, { headers: headers() })
      .then(r => r.json())
      .then(d => { setComptes(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [classeFilter]);

  const classes = [
    { id: null, label: 'Toutes' },
    { id: 1, label: '1 - Capitaux' },
    { id: 2, label: '2 - Immobilisations' },
    { id: 3, label: '3 - Stocks' },
    { id: 4, label: '4 - Tiers' },
    { id: 5, label: '5 - Finance' },
    { id: 6, label: '6 - Charges' },
    { id: 7, label: '7 - Produits' },
    { id: 8, label: '8 - Engagements' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Plan Comptable SYSCOHADA</h2>
        <span className="text-sm text-gray-500">{comptes.length} comptes</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {classes.map(c => (
          <button
            key={c.id ?? 'all'}
            onClick={() => setClasseFilter(c.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              classeFilter === c.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left">Code</th>
              <th className="px-3 py-3 text-left">Libellé</th>
              <th className="px-3 py-3 text-center">Classe</th>
              <th className="px-3 py-3 text-center">Type</th>
              <th className="px-3 py-3 text-center">Détail</th>
              <th className="px-3 py-3 text-left">Parent</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : comptes.map((c: any) => (
              <tr key={c.code} className={`hover:bg-gray-50 ${!c.is_detail ? 'bg-indigo-50/50 font-semibold' : ''}`}>
                <td className="px-3 py-2 font-mono font-bold text-indigo-700">{c.code}</td>
                <td className="px-3 py-2" style={{ paddingLeft: `${(c.code.length - 2) * 16 + 12}px` }}>{c.libelle}</td>
                <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{c.classe}</span></td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    c.type === 'actif' ? 'bg-orange-100 text-orange-700' :
                    c.type === 'passif' ? 'bg-orange-100 text-orange-700' :
                    c.type === 'charge' ? 'bg-red-100 text-red-700' :
                    c.type === 'produit' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{c.type}</span>
                </td>
                <td className="px-3 py-2 text-center">{c.is_detail ? '📝' : '📁'}</td>
                <td className="px-3 py-2 font-mono text-gray-400">{c.parent_code || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// COMPOSANTS UTILITAIRES
// ══════════════════════════════════════════════

const KPICard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-200/50',
    red: 'from-red-500 to-rose-600 shadow-red-200/50',
    blue: 'from-orange-500 to-indigo-600 shadow-orange-200/50',
    purple: 'from-purple-500 to-violet-600 shadow-purple-200/50',
    orange: 'from-orange-500 to-amber-600 shadow-orange-200/50',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.blue} rounded-xl p-5 text-white shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm opacity-80">{title}</span>
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/3" />
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
    </div>
    <div className="h-64 bg-gray-200 rounded-xl" />
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-12">
    <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
    <p className="text-gray-500">{message}</p>
    <p className="text-sm text-gray-400 mt-1">Cliquez sur "Comptabiliser" pour importer les données existantes</p>
  </div>
);

function formatDate(d: any): string {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default ComptabiliteOHADA;
