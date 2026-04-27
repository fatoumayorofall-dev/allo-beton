import React, { useState, useEffect } from 'react';
import {
  Plus, FolderKanban, Search, Edit2, Trash2, X, Save,
  ArrowUpCircle, ArrowDownCircle, MapPin, Phone, Users,
  Calendar, TrendingUp, Wallet, ExternalLink, ChevronLeft,
  RefreshCw, Building2, Banknote, MessageCircle, Eye,
  PauseCircle, CheckCircle2, XCircle, Filter
} from 'lucide-react';
import api from '../../services/mysql-api';

interface Project {
  id: number;
  name: string;
  code: string;
  description: string;
  client: string;
  location: string;
  status: 'actif' | 'en_pause' | 'termine' | 'annule';
  whatsapp_group: string;
  budget_prevu: number;
  date_debut: string;
  date_fin_prevue: string;
  date_fin_reelle: string;
  responsable: string;
  notes: string;
  total_depenses: number;
  total_recettes: number;
  nb_mouvements: number;
  created_at: string;
}

interface ProjectDetail extends Project {
  movements: any[];
  totals: { total_depenses: number; total_recettes: number; nb_mouvements: number };
  byCategory: Record<string, { total: number; count: number }>;
  byMonth: any[];
}

interface ProjectStats {
  total_projets: number;
  actifs: number;
  termines: number;
  budget_total: number;
  depenses_total: number;
  recettes_total: number;
}

const STATUS_CONFIG = {
  actif: { label: 'Actif', icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  en_pause: { label: 'En pause', icon: PauseCircle, color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
  termine: { label: 'Terminé', icon: CheckCircle2, color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-200' },
  annule: { label: 'Annulé', icon: XCircle, color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' F';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '', code: '', description: '', client: '', location: '',
    status: 'actif', whatsapp_group: '', budget_prevu: '',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin_prevue: '', responsable: '', notes: ''
  });

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.get('/projects');
      setProjects(data);
    } catch (error) {
      console.error('Erreur chargement projets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.get('/projects/stats/summary');
      setStats(data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const loadProjectDetail = async (id: number) => {
    try {
      const data = await api.get(`/projects/${id}`);
      setSelectedProject(data);
    } catch (error) {
      console.error('Erreur détail projet:', error);
    }
  };

  useEffect(() => {
    loadProjects();
    loadStats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Le nom et le code du projet sont obligatoires');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        budget_prevu: formData.budget_prevu ? parseFloat(formData.budget_prevu) : 0
      };
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, payload);
      } else {
        await api.post('/projects', payload);
      }
      setShowForm(false);
      setEditingProject(null);
      resetForm();
      loadProjects();
      loadStats();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce projet ? Les mouvements de caisse associés seront détachés mais conservés.')) return;
    try {
      await api.delete(`/projects/${id}`);
      loadProjects();
      loadStats();
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', code: '', description: '', client: '', location: '',
      status: 'actif', whatsapp_group: '', budget_prevu: '',
      date_debut: new Date().toISOString().split('T')[0],
      date_fin_prevue: '', responsable: '', notes: ''
    });
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      client: project.client || '',
      location: project.location || '',
      status: project.status,
      whatsapp_group: project.whatsapp_group || '',
      budget_prevu: project.budget_prevu ? project.budget_prevu.toString() : '',
      date_debut: project.date_debut ? project.date_debut.split('T')[0] : '',
      date_fin_prevue: project.date_fin_prevue ? project.date_fin_prevue.split('T')[0] : '',
      responsable: project.responsable || '',
      notes: project.notes || ''
    });
    setShowForm(true);
  };

  const openWhatsApp = (group: string) => {
    if (!group) return;
    const url = group.startsWith('http') ? group : `https://chat.whatsapp.com/${group}`;
    window.open(url, '_blank');
  };

  const filtered = projects.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.client || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.location || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ================ DETAIL VIEW ================
  if (selectedProject) {
    const proj = selectedProject;
    const statusCfg = STATUS_CONFIG[proj.status] || STATUS_CONFIG.actif;
    const StatusIcon = statusCfg.icon;
    const budgetUsed = proj.budget_prevu > 0
      ? Math.min(100, ((proj.totals?.total_depenses || 0) / proj.budget_prevu) * 100)
      : 0;

    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Back btn + header */}
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5 relative overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 absolute top-0 left-0" />
          <button onClick={() => setSelectedProject(null)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
            <ChevronLeft className="w-4 h-4" /> Retour aux projets
          </button>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200/40">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">{proj.name}</h1>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                    <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-3">
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{proj.code}</span>
                  {proj.client && <span>Client: {proj.client}</span>}
                  {proj.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{proj.location}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {proj.whatsapp_group && (
                <button
                  onClick={() => openWhatsApp(proj.whatsapp_group)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 text-sm font-medium shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp Groupe
                </button>
              )}
              <button onClick={() => openEdit(proj)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-600">
                <Edit2 className="w-4 h-4" /> Modifier
              </button>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Budget prévu', value: formatCurrency(proj.budget_prevu || 0), fill: 'bg-gradient-to-br from-orange-50/70 to-indigo-50/40', border: 'border-l-orange-400', iconBg: 'bg-orange-100', iconClr: 'text-orange-600', valClr: 'text-orange-700', icon: Wallet },
            { label: 'Dépenses', value: formatCurrency(proj.totals?.total_depenses || 0), fill: 'bg-gradient-to-br from-red-50/70 to-rose-50/40', border: 'border-l-red-400', iconBg: 'bg-red-100', iconClr: 'text-red-600', valClr: 'text-red-700', icon: ArrowDownCircle },
            { label: 'Recettes', value: formatCurrency(proj.totals?.total_recettes || 0), fill: 'bg-gradient-to-br from-emerald-50/70 to-green-50/40', border: 'border-l-emerald-400', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', valClr: 'text-emerald-700', icon: ArrowUpCircle },
            { label: 'Mouvements', value: `${proj.totals?.nb_mouvements || 0}`, fill: 'bg-gradient-to-br from-purple-50/70 to-violet-50/40', border: 'border-l-purple-400', iconBg: 'bg-purple-100', iconClr: 'text-purple-600', valClr: 'text-purple-700', icon: TrendingUp },
          ].map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={i} className={`rounded-xl ${k.fill} border-l-4 ${k.border} border border-gray-200/40 p-4 shadow-sm`}>
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-10 h-10 ${k.iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${k.iconClr}`} />
                  </div>
                </div>
                <p className={`text-xl font-bold ${k.valClr} leading-tight`}>{k.value}</p>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1">{k.label}</p>
              </div>
            );
          })}
        </div>

        {/* Budget progress bar */}
        {proj.budget_prevu > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Consommation du budget</h3>
              <span className="text-sm font-bold text-gray-900">{budgetUsed.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetUsed}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Dépensé: {formatCurrency(proj.totals?.total_depenses || 0)}</span>
              <span>Budget: {formatCurrency(proj.budget_prevu)}</span>
            </div>
          </div>
        )}

        {/* Info project */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Details */}
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Informations du projet</h3>
            <div className="space-y-2.5 text-sm">
              {proj.responsable && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" /> Responsable: <span className="font-medium text-gray-800">{proj.responsable}</span>
                </div>
              )}
              {proj.date_debut && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" /> Début: <span className="font-medium text-gray-800">{formatDate(proj.date_debut)}</span>
                </div>
              )}
              {proj.date_fin_prevue && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" /> Fin prévue: <span className="font-medium text-gray-800">{formatDate(proj.date_fin_prevue)}</span>
                </div>
              )}
              {proj.description && (
                <div className="mt-3 text-gray-600">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
                  <p>{proj.description}</p>
                </div>
              )}
              {proj.notes && (
                <div className="mt-3 text-gray-600">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                  <p>{proj.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* By Category */}
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Dépenses par catégorie</h3>
            {proj.byCategory && Object.keys(proj.byCategory).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(proj.byCategory)
                  .sort(([, a], [, b]) => b.total - a.total)
                  .map(([cat, val]) => (
                    <div key={cat} className="flex justify-between py-2 px-3 bg-gray-50 rounded-xl text-sm border border-gray-100/50">
                      <span className="text-gray-700 font-medium">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{val.count}x</span>
                        <span className="font-bold text-gray-800">{formatCurrency(val.total)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Aucun mouvement</p>
            )}
          </div>
        </div>

        {/* By Month */}
        {proj.byMonth && proj.byMonth.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Évolution mensuelle</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Mois</th>
                    <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Dépenses</th>
                    <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Recettes</th>
                    <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Solde</th>
                    <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Mouvements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proj.byMonth.map((m: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-700">{m.mois}</td>
                      <td className="p-3 text-right text-red-600 font-medium">{formatCurrency(m.depenses)}</td>
                      <td className="p-3 text-right text-emerald-600 font-medium">{formatCurrency(m.recettes)}</td>
                      <td className={`p-3 text-right font-bold ${m.recettes - m.depenses >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(m.recettes - m.depenses)}
                      </td>
                      <td className="p-3 text-right text-gray-500">{m.nb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent movements */}
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-br from-gray-50/50 to-slate-50/30 border-b border-gray-100/80 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800 text-sm">Derniers mouvements</h2>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
              {proj.movements?.length || 0} opération(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Libellé</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Source</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proj.movements && proj.movements.length > 0 ? (
                  proj.movements.slice(0, 50).map((m: any) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-500 text-xs">{formatDate(m.date)}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-medium ${
                          m.type === 'recette' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {m.type === 'recette' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                          {m.type === 'recette' ? 'Entrée' : 'Sortie'}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-gray-800">{m.description || m.category}</td>
                      <td className="p-3 text-xs text-gray-500">{m.payment_method}</td>
                      <td className="p-3 text-right">
                        <span className={`font-bold ${m.type === 'recette' ? 'text-green-600' : 'text-red-600'}`}>
                          {m.type === 'recette' ? '+' : '-'}{formatCurrency(parseFloat(m.amount))}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-gray-400">Aucun mouvement lié à ce projet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ================ LIST VIEW ================
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(249,115,22,0.08)] p-5 overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 absolute top-0 left-0" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200/40">
              <FolderKanban className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Projets & Chantiers</h1>
              <p className="text-sm text-gray-400 mt-0.5">Gestion des projets avec suivi des dépenses et approvisionnements</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { resetForm(); setEditingProject(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 text-sm font-semibold shadow-md shadow-orange-200/30 transition-all"
            >
              <Plus className="w-4 h-4" /> Nouveau Projet
            </button>
            <button onClick={() => { loadProjects(); loadStats(); }} className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200/80 rounded-xl text-gray-500 hover:bg-gray-50 transition-all shadow-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI global */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Projets actifs', value: `${stats.actifs} / ${stats.total_projets}`, fill: 'bg-gradient-to-br from-emerald-50/70 to-green-50/40', border: 'border-l-emerald-400', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', valClr: 'text-emerald-700', icon: FolderKanban },
            { label: 'Budget total', value: formatCurrency(stats.budget_total || 0), fill: 'bg-gradient-to-br from-orange-50/70 to-indigo-50/40', border: 'border-l-orange-400', iconBg: 'bg-orange-100', iconClr: 'text-orange-600', valClr: 'text-orange-700', icon: Wallet },
            { label: 'Total dépenses', value: formatCurrency(stats.depenses_total || 0), fill: 'bg-gradient-to-br from-red-50/70 to-rose-50/40', border: 'border-l-red-400', iconBg: 'bg-red-100', iconClr: 'text-red-600', valClr: 'text-red-700', icon: ArrowDownCircle },
            { label: 'Total recettes', value: formatCurrency(stats.recettes_total || 0), fill: 'bg-gradient-to-br from-purple-50/70 to-violet-50/40', border: 'border-l-purple-400', iconBg: 'bg-purple-100', iconClr: 'text-purple-600', valClr: 'text-purple-700', icon: ArrowUpCircle },
          ].map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={i} className={`rounded-xl ${k.fill} border-l-4 ${k.border} border border-gray-200/40 p-4 shadow-sm`}>
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-10 h-10 ${k.iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${k.iconClr}`} />
                  </div>
                </div>
                <p className={`text-xl font-bold ${k.valClr} leading-tight`}>{k.value}</p>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-1">{k.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un projet, client, lieu..."
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="en_pause">En pause</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </select>
        </div>
      </div>

      {/* Projects grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((project) => {
          const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.actif;
          const StatusIcon = statusCfg.icon;
          const budgetPct = project.budget_prevu > 0
            ? Math.min(100, ((project.total_depenses || 0) / project.budget_prevu) * 100)
            : 0;

          return (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group"
              onClick={() => loadProjectDetail(project.id)}
            >
              {/* Color bar top */}
              <div className={`h-1 w-full bg-gradient-to-r ${
                project.status === 'actif' ? 'from-emerald-400 to-green-400' :
                project.status === 'en_pause' ? 'from-amber-400 to-yellow-400' :
                project.status === 'termine' ? 'from-orange-400 to-indigo-400' :
                'from-red-400 to-rose-400'
              }`} />

              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base truncate group-hover:text-orange-600 transition-colors">{project.name}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{project.code}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color} shrink-0 ml-2`}>
                    <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                  </span>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                  {project.client && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{project.client}</span>}
                  {project.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>}
                  {project.whatsapp_group && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openWhatsApp(project.whatsapp_group); }}
                      className="flex items-center gap-1 text-green-600 hover:text-green-700"
                    >
                      <MessageCircle className="w-3 h-3" />WhatsApp
                    </button>
                  )}
                </div>

                {/* Budget bar */}
                {project.budget_prevu > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Budget: {formatCurrency(project.budget_prevu)}</span>
                      <span>{budgetPct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Financial summary */}
                <div className="flex items-center gap-4 pt-3 border-t border-gray-100 text-xs">
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <ArrowDownCircle className="w-3 h-3" /> {formatCurrency(project.total_depenses || 0)}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <ArrowUpCircle className="w-3 h-3" /> {formatCurrency(project.total_recettes || 0)}
                  </span>
                  <span className="text-gray-400 ml-auto">{project.nb_mouvements || 0} mvts</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-gray-100 px-4 py-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); openEdit(project); }} className="p-1.5 hover:bg-orange-50 rounded-lg text-orange-500">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mb-3">
              <FolderKanban className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-sm font-medium text-gray-500">Aucun projet trouvé</p>
            <p className="text-xs text-gray-400 mt-1">Créez un nouveau projet pour commencer</p>
          </div>
        )}
      </div>

      {/* ============ MODAL: Add / Edit Project ============ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-t-2xl flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {editingProject ? '✏️ Modifier le projet' : '🏗️ Nouveau Projet'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingProject(null); }} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Name & Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du projet *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Ex: Chantier Diamniadio"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code projet *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono"
                    placeholder="PROJ-001"
                  />
                </div>
              </div>

              {/* Client & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <input
                    type="text"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Nom du client"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Dakar, Thiès..."
                  />
                </div>
              </div>

              {/* Responsable & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                  <input
                    type="text"
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Chef de chantier"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="actif">Actif</option>
                    <option value="en_pause">En pause</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </select>
                </div>
              </div>

              {/* WhatsApp Group */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4 text-green-500" /> Lien groupe WhatsApp</span>
                </label>
                <input
                  type="text"
                  value={formData.whatsapp_group}
                  onChange={(e) => setFormData({ ...formData, whatsapp_group: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="https://chat.whatsapp.com/..."
                />
                <p className="text-xs text-gray-400 mt-1">Lien d'invitation du groupe WhatsApp dédié au projet</p>
              </div>

              {/* Budget & Dates */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget prévu (F)</label>
                  <input
                    type="number"
                    value={formData.budget_prevu}
                    onChange={(e) => setFormData({ ...formData, budget_prevu: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                  <input
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin prévue</label>
                  <input
                    type="date"
                    value={formData.date_fin_prevue}
                    onChange={(e) => setFormData({ ...formData, date_fin_prevue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={2}
                  placeholder="Description du projet"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={2}
                  placeholder="Notes internes"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingProject(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim() || !formData.code.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-orange-200/30"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Enregistrement...' : editingProject ? 'Modifier' : 'Créer le projet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
