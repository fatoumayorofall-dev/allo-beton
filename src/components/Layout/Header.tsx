import React, { useState } from 'react';
import { Menu, Search, User, X, LogOut, Settings, HelpCircle, Bell } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { NotificationCenter } from '../Notifications/NotificationCenter';

interface HeaderProps {
  onMenuToggle: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onSupportClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onMenuToggle, 
  onProfileClick, 
  onSettingsClick, 
  onSupportClick
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, profile, logout } = useAuthContext();

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  const handleUserClick = () => {
    setShowUserMenu(!showUserMenu);
  };

  const displayName = profile 
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    : user?.email || 'Utilisateur';

  const userRole = profile?.role === 'admin' ? 'Administrateur' : 
                   profile?.role === 'manager' ? 'Gestionnaire' : 
                   profile?.role === 'seller' ? 'Vendeur' : 'Utilisateur';

  const getRoleColor = (role: string) => {
    switch (profile?.role) {
      case 'admin': return 'text-red-600 bg-red-100';
      case 'manager': return 'text-blue-600 bg-blue-100';
      case 'seller': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-30">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200 group"
          >
            <Menu className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
          </button>
          
          {/* Search Bar */}
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher des produits, clients, ventes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-80 pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-200"
            />
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                <div className="p-3 text-sm text-gray-500">
                  Recherche pour "{searchQuery}"...
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Quick Stats */}
          <div className="hidden xl:flex items-center space-x-6 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="text-center">
              <p className="text-xs font-medium text-blue-600">Ventes du jour</p>
              <p className="text-sm font-bold text-blue-900">12</p>
            </div>
            <div className="w-px h-8 bg-blue-200"></div>
            <div className="text-center">
              <p className="text-xs font-medium text-green-600">CA du mois</p>
              <p className="text-sm font-bold text-green-900">2.4M FCFA</p>
            </div>
          </div>

          {/* Notification Center */}
          <NotificationCenter />
          
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={handleUserClick}
              className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200 group"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {displayName}
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(userRole)}`}>
                    {userRole}
                  </span>
                </div>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 top-14 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{displayName}</p>
                      <p className="text-sm text-blue-100">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                        {userRole}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button 
                    onClick={() => {
                      onProfileClick();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 flex items-center space-x-3"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Mon Profil</p>
                      <p className="text-xs text-gray-500">Gérer mes informations</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => {
                      onSettingsClick();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200 flex items-center space-x-3"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">Paramètres</p>
                      <p className="text-xs text-gray-500">Notifications et préférences</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => {
                      onSupportClick();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-200 flex items-center space-x-3"
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Aide & Support</p>
                      <p className="text-xs text-gray-500">Documentation et assistance</p>
                    </div>
                  </button>
                  
                  <hr className="my-2 border-gray-200" />
                  
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center space-x-3"
                  >
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <LogOut className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">Se Déconnecter</p>
                      <p className="text-xs text-red-400">Fermer la session</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
};