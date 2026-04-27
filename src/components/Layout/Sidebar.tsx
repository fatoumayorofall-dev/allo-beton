import React, { useState } from 'react';
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  BarChart3,
  X,
  Truck,
  Shield,
  Cog,
  ClipboardList,
  LogOut,
  Wallet,
  Store,
  UserCog,
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Landmark,
  Handshake,
  Building2,
  FolderKanban,
  BookOpen,
  DatabaseBackup,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useDataContext } from '../../contexts/DataContext';
import { canAccess } from '../../services/roles';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  resource: string;
  gradient: string;
  iconColor: string;
  borderColor: string;
  hoverBorder: string;
  activeBorder: string;
  glowColor: string;
  bgTint: string;
  hoverBg: string;
  adminOnly?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'Commercial',
    items: [
      { id: 'sales', label: 'Ventes', icon: ShoppingCart, resource: 'sales', gradient: 'from-emerald-500 to-green-400', iconColor: 'text-emerald-600', borderColor: 'border-emerald-200/50', hoverBorder: 'hover:border-emerald-300/70', activeBorder: 'border-emerald-300', glowColor: 'shadow-emerald-200/40', bgTint: 'bg-emerald-50/60', hoverBg: 'hover:bg-emerald-50' },
      { id: 'transport', label: 'Bons de Transport', icon: ClipboardList, resource: 'transport', gradient: 'from-teal-500 to-cyan-400', iconColor: 'text-teal-600', borderColor: 'border-teal-200/50', hoverBorder: 'hover:border-teal-300/70', activeBorder: 'border-teal-300', glowColor: 'shadow-teal-200/40', bgTint: 'bg-teal-50/60', hoverBg: 'hover:bg-teal-50' },
      { id: 'customers', label: 'Clients', icon: Users, resource: 'customers', gradient: 'from-amber-500 to-yellow-400', iconColor: 'text-amber-600', borderColor: 'border-amber-200/50', hoverBorder: 'hover:border-amber-300/70', activeBorder: 'border-amber-300', glowColor: 'shadow-amber-200/40', bgTint: 'bg-amber-50/60', hoverBg: 'hover:bg-amber-50' },
    ],
  },
  {
    label: 'Logistique',
    items: [
      { id: 'inventory', label: 'Stock & Inventaire', icon: Package, resource: 'inventory', gradient: 'from-violet-500 to-purple-400', iconColor: 'text-violet-600', borderColor: 'border-violet-200/50', hoverBorder: 'hover:border-violet-300/70', activeBorder: 'border-violet-300', glowColor: 'shadow-violet-200/40', bgTint: 'bg-violet-50/60', hoverBg: 'hover:bg-violet-50' },
      { id: 'suppliers', label: 'Fournisseurs', icon: Truck, resource: 'suppliers', gradient: 'from-cyan-500 to-orange-400', iconColor: 'text-cyan-600', borderColor: 'border-cyan-200/50', hoverBorder: 'hover:border-cyan-300/70', activeBorder: 'border-cyan-300', glowColor: 'shadow-cyan-200/40', bgTint: 'bg-cyan-50/60', hoverBg: 'hover:bg-cyan-50' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'payments', label: 'Paiements', icon: CreditCard, resource: 'payments', gradient: 'from-indigo-500 to-orange-400', iconColor: 'text-indigo-600', borderColor: 'border-indigo-200/50', hoverBorder: 'hover:border-indigo-300/70', activeBorder: 'border-indigo-300', glowColor: 'shadow-indigo-200/40', bgTint: 'bg-indigo-50/60', hoverBg: 'hover:bg-indigo-50' },
      { id: 'cash', label: 'Gestion de Caisse', icon: Wallet, resource: 'cash', gradient: 'from-green-500 to-emerald-400', iconColor: 'text-green-600', borderColor: 'border-green-200/50', hoverBorder: 'hover:border-green-300/70', activeBorder: 'border-green-300', glowColor: 'shadow-green-200/40', bgTint: 'bg-green-50/60', hoverBg: 'hover:bg-green-50' },
      { id: 'cash-report', label: 'Rapport Journalier', icon: BarChart3, resource: 'cash-report', gradient: 'from-lime-600 to-green-500', iconColor: 'text-lime-600', borderColor: 'border-lime-200/50', hoverBorder: 'hover:border-lime-300/70', activeBorder: 'border-lime-300', glowColor: 'shadow-lime-200/40', bgTint: 'bg-lime-50/60', hoverBg: 'hover:bg-lime-50' },
      { id: 'banks', label: 'Gestion Bancaire', icon: Landmark, resource: 'banks', gradient: 'from-violet-600 to-indigo-500', iconColor: 'text-violet-600', borderColor: 'border-violet-200/50', hoverBorder: 'hover:border-violet-300/70', activeBorder: 'border-violet-300', glowColor: 'shadow-violet-200/40', bgTint: 'bg-violet-50/60', hoverBg: 'hover:bg-violet-50' },
      { id: 'partners', label: 'Partenaires', icon: Handshake, resource: 'partners', gradient: 'from-teal-500 to-cyan-500', iconColor: 'text-teal-600', borderColor: 'border-teal-200/50', hoverBorder: 'hover:border-teal-300/70', activeBorder: 'border-teal-300', glowColor: 'shadow-teal-200/40', bgTint: 'bg-teal-50/60', hoverBg: 'hover:bg-teal-50' },
      { id: 'projects', label: 'Projets & Chantiers', icon: FolderKanban, resource: 'projects', gradient: 'from-orange-500 to-amber-500', iconColor: 'text-orange-600', borderColor: 'border-orange-200/50', hoverBorder: 'hover:border-orange-300/70', activeBorder: 'border-orange-300', glowColor: 'shadow-orange-200/40', bgTint: 'bg-orange-50/60', hoverBg: 'hover:bg-orange-50' },
      { id: 'comptabilite', label: 'Comptabilité SYSCOHADA', icon: BookOpen, resource: 'comptabilite', gradient: 'from-indigo-600 to-orange-600', iconColor: 'text-indigo-700', borderColor: 'border-indigo-200/50', hoverBorder: 'hover:border-indigo-300/70', activeBorder: 'border-indigo-300', glowColor: 'shadow-indigo-200/40', bgTint: 'bg-indigo-50/60', hoverBg: 'hover:bg-indigo-50' },
      { id: 'sage-import', label: 'Import Sage', icon: DatabaseBackup, resource: 'sage-import', gradient: 'from-emerald-600 to-green-500', iconColor: 'text-emerald-700', borderColor: 'border-emerald-200/50', hoverBorder: 'hover:border-emerald-300/70', activeBorder: 'border-emerald-300', glowColor: 'shadow-emerald-200/40', bgTint: 'bg-emerald-50/60', hoverBg: 'hover:bg-emerald-50' },
    ],
  },
  {
    label: 'Outils',
    items: [
      { id: 'ecommerce', label: 'E-commerce', icon: Store, resource: 'ecommerce', gradient: 'from-purple-500 to-pink-400', iconColor: 'text-purple-600', borderColor: 'border-purple-200/50', hoverBorder: 'hover:border-purple-300/70', activeBorder: 'border-purple-300', glowColor: 'shadow-purple-200/40', bgTint: 'bg-purple-50/60', hoverBg: 'hover:bg-purple-50' },
      { id: 'ai-expert', label: 'IA Expert PRO', icon: Brain, resource: 'ai-expert', gradient: 'from-fuchsia-500 to-purple-400', iconColor: 'text-fuchsia-600', borderColor: 'border-fuchsia-200/50', hoverBorder: 'hover:border-fuchsia-300/70', activeBorder: 'border-fuchsia-300', glowColor: 'shadow-fuchsia-200/40', bgTint: 'bg-fuchsia-50/60', hoverBg: 'hover:bg-fuchsia-50' },
      { id: 'hr', label: 'RH & Paie', icon: UserCog, resource: 'hr', gradient: 'from-sky-500 to-orange-400', iconColor: 'text-sky-600', borderColor: 'border-sky-200/50', hoverBorder: 'hover:border-sky-300/70', activeBorder: 'border-sky-300', glowColor: 'shadow-sky-200/40', bgTint: 'bg-sky-50/60', hoverBg: 'hover:bg-sky-50' },
    ],
  },
  {
    label: 'Entreprise',
    items: [
      { id: 'company', label: 'Profil Entreprise', icon: Building2, resource: 'company', gradient: 'from-indigo-500 to-orange-400', iconColor: 'text-indigo-600', borderColor: 'border-indigo-200/50', hoverBorder: 'hover:border-indigo-300/70', activeBorder: 'border-indigo-300', glowColor: 'shadow-indigo-200/40', bgTint: 'bg-indigo-50/60', hoverBg: 'hover:bg-indigo-50' },
    ],
  },
  {
    label: 'Systeme',
    items: [
      { id: 'admin', label: 'Administration', icon: Shield, resource: 'admin', adminOnly: true, gradient: 'from-rose-500 to-pink-400', iconColor: 'text-rose-600', borderColor: 'border-rose-200/50', hoverBorder: 'hover:border-rose-300/70', activeBorder: 'border-rose-300', glowColor: 'shadow-rose-200/40', bgTint: 'bg-rose-50/60', hoverBg: 'hover:bg-rose-50' },
      { id: 'settings', label: 'Parametres', icon: Cog, resource: 'settings', gradient: 'from-slate-500 to-gray-400', iconColor: 'text-slate-500', borderColor: 'border-slate-200/50', hoverBorder: 'hover:border-slate-300/70', activeBorder: 'border-slate-300', glowColor: 'shadow-slate-200/40', bgTint: 'bg-slate-50/60', hoverBg: 'hover:bg-slate-50' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
  isOpen,
  onToggle,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}) => {
  const { profile, signOut } = useAuthContext();
  const userRole = profile?.role || 'viewer';
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onCollapsedChange?.(val);
  };
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  let stockAlertCount = 0;
  const { products } = useDataContext();
  stockAlertCount = products.filter((p) => {
    const stock = Number(p.stock ?? (p as any).inventory?.quantity ?? 0) || 0;
    const minStock = Number(p.minStock ?? p.min_stock ?? (p as any).inventory?.min_stock_level ?? 0) || 0;
    return stock === 0 || (minStock > 0 && stock <= minStock);
  }).length;

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const canView = (item: MenuItem) => {
    if (item.adminOnly && userRole !== 'admin') return false;
    if (item.adminOnly && userRole === 'admin') return true;
    const customPerms = profile?.permissions;
    return canAccess(userRole as any, item.resource, customPerms);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'manager': return 'Gestionnaire';
      case 'seller': return 'Vendeur';
      case 'viewer': return 'Lecteur';
      default: return 'Utilisateur';
    }
  };

  const getRoleGradient = (role: string) => {
    switch (role) {
      case 'admin': return 'from-rose-500 via-pink-500 to-fuchsia-500';
      case 'manager': return 'from-orange-500 via-indigo-500 to-violet-500';
      case 'seller': return 'from-emerald-500 via-teal-500 to-cyan-500';
      default: return 'from-gray-500 via-slate-500 to-zinc-500';
    }
  };

  const sidebarWidth = collapsed ? 'w-[76px]' : 'w-[270px]';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 ${sidebarWidth}
        `}
      >
        <div className="h-full relative flex flex-col overflow-hidden">
          {/* Light gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-white via-orange-50/80 to-indigo-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.06),transparent_60%)]" />

          {/* Right border */}
          <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-200/60 via-purple-200/40 to-indigo-200/60" />

          {/* ---- Header ---- */}
          <div className="relative flex items-center justify-between px-4 py-5">
            <div className="flex items-center space-x-3 min-w-0">
              {/* Logo Allo Béton - Design Premium */}
              <div className="relative flex-shrink-0 group/logo">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-[#2c5282]/40 to-[#ed8936]/40 rounded-2xl blur-lg opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500" />
                <div className="relative w-12 h-12 rounded-[14px] overflow-hidden shadow-lg shadow-[#1a365d]/20 group-hover/logo:shadow-xl group-hover/logo:shadow-[#1a365d]/30 transition-all duration-300 group-hover/logo:scale-105">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="sidebarBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2c5282"/>
                        <stop offset="50%" stopColor="#1a365d"/>
                        <stop offset="100%" stopColor="#0f2744"/>
                      </linearGradient>
                      <linearGradient id="sidebarOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f6ad55"/>
                        <stop offset="100%" stopColor="#dd6b20"/>
                      </linearGradient>
                    </defs>
                    <rect width="100" height="100" fill="url(#sidebarBg)"/>
                    <path d="M0 0 L100 0 L100 45 Q50 38 0 25 Z" fill="white" opacity="0.12"/>
                    <rect y="78" width="100" height="22" fill="url(#sidebarOrange)"/>
                    <rect y="78" width="100" height="5" fill="white" opacity="0.2"/>
                    <text x="14" y="72" fontFamily="Arial Black, sans-serif" fontSize="54" fontWeight="900" fill="white">A</text>
                    <text x="50" y="72" fontFamily="Arial Black, sans-serif" fontSize="54" fontWeight="900" fill="url(#sidebarOrange)">B</text>
                    <rect x="76" y="6" width="18" height="18" rx="5" fill="url(#sidebarOrange)" opacity="0.9"/>
                  </svg>
                </div>
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <h1 className="text-[16px] font-extrabold tracking-tight leading-none" style={{ fontFamily: "'Poppins', 'Segoe UI', sans-serif" }}>
                    <span className="text-[#1a365d]">Allô</span>
                    <span className="bg-gradient-to-r from-[#ed8936] to-[#dd6b20] bg-clip-text text-transparent ml-1">Béton</span>
                  </h1>
                  <div className="flex items-center mt-1">
                    <span className="text-[8px] text-[#4a5568] uppercase tracking-[0.15em] font-semibold">BÉTON</span>
                    <span className="mx-1.5 w-1 h-1 rounded-full bg-gradient-to-r from-[#ed8936] to-[#dd6b20]"></span>
                    <span className="text-[8px] text-[#4a5568] uppercase tracking-[0.15em] font-semibold">MORTIER</span>
                    <span className="mx-1.5 w-1 h-1 rounded-full bg-gradient-to-r from-[#ed8936] to-[#dd6b20]"></span>
                    <span className="text-[8px] text-[#4a5568] uppercase tracking-[0.15em] font-semibold">LIVRAISON</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onToggle}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="hidden lg:flex p-2 rounded-xl hover:bg-indigo-50 text-gray-300 hover:text-indigo-500 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Separator */}
          <div className="relative mx-4 mb-2">
            <div className="h-px bg-gradient-to-r from-transparent via-indigo-200/70 to-transparent" />
          </div>

          {/* Expand button when collapsed */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="hidden lg:flex mx-auto mb-2 p-2 rounded-xl hover:bg-indigo-50 text-gray-300 hover:text-indigo-500 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* ---- Navigation ---- */}
          <nav className="relative flex-1 overflow-y-auto overflow-x-hidden py-2 px-3 space-y-5 sidebar-scroll">
            {menuGroups.map((group) => {
              const visibleItems = group.items.filter(canView);
              if (visibleItems.length === 0) return null;
              const isGroupCollapsed = collapsedGroups[group.label];

              return (
                <div key={group.label}>
                  {/* Group header */}
                  {!collapsed ? (
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between px-2 mb-2 group/header"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-1 h-3 rounded-full bg-gradient-to-b from-indigo-400 to-purple-400" />
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                          {group.label}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-gray-300 group-hover/header:text-gray-400 transition-all duration-300 ${
                          isGroupCollapsed ? '-rotate-90' : ''
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="flex justify-center mb-2 px-2">
                      <div className="w-8 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
                    </div>
                  )}

                  {/* Group items */}
                  {!isGroupCollapsed && (
                    <div className="space-y-1.5">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;

                        return (
                          <div key={item.id} className="relative group/item">
                            <button
                              onClick={() => {
                                onSectionChange(item.id);
                                if (window.innerWidth < 1024) onToggle();
                              }}
                              className={`
                                w-full flex items-center rounded-2xl text-left transition-all duration-200 relative border
                                ${collapsed ? 'justify-center px-0 py-2.5 mx-auto' : 'space-x-3 px-3 py-2.5'}
                                ${isActive
                                  ? `bg-white ${item.activeBorder} shadow-lg ${item.glowColor}`
                                  : `${item.bgTint} ${item.borderColor} ${item.hoverBorder} ${item.hoverBg} hover:shadow-md hover:shadow-gray-100/50`
                                }
                              `}
                            >
                              {/* Active left bar */}
                              {isActive && (
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full bg-gradient-to-b ${item.gradient}`} />
                              )}

                              {/* Icon container */}
                              <div className="relative flex-shrink-0">
                                {isActive && (
                                  <div className={`absolute -inset-1 bg-gradient-to-br ${item.gradient} rounded-xl blur-md opacity-30`} />
                                )}
                                <div
                                  className={`
                                    relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300
                                    ${isActive
                                      ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                                      : 'bg-gray-50 group-hover/item:bg-gray-100 group-hover/item:scale-105'
                                    }
                                  `}
                                >
                                  <Icon
                                    className={`w-[18px] h-[18px] transition-all duration-300 ${
                                      isActive ? 'text-white' : `${item.iconColor} opacity-70 group-hover/item:opacity-100`
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Label */}
                              {!collapsed && (
                                <span
                                  className={`relative text-[13px] truncate transition-all duration-200 ${
                                    isActive ? 'text-gray-800 font-semibold' : 'text-gray-500 font-medium group-hover/item:text-gray-700'
                                  }`}
                                >
                                  {item.label}
                                </span>
                              )}

                              {/* Stock badge */}
                              {item.id === 'inventory' && stockAlertCount > 0 && !collapsed && (
                                <span className="relative ml-auto flex-shrink-0 px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[20px] text-center shadow-md shadow-red-200 animate-pulse">
                                  {stockAlertCount}
                                </span>
                              )}

                              {/* Stock badge collapsed */}
                              {item.id === 'inventory' && stockAlertCount > 0 && collapsed && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[8px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center shadow-md shadow-red-200 animate-pulse">
                                  {stockAlertCount}
                                </span>
                              )}
                            </button>

                            {/* Tooltip (collapsed mode) */}
                            {collapsed && (
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-white text-gray-700 text-xs font-semibold rounded-xl whitespace-nowrap opacity-0 pointer-events-none group-hover/item:opacity-100 transition-all duration-200 shadow-xl shadow-gray-200/50 z-[60] border border-gray-100 translate-x-1 group-hover/item:translate-x-0">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-white border-l border-b border-gray-100 rotate-45" />
                                {item.label}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* ---- Footer ---- */}
          <div className="relative border-t border-indigo-100/70 p-3 space-y-2.5">
            {!collapsed ? (
              <>
                {/* User card */}
                <div className="relative overflow-hidden rounded-2xl">
                  <div className={`absolute inset-0 bg-gradient-to-r ${getRoleGradient(userRole)}`} />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
                  <div className="relative p-3.5 flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-2 ring-white/30">
                      <span className="text-white font-bold text-sm">
                        {profile?.first_name?.[0] || 'U'}{profile?.last_name?.[0] || ''}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate drop-shadow-sm">
                        {profile?.first_name} {profile?.last_name}
                      </p>
                      <p className="text-[11px] text-white/80 font-medium">{getRoleLabel(userRole)}</p>
                    </div>
                  </div>
                </div>

                {/* Shop link */}
                <a
                  href="/shop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/shop flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200/60 hover:border-orange-300 text-orange-600 hover:text-orange-700 transition-all duration-200 hover:shadow-md hover:shadow-orange-100"
                >
                  <Store className="w-4 h-4" />
                  <span className="text-[13px] font-semibold">Voir la Boutique</span>
                  <ExternalLink className="w-3 h-3 opacity-0 -translate-x-1 group-hover/shop:opacity-100 group-hover/shop:translate-x-0 transition-all" />
                </a>

                {/* Logout */}
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-white/60 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all duration-200 border border-gray-200/60 hover:border-red-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-[13px] font-medium">Deconnexion</span>
                </button>

                {/* Version */}
                <p className="text-center text-[10px] text-gray-300 font-medium pt-1">
                  Allo Beton CRM <span className="text-indigo-400 font-bold">v2.0</span>
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="relative group/avatar">
                  <div className={`absolute -inset-1 bg-gradient-to-r ${getRoleGradient(userRole)} rounded-xl blur-md opacity-30 group-hover/avatar:opacity-50 transition-opacity`} />
                  <div className={`relative w-10 h-10 bg-gradient-to-br ${getRoleGradient(userRole)} rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50`}>
                    <span className="text-white font-bold text-xs">
                      {profile?.first_name?.[0] || 'U'}{profile?.last_name?.[0] || ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="p-2.5 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                  title="Deconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(99,102,241,0.15);
          border-radius: 100px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(99,102,241,0.3);
        }
      `}</style>
    </>
  );
};
