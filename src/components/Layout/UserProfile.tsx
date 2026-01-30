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
        <div className="relative flex items-center space-x-2">
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
          <div className="hidden md:flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-700">
              {displayName.split(' ')[0]}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            {/* Profile Card Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <div className="flex items-center space-x-4">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={displayName}
                    className="w-16 h-16 rounded-lg object-cover border-3 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center border-3 border-white">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg leading-tight">{displayName}</h3>
                  <p className="text-sm text-blue-100 mt-1">{profile?.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getRoleColor(userRole)}`}>
                      {userRole}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Info Card */}
            {(profile?.position || profile?.company) && (
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="space-y-2">
                  {profile?.position && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium">FONCTION</p>
                      <p className="text-sm font-semibold text-gray-900">{profile.position}</p>
                    </div>
                  )}
                  {profile?.company && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium">ENTREPRISE</p>
                      <p className="text-sm font-semibold text-gray-900">{profile.company}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div className="py-3">
              <button 
                onClick={() => {
                  onProfileClick();
                  setShowMenu(false);
                }}
                className="w-full px-6 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 flex items-center space-x-3 font-medium"
              >
                <User className="w-4 h-4" />
                <span>Modifier le profil</span>
              </button>

              <button 
                onClick={() => {
                  onSettingsClick();
                  setShowMenu(false);
                }}
                className="w-full px-6 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-3 font-medium"
              >
                <Settings className="w-4 h-4" />
                <span>Paramètres</span>
              </button>

              <hr className="my-2" />

              <button 
                onClick={handleLogout}
                className="w-full px-6 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center space-x-3 font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
