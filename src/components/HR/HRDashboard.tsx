import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, UserPlus, DollarSign, Calendar, CheckCircle,
  Clock, XCircle, Plus, Edit2, Trash2,
  Banknote, FileText, AlertCircle, Search,
  Building, Phone, Mail, RefreshCw,
  Briefcase, ArrowUpRight, ArrowDownRight, LayoutGrid, List,
  UserCog, ChevronRight, Download, FileDown, BarChart3
} from 'lucide-react';
import { ModuleAnalytics } from '../Analytics/ModuleAnalytics';

// ── Config ──────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('auth_token') || '';
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

// ── Types ───────────────────────────────────────────────────
interface Employee {
  id: string; employee_number: string; first_name: string; last_name: string;
  email: string; phone: string; position: string; department: string;
  hire_date: string; contract_type: string; base_salary: number;
  transport_allowance: number; housing_allowance: number;
  rib: string; bank_name: string; status: 'active' | 'inactive' | 'suspended'; notes: string;
}
interface SalaryPayment {
  id: string; employee_id: string; first_name: string; last_name: string;
  employee_number: string; position?: string; department?: string;
  payment_month: number; payment_year: number;
  base_salary: number; transport_allowance: number; housing_allowance: number;
  bonuses: number; bonus_description: string; deductions: number; deduction_description: string;
  advance_deducted: number; gross_salary: number; net_salary: number;
  payment_date: string; payment_method: string; status: 'draft' | 'paid' | 'cancelled'; notes: string;
}
interface SalaryAdvance {
  id: string; employee_id: string; first_name: string; last_name: string;
  employee_number: string; amount: number; reason: string; request_date: string;
  payment_date: string; status: 'pending' | 'approved' | 'rejected' | 'repaid';
  repayment_type: 'one_shot' | 'monthly'; repayment_months: number;
  monthly_deduction: number; repaid_amount: number; notes: string;
}

// ── Micro-composants ────────────────────────────────────────
const Badge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, { label: string; cls: string }> = {
    active:    { label: 'Actif',       cls: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' },
    inactive:  { label: 'Inactif',     cls: 'bg-gray-50 text-gray-500 border border-gray-200/60' },
    suspended: { label: 'Suspendu',    cls: 'bg-rose-50 text-rose-600 border border-rose-200/60' },
    draft:     { label: 'Brouillon',   cls: 'bg-slate-50 text-slate-500 border border-slate-200/60' },
    paid:      { label: 'Payé',        cls: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' },
    cancelled: { label: 'Annulé',      cls: 'bg-rose-50 text-rose-600 border border-rose-200/60' },
    pending:   { label: 'En attente',  cls: 'bg-amber-50 text-amber-600 border border-amber-200/60' },
    approved:  { label: 'Approuvée',   cls: 'bg-teal-50 text-teal-600 border border-teal-200/60' },
    rejected:  { label: 'Rejetée',     cls: 'bg-rose-50 text-rose-600 border border-rose-200/60' },
    repaid:    { label: 'Remboursée',  cls: 'bg-cyan-50 text-cyan-600 border border-cyan-200/60' },
  };
  const c = cfg[status] || { label: status, cls: 'bg-gray-50 text-gray-500 border border-gray-200/60' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${c.cls}`}>{c.label}</span>;
};

const Card: React.FC<{ children: React.ReactNode; className?: string; accent?: string; bg?: string }> = ({ children, className = '', accent, bg }) => (
  <div className={`${bg || 'bg-white'} rounded-xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(99,102,241,0.08)] hover:shadow-[0_4px_25px_-4px_rgba(99,102,241,0.14)] transition-all duration-200 overflow-hidden ${className}`}>
    {accent && <div className={`h-1 w-full ${accent}`} />}
    {children}
  </div>
);

const Label: React.FC<{ text: string; required?: boolean; icon?: React.ReactNode }> = ({ text, required, icon }) => (
  <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 mb-1.5 tracking-wide">
    {icon && <span className="text-gray-400">{icon}</span>}
    {text}{required && <span className="text-rose-400 ml-0.5">*</span>}
  </label>
);

const inp = "w-full border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-white/80 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 focus:border-indigo-300 focus:bg-white hover:border-gray-300 transition-all duration-200 shadow-sm shadow-gray-100/50";

const Btn: React.FC<{
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  disabled?: boolean; size?: 'sm' | 'md'; className?: string;
}> = ({ children, onClick, variant = 'primary', disabled, size = 'md', className = '' }) => {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-200';
  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  const vars: Record<string, string> = {
    primary:   'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-md shadow-indigo-200/30',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm',
    danger:    'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 shadow-sm',
    ghost:     'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50',
    success:   'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-200/30',
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sz} ${vars[variant]} disabled:opacity-40 ${className}`}>{children}</button>;
};

const AVATAR_COLORS = [
  'from-indigo-400 to-violet-500', 'from-teal-400 to-cyan-500', 'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500', 'from-emerald-400 to-green-500', 'from-sky-400 to-orange-500',
  'from-fuchsia-400 to-purple-500', 'from-lime-400 to-green-500',
];
const Avatar: React.FC<{ first: string; last: string; size?: 'sm' | 'md' }> = ({ first, last, size = 'md' }) => {
  const sz = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  const ci = ((first?.charCodeAt(0) || 0) + (last?.charCodeAt(0) || 0)) % AVATAR_COLORS.length;
  return <div className={`${sz} bg-gradient-to-br ${AVATAR_COLORS[ci]} rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0 shadow-sm`}>{first?.[0]}{last?.[0]}</div>;
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }> = ({ icon, title, subtitle, action }) => (
  <div className="py-16 text-center">
    <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400 ring-1 ring-indigo-100/50 shadow-sm shadow-indigo-100/20">{icon}</div>
    <p className="text-gray-800 font-semibold text-sm">{title}</p>
    {subtitle && <p className="text-gray-400 text-xs mt-1.5">{subtitle}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

// ── Formulaire Employé ──────────────────────────────────────
const EmployeeForm: React.FC<{
  employee?: Employee | null; onSave: () => void; onCancel: () => void;
}> = ({ employee, onSave, onCancel }) => {
  const [form, setForm] = useState({
    first_name: employee?.first_name || '', last_name: employee?.last_name || '',
    email: employee?.email || '', phone: employee?.phone || '',
    position: employee?.position || '', department: employee?.department || '',
    hire_date: employee?.hire_date?.split('T')[0] || '',
    contract_type: employee?.contract_type || 'CDI',
    base_salary: employee?.base_salary?.toString() || '',
    transport_allowance: employee?.transport_allowance?.toString() || '0',
    housing_allowance: employee?.housing_allowance?.toString() || '0',
    rib: employee?.rib || '', bank_name: employee?.bank_name || '',
    status: employee?.status || 'active', notes: employee?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const grossPreview = (parseFloat(form.base_salary) || 0) + (parseFloat(form.transport_allowance) || 0) + (parseFloat(form.housing_allowance) || 0);

  const handleSave = async () => {
    if (!form.first_name || !form.last_name) { setError('Prénom et nom obligatoires'); return; }
    if (!form.base_salary) { setError('Salaire de base obligatoire'); return; }
    setSaving(true); setError('');
    try {
      const method = employee ? 'PUT' : 'POST';
      const url = employee ? `${API}/employees/${employee.id}` : `${API}/employees`;
      const r = await fetch(url, { method, headers: hdrs(), body: JSON.stringify(form) });
      const data = await r.json();
      if (!data.success) throw new Error(data.error);
      onSave();
    } catch (e: any) { setError(e.message || 'Erreur'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl shadow-indigo-200/30 ring-1 ring-gray-200/50 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Gradient accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400" />

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200/40">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{employee ? 'Modifier l\'employé' : 'Nouvel employé'}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Remplissez les informations ci-dessous</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"><XCircle className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-gradient-to-b from-gray-50/30 to-white">
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 text-red-600 rounded-xl p-3.5 text-sm flex items-center gap-2.5 border border-red-100/60 shadow-sm shadow-red-100/20">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0"><AlertCircle className="w-4 h-4" /></div>{error}
            </div>
          )}

          {/* Identité */}
          <fieldset className="rounded-xl border border-sky-200/60 bg-gradient-to-br from-sky-50/40 to-orange-50/20 p-4 space-y-3">
            <legend className="text-[11px] font-bold text-sky-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-sky-100 flex items-center justify-center"><Users className="w-3 h-3 text-sky-500" /></div>Identité
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div><Label text="Prénom" required /><input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inp} placeholder="Moussa" /></div>
              <div><Label text="Nom" required /><input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inp} placeholder="Diallo" /></div>
              <div><Label text="Email" /><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inp} placeholder="moussa@allobeton.sn" /></div>
              <div><Label text="Téléphone" /><input value={form.phone} onChange={e => set('phone', e.target.value)} className={inp} placeholder="+221 77 123 45 67" /></div>
            </div>
          </fieldset>

          {/* Emploi */}
          <fieldset className="rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-purple-50/20 p-4 space-y-3">
            <legend className="text-[11px] font-bold text-violet-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center"><Briefcase className="w-3 h-3 text-violet-500" /></div>Emploi
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div><Label text="Poste" /><input value={form.position} onChange={e => set('position', e.target.value)} className={inp} placeholder="Chef de chantier" /></div>
              <div><Label text="Département" /><input value={form.department} onChange={e => set('department', e.target.value)} className={inp} placeholder="Production" /></div>
              <div><Label text="Date d'embauche" /><input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} className={inp} /></div>
              <div><Label text="Contrat" /><select value={form.contract_type} onChange={e => set('contract_type', e.target.value)} className={inp}>{['CDI','CDD','Stage','Intérim','Journalier'].map(c=><option key={c}>{c}</option>)}</select></div>
            </div>
          </fieldset>

          {/* Rémunération */}
          <fieldset className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/40 to-teal-50/20 p-4 space-y-3">
            <legend className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center"><DollarSign className="w-3 h-3 text-emerald-500" /></div>Rémunération
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <div><Label text="Salaire de base" required /><input type="number" value={form.base_salary} onChange={e => set('base_salary', e.target.value)} className={inp} placeholder="350 000" /></div>
              <div><Label text="Ind. Transport" /><input type="number" value={form.transport_allowance} onChange={e => set('transport_allowance', e.target.value)} className={inp} /></div>
              <div><Label text="Ind. Logement" /><input type="number" value={form.housing_allowance} onChange={e => set('housing_allowance', e.target.value)} className={inp} /></div>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-white/70 rounded-xl border border-emerald-200/50 shadow-sm">
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Brut estimé</span>
              <span className="text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{fmt(grossPreview)}</span>
            </div>
          </fieldset>

          {/* Banque */}
          <fieldset className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-orange-50/20 p-4 space-y-3">
            <legend className="text-[11px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center"><Banknote className="w-3 h-3 text-amber-500" /></div>Informations bancaires
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div><Label text="RIB" /><input value={form.rib} onChange={e => set('rib', e.target.value)} className={inp} placeholder="SN08 xxxxx xxxxx" /></div>
              <div><Label text="Banque" /><input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} className={inp} placeholder="CBAO, BHS..." /></div>
            </div>
          </fieldset>

          {employee && (
            <fieldset className="rounded-xl border border-gray-200/60 bg-gradient-to-br from-gray-50/40 to-slate-50/20 p-4 space-y-3">
              <legend className="text-[11px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
                <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center"><UserCog className="w-3 h-3 text-gray-500" /></div>Statut
              </legend>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inp}>
                <option value="active">✅ Actif</option><option value="inactive">⏸ Inactif</option><option value="suspended">🚫 Suspendu</option>
              </select>
            </fieldset>
          )}

          <div>
            <Label text="Notes" />
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className={`${inp} resize-none`} placeholder="Notes internes..." />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 justify-end flex-shrink-0">
          <Btn variant="secondary" onClick={onCancel}>Annuler</Btn>
          <Btn onClick={handleSave} disabled={saving} className="min-w-[140px]">{saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Enregistrement...</> : <><CheckCircle className="w-4 h-4" />{employee ? 'Mettre à jour' : 'Créer l\'employé'}</>}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Formulaire Avance ───────────────────────────────────────
const AdvanceForm: React.FC<{
  employees: Employee[]; advance?: SalaryAdvance | null; onSave: () => void; onCancel: () => void;
}> = ({ employees, advance, onSave, onCancel }) => {
  const [form, setForm] = useState({
    employee_id: advance?.employee_id || '', amount: advance?.amount?.toString() || '',
    reason: advance?.reason || '', request_date: advance?.request_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    repayment_type: advance?.repayment_type || 'one_shot', repayment_months: advance?.repayment_months?.toString() || '1',
    notes: advance?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const monthly = form.repayment_type === 'monthly' && form.amount && form.repayment_months
    ? parseFloat(form.amount) / parseInt(form.repayment_months) : parseFloat(form.amount) || 0;

  const selectedEmp = employees.find(e => e.id === form.employee_id);
  const ratio = selectedEmp && form.amount ? (parseFloat(form.amount) / parseFloat(selectedEmp.base_salary as any) * 100) : 0;

  const handleSave = async () => {
    if (!form.employee_id || !form.amount || !form.request_date) { setError('Employé, montant et date obligatoires'); return; }
    setSaving(true); setError('');
    try {
      const method = advance ? 'PUT' : 'POST';
      const url = advance ? `${API}/salary-advances/${advance.id}` : `${API}/salary-advances`;
      const r = await fetch(url, { method, headers: hdrs(), body: JSON.stringify(form) });
      const data = await r.json();
      if (!data.success) throw new Error(data.error);
      onSave();
    } catch (e: any) { setError(e.message || 'Erreur'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl shadow-amber-200/20 ring-1 ring-gray-200/50 w-full max-w-lg flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Gradient accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/40">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{advance ? 'Modifier l\'avance' : 'Demande d\'avance'}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Avance sur salaire</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"><XCircle className="w-5 h-5" /></button>
        </div>

        <div className="p-6 pt-2 space-y-4 bg-gradient-to-b from-gray-50/30 to-white">
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 text-red-600 rounded-xl p-3.5 text-sm flex items-center gap-2.5 border border-red-100/60 shadow-sm shadow-red-100/20">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0"><AlertCircle className="w-4 h-4" /></div>{error}
            </div>
          )}

          {/* Employé selector */}
          <fieldset className="rounded-xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/30 to-violet-50/20 p-4 space-y-3">
            <legend className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center"><Users className="w-3 h-3 text-indigo-500" /></div>Employé
            </legend>
            <select value={form.employee_id} onChange={e => set('employee_id', e.target.value)} className={inp}>
              <option value="">Sélectionner un employé</option>
              {employees.filter(e => e.status === 'active').map(e => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.employee_number}</option>
              ))}
            </select>
            {selectedEmp && (
              <div className="flex items-center gap-2.5 px-3 py-2 bg-white/70 rounded-lg border border-indigo-100/50">
                <Avatar first={selectedEmp.first_name} last={selectedEmp.last_name} size="sm" />
                <div>
                  <div className="text-sm font-semibold text-gray-800">{selectedEmp.first_name} {selectedEmp.last_name}</div>
                  <div className="text-[11px] text-gray-400">{selectedEmp.position || selectedEmp.department || 'Non renseigné'} · Base : {fmt(parseFloat(selectedEmp.base_salary as any))}</div>
                </div>
              </div>
            )}
          </fieldset>

          {/* Montant & Date */}
          <fieldset className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/30 to-orange-50/20 p-4 space-y-3">
            <legend className="text-[11px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center"><DollarSign className="w-3 h-3 text-amber-500" /></div>Détails
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div><Label text="Montant (XOF)" required /><input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className={inp} placeholder="100 000" /></div>
              <div><Label text="Date de demande" required /><input type="date" value={form.request_date} onChange={e => set('request_date', e.target.value)} className={inp} /></div>
            </div>

            {selectedEmp && form.amount && (
              <div className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2.5 border ${ratio > 50
                ? 'bg-gradient-to-r from-red-50 to-rose-50 text-red-600 border-red-200/60'
                : ratio > 30
                  ? 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-600 border-amber-200/60'
                  : 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 border-emerald-200/60'}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ratio > 50 ? 'bg-red-100' : ratio > 30 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                {ratio.toFixed(0)}% du salaire de base ({fmt(parseFloat(selectedEmp.base_salary as any))})
              </div>
            )}
          </fieldset>

          <div><Label text="Motif" /><textarea rows={2} value={form.reason} onChange={e => set('reason', e.target.value)} className={`${inp} resize-none`} placeholder="Raison de l'avance..." /></div>

          {/* Remboursement */}
          <fieldset className="rounded-xl border border-sky-200/60 bg-gradient-to-br from-sky-50/40 to-cyan-50/20 p-4 space-y-3">
            <legend className="text-[11px] font-bold text-sky-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-sky-100 flex items-center justify-center"><RefreshCw className="w-3 h-3 text-sky-500" /></div>Remboursement
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div><Label text="Type" /><select value={form.repayment_type} onChange={e => set('repayment_type', e.target.value)} className={inp}><option value="one_shot">En une fois</option><option value="monthly">Mensuel</option></select></div>
              {form.repayment_type === 'monthly' && <div><Label text="Nombre de mois" /><input type="number" min="1" max="12" value={form.repayment_months} onChange={e => set('repayment_months', e.target.value)} className={inp} /></div>}
            </div>
            {form.amount && (
              <div className="flex items-center justify-between px-4 py-3 bg-white/70 rounded-xl border border-sky-200/50 shadow-sm">
                <span className="text-xs text-sky-600 font-semibold flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Déduction mensuelle</span>
                <span className="text-base font-bold bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">{fmt(monthly)}</span>
              </div>
            )}
          </fieldset>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 justify-end">
          <Btn variant="secondary" onClick={onCancel}>Annuler</Btn>
          <Btn onClick={handleSave} disabled={saving} className="min-w-[140px]">{saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Enregistrement...</> : <><CheckCircle className="w-4 h-4" />Enregistrer</>}</Btn>
        </div>
      </div>
    </div>
  );
};

// ── Formulaire Bulletin ─────────────────────────────────────
const PayslipForm: React.FC<{
  employees: Employee[]; payslip?: SalaryPayment | null; onSave: () => void; onCancel: () => void;
}> = ({ employees, payslip, onSave, onCancel }) => {
  const [form, setForm] = useState({
    employee_id: payslip?.employee_id || '',
    payment_month: payslip?.payment_month?.toString() || CURRENT_MONTH.toString(),
    payment_year: payslip?.payment_year?.toString() || CURRENT_YEAR.toString(),
    base_salary: payslip?.base_salary?.toString() || '',
    transport_allowance: payslip?.transport_allowance?.toString() || '0',
    housing_allowance: payslip?.housing_allowance?.toString() || '0',
    bonuses: payslip?.bonuses?.toString() || '0', bonus_description: payslip?.bonus_description || '',
    deductions: payslip?.deductions?.toString() || '0', deduction_description: payslip?.deduction_description || '',
    advance_deducted: payslip?.advance_deducted?.toString() || '0',
    payment_date: payslip?.payment_date?.split('T')[0] || '', payment_method: payslip?.payment_method || 'virement',
    status: payslip?.status || 'draft', notes: payslip?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const gross = (parseFloat(form.base_salary) || 0) + (parseFloat(form.transport_allowance) || 0) + (parseFloat(form.housing_allowance) || 0) + (parseFloat(form.bonuses) || 0);
  const totalDed = (parseFloat(form.deductions) || 0) + (parseFloat(form.advance_deducted) || 0);
  const net = gross - totalDed;

  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (emp) setForm(f => ({ ...f, employee_id: empId, base_salary: emp.base_salary?.toString() || '', transport_allowance: emp.transport_allowance?.toString() || '0', housing_allowance: emp.housing_allowance?.toString() || '0' }));
    else setForm(f => ({ ...f, employee_id: empId }));
  };

  const handleSave = async () => {
    if (!form.employee_id) { setError('Sélectionner un employé'); return; }
    setSaving(true); setError('');
    try {
      const method = payslip ? 'PUT' : 'POST';
      const url = payslip ? `${API}/salaries/${payslip.id}` : `${API}/salaries`;
      const r = await fetch(url, { method, headers: hdrs(), body: JSON.stringify(form) });
      const data = await r.json();
      if (!data.success) throw new Error(data.error);
      onSave();
    } catch (e: any) { setError(e.message || 'Erreur'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl shadow-emerald-200/20 ring-1 ring-gray-200/50 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Gradient accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/40">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{payslip ? 'Modifier le bulletin' : 'Nouveau bulletin de paie'}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{MONTHS[parseInt(form.payment_month) - 1]} {form.payment_year}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"><XCircle className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-gradient-to-b from-gray-50/30 to-white">
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 text-red-600 rounded-xl p-3.5 text-sm flex items-center gap-2.5 border border-red-100/60 shadow-sm shadow-red-100/20">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0"><AlertCircle className="w-4 h-4" /></div>{error}
            </div>
          )}

          {/* Employé & Période */}
          <fieldset className="rounded-xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/30 to-violet-50/20 p-4 space-y-3">
            <legend className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center"><Users className="w-3 h-3 text-indigo-500" /></div>Employé & Période
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <div><Label text="Employé" required /><select value={form.employee_id} onChange={e => handleEmployeeChange(e.target.value)} className={inp} disabled={!!payslip}><option value="">Sélectionner</option>{employees.filter(e => e.status === 'active').map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}</select></div>
              <div><Label text="Mois" required /><select value={form.payment_month} onChange={e => set('payment_month', e.target.value)} className={inp}>{MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
              <div><Label text="Année" required /><input type="number" value={form.payment_year} onChange={e => set('payment_year', e.target.value)} className={inp} /></div>
            </div>
          </fieldset>

          {/* Gains */}
          <fieldset className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/40 to-teal-50/20 p-4 space-y-3">
            <legend className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center"><ArrowUpRight className="w-3 h-3 text-emerald-500" /></div>Gains
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <div><Label text="Salaire de base" /><input type="number" value={form.base_salary} onChange={e => set('base_salary', e.target.value)} className={inp} /></div>
              <div><Label text="Transport" /><input type="number" value={form.transport_allowance} onChange={e => set('transport_allowance', e.target.value)} className={inp} /></div>
              <div><Label text="Logement" /><input type="number" value={form.housing_allowance} onChange={e => set('housing_allowance', e.target.value)} className={inp} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label text="Primes" /><input type="number" value={form.bonuses} onChange={e => set('bonuses', e.target.value)} className={inp} /></div>
              <div><Label text="Libellé primes" /><input value={form.bonus_description} onChange={e => set('bonus_description', e.target.value)} className={inp} placeholder="Prime de rendement" /></div>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/70 rounded-xl border border-emerald-200/50 shadow-sm">
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5" />Total brut</span>
              <span className="text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{fmt(gross)}</span>
            </div>
          </fieldset>

          {/* Retenues */}
          <fieldset className="rounded-xl border border-rose-200/60 bg-gradient-to-br from-rose-50/40 to-orange-50/20 p-4 space-y-3">
            <legend className="text-[11px] font-bold text-rose-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-rose-100 flex items-center justify-center"><ArrowDownRight className="w-3 h-3 text-rose-500" /></div>Retenues
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <div><Label text="Retenues" /><input type="number" value={form.deductions} onChange={e => set('deductions', e.target.value)} className={inp} /></div>
              <div><Label text="Libellé" /><input value={form.deduction_description} onChange={e => set('deduction_description', e.target.value)} className={inp} /></div>
              <div><Label text="Remb. avance" /><input type="number" value={form.advance_deducted} onChange={e => set('advance_deducted', e.target.value)} className={inp} /></div>
            </div>
            {totalDed > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/70 rounded-xl border border-rose-200/50 shadow-sm">
                <span className="text-xs text-rose-600 font-semibold flex items-center gap-1.5"><ArrowDownRight className="w-3.5 h-3.5" />Total retenues</span>
                <span className="text-base font-bold text-rose-600">-{fmt(totalDed)}</span>
              </div>
            )}
          </fieldset>

          {/* Résumé Net */}
          <div className="rounded-xl overflow-hidden border border-gray-200/60 shadow-sm">
            <div className="bg-gradient-to-r from-indigo-50 to-orange-50 px-5 py-1.5 border-b border-indigo-100">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Résumé</span>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white px-5 py-4 flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-gray-500 text-xs font-medium">Brut</span>
                  <span className="text-gray-800 text-sm font-semibold">{fmt(gross)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-gray-500 text-xs font-medium">Retenues</span>
                  <span className="text-gray-800 text-sm font-semibold">-{fmt(totalDed)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Net à payer</div>
                <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">{fmt(net)}</div>
              </div>
            </div>
          </div>

          {/* Paiement */}
          <fieldset className="rounded-xl border border-sky-200/60 bg-gradient-to-br from-sky-50/30 to-cyan-50/20 p-4 space-y-3">
            <legend className="text-[11px] font-bold text-sky-600 uppercase tracking-widest flex items-center gap-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-sky-100 flex items-center justify-center"><Calendar className="w-3 h-3 text-sky-500" /></div>Paiement
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <div><Label text="Date paiement" /><input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} className={inp} /></div>
              <div><Label text="Mode" /><select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={inp}><option value="virement">Virement</option><option value="espèces">Espèces</option><option value="chèque">Chèque</option><option value="mobile_money">Mobile Money</option></select></div>
              <div><Label text="Statut" /><select value={form.status} onChange={e => set('status', e.target.value)} className={inp}><option value="draft">Brouillon</option><option value="paid">Payé</option><option value="cancelled">Annulé</option></select></div>
            </div>
          </fieldset>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 justify-end flex-shrink-0">
          <Btn variant="secondary" onClick={onCancel}>Annuler</Btn>
          <Btn onClick={handleSave} disabled={saving} className="min-w-[140px]">{saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Enregistrement...</> : <><CheckCircle className="w-4 h-4" />Enregistrer</>}</Btn>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════
export const HRDashboard: React.FC = () => {
  type Tab = 'overview' | 'employees' | 'salaries' | 'advances' | 'analytics';
  const [tab, setTab] = useState<Tab>('overview');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaries, setSalaries] = useState<SalaryPayment[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<SalaryAdvance | null>(null);
  const [showPayslipForm, setShowPayslipForm] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<SalaryPayment | null>(null);
  const [searchEmp, setSearchEmp] = useState('');
  const [filterMonth, setFilterMonth] = useState(CURRENT_MONTH);
  const [filterYear, setFilterYear] = useState(CURRENT_YEAR);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterDept, setFilterDept] = useState('all');
  const [advFilter, setAdvFilter] = useState('all');
  const [payrollHistory, setPayrollHistory] = useState<Array<{ year: number; month: number; count: number; gross: number; net: number; paid_net: number }>>([]);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [empR, salR, advR, histR] = await Promise.all([
        fetch(`${API}/employees`, { headers: hdrs() }),
        fetch(`${API}/salaries?month=${filterMonth}&year=${filterYear}`, { headers: hdrs() }),
        fetch(`${API}/salary-advances`, { headers: hdrs() }),
        fetch(`${API}/employees/stats/payroll-history?months=6`, { headers: hdrs() }),
      ]);
      const [empD, salD, advD, histD] = await Promise.all([empR.json(), salR.json(), advR.json(), histR.json()]);
      setEmployees(empD.data || []);
      setSalaries(salD.data || []);
      setAdvances(advD.data || []);
      setPayrollHistory((histD.data || []).map((r: any) => ({
        year: Number(r.year), month: Number(r.month),
        count: Number(r.count), gross: Number(r.gross || 0),
        net: Number(r.net || 0), paid_net: Number(r.paid_net || 0)
      })));
    } catch (e) { console.error('Erreur fetch RH:', e); } finally { setLoading(false); }
  }, [filterMonth, filterYear]);

  /* Charger des données de démo (admin) */
  const loadDemoData = async () => {
    if (!confirm('Charger 12 employés + 36 fiches de paie + 6 avances ?\n(Les données existantes seront REMPLACÉES)')) return;
    setSeedingDemo(true);
    try {
      const r = await fetch(`${API}/employees/seed-demo`, {
        method: 'POST', headers: hdrs(), body: JSON.stringify({ reset: true })
      });
      const d = await r.json();
      if (d.success) { alert('✓ Données de démonstration chargées'); fetchAll(); }
      else alert('Erreur : ' + (d.error || 'inconnue'));
    } catch (e: any) { alert('Erreur : ' + (e?.message || 'réseau')); }
    finally { setSeedingDemo(false); }
  };

  /* Export CSV de la liste employés filtrée */
  const exportEmployeesCSV = () => {
    const q = searchEmp.toLowerCase();
    const rows = employees.filter(e => {
      if (q && !`${e.first_name} ${e.last_name} ${e.employee_number} ${e.position} ${e.department}`.toLowerCase().includes(q)) return false;
      if (filterDept !== 'all' && e.department !== filterDept) return false;
      return true;
    });
    if (!rows.length) { alert('Aucun employé à exporter'); return; }
    const header = ['Matricule','Nom','Prenom','Email','Telephone','Poste','Departement','Contrat','Date embauche','Salaire base','Transport','Logement','Banque','Statut'];
    const lines = [header.join(';')].concat(rows.map(e => [
      e.employee_number, e.last_name, e.first_name, e.email || '', e.phone || '',
      e.position || '', e.department || '', e.contract_type || '', e.hire_date || '',
      e.base_salary || 0, e.transport_allowance || 0, e.housing_allowance || 0,
      e.bank_name || '', e.status
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')));
    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `employes_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const deleteEmployee = async (id: string) => { if (!confirm('Supprimer cet employé ?')) return; await fetch(`${API}/employees/${id}`, { method: 'DELETE', headers: hdrs() }); fetchAll(); };
  const deleteAdvance = async (id: string) => { if (!confirm('Supprimer cette avance ?')) return; await fetch(`${API}/salary-advances/${id}`, { method: 'DELETE', headers: hdrs() }); fetchAll(); };
  const deletePayslip = async (id: string) => { if (!confirm('Supprimer ce bulletin ?')) return; await fetch(`${API}/salaries/${id}`, { method: 'DELETE', headers: hdrs() }); fetchAll(); };
  const approveAdvance = async (id: string, status: string) => {
    await fetch(`${API}/salary-advances/${id}/status`, { method: 'PUT', headers: hdrs(), body: JSON.stringify({ status, payment_date: new Date().toISOString().split('T')[0] }) });
    fetchAll();
  };
  const generatePayslips = async () => {
    setGenerating(true); setGenMsg('');
    try { const r = await fetch(`${API}/salaries/generate/${filterYear}/${filterMonth}`, { method: 'POST', headers: hdrs() }); const data = await r.json(); setGenMsg(data.message); fetchAll(); }
    catch { setGenMsg('Erreur'); } finally { setGenerating(false); }
  };

  // ── Téléchargement PDF ──
  const downloadPayslipPDF = async (payslipId: string) => {
    try {
      const r = await fetch(`${API}/pdf/payslip/${payslipId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!r.ok) throw new Error('Erreur PDF');
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = r.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || 'bulletin.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error('Erreur PDF:', e); alert('Erreur lors de la génération du PDF'); }
  };

  const downloadAllPayslipsPDF = async () => {
    try {
      const r = await fetch(`${API}/pdf/payslip-batch/${filterYear}/${filterMonth}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Erreur PDF'); }
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = r.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || 'bulletins.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) { console.error('Erreur PDF batch:', e); alert(e.message || 'Erreur lors de la génération du PDF'); }
  };

  // ── Stats ──
  const activeEmps = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);
  const activeCount = activeEmps.length;
  const totalMasse = useMemo(() => activeEmps.reduce((s, e) => s + parseFloat(e.base_salary as any || 0) + parseFloat(e.transport_allowance as any || 0) + parseFloat(e.housing_allowance as any || 0), 0), [activeEmps]);
  const pendingAdv = advances.filter(a => a.status === 'pending').length;
  const outstandingAdv = useMemo(() => advances.filter(a => a.status === 'approved').reduce((s, a) => s + (parseFloat(a.amount as any) - parseFloat(a.repaid_amount as any || 0)), 0), [advances]);
  const paidNet = salaries.filter(s => s.status === 'paid').reduce((s, p) => s + parseFloat(p.net_salary as any || 0), 0);
  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))], [employees]);

  const filteredEmployees = useMemo(() => employees.filter(e => {
    if (searchEmp && !`${e.first_name} ${e.last_name} ${e.employee_number} ${e.position} ${e.department}`.toLowerCase().includes(searchEmp.toLowerCase())) return false;
    if (filterDept !== 'all' && e.department !== filterDept) return false;
    return true;
  }), [employees, searchEmp, filterDept]);

  const filteredAdvances = useMemo(() => advFilter === 'all' ? advances : advances.filter(a => a.status === advFilter), [advances, advFilter]);

  // ── Loader ──
  if (loading && employees.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-indigo-100 border-t-indigo-400 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Chargement…</p>
        </div>
      </div>
    );
  }

  const tabDef: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: UserCog },
    { id: 'employees', label: 'Employés', icon: Users, badge: activeCount || undefined },
    { id: 'salaries', label: 'Bulletins de paie', icon: FileText, badge: salaries.length || undefined },
    { id: 'advances', label: 'Avances', icon: Banknote, badge: pendingAdv || undefined },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* ─── Header ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-xl flex items-center justify-center ring-1 ring-indigo-100/50">
              <UserCog className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Ressources Humaines & Paie</h1>
              <p className="text-gray-400 text-sm mt-0.5">Gestion du personnel, salaires et avances — {MONTHS[CURRENT_MONTH - 1]} {CURRENT_YEAR}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAll}
              disabled={loading}
              title="Actualiser"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={loadDemoData}
              disabled={seedingDemo}
              title="Insérer un jeu de données de démonstration (admin)"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-sm shadow-amber-200/50 transition-all disabled:opacity-50"
            >
              {seedingDemo ? (
                <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Chargement…</>
              ) : (
                <><FileDown className="w-3.5 h-3.5" /> Charger démo</>
              )}
            </button>
            <div className="hidden md:block text-right bg-gradient-to-br from-sky-50 to-indigo-50 px-4 py-2 rounded-xl ring-1 ring-indigo-100/50">
              <div className="text-2xl font-bold text-indigo-600">{activeCount}</div>
              <div className="text-indigo-400 text-xs font-medium">employés actifs</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── KPIs ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Effectif actif', value: activeCount.toString(), sub: `${employees.length} total`, icon: Users, iconBg: 'bg-sky-100', iconClr: 'text-sky-500', border: 'border-l-sky-400', fill: 'bg-gradient-to-br from-sky-50/70 to-orange-50/40', ring: 'ring-sky-100/40', borderClr: 'border-sky-200/50' },
          { label: 'Masse salariale', value: fmt(totalMasse), sub: 'Brut mensuel', icon: DollarSign, iconBg: 'bg-emerald-100', iconClr: 'text-emerald-500', border: 'border-l-emerald-400', fill: 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40', ring: 'ring-emerald-100/40', borderClr: 'border-emerald-200/50' },
          { label: 'Avances en attente', value: pendingAdv.toString(), sub: 'Requêtes', icon: Clock, iconBg: 'bg-amber-100', iconClr: 'text-amber-500', border: 'border-l-amber-400', fill: 'bg-gradient-to-br from-amber-50/70 to-orange-50/40', ring: 'ring-amber-100/40', borderClr: 'border-amber-200/50' },
          { label: 'Encours avances', value: fmt(outstandingAdv), sub: 'À récupérer', icon: Banknote, iconBg: 'bg-violet-100', iconClr: 'text-violet-500', border: 'border-l-violet-400', fill: 'bg-gradient-to-br from-violet-50/70 to-purple-50/40', ring: 'ring-violet-100/40', borderClr: 'border-violet-200/50' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className={`rounded-xl p-5 border-l-4 ${kpi.border} ${kpi.fill} border ${kpi.borderClr} shadow-sm hover:shadow-md transition-all duration-200`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${kpi.iconBg} rounded-xl flex items-center justify-center ring-1 ${kpi.ring}`}><Icon className={`w-5 h-5 ${kpi.iconClr}`} /></div>
                <span className="text-[11px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full">{kpi.sub}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 leading-none">{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-1.5 font-medium">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* ─── Navigation tabs ────────────────────────── */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabDef.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                  active
                    ? 'bg-white text-indigo-600 border border-gray-200 border-b-white -mb-px shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                <Icon className="w-4 h-4" />
                {t.label}
                {t.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                    active ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                  }`}>{t.badge}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ════════════════════════════════════════════════
          VUE D'ENSEMBLE
         ════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bulletins du mois */}
          <Card accent="bg-gradient-to-r from-indigo-400 to-violet-500" bg="bg-gradient-to-br from-indigo-50/60 to-violet-50/30" className="p-5 lg:col-span-1 border-indigo-200/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><FileText className="w-4 h-4 text-indigo-500" /></div>
                <h3 className="text-sm font-semibold text-gray-900">Bulletins — {MONTHS_SHORT[CURRENT_MONTH - 1]}</h3>
              </div>
              <button onClick={() => setTab('salaries')} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5 bg-indigo-50 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition">Voir <ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50/60 rounded-lg p-3 text-center border border-emerald-100/50">
                <div className="text-lg font-bold text-emerald-600">{salaries.filter(s => s.status === 'paid').length}</div>
                <div className="text-[11px] text-emerald-400">Payés</div>
              </div>
              <div className="bg-amber-50/60 rounded-lg p-3 text-center border border-amber-100/50">
                <div className="text-lg font-bold text-amber-600">{salaries.filter(s => s.status === 'draft').length}</div>
                <div className="text-[11px] text-amber-400">Brouillons</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-lg p-3.5 border border-slate-200/60 shadow-sm">
              <div className="text-slate-500 text-[11px] font-medium">Masse nette payée</div>
              <div className="text-lg font-bold mt-0.5 text-emerald-600">{fmt(paidNet)}</div>
            </div>
          </Card>

          {/* Avances synthèse */}
          <Card accent="bg-gradient-to-r from-amber-400 to-orange-400" bg="bg-gradient-to-br from-amber-50/60 to-orange-50/30" className="p-5 lg:col-span-1 border-amber-200/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center"><Banknote className="w-4 h-4 text-amber-500" /></div>
                <h3 className="text-sm font-semibold text-gray-900">Avances</h3>
              </div>
              <button onClick={() => setTab('advances')} className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5 bg-amber-50 px-2.5 py-1 rounded-full hover:bg-amber-100 transition">Gérer <ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="space-y-2">
              {[
                { label: 'En attente', val: advances.filter(a => a.status === 'pending').length, dot: 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.4)]' },
                { label: 'Approuvées', val: advances.filter(a => a.status === 'approved').length, dot: 'bg-indigo-300 shadow-[0_0_6px_rgba(129,140,248,0.4)]' },
                { label: 'Remboursées', val: advances.filter(a => a.status === 'repaid').length, dot: 'bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.4)]' },
                { label: 'Rejetées', val: advances.filter(a => a.status === 'rejected').length, dot: 'bg-rose-300 shadow-[0_0_6px_rgba(253,164,175,0.4)]' },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                    <span className="text-sm text-gray-600">{r.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{r.val}</span>
                </div>
              ))}
            </div>
            {outstandingAdv > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">Encours total</span>
                <span className="text-sm font-bold text-gray-900">{fmt(outstandingAdv)}</span>
              </div>
            )}
          </Card>

          {/* Départements */}
          <Card accent="bg-gradient-to-r from-teal-400 to-cyan-400" bg="bg-gradient-to-br from-teal-50/60 to-cyan-50/30" className="p-5 lg:col-span-1 border-teal-200/40">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center"><Building className="w-4 h-4 text-teal-500" /></div>
              <h3 className="text-sm font-semibold text-gray-900">Répartition par département</h3>
            </div>
            {employees.length > 0 ? (
              <div className="space-y-3">
                {Object.entries(
                  employees.reduce((acc: Record<string, number>, e) => {
                    const d = e.department || 'Non défini';
                    acc[d] = (acc[d] || 0) + 1;
                    return acc;
                  }, {})
                ).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                  <div key={dept}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 truncate">{dept}</span>
                      <span className="font-medium text-gray-900 tabular-nums">{count}</span>
                    </div>
                    <div className="h-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-full overflow-hidden ring-1 ring-teal-100/40">
                      <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full transition-all" style={{ width: `${(count / employees.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">Aucun employé</div>
            )}
          </Card>

          {/* ─── Graphique évolution masse salariale 6 mois ─── */}
          <Card accent="bg-gradient-to-r from-emerald-400 to-teal-500" className="p-5 lg:col-span-3 border-emerald-200/40">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><BarChart3 className="w-4 h-4 text-emerald-600" /></div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Évolution masse salariale</h3>
                  <p className="text-[11px] text-gray-400">6 derniers mois — net payé vs total brut</p>
                </div>
              </div>
              {payrollHistory.length > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-400 font-medium">Cumul net payé 6 mois</div>
                  <div className="text-lg font-bold text-emerald-600">{fmt(payrollHistory.reduce((s, m) => s + m.paid_net, 0))}</div>
                </div>
              )}
            </div>
            {payrollHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <BarChart3 className="w-10 h-10 mx-auto text-gray-200 mb-2" />
                Aucun historique de paie. Cliquez sur <strong>"Charger démo"</strong> en haut pour générer des données de test.
              </div>
            ) : (
              (() => {
                const maxGross = Math.max(...payrollHistory.map(m => m.gross), 1);
                return (
                  <div>
                    <div className="flex items-end gap-3 h-44 px-2">
                      {payrollHistory.map((m, idx) => {
                        const grossH = (m.gross / maxGross) * 100;
                        const netH = m.gross > 0 ? (m.paid_net / m.gross) * grossH : 0;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {fmt(m.gross)}
                            </div>
                            <div className="relative w-full flex items-end justify-center" style={{ height: '140px' }}>
                              <div
                                className="w-full max-w-[44px] rounded-t-lg bg-gradient-to-t from-emerald-100 to-emerald-50 border border-emerald-200/60 transition-all"
                                style={{ height: `${grossH}%` }}
                                title={`Brut : ${fmt(m.gross)}`}
                              >
                                <div
                                  className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-teal-400 absolute bottom-0 left-1/2 -translate-x-1/2 max-w-[44px] shadow-sm"
                                  style={{ height: `${netH}%` }}
                                  title={`Payé : ${fmt(m.paid_net)}`}
                                />
                              </div>
                            </div>
                            <div className="text-[11px] font-bold text-gray-600">{MONTHS_SHORT[m.month - 1]}</div>
                            <div className="text-[10px] text-gray-400">{m.count} fiches</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-gradient-to-t from-emerald-500 to-teal-400" />
                        Net payé
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-gradient-to-t from-emerald-100 to-emerald-50 border border-emerald-200/60" />
                        Brut total
                      </span>
                    </div>
                  </div>
                );
              })()
            )}
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          EMPLOYÉS
         ════════════════════════════════════════════════ */}
      {tab === 'employees' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex-1 relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
              <input value={searchEmp} onChange={e => setSearchEmp(e.target.value)} placeholder="Rechercher un employé…"
                className="w-full border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/30 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-300 transition shadow-sm" />
            </div>
            {departments.length > 0 && (
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="all">Tous départements</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
              <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}><List className="w-4 h-4" /></button>
            </div>
            <Btn variant="secondary" size="md" onClick={exportEmployeesCSV} className="!gap-1.5"><Download className="w-4 h-4" />Export CSV</Btn>
            <Btn onClick={() => { setEditingEmployee(null); setShowEmployeeForm(true); }}><UserPlus className="w-4 h-4" />Nouvel employé</Btn>
          </div>

          {/* Grille */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEmployees.map(emp => {
                const gross = parseFloat(emp.base_salary as any || 0) + parseFloat(emp.transport_allowance as any || 0) + parseFloat(emp.housing_allowance as any || 0);
                const statusAccent = emp.status === 'active' ? 'border-l-emerald-400' : emp.status === 'suspended' ? 'border-l-rose-400' : 'border-l-gray-300';
                const statusFill = emp.status === 'active' ? 'bg-gradient-to-br from-emerald-50/50 to-teal-50/20' : emp.status === 'suspended' ? 'bg-gradient-to-br from-rose-50/50 to-pink-50/20' : 'bg-gray-50/50';
                return (
                  <Card key={emp.id} bg={statusFill} className={`p-5 border-l-4 ${statusAccent} hover:shadow-md transition-all duration-200`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar first={emp.first_name} last={emp.last_name} />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{emp.first_name} {emp.last_name}</div>
                          <div className="text-xs text-gray-400">{emp.employee_number}</div>
                        </div>
                      </div>
                      <Badge status={emp.status} />
                    </div>

                    <div className="space-y-1.5 mb-3 text-sm">
                      {emp.position && <div className="flex items-center gap-2 text-gray-600"><Briefcase className="w-3.5 h-3.5 text-gray-400" />{emp.position}</div>}
                      {emp.department && <div className="flex items-center gap-2 text-gray-500"><Building className="w-3.5 h-3.5 text-gray-400" />{emp.department}</div>}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      {emp.contract_type && <span className="bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full font-medium">{emp.contract_type}</span>}
                      {emp.hire_date && <span>depuis {new Date(emp.hire_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>}
                    </div>

                    {(emp.phone || emp.email) && (
                      <div className="flex gap-3 text-xs text-gray-400 mb-3">
                        {emp.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</span>}
                        {emp.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{emp.email}</span>}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-indigo-50">
                      <div>
                        <div className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">Brut</div>
                        <div className="text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{fmt(gross)}</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingEmployee(emp); setShowEmployeeForm(true); }} className="w-7 h-7 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteEmployee(emp.id)} className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Liste tableau */
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                    {['Employé','Poste','Département','Contrat','Brut','Statut',''].map(h => (
                      <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEmployees.map(emp => {
                    const gross = parseFloat(emp.base_salary as any || 0) + parseFloat(emp.transport_allowance as any || 0) + parseFloat(emp.housing_allowance as any || 0);
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar first={emp.first_name} last={emp.last_name} size="sm" />
                            <div>
                              <div className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                              <div className="text-xs text-gray-400">{emp.employee_number}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{emp.position || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{emp.department || '—'}</td>
                        <td className="px-4 py-3"><span className="bg-gray-100 text-gray-600 text-[11px] font-medium px-2 py-0.5 rounded">{emp.contract_type}</span></td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{fmt(gross)}</td>
                        <td className="px-4 py-3"><Badge status={emp.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingEmployee(emp); setShowEmployeeForm(true); }} className="w-7 h-7 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition"><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => deleteEmployee(emp.id)} className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}

          {filteredEmployees.length === 0 && !loading && (
            <EmptyState icon={<Users className="w-6 h-6" />} title="Aucun employé trouvé" subtitle="Ajoutez votre premier employé pour commencer"
              action={<Btn onClick={() => setShowEmployeeForm(true)}><UserPlus className="w-4 h-4" />Ajouter</Btn>} />
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          BULLETINS DE PAIE
         ════════════════════════════════════════════════ */}
      {tab === 'salaries' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
              <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))} className="px-3 py-2 text-sm bg-transparent border-r border-gray-200 focus:outline-none">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))} className="px-3 py-2 text-sm bg-transparent focus:outline-none">
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <Btn variant="secondary" onClick={generatePayslips} disabled={generating || activeCount === 0}>
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />Générer
            </Btn>
            <Btn onClick={() => { setEditingPayslip(null); setShowPayslipForm(true); }}><Plus className="w-4 h-4" />Nouveau bulletin</Btn>
            {salaries.length > 0 && (
              <Btn variant="success" onClick={downloadAllPayslipsPDF}><FileDown className="w-4 h-4" />PDF tous les bulletins</Btn>
            )}
            {genMsg && <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg">{genMsg}</span>}
          </div>

          {/* Synthèse */}
          {salaries.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total brut', val: salaries.reduce((s, p) => s + parseFloat(p.gross_salary as any || 0), 0), bg: 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200', lbl: 'text-indigo-500', vl: 'text-indigo-700' },
                { label: 'Total net', val: salaries.reduce((s, p) => s + parseFloat(p.net_salary as any || 0), 0), bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200', lbl: 'text-emerald-500', vl: 'text-emerald-700' },
                { label: 'Payés', val: salaries.filter(p => p.status === 'paid').reduce((s, p) => s + parseFloat(p.net_salary as any || 0), 0), bg: 'bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200', lbl: 'text-sky-500', vl: 'text-sky-700' },
                { label: 'En attente', val: salaries.filter(p => p.status === 'draft').reduce((s, p) => s + parseFloat(p.net_salary as any || 0), 0), bg: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200', lbl: 'text-amber-500', vl: 'text-amber-700' },
              ].map((s, i) => (
                <div key={i} className={`rounded-xl p-4 border text-center shadow-sm ${s.bg}`}>
                  <div className={`text-[11px] font-semibold uppercase tracking-wide ${s.lbl}`}>{s.label}</div>
                  <div className={`text-lg font-bold mt-1 ${s.vl}`}>{fmt(s.val)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tableau */}
          <Card bg="bg-gradient-to-br from-slate-50/40 to-gray-50/20" className="overflow-hidden border border-gray-200/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                  {['Employé','Période','Brut','Retenues','Net à payer','Statut',''].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {salaries.map(p => {
                  const ded = parseFloat(p.deductions as any || 0) + parseFloat(p.advance_deducted as any || 0);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar first={p.first_name} last={p.last_name} size="sm" />
                          <div>
                            <div className="font-medium text-gray-900">{p.first_name} {p.last_name}</div>
                            <div className="text-xs text-gray-400">{p.employee_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">{MONTHS_SHORT[p.payment_month - 1]} {p.payment_year}</span></td>
                      <td className="px-4 py-3 font-medium text-gray-700">{fmt(p.gross_salary)}</td>
                      <td className="px-4 py-3 text-gray-500">{ded > 0 ? `-${fmt(ded)}` : '—'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{fmt(p.net_salary)}</td>
                      <td className="px-4 py-3"><Badge status={p.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => downloadPayslipPDF(p.id)} title="Télécharger PDF" className="w-7 h-7 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition"><Download className="w-3 h-3" /></button>
                          <button onClick={() => { setEditingPayslip(p); setShowPayslipForm(true); }} className="w-7 h-7 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => deletePayslip(p.id)} className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {salaries.length === 0 && !loading && (
              <EmptyState icon={<FileText className="w-6 h-6" />} title={`Aucun bulletin pour ${MONTHS[filterMonth-1]} ${filterYear}`}
                action={<Btn variant="secondary" onClick={generatePayslips}><RefreshCw className="w-3.5 h-3.5" />Générer</Btn>} />
            )}
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          AVANCES
         ════════════════════════════════════════════════ */}
      {tab === 'advances' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex gap-2 flex-wrap items-center justify-between">
            <div className="flex gap-1.5">
              {(['all','pending','approved','repaid'] as const).map(f => {
                const labels: Record<string, string> = { all: 'Toutes', pending: 'En attente', approved: 'Approuvées', repaid: 'Remboursées' };
                const colors: Record<string, string> = {
                  all: advFilter === 'all' ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200/30' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50',
                  pending: advFilter === 'pending' ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-md shadow-amber-200/30' : 'bg-white text-gray-500 border border-gray-200 hover:bg-amber-50',
                  approved: advFilter === 'approved' ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-200/30' : 'bg-white text-gray-500 border border-gray-200 hover:bg-emerald-50',
                  repaid: advFilter === 'repaid' ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-white shadow-md shadow-cyan-200/30' : 'bg-white text-gray-500 border border-gray-200 hover:bg-cyan-50',
                };
                return (
                  <button key={f} onClick={() => setAdvFilter(f)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${colors[f]}`}>{labels[f]}</button>
                );
              })}
            </div>
            <Btn onClick={() => { setEditingAdvance(null); setShowAdvanceForm(true); }}><Plus className="w-4 h-4" />Nouvelle avance</Btn>
          </div>

          {/* Liste */}
          {filteredAdvances.length > 0 ? (
            <div className="space-y-2">
              {filteredAdvances.map(a => {
                const progress = a.repaid_amount ? (parseFloat(a.repaid_amount as any) / parseFloat(a.amount as any)) * 100 : 0;
                const statusBorder = a.status === 'pending' ? 'border-l-amber-400' : a.status === 'approved' ? 'border-l-emerald-400' : a.status === 'repaid' ? 'border-l-cyan-400' : 'border-l-rose-400';
                const advFill = a.status === 'pending' ? 'bg-gradient-to-br from-amber-50/50 to-orange-50/20' : a.status === 'approved' ? 'bg-gradient-to-br from-emerald-50/50 to-teal-50/20' : a.status === 'repaid' ? 'bg-gradient-to-br from-cyan-50/50 to-sky-50/20' : 'bg-gradient-to-br from-rose-50/50 to-pink-50/20';
                return (
                  <Card key={a.id} bg={advFill} className={`p-4 border-l-4 ${statusBorder} hover:shadow-md transition-all duration-200`}>
                    <div className="flex items-start gap-3">
                      <Avatar first={a.first_name} last={a.last_name} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <span className="font-semibold text-gray-900 text-sm">{a.first_name} {a.last_name}</span>
                            <span className="text-gray-400 text-xs ml-2">{a.employee_number}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge status={a.status} />
                            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{fmt(a.amount)}</span>
                          </div>
                        </div>

                        {a.reason && <p className="text-sm text-gray-500 mb-2 truncate">{a.reason}</p>}

                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(a.request_date).toLocaleDateString('fr-FR')}</span>
                          <span>{a.repayment_type === 'monthly' ? `${a.repayment_months} mois × ${fmt(a.monthly_deduction)}` : 'Remb. unique'}</span>
                        </div>

                        {a.status === 'approved' && (
                          <div className="mb-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">Remboursé</span>
                              <span className="font-medium text-gray-600">{fmt(a.repaid_amount)} / {fmt(a.amount)}</span>
                            </div>
                            <div className="h-2 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-full overflow-hidden ring-1 ring-indigo-100/40">
                              <div className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full transition-all shadow-sm" style={{ width: `${Math.min(progress, 100)}%` }} />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-1.5 mt-1">
                          {a.status === 'pending' && (
                            <>
                              <Btn size="sm" onClick={() => approveAdvance(a.id, 'approved')}><CheckCircle className="w-3 h-3" />Approuver</Btn>
                              <Btn size="sm" variant="danger" onClick={() => approveAdvance(a.id, 'rejected')}><XCircle className="w-3 h-3" />Rejeter</Btn>
                            </>
                          )}
                          <Btn size="sm" variant="ghost" onClick={() => { setEditingAdvance(a); setShowAdvanceForm(true); }}><Edit2 className="w-3 h-3" /></Btn>
                          <Btn size="sm" variant="ghost" onClick={() => deleteAdvance(a.id)}><Trash2 className="w-3 h-3" /></Btn>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<Banknote className="w-6 h-6" />} title="Aucune avance"
              action={<Btn onClick={() => { setEditingAdvance(null); setShowAdvanceForm(true); }}><Plus className="w-4 h-4" />Demander une avance</Btn>} />
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <ModuleAnalytics module="hr" title="Analytics RH & Paie" />
      )}

      {/* ── Modals ── */}
      {showEmployeeForm && <EmployeeForm employee={editingEmployee} onSave={() => { setShowEmployeeForm(false); fetchAll(); }} onCancel={() => setShowEmployeeForm(false)} />}
      {showAdvanceForm && <AdvanceForm employees={employees} advance={editingAdvance} onSave={() => { setShowAdvanceForm(false); fetchAll(); }} onCancel={() => setShowAdvanceForm(false)} />}
      {showPayslipForm && <PayslipForm employees={employees} payslip={editingPayslip} onSave={() => { setShowPayslipForm(false); fetchAll(); }} onCancel={() => setShowPayslipForm(false)} />}
    </div>
  );
};

export default HRDashboard;
