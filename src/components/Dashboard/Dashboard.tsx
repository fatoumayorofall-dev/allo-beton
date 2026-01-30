import React, { useEffect, useState } from 'react';
import { StatsCard } from './StatsCard';
import { TrendingUp, ShoppingCart, AlertTriangle, DollarSign, Package, Users, Crown, Award, RefreshCw, Truck, CreditCard, Calendar, BarChart3 } from 'lucide-react';
import { dashboardAPI, salesAPI, productsAPI, customersAPI, paymentsAPI } from '../../services/mysql-api';
import { useAuthContext } from '../../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuthContext();
  const [stats, setStats] = useState({
    totalSales: 0,
    monthlyRevenue: 0,
    pendingOrders: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalPayments: 0,
    unpaidAmount: 0
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Charger toutes les données en parallèle
      const [statsResult, salesResult, productsResult, customersResult, paymentsResult] = await Promise.allSettled([
        dashboardAPI.getStats(),
        salesAPI.getAll(),
        productsAPI.getAll(),
        customersAPI.getAll(),
        paymentsAPI.getAll()
      ]);

      // Traiter les statistiques
      if (statsResult.status === 'fulfilled' && statsResult.value.success) {
        const dashStats = statsResult.value.data;
        setStats(prev => ({
          ...prev,
          totalSales: dashStats.totalSales || 0,
          monthlyRevenue: dashStats.monthlyRevenue || 0,
          pendingOrders: dashStats.pendingOrders || 0,
          lowStockItems: dashStats.lowStockItems || 0
        }));
      }

      // Traiter les ventes
      let allSales: any[] = [];
      if (salesResult.status === 'fulfilled' && salesResult.value.success) {
        allSales = salesResult.value.data || [];
        setRecentSales(allSales.slice(0, 5));
        
        // Calculer les données mensuelles pour le graphique
        const monthly = calculateMonthlyData(allSales);
        setMonthlyData(monthly);
      }

      // Traiter les produits
      if (productsResult.status === 'fulfilled' && productsResult.value.success) {
        const products = productsResult.value.data || [];
        const lowStock = products.filter((p: any) => 
          (p.stock || 0) <= (p.min_stock || p.minStock || 5)
        );
        setLowStockProducts(lowStock.slice(0, 5));
        setStats(prev => ({ ...prev, totalProducts: products.length, lowStockItems: lowStock.length }));
      }

      // Traiter les clients et calculer leurs totaux d'achats réels
      if (customersResult.status === 'fulfilled' && customersResult.value.success) {
        const customers = customersResult.value.data || [];
        
        // Calculer le total des achats pour chaque client
        const clientsWithTotals = customers.map((client: any) => {
          const clientSales = allSales.filter((sale: any) => 
            sale.customer_id === client.id || sale.customerId === client.id
          );
          const totalPurchases = clientSales.reduce((sum: number, sale: any) => 
            sum + (sale.total_amount || sale.total || 0), 0
          );
          return { ...client, totalPurchases };
        });
        
        // Trier par total d'achats et prendre les 5 meilleurs
        const topClientsSorted = clientsWithTotals
          .sort((a: any, b: any) => b.totalPurchases - a.totalPurchases)
          .slice(0, 5);
        
        setTopClients(topClientsSorted);
        setStats(prev => ({ ...prev, totalCustomers: customers.length }));
      }

      // Traiter les paiements
      if (paymentsResult.status === 'fulfilled' && paymentsResult.value.success) {
        const payments = paymentsResult.value.data || [];
        const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        setStats(prev => ({ ...prev, totalPayments: totalPaid }));
      }

    } catch (error: any) {
      console.error('Erreur chargement dashboard:', error);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Calculer les données mensuelles pour les 6 derniers mois
  const calculateMonthlyData = (sales: any[]) => {
    const months: { [key: string]: number } = {};
    const now = new Date();
    
    // Initialiser les 6 derniers mois
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }
    
    // Ajouter les ventes
    sales.forEach((sale: any) => {
      const date = new Date(sale.created_at || sale.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (months[key] !== undefined) {
        months[key] += (sale.total_amount || sale.total || 0);
      }
    });
    
    // Convertir en tableau
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return Object.entries(months).map(([key, value]) => {
      const [year, month] = key.split('-');
      return {
        month: monthNames[parseInt(month) - 1],
        year,
        revenue: value
      };
    });
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
        
        <button
          onClick={loadDashboardData}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Stats Grid - Ligne 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Chiffre d'Affaires du Mois"
          value={`${stats.monthlyRevenue.toLocaleString()} FCFA`}
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Ventes Totales"
          value={stats.totalSales}
          icon={ShoppingCart}
          color="blue"
        />
        <StatsCard
          title="Clients"
          value={stats.totalCustomers}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="Alertes Stock"
          value={stats.lowStockItems}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Graphique des revenus mensuels */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Évolution du Chiffre d'Affaires</h2>
            <p className="text-sm text-gray-500">6 derniers mois</p>
          </div>
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        
        {monthlyData.length > 0 ? (
          <div className="flex items-end justify-between h-48 gap-2">
            {monthlyData.map((data, index) => {
              const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);
              const heightPercent = (data.revenue / maxRevenue) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center justify-end h-40">
                    <span className="text-xs text-gray-600 mb-1 font-medium">
                      {data.revenue > 0 ? `${(data.revenue / 1000000).toFixed(1)}M` : '0'}
                    </span>
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-700 hover:to-blue-500"
                      style={{ height: `${Math.max(heightPercent, 2)}%`, minHeight: '4px' }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-2 font-medium">{data.month}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400">
            <p>Aucune donnée disponible</p>
          </div>
        )}
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
                  <p className="text-sm text-gray-500">{product.category?.name || product.category_name || 'Produit'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">{product.stock} {product.unit}</p>
                  <p className="text-xs text-gray-500">Min: {product.min_stock || product.minStock || 5}</p>
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
              Votre système de gestion est prêt. Commencez par créer vos premiers produits, clients et ventes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};