import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Customer, Sale, Payment, Supplier, DashboardStats } from '../types';
import {
  productsAPI,
  customersAPI,
  salesAPI,
  paymentsAPI,
  suppliersAPI,
  dashboardAPI
} from '../services/mysql-api';
import { useAuthContext } from './AuthContext';

interface DataContextType {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  suppliers: Supplier[];
  dashboardStats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshPayments: () => Promise<void>;
  refreshSuppliers: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuthContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonctions de rafraîchissement individuelles
  const refreshProducts = async () => {
    if (!user) return;
    try {
      const result = await productsAPI.getAll();
      if (result.success) {
        setProducts(result.data || []);
      } else {
        console.error('Erreur chargement produits:', result.error);
        setError(result.error);
      }
    } catch (err: any) {
      console.error('Erreur produits:', err);
      setError(err.message);
    }
  };

  const refreshCustomers = async () => {
    if (!user) return;
    try {
      const result = await customersAPI.getAll();
      if (result.success) {
        setCustomers(result.data || []);
      } else {
        console.error('Erreur chargement clients:', result.error);
        setError(result.error);
      }
    } catch (err: any) {
      console.error('Erreur clients:', err);
      setError(err.message);
    }
  };

  const refreshSales = async () => {
    if (!user) return;
    try {
      const result = await salesAPI.getAll();
      if (result.success) {
        // Gérer la nouvelle structure avec pagination
        const salesData = result.data?.sales || result.data || [];
        setSales(salesData);
      } else {
        console.error('Erreur chargement ventes:', result.error);
        setError(result.error);
      }
    } catch (err: any) {
      console.error('Erreur ventes:', err);
      setError(err.message);
    }
  };

  const refreshPayments = async () => {
    if (!user) return;
    try {
      const result = await paymentsAPI.getAll();
      if (result.success) {
        setPayments(result.data || []);
      } else {
        console.error('Erreur chargement paiements:', result.error);
        setError(result.error);
      }
    } catch (err: any) {
      console.error('Erreur paiements:', err);
      setError(err.message);
    }
  };

  const refreshSuppliers = async () => {
    if (!user) return;
    try {
      const result = await suppliersAPI.getAll();
      if (result.success) {
        setSuppliers(result.data || []);
      } else {
        console.error('Erreur chargement fournisseurs:', result.error);
        setError(result.error);
      }
    } catch (err: any) {
      console.error('Erreur fournisseurs:', err);
      setError(err.message);
    }
  };

  const refreshDashboardStats = async () => {
    if (!user) return;
    try {
      const result = await dashboardAPI.getStats();
      if (result.success) {
        setDashboardStats(result.data);
      } else {
        console.error('Erreur chargement stats:', result.error);
        setError(result.error);
      }
    } catch (err: any) {
      console.error('Erreur stats:', err);
      setError(err.message);
    }
  };

  // Fonction de rafraîchissement globale
  const refreshData = async () => {
    if (!user || authLoading) return;
    
    console.log('Rafraîchissement des données...');
    setLoading(true);
    setError(null);
    
    try {
      await Promise.allSettled([
        refreshProducts(),
        refreshCustomers(),
        refreshSales(),
        refreshPayments(),
        refreshSuppliers(),
        refreshDashboardStats()
      ]);
      
      console.log('Données rafraîchies avec succès');
    } catch (err: any) {
      console.error('Erreur rafraîchissement global:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Écouteur global pour forcer le rafraîchissement depuis d'autres parties de l'app
  React.useEffect(() => {
    const handler = async () => {
      if (!user || authLoading) return;
      await refreshData();
    };

    window.addEventListener('refreshData', handler);
    return () => window.removeEventListener('refreshData', handler);
  }, [user, authLoading, refreshData]);

  // Charger les données initiales
  useEffect(() => {
    if (!user || authLoading) {
      // Réinitialiser les données si pas d'utilisateur
      setProducts([]);
      setCustomers([]);
      setSales([]);
      setPayments([]);
      setSuppliers([]);
      setDashboardStats(null);
      setLoading(false);
      return;
    }

    console.log('Initialisation des données pour:', user.email);
    refreshData();
  }, [user, authLoading]);

  return (
    <DataContext.Provider value={{
      products,
      customers,
      sales,
      payments,
      suppliers,
      dashboardStats,
      loading,
      error,
      refreshData,
      refreshProducts,
      refreshCustomers,
      refreshSales,
      refreshPayments,
      refreshSuppliers
    }}>
      {children}
    </DataContext.Provider>
  );
};