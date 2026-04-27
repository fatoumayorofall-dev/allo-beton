import React, { useState, useEffect, useMemo } from 'react';
import { Menu, Search, Command, TrendingUp, Gem, Star, Rocket } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useDataContext } from '../../contexts/DataContext';
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [time, setTime] = useState(new Date());
  const { profile } = useAuthContext();
  const { sales } = useDataContext();

  // Real stats from data
  const headerStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todaySales = (sales || []).filter((s: any) => {
      const d = new Date(s.sale_date || s.created_at);
      return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    });
    const monthSales = (sales || []).filter((s: any) => {
      const d = new Date(s.sale_date || s.created_at);
      return d >= monthStart && s.status !== 'cancelled';
    });
    const monthRevenue = monthSales.reduce((s: number, sale: any) => s + (Number(sale.total_amount) || 0), 0);
    const revenueStr = monthRevenue >= 1000000 ? (monthRevenue / 1000000).toFixed(1) + 'M' : monthRevenue >= 1000 ? Math.round(monthRevenue / 1000) + 'K' : String(monthRevenue);
    return { todayCount: todaySales.length, monthRevenue: revenueStr };
  }, [sales]);

  // Clock - update every minute (not every second)
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="relative z-50">
      {/* Clean White Background with subtle gradient */}
      <div className="absolute inset-0 bg-white"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 via-white to-violet-50/50"></div>
      
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-[20%] w-32 h-32 bg-orange-100/40 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-[30%] w-24 h-24 bg-violet-100/30 rounded-full blur-2xl"></div>
      </div>
      
      {/* Bottom border - subtle gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
      
      <div className="relative flex items-center justify-between px-6 py-3">
        {/* Left Section - Menu & Search */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2.5 rounded-xl bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 transition-all duration-300 group hover:shadow-md hover:shadow-indigo-100"
          >
            <Menu className="w-5 h-5 text-gray-600 group-hover:text-indigo-600 transition-colors" />
          </button>
          
          {/* Search Bar - Light Theme */}
          <div className="relative hidden md:block group">
            {/* Glow Effect on Focus */}
            <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-200 via-violet-200 to-purple-200 rounded-2xl blur-lg transition-all duration-500 ${searchFocused ? 'opacity-60' : 'opacity-0'}`}></div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <div className={`p-2 rounded-xl transition-all duration-300 ${searchFocused ? 'bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-200' : 'bg-indigo-50'}`}>
                  <Search className={`h-4 w-4 transition-colors duration-300 ${searchFocused ? 'text-white' : 'text-indigo-500'}`} />
                </div>
              </div>
              
              <input
                type="text"
                placeholder="✨ Rechercher produits, clients, ventes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="block w-80 lg:w-[420px] pl-16 pr-24 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-300 transition-all duration-300 text-sm font-medium shadow-sm hover:shadow-md"
              />
              
              {/* Live Clock + Keyboard Shortcut */}
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2 pointer-events-none">
                <div className="hidden xl:flex items-center space-x-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-xs text-amber-600 font-bold font-mono">{time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-50 rounded-lg border border-indigo-200">
                  <Command className="w-3 h-3 text-indigo-600" />
                  <span className="text-xs text-indigo-600 font-bold">K</span>
                </div>
              </div>
            </div>
            
            {/* Search Results Dropdown */}
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center space-x-3 text-gray-500">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
                      <Search className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Recherche pour "<span className="text-indigo-600 font-bold">{searchQuery}</span>"</span>
                      <p className="text-xs text-gray-400">Appuyez Entrée pour rechercher...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Section - Stats, Notifications, Profile */}
        <div className="flex items-center space-x-3">
          {/* Quick Stats Cards - Light Theme */}
          <div className="hidden xl:flex items-center space-x-3">
            {/* Sales Today */}
            <div className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-xl opacity-0 group-hover:opacity-100 blur-lg transition-all duration-500"></div>
              <div className="relative px-4 py-2.5 bg-emerald-50 rounded-xl border border-emerald-200 group-hover:border-emerald-300 transition-all duration-300 cursor-pointer group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-emerald-100">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-emerald-600 font-bold flex items-center">
                      <Rocket className="w-2.5 h-2.5 mr-1" /> Ventes
                    </p>
                    <p className="text-xl font-black text-emerald-700">{headerStats.todayCount}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Monthly Revenue */}
            <div className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-200 to-purple-200 rounded-xl opacity-0 group-hover:opacity-100 blur-lg transition-all duration-500"></div>
              <div className="relative px-4 py-2.5 bg-violet-50 rounded-xl border border-violet-200 group-hover:border-violet-300 transition-all duration-300 cursor-pointer group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-violet-100">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200">
                      <Gem className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-violet-600 font-bold flex items-center">
                      <Star className="w-2.5 h-2.5 mr-1" /> CA Mois
                    </p>
                    <p className="text-xl font-black text-violet-700">{headerStats.monthRevenue}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden xl:block w-px h-10 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>

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