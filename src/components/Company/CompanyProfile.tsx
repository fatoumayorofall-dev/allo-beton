import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2,
  MapPin,
  Users,
  Truck,
  Pickaxe,
  Globe,
  BadgeCheck,
  Landmark,
  ChevronDown,
  ChevronUp,
  Package,
  Banknote,
  HardHat,
  Factory,
  Route,
  FileText,
  Phone,
  Mail,
  Award,
  Target,
  Eye,
  Heart,
  Shield,
  TrendingUp,
  Download,
  Printer,
  Search,
  Star,
  Clock,
  Briefcase,
  Gauge,
  MapPinned,
  Gem,
  Zap,
  CheckCircle2,
  CircleDot,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

// ─── Types ───────────────────────────────────────────────────────────

type TabKey = 'overview' | 'activities' | 'resources' | 'network' | 'legal';

// ─── Données entreprise ICOPS SUARL ─────────────────────────────────

const companyInfo = {
  name: 'ICOPS SUARL',
  fullName: 'Intermédiaire Commercial et Prestations de Services',
  founder: 'Alioune CISSE',
  founderTitle: 'Fondateur & Gérant',
  founderDescription:
    "Opérateur économique sénégalais, diplômé du Diplôme Supérieur d'Études Comptable et de Gestion de l'École Supérieure Polytechnique de Dakar (2010). Parcours de près d'une décennie en banque (2011-2021), puis Directeur Général à MEDY INDUSTIES.",
  legalForm: 'Société Unipersonnelle à Responsabilité Limitée (SUARL)',
  capital: '1 000 000 FCFA',
  registrationNumber: 'SN.DKR.2022. B.765',
  registrationType: 'Registre du Commerce et du Crédit Mobilier de Dakar',
  yearFounded: 2022,
  headquarters: 'Cité Colgate, Rufisque',
  country: 'Sénégal',
  terrain: 'Terrain de 1 000 m² à Sindia (aire de stationnement camions)',
  phone: '+221 77 000 00 00',
  email: 'contact@icops.sn',
  website: 'www.icops.sn',
  ninea: '009876543',
  mission:
    "Fournir des solutions logistiques et d'approvisionnement fiables en matériaux de construction, tout en contribuant au développement économique du Sénégal.",
  vision:
    "Devenir le leader national du transport de matériaux de construction et de l'exploitation de carrières d'ici 2030.",
  values: [
    { title: 'Fiabilité', desc: 'Respect des engagements et des délais', icon: Shield },
    { title: 'Excellence', desc: 'Recherche permanente de la qualité', icon: Gem },
    { title: 'Innovation', desc: 'Solutions modernes et adaptées', icon: Zap },
    { title: 'Proximité', desc: 'Écoute active et relation de confiance', icon: Heart },
  ],
};

const timeline = [
  { year: '2010', event: 'Diplôme DSECG — ESP Dakar', type: 'formation' as const },
  { year: '2011', event: 'Début de carrière bancaire', type: 'carriere' as const },
  { year: '2021', event: 'DG chez MEDY INDUSTIES', type: 'carriere' as const },
  { year: '2022', event: "Création d'ICOPS SUARL", type: 'milestone' as const },
  { year: '2023', event: 'Premiers contrats majeurs (ZCCC, AKWABA)', type: 'business' as const },
  { year: '2024', event: "Autorisation carrière d'argile — Ouonck", type: 'milestone' as const },
  { year: '2025', event: 'Extension de la flotte (4 camions 50T)', type: 'business' as const },
];

const activities = [
  {
    title: 'Transport de matériaux',
    description: "Transport de sable, de basalte et d'argile pour des clients industriels et commerciaux.",
    icon: Truck,
    stat: '200+ voyages/mois',
    color: 'blue' as const,
  },
  {
    title: 'Exploitation de carrières',
    description:
      "Carrière privée temporaire d'argile à Ouonck, commune de Ziguinchor. Surface de 9 hectares, quantité autorisée de 150 000 m³.",
    icon: Pickaxe,
    stat: '150 000 m³ autorisés',
    color: 'amber' as const,
  },
  {
    title: 'Circuit de transport',
    description: 'Circuit aller-retour : basalte de Ngoundiane → Ziguinchor, argile de Ziguinchor → Sindia.',
    icon: Route,
    stat: '~800 km aller-retour',
    color: 'emerald' as const,
  },
  {
    title: 'Prestations diverses',
    description:
      "Fourniture d'argile, granite, sable, mise à disposition de matériels et transport de denrées alimentaires.",
    icon: Package,
    stat: '6+ types de services',
    color: 'violet' as const,
  },
];

const equipment = [
  { name: '4 Camions bennes 50T', detail: 'Acquisition 2025', icon: Truck, status: 'Opérationnel', capacity: '200 tonnes/jour' },
  { name: 'Pelle CATERPILLAR', detail: 'Marque premium', icon: Factory, status: 'Opérationnel', capacity: '500 m³/jour' },
  { name: 'Concasseur', detail: 'Traitement matériaux', icon: HardHat, status: 'Opérationnel', capacity: '300 m³/jour' },
];

const personnel = {
  permanent: 12,
  temporary: '~100',
  details: [
    { role: 'Comptable', count: 1, dept: 'Finance' },
    { role: 'Resp. logistique + adjoint', count: 2, dept: 'Opérations' },
    { role: 'Resp. commercial & marketing', count: 1, dept: 'Commercial' },
    { role: 'Chauffeurs permanents', count: 2, dept: 'Opérations' },
    { role: 'Géologue', count: 1, dept: 'Technique' },
    { role: 'Conducteur pelle mécanique', count: 1, dept: 'Technique' },
    { role: 'Pointeurs', count: 3, dept: 'Opérations' },
    { role: 'Gardien', count: 1, dept: 'Support' },
  ],
  temporaryNote:
    "Personnel temporaire essentiellement composé des riverains de la zone d'implantation de la carrière d'argile.",
};

const orgChart = [
  { dept: 'Direction', members: 1, color: '#6366f1', pct: 8.3 },
  { dept: 'Opérations', members: 6, color: '#06b6d4', pct: 50 },
  { dept: 'Technique', members: 2, color: '#f59e0b', pct: 16.7 },
  { dept: 'Commercial', members: 1, color: '#10b981', pct: 8.3 },
  { dept: 'Finance', members: 1, color: '#ef4444', pct: 8.3 },
  { dept: 'Support', members: 1, color: '#8b5cf6', pct: 8.3 },
];

const clients = [
  { name: 'ZCCC', fullName: 'Zhzjing Communications Construction Group Co Sénégal', prestations: 'Transport de gravier concassé', sector: 'BTP' },
  { name: 'AKWABA GROUP', fullName: 'Akwaba Group', prestations: 'Transport de basalte', sector: 'BTP' },
  { name: 'TWYFORD CERAMICS', fullName: 'Twyford Ceramics', prestations: "Fourniture d'argile, granite et sable", sector: 'Céramique' },
  { name: 'CRSG', fullName: 'China Railway Seventh Group', prestations: 'Fourniture de gravier', sector: 'Ferroviaire' },
  { name: 'CERAMICS CO. LTD', fullName: 'Ceramics Company Limited', prestations: 'Transport argile noir', sector: 'Céramique' },
  { name: 'KOM KOM PLUS', fullName: 'Senegal Kom Kom Plus', prestations: 'Mise à disposition de matériels', sector: 'Services' },
  { name: 'MEDY INDUSTIES', fullName: 'Medy Industies', prestations: 'Transport denrées alimentaires', sector: 'Agro-industrie' },
  { name: 'EREM SARL', fullName: 'Erem SARL', prestations: 'Transport de gravier concassé et sable', sector: 'BTP' },
  { name: 'MC2T', fullName: 'MC2T', prestations: 'Transport de gravier concassé et sable', sector: 'BTP' },
  { name: 'KEDA SN CERAMICS', fullName: 'Keda SN Ceramics', prestations: 'Transport de gravier concassé et sable', sector: 'Céramique' },
];

const fournisseurs = [
  { name: 'Transport Moustapha SYLLA', produits: 'Transport de produits', paiement: '30 jours maximum', type: 'Transport' },
  { name: 'OLA ENERGIE', produits: 'Carburant', paiement: 'Comptant', type: 'Énergie' },
  { name: 'MKA', produits: 'Carburant', paiement: '30 jours maximum', type: 'Énergie' },
  { name: 'Khadim SYLLA', produits: 'Transport de produits', paiement: '30 jours maximum', type: 'Transport' },
  { name: 'KHEWEUL Transport', produits: 'Transport de produits', paiement: '30 jours maximum', type: 'Transport' },
];

const certifications = [
  { title: 'Registre du Commerce', ref: 'SN.DKR.2022. B.765', status: 'Valide', date: '2022' },
  { title: "Autorisation d'exploitation carrière", ref: 'Ouonck / Ziguinchor', status: 'Valide', date: 'Janv. 2024' },
  { title: 'NINEA', ref: companyInfo.ninea, status: 'Valide', date: '2022' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: "Vue d'ensemble", icon: Gauge },
  { key: 'activities', label: 'Activités', icon: Briefcase },
  { key: 'resources', label: 'Ressources', icon: Factory },
  { key: 'network', label: 'Réseau', icon: Users },
  { key: 'legal', label: 'Juridique', icon: Shield },
];

// ─── Animated Counter ────────────────────────────────────────────────

const AnimatedCounter: React.FC<{ end: number; duration?: number; suffix?: string }> = ({
  end,
  duration = 1200,
  suffix = '',
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
};

// ─── Collapsible Section ─────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  headerColor?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  children,
  expanded,
  onToggle,
  headerColor = 'bg-gradient-to-r from-indigo-50 to-orange-50',
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-6 py-4 ${headerColor} hover:brightness-95 transition-all`}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
          {icon}
        </div>
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
      </div>
      {expanded ? (
        <ChevronUp className="w-5 h-5 text-gray-500" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-500" />
      )}
    </button>
    {expanded && <div className="px-6 py-5 border-t border-gray-100">{children}</div>}
  </div>
);

// ─── PDF Export ──────────────────────────────────────────────────────

const exportProfilePDF = async () => {
  const now = new Date();
  const ref = `ICOPS-PROFILE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  const html = `
  <div style="font-family:'Segoe UI',system-ui,sans-serif;color:#1f2937;padding:0;max-width:800px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#4f46e5,#ea580c);padding:32px 40px;color:white;border-radius:12px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:20px;">
        <div style="width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;letter-spacing:2px;border:2px solid rgba(255,255,255,0.3);">IC</div>
        <div>
          <h1 style="margin:0;font-size:28px;font-weight:800;">${companyInfo.name}</h1>
          <p style="margin:4px 0 0;font-size:14px;opacity:0.9;">${companyInfo.fullName}</p>
          <p style="margin:6px 0 0;font-size:11px;opacity:0.7;">Réf : ${ref} | Généré le ${now.toLocaleDateString('fr-FR')}</p>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
      ${[
        { l: 'Siège social', v: `${companyInfo.headquarters}, ${companyInfo.country}` },
        { l: 'Fondée en', v: String(companyInfo.yearFounded) },
        { l: 'Capital', v: companyInfo.capital },
        { l: 'RC', v: companyInfo.registrationNumber },
      ]
        .map(
          (k) => `<div style="flex:1;min-width:160px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;">
        <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${k.l}</div>
        <div style="font-size:13px;font-weight:600;color:#1e293b;">${k.v}</div>
      </div>`
        )
        .join('')}
    </div>
    <div style="background:#f0f9ff;border-left:4px solid #ea580c;padding:16px 20px;border-radius:0 10px 10px 0;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Notre Mission</div>
      <div style="font-size:13px;color:#334155;line-height:1.6;">${companyInfo.mission}</div>
    </div>
    <h2 style="font-size:16px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 16px;">Fondateur</h2>
    <div style="display:flex;gap:16px;align-items:flex-start;background:#fafafa;padding:16px;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:24px;">
      <div style="width:56px;height:56px;background:linear-gradient(135deg,#4f46e5,#ea580c);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:700;flex-shrink:0;">AC</div>
      <div>
        <div style="font-size:15px;font-weight:700;color:#1e293b;">${companyInfo.founder}</div>
        <div style="font-size:12px;color:#4f46e5;font-weight:600;margin:2px 0 8px;">${companyInfo.founderTitle}</div>
        <div style="font-size:12px;color:#4b5563;line-height:1.6;">${companyInfo.founderDescription}</div>
      </div>
    </div>
    <h2 style="font-size:16px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 16px;">Activités</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
      ${activities
        .map(
          (a) => `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;">
        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px;">${a.title}</div>
        <div style="font-size:11px;color:#6b7280;line-height:1.5;margin-bottom:8px;">${a.description}</div>
        <div style="font-size:10px;font-weight:600;color:#4f46e5;background:#eef2ff;padding:4px 8px;border-radius:6px;display:inline-block;">${a.stat}</div>
      </div>`
        )
        .join('')}
    </div>
    <h2 style="font-size:16px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 16px;">Moyens Matériels</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px;">
      <thead><tr style="background:#f8fafc;"><th style="text-align:left;padding:10px 12px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Équipement</th><th style="text-align:left;padding:10px 12px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Capacité</th><th style="text-align:center;padding:10px 12px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Statut</th></tr></thead>
      <tbody>${equipment
        .map(
          (e) =>
            `<tr><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;">${e.name}</td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;">${e.capacity}</td><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;"><span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${e.status}</span></td></tr>`
        )
        .join('')}</tbody>
    </table>
    <h2 style="font-size:16px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 16px;">Portefeuille Clients (${clients.length})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px;">
      <thead><tr style="background:#f8fafc;"><th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Client</th><th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Prestations</th><th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Secteur</th></tr></thead>
      <tbody>${clients
        .map(
          (c) =>
            `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;">${c.name}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;">${c.prestations}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;"><span style="background:#f0f9ff;color:#c2410c;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">${c.sector}</span></td></tr>`
        )
        .join('')}</tbody>
    </table>
    <h2 style="font-size:16px;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 16px;">Fournisseurs (${fournisseurs.length})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px;">
      <thead><tr style="background:#f8fafc;"><th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Raison sociale</th><th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Produits/Services</th><th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;">Paiement</th></tr></thead>
      <tbody>${fournisseurs
        .map(
          (f) =>
            `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b;">${f.name}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;">${f.produits}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;"><span style="background:${f.paiement === 'Comptant' ? '#dcfce7;color:#15803d' : '#ffedd5;color:#c2410c'};padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">${f.paiement}</span></td></tr>`
        )
        .join('')}</tbody>
    </table>
    <div style="border-top:2px solid #e2e8f0;padding-top:16px;margin-top:32px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:10px;color:#94a3b8;">Document confidentiel — ${companyInfo.name} &copy; ${now.getFullYear()}</div>
      <div style="font-size:10px;color:#94a3b8;">${companyInfo.headquarters}, ${companyInfo.country}</div>
    </div>
  </div>`;

  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: `${ref}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(container)
    .save();

  document.body.removeChild(container);
};

// ─── Composant principal ─────────────────────────────────────────────

export const CompanyProfile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [clientSearch, setClientSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    founder: true,
    mission: true,
    timeline: true,
    activities: true,
    equipment: true,
    personnel: true,
    clients: true,
    fournisseurs: true,
    legal: true,
    certifications: true,
    contact: true,
  });

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportProfilePDF();
    } catch (e) {
      console.error('PDF export error:', e);
    }
    setExporting(false);
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.prestations.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.sector.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const sectorStats = clients.reduce<Record<string, number>>((acc, c) => {
    acc[c.sector] = (acc[c.sector] || 0) + 1;
    return acc;
  }, {});

  const yearsActive = new Date().getFullYear() - companyInfo.yearFounded;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* ══════════════════ HERO HEADER ══════════════════ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-8">
          {/* Top row : badge + actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Entreprise Active
              </span>
              <span className="text-sm text-gray-400 font-medium">Depuis {companyInfo.yearFounded}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all"
                title="Imprimer"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-orange-600 hover:from-indigo-700 hover:to-orange-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-200 disabled:opacity-50"
              >
                {exporting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {exporting ? 'Export...' : 'Exporter PDF'}
              </button>
            </div>
          </div>

          {/* Identity row */}
          <div className="flex flex-col lg:flex-row items-start gap-6 mb-8">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 via-orange-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-300/30">
                <span className="text-white font-extrabold text-3xl tracking-widest">IC</span>
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-full border-[3px] border-white flex items-center justify-center shadow">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">{companyInfo.name}</h1>
              <p className="text-lg text-gray-500 mt-1 font-medium">{companyInfo.fullName}</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-gray-500">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  {companyInfo.headquarters}, {companyInfo.country}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-orange-400" />
                  {companyInfo.capital}
                </span>
                <span className="inline-flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-400" />
                  RC {companyInfo.registrationNumber}
                </span>
              </div>
            </div>
          </div>

          {/* KPI Cards – colorées */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Clients actifs',
                value: clients.length,
                sub: '+3 nouveaux en 2024',
                icon: Users,
                bg: 'bg-orange-50',
                iconBg: 'bg-orange-100',
                iconColor: 'text-orange-600',
                valueColor: 'text-orange-700',
                border: 'border-orange-200',
              },
              {
                label: 'Fournisseurs',
                value: fournisseurs.length,
                sub: 'Réseau consolidé',
                icon: Truck,
                bg: 'bg-emerald-50',
                iconBg: 'bg-emerald-100',
                iconColor: 'text-emerald-600',
                valueColor: 'text-emerald-700',
                border: 'border-emerald-200',
              },
              {
                label: 'Collaborateurs',
                value: personnel.permanent,
                sub: `+ ${personnel.temporary}/mois temp.`,
                icon: HardHat,
                bg: 'bg-amber-50',
                iconBg: 'bg-amber-100',
                iconColor: 'text-amber-600',
                valueColor: 'text-amber-700',
                border: 'border-amber-200',
              },
              {
                label: "Années d'activité",
                value: yearsActive,
                sub: "d'activité continue",
                icon: Clock,
                bg: 'bg-violet-50',
                iconBg: 'bg-violet-100',
                iconColor: 'text-violet-600',
                valueColor: 'text-violet-700',
                border: 'border-violet-200',
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className={`${kpi.bg} rounded-2xl p-5 border ${kpi.border} hover:shadow-lg transition-all duration-200`}
              >
                <div className={`w-10 h-10 ${kpi.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
                <p className={`text-3xl font-extrabold ${kpi.valueColor} leading-none`}>
                  <AnimatedCounter end={kpi.value} />
                </p>
                <p className="text-sm font-semibold text-gray-700 mt-1">{kpi.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════ TAB NAVIGATION ══════════════════ */}
      <div className="sticky top-0 z-20 py-2">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-gray-200 p-1.5 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-indigo-600 to-orange-600 text-white shadow-md shadow-indigo-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════ TAB: VUE D'ENSEMBLE ══════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Mission & Vision */}
          <CollapsibleSection
            title="Mission & Vision"
            icon={<Target className="w-5 h-5" />}
            expanded={expandedSections.mission}
            onToggle={() => toggleSection('mission')}
            headerColor="bg-gradient-to-r from-orange-50 to-cyan-50"
          >
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="bg-gradient-to-br from-indigo-50 to-orange-50 rounded-xl p-6 border border-indigo-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h4 className="text-base font-bold text-indigo-900">Notre Mission</h4>
                </div>
                <p className="text-sm text-indigo-800/80 leading-relaxed">{companyInfo.mission}</p>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                    <Eye className="w-5 h-5 text-violet-600" />
                  </div>
                  <h4 className="text-base font-bold text-violet-900">Vision 2030</h4>
                </div>
                <p className="text-sm text-violet-800/80 leading-relaxed">{companyInfo.vision}</p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Valeurs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {companyInfo.values.map((v) => (
              <div
                key={v.title}
                className="group bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-indigo-200 hover:-translate-y-0.5 transition-all text-center"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-orange-100 group-hover:from-indigo-200 group-hover:to-orange-200 rounded-xl flex items-center justify-center mx-auto mb-3 transition-all">
                  <v.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">{v.title}</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>

          {/* Fondateur */}
          <CollapsibleSection
            title="Fondateur & Direction"
            icon={<Star className="w-5 h-5" />}
            expanded={expandedSections.founder}
            onToggle={() => toggleSection('founder')}
            headerColor="bg-gradient-to-r from-amber-50 to-orange-50"
          >
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="w-28 h-28 bg-gradient-to-br from-indigo-600 via-orange-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200/40 mb-3">
                  <span className="text-white font-extrabold text-4xl">AC</span>
                </div>
                <h4 className="font-bold text-gray-900 text-center mt-1">{companyInfo.founder}</h4>
                <span className="text-xs text-indigo-600 font-bold bg-indigo-100 px-3 py-1 rounded-full mt-1.5">
                  {companyInfo.founderTitle}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{companyInfo.founderDescription}</p>
                <div className="flex flex-wrap gap-2">
                  {['DSECG — ESP Dakar', 'Banque (10 ans)', 'Entrepreneur', 'Transport & Carrières'].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gradient-to-r from-indigo-50 to-orange-50 text-indigo-700 px-3 py-1.5 rounded-lg font-semibold border border-indigo-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Timeline */}
          <CollapsibleSection
            title="Parcours & Jalons"
            icon={<Clock className="w-5 h-5" />}
            expanded={expandedSections.timeline}
            onToggle={() => toggleSection('timeline')}
          >
            <div className="relative pl-10">
              <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-indigo-300 via-orange-300 to-emerald-300 rounded-full" />
              <div className="space-y-4">
                {timeline.map((t, idx) => {
                  const dotColors = {
                    formation: 'bg-orange-500',
                    carriere: 'bg-amber-500',
                    milestone: 'bg-emerald-500',
                    business: 'bg-violet-500',
                  };
                  const tagColors = {
                    formation: 'bg-orange-100 text-orange-700 border-orange-200',
                    carriere: 'bg-amber-100 text-amber-700 border-amber-200',
                    milestone: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                    business: 'bg-violet-100 text-violet-700 border-violet-200',
                  };
                  return (
                    <div key={idx} className="relative flex items-center gap-4">
                      <div
                        className={`absolute -left-10 w-[10px] h-[10px] rounded-full ${dotColors[t.type]} ring-4 ring-white shadow`}
                        style={{ top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${tagColors[t.type]} flex-shrink-0`}
                      >
                        {t.year}
                      </span>
                      <span className="text-sm text-gray-700 font-medium">{t.event}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* ══════════════════ TAB: ACTIVITÉS ══════════════════ */}
      {activeTab === 'activities' && (
        <div className="space-y-5">
          <CollapsibleSection
            title="Nos Activités"
            icon={<Briefcase className="w-5 h-5" />}
            expanded={expandedSections.activities}
            onToggle={() => toggleSection('activities')}
            headerColor="bg-gradient-to-r from-emerald-50 to-teal-50"
          >
            <div className="grid md:grid-cols-2 gap-4">
              {activities.map((activity, idx) => {
                const colorMap = {
                  blue: {
                    bg: 'bg-orange-50',
                    iconBg: 'bg-orange-100',
                    text: 'text-orange-600',
                    accent: 'border-l-orange-500',
                    badgeBg: 'bg-orange-100 text-orange-700',
                  },
                  amber: {
                    bg: 'bg-amber-50',
                    iconBg: 'bg-amber-100',
                    text: 'text-amber-600',
                    accent: 'border-l-amber-500',
                    badgeBg: 'bg-amber-100 text-amber-700',
                  },
                  emerald: {
                    bg: 'bg-emerald-50',
                    iconBg: 'bg-emerald-100',
                    text: 'text-emerald-600',
                    accent: 'border-l-emerald-500',
                    badgeBg: 'bg-emerald-100 text-emerald-700',
                  },
                  violet: {
                    bg: 'bg-violet-50',
                    iconBg: 'bg-violet-100',
                    text: 'text-violet-600',
                    accent: 'border-l-violet-500',
                    badgeBg: 'bg-violet-100 text-violet-700',
                  },
                };
                const c = colorMap[activity.color];
                return (
                  <div
                    key={idx}
                    className={`group ${c.bg} rounded-2xl border border-gray-200 border-l-4 ${c.accent} hover:shadow-lg transition-all duration-200 overflow-hidden p-5`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 ${c.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <activity.icon className={`w-5 h-5 ${c.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-base">{activity.title}</h4>
                        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{activity.description}</p>
                        <span
                          className={`inline-flex items-center gap-1.5 mt-3 text-xs font-bold px-3 py-1 rounded-lg ${c.badgeBg}`}
                        >
                          <TrendingUp className="w-3 h-3" /> {activity.stat}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Zones */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 flex items-center gap-3 border-b border-gray-100">
              <div className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center text-teal-600">
                <MapPinned className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-800">Zones d'opération</h3>
            </div>
            <div className="p-6 grid sm:grid-cols-3 gap-4">
              {[
                { zone: 'Ngoundiane', type: 'Point de chargement basalte', status: 'Actif', color: 'bg-orange-50 border-orange-200' },
                {
                  zone: 'Sindia',
                  type: 'Aire de stationnement (1 000 m²)',
                  status: 'Actif',
                  color: 'bg-emerald-50 border-emerald-200',
                },
                {
                  zone: 'Ouonck, Ziguinchor',
                  type: "Carrière d'argile (9 ha)",
                  status: 'Actif',
                  color: 'bg-amber-50 border-amber-200',
                },
              ].map((z) => (
                <div key={z.zone} className={`${z.color} rounded-xl border p-5 hover:shadow-md transition-all`}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-teal-500" />
                    <span className="font-bold text-gray-900 text-sm">{z.zone}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{z.type}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                    <CircleDot className="w-3 h-3" /> {z.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB: RESSOURCES ══════════════════ */}
      {activeTab === 'resources' && (
        <div className="space-y-5">
          {/* Equipment */}
          <CollapsibleSection
            title="Parc Matériel"
            icon={<Truck className="w-5 h-5" />}
            expanded={expandedSections.equipment}
            onToggle={() => toggleSection('equipment')}
            headerColor="bg-gradient-to-r from-violet-50 to-purple-50"
          >
            <div className="space-y-3">
              {equipment.map((eq, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-5 p-4 bg-gray-50 hover:bg-orange-50/50 rounded-xl border border-gray-100 hover:border-orange-200 transition-all"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <eq.icon className="w-7 h-7 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900">{eq.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{eq.detail}</p>
                  </div>
                  <div className="text-right space-y-1 flex-shrink-0">
                    <p className="text-sm font-bold text-gray-700">{eq.capacity}</p>
                    <span className="inline-block text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-0.5 rounded-full">
                      {eq.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Personnel */}
          <CollapsibleSection
            title="Ressources Humaines"
            icon={<Users className="w-5 h-5" />}
            expanded={expandedSections.personnel}
            onToggle={() => toggleSection('personnel')}
            headerColor="bg-gradient-to-r from-amber-50 to-yellow-50"
          >
            <div className="grid lg:grid-cols-12 gap-5">
              {/* Counters */}
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-gradient-to-br from-orange-50 to-indigo-50 rounded-xl border border-orange-200 p-5 text-center">
                  <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">Permanents</p>
                  <p className="text-4xl font-extrabold text-orange-700">
                    <AnimatedCounter end={personnel.permanent} />
                  </p>
                  <p className="text-xs text-orange-500 mt-1">collaborateurs</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5 text-center">
                  <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Temporaires</p>
                  <p className="text-4xl font-extrabold text-amber-700">{personnel.temporary}</p>
                  <p className="text-xs text-amber-500 mt-1">par mois</p>
                </div>
              </div>

              {/* Org chart bars */}
              <div className="lg:col-span-4 bg-gray-50 rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-bold text-gray-800 mb-4">Répartition par département</h4>
                <div className="space-y-3">
                  {orgChart.map((d) => (
                    <div key={d.dept}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-gray-700">{d.dept}</span>
                        <span className="font-bold text-gray-900">{d.members}</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${d.pct}%`, backgroundColor: d.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Postes list */}
              <div className="lg:col-span-5 bg-gray-50 rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-bold text-gray-800 mb-4">Détail des postes permanents</h4>
                <div className="space-y-1.5">
                  {personnel.details.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2.5 px-3 bg-white rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600">
                          {p.count}
                        </span>
                        <span className="text-sm text-gray-700 font-medium">{p.role}</span>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-lg font-medium">
                        {p.dept}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4 italic leading-relaxed">{personnel.temporaryNote}</p>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* ══════════════════ TAB: RÉSEAU ══════════════════ */}
      {activeTab === 'network' && (
        <div className="space-y-5">
          {/* Sector badges */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(sectorStats).map(([sector, count]) => (
              <div
                key={sector}
                className="bg-gradient-to-r from-indigo-50 to-orange-50 rounded-xl border border-indigo-200 px-5 py-3 flex items-center gap-3 hover:shadow-md transition-all"
              >
                <span className="text-2xl font-extrabold text-indigo-700">{count}</span>
                <span className="text-sm text-indigo-600 font-semibold">{sector}</span>
              </div>
            ))}
          </div>

          {/* Clients */}
          <CollapsibleSection
            title={`Portefeuille Clients (${clients.length})`}
            icon={<Users className="w-5 h-5" />}
            expanded={expandedSections.clients}
            onToggle={() => toggleSection('clients')}
            headerColor="bg-gradient-to-r from-orange-50 to-indigo-50"
          >
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none w-full bg-gray-50"
                />
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-orange-50/30">
                    <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Nom complet
                    </th>
                    <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Prestations
                    </th>
                    <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Secteur
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client, idx) => (
                    <tr key={idx} className="border-t border-gray-100 hover:bg-orange-50/30 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-indigo-100 to-orange-100 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600">
                            {client.name.slice(0, 2)}
                          </div>
                          <span className="font-bold text-gray-900 text-sm">{client.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-gray-500 max-w-[200px] truncate">
                        {client.fullName}
                      </td>
                      <td className="py-3.5 px-5 text-sm text-gray-600">{client.prestations}</td>
                      <td className="py-3.5 px-5">
                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-3 py-1 rounded-lg">
                          {client.sector}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3 italic">
              Règlements au comptant ou selon les dispositions contractuelles (max 30 jours).
            </p>
          </CollapsibleSection>

          {/* Fournisseurs */}
          <CollapsibleSection
            title={`Fournisseurs & Prestataires (${fournisseurs.length})`}
            icon={<Truck className="w-5 h-5" />}
            expanded={expandedSections.fournisseurs}
            onToggle={() => toggleSection('fournisseurs')}
            headerColor="bg-gradient-to-r from-emerald-50 to-teal-50"
          >
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-emerald-50/30">
                    <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Raison sociale
                    </th>
                    <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Produits / Services
                    </th>
                    <th className="text-left py-3.5 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Modalités
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fournisseurs.map((f, idx) => (
                    <tr key={idx} className="border-t border-gray-100 hover:bg-emerald-50/30 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-gray-900 text-sm">{f.name}</td>
                      <td className="py-3.5 px-5">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-semibold">
                          {f.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-sm text-gray-600">{f.produits}</td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg ${
                            f.paiement === 'Comptant'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          {f.paiement}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* ══════════════════ TAB: JURIDIQUE ══════════════════ */}
      {activeTab === 'legal' && (
        <div className="space-y-5">
          {/* Informations Légales */}
          <CollapsibleSection
            title="Informations Légales"
            icon={<FileText className="w-5 h-5" />}
            expanded={expandedSections.legal}
            onToggle={() => toggleSection('legal')}
            headerColor="bg-gradient-to-r from-slate-50 to-gray-50"
          >
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { label: 'Dénomination', value: companyInfo.name, icon: Building2, color: 'from-indigo-50 to-orange-50 border-indigo-200' },
                { label: 'Forme juridique', value: companyInfo.legalForm, icon: Shield, color: 'from-violet-50 to-purple-50 border-violet-200' },
                { label: 'Capital social', value: companyInfo.capital, icon: Landmark, color: 'from-emerald-50 to-teal-50 border-emerald-200' },
                { label: "N° d'immatriculation", value: companyInfo.registrationNumber, icon: BadgeCheck, color: 'from-orange-50 to-cyan-50 border-orange-200' },
                { label: 'Registre', value: companyInfo.registrationType, icon: FileText, color: 'from-amber-50 to-yellow-50 border-amber-200' },
                { label: 'NINEA', value: companyInfo.ninea, icon: Award, color: 'from-rose-50 to-pink-50 border-rose-200' },
                { label: 'Siège social', value: `${companyInfo.headquarters}, ${companyInfo.country}`, icon: MapPin, color: 'from-teal-50 to-cyan-50 border-teal-200' },
                { label: 'Terrain', value: companyInfo.terrain, icon: Globe, color: 'from-orange-50 to-amber-50 border-orange-200' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-start gap-4 p-4 bg-gradient-to-br ${item.color} rounded-xl border`}
                >
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-bold text-gray-800 mt-1">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Certifications */}
          <CollapsibleSection
            title="Certifications & Autorisations"
            icon={<Award className="w-5 h-5" />}
            expanded={expandedSections.certifications}
            onToggle={() => toggleSection('certifications')}
            headerColor="bg-gradient-to-r from-emerald-50 to-green-50"
          >
            <div className="space-y-3">
              {certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 hover:bg-emerald-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{cert.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Réf : {cert.ref}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                      {cert.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{cert.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Contact */}
          <CollapsibleSection
            title="Coordonnées"
            icon={<Phone className="w-5 h-5" />}
            expanded={expandedSections.contact}
            onToggle={() => toggleSection('contact')}
            headerColor="bg-gradient-to-r from-cyan-50 to-orange-50"
          >
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: Phone, label: 'Téléphone', value: companyInfo.phone, color: 'from-orange-50 to-indigo-50 border-orange-200' },
                { icon: Mail, label: 'Email', value: companyInfo.email, color: 'from-emerald-50 to-teal-50 border-emerald-200' },
                { icon: Globe, label: 'Site web', value: companyInfo.website, color: 'from-violet-50 to-purple-50 border-violet-200' },
              ].map((c) => (
                <div key={c.label} className={`flex items-center gap-4 p-5 bg-gradient-to-br ${c.color} rounded-xl border`}>
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <c.icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold">{c.label}</p>
                    <p className="text-sm font-bold text-gray-800">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
};

export default CompanyProfile;
