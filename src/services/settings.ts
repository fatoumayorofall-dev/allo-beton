// Service centralisé pour les paramètres de l'application
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface AppSettings {
  // Entreprise
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo: string;
  // Finances
  currency: string;
  currencySymbol: string;
  taxRate: number;
  invoicePrefix: string;
  quotePrefix: string;
  orderPrefix: string;
  // Région
  language: string;
  timezone: string;
  dateFormat: string;
  // Météo
  weatherCity: string;
  weatherCountry: string;
  // Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  lowStockAlert: boolean;
  lowStockThreshold: number;
  paymentReminders: boolean;
  reminderDays: number;
  // Données
  autoBackup: boolean;
  backupFrequency: string;
  // Apparence
  theme: string;
  sidebarCollapsed: boolean;
}

const defaultSettings: AppSettings = {
  companyName: 'Allo Béton SARL',
  companyAddress: 'Dakar, Sénégal',
  companyPhone: '+221 77 000 00 00',
  companyEmail: 'contact@allobeton.sn',
  companyLogo: '',
  currency: 'XOF',
  currencySymbol: 'FCFA',
  taxRate: 18,
  invoicePrefix: 'FAC-',
  quotePrefix: 'DEV-',
  orderPrefix: 'CMD-',
  language: 'fr',
  timezone: 'Africa/Dakar',
  dateFormat: 'DD/MM/YYYY',
  weatherCity: 'Dakar',
  weatherCountry: 'SN',
  emailNotifications: true,
  smsNotifications: false,
  lowStockAlert: true,
  lowStockThreshold: 10,
  paymentReminders: true,
  reminderDays: 3,
  autoBackup: true,
  backupFrequency: 'daily',
  theme: 'light',
  sidebarCollapsed: false
};

// Cache des paramètres
let cachedSettings: AppSettings | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60000; // 1 minute

// Mapping devise -> symbole
const currencySymbols: Record<string, string> = {
  'XOF': 'FCFA',
  'FCFA': 'FCFA',
  'EUR': '€',
  'USD': '$',
  'GBP': '£'
};

// Récupérer les paramètres depuis l'API ou le cache
export const getSettings = async (): Promise<AppSettings> => {
  const now = Date.now();
  
  // Utiliser le cache si disponible et récent
  if (cachedSettings && (now - lastFetch) < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return defaultSettings;
    }

    const response = await fetch(`${API_BASE_URL}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        const loadedSettings = { ...defaultSettings, ...result.data };
        // Ajouter le symbole de devise
        loadedSettings.currencySymbol = currencySymbols[loadedSettings.currency] || loadedSettings.currency;
        cachedSettings = loadedSettings;
        lastFetch = now;
        return loadedSettings;
      }
    }
  } catch (error) {
    console.error('Erreur récupération paramètres:', error);
  }

  return defaultSettings;
};

// Récupérer les paramètres de façon synchrone (depuis le cache ou localStorage)
export const getSettingsSync = (): AppSettings => {
  if (cachedSettings) {
    return cachedSettings;
  }

  // Essayer de récupérer depuis localStorage
  try {
    const stored = localStorage.getItem('app_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      const loadedSettings = { ...defaultSettings, ...parsed };
      loadedSettings.currencySymbol = currencySymbols[loadedSettings.currency] || loadedSettings.currency;
      cachedSettings = loadedSettings;
      return loadedSettings;
    }
  } catch (error) {
    console.error('Erreur lecture localStorage:', error);
  }

  return defaultSettings;
};

// Sauvegarder les paramètres dans le cache et localStorage
export const updateSettingsCache = (settings: Partial<AppSettings>) => {
  cachedSettings = { ...defaultSettings, ...cachedSettings, ...settings };
  cachedSettings.currencySymbol = currencySymbols[cachedSettings.currency] || cachedSettings.currency;
  localStorage.setItem('app_settings', JSON.stringify(cachedSettings));
  lastFetch = Date.now();
};

// Invalider le cache
export const invalidateSettingsCache = () => {
  cachedSettings = null;
  lastFetch = 0;
};

// Formater un montant selon les paramètres
export const formatCurrency = (amount: number, settings?: AppSettings): string => {
  const s = settings || getSettingsSync();
  const n = Number(amount);
  
  if (Number.isNaN(n)) return `0 ${s.currencySymbol}`;
  
  return `${n.toLocaleString('fr-FR')} ${s.currencySymbol}`;
};

// Formater un montant avec séparateur personnalisé (sans symbole de devise)
export const formatAmount = (amount: number, _settings?: AppSettings): string => {
  const n = Number(amount);
  
  if (Number.isNaN(n)) return '0';
  
  return n.toLocaleString('fr-FR');
};

// Calculer la TVA
export const calculateTax = (amount: number, settings?: AppSettings): number => {
  const s = settings || getSettingsSync();
  return amount * (s.taxRate / 100);
};

// Calculer le total avec TVA
export const calculateTotalWithTax = (amount: number, settings?: AppSettings): number => {
  const s = settings || getSettingsSync();
  return amount * (1 + s.taxRate / 100);
};

// Obtenir le taux de TVA
export const getTaxRate = (settings?: AppSettings): number => {
  const s = settings || getSettingsSync();
  return s.taxRate;
};

// Obtenir le symbole de devise
export const getCurrencySymbol = (settings?: AppSettings): string => {
  const s = settings || getSettingsSync();
  return s.currencySymbol;
};

// Formater une date selon les paramètres
export const formatDate = (date: Date | string, settings?: AppSettings): string => {
  const s = settings || getSettingsSync();
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  switch (s.dateFormat) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
};

// Générer un numéro de facture
export const generateInvoiceNumber = (id: number | string, settings?: AppSettings): string => {
  const s = settings || getSettingsSync();
  return `${s.invoicePrefix}${String(id).padStart(5, '0')}`;
};

// Générer un numéro de devis
export const generateQuoteNumber = (id: number | string, settings?: AppSettings): string => {
  const s = settings || getSettingsSync();
  return `${s.quotePrefix}${String(id).padStart(5, '0')}`;
};

// Générer un numéro de commande
export const generateOrderNumber = (id: number | string, settings?: AppSettings): string => {
  const s = settings || getSettingsSync();
  return `${s.orderPrefix}${String(id).padStart(5, '0')}`;
};

// Obtenir les informations de l'entreprise
export const getCompanyInfo = (settings?: AppSettings) => {
  const s = settings || getSettingsSync();
  return {
    name: s.companyName,
    address: s.companyAddress,
    phone: s.companyPhone,
    email: s.companyEmail,
    logo: s.companyLogo
  };
};

export default {
  getSettings,
  getSettingsSync,
  updateSettingsCache,
  invalidateSettingsCache,
  formatCurrency,
  formatAmount,
  calculateTax,
  calculateTotalWithTax,
  getTaxRate,
  getCurrencySymbol,
  formatDate,
  generateInvoiceNumber,
  generateQuoteNumber,
  generateOrderNumber,
  getCompanyInfo
};
