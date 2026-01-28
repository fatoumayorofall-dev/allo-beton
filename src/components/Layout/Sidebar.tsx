import React from 'react';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Truck,
  Shield,
  Sparkles
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { hasPermission, canAccess } from '../../services/roles';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Tableau de Bord', icon: Home, resource: 'dashboard', gradient: 'from-blue-500 to-blue-600' },
  { id: 'sales', label: 'Ventes', icon: ShoppingCart, resource: 'sales', gradient: 'from-green-500 to-green-600' },
  { id: 'inventory', label: 'Stock & Inventaire', icon: Package, resource: 'products', gradient: 'from-purple-500 to-purple-600' },
  { id: 'customers', label: 'Clients', icon: Users, resource: 'customers', gradient: 'from-orange-500 to-orange-600' },
  { id: 'suppliers', label: 'Fournisseurs', icon: Truck, resource: 'suppliers', gradient: 'from-teal-500 to-teal-600' },
  { id: 'payments', label: 'Paiements', icon: CreditCard, resource: 'payments', gradient: 'from-indigo-500 to-indigo-600' },
  { id: 'reports', label: 'Rapports & Analytics', icon: BarChart3, resource: 'reports', gradient: 'from-pink-500 to-pink-600' },
  { id: 'admin', label: 'Administration', icon: Shield, resource: 'users', adminOnly: true, gradient: 'from-red-500 to-red-600' },
  { id: 'settings', label: 'Paramètres', icon: Settings, resource: 'settings', gradient: 'from-gray-500 to-gray-600' },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeSection, 
  onSectionChange, 
  isOpen, 
  onToggle 
}) => {
  const { profile } = useAuthContext();
  const userRole = profile?.role || 'viewer';

  // Filtrer les éléments du menu selon les permissions
  const visibleMenuItems = menuItems.filter(item => {
    if (item.adminOnly && userRole !== 'admin') {
      return false;
    }
    return canAccess(userRole as any, item.resource);
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'manager': return 'Gestionnaire';
      case 'seller': return 'Vendeur';
      case 'viewer': return 'Lecteur';
      default: return 'Utilisateur';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'from-red-500 to-red-600';
      case 'manager': return 'from-blue-500 to-blue-600';
      case 'seller': return 'from-green-500 to-green-600';
      case 'viewer': return 'from-gray-500 to-gray-600';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
        w-72 border-r border-slate-700
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-2 h-2 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Allo Béton</h1>
              <p className="text-xs text-slate-400">Gestion Professionnelle</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-700 transition-colors duration-200 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id);
                  if (window.innerWidth < 1024) onToggle();
                }}
                className={`
                  group w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 relative overflow-hidden
                  ${isActive
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg transform scale-105`
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-white/10 rounded-xl"></div>
                )}
                <div className={`
                  relative z-10 p-2 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-white/20 shadow-lg' 
                    : 'group-hover:bg-slate-600/50'
                  }
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="relative z-10 flex-1">
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <div className="w-full h-0.5 bg-white/30 rounded-full mt-1"></div>
                  )}
                </div>
                {isActive && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-l-full"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Role Badge */}
        <div className="p-4 border-t border-slate-700">
          <div className={`bg-gradient-to-r ${getRoleColor(userRole)} rounded-xl p-4 text-center relative overflow-hidden`}>
            <div className="absolute inset-0 bg-white/10 rounded-xl"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <p className="text-xs text-white/80 font-medium">Connecté en tant que</p>
              <p className="text-sm font-bold text-white">{getRoleLabel(userRole)}</p>
              {profile?.first_name && (
                <p className="text-xs text-white/70 mt-1">{profile.first_name} {profile.last_name}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};