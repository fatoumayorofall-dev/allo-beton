import React, { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Package, Calendar, Download, Filter } from 'lucide-react';
import { sales, customers, products, payments } from '../../data/mockData';

export const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('month');
  const [reportType, setReportType] = useState('sales');

  // Calculate statistics
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSales = sales.length;
  const totalCustomers = customers.length;
  const totalProducts = products.length;
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);

  // Sales by month
  const salesByMonth = sales.reduce((acc, sale) => {
    const month = new Date(sale.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    acc[month] = (acc[month] || 0) + sale.total;
    return acc;
  }, {} as Record<string, number>);

  // Top products
  const productSales = sales.flatMap(sale => sale.items).reduce((acc, item) => {
    acc[item.productName] = (acc[item.productName] || 0) + item.total;
    return acc;
  }, {} as Record<string, number>);

  const topProducts = Object.entries(productSales)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const renderChart = () => {
    switch (reportType) {
      case 'sales':
        return (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Évolution des Ventes</h3>
            <div className="space-y-4">
              {Object.entries(salesByMonth).map(([month, amount]) => (
                <div key={month} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{month}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(amount / Math.max(...Object.values(salesByMonth))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-24 text-right">
                      {amount.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Produits</h3>
            <div className="space-y-4">
              {topProducts.map(([product, amount], index) => (
                <div key={product} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-900">{product}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {amount.toLocaleString()} FCFA
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Sélectionnez un type de rapport</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports et Analytics</h1>
          <p className="text-gray-600">Analysez vos performances commerciales</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200">
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Chiffre d'Affaires Total</p>
              <p className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} FCFA</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Nombre de Ventes</p>
              <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Clients Actifs</p>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Produits en Stock</p>
              <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="sales">Rapport des Ventes</option>
            <option value="products">Rapport des Produits</option>
            <option value="customers">Rapport des Clients</option>
            <option value="payments">Rapport des Paiements</option>
          </select>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart()}

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Répartition des Paiements</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Espèces</span>
              <span className="text-sm font-medium text-gray-900">45%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Virement</span>
              <span className="text-sm font-medium text-gray-900">35%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Carte</span>
              <span className="text-sm font-medium text-gray-900">15%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Chèque</span>
              <span className="text-sm font-medium text-gray-900">5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Détails des Ventes Récentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commande</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.slice(0, 10).map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">#{sale.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{sale.customerName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(sale.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {sale.total.toLocaleString()} FCFA
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.status === 'paid' ? 'bg-green-100 text-green-800' :
                      sale.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sale.status === 'paid' ? 'Payé' :
                       sale.status === 'confirmed' ? 'Confirmé' : 'Brouillon'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};