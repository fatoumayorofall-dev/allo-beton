import React, { useState } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

interface UserProfileProps {
  onProfileClick: () => void;
  onSettingsClick: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  onProfileClick, 
  onSettingsClick 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const { user, profile, logout } = useAuthContext();

  const displayName = profile 
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    : user?.email || 'Utilisateur';

  const avatarUrl = profile?.avatar_url;

  const handleLogout = async () => {
    await logout();
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
      >
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover border border-blue-200"
          />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">
          {displayName.split(' ')[0]}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
          {/* Profile Card */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
            <div className="flex items-center space-x-3">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={displayName}
                  className="w-12 h-12 rounded-lg object-cover border-2 border-white"
                />
              ) : (
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold">{displayName}</p>
                <p className="text-sm text-blue-100">{profile?.position || 'Non spécifié'}</p>
                {profile?.company && (
                  <p className="text-xs text-blue-200">{profile.company}</p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button 
              onClick={() => {
                onProfileClick();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 flex items-center space-x-2"
            >
              <User className="w-4 h-4" />
              <span>Modifier le profil</span>
            </button>

            <button 
              onClick={() => {
                onSettingsClick();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </button>

            <hr className="my-2" />

            <button 
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 transition-colors duration-200 flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
