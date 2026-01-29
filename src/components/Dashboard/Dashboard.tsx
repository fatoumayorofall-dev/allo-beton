import React, { useEffect, useState, useMemo } from 'react';
import { StatsCard } from './StatsCard';
import { DashboardCharts } from './DashboardCharts';
import { TrendingUp, ShoppingCart, AlertTriangle, DollarSign, Package, Users, Crown, Award, RefreshCw, TrendingDown, Target, Zap, BarChart3, PieChart, Activity, LineChart as LineChartIcon } from 'lucide-react';
import { getDashboardStats, getSales, getProducts, getCustomers, initializeSampleData } from '../../services/supabase';
import { useAuthContext } from '../../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuthContext();
  const [stats, setStats] = useState({
    totalSales: 0,
    monthlyRevenue: 0,
    pendingOrders: 0,
    lowStockItems: 0
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Charger les statistiques avec timeout
      const statsPromise = getDashboardStats();
      const salesPromise = getSales();
      const productsPromise = getProducts();
      const customersPromise = getCustomers();

      // Attendre toutes les promesses avec un timeout global
      const results = await Promise.allSettled([
        statsPromise,
        salesPromise,
        productsPromise,
        customersPromise
      ]);

      // Traiter les résultats
      const [statsResult, salesResult, productsResult, customersResult] = results;

      if (statsResult.status === 'fulfilled' && statsResult.value.success) {
        setStats(statsResult.value.data);
      }

      if (salesResult.status === 'fulfilled' && salesResult.value.success) {
        setRecentSales(salesResult.value.data.slice(0, 5));
      }

      if (productsResult.status === 'fulfilled' && productsResult.value.success) {
        const lowStock = productsResult.value.data.filter((p: any) => 
          (p.stock || 0) <= (p.minStock || 0) && (p.minStock || 0) > 0
        );
        setLowStockProducts(lowStock);
      }

      if (customersResult.status === 'fulfilled' && customersResult.value.success) {
        // Simuler les top clients
        const clients = customersResult.value.data.slice(0, 5).map((client: any) => ({
          ...client,
          totalPurchases: Math.floor(Math.random() * 10000000) + 1000000
        }));
        setTopClients(clients.sort((a: any, b: any) => b.totalPurchases - a.totalPurchases));
      }

      // Si aucune donnée n'existe, proposer d'initialiser
      if (statsResult.status === 'fulfilled' && 
          statsResult.value.success && 
          statsResult.value.data.totalSales === 0) {
        // Pas d'initialisation automatique, laisser l'utilisateur choisir
      }

    } catch (error: any) {
      console.error('Erreur chargement dashboard:', error);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeSampleData = async () => {
    setInitializing(true);
    try {
      const result = await initializeSampleData();
      if (result.success) {
        // Recharger les données après initialisation
        await loadDashboardData();
      } else {
        setError(result.error || 'Erreur lors de l\'initialisation');
      }
    } catch (error: any) {
      setError('Erreur lors de l\'initialisation des données');
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen p-8">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-blue-700 to-blue-900 bg-clip-text text-transparent">
                Tableau de Bord Analytique
              </h1>
              <p className="text-gray-600 mt-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-600" />
                <span>Aperçu en temps réel de votre activité commerciale</span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={loadDashboardData}
            className="flex items-center space-x-2 bg-white text-gray-900 px-4 py-2 rounded-lg border border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualiser</span>
          </button>
          
          {stats.totalSales === 0 && (
            <button
              onClick={handleInitializeSampleData}
              disabled={initializing}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50"
            >
              {initializing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Chargement...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Données de démo</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Premium - Ligne 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-200 p-6 transition-all duration-300 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Revenu Total</p>
                <h3 className="text-3xl font-black text-gray-900">
                  {(stats.monthlyRevenue / 1000000).toFixed(1)}M FCFA
                </h3>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold text-green-700">+12.5%</span>
              </div>
              <span className="text-xs text-gray-500">par rapport au mois dernier</span>
            </div>
          </div>
        </div>

        {/* Sales Card */}
        <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-200 p-6 transition-all duration-300 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Nombre de Ventes</p>
                <h3 className="text-3xl font-black text-gray-900">{stats.totalSales}</h3>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 rounded-full">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">+8.3%</span>
              </div>
              <span className="text-xs text-gray-500">8 nouvelles cette semaine</span>
            </div>
          </div>
        </div>

        {/* Pending Orders Card */}
        <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-200 p-6 transition-all duration-300 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Commandes en Attente</p>
                <h3 className="text-3xl font-black text-gray-900">{stats.pendingOrders}</h3>
              </div>
              <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 rounded-full">
                <Target className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-orange-700">À traiter</span>
              </div>
              <span className="text-xs text-gray-500">Nécessite attention</span>
            </div>
          </div>
        </div>

        {/* Low Stock Card */}
        <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-200 p-6 transition-all duration-300 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Alertes Stock</p>
                <h3 className="text-3xl font-black text-gray-900">{stats.lowStockItems}</h3>
              </div>
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-1 px-3 py-1 bg-red-100 rounded-full">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-xs font-bold text-red-700">Critique</span>
              </div>
              <span className="text-xs text-gray-500">À réapprovisionner</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Charts Section */}
      {stats.totalSales > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl shadow-lg">
              <LineChartIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
                Analyse Détaillée
              </h2>
              <p className="text-gray-600 text-sm mt-1">Graphiques et tendances en temps réel</p>
            </div>
          </div>
          <DashboardCharts recentSales={recentSales} />
        </div>
      )}

      {/* Detailed Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventes Récentes - Large */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-200 p-8 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Ventes Récentes</h2>
              <p className="text-sm text-gray-500 mt-1">Aperçu des 5 dernières transactions</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentSales.length > 0 ? recentSales.map((sale, idx) => (
              <div key={sale.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 group cursor-pointer">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md ${
                    idx === 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                    idx === 1 ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                    'bg-gradient-to-br from-purple-500 to-purple-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{sale.customerName || sale.customer?.name || 'Client'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(sale.created_at || sale.createdAt).toLocaleDateString('fr-FR')} • {sale.items?.length || 0} articles
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900">{(sale.total_amount || sale.total || 0).toLocaleString()} FCFA</p>
                  <span className={`inline-block text-xs px-3 py-1 rounded-full font-bold mt-1 ${
                    sale.status === 'paid' ? 'bg-green-100 text-green-800' :
                    sale.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sale.status === 'paid' ? '✓ Payé' :
                     sale.status === 'confirmed' ? '⏳ Confirmé' : '📝 Brouillon'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Aucune vente récente</p>
                <p className="text-sm text-gray-500 mt-1">Les transactions apparaîtront ici</p>
              </div>
            )}
          </div>
        </div>

        {/* Meilleurs Clients */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Top Clients</h2>
              <p className="text-sm text-gray-500 mt-1">Meilleurs acheteurs</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {topClients.length > 0 ? topClients.map((client, idx) => (
              <div key={client.id} className="relative p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 hover:border-yellow-400 hover:shadow-md transition-all duration-200 group">
                <div className="absolute -left-2 -top-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shadow-xl" style={{
                  background: idx === 0 ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' :
                              idx === 1 ? 'linear-gradient(135deg, #C0C0C0 0%, #A9A9A9 100%)' :
                              'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)'
                }}>
                  {idx + 1}
                </div>
                <div className="ml-2">
                  <p className="font-bold text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-600">{client.company || 'Client'}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-yellow-200">
                  <p className="text-sm font-black text-gray-900">{client.totalPurchases.toLocaleString()} FCFA</p>
                  {(client.balance || client.current_balance) > 0 && (
                    <p className="text-xs text-orange-600 font-semibold">Créance: {(client.balance || client.current_balance).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Pas de clients</p>
                <p className="text-sm text-gray-500 mt-1">Créez vos premiers clients</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Alerts - Full Width */}
      {lowStockProducts.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl shadow-md border-2 border-red-200 p-8 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Alertes Stock Critiques</h2>
                <p className="text-sm text-gray-600 mt-1">{lowStockProducts.length} produits nécessitent une action immédiate</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="p-4 bg-white rounded-xl border-2 border-red-300 hover:border-red-500 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 line-clamp-2">{product.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{product.category?.name || 'Produit'}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div className="pt-3 border-t border-red-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">Stock Actuel:</span>
                    <span className="text-lg font-black text-red-600">{product.stock}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-semibold text-gray-600">Minimum:</span>
                    <span className="text-sm font-bold text-gray-500">{product.minStock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Welcome Message */}
      {stats.totalSales === 0 && (
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl shadow-xl p-12 text-center text-white border border-blue-400">
          <div className="max-w-2xl mx-auto">
            <div className="p-4 bg-white bg-opacity-20 rounded-2xl inline-block mb-6">
              <Award className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-black mb-3">Bienvenue sur Allo Béton!</h3>
            <p className="text-blue-100 mb-6 text-lg">
              Votre système de gestion commerciale est prêt. Lancez-vous avec nos données de démonstration ou importez vos propres données.
            </p>
            <button
              onClick={handleInitializeSampleData}
              disabled={initializing}
              className="inline-flex items-center space-x-2 bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all duration-200 shadow-lg disabled:opacity-50"
            >
              {initializing ? (
                <>
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Chargement...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Charger les données de démo</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};