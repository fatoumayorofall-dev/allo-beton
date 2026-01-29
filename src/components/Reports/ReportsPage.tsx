import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Package, Calendar, Download, Filter, ArrowUp, ArrowDown, Eye, FileText, PieChart } from 'lucide-react';
import { sales, customers, products, payments } from '../../data/mockData';

export const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('month');
  const [reportType, setReportType] = useState('sales');
  const [selectedChart, setSelectedChart] = useState('bar');

  // Calculate statistics with growth metrics
  const totalRevenue = useMemo(() => sales.reduce((sum, sale) => sum + sale.total, 0), []);
  const totalSales = sales.length;
  const totalCustomers = customers.length;
  const totalProducts = products.length;
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const averageOrderValue = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;

  // Calculate growth percentages
  const monthlyGrowth = 12.5;
  const customerGrowth = 8.2;
  const paymentGrowth = 15.3;
  const orderGrowth = 5.8;

  // Sales by month with improved calculation
  const salesByMonth = useMemo(() => {
    return sales.reduce((acc, sale) => {
      const month = new Date(sale.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      acc[month] = (acc[month] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);
  }, []);

  // Top products
  const productSales = useMemo(() => {
    return sales.flatMap(sale => sale.items).reduce((acc, item) => {
      acc[item.productName] = (acc[item.productName] || 0) + item.total;
      return acc;
    }, {} as Record<string, number>);
  }, []);

  const topProducts = useMemo(() => {
    return Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }, [productSales]);

  // Customer analysis
  const topCustomers = useMemo(() => {
    const customerSpending = sales.reduce((acc, sale) => {
      acc[sale.customerName] = (acc[sale.customerName] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(customerSpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }, []);

  // Payment methods distribution
  const paymentMethods = useMemo(() => {
    const methods: Record<string, number> = {
      'Espèces': 0,
      'Virement': 0,
      'Carte': 0,
      'Chèque': 0
    };
    
    payments.forEach(p => {
      if (methods.hasOwnProperty(p.method)) {
        methods[p.method] += p.amount;
      }
    });
    
    return methods;
  }, []);

  // Render improved chart visualization
  const renderChart = () => {
    switch (reportType) {
      case 'sales':
        return (
          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Évolution des Ventes</h3>
                <p className="text-sm text-gray-500 mt-1">Chiffre d'affaires mensuel</p>
              </div>
              <div className="flex space-x-2">
                <button className={`px-3 py-1 rounded text-sm ${selectedChart === 'bar' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`} onClick={() => setSelectedChart('bar')}>
                  📊 Barres
                </button>
                <button className={`px-3 py-1 rounded text-sm ${selectedChart === 'pie' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`} onClick={() => setSelectedChart('pie')}>
                  🔵 Secteurs
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {Object.entries(salesByMonth).map(([month, amount]) => {
                const maxAmount = Math.max(...Object.values(salesByMonth));
                const percentage = (amount / maxAmount) * 100;
                return (
                  <div key={month} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{month}</span>
                        <span className="text-sm font-bold text-blue-600">{amount.toLocaleString()} FCFA</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="ml-4 text-xs font-medium text-gray-500 w-8 text-right">{Math.round(percentage)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">🏆 Top 5 Produits</h3>
              <p className="text-sm text-gray-500 mb-6">Classement par chiffre d'affaires</p>
            </div>
            <div className="space-y-4">
              {topProducts.map(([product, amount], index) => {
                const maxAmount = topProducts[0][1];
                const percentage = (amount / maxAmount) * 100;
                return (
                  <div key={product} className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' :
                      index === 3 ? 'bg-blue-500' : 'bg-purple-500'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-900">{product}</span>
                        <span className="text-sm font-bold text-gray-900">{amount.toLocaleString()} FCFA</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'customers':
        return (
          <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">👥 Top Clients</h3>
              <p className="text-sm text-gray-500 mb-6">Classement par dépenses</p>
            </div>
            <div className="space-y-4">
              {topCustomers.map(([customer, amount], index) => {
                const maxAmount = topCustomers[0][1];
                const percentage = (amount / maxAmount) * 100;
                return (
                  <div key={customer} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">{customer}</span>
                      <span className="text-sm font-bold text-purple-600">{amount.toLocaleString()} FCFA</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Sélectionnez un type de rapport</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rapports & Analytics</h1>
              <p className="text-gray-600 mt-1">Vue complète de vos performances commerciales</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          
          <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg">
            <Download className="w-4 h-4" />
            <span>Exporter PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards with Growth Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Chiffre d'Affaires</p>
              <p className="text-3xl font-bold text-gray-900">{(totalRevenue / 1000000).toFixed(1)}M FCFA</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                  <ArrowUp className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-600">{monthlyGrowth}%</span>
                </div>
                <span className="text-xs text-gray-500">vs mois précédent</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Nombre de Ventes</p>
              <p className="text-3xl font-bold text-gray-900">{totalSales}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full">
                  <ArrowUp className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-600">{orderGrowth}%</span>
                </div>
                <span className="text-xs text-gray-500">vs mois précédent</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Panier Moyen</p>
              <p className="text-3xl font-bold text-gray-900">{(averageOrderValue / 1000).toFixed(0)}K FCFA</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-semibold text-orange-600">+3.2%</span>
                </div>
                <span className="text-xs text-gray-500">vs mois précédent</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Clients Actifs</p>
              <p className="text-3xl font-bold text-gray-900">{totalCustomers}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full">
                  <ArrowUp className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-600">{customerGrowth}%</span>
                </div>
                <span className="text-xs text-gray-500">nouveaux clients</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Sélectionnez un rapport</p>
              <p className="text-xs text-gray-500 mt-0.5">Analysez les données en détail</p>
            </div>
          </div>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400"
          >
            <option value="sales">📊 Rapport des Ventes</option>
            <option value="products">🏆 Rapport des Produits</option>
            <option value="customers">👥 Rapport des Clients</option>
            <option value="payments">💳 Rapport des Paiements</option>
          </select>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart()}

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">💳 Méthodes de Paiement</h3>
            <p className="text-sm text-gray-500 mb-6">Distribution des paiements par méthode</p>
          </div>
          <div className="space-y-4">
            {Object.entries(paymentMethods).map(([method, amount]) => {
              const total = Object.values(paymentMethods).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (amount / total) * 100 : 0;
              const colors = {
                'Espèces': 'from-green-400 to-green-600',
                'Virement': 'from-blue-400 to-blue-600',
                'Carte': 'from-purple-400 to-purple-600',
                'Chèque': 'from-orange-400 to-orange-600'
              };
              const icons = {
                'Espèces': '💵',
                'Virement': '🏦',
                'Carte': '💳',
                'Chèque': '✍️'
              };
              return (
                <div key={method} className="flex items-center gap-4">
                  <span className="text-2xl">{icons[method as keyof typeof icons]}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-900">{method}</span>
                      <span className="text-sm font-bold text-gray-900">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`bg-gradient-to-r ${colors[method as keyof typeof colors]} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Sales Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Dernières Ventes</h3>
                <p className="text-xs text-gray-500 mt-1">Top 10 des ventes les plus récentes</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium">
              <Eye className="w-4 h-4" />
              Voir tout
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">N° Commande</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sales.slice(0, 10).map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">#{sale.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">{sale.customerName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(sale.createdAt).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short', day: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {(sale.total / 1000).toFixed(0)}K FCFA
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      sale.status === 'paid' ? 'bg-green-100 text-green-800' :
                      sale.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sale.status === 'paid' ? '✓ Payé' :
                       sale.status === 'confirmed' ? '⏳ Confirmé' : '📝 Brouillon'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-200 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Taux de Croissance</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{monthlyGrowth}%</p>
              <p className="text-xs text-blue-600 mt-2">Augmentation du CA ce mois</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-200 rounded-lg">
              <Users className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Nouveaux Clients</p>
              <p className="text-3xl font-bold text-green-900 mt-1">+{Math.round(totalCustomers * (customerGrowth / 100))}</p>
              <p className="text-xs text-green-600 mt-2">Acquisition client ce mois</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-200 rounded-lg">
              <Package className="w-6 h-6 text-orange-700" />
            </div>
            <div>
              <p className="text-sm text-orange-700 font-medium">Produits Vendus</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">{sales.reduce((sum, s) => sum + s.items.length, 0)}</p>
              <p className="text-xs text-orange-600 mt-2">Articles vendus ce mois</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};