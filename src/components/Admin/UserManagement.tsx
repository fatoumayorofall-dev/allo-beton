import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, UserPlus, Shield, ShieldCheck, ShieldAlert,
  ToggleLeft, ToggleRight, Edit, Trash2, Search, X,
  AlertTriangle, Check, Eye, EyeOff, Lock, Unlock,
  Mail, Phone, Building2, Calendar, Crown, UserCheck,
  ChevronDown, ChevronUp, MoreVertical, RefreshCw,
  Activity, Clock, Filter, Download, UserCog, KeyRound,
  BadgeCheck, CircleUser, Briefcase, ArrowUpDown
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  getAllUsers, updateUserRole, toggleUserStatus,
  deleteUser, createUser, UserRole,
  getUserPermissionsAPI, saveUserPermissions, resetUserPermissions,
  MENU_RESOURCES, UserPermission
} from '../../services/roles';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  company?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const ROLES: { value: UserRole; label: string; desc: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }[] = [
  { value: 'admin', label: 'Administrateur', desc: 'Accès complet au système', icon: <Crown className="w-5 h-5" />, color: 'text-rose-600', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
  { value: 'manager', label: 'Gestionnaire', desc: 'Ventes, produits et rapports', icon: <Briefcase className="w-5 h-5" />, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { value: 'seller', label: 'Vendeur', desc: 'Création ventes et gestion clients', icon: <UserCheck className="w-5 h-5" />, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  { value: 'viewer', label: 'Lecteur', desc: 'Consultation uniquement', icon: <Eye className="w-5 h-5" />, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
];

const PERMISSIONS_MATRIX = MENU_RESOURCES.map(m => ({
  resource: m.id,
  label: m.label,
  group: m.group,
}));

function getRoleInfo(role: UserRole) {
  return ROLES.find(r => r.value === role) || ROLES[3];
}

function getInitials(user: User): string {
  const f = user.first_name?.[0] || '';
  const l = user.last_name?.[0] || '';
  if (f || l) return (f + l).toUpperCase();
  return user.email[0].toUpperCase();
}

function getAvatarGradient(role: UserRole): string {
  switch (role) {
    case 'admin': return 'from-rose-500 to-pink-600';
    case 'manager': return 'from-orange-500 to-indigo-600';
    case 'seller': return 'from-emerald-500 to-teal-600';
    case 'viewer': return 'from-gray-400 to-slate-500';
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeSince(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, 'an'], [2592000, 'mois'], [86400, 'j'], [3600, 'h'], [60, 'min']
  ];
  for (const [sec, label] of intervals) {
    const interval = Math.floor(seconds / sec);
    if (interval >= 1) return `${interval}${label}`;
  }
  return "À l'instant";
}

// ─── Modal Création Utilisateur ──────────────────────────────────────────────

interface InviteModalProps {
  onClose: () => void;
  onCreated: (user: User) => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    first_name: '', last_name: '',
    role: 'seller' as UserRole, company: '', phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const validateStep1 = (): string | null => {
    if (!form.first_name.trim() && !form.last_name.trim()) return 'Au moins un prénom ou nom requis';
    if (!form.email.trim()) return 'Email requis';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Format email invalide';
    return null;
  };

  const validateStep2 = (): string | null => {
    if (!form.password) return 'Mot de passe requis';
    if (form.password.length < 6) return 'Min. 6 caractères';
    if (form.password !== form.confirmPassword) return 'Les mots de passe ne correspondent pas';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setStep(2);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep2();
    if (err) { setError(err); return; }

    setLoading(true);
    const result = await createUser({
      email: form.email, password: form.password,
      first_name: form.first_name, last_name: form.last_name,
      role: form.role, company: form.company, phone: form.phone,
    });
    if (result.success && result.data) {
      onCreated(result.data as User);
    } else {
      setError(result.error || 'Erreur lors de la création');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-indigo-600 to-violet-700" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-20" />
          <div className="relative p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Nouvel utilisateur</h3>
                <p className="text-orange-200 text-sm">Étape {step} sur 2</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="relative h-1 bg-white/20">
            <div className={`h-full bg-white transition-all duration-500 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm animate-in slide-in-from-top-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prénom</label>
                  <div className="relative">
                    <CircleUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input name="first_name" value={form.first_name} onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all" placeholder="Jean" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom</label>
                  <div className="relative">
                    <CircleUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input name="last_name" value={form.last_name} onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all" placeholder="Dupont" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input name="email" type="email" value={form.email} onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all" placeholder="jean@exemple.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rôle <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button key={r.value} type="button" onClick={() => setForm({ ...form, role: r.value })}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${form.role === r.value
                        ? `${r.borderColor} ${r.bgColor} shadow-sm` : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                      <div className={`${r.color}`}>{r.icon}</div>
                      <div>
                        <p className={`text-sm font-semibold ${form.role === r.value ? r.color : 'text-gray-700'}`}>{r.label}</p>
                        <p className="text-[11px] text-gray-400">{r.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Entreprise</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input name="company" value={form.company} onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input name="phone" value={form.phone} onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="button" onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-600 to-indigo-600 text-white rounded-xl hover:from-orange-700 hover:to-indigo-700 text-sm font-semibold transition-all shadow-lg shadow-orange-200/50">
                  Suivant <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarGradient(form.role)} rounded-full flex items-center justify-center`}>
                  <span className="text-white text-sm font-bold">{(form.first_name[0] || form.email[0] || 'U').toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{form.first_name} {form.last_name}</p>
                  <p className="text-xs text-gray-500">{form.email} &middot; {getRoleInfo(form.role).label}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all" placeholder="Min. 6 caractères" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                        form.password.length >= i * 3 ? (form.password.length >= 12 ? 'bg-green-500' : form.password.length >= 8 ? 'bg-yellow-500' : 'bg-red-400') : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmer <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input name="confirmPassword" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={handleChange}
                    className={`w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                      form.confirmPassword && form.confirmPassword !== form.password ? 'border-red-300 focus:ring-red-500/30 focus:border-red-400' : 'border-gray-200 focus:ring-orange-500/30 focus:border-orange-400'
                    }`} placeholder="Répéter le mot de passe" />
                  {form.confirmPassword && form.confirmPassword === form.password && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => { setStep(1); setError(''); }}
                  className="px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-all">
                  Retour
                </button>
                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-600 to-indigo-600 text-white rounded-xl hover:from-orange-700 hover:to-indigo-700 text-sm font-semibold transition-all shadow-lg shadow-orange-200/50 disabled:opacity-50">
                  {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Créer le compte
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

// ─── Modal Changement de Rôle ────────────────────────────────────────────────

interface RoleModalProps {
  user: User;
  onClose: () => void;
  onUpdated: (userId: string, newRole: UserRole) => void;
}

const RoleModal: React.FC<RoleModalProps> = ({ user, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);

  const handleSave = async () => {
    if (selectedRole === user.role) { onClose(); return; }
    setLoading(true);
    const success = await updateUserRole(user.id, selectedRole);
    if (success) onUpdated(user.id, selectedRole);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarGradient(user.role)} rounded-full flex items-center justify-center`}>
                <span className="text-white text-sm font-bold">{getInitials(user)}</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Modifier le rôle</h3>
                <p className="text-sm text-gray-500">{user.first_name || user.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-2">
          {ROLES.map(r => (
            <button key={r.value} onClick={() => setSelectedRole(r.value)} disabled={loading}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                selectedRole === r.value ? `${r.borderColor} ${r.bgColor} shadow-sm` : 'border-transparent hover:bg-gray-50'
              }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.bgColor} ${r.color}`}>
                {r.icon}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${selectedRole === r.value ? r.color : 'text-gray-700'}`}>{r.label}</p>
                <p className="text-xs text-gray-400">{r.desc}</p>
              </div>
              {selectedRole === r.value && <Check className={`w-5 h-5 ${r.color}`} />}
              {user.role === r.value && selectedRole !== r.value && (
                <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Actuel</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 pt-2 flex justify-end gap-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-all">
            Annuler
          </button>
          <button onClick={handleSave} disabled={loading || selectedRole === user.role}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-indigo-600 text-white rounded-xl hover:from-orange-700 hover:to-indigo-700 text-sm font-semibold transition-all shadow-lg shadow-orange-200/50 disabled:opacity-40">
            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Suppression ───────────────────────────────────────────────────────

interface DeleteModalProps {
  user: User;
  onClose: () => void;
  onDeleted: (userId: string) => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ user, onClose, onDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const displayName = (user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}` : user.email;
  const canDelete = confirmText.toLowerCase() === 'supprimer';

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    const result = await deleteUser(user.id);
    if (result.success) {
      onDeleted(user.id);
    } else {
      setError(result.error || 'Erreur lors de la suppression');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 text-center">Supprimer cet utilisateur ?</h3>
          <p className="text-sm text-gray-500 text-center mt-1 mb-4">Cette action est irréversible.</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-4 flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarGradient(user.role)} rounded-full flex items-center justify-center shrink-0`}>
              <span className="text-white text-xs font-bold">{getInitials(user)}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{displayName}</p>
              <p className="text-xs text-gray-500">{user.email} &middot; {getRoleInfo(user.role).label}</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Tapez <span className="font-bold text-red-600">supprimer</span> pour confirmer
            </label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300 transition-all"
              placeholder="supprimer" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm mb-4">{error}</div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-all">
              Annuler
            </button>
            <button onClick={handleDelete} disabled={loading || !canDelete}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-all disabled:opacity-40">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Modal Permissions Interactives ──────────────────────────────────────────

interface PermissionModalProps {
  user: User;
  onClose: () => void;
  onSaved: () => void;
  currentUserId?: string;
  onRefreshProfile?: () => Promise<void>;
}

const PermissionModal: React.FC<PermissionModalProps> = ({ user, onClose, onSaved, currentUserId, onRefreshProfile }) => {
  const [perms, setPerms] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await getUserPermissionsAPI(user.id);
      if (result.success && result.data.length > 0) {
        setPerms(result.data);
      } else {
        setPerms(MENU_RESOURCES.map(m => ({ menu_id: m.id, can_create: false, can_read: false, can_update: false, can_delete: false })));
      }
      setLoading(false);
    })();
  }, [user.id]);

  const togglePerm = (menuId: string, field: keyof Omit<UserPermission, 'menu_id'>) => {
    setPerms(prev => prev.map(p => p.menu_id === menuId ? { ...p, [field]: !p[field] } : p));
  };

  const toggleAllForMenu = (menuId: string) => {
    setPerms(prev => {
      const current = prev.find(p => p.menu_id === menuId);
      if (!current) return prev;
      const allOn = current.can_create && current.can_read && current.can_update && current.can_delete;
      return prev.map(p => p.menu_id === menuId
        ? { ...p, can_create: !allOn, can_read: !allOn, can_update: !allOn, can_delete: !allOn }
        : p
      );
    });
  };

  const toggleColumn = (field: keyof Omit<UserPermission, 'menu_id'>) => {
    const allOn = perms.every(p => p[field]);
    setPerms(prev => prev.map(p => ({ ...p, [field]: !allOn })));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveUserPermissions(user.id, perms);
    if (result.success) {
      setToast('Permissions enregistrées');
      // Refresh le profil si c'est l'utilisateur connecté
      if (currentUserId === user.id && onRefreshProfile) {
        await onRefreshProfile();
      }
      setTimeout(() => { onSaved(); onClose(); }, 600);
    } else {
      setToast(result.error || 'Erreur');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setResetting(true);
    const result = await resetUserPermissions(user.id);
    if (result.success && result.data) {
      setPerms(result.data);
      setToast('Réinitialisé aux droits par défaut');
    }
    setResetting(false);
  };

  const roleInfo = getRoleInfo(user.role);
  const groups = Array.from(new Set(MENU_RESOURCES.map(m => m.group)));

  const GROUP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'Principal': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'Commercial': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Logistique': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    'Finance': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    'Outils': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    'Entreprise': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    'Systeme': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
          <div className="relative p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient(user.role)} rounded-full flex items-center justify-center shadow-lg`}>
                <span className="text-white text-sm font-bold">{getInitials(user)}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Permissions de {user.first_name || user.email}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold bg-white/20 text-white`}>
                    {roleInfo.label}
                  </span>
                  <span className="text-violet-200 text-xs">{user.email}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mx-5 mt-3 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-2 text-sm animate-in slide-in-from-top-2">
            <Check className="w-4 h-4" /> {toast}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* En-tête colonnes */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div className="flex-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Module</div>
                {[
                  { key: 'can_create' as const, label: 'Créer', color: 'text-emerald-600' },
                  { key: 'can_read' as const, label: 'Lire', color: 'text-orange-600' },
                  { key: 'can_update' as const, label: 'Modifier', color: 'text-amber-600' },
                  { key: 'can_delete' as const, label: 'Supprimer', color: 'text-red-600' },
                ].map(col => (
                  <button key={col.key} onClick={() => toggleColumn(col.key)}
                    className={`w-20 text-center text-[11px] font-bold uppercase tracking-wider ${col.color} hover:opacity-70 transition-opacity cursor-pointer`}
                    title={`Tout cocher/décocher: ${col.label}`}>
                    {col.label}
                  </button>
                ))}
                <div className="w-16 text-center text-[11px] font-bold text-gray-400 uppercase">Tout</div>
              </div>

              {/* Groupes de menus */}
              {groups.map(group => {
                const items = MENU_RESOURCES.filter(m => m.group === group);
                const gc = GROUP_COLORS[group] || GROUP_COLORS['Principal'];

                return (
                  <div key={group}>
                    <div className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg inline-block mb-2 ${gc.bg} ${gc.text}`}>
                      {group}
                    </div>
                    <div className="space-y-1">
                      {items.map(menu => {
                        const perm = perms.find(p => p.menu_id === menu.id);
                        if (!perm) return null;
                        const allOn = perm.can_create && perm.can_read && perm.can_update && perm.can_delete;
                        const someOn = perm.can_create || perm.can_read || perm.can_update || perm.can_delete;

                        return (
                          <div key={menu.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                            someOn ? `${gc.bg} ${gc.border}` : 'bg-gray-50/50 border-gray-100 opacity-60'
                          } hover:shadow-sm`}>
                            <div className="flex-1">
                              <span className={`text-sm font-semibold ${someOn ? 'text-gray-800' : 'text-gray-400'}`}>{menu.label}</span>
                            </div>
                            {(['can_create', 'can_read', 'can_update', 'can_delete'] as const).map(field => (
                              <div key={field} className="w-20 flex justify-center">
                                <button
                                  onClick={() => togglePerm(menu.id, field)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                    perm[field]
                                      ? field === 'can_create' ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                                        : field === 'can_read' ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                                        : field === 'can_update' ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                                        : 'bg-red-500 text-white shadow-sm shadow-red-200'
                                      : 'bg-white border border-gray-200 text-gray-300 hover:border-gray-300'
                                  }`}
                                >
                                  {perm[field] ? <Check className="w-4 h-4" /> : <X className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            ))}
                            <div className="w-16 flex justify-center">
                              <button
                                onClick={() => toggleAllForMenu(menu.id)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                  allOn
                                    ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-200'
                                    : 'bg-white border border-gray-200 text-gray-300 hover:border-indigo-300'
                                }`}
                              >
                                {allOn ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between rounded-b-2xl bg-gray-50/50">
          <button onClick={handleReset} disabled={resetting || loading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 font-medium transition-all disabled:opacity-40">
            {resetting ? <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Réinitialiser ({roleInfo.label})
          </button>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-5 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-all">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 text-sm font-bold transition-all shadow-lg shadow-indigo-200/50 disabled:opacity-40">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Onglet Rôles & Permissions ──────────────────────────────────────────────

const RolesPermissionsTab: React.FC<{ users: User[]; onEditPermissions: (user: User) => void }> = ({ users, onEditPermissions }) => {
  const [expandedRole, setExpandedRole] = useState<UserRole | null>('admin');
  const [allPerms, setAllPerms] = useState<Record<string, UserPermission[]>>({});
  const [loadingPerms, setLoadingPerms] = useState<Record<string, boolean>>({});

  const loadPermsForUser = async (userId: string) => {
    if (allPerms[userId]) return;
    setLoadingPerms(prev => ({ ...prev, [userId]: true }));
    const result = await getUserPermissionsAPI(userId);
    if (result.success) {
      setAllPerms(prev => ({ ...prev, [userId]: result.data }));
    }
    setLoadingPerms(prev => ({ ...prev, [userId]: false }));
  };

  return (
    <div className="space-y-6">
      {/* Grille des utilisateurs avec leurs permissions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Droits par utilisateur</h3>
              <p className="text-sm text-gray-400">Cliquez sur un utilisateur pour modifier ses droits</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {users.map(user => {
            const roleInfo = getRoleInfo(user.role);
            const userPerms = allPerms[user.id];
            const isLoading = loadingPerms[user.id];

            return (
              <div key={user.id} className="hover:bg-orange-50/30 transition-colors">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(user.role)} flex items-center justify-center shadow-sm`}>
                    <span className="text-white text-xs font-bold">{getInitials(user)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${roleInfo.color}`}>
                      {React.cloneElement(roleInfo.icon as React.ReactElement, { className: 'w-3 h-3' })}
                      {roleInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { loadPermsForUser(user.id); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
                      title="Voir les droits">
                      {isLoading ? <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      Voir
                    </button>
                    <button onClick={() => onEditPermissions(user)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all">
                      <Edit className="w-3.5 h-3.5" /> Modifier
                    </button>
                  </div>
                </div>

                {/* Permissions en ligne */}
                {userPerms && (
                  <div className="px-5 pb-4">
                    <div className="bg-gray-50 rounded-xl p-3 overflow-x-auto">
                      <div className="flex gap-1.5 flex-wrap">
                        {MENU_RESOURCES.map(menu => {
                          const perm = userPerms.find(p => p.menu_id === menu.id);
                          const hasAny = perm && (perm.can_create || perm.can_read || perm.can_update || perm.can_delete);
                          const hasAll = perm && perm.can_create && perm.can_read && perm.can_update && perm.can_delete;

                          return (
                            <div key={menu.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                              hasAll ? 'bg-green-50 text-green-700 border-green-200'
                                : hasAny ? 'bg-orange-50 text-orange-600 border-orange-200'
                                : 'bg-gray-100 text-gray-300 border-gray-200'
                            }`}>
                              {hasAll ? <ShieldCheck className="w-3 h-3" /> : hasAny ? <Shield className="w-3 h-3" /> : <X className="w-2.5 h-2.5" />}
                              {menu.label}
                              {hasAny && !hasAll && (
                                <span className="opacity-60">
                                  ({[perm?.can_create && 'C', perm?.can_read && 'L', perm?.can_update && 'M', perm?.can_delete && 'S'].filter(Boolean).join('')})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Onglet Activité (Audit Logs) ────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

interface AuditLog {
  id: number;
  user_id: string;
  user_email: string;
  user_name: string;
  action: 'create' | 'update' | 'delete';
  module: string;
  resource_id: string | null;
  description: string;
  details: any;
  ip_address: string;
  created_at: string;
}

interface AuditStats {
  todayStats: { action: string; count: number }[];
  topUsers: { user_id: string; user_name: string; user_email: string; action_count: number }[];
  topModules: { module: string; count: number }[];
  recent: AuditLog[];
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  create: { icon: <UserPlus className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100', label: 'Création' },
  update: { icon: <Edit className="w-4 h-4" />, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Modification' },
  delete: { icon: <Trash2 className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-100', label: 'Suppression' },
};

const MODULE_LABELS: Record<string, string> = {
  sales: 'Ventes', customers: 'Clients', products: 'Produits',
  suppliers: 'Fournisseurs', payments: 'Paiements', users: 'Utilisateurs',
  banks: 'Banques', partners: 'Partenaires', hr: 'RH',
  ecommerce: 'E-commerce', cash: 'Caisse', settings: 'Paramètres',
  transport: 'Transport',
};

const ActivityTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Charger les stats
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/audit/stats`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) { console.error('Erreur stats audit:', err); }
    })();
  }, []);

  // Charger les logs
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '30' });
        if (filterModule) params.set('module', filterModule);
        if (filterAction) params.set('action', filterAction);
        if (debouncedSearch) params.set('search', debouncedSearch);
        const res = await fetch(`${API_BASE}/auth/audit/logs?${params}`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs);
          setTotalPages(data.pages);
          setTotal(data.total);
        }
      } catch (err) { console.error('Erreur logs audit:', err); }
      setLoading(false);
    })();
  }, [page, filterModule, filterAction, debouncedSearch]);

  // Reset page quand filtres changent
  useEffect(() => { setPage(1); }, [filterModule, filterAction, debouncedSearch]);

  const todayCreate = stats?.todayStats.find(s => s.action === 'create')?.count || 0;
  const todayUpdate = stats?.todayStats.find(s => s.action === 'update')?.count || 0;
  const todayDelete = stats?.todayStats.find(s => s.action === 'delete')?.count || 0;
  const todayTotal = todayCreate + todayUpdate + todayDelete;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Stats du jour */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg"><Activity className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayTotal}</p>
              <p className="text-xs text-gray-500">Actions aujourd'hui</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><UserPlus className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-green-600">{todayCreate}</p>
              <p className="text-xs text-gray-500">Créations</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg"><Edit className="w-5 h-5 text-orange-600" /></div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{todayUpdate}</p>
              <p className="text-xs text-gray-500">Modifications</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg"><Trash2 className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold text-red-600">{todayDelete}</p>
              <p className="text-xs text-gray-500">Suppressions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top utilisateurs (7 jours) */}
      {stats?.topUsers && stats.topUsers.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" /> Utilisateurs les plus actifs (7 jours)
          </h3>
          <div className="flex flex-wrap gap-3">
            {stats.topUsers.map((u, i) => (
              <div key={u.user_id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                  {(u.user_name || u.user_email)[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{u.user_name || u.user_email}</p>
                  <p className="text-xs text-gray-500">{u.action_count} actions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans les logs..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <select
            value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les modules</option>
            {Object.entries(MODULE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Toutes les actions</option>
            <option value="create">Création</option>
            <option value="update">Modification</option>
            <option value="delete">Suppression</option>
          </select>
          <span className="text-xs text-gray-500">{total} résultat{total > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table des logs */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Aucune activité enregistrée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(log => {
                  const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.update;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs">{formatDate(log.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                            {(log.user_name || log.user_email)[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-800">{log.user_name || '-'}</p>
                            <p className="text-[10px] text-gray-400">{log.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-700">
                          {MODULE_LABELS[log.module] || log.module}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-700 max-w-md truncate">{log.description}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] text-gray-400 font-mono">{log.ip_address || '-'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page} / {totalPages} — {total} entrée{total > 1 ? 's' : ''}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-xs rounded border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Précédent
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-xs rounded border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Composant Principal ─────────────────────────────────────────────────────

type Tab = 'users' | 'roles' | 'activity';

export const UserManagement: React.FC = () => {
  const { profile, refreshProfile } = useAuthContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'role'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modales
  const [showInvite, setShowInvite] = useState(false);
  const [roleUser, setRoleUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [permUser, setPermUser] = useState<User | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const result = await getAllUsers();
    if (result.success) setUsers(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Filtrage et tri
  const filtered = useMemo(() => {
    let list = users.filter(u => {
      const matchRole = filterRole === 'all' || u.role === filterRole;
      const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.is_active : !u.is_active);
      const q = search.toLowerCase();
      const matchSearch = !q ||
        u.email.toLowerCase().includes(q) ||
        (u.first_name || '').toLowerCase().includes(q) ||
        (u.last_name || '').toLowerCase().includes(q) ||
        (u.company || '').toLowerCase().includes(q);
      return matchRole && matchStatus && matchSearch;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email;
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.email;
        cmp = nameA.localeCompare(nameB, 'fr');
      } else if (sortBy === 'role') {
        const order: Record<UserRole, number> = { admin: 0, manager: 1, seller: 2, viewer: 3 };
        cmp = order[a.role] - order[b.role];
      } else {
        cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [users, filterRole, filterStatus, search, sortBy, sortDir]);

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    sellers: users.filter(u => u.role === 'seller').length,
    viewers: users.filter(u => u.role === 'viewer').length,
  }), [users]);

  // Handlers
  const handleCreated = (user: User) => {
    setUsers(prev => [user, ...prev]);
    setShowInvite(false);
  };

  const handleRoleUpdated = (userId: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setRoleUser(null);
  };

  const handleDeleted = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    setDeleteTarget(null);
  };

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    const success = await toggleUserStatus(userId, !currentActive);
    if (success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentActive } : u));
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-600/30 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500 font-medium">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'users', label: 'Utilisateurs', icon: <Users className="w-4 h-4" />, count: stats.total },
    { id: 'roles', label: 'Rôles & Permissions', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'activity', label: 'Activité', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-lg">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-100/40 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-100/30 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4" />
        </div>

        <div className="relative p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
              <p className="text-gray-500 text-sm mt-0.5">Gestion des utilisateurs, rôles et permissions</p>
            </div>
          </div>
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-3 rounded-xl hover:from-indigo-600 hover:to-violet-700 text-sm font-bold transition-all shadow-md shadow-indigo-200/40 hover:shadow-lg">
            <UserPlus className="w-4 h-4" /> Nouvel utilisateur
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { label: 'Total', value: stats.total, bg: 'bg-orange-50', border: 'border-orange-200', iconBg: 'bg-orange-100', textColor: 'text-orange-700', icon: <Users className="w-4 h-4 text-orange-600" /> },
            { label: 'Actifs', value: stats.active, bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100', textColor: 'text-emerald-700', icon: <BadgeCheck className="w-4 h-4 text-emerald-600" /> },
            { label: 'Admins', value: stats.admins, bg: 'bg-rose-50', border: 'border-rose-200', iconBg: 'bg-rose-100', textColor: 'text-rose-700', icon: <Crown className="w-4 h-4 text-rose-600" /> },
            { label: 'Vendeurs', value: stats.sellers, bg: 'bg-violet-50', border: 'border-violet-200', iconBg: 'bg-violet-100', textColor: 'text-violet-700', icon: <UserCog className="w-4 h-4 text-violet-600" /> },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3.5 border ${s.border} hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between mb-1">
                <div className={`w-8 h-8 ${s.iconBg} rounded-lg flex items-center justify-center`}>
                  {s.icon}
                </div>
              </div>
              <p className={`text-2xl font-bold ${s.textColor}`}>{s.value}</p>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{s.label}</p>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-1 p-2 border-b border-gray-100">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-orange-500 to-indigo-600 text-white shadow-md shadow-orange-200/40'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}

          <div className="flex-1" />

          <button onClick={loadUsers}
            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all" title="Actualiser">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="p-5">
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Filters bar */}
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Rechercher par nom, email ou entreprise..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/25 focus:border-orange-300 transition-all bg-gray-50/50" />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {/* Role filter */}
                  {(['all', 'admin', 'manager', 'seller', 'viewer'] as (UserRole | 'all')[]).map(r => (
                    <button key={r} onClick={() => setFilterRole(r)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        filterRole === r
                          ? 'bg-gradient-to-r from-orange-500 to-indigo-600 text-white shadow-md shadow-orange-200/30'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200/60'
                      }`}>
                      {r === 'all' ? 'Tous' : getRoleInfo(r).label}
                      {r !== 'all' && <span className="ml-1 opacity-70">({users.filter(u => u.role === r).length})</span>}
                    </button>
                  ))}

                  {/* Status filter */}
                  <div className="border-l border-gray-200 pl-2 flex gap-1">
                    {(['all', 'active', 'inactive'] as const).map(s => (
                      <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                          filterStatus === s
                            ? s === 'active' ? 'bg-green-100 text-green-700' : s === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}>
                        {s === 'all' ? 'Statut' : s === 'active' ? 'Actifs' : 'Inactifs'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results info */}
              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-400 font-medium">
                  {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
                  {(search || filterRole !== 'all' || filterStatus !== 'all') && ` sur ${users.length}`}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleSort('name')} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${sortBy === 'name' ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    Nom <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <button onClick={() => toggleSort('date')} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${sortBy === 'date' ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    Date <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <button onClick={() => toggleSort('role')} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${sortBy === 'role' ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    Rôle <ArrowUpDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* User Table */}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/80 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                        <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                        <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                        <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Inscription</th>
                        <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-base font-semibold text-gray-500 mb-1">Aucun utilisateur trouvé</p>
                            <p className="text-sm text-gray-400">Essayez de modifier vos filtres de recherche</p>
                          </td>
                        </tr>
                      ) : filtered.map(user => {
                        const roleInfo = getRoleInfo(user.role);
                        return (
                          <tr key={user.id} className="hover:bg-orange-50/30 transition-colors group">
                            {/* Utilisateur */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(user.role)} flex items-center justify-center shadow-sm`}>
                                    <span className="text-white text-xs font-bold">{getInitials(user)}</span>
                                  </div>
                                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${user.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                                  </p>
                                  {user.company && <p className="text-xs text-gray-400 flex items-center gap-1"><Building2 className="w-3 h-3" />{user.company}</p>}
                                </div>
                              </div>
                            </td>

                            {/* Rôle */}
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${roleInfo.bgColor} ${roleInfo.color} border ${roleInfo.borderColor}`}>
                                {roleInfo.icon && React.cloneElement(roleInfo.icon as React.ReactElement, { className: 'w-3 h-3' })}
                                {roleInfo.label}
                              </span>
                            </td>

                            {/* Contact */}
                            <td className="px-5 py-3.5">
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-400" />{user.email}</p>
                                {user.phone && <p className="text-xs text-gray-400 flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" />{user.phone}</p>}
                              </div>
                            </td>

                            {/* Statut */}
                            <td className="px-5 py-3.5">
                              <button onClick={() => handleToggleStatus(user.id, user.is_active)}
                                className="flex items-center gap-2 group/toggle">
                                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${user.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${user.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </div>
                                <span className={`text-xs font-medium ${user.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                                  {user.is_active ? 'Actif' : 'Inactif'}
                                </span>
                              </button>
                            </td>

                            {/* Date */}
                            <td className="px-5 py-3.5">
                              <div>
                                <p className="text-xs text-gray-600 font-medium">{formatDate(user.created_at)}</p>
                                <p className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{timeSince(user.created_at)}</p>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => setPermUser(user)}
                                  className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all" title="Permissions">
                                  <KeyRound className="w-4 h-4" />
                                </button>
                                <button onClick={() => setRoleUser(user)}
                                  className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all" title="Modifier le rôle">
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteTarget(user)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Supprimer">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && <RolesPermissionsTab users={users} onEditPermissions={(u) => setPermUser(u)} />}

          {activeTab === 'activity' && <ActivityTab />}
        </div>
      </div>

      {/* Modales */}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCreated={handleCreated} />}
      {roleUser && <RoleModal user={roleUser} onClose={() => setRoleUser(null)} onUpdated={handleRoleUpdated} />}
      {deleteTarget && <DeleteModal user={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />}
      {permUser && <PermissionModal user={permUser} onClose={() => setPermUser(null)} onSaved={loadUsers} currentUserId={profile?.id} onRefreshProfile={refreshProfile} />}
    </div>
  );
};
