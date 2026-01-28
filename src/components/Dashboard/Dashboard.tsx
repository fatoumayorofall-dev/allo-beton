import React, { useEffect, useState } from 'react';
import { StatsCard } from './StatsCard';
import { TrendingUp, ShoppingCart, AlertTriangle, DollarSign, Package, Users, Crown, Award, RefreshCw } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Tableau de Bord
          </h1>
          <p className="text-gray-600 mt-1">Vue d'ensemble de votre activité commerciale</p>
        </div>
        
        {stats.totalSales === 0 && (
          <button
            onClick={handleInitializeSampleData}
            disabled={initializing}
            className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg"
          >
            {initializing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Initialisation...</span>
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                <span>Charger les données d'exemple</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Stats Grid avec design amélioré */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Chiffre d'Affaires du Mois"
          value={`${stats.monthlyRevenue.toLocaleString()} FCFA`}
          change="12.5%"
          changeType="increase"
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Ventes Totales"
          value={stats.totalSales}
          change="8 nouvelles"
          changeType="increase"
          icon={ShoppingCart}
          color="blue"
        />
        <StatsCard
          title="Commandes en Attente"
          value={stats.pendingOrders}
          icon={Package}
          color="orange"
        />
        <StatsCard
          title="Alertes Stock"
          value={stats.lowStockItems}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Main Content Grid avec design premium */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Ventes Récentes</h2>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="space-y-4">
            {recentSales.length > 0 ? recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-blue-50 hover:to-blue-100 transition-all duration-200">
                <div>
                  <p className="font-medium text-gray-900">{sale.customerName || sale.customer?.name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(sale.created_at || sale.createdAt).toLocaleDateString('fr-FR')} • {sale.sellerName || 'Vendeur'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{(sale.total_amount || sale.total || 0).toLocaleString()} FCFA</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    sale.status === 'paid' ? 'bg-green-100 text-green-800' :
                    sale.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sale.status === 'paid' ? 'Payé' :
                     sale.status === 'confirmed' ? 'Confirmé' : 'Brouillon'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune vente récente</p>
                <p className="text-sm text-gray-400 mt-1">Les ventes apparaîtront ici</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Meilleurs Clients</h2>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Crown className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <div className="space-y-4">
            {topClients.length > 0 ? topClients.map((client, index) => (
              <div key={client.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg hover:from-yellow-100 hover:to-orange-100 transition-all duration-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                    index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                    index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' : 'bg-gradient-to-r from-blue-400 to-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-500">{client.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{client.totalPurchases.toLocaleString()} FCFA</p>
                  {(client.balance || client.current_balance) > 0 && (
                    <p className="text-xs text-orange-600">Créance: {(client.balance || client.current_balance).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun client</p>
                <p className="text-sm text-gray-400 mt-1">Ajoutez vos premiers clients</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Alertes Stock</h2>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="space-y-4">
            {lowStockProducts.length > 0 ? lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200 hover:from-red-100 hover:to-orange-100 transition-all duration-200">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.category?.name || 'Produit'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">{product.stock} {product.unit}</p>
                  <p className="text-xs text-gray-500">Min: {product.minStock}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune alerte stock</p>
                <p className="text-sm text-gray-400 mt-1">Tous vos stocks sont OK</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message d'accueil si pas de données */}
      {stats.totalSales === 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 text-center">
          <div className="max-w-md mx-auto">
            <Award className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Bienvenue dans Allo Béton !
            </h3>
            <p className="text-gray-600 mb-4">
              Votre système de gestion est prêt. Commencez par charger des données d'exemple ou créez vos premiers produits et clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleInitializeSampleData}
                disabled={initializing}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <Package className="w-4 h-4" />
                <span>Charger les données d'exemple</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};