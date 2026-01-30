import React, { useState } from 'react';
import { Menu, Search, User, X, LogOut, Settings, HelpCircle, Bell } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { NotificationCenter } from '../Notifications/NotificationCenter';
import { UserProfile } from './UserProfile';

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
  const [searchQuery, setSearchQuery] = useState('');
  const { profile } = useAuthContext();

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
          
          {/* User Profile Card */}
          <UserProfile 
            onProfileClick={onProfileClick}
            onSettingsClick={onSettingsClick}
          />
        </div>
      </div>
    </header>
  );
};