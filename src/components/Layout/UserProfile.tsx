import React, { useState } from 'react';
import { User, ChevronDown, Shield, Building2, Briefcase, Edit3, Cog, Power } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface UserProfileProps {
  onProfileClick: () => void;
  onSettingsClick: () => void;
}

const roleConfigs = {
  admin: { label: 'Administrateur', badge: 'bg-rose-100 text-rose-700', icon: Shield },
  manager: { label: 'Gestionnaire', badge: 'bg-orange-100 text-orange-700', icon: Shield },
  seller: { label: 'Vendeur', badge: 'bg-emerald-100 text-emerald-700', icon: User },
};
const defaultRole = { label: 'Utilisateur', badge: 'bg-gray-100 text-gray-600', icon: User };

export const UserProfile: React.FC<UserProfileProps> = ({
  onProfileClick,
  onSettingsClick
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const { user, profile, logout } = useAuthContext();

  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
    : user?.email || 'Utilisateur';

  let avatarUrl = profile?.avatar_url || null;
  if (avatarUrl && avatarUrl.startsWith('/')) {
    avatarUrl = `${API_BASE_URL.replace('/api', '')}${avatarUrl}`;
  }

  const role = roleConfigs[profile?.role as keyof typeof roleConfigs] || defaultRole;
  const RoleIcon = role.icon;

  const handleLogout = async () => {
    await logout();
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
      >
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-lg object-cover border border-gray-200"
            />
          ) : (
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-600" />
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
        </div>
        <div className="hidden md:flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-700">
            {displayName.split(' ')[0]}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            {/* Profile Header */}
            <div className="p-4 bg-indigo-50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <User className="w-6 h-6 text-indigo-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{displayName}</h3>
                  <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                  <span className={`inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${role.badge}`}>
                    <RoleIcon className="w-3 h-3" />
                    {role.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Info cards */}
            {(profile?.position || profile?.company) && (
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-2">
                  {profile?.position && (
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Briefcase className="w-3 h-3 text-violet-500" />
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Fonction</p>
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate">{profile.position}</p>
                    </div>
                  )}
                  {profile?.company && (
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Building2 className="w-3 h-3 text-emerald-500" />
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Entreprise</p>
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate">{profile.company}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => { onProfileClick(); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <span className="block font-medium">Modifier le profil</span>
                  <span className="text-xs text-gray-400">Informations personnelles</span>
                </div>
              </button>

              <button
                onClick={() => { onSettingsClick(); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Cog className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <span className="block font-medium">Paramètres</span>
                  <span className="text-xs text-gray-400">Configuration de l'app</span>
                </div>
              </button>

              <div className="my-1 mx-3 border-t border-gray-100" />

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                  <Power className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <span className="block font-medium">Déconnexion</span>
                  <span className="text-xs text-rose-400">Se déconnecter de l'app</span>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-[10px] text-center text-gray-400">Allo Béton CRM • v2.0</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
