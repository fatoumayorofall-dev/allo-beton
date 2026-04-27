import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wallet, Building2, Smartphone, TrendingUp, RefreshCw,
  X, Edit2, Trash2, ChevronLeft, ChevronRight, Banknote,
  ArrowUpCircle, ArrowDownCircle, Package, Save,
  Upload, Download, Check, BarChart3, Filter, FolderKanban,
  Search, Calendar, Eye, EyeOff, Hash
} from 'lucide-react';
import api from '../../services/mysql-api';
import { ModuleAnalytics } from '../Analytics/ModuleAnalytics';

// ───────── Types ─────────
interface CashMovement {
  id: number;
  date: string;
  type: 'recette' | 'depense';
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  decaisseur: string;
  encaisseur: string;
  reference: string;
  project_id: number | null;
  project_name: string | null;
  project_code: string | null;
  created_at: string;
}

interface DailySummary {
  date: string;
  openingBalance: number;
  totalRecettes: number;
  totalDepenses: number;
  closingBalance: number;
  movements: CashMovement[];
  byCategory: Record<string, { recettes: number; depenses: number }>;
  byPaymentMethod: Record<string, { recettes: number; depenses: number }>;
}

interface ImportPreviewItem {
  type: 'recette' | 'depense';
  category: string;
  amount: number;
  payment_method: string;
  selected: boolean;
}

interface ProjectOption {
  id: number;
  name: string;
  code: string;
}

// ───────── Constants ─────────
const PAYMENT_SOURCES_RECETTE = [
  { value: 'banque', label: 'Banque', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'ventes_beton', label: 'Ventes Béton', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
];

const PAYMENT_SOURCES_DEPENSE = [
  { value: 'wave', label: 'Wave (Transfert)', icon: Smartphone, color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: 'especes', label: 'Espèces (Béton)', icon: Banknote, color: 'text-green-600', bg: 'bg-green-50' },
];

const ALL_PAYMENT_SOURCES = [
  { value: 'especes', label: 'Caisse', icon: Banknote, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'banque', label: 'Banque', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'ventes_beton', label: 'Ventes Béton', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  { value: 'wave', label: 'Wave', icon: Smartphone, color: 'text-orange-600', bg: 'bg-orange-50' },
];

// ───────── Helpers ─────────
const formatDateFR = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' F';

const getPaymentMethodInfo = (method: string) =>
  ALL_PAYMENT_SOURCES.find(m => m.value === method) || ALL_PAYMENT_SOURCES[0];

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════
const CashManagement: React.FC = () => {
  // ── State ──
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'recette' | 'depense'>('depense');
  const [editingMovement, setEditingMovement] = useState<CashMovement | null>(null);
  const [showCloseDay, setShowCloseDay] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'recette' | 'depense'>('all');
  const [filterProject, setFilterProject] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [showDetails, setShowDetails] = useState(true);

  const [formData, setFormData] = useState({
    libelle: '', amount: '', payment_method: 'especes',
    decaisseur: '', encaisseur: '', reference: '', project_id: ''
  });

  const [bankDeposit, setBankDeposit] = useState('');

  // ── Data loading ──
  const loadDailySummary = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/cash/daily-summary?date=${selectedDate}`);
      setSummary(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDailySummary(); }, [selectedDate]);
  useEffect(() => {
    api.get('/projects').then((data: any) => setProjects(data || [])).catch(() => {});
  }, []);

  // ── Filtered movements ──
  const filteredMovements = useMemo(() => {
    if (!summary?.movements) return [];
    return summary.movements.filter(m => {
      if (activeTab !== 'all' && m.type !== activeTab) return false;
      if (filterProject === 'none' && m.project_id) return false;
      if (filterProject && filterProject !== 'none' && String(m.project_id) !== filterProject) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const match = (m.description || '').toLowerCase().includes(q)
          || (m.category || '').toLowerCase().includes(q)
          || (m.decaisseur || '').toLowerCase().includes(q)
          || (m.encaisseur || '').toLowerCase().includes(q)
          || (m.project_name || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [summary?.movements, activeTab, filterProject, searchText]);

  // ── Summary by project ──
  const projectSummary = useMemo(() => {
    if (!summary?.movements) return [];
    const map: Record<string, { name: string; code: string; depenses: number; recettes: number; count: number }> = {};
    summary.movements.forEach(m => {
      const key = m.project_id ? String(m.project_id) : 'none';
      if (!map[key]) {
        map[key] = {
          name: m.project_name || 'Sans projet',
          code: m.project_code || '—',
          depenses: 0, recettes: 0, count: 0
        };
      }
      map[key].count++;
      if (m.type === 'depense') map[key].depenses += m.amount;
      else map[key].recettes += m.amount;
    });
    return Object.entries(map).sort((a, b) => (b[1].depenses + b[1].recettes) - (a[1].depenses + a[1].recettes));
  }, [summary?.movements]);

  // ── Date nav ──
  const changeDate = (days: number) => {
    const parts = selectedDate.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2] + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // ── Form handlers ──
  const resetForm = () => setFormData({
    libelle: '', amount: '', payment_method: 'especes',
    decaisseur: '', encaisseur: '', reference: '', project_id: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.libelle.trim() || !formData.amount) {
      alert('Veuillez remplir le libellé et le montant');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: selectedDate, type: formType,
        category: formData.libelle.trim(), description: formData.libelle.trim(),
        amount: parseFloat(formData.amount), payment_method: formData.payment_method,
        decaisseur: formData.decaisseur.trim() || null,
        encaisseur: formData.encaisseur.trim() || null,
        reference: formData.reference.trim() || null,
        project_id: formData.project_id ? parseInt(formData.project_id) : null
      };
      if (editingMovement) {
        await api.put(`/cash/movements/${editingMovement.id}`, payload);
      } else {
        await api.post('/cash/movements', payload);
      }
      setShowForm(false);
      setEditingMovement(null);
      resetForm();
      loadDailySummary();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce mouvement ?')) return;
    try {
      await api.delete(`/cash/movements/${id}`);
      loadDailySummary();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleCloseDay = async () => {
    if (!bankDeposit || parseFloat(bankDeposit) <= 0) {
      alert('Veuillez saisir un montant valide'); return;
    }
    setSaving(true);
    try {
      await api.post('/cash/close-day', {
        date: selectedDate, bank_deposit: parseFloat(bankDeposit), notes: 'Versement banque'
      });
      setShowCloseDay(false);
      setBankDeposit('');
      loadDailySummary();
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setSaving(false);
    }
  };

  const openAddForm = (type: 'recette' | 'depense') => {
    setFormType(type);
    setEditingMovement(null);
    setFormData({
      libelle: '', amount: '',
      payment_method: type === 'recette' ? 'banque' : 'wave',
      decaisseur: '', encaisseur: '', reference: '', project_id: ''
    });
    setShowForm(true);
  };

  const openEditForm = (movement: CashMovement) => {
    setFormType(movement.type);
    setEditingMovement(movement);
    setFormData({
      libelle: movement.description || movement.category,
      amount: movement.amount.toString(),
      payment_method: movement.payment_method,
      decaisseur: movement.decaisseur || '',
      encaisseur: movement.encaisseur || '',
      reference: movement.reference || '',
      project_id: movement.project_id ? movement.project_id.toString() : ''
    });
    setShowForm(true);
  };

  // ── Excel Import ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      let headerIndex = -1, recCol = -1, depCol = -1, libCol = -1;
      for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < (rows[i]?.length || 0); j++) {
          const cell = String(rows[i][j] || '').toUpperCase().trim();
          if (cell === 'RECETTES') { headerIndex = i; recCol = j; }
          if (cell === 'DEPENSES') depCol = j;
          if (cell === 'LIBELLES') libCol = j;
        }
        if (headerIndex !== -1) break;
      }
      if (headerIndex === -1 || recCol === -1 || depCol === -1 || libCol === -1) {
        alert('Format non reconnu. Colonnes requises: RECETTES | DEPENSES | LIBELLES');
        return;
      }
      const parseNum = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val.replace(/\s/g, '')) || 0;
        return 0;
      };
      const preview: ImportPreviewItem[] = [];
      for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const rec = parseNum(row[recCol]);
        const dep = parseNum(row[depCol]);
        const lib = String(row[libCol] || '').trim();
        if (rec > 0 && dep > 0 && !lib) continue;
        if (!lib || lib.toUpperCase().startsWith('SOLDE')) continue;
        if (rec === 0 && dep === 0) continue;
        if (rec > 0) preview.push({ type: 'recette', category: lib, amount: rec, payment_method: lib.toUpperCase().includes('BANQUE') ? 'banque' : 'ventes_beton', selected: true });
        if (dep > 0) preview.push({ type: 'depense', category: lib, amount: dep, payment_method: 'especes', selected: true });
      }
      if (preview.length === 0) { alert('Aucun mouvement trouvé'); return; }
      setImportPreview(preview);
      setShowImport(true);
    } catch (error) {
      console.error('Erreur import Excel:', error);
      alert('Erreur lors de la lecture du fichier');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = async () => {
    const selected = importPreview.filter(item => item.selected);
    if (selected.length === 0) { alert('Aucun mouvement sélectionné'); return; }
    setSaving(true);
    try {
      const movements = selected.map(item => ({
        date: selectedDate, type: item.type, category: item.category,
        description: item.category, amount: item.amount, payment_method: item.payment_method
      }));
      await api.post('/cash/import', { date: selectedDate, movements });
      setShowImport(false);
      setImportPreview([]);
      loadDailySummary();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'importation');
    } finally {
      setSaving(false);
    }
  };

  // ── PDF Export ──
  const exportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
    const dateStr = formatDateFR(selectedDate);
    const openBal = summary?.openingBalance || 0;
    const movements = summary?.movements || [];
    const totalRec = summary?.totalRecettes || 0;
    const totalDep = summary?.totalDepenses || 0;

    let bodyRows = `<tr>
      <td style="text-align:right;padding:5px 8px;border:1px solid #999">${fmt(openBal)}</td>
      <td style="padding:5px 8px;border:1px solid #999"></td>
      <td style="padding:5px 8px;border:1px solid #999">FOND DE CAISSE ANTERIEUR</td>
      <td style="padding:5px 8px;border:1px solid #999"></td>
    </tr>`;

    movements.forEach(m => {
      const isRec = m.type === 'recette';
      let label = m.description || m.category;
      if (m.decaisseur) label += ` | Déc: ${m.decaisseur}`;
      if (m.encaisseur) label += ` | Enc: ${m.encaisseur}`;
      bodyRows += `<tr>
        <td style="text-align:right;padding:5px 8px;border:1px solid #999">${isRec ? fmt(m.amount) : ''}</td>
        <td style="text-align:right;padding:5px 8px;border:1px solid #999">${!isRec ? fmt(m.amount) : ''}</td>
        <td style="padding:5px 8px;border:1px solid #999">${label}</td>
        <td style="padding:5px 8px;border:1px solid #999;font-size:10px">${m.project_code || ''}</td>
      </tr>`;
    });

    const shownTotalRec = openBal + totalRec;
    bodyRows += `<tr>
      <td style="text-align:right;padding:5px 8px;border:1px solid #999;font-weight:bold">${fmt(shownTotalRec)}</td>
      <td style="text-align:right;padding:5px 8px;border:1px solid #999;font-weight:bold">${fmt(totalDep)}</td>
      <td style="padding:5px 8px;border:1px solid #999" colspan="2"></td>
    </tr>`;
    const solde = shownTotalRec - totalDep;
    bodyRows += `<tr>
      <td style="padding:5px 8px;border:1px solid #999;color:red;font-weight:bold" colspan="2">Solde ${dateStr}</td>
      <td style="text-align:right;padding:5px 8px;border:1px solid #999;color:red;font-weight:bold" colspan="2">${fmt(solde)}</td>
    </tr>`;

    const html = `<div style="font-family:Arial,sans-serif;font-size:12px">
      <div style="text-align:center;margin-bottom:14px">
        <h3 style="margin:0 0 4px 0;font-size:16px">Allo Béton</h3>
        <p style="margin:0;color:#666;font-size:11px">État Journalier de Caisse — ${dateStr}</p>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#e8e8e8">
          <th style="text-align:right;padding:6px 8px;border:1px solid #999;width:18%">RECETTES</th>
          <th style="text-align:right;padding:6px 8px;border:1px solid #999;width:18%">DEPENSES</th>
          <th style="padding:6px 8px;border:1px solid #999;width:50%">LIBELLES</th>
          <th style="padding:6px 8px;border:1px solid #999;width:14%">PROJET</th>
        </tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;

    const container = document.createElement('div');
    container.innerHTML = html;
    html2pdf().set({
      margin: [15, 15, 15, 15],
      filename: `etat-caisse-${selectedDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(container).save();
  };

  // ── Derived data ──
  const paymentSources = formType === 'recette' ? PAYMENT_SOURCES_RECETTE : PAYMENT_SOURCES_DEPENSE;
  const entrees = summary?.totalRecettes || 0;
  const sorties = summary?.totalDepenses || 0;
  const soldeOuverture = summary?.openingBalance || 0;
  const soldeCloture = summary?.closingBalance || 0;
  const nbMovements = summary?.movements?.length || 0;
  const nbEntrees = summary?.movements?.filter(m => m.type === 'recette').length || 0;
  const nbSorties = summary?.movements?.filter(m => m.type === 'depense').length || 0;

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════
  return (
    <div className="p-4 lg:p-6 space-y-5 bg-gray-50 min-h-screen">

      {/* ━━━ HEADER ━━━ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:p-5 relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 absolute top-0 left-0" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200/40">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Gestion de Caisse</h1>
              <p className="text-xs text-gray-400">Suivi journalier des flux financiers</p>
            </div>
          </div>

          {/* Date nav */}
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl border border-gray-200 p-1">
            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-lg transition-all">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div className="flex items-center gap-1.5 px-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm font-medium border-0 bg-transparent focus:ring-0 text-gray-700 w-[130px]" />
            </div>
            <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-lg transition-all">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
              Aujourd'hui
            </button>
          </div>

          {/* Actions rapides */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => openAddForm('recette')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-xs font-semibold shadow-sm transition-all">
              <ArrowUpCircle className="w-3.5 h-3.5" /> Entrée
            </button>
            <button onClick={() => openAddForm('depense')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-xs font-semibold shadow-sm transition-all">
              <ArrowDownCircle className="w-3.5 h-3.5" /> Dépense
            </button>
            <button onClick={() => setShowCloseDay(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-xs font-semibold shadow-sm transition-all">
              <Building2 className="w-3.5 h-3.5" /> Banque
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-xs font-medium text-gray-600 transition-all">
              <Upload className="w-3.5 h-3.5" /> Import
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-xs font-medium text-gray-600 transition-all">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                showAnalytics ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              <BarChart3 className="w-3.5 h-3.5" /> Stats
            </button>
            <button onClick={loadDailySummary}
              className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-400 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          </div>
        </div>
      </div>

      {showAnalytics ? (
        <ModuleAnalytics module="cash" />
      ) : (
      <>
      {/* ━━━ KPI CARDS ━━━ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Solde ouverture', value: soldeOuverture, prefix: '', color: 'gray', icon: Wallet },
          { label: 'Entrées du jour', value: entrees, prefix: '+', color: 'emerald', icon: ArrowUpCircle, count: nbEntrees },
          { label: 'Sorties du jour', value: sorties, prefix: '-', color: 'red', icon: ArrowDownCircle, count: nbSorties },
          { label: 'Solde de caisse', value: soldeCloture, prefix: '', color: soldeCloture >= 0 ? 'blue' : 'red', icon: Banknote },
          { label: 'Marge du jour', value: entrees - sorties, prefix: entrees - sorties >= 0 ? '+' : '', color: entrees - sorties >= 0 ? 'emerald' : 'red', icon: TrendingUp },
        ].map((k, i) => {
          const Icon = k.icon;
          const colors: Record<string, { fill: string; border: string; iconBg: string; iconClr: string; valClr: string }> = {
            gray: { fill: 'from-gray-50 to-slate-50', border: 'border-l-gray-400', iconBg: 'bg-gray-100', iconClr: 'text-gray-600', valClr: 'text-gray-900' },
            emerald: { fill: 'from-emerald-50 to-green-50', border: 'border-l-emerald-400', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', valClr: 'text-emerald-700' },
            red: { fill: 'from-red-50 to-rose-50', border: 'border-l-red-400', iconBg: 'bg-red-100', iconClr: 'text-red-600', valClr: 'text-red-700' },
            blue: { fill: 'from-orange-50 to-indigo-50', border: 'border-l-orange-400', iconBg: 'bg-orange-100', iconClr: 'text-orange-600', valClr: 'text-orange-700' },
          };
          const c = colors[k.color] || colors.gray;
          return (
            <div key={i} className={`rounded-xl bg-gradient-to-br ${c.fill} border-l-4 ${c.border} border border-gray-200/40 p-3.5 shadow-sm hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className={`w-8 h-8 ${c.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${c.iconClr}`} />
                </div>
                {'count' in k && k.count !== undefined && (
                  <span className="text-[10px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded-md">{k.count}</span>
                )}
              </div>
              <p className={`text-lg font-bold ${c.valClr} leading-tight`}>{k.prefix}{formatCurrency(k.value)}</p>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mt-0.5">{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* ━━━ VENTILATION: Sources + Projets ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sources */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5" /> Ventilation sorties
          </h3>
          <div className="space-y-2">
            {Object.entries(summary?.byPaymentMethod || {}).map(([method, values]) => {
              const info = getPaymentMethodInfo(method);
              const Icon = info.icon;
              const total = values.depenses + values.recettes;
              if (total === 0) return null;
              return (
                <div key={method} className={`flex items-center justify-between py-2.5 px-3 rounded-xl ${info.bg} border border-gray-100/50`}>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${info.color}`}>
                    <Icon className="w-3.5 h-3.5" /> {info.label}
                  </span>
                  <div className="flex gap-3 text-xs font-bold">
                    {values.recettes > 0 && <span className="text-green-600">+{formatCurrency(values.recettes)}</span>}
                    {values.depenses > 0 && <span className="text-red-600">-{formatCurrency(values.depenses)}</span>}
                  </div>
                </div>
              );
            })}
            {!summary?.byPaymentMethod || Object.keys(summary.byPaymentMethod).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">Aucune donnée</p>
            ) : null}
          </div>
        </div>

        {/* Projets */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FolderKanban className="w-3.5 h-3.5" /> Répartition par projet / chantier
          </h3>
          {projectSummary.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {projectSummary.map(([key, data]) => (
                <div key={key}
                  onClick={() => setFilterProject(filterProject === key ? '' : key)}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-xl border cursor-pointer transition-all ${
                    filterProject === key ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-200' : 'bg-gray-50 border-gray-100 hover:border-orange-200'
                  }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      key === 'none' ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {data.code}
                    </span>
                    <span className="text-xs font-medium text-gray-700 truncate">{data.name}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{data.count}</span>
                  </div>
                  <div className="flex gap-2 text-[11px] font-bold shrink-0 ml-2">
                    {data.recettes > 0 && <span className="text-green-600">+{formatCurrency(data.recettes)}</span>}
                    {data.depenses > 0 && <span className="text-red-600">-{formatCurrency(data.depenses)}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-6">Aucun mouvement aujourd'hui</p>
          )}
        </div>
      </div>

      {/* ━━━ FILTER BAR + TABS ━━━ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            {[
              { key: 'all' as const, label: 'Tous', count: nbMovements },
              { key: 'recette' as const, label: 'Entrées', count: nbEntrees },
              { key: 'depense' as const, label: 'Sorties', count: nbSorties },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  activeTab === tab.key ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400" />
          </div>

          {/* Filter project */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-emerald-400">
              <option value="">Tous projets</option>
              <option value="none">Sans projet</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>

          {/* Toggle details */}
          <button onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 ml-auto">
            {showDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showDetails ? 'Compact' : 'Détails'}
          </button>
        </div>
      </div>

      {/* ━━━ MOVEMENTS TABLE ━━━ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 text-gray-400" />
            Mouvements — {formatDateFR(selectedDate)}
          </h2>
          <div className="flex items-center gap-2">
            {filterProject && (
              <button onClick={() => setFilterProject('')}
                className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-lg font-medium flex items-center gap-1">
                <X className="w-3 h-3" /> Filtre projet
              </button>
            )}
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
              {filteredMovements.length}/{nbMovements}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 border-b border-gray-100">
              <tr>
                <th className="text-left p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Type</th>
                <th className="text-left p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Libellé</th>
                {showDetails && (
                  <th className="text-left p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Déc. / Enc.</th>
                )}
                <th className="text-left p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">Source</th>
                <th className="text-left p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-28">Projet</th>
                <th className="text-right p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-32">Montant</th>
                <th className="text-center p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMovements.length > 0 ? (
                filteredMovements.map((m) => {
                  const src = getPaymentMethodInfo(m.payment_method);
                  const SrcIcon = src.icon;
                  return (
                    <tr key={m.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          m.type === 'recette' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {m.type === 'recette' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                          {m.type === 'recette' ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-gray-800 text-xs">{m.description || m.category}</p>
                        {showDetails && m.reference && (
                          <p className="text-[10px] text-gray-400 mt-0.5">Réf: {m.reference}</p>
                        )}
                      </td>
                      {showDetails && (
                        <td className="p-3 text-[11px]">
                          {m.decaisseur && <span className="text-red-500">↑ {m.decaisseur}</span>}
                          {m.decaisseur && m.encaisseur && <span className="text-gray-300 mx-1">·</span>}
                          {m.encaisseur && <span className="text-green-600">↓ {m.encaisseur}</span>}
                        </td>
                      )}
                      <td className="p-3">
                        <span className={`flex items-center gap-1 text-[11px] font-medium ${src.color}`}>
                          <SrcIcon className="w-3 h-3" /> {src.label}
                        </span>
                      </td>
                      <td className="p-3">
                        {m.project_code ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            <FolderKanban className="w-2.5 h-2.5" /> {m.project_code}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-sm font-bold ${m.type === 'recette' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.type === 'recette' ? '+' : '-'}{formatCurrency(m.amount)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditForm(m)} className="p-1 hover:bg-orange-50 rounded-lg text-orange-500">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(m.id)} className="p-1 hover:bg-red-50 rounded-lg text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={showDetails ? 7 : 6} className="p-10 text-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">Aucun mouvement</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activeTab !== 'all' || filterProject || searchText
                        ? 'Essayez de modifier les filtres'
                        : 'Ajoutez une entrée ou une dépense'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer totals */}
        {filteredMovements.length > 0 && (
          <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-gray-500 font-medium">{filteredMovements.length} mouvement(s) affiché(s)</span>
            <div className="flex items-center gap-4">
              <span className="font-bold text-emerald-600">
                + {formatCurrency(filteredMovements.filter(m => m.type === 'recette').reduce((s, m) => s + m.amount, 0))}
              </span>
              <span className="font-bold text-red-600">
                - {formatCurrency(filteredMovements.filter(m => m.type === 'depense').reduce((s, m) => s + m.amount, 0))}
              </span>
              <span className="font-bold text-gray-800 bg-gray-200 px-2 py-0.5 rounded-md">
                = {formatCurrency(
                  filteredMovements.reduce((s, m) => s + (m.type === 'recette' ? m.amount : -m.amount), 0)
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ━━━ Par catégorie ━━━ */}
      {summary && (entrees > 0 || sorties > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Package className="w-3.5 h-3.5" /> Ventilation par catégorie
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(summary.byCategory || {}).map(([category, values]) => (
              <div key={category} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl text-xs border border-gray-100/50">
                <span className="text-gray-700 font-medium truncate mr-2">{category}</span>
                <div className="flex gap-2 shrink-0">
                  {values.recettes > 0 && <span className="text-emerald-600 font-bold">+{formatCurrency(values.recettes)}</span>}
                  {values.depenses > 0 && <span className="text-red-600 font-bold">-{formatCurrency(values.depenses)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ MODALS ══════ */}

      {/* MODAL: Add / Edit */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className={`px-5 py-4 flex items-center justify-between ${
              formType === 'recette' ? 'bg-gradient-to-r from-emerald-600 to-green-600' : 'bg-gradient-to-r from-red-600 to-rose-600'
            } text-white`}>
              <div className="flex items-center gap-2">
                {formType === 'recette' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                <h3 className="font-bold text-base">
                  {editingMovement ? 'Modifier le mouvement' : formType === 'recette' ? 'Nouvelle Entrée' : 'Nouvelle Dépense'}
                </h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Libellé *</label>
                <input type="text" value={formData.libelle}
                  onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm"
                  placeholder="Ex: Achat ciment, Carburant..." autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Montant (FCFA) *</label>
                  <input type="number" value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-base font-bold"
                    placeholder="0" min="0" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                    {formType === 'recette' ? 'Source' : 'Mode'}
                  </label>
                  <select value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm">
                    {paymentSources.map(source => (
                      <option key={source.value} value={source.value}>{source.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.payment_method === 'wave' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Réf. Wave</label>
                  <input type="text" value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 text-sm"
                    placeholder="N° transfert" />
                </div>
              )}

              {projects.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-orange-500" /> Projet / Chantier
                  </label>
                  <select value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm">
                    <option value="">— Aucun projet —</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Décaisseur</label>
                  <input type="text" value={formData.decaisseur}
                    onChange={(e) => setFormData({ ...formData, decaisseur: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 text-sm"
                    placeholder="Nom" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Encaisseur</label>
                  <input type="text" value={formData.encaisseur}
                    onChange={(e) => setFormData({ ...formData, encaisseur: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 text-sm"
                    placeholder="Nom" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-semibold text-sm">
                  Annuler
                </button>
                <button type="submit" disabled={saving || !formData.libelle.trim() || !formData.amount}
                  className={`flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm ${
                    formType === 'recette' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}>
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Versement Banque */}
      {showCloseDay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><Building2 className="w-5 h-5" /> Versement Banque</h3>
              <button onClick={() => setShowCloseDay(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-orange-50 rounded-xl p-3.5 border border-orange-200">
                <p className="text-xs text-orange-600 font-semibold uppercase">Solde disponible</p>
                <p className="text-2xl font-bold text-orange-800 mt-1">{formatCurrency(soldeCloture)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Montant à verser</label>
                <input type="number" value={bankDeposit}
                  onChange={(e) => setBankDeposit(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 text-lg font-bold"
                  placeholder="0" />
                <button type="button"
                  onClick={() => setBankDeposit(soldeCloture.toString())}
                  className="mt-1.5 text-xs text-purple-600 hover:underline font-medium">
                  → Verser tout le solde
                </button>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCloseDay(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-semibold text-sm">
                  Annuler
                </button>
                <button onClick={handleCloseDay} disabled={saving || !bankDeposit}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Import Excel */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-orange-600 to-indigo-600 text-white flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><Upload className="w-5 h-5" /> Aperçu Import Excel</h3>
              <button onClick={() => { setShowImport(false); setImportPreview([]); }} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <p className="text-xs text-gray-500 mb-3">
                Mouvements à importer pour le <strong>{formatDateFR(selectedDate)}</strong>
              </p>
              <div className="space-y-1.5">
                {importPreview.map((item, index) => (
                  <div key={index} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                    item.selected ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}>
                    <input type="checkbox" checked={item.selected}
                      onChange={(e) => {
                        const updated = [...importPreview];
                        updated[index].selected = e.target.checked;
                        setImportPreview(updated);
                      }}
                      className="w-4 h-4 text-orange-600 rounded" />
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      item.type === 'recette' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>{item.type === 'recette' ? 'IN' : 'OUT'}</span>
                    <span className="flex-1 text-xs text-gray-700 truncate">{item.category}</span>
                    <span className={`font-bold text-xs whitespace-nowrap ${
                      item.type === 'recette' ? 'text-emerald-600' : 'text-red-600'
                    }`}>{item.type === 'recette' ? '+' : '-'}{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between text-xs">
                <span className="text-gray-500">{importPreview.filter(i => i.selected).length} sélectionné(s)</span>
                <span className="font-bold text-gray-700">
                  Solde: {formatCurrency(importPreview.filter(i => i.selected).reduce((s, i) => s + (i.type === 'recette' ? i.amount : -i.amount), 0))}
                </span>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button onClick={() => { setShowImport(false); setImportPreview([]); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-semibold text-sm">
                Annuler
              </button>
              <button onClick={confirmImport}
                disabled={saving || importPreview.filter(i => i.selected).length === 0}
                className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                {saving ? 'Import...' : `Importer (${importPreview.filter(i => i.selected).length})`}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default CashManagement;
