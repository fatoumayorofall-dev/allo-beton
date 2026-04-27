import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Bell, Shield, Database, Palette, Building2, Globe,
  Save, CheckCircle, AlertCircle, RefreshCw, Mail, Phone,
  MapPin, FileText, CreditCard, Clock, Sun, Moon, Download,
  Upload, Trash2, HardDrive, Key, User, Zap, ChevronRight,
  Sparkles, Camera, X
} from 'lucide-react';
import { updateSettingsCache } from '../../services/settings';
import api from '../../services/mysql-api';
import { NotificationSettings } from './NotificationSettings';

interface SettingsPageProps {
  onClose: () => void;
}

interface SettingsData {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo: string;
  currency: string;
  taxRate: number;
  invoicePrefix: string;
  quotePrefix: string;
  orderPrefix: string;
  language: string;
  timezone: string;
  dateFormat: string;
  weatherCity: string;
  weatherCountry: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  lowStockAlert: boolean;
  lowStockThreshold: number;
  paymentReminders: boolean;
  reminderDays: number;
  autoBackup: boolean;
  backupFrequency: string;
  theme: string;
  sidebarCollapsed: boolean;
}

const DEFAULT_SETTINGS: SettingsData = {
  companyName: 'Allo Beton SARL',
  companyAddress: 'Dakar, Senegal',
  companyPhone: '+221 77 000 00 00',
  companyEmail: 'contact@allobeton.sn',
  companyLogo: '',
  currency: 'FCFA',
  taxRate: 18,
  invoicePrefix: 'FAC-',
  quotePrefix: 'DEV-',
  orderPrefix: 'CMD-',
  language: 'fr',
  timezone: 'Africa/Dakar',
  dateFormat: 'DD/MM/YYYY',
  weatherCity: 'Dakar',
  weatherCountry: 'SN',
  emailNotifications: true,
  smsNotifications: false,
  lowStockAlert: true,
  lowStockThreshold: 10,
  paymentReminders: true,
  reminderDays: 3,
  autoBackup: true,
  backupFrequency: 'daily',
  theme: 'light',
  sidebarCollapsed: false,
};

const TABS = [
  { id: 'company',       label: 'Entreprise',    icon: Building2,  bg: 'bg-orange-500'    },
  { id: 'finance',       label: 'Finances',      icon: CreditCard, bg: 'bg-emerald-500' },
  { id: 'regional',      label: 'Regional',      icon: Globe,      bg: 'bg-violet-500'  },
  { id: 'notifications', label: 'Notifications', icon: Bell,       bg: 'bg-amber-500'   },
  { id: 'data',          label: 'Donnees',        icon: Database,   bg: 'bg-cyan-500'    },
  { id: 'appearance',    label: 'Apparence',     icon: Palette,    bg: 'bg-pink-500'    },
  { id: 'security',      label: 'Securite',       icon: Shield,     bg: 'bg-red-500'     },
];

interface InputProps {
  label: string; value: string | number; onChange: (v: string | number) => void;
  type?: string; icon?: React.ElementType; placeholder?: string; helper?: string;
}
const InputField: React.FC<InputProps> = ({ label, value, onChange, type = 'text', icon: Icon, placeholder, helper }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
      {Icon && <Icon className="w-4 h-4 text-gray-400" />}{label}
    </label>
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
    />
    {helper && <p className="text-xs text-gray-400">{helper}</p>}
  </div>
);

interface SelectProps {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; icon?: React.ElementType;
}
const SelectField: React.FC<SelectProps> = ({ label, value, onChange, options, icon: Icon }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
      {Icon && <Icon className="w-4 h-4 text-gray-400" />}{label}
    </label>
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
    </div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button type="button" onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

interface CardProps { title: string; subtitle?: string; icon: React.ElementType; iconBg: string; children: React.ReactNode; }
const Card: React.FC<CardProps> = ({ title, subtitle, icon: Icon, iconBg, children }) => (
  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
      <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

interface ToggleRowProps { icon: React.ElementType; iconBg: string; title: string; description: string; checked: boolean; onChange: (v: boolean) => void; }
const ToggleRow: React.FC<ToggleRowProps> = ({ icon: Icon, iconBg, title, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 truncate">{description}</p>
      </div>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

export const SettingsPage: React.FC<SettingsPageProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [original, setOriginal] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/settings');
        if (r.success && r.data) {
          const d = { ...DEFAULT_SETTINGS, ...r.data };
          setSettings(d); setOriginal(d);
        }
      } catch { /* use defaults */ } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(original));
  }, [settings, original]);

  const set = useCallback(<K extends keyof SettingsData>(k: K, v: SettingsData[K]) => {
    setSettings((p) => ({ ...p, [k]: v }));
  }, []);

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const r = await api.put('/settings', settings);
      if (!r.success) throw new Error(r.error || 'Erreur sauvegarde');
      updateSettingsCache(settings);
      setOriginal(settings); setHasChanges(false);
      setMsg({ type: 'success', text: 'Parametres sauvegardes avec succes !' });
      setTimeout(() => setMsg(null), 4000);
    } catch (e: unknown) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Erreur sauvegarde' });
    } finally { setSaving(false); }
  };

  const handleReset = () => { setSettings(original); setMsg(null); };

  const renderContent = () => {
    switch (activeTab) {

      case 'company': return (
        <div className="space-y-5">
          <Card icon={Building2} iconBg="bg-orange-500" title="Informations entreprise" subtitle="Identite et coordonnees">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-5">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-md">
                  {settings.companyLogo
                    ? <img src={settings.companyLogo} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                    : <Building2 className="w-8 h-8 text-white" />}
                </div>
                <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full shadow border border-gray-200 flex items-center justify-center">
                  <Camera className="w-3 h-3 text-gray-500" />
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Logo</p>
                <p className="text-xs text-gray-500 mb-2">JPG, PNG ou SVG - max 2 MB</p>
                <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">Changer</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Nom entreprise" value={settings.companyName} onChange={(v) => set('companyName', v as string)} icon={Building2} placeholder="Allo Beton SARL" />
              <InputField label="Email" value={settings.companyEmail} onChange={(v) => set('companyEmail', v as string)} type="email" icon={Mail} placeholder="contact@allobeton.sn" />
              <InputField label="Telephone" value={settings.companyPhone} onChange={(v) => set('companyPhone', v as string)} icon={Phone} placeholder="+221 77 000 00 00" />
              <InputField label="Adresse" value={settings.companyAddress} onChange={(v) => set('companyAddress', v as string)} icon={MapPin} placeholder="Dakar, Senegal" />
            </div>
          </Card>
        </div>
      );

      case 'finance': return (
        <div className="space-y-5">
          <Card icon={CreditCard} iconBg="bg-emerald-500" title="Devise & Taxes" subtitle="Monnaie et taux TVA">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField label="Devise" value={settings.currency} onChange={(v) => set('currency', v)} icon={CreditCard}
                options={[{ value:'FCFA',label:'Franc CFA (FCFA)' },{ value:'EUR',label:'Euro (EUR)' },{ value:'USD',label:'Dollar US (USD)' },{ value:'MAD',label:'Dirham (MAD)' }]} />
              <InputField label="Taux TVA (%)" value={settings.taxRate} onChange={(v) => set('taxRate', v as number)} type="number" helper="Applique automatiquement sur les documents" />
            </div>
          </Card>
          <Card icon={FileText} iconBg="bg-violet-500" title="Prefixes documents" subtitle="Numerotation automatique">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Factures" value={settings.invoicePrefix} onChange={(v) => set('invoicePrefix', v as string)} placeholder="FAC-" helper="Ex: FAC-2024-001" />
              <InputField label="Devis" value={settings.quotePrefix} onChange={(v) => set('quotePrefix', v as string)} placeholder="DEV-" helper="Ex: DEV-2024-001" />
              <InputField label="Commandes" value={settings.orderPrefix} onChange={(v) => set('orderPrefix', v as string)} placeholder="CMD-" helper="Ex: CMD-2024-001" />
            </div>
          </Card>
        </div>
      );

      case 'regional': return (
        <div className="space-y-5">
          <Card icon={Globe} iconBg="bg-violet-500" title="Langue & Localisation" subtitle="Format regional">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectField label="Langue" value={settings.language} onChange={(v) => set('language', v)} icon={Globe}
                options={[{ value:'fr',label:'Francais' },{ value:'en',label:'English' },{ value:'wo',label:'Wolof' },{ value:'ar',label:'Arabe' }]} />
              <SelectField label="Fuseau horaire" value={settings.timezone} onChange={(v) => set('timezone', v)} icon={Clock}
                options={[{ value:'Africa/Dakar',label:'Dakar (GMT+0)' },{ value:'Africa/Casablanca',label:'Casablanca (GMT+1)' },{ value:'Europe/Paris',label:'Paris (GMT+1/+2)' },{ value:'Africa/Lagos',label:'Lagos (GMT+1)' }]} />
              <SelectField label="Format date" value={settings.dateFormat} onChange={(v) => set('dateFormat', v)} icon={Clock}
                options={[{ value:'DD/MM/YYYY',label:'DD/MM/YYYY' },{ value:'MM/DD/YYYY',label:'MM/DD/YYYY' },{ value:'YYYY-MM-DD',label:'YYYY-MM-DD' }]} />
            </div>
          </Card>
          <Card icon={Sun} iconBg="bg-amber-500" title="Widget Meteo" subtitle="Ville affichee sur le tableau de bord">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField label="Ville" value={settings.weatherCity} onChange={(v) => set('weatherCity', v)} icon={MapPin}
                options={[{ value:'GPS',label:'Position GPS (recommande)' },{ value:'Dakar',label:'Dakar' },{ value:'Thies',label:'Thies' },{ value:'Saint-Louis',label:'Saint-Louis' },{ value:'Abidjan',label:'Abidjan' },{ value:'Paris',label:'Paris' }]} />
              <SelectField label="Pays" value={settings.weatherCountry} onChange={(v) => set('weatherCountry', v)} icon={Globe}
                options={[{ value:'SN',label:'Senegal' },{ value:'CI',label:"Cote d Ivoire" },{ value:'ML',label:'Mali' },{ value:'MA',label:'Maroc' },{ value:'FR',label:'France' }]} />
            </div>
            <div className={`mt-4 flex items-center gap-3 p-3 rounded-xl text-sm ${settings.weatherCity === 'GPS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{settings.weatherCity === 'GPS' ? 'Meteo basee sur votre position GPS actuelle' : `Meteo pour : ${settings.weatherCity}, ${settings.weatherCountry}`}</span>
            </div>
          </Card>
        </div>
      );

      case 'notifications': return <NotificationSettings />;

      case 'data': return (
        <div className="space-y-5">
          <Card icon={HardDrive} iconBg="bg-cyan-500" title="Sauvegarde automatique" subtitle="Protection des donnees">
            <ToggleRow icon={HardDrive} iconBg="bg-cyan-500" title="Sauvegarde auto" description="Planifier des sauvegardes regulieres" checked={settings.autoBackup} onChange={(v) => set('autoBackup', v)} />
            {settings.autoBackup && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <SelectField label="Frequence" value={settings.backupFrequency} onChange={(v) => set('backupFrequency', v)} icon={Clock}
                  options={[{ value:'hourly',label:'Toutes les heures' },{ value:'daily',label:'Quotidienne' },{ value:'weekly',label:'Hebdomadaire' },{ value:'monthly',label:'Mensuelle' }]} />
              </div>
            )}
          </Card>
          <Card icon={Database} iconBg="bg-teal-500" title="Gestion donnees" subtitle="Import, export, restauration">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label:'Exporter', desc:'JSON / CSV', icon:Download, bg:'bg-orange-500', wrap:'bg-orange-50 border-orange-100 hover:bg-orange-100' },
                { label:'Sauvegarder', desc:'Cloud securise', icon:Upload, bg:'bg-emerald-500', wrap:'bg-emerald-50 border-emerald-100 hover:bg-emerald-100' },
                { label:'Restaurer', desc:'Depuis backup', icon:RefreshCw, bg:'bg-amber-500', wrap:'bg-amber-50 border-amber-100 hover:bg-amber-100' },
              ].map((a) => (
                <button key={a.label} className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${a.wrap} transition-colors group`}>
                  <div className={`w-10 h-10 ${a.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <a.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{a.label}</span>
                  <span className="text-xs text-gray-500">{a.desc}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      );

      case 'appearance': return (
        <div className="space-y-5">
          <Card icon={Palette} iconBg="bg-pink-500" title="Theme interface" subtitle="Personnalisez l'apparence">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id:'light', label:'Clair', desc:'Interface lumineuse', icon:Sun, from:'from-amber-50',to:'to-yellow-50', iconColor:'text-amber-500', ib:'bg-amber-100' },
                { id:'dark', label:'Sombre', desc:'Interface nocturne', icon:Moon, from:'from-slate-700',to:'to-slate-800', iconColor:'text-indigo-400', ib:'bg-slate-600' },
                { id:'auto', label:'Auto', desc:"Selon l'heure", icon:Sparkles, from:'from-violet-50',to:'to-purple-50', iconColor:'text-violet-500', ib:'bg-violet-100' },
              ].map((t) => (
                <button key={t.id} onClick={() => set('theme', t.id)}
                  className={`relative p-4 rounded-2xl border-2 transition-all ${settings.theme === t.id ? 'border-indigo-500 ring-4 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`h-16 bg-gradient-to-br ${t.from} ${t.to} rounded-xl mb-3 flex items-center justify-center`}>
                    <div className={`w-9 h-9 ${t.ib} rounded-xl flex items-center justify-center`}>
                      <t.icon className={`w-5 h-5 ${t.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 text-center">{t.label}</p>
                  <p className="text-xs text-gray-500 text-center mt-0.5">{t.desc}</p>
                  {settings.theme === t.id && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Card>
          <Card icon={Zap} iconBg="bg-violet-500" title="Preferences d'affichage" subtitle="Mise en page">
            <ToggleRow icon={Zap} iconBg="bg-violet-500" title="Barre laterale reduite" description="Demarrer avec le menu plie" checked={settings.sidebarCollapsed} onChange={(v) => set('sidebarCollapsed', v)} />
          </Card>
        </div>
      );

      case 'security': return (
        <div className="space-y-5">
          <Card icon={Shield} iconBg="bg-red-500" title="Securite du compte" subtitle="Acces et authentification">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center"><Key className="w-4 h-4 text-white" /></div>
                  <div><p className="text-sm font-semibold text-gray-900">Mot de passe</p><p className="text-xs text-gray-500">Derniere modification : il y a 30 jours</p></div>
                </div>
                <button className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors">Modifier</button>
              </div>
              <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
                  <div><p className="text-sm font-semibold text-gray-900">Double authentification (2FA)</p><p className="text-xs text-gray-500">Securisation supplementaire recommandee</p></div>
                </div>
                <span className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-xl">Desactive</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center"><User className="w-4 h-4 text-white" /></div>
                  <div><p className="text-sm font-semibold text-gray-900">Sessions actives</p><p className="text-xs text-gray-500">1 appareil connecte</p></div>
                </div>
                <button className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors">Gerer</button>
              </div>
            </div>
          </Card>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"><Trash2 className="w-4 h-4 text-white" /></div>
              <div>
                <p className="text-sm font-semibold text-red-900">Zone dangereuse</p>
                <p className="text-xs text-red-600 mt-0.5 mb-3">Cette action est irreversible. Toutes vos donnees seront supprimees.</p>
                <button className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors">Supprimer le compte</button>
              </div>
            </div>
          </div>
        </div>
      );

      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 font-medium">Chargement des parametres...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Parametres</h1>
            <p className="text-xs text-gray-500">Configurez votre espace de travail</p>
          </div>
        </div>
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium">
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Fermer</span>
        </button>
      </div>

      {/* Message toast */}
      {msg && (
        <div className={`mx-6 mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* Layout */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-gray-200 bg-white min-h-screen px-3 py-5">
          <nav className="space-y-1">
            {TABS.map(({ id, label, icon: Icon, bg }) => {
              const active = activeTab === id;
              return (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                  <div className={`w-7 h-7 ${active ? 'bg-white/20' : bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  {label}
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6">
          <div className="max-w-3xl">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Footer bar */}
      {activeTab !== 'notifications' && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
          <div>
            {hasChanges && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Modifications non sauvegardees
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />Annuler
              </button>
            )}
            <button onClick={handleSave} disabled={saving || !hasChanges}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-md shadow-indigo-200">
              {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sauvegarde...</> : <><Save className="w-3.5 h-3.5" />Sauvegarder</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
