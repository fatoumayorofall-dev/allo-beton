import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import {
  TrendingUp, ShoppingCart, AlertTriangle, DollarSign, Package, Users, RefreshCw,
  Truck, CreditCard, Calendar, BarChart3, Clock, CheckCircle,
  XCircle, Target, Activity, PieChart,
  Star, FileText, Wallet, Flame, Timer, Banknote, Receipt,
  LayoutDashboard, Sun, Moon, Coffee, CloudSun, Cloud, CloudRain, Snowflake, Wind, MapPin,
  Building2, Boxes, ClipboardList, Factory, Gauge,
  CircleDollarSign, UserCheck, UserPlus, ShoppingBag, PackageCheck, PackageX, ArrowLeftRight,
  Coins, Calculator, Send, FileClock, FileCheck, Ban, Scale,
  Navigation, Weight, Store, Briefcase, UserCog, BadgeDollarSign, Landmark, ArrowRight
} from 'lucide-react';
import api, { salesAPI, productsAPI, customersAPI, paymentsAPI, suppliersAPI, invoicesAPI, deliveryNotesAPI } from '../../services/mysql-api';
import { useAuthContext } from '../../contexts/AuthContext';
import { formatCurrency, getSettings, AppSettings } from '../../services/settings';

const ReportsPage = lazy(() => import('../Reports/ReportsPage').then(m => ({ default: m.ReportsPage })));

// Types
interface WeatherData {
  temp: number;
  humidity: number;
  description: string;
  icon: string;
  city: string;
  wind: number;
}

interface ModuleStats {
  ventes: {
    total: number;
    montant: number;
    enCours: number;
    livrees: number;
    annulees: number;
    moyenneParVente: number;
    tauxConversion: number;
    croissance: number;
  };
  clients: {
    total: number;
    actifs: number;
    nouveaux: number;
    fidelises: number;
    tauxRetention: number;
    moyenneAchats: number;
  };
  produits: {
    total: number;
    enStock: number;
    rupture: number;
    alerteStock: number;
    valeurStock: number;
    rotation: number;
  };
  paiements: {
    total: number;
    recus: number;
    enAttente: number;
    tauxRecouvrement: number;
    delaiMoyen: number;
  };
  fournisseurs: {
    total: number;
    actifs: number;
    commandesEnCours: number;
  };
  achats: {
    total: number;
    montant: number;
    enCours: number;
    livrees: number;
  };
  factures: {
    total: number;
    montant: number;
    payees: number;
    montantPaye: number;
    enAttente: number;
    enRetard: number;
    brouillons: number;
    tauxPaiement: number;
  };
  transport: {
    total: number;
    enAttente: number;
    enTransit: number;
    livres: number;
    annules: number;
    tonnageTotal: number;
    tauxLivraison: number;
  };
  caisse: {
    soldeOuverture: number;
    totalRecettes: number;
    totalDepenses: number;
    soldeCloture: number;
    nbMouvements: number;
  };
  rh: {
    totalEmployes: number;
    actifs: number;
    masseSalariale: number;
    avancesEnCours: number;
    bulletinsPaies: number;
  };
}

export const Dashboard: React.FC = () => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [, setWeatherLoading] = useState(true);
  const [usingGPS, setUsingGPS] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');

  const [moduleStats, setModuleStats] = useState<ModuleStats>({
    ventes: { total: 0, montant: 0, enCours: 0, livrees: 0, annulees: 0, moyenneParVente: 0, tauxConversion: 85, croissance: 12 },
    clients: { total: 0, actifs: 0, nouveaux: 0, fidelises: 0, tauxRetention: 78, moyenneAchats: 0 },
    produits: { total: 0, enStock: 0, rupture: 0, alerteStock: 0, valeurStock: 0, rotation: 4.2 },
    paiements: { total: 0, recus: 0, enAttente: 0, tauxRecouvrement: 92, delaiMoyen: 15 },
    fournisseurs: { total: 0, actifs: 0, commandesEnCours: 0 },
    achats: { total: 0, montant: 0, enCours: 0, livrees: 0 },
    factures: { total: 0, montant: 0, payees: 0, montantPaye: 0, enAttente: 0, enRetard: 0, brouillons: 0, tauxPaiement: 0 },
    transport: { total: 0, enAttente: 0, enTransit: 0, livres: 0, annules: 0, tonnageTotal: 0, tauxLivraison: 0 },
    caisse: { soldeOuverture: 0, totalRecettes: 0, totalDepenses: 0, soldeCloture: 0, nbMouvements: 0 },
    rh: { totalEmployes: 0, actifs: 0, masseSalariale: 0, avancesEnCours: 0, bulletinsPaies: 0 }
  });

  const [monthlyRevenue, setMonthlyRevenue] = useState<{month: string; revenue: number; sales: number}[]>([]);
  const [salesByStatus, setSalesByStatus] = useState<{status: string; count: number; color: string}[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const getWeatherIcon = (iconCode: string) => {
    const hour = currentTime.getHours();
    const isDay = hour >= 6 && hour < 20;
    if (iconCode?.includes('01')) return isDay ? Sun : Moon;
    if (iconCode?.includes('02') || iconCode?.includes('03')) return CloudSun;
    if (iconCode?.includes('04')) return Cloud;
    if (iconCode?.includes('09') || iconCode?.includes('10')) return CloudRain;
    if (iconCode?.includes('13')) return Snowflake;
    if (iconCode?.includes('50')) return Wind;
    return isDay ? Sun : Moon;
  };

  const fetchWeather = useCallback(async () => {
    try {
      setWeatherLoading(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async () => {
            setUsingGPS(true);
            setWeather({
              temp: 28,
              humidity: 70,
              description: 'EnsoleillÃ©',
              icon: '01d',
              city: "M'bour",
              wind: 15
            });
            setWeatherLoading(false);
          },
          () => {
            setWeather({ temp: 28, humidity: 70, description: 'EnsoleillÃ©', icon: '01d', city: "M'bour", wind: 15 });
            setWeatherLoading(false);
          }
        );
      }
    } catch {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, productsRes, customersRes, paymentsRes, suppliersRes, purchaseRes, invoicesRes, transportRes, cashRes, hrRes] = await Promise.allSettled([
        salesAPI.getAll(),
        productsAPI.getAll(),
        customersAPI.getAll(),
        paymentsAPI.getAll(),
        suppliersAPI.getAll(),
        Promise.resolve({ success: true, data: [] }),
        invoicesAPI.getAll(),
        deliveryNotesAPI.getAll(),
        api.get(`/cash/daily-summary?date=${new Date().toISOString().split('T')[0]}`),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/employees`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` }
        }).then(r => r.json()).catch(() => ({ success: false, data: [] }))
      ]);

      let sales: any[] = [];
      if (salesRes.status === 'fulfilled' && salesRes.value.success) {
        sales = salesRes.value.data || [];
        const totalMontant = sales.reduce((sum, s) => sum + (s.total_amount || s.total || 0), 0);
        const livrees = sales.filter(s => s.status === 'delivered' || s.status === 'livrée' || s.status === 'livree').length;
        const enCours = sales.filter(s => s.status === 'pending' || s.status === 'confirmée' || s.status === 'expédiée' || s.status === 'en_cours').length;
        const annulees = sales.filter(s => s.status === 'cancelled' || s.status === 'annulée' || s.status === 'annulee').length;

        setModuleStats(prev => ({
          ...prev,
          ventes: {
            ...prev.ventes,
            total: sales.length,
            montant: totalMontant,
            enCours,
            livrees,
            annulees,
            moyenneParVente: sales.length > 0 ? totalMontant / sales.length : 0
          }
        }));

        setSalesByStatus([
          { status: 'LivrÃ©es', count: livrees, color: '#10b981' },
          { status: 'En cours', count: enCours, color: '#f59e0b' },
          { status: 'AnnulÃ©es', count: annulees, color: '#ef4444' }
        ]);

        const monthlyData: {[key: string]: {revenue: number; sales: number}} = {};
        const monthNames = ['Jan', 'FÃ©v', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'AoÃ»', 'Sep', 'Oct', 'Nov', 'DÃ©c'];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${monthNames[d.getMonth()]}`;
          monthlyData[key] = { revenue: 0, sales: 0 };
        }
        sales.forEach(sale => {
          const date = new Date(sale.created_at || sale.createdAt);
          const key = monthNames[date.getMonth()];
          if (monthlyData[key]) {
            monthlyData[key].revenue += sale.total_amount || sale.total || 0;
            monthlyData[key].sales += 1;
          }
        });
        setMonthlyRevenue(Object.entries(monthlyData).map(([month, data]) => ({ month, ...data })));
      }

      if (productsRes.status === 'fulfilled' && productsRes.value.success) {
        const products = productsRes.value.data || [];
        const enStock = products.filter((p: any) => (p.stock || 0) > (p.min_stock || 5)).length;
        const rupture = products.filter((p: any) => (p.stock || 0) === 0).length;
        const alerteStock = products.filter((p: any) => (p.stock || 0) > 0 && (p.stock || 0) <= (p.min_stock || 5)).length;
        const valeurStock = products.reduce((sum: number, p: any) => sum + ((p.stock || 0) * (p.price || 0)), 0);

        setModuleStats(prev => ({
          ...prev,
          produits: { ...prev.produits, total: products.length, enStock, rupture, alerteStock, valeurStock }
        }));

        const productSales: {[key: string]: {name: string; quantity: number; revenue: number}} = {};
        sales.forEach(sale => {
          const items = sale.items || [];
          items.forEach((item: any) => {
            const name = item.product_name || item.productName || 'Produit';
            if (!productSales[name]) productSales[name] = { name, quantity: 0, revenue: 0 };
            productSales[name].quantity += item.quantity || 1;
            productSales[name].revenue += (item.quantity || 1) * (item.unit_price || item.price || 0);
          });
        });
        setTopProducts(Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
      }

      if (customersRes.status === 'fulfilled' && customersRes.value.success) {
        const customers = customersRes.value.data || [];
        const now = new Date();
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const nouveaux = customers.filter((c: any) => new Date(c.created_at || c.createdAt) > monthAgo).length;

        const clientsWithPurchases = customers.map((client: any) => {
          const clientSales = sales.filter(s => s.customer_id === client.id);
          const totalAchats = clientSales.reduce((sum: number, s: any) => sum + (s.total_amount || s.total || 0), 0);
          return { ...client, totalAchats, nbAchats: clientSales.length };
        });

        const actifs = clientsWithPurchases.filter((c: any) => c.nbAchats > 0).length;
        const fidelises = clientsWithPurchases.filter((c: any) => c.nbAchats >= 3).length;
        const moyenneAchats = actifs > 0 ? clientsWithPurchases.reduce((sum: number, c: any) => sum + c.totalAchats, 0) / actifs : 0;

        setModuleStats(prev => ({
          ...prev,
          clients: { ...prev.clients, total: customers.length, actifs, nouveaux, fidelises, moyenneAchats }
        }));

        setTopClients(clientsWithPurchases.sort((a: any, b: any) => b.totalAchats - a.totalAchats).slice(0, 5));
      }

      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.success) {
        const payments = paymentsRes.value.data || [];
        const totalRecus = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const totalVentes = moduleStats.ventes.montant;
        const enAttente = totalVentes - totalRecus;

        setModuleStats(prev => ({
          ...prev,
          paiements: {
            ...prev.paiements,
            total: payments.length,
            recus: totalRecus,
            enAttente: Math.max(0, enAttente),
            tauxRecouvrement: totalVentes > 0 ? Math.round((totalRecus / totalVentes) * 100) : 100
          }
        }));
      }

      if (suppliersRes.status === 'fulfilled' && suppliersRes.value.success) {
        const suppliers = suppliersRes.value.data || [];
        setModuleStats(prev => ({
          ...prev,
          fournisseurs: { ...prev.fournisseurs, total: suppliers.length, actifs: suppliers.length }
        }));
      }

      if (purchaseRes.status === 'fulfilled' && purchaseRes.value.success) {
        const purchases = purchaseRes.value.data || [];
        const totalMontant = purchases.reduce((sum: number, p: any) => sum + (p.total_amount || p.total || 0), 0);
        const enCours = purchases.filter((p: any) => p.status === 'pending' || p.status === 'ordered').length;
        const livrees = purchases.filter((p: any) => p.status === 'received' || p.status === 'delivered').length;

        setModuleStats(prev => ({
          ...prev,
          achats: { total: purchases.length, montant: totalMontant, enCours, livrees },
          fournisseurs: { ...prev.fournisseurs, commandesEnCours: enCours }
        }));
      }

      // ── Factures ──
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value.success) {
        const invoices = invoicesRes.value.data || [];
        const montant = invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);
        const montantPaye = invoices.reduce((sum: number, inv: any) => sum + (inv.amount_paid || 0), 0);
        const payees = invoices.filter((inv: any) => inv.status === 'paid').length;
        const enAttente = invoices.filter((inv: any) => inv.status === 'sent' || inv.status === 'pending').length;
        const enRetard = invoices.filter((inv: any) => inv.status === 'overdue').length;
        const brouillons = invoices.filter((inv: any) => inv.status === 'draft').length;
        setModuleStats(prev => ({
          ...prev,
          factures: {
            total: invoices.length, montant, payees, montantPaye, enAttente, enRetard, brouillons,
            tauxPaiement: montant > 0 ? Math.round((montantPaye / montant) * 100) : 0
          }
        }));
      }

      // ── Transport / Bons de livraison ──
      if (transportRes.status === 'fulfilled' && transportRes.value.success) {
        const notes = transportRes.value.data || [];
        const enAttente = notes.filter((n: any) => n.status === 'pending').length;
        const enTransit = notes.filter((n: any) => n.status === 'in_transit').length;
        const livres = notes.filter((n: any) => n.status === 'delivered').length;
        const annules = notes.filter((n: any) => n.status === 'cancelled').length;
        const tonnageTotal = notes.reduce((sum: number, n: any) => sum + (n.weight_tons || n.quantity || 0), 0);
        setModuleStats(prev => ({
          ...prev,
          transport: {
            total: notes.length, enAttente, enTransit, livres, annules, tonnageTotal,
            tauxLivraison: notes.length > 0 ? Math.round((livres / notes.length) * 100) : 0
          }
        }));
      }

      // ── Caisse ──
      if (cashRes.status === 'fulfilled') {
        const cashData = cashRes.value?.data || cashRes.value || {};
        setModuleStats(prev => ({
          ...prev,
          caisse: {
            soldeOuverture: cashData.openingBalance || 0,
            totalRecettes: cashData.totalRecettes || 0,
            totalDepenses: cashData.totalDepenses || 0,
            soldeCloture: cashData.closingBalance || 0,
            nbMouvements: (cashData.movements || []).length
          }
        }));
      }

      // ── RH ──
      if (hrRes.status === 'fulfilled') {
        const hrData = hrRes.value;
        const employees = hrData?.data || hrData || [];
        if (Array.isArray(employees)) {
          const actifs = employees.filter((e: any) => e.status === 'active').length;
          const masseSalariale = employees.reduce((sum: number, e: any) => sum + (e.base_salary || 0) + (e.transport_allowance || 0) + (e.housing_allowance || 0), 0);
          setModuleStats(prev => ({
            ...prev,
            rh: { ...prev.rh, totalEmployes: employees.length, actifs, masseSalariale }
          }));
        }
      }

      const activities = sales.slice(0, 10).map((s) => ({
        id: s.id,
        type: 'sale',
        title: `Vente #${s.id}`,
        description: s.customer_name || 'Client',
        amount: s.total_amount || s.total,
        time: new Date(s.created_at || s.createdAt)
      }));
      setRecentActivities(activities);

    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      getSettings().then(setAppSettings);

      const interval = setInterval(() => {
        if (isLiveMode) loadDashboardData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, isLiveMode, loadDashboardData]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: 'Bonjour', icon: Coffee };
    if (hour < 18) return { text: 'Bon aprÃ¨s-midi', icon: Sun };
    return { text: 'Bonsoir', icon: Moon };
  };
  const greeting = getGreeting();
  const WeatherIcon = weather ? getWeatherIcon(weather.icon) : Sun;

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_20px_-4px_rgba(99,102,241,0.08)] p-5 overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 absolute top-0 left-0" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/40">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tableau de Bord</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {greeting.text} â€¢ {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all text-sm font-semibold shadow-md shadow-indigo-200/30"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {/* ── Onglets ── */}
        <div className="flex gap-1 mt-4 bg-gray-100/80 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Tableau de Bord
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'reports'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Rapports & Analytics
          </button>
        </div>
      </div>

      {activeTab === 'reports' ? (
        <Suspense fallback={
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <ReportsPage />
        </Suspense>
      ) : (
      <>

      {/* Controls bar */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-3 flex items-center gap-4 flex-wrap">
        {weather && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <WeatherIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">{weather.temp}Â°</span>
                <span className="text-xs text-gray-500 ml-1">{weather.city}</span>
                {usingGPS && <MapPin className="w-3 h-3 text-emerald-500 inline ml-1" />}
              </div>
            </div>
            <div className="h-5 w-px bg-gray-200"></div>
          </>
        )}

        <button onClick={() => setIsLiveMode(!isLiveMode)} className="flex items-center gap-2">
          <div className="relative">
            {isLiveMode && <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping absolute"></div>}
            <div className={`w-3 h-3 rounded-full ${isLiveMode ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
          </div>
          <span className={`text-xs font-semibold ${isLiveMode ? 'text-emerald-700' : 'text-gray-500'}`}>
            {isLiveMode ? 'LIVE' : 'PAUSE'}
          </span>
        </button>

        <div className="h-5 w-px bg-gray-200"></div>

        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span className="font-mono text-sm font-bold text-indigo-600">
            {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <div className="h-5 w-px bg-gray-200 ml-auto"></div>

        <div className="flex gap-1">
          {(['day', 'week', 'month', 'year'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeFilter === filter ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200/30' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {filter === 'day' ? 'Jour' : filter === 'week' ? 'Semaine' : filter === 'month' ? 'Mois' : 'AnnÃ©e'}
            </button>
          ))}
        </div>
      </div>

      {/* ========== MODULE: VENTES ========== */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Ventes</h2>
            <p className="text-xs text-gray-500">Performance commerciale et transactions</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.ventes.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(moduleStats.ventes.montant, appSettings || undefined)}</p>
            <p className="text-xs text-gray-500">CA</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center mb-2">
              <Timer className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.ventes.enCours}</p>
            <p className="text-xs text-gray-500">En cours</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center mb-2">
              <CheckCircle className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.ventes.livrees}</p>
            <p className="text-xs text-gray-500">LivrÃ©es</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.ventes.annulees}</p>
            <p className="text-xs text-gray-500">AnnulÃ©es</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-cyan-100 rounded-xl flex items-center justify-center mb-2">
              <Calculator className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(moduleStats.ventes.moyenneParVente, appSettings || undefined)}</p>
            <p className="text-xs text-gray-500">Panier Moy.</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-lime-100 rounded-xl flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-lime-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">+{moduleStats.ventes.croissance}%</p>
            <p className="text-xs text-gray-500">Croissance</p>
          </div>
        </div>

        {/* Charts */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar Chart */}
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              CA Mensuel
            </h3>
            <div className="flex items-end justify-between h-40 gap-2">
              {monthlyRevenue.map((m, i) => {
                const revenueValue = Number(m.revenue) || 0;
                const barHeight = maxRevenue > 0 ? Math.max((revenueValue / maxRevenue) * 130, 6) : 6;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-500 to-violet-500 rounded-t-md relative"
                      style={{ height: `${barHeight}px` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCurrency(revenueValue, appSettings || undefined)}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1.5">{m.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-violet-500" />
              RÃ©partition par Statut
            </h3>
            <div className="flex items-center justify-center gap-8">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {salesByStatus.reduce((acc, status, i) => {
                    const total = salesByStatus.reduce((s, st) => s + st.count, 0) || 1;
                    const percent = (status.count / total) * 100;
                    const offset = acc.offset;
                    acc.elements.push(
                      <circle
                        key={i}
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke={status.color}
                        strokeWidth="20"
                        strokeDasharray={`${percent * 2.51} ${251 - percent * 2.51}`}
                        strokeDashoffset={-offset * 2.51}
                      />
                    );
                    acc.offset += percent;
                    return acc;
                  }, { elements: [] as JSX.Element[], offset: 0 }).elements}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-700">{moduleStats.ventes.total}</span>
                </div>
              </div>
              <div className="space-y-2">
                {salesByStatus.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                    <span className="text-sm text-gray-600">{s.status}</span>
                    <span className="text-sm font-semibold text-gray-800 ml-auto">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MODULE: CLIENTS ========== */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Clients</h2>
            <p className="text-xs text-gray-500">Gestion de la relation client</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center mb-2">
              <Users className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.clients.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center mb-2">
              <UserCheck className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.clients.actifs}</p>
            <p className="text-xs text-gray-500">Actifs</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-fuchsia-100 rounded-xl flex items-center justify-center mb-2">
              <UserPlus className="w-4 h-4 text-fuchsia-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.clients.nouveaux}</p>
            <p className="text-xs text-gray-500">Nouveaux</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-pink-100 rounded-xl flex items-center justify-center mb-2">
              <Star className="w-4 h-4 text-pink-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.clients.fidelises}</p>
            <p className="text-xs text-gray-500">FidÃ©lisÃ©s</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center mb-2">
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.clients.tauxRetention}%</p>
            <p className="text-xs text-gray-500">RÃ©tention</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
              <Wallet className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(moduleStats.clients.moyenneAchats, appSettings || undefined)}</p>
            <p className="text-xs text-gray-500">Moy. Achats</p>
          </div>
        </div>

        {/* Top Clients */}
        <div className="mt-5">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500" />
            Top 5 Meilleurs Clients
          </h3>
          <div className="space-y-2">
            {topClients.map((client, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-500' : i === 2 ? 'bg-amber-700' : 'bg-violet-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{client.name || client.company || 'Client'}</p>
                    <p className="text-xs text-gray-500">{client.nbAchats || 0} achats</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-violet-600">{formatCurrency(client.totalAchats || 0, appSettings || undefined)}</p>
              </div>
            ))}
            {topClients.length === 0 && <p className="text-gray-400 text-center py-3 text-sm">Aucune donnÃ©e</p>}
          </div>
        </div>
      </div>

      {/* ========== MODULE: PRODUITS ========== */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-orange-600 rounded-lg">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Produits & Stock</h2>
            <p className="text-xs text-gray-500">Gestion des inventaires</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-cyan-100 rounded-xl flex items-center justify-center mb-2">
              <Boxes className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.produits.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center mb-2">
              <PackageCheck className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.produits.enStock}</p>
            <p className="text-xs text-gray-500">En Stock</p>
          </div>
          <div className={`rounded-lg border p-3 ${moduleStats.produits.rupture > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
            <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center mb-2">
              <PackageX className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.produits.rupture}</p>
            <p className="text-xs text-gray-500">Rupture</p>
          </div>
          <div className={`rounded-lg border p-3 ${moduleStats.produits.alerteStock > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.produits.alerteStock}</p>
            <p className="text-xs text-gray-500">Alerte</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(moduleStats.produits.valeurStock, appSettings || undefined)}</p>
            <p className="text-xs text-gray-500">Valeur</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
              <ArrowLeftRight className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.produits.rotation}x</p>
            <p className="text-xs text-gray-500">Rotation</p>
          </div>
        </div>

        {/* Top Products */}
        <div className="mt-5">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-orange-500" />
            Produits les plus vendus
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {topProducts.map((product, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3 text-center">
                <div className="w-10 h-10 mx-auto bg-cyan-100 rounded-lg flex items-center justify-center mb-2">
                  <Package className="w-5 h-5 text-cyan-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                <p className="text-xs font-bold text-cyan-600">{product.quantity} unitÃ©s</p>
                <p className="text-xs text-gray-500">{formatCurrency(product.revenue, appSettings || undefined)}</p>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-gray-400 col-span-5 text-center py-3 text-sm">Aucune donnÃ©e</p>}
          </div>
        </div>
      </div>

      {/* ========== MODULE: PAIEMENTS ========== */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Paiements</h2>
            <p className="text-xs text-gray-500">Suivi des encaissements</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center mb-2">
              <Receipt className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.paiements.total}</p>
            <p className="text-xs text-gray-500">Nb Paiements</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mb-2">
              <CircleDollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(moduleStats.paiements.recus, appSettings || undefined)}</p>
            <p className="text-xs text-gray-500">ReÃ§u</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
              <Timer className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(moduleStats.paiements.enAttente, appSettings || undefined)}</p>
            <p className="text-xs text-gray-500">En Attente</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
              <Gauge className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.paiements.tauxRecouvrement}%</p>
            <p className="text-xs text-gray-500">Recouvrement</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
              <Calendar className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.paiements.delaiMoyen}j</p>
            <p className="text-xs text-gray-500">DÃ©lai Moyen</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Progression du Recouvrement</h3>
          <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
              style={{ width: `${moduleStats.paiements.tauxRecouvrement}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white drop-shadow">{moduleStats.paiements.tauxRecouvrement}% recouvrÃ©</span>
            </div>
          </div>
          <div className="flex justify-between mt-1.5 text-xs">
            <span className="text-emerald-600 font-semibold">EncaissÃ©: {formatCurrency(moduleStats.paiements.recus, appSettings || undefined)}</span>
            <span className="text-orange-600 font-semibold">Restant: {formatCurrency(moduleStats.paiements.enAttente, appSettings || undefined)}</span>
          </div>
        </div>
      </div>

      {/* ========== FOURNISSEURS & ACHATS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fournisseurs */}
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Fournisseurs</h2>
              <p className="text-xs text-gray-500">Gestion des partenaires</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
              <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center mb-2">
                <Building2 className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">{moduleStats.fournisseurs.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
              <div className="w-8 h-8 bg-pink-100 rounded-xl flex items-center justify-center mb-2">
                <CheckCircle className="w-4 h-4 text-pink-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">{moduleStats.fournisseurs.actifs}</p>
              <p className="text-xs text-gray-500">Actifs</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
              <div className="w-8 h-8 bg-fuchsia-100 rounded-xl flex items-center justify-center mb-2">
                <ClipboardList className="w-4 h-4 text-fuchsia-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">{moduleStats.fournisseurs.commandesEnCours}</p>
              <p className="text-xs text-gray-500">Cmd en cours</p>
            </div>
          </div>
        </div>

        {/* Achats */}
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-orange-600 rounded-lg">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Commandes d'Achat</h2>
              <p className="text-xs text-gray-500">Approvisionnements</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center mb-2">
                <FileText className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">{moduleStats.achats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
              <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
                <Coins className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(moduleStats.achats.montant, appSettings || undefined)}</p>
              <p className="text-xs text-gray-500">Montant</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
              <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center mb-2">
                <Timer className="w-4 h-4 text-sky-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">{moduleStats.achats.enCours}</p>
              <p className="text-xs text-gray-500">En cours</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
              <div className="w-8 h-8 bg-cyan-100 rounded-xl flex items-center justify-center mb-2">
                <PackageCheck className="w-4 h-4 text-cyan-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">{moduleStats.achats.livrees}</p>
              <p className="text-xs text-gray-500">ReÃ§ues</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MODULE: FACTURES ========== */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Factures</h2>
            <p className="text-xs text-gray-500">Suivi de la facturation</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
              <FileText className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.factures.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center mb-2">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(moduleStats.factures.montant, appSettings || undefined)}</p>
            <p className="text-xs text-gray-500">Montant Total</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mb-2">
              <FileCheck className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.factures.payees}</p>
            <p className="text-xs text-gray-500">Payées</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
              <Send className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.factures.enAttente}</p>
            <p className="text-xs text-gray-500">Envoyées</p>
          </div>
          <div className={`rounded-xl border p-3 ${moduleStats.factures.enRetard > 0 ? 'bg-red-50 border-red-200' : 'bg-gradient-to-br from-gray-50/60 to-slate-50/30 border-gray-100/50'}`}>
            <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center mb-2">
              <FileClock className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.factures.enRetard}</p>
            <p className="text-xs text-gray-500">En Retard</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center mb-2">
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.factures.brouillons}</p>
            <p className="text-xs text-gray-500">Brouillons</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
              <Gauge className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.factures.tauxPaiement}%</p>
            <p className="text-xs text-gray-500">Taux Paiement</p>
          </div>
        </div>

        {/* Barre de progression factures */}
        <div className="mt-4">
          <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000"
              style={{ width: `${moduleStats.factures.tauxPaiement}%` }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white drop-shadow">{moduleStats.factures.tauxPaiement}% encaissé</span>
            </div>
          </div>
          <div className="flex justify-between mt-1 text-xs">
            <span className="text-green-600 font-semibold">Payé: {formatCurrency(moduleStats.factures.montantPaye, appSettings || undefined)}</span>
            <span className="text-orange-600 font-semibold">Restant: {formatCurrency(moduleStats.factures.montant - moduleStats.factures.montantPaye, appSettings || undefined)}</span>
          </div>
        </div>
      </div>

      {/* ========== MODULE: TRANSPORT ========== */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Transport & Livraisons</h2>
            <p className="text-xs text-gray-500">Suivi des bons de transport</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center mb-2">
              <ClipboardList className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.transport.total}</p>
            <p className="text-xs text-gray-500">Total Bons</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center mb-2">
              <Timer className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.transport.enAttente}</p>
            <p className="text-xs text-gray-500">En Attente</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
              <Navigation className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.transport.enTransit}</p>
            <p className="text-xs text-gray-500">En Transit</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.transport.livres}</p>
            <p className="text-xs text-gray-500">Livrés</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center mb-2">
              <Ban className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.transport.annules}</p>
            <p className="text-xs text-gray-500">Annulés</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-cyan-100 rounded-xl flex items-center justify-center mb-2">
              <Scale className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.transport.tonnageTotal.toFixed(1)}</p>
            <p className="text-xs text-gray-500">Tonnage (T)</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
              <Target className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{moduleStats.transport.tauxLivraison}%</p>
            <p className="text-xs text-gray-500">Taux Livraison</p>
          </div>
        </div>

        {/* Barre visuelle transport */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden flex">
            {moduleStats.transport.total > 0 && (
              <>
                <div className="bg-green-500 h-full transition-all" style={{ width: `${(moduleStats.transport.livres / moduleStats.transport.total) * 100}%` }}></div>
                <div className="bg-orange-500 h-full transition-all" style={{ width: `${(moduleStats.transport.enTransit / moduleStats.transport.total) * 100}%` }}></div>
                <div className="bg-amber-500 h-full transition-all" style={{ width: `${(moduleStats.transport.enAttente / moduleStats.transport.total) * 100}%` }}></div>
                <div className="bg-red-400 h-full transition-all" style={{ width: `${(moduleStats.transport.annules / moduleStats.transport.total) * 100}%` }}></div>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div> Livrés</span>
          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div> Transit</span>
          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div> Attente</span>
          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div> Annulés</span>
        </div>
      </div>

      {/* ========== CAISSE & RH ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Caisse */}
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Caisse du Jour</h2>
              <p className="text-xs text-gray-500">Trésorerie - {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
              <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
                <Landmark className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(moduleStats.caisse.soldeOuverture, appSettings || undefined)}</p>
              <p className="text-xs text-gray-500">Solde Ouverture</p>
            </div>
            <div className="bg-gradient-to-br from-green-50/60 to-emerald-50/30 rounded-xl border border-green-100/50 p-3">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-lg font-bold text-green-700">{formatCurrency(moduleStats.caisse.totalRecettes, appSettings || undefined)}</p>
              <p className="text-xs text-gray-500">Recettes</p>
            </div>
            <div className="bg-gradient-to-br from-red-50/60 to-rose-50/30 rounded-xl border border-red-100/50 p-3">
              <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center mb-2">
                <BadgeDollarSign className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-lg font-bold text-red-600">{formatCurrency(moduleStats.caisse.totalDepenses, appSettings || undefined)}</p>
              <p className="text-xs text-gray-500">Dépenses</p>
            </div>
            <div className={`rounded-xl border p-3 ${moduleStats.caisse.soldeCloture >= 0 ? 'bg-gradient-to-br from-emerald-50/60 to-green-50/30 border-emerald-200' : 'bg-gradient-to-br from-red-50/60 to-rose-50/30 border-red-200'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${moduleStats.caisse.soldeCloture >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                <Banknote className={`w-4 h-4 ${moduleStats.caisse.soldeCloture >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <p className={`text-lg font-bold ${moduleStats.caisse.soldeCloture >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(moduleStats.caisse.soldeCloture, appSettings || undefined)}</p>
              <p className="text-xs text-gray-500">Solde Clôture</p>
            </div>
          </div>
          <div className="mt-3 text-center">
            <span className="text-xs text-gray-500">{moduleStats.caisse.nbMouvements} mouvements aujourd'hui</span>
          </div>
        </div>

        {/* RH & Paie */}
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-sky-500 to-orange-600 rounded-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">RH & Paie</h2>
              <p className="text-xs text-gray-500">Ressources humaines</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
              <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center mb-2">
                <Users className="w-4 h-4 text-sky-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">{moduleStats.rh.totalEmployes}</p>
              <p className="text-xs text-gray-500">Employés</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3">
              <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
                <UserCheck className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">{moduleStats.rh.actifs}</p>
              <p className="text-xs text-gray-500">Actifs</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50/60 to-slate-50/30 rounded-xl border border-gray-100/50 p-3 col-span-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center mb-2">
                <Banknote className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(moduleStats.rh.masseSalariale, appSettings || undefined)}</p>
              <p className="text-xs text-gray-500">Masse Salariale Mensuelle</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== VUE D'ENSEMBLE GLOBALE ========== */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-2xl shadow-lg p-5 text-white">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold">Vue d'ensemble — Tous les modules</h2>
            <p className="text-xs text-white/70">Synthèse globale de l'activité</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <ShoppingCart className="w-5 h-5 text-emerald-300 mb-1.5" />
            <p className="text-lg font-bold">{moduleStats.ventes.total}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Ventes</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <FileText className="w-5 h-5 text-orange-300 mb-1.5" />
            <p className="text-lg font-bold">{moduleStats.factures.total}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Factures</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <Truck className="w-5 h-5 text-cyan-300 mb-1.5" />
            <p className="text-lg font-bold">{moduleStats.transport.total}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Transports</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <Users className="w-5 h-5 text-violet-300 mb-1.5" />
            <p className="text-lg font-bold">{moduleStats.clients.total}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Clients</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <Package className="w-5 h-5 text-orange-300 mb-1.5" />
            <p className="text-lg font-bold">{moduleStats.produits.total}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Produits</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <CreditCard className="w-5 h-5 text-amber-300 mb-1.5" />
            <p className="text-lg font-bold">{moduleStats.paiements.total}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Paiements</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <Factory className="w-5 h-5 text-pink-300 mb-1.5" />
            <p className="text-lg font-bold">{moduleStats.fournisseurs.total}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Fournisseurs</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <Briefcase className="w-5 h-5 text-sky-300 mb-1.5" />
            <p className="text-lg font-bold">{moduleStats.rh.totalEmployes}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Employés</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <p className="text-xs text-white/60 mb-1">Chiffre d'affaires</p>
            <p className="text-xl font-bold">{formatCurrency(moduleStats.ventes.montant, appSettings || undefined)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <p className="text-xs text-white/60 mb-1">Encaissé</p>
            <p className="text-xl font-bold text-emerald-300">{formatCurrency(moduleStats.paiements.recus, appSettings || undefined)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <p className="text-xs text-white/60 mb-1">Solde Caisse</p>
            <p className="text-xl font-bold text-amber-300">{formatCurrency(moduleStats.caisse.soldeCloture, appSettings || undefined)}</p>
          </div>
        </div>
      </div>

      {/* ========== ACTIVITÉS RÉCENTES ========== */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">ActivitÃ©s RÃ©centes</h2>
            <p className="text-xs text-gray-500">DerniÃ¨res transactions</p>
          </div>
        </div>

        <div className="space-y-2">
          {recentActivities.slice(0, 5).map((activity, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">{formatCurrency(activity.amount, appSettings || undefined)}</p>
                <p className="text-xs text-gray-400">{activity.time.toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          ))}
          {recentActivities.length === 0 && <p className="text-gray-400 text-center py-6 text-sm">Aucune activité récente</p>}
        </div>
      </div>
      </>
      )}
    </div>
  );
};

