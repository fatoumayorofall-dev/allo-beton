import React, { useMemo } from 'react';
import {
  Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DashboardChartsProps {
  recentSales?: any[];
}

// Couleurs professionnelles
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const DashboardCharts: React.FC<DashboardChartsProps> = () => {
  // Données de tendance de ventes (7 derniers jours)
  const salesTrendData = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return days.map((day) => ({
      name: day,
      revenue: Math.floor(Math.random() * 500000) + 200000,
      sales: Math.floor(Math.random() * 15) + 5,
    }));
  }, []);

  // Données de ventes par catégorie
  const categoryDistribution = useMemo(() => [
    { name: 'Béton', value: 35, sales: 45 },
    { name: 'Ciment', value: 25, sales: 32 },
    { name: 'Sable', value: 20, sales: 28 },
    { name: 'Gravier', value: 12, sales: 15 },
    { name: 'Autres', value: 8, sales: 10 },
  ], []);

  // Données de performance horaire
  const hourlyPerformance = useMemo(() => {
    const hours = ['06h', '08h', '10h', '12h', '14h', '16h', '18h', '20h'];
    return hours.map((hour) => ({
      name: hour,
      ventes: Math.floor(Math.random() * 20) + 5,
      revenus: Math.floor(Math.random() * 600000) + 100000,
    }));
  }, []);

  // Top produits
  const topProductsData = useMemo(() => [
    { name: 'Béton C25', quantity: 150, revenue: 7500000, growth: 12.5 },
    { name: 'Béton C30', quantity: 120, revenue: 6000000, growth: 8.3 },
    { name: 'Ciment 32.5', quantity: 200, revenue: 4000000, growth: -2.1 },
    { name: 'Sable 0/4', quantity: 180, revenue: 1800000, growth: 5.7 },
  ], []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900">{label}</p>
          {payload.map((entry: any, idx: number) => (
            <p key={idx} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Tendance de ventes + Distribution par catégorie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tendance Revenue */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Tendance Revenue</h3>
            </div>
            <p className="text-sm text-gray-600">Progression des 7 derniers jours</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution Catégories */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow">
          <div className="mb-6">
            <h3 className="text-xl font-black text-gray-900">Distribution</h3>
            <p className="text-sm text-gray-600 mt-1">Par catégorie de produits</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryDistribution.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Performance horaire + Top produits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance horaire */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Performance Horaire</h3>
            </div>
            <p className="text-sm text-gray-600">Activité par heure aujourd'hui</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={hourlyPerformance} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis yAxisId="left" stroke="#6B7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6B7280" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar yAxisId="left" dataKey="ventes" fill="#10B981" radius={[8, 8, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="revenus" stroke="#3B82F6" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Top Produits */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Top Produits</h3>
            </div>
            <p className="text-sm text-gray-600">Meilleurs ventes ce mois</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={topProductsData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" />
              <YAxis dataKey="name" type="category" width={195} stroke="#6B7280" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="quantity" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Comparaison ventes vs revenu + Croissance produits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventes vs Revenue */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow">
          <div className="mb-6">
            <h3 className="text-xl font-black text-gray-900">Ventes vs Revenue</h3>
            <p className="text-sm text-gray-600 mt-1">Corrélation cette semaine</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="sales" stroke="#10B981" fill="url(#colorSales)" />
              <Area type="monotone" dataKey="revenue" stroke="#F59E0B" fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Croissance Produits */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Croissance Produits</h3>
            </div>
            <p className="text-sm text-gray-600">Taux de croissance %</p>
          </div>
          <div className="space-y-4">
            {topProductsData.map((product, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-gradient-to-r from-slate-50 to-gray-100 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                  <div className="w-full bg-gray-300 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        product.growth > 0
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                          : 'bg-gradient-to-r from-red-500 to-rose-600'
                      }`}
                      style={{ width: `${Math.abs(product.growth)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {product.growth > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`font-bold text-sm ${product.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.growth > 0 ? '+' : ''}{product.growth}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
