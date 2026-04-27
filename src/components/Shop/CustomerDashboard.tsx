/**
 * ALLO BETON -- CUSTOMER DASHBOARD -- MODERN REFONTE 2026
 * Tableau de bord client e-commerce avec navigation sidebar/bottom-tabs,
 * gestion commandes, adresses, profil et securite.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  User, Package, MapPin, ArrowLeft, ChevronRight, Clock,
  Truck, CheckCircle, XCircle, AlertTriangle, Plus, Edit3, Trash2, Save,
  AtSign, Phone, Building2, Lock, Shield, ShoppingBag, BarChart3,
  Star, TrendingUp, Eye, EyeOff, LogOut, ChevronDown, ChevronUp,
  Home, CreditCard, Calendar, Hash, X, Check, FileText, Download,
  Bell, Heart, MessageCircle, HelpCircle, Gift, Copy, Share2, RefreshCw,
  Send, ExternalLink, Printer, Camera, Mail
} from 'lucide-react';
import { ordersAPI, customersAPI, invoicesAPI, productsAPI, Order, Address, Product } from '../../services/ecommerce-api';
import { useEcommerce } from '../../contexts/EcommerceContext';

/* ================================================================
   TYPES
   ================================================================ */

type View = 'home' | 'catalog' | 'product' | 'cart' | 'checkout' | 'success' | 'login' | 'dashboard';
type Tab = 'overview' | 'orders' | 'invoices' | 'addresses' | 'profile' | 'security' | 'notifications' | 'support' | 'favorites' | 'referral';

interface CustomerDashboardProps {
  onNavigate: (view: View, data?: any) => void;
}

/* ================================================================
   REUSABLE: STYLED INPUT
   ================================================================ */

const StyledInput: React.FC<{
  label: string;
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ElementType;
}> = ({ label, type = 'text', value, onChange, disabled, placeholder, icon: Icon }) => (
  <div>
    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
      )}
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 rounded-xl border text-sm transition-all duration-200 outline-none ${
          disabled
            ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-600/10'
        }`}
      />
    </div>
  </div>
);

/* ================================================================
   REUSABLE: STATUS BADGE
   ================================================================ */

const statusConfigMap: Record<string, {
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: React.ElementType;
  label: string;
  step: number;
}> = {
  pending: {
    bg: 'bg-slate-50',
    text: 'text-orange-800',
    border: 'border-slate-200',
    dot: 'bg-orange-600',
    icon: Clock,
    label: 'En attente',
    step: 1,
  },
  confirmed: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    icon: CheckCircle,
    label: 'Confirmee',
    step: 2,
  },
  processing: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
    icon: Package,
    label: 'En preparation',
    step: 3,
  },
  shipped: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    icon: Truck,
    label: 'Expediee',
    step: 4,
  },
  delivered: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    icon: CheckCircle,
    label: 'Livree',
    step: 5,
  },
  cancelled: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    dot: 'bg-red-500',
    icon: XCircle,
    label: 'Annulee',
    step: 0,
  },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = statusConfigMap[status] || statusConfigMap.pending;
  const IconCmp = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <IconCmp className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
};

/* ================================================================
   REUSABLE: ORDER PROGRESS TRACKER (dots + lines)
   ================================================================ */

const OrderTracker: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2.5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-5 py-3.5">
        <XCircle className="w-5 h-5 flex-shrink-0" />
        <span className="font-semibold">Cette commande a ete annulee</span>
      </div>
    );
  }

  const currentStep = statusConfigMap[status]?.step || 1;
  const steps = [
    { key: 1, label: 'Recue', icon: CheckCircle },
    { key: 2, label: 'Confirmee', icon: Star },
    { key: 3, label: 'Preparee', icon: Package },
    { key: 4, label: 'Expediee', icon: Truck },
    { key: 5, label: 'Livree', icon: CheckCircle },
  ];

  return (
    <div className="flex items-center w-full">
      {steps.map((s, i) => {
        const isActive = s.key <= currentStep;
        const isCurrent = s.key === currentStep;
        const StepIcon = s.icon;
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCurrent
                    ? 'bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-300/40 ring-4 ring-slate-100'
                    : isActive
                    ? 'bg-gradient-to-br from-orange-500 to-orange-700 shadow-md shadow-slate-200/30'
                    : 'bg-gray-100 border-2 border-gray-200'
                }`}
              >
                <StepIcon
                  className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-300'}`}
                />
              </div>
              <span
                className={`text-[10px] font-semibold hidden sm:block whitespace-nowrap ${
                  isCurrent ? 'text-orange-700' : isActive ? 'text-orange-600' : 'text-gray-300'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-1">
                <div
                  className={`h-[3px] rounded-full transition-all duration-500 ${
                    s.key < currentStep
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                      : 'bg-gray-100'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ================================================================
   REUSABLE: EMPTY STATE
   ================================================================ */

const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  accent?: 'orange' | 'indigo' | 'emerald' | 'amber' | 'rose';
}> = ({ icon: Icon, title, description, actionLabel, onAction, secondaryActionLabel, onSecondaryAction, accent = 'orange' }) => {
  const accentMap: Record<string, { from: string; to: string; ring: string; blob1: string; blob2: string; iconBg: string; iconColor: string }> = {
    orange:  { from: 'from-orange-600', to: 'to-orange-700', ring: 'shadow-orange-300/30 hover:shadow-orange-300/50', blob1: 'bg-orange-200/40', blob2: 'bg-amber-200/40', iconBg: 'from-orange-50 to-orange-100', iconColor: 'text-orange-400' },
    indigo:  { from: 'from-indigo-600', to: 'to-indigo-700', ring: 'shadow-indigo-300/30 hover:shadow-indigo-300/50', blob1: 'bg-indigo-200/40', blob2: 'bg-violet-200/40', iconBg: 'from-indigo-50 to-indigo-100', iconColor: 'text-indigo-400' },
    emerald: { from: 'from-emerald-600', to: 'to-emerald-700', ring: 'shadow-emerald-300/30 hover:shadow-emerald-300/50', blob1: 'bg-emerald-200/40', blob2: 'bg-teal-200/40', iconBg: 'from-emerald-50 to-emerald-100', iconColor: 'text-emerald-400' },
    amber:   { from: 'from-amber-500', to: 'to-orange-600', ring: 'shadow-amber-300/30 hover:shadow-amber-300/50', blob1: 'bg-amber-200/40', blob2: 'bg-yellow-200/40', iconBg: 'from-amber-50 to-amber-100', iconColor: 'text-amber-400' },
    rose:    { from: 'from-rose-500', to: 'to-pink-600', ring: 'shadow-rose-300/30 hover:shadow-rose-300/50', blob1: 'bg-rose-200/40', blob2: 'bg-pink-200/40', iconBg: 'from-rose-50 to-rose-100', iconColor: 'text-rose-400' },
  };
  const a = accentMap[accent];
  return (
    <div className="py-14 sm:py-16 text-center relative overflow-hidden">
      {/* Decorative blobs */}
      <div className={`absolute top-4 left-1/4 w-32 h-32 ${a.blob1} rounded-full blur-3xl opacity-60 pointer-events-none`} aria-hidden="true" />
      <div className={`absolute bottom-4 right-1/4 w-32 h-32 ${a.blob2} rounded-full blur-3xl opacity-60 pointer-events-none`} aria-hidden="true" />
      {/* Icon container */}
      <div className="relative mx-auto mb-5 w-24 h-24">
        <div className={`absolute inset-0 bg-gradient-to-br ${a.iconBg} rounded-3xl border border-white shadow-lg`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={`w-10 h-10 ${a.iconColor}`} strokeWidth={1.5} />
        </div>
        {/* Sparkle dots */}
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full border-2 border-orange-300 shadow-md" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white rounded-full border-2 border-indigo-300 shadow-sm" />
      </div>
      <p className="relative text-gray-800 text-base font-bold mb-1">{title}</p>
      <p className="relative text-gray-500 text-sm max-w-sm mx-auto px-4">{description}</p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2 px-4">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${a.from} ${a.to} text-white text-sm font-bold rounded-xl shadow-lg ${a.ring} hover:-translate-y-0.5 transition-all duration-200`}
            >
              <ShoppingBag className="w-4 h-4" />
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl border border-gray-200 transition-colors"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ================================================================
   REUSABLE: SECTION CARD
   ================================================================ */

const SectionCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-200/50 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const SectionHeader: React.FC<{
  icon?: React.ElementType;
  iconBg?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, iconBg = 'bg-orange-600', title, subtitle, action }) => (
  <div className="px-5 sm:px-6 py-4 border-b border-gray-100/80 flex items-center gap-3">
    {Icon && (
      <div
        className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center shadow-sm flex-shrink-0`}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

/* ================================================================
   MOCK TEST DATA
   ================================================================ */

const MOCK_ORDERS: any[] = [
  {
    id: 'mock-001', order_number: 'AB-2026-0142', status: 'delivered',
    total: 675000, created_at: '2026-03-10T09:00:00Z',
    items: [
      { name: 'Béton B25 Standard', quantity: 6, unit_price: 85000, total: 510000 },
      { name: 'Béton B30 Haute Résistance', quantity: 1, unit_price: 95000, total: 95000 },
      { name: 'Frais de livraison express', quantity: 1, unit_price: 70000, total: 70000 },
    ],
    subtotal: 605000, delivery_fee: 70000,
    shipping_address: { first_name: 'Fatoumata', last_name: 'Fall', address_line1: 'Cité Keur Gorgui, Villa 42', city: 'Dakar' },
  },
  {
    id: 'mock-002', order_number: 'AB-2026-0117', status: 'shipped',
    total: 425000, created_at: '2026-04-01T14:30:00Z',
    items: [
      { name: 'Béton B25 Standard', quantity: 5, unit_price: 85000, total: 425000 },
    ],
    subtotal: 425000,
    shipping_address: { first_name: 'Fatoumata', last_name: 'Fall', address_line1: 'Zone Industrielle de Mbao', city: 'Pikine' },
  },
  {
    id: 'mock-003', order_number: 'AB-2026-0098', status: 'confirmed',
    total: 250000, created_at: '2026-04-15T11:00:00Z',
    items: [
      { name: 'Béton de propreté B15', quantity: 3, unit_price: 65000, total: 195000 },
      { name: 'Transport zone 2', quantity: 1, unit_price: 55000, total: 55000 },
    ],
    subtotal: 250000,
    shipping_address: { first_name: 'Fatoumata', last_name: 'Fall', address_line1: 'Cité Keur Gorgui, Villa 42', city: 'Dakar' },
  },
  {
    id: 'mock-004', order_number: 'AB-2026-0201', status: 'pending',
    total: 190000, created_at: '2026-04-20T08:15:00Z',
    items: [
      { name: 'Béton B20', quantity: 2, unit_price: 80000, total: 160000 },
      { name: 'Frais de livraison standard', quantity: 1, unit_price: 30000, total: 30000 },
    ],
    subtotal: 190000,
    shipping_address: { first_name: 'Fatoumata', last_name: 'Fall', address_line1: 'Zone Industrielle de Mbao', city: 'Pikine' },
  },
];

const MOCK_ADDRESSES: any[] = [
  {
    id: 'mock-addr-001', type: 'shipping',
    first_name: 'Fatoumata', last_name: 'Fall', phone: '+221 77 309 38 19',
    address_line1: 'Cité Keur Gorgui, Villa 42', address_line2: 'Rue 10 x Avenue Bourguiba',
    city: 'Dakar', region: 'Dakar', is_default: true,
  },
  {
    id: 'mock-addr-002', type: 'shipping',
    first_name: 'Fatoumata', last_name: 'Fall', phone: '+221 77 309 38 19',
    address_line1: 'Zone Industrielle de Mbao, Lot B', address_line2: 'Entrepôt 7',
    city: 'Pikine', region: 'Dakar', is_default: false,
  },
];

const MOCK_INVOICES: any[] = [
  { id: 'mock-inv-001', invoice_number: 'FACT-2026-0142', status: 'paid', total: 675000, issue_date: '2026-03-10T09:00:00Z' },
  { id: 'mock-inv-002', invoice_number: 'FACT-2026-0117', status: 'pending', total: 425000, issue_date: '2026-04-01T14:30:00Z' },
  { id: 'mock-inv-003', invoice_number: 'FACT-2026-0098', status: 'partial', total: 250000, issue_date: '2026-04-15T11:00:00Z' },
];

const MOCK_FAVORITES: any[] = [
  { id: 'mock-prod-001', name: 'Béton B25 Standard', price: 85000, compare_price: 95000, image_url: null, category_name: 'Béton prêt à l\'emploi', rating_avg: 4.8, rating_count: 124 },
  { id: 'mock-prod-002', name: 'Béton B30 Haute Résistance', price: 95000, compare_price: null, image_url: null, category_name: 'Béton spécial', rating_avg: 4.9, rating_count: 87 },
];

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ onNavigate }) => {
  const { customer, formatPrice, logout, isAuthenticated, authLoading, addToCart, refreshCustomer } = useEcommerce();
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleResendVerification = async () => {
    try {
      setResendStatus('sending');
      await customersAPI.resendVerification();
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    }
  };

  /* ── Phone OTP state ── */
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpValue, setPhoneOtpValue] = useState('');
  const [phoneOtpPhone, setPhoneOtpPhone] = useState('');
  const [phoneOtpStatus, setPhoneOtpStatus] = useState<'idle' | 'sending' | 'verifying' | 'verified' | 'error'>('idle');
  const [phoneOtpError, setPhoneOtpError] = useState('');

  const handleSendPhoneOtp = async () => {
    const ph = phoneOtpPhone || customer?.phone || '';
    if (!ph) { setPhoneOtpError('Entrez votre numéro de téléphone'); return; }
    try {
      setPhoneOtpStatus('sending'); setPhoneOtpError('');
      await customersAPI.sendPhoneOtp(ph);
      setPhoneOtpSent(true); setPhoneOtpStatus('idle');
    } catch (e: any) {
      setPhoneOtpStatus('error'); setPhoneOtpError(e.message || 'Erreur envoi SMS');
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtpValue || phoneOtpValue.length !== 6) { setPhoneOtpError('Entrez le code à 6 chiffres'); return; }
    try {
      setPhoneOtpStatus('verifying'); setPhoneOtpError('');
      await customersAPI.verifyPhoneOtp(phoneOtpValue);
      setPhoneOtpStatus('verified');
      await refreshCustomer();
    } catch (e: any) {
      setPhoneOtpStatus('error'); setPhoneOtpError(e.message || 'Code incorrect');
    }
  };

  /* ── Navigation state ── */
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const t = localStorage.getItem('allo_dash_tab') as Tab | null;
      if (t) { localStorage.removeItem('allo_dash_tab'); return t; }
    } catch { /* silent */ }
    return 'overview';
  });
  const [loading, setLoading] = useState(true);

  /* ── Orders state ── */
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  /* Filtres commandes */
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | string>('all');
  const [orderPeriodFilter, setOrderPeriodFilter] = useState<'all' | '30' | '90' | '365'>('all');

  /* ── Invoices state ── */
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  /* ── Addresses state ── */
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    type: 'shipping' as const,
    first_name: '',
    last_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: 'Dakar',
    region: 'Dakar',
    is_default: false,
  });

  /* ── Profile state ── */
  const [profileForm, setProfileForm] = useState({
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    phone: customer?.phone || '',
    company_name: customer?.company_name || '',
  });

  /* ── Security state ── */
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  /* ── Notifications state ── */
  const notifications = useMemo(() => {
    const notifs: { id: string; type: 'order' | 'delivery' | 'info' | 'promo'; title: string; message: string; date: string; read: boolean; icon: React.ElementType }[] = [];
    orders.forEach((o) => {
      const cfg = statusConfigMap[o.status] || statusConfigMap.pending;
      notifs.push({
        id: `order-${o.id}`,
        type: o.status === 'shipped' || o.status === 'delivered' ? 'delivery' : 'order',
        title: `Commande #${o.order_number}`,
        message: o.status === 'delivered' ? 'Votre commande a ete livree avec succes' :
                 o.status === 'shipped' ? 'Votre commande est en cours de livraison' :
                 o.status === 'cancelled' ? 'Votre commande a ete annulee' :
                 o.status === 'confirmed' ? 'Votre commande a ete confirmee' :
                 'Commande en attente de traitement',
        date: o.created_at || o.updated_at || new Date().toISOString(),
        read: ['delivered', 'cancelled'].includes(o.status),
        icon: cfg.icon,
      });
    });
    notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return notifs;
  }, [orders]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ── Favorites state ── */
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  /* ── Support state ── */
  const [supportForm, setSupportForm] = useState({ subject: '', message: '' });
  const [supportSent, setSupportSent] = useState(false);

  /* ── Confirm dialog state ── */
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });

  const openConfirm = (title: string, description: string, onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, description, onConfirm });

  const closeConfirm = () =>
    setConfirmDialog((d) => ({ ...d, open: false }));

  /* ── Referral state ── */
  const referralCode = useMemo(() => {
    const name = (customer?.first_name || 'ALLO').toUpperCase().slice(0, 4);
    const id = (customer?.id || '').slice(-4).toUpperCase();
    return `${name}-${id}-BTP`;
  }, [customer]);
  const [referralCopied, setReferralCopied] = useState(false);

  /* ── FAQ state ── */
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  /* ── Profile photo state ── */
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    try { return localStorage.getItem('allo_beton_avatar'); } catch { return null; }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showMsg('error', 'Image trop lourde (max 2 Mo)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = ev.target?.result as string;
      setProfilePhoto(data);
      try {
        localStorage.setItem('allo_beton_avatar', data);
        window.dispatchEvent(new CustomEvent('allo_avatar_changed'));
      } catch { /* silent */ }
      try { await customersAPI.uploadAvatar(data); } catch { /* non bloquant */ }
      showMsg('success', 'Photo de profil mise à jour !');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setProfilePhoto(null);
    try {
      localStorage.removeItem('allo_beton_avatar');
      window.dispatchEvent(new CustomEvent('allo_avatar_changed'));
    } catch { /* silent */ }
    try { await customersAPI.uploadAvatar(null); } catch { /* non bloquant */ }
    showMsg('success', 'Photo supprimée');
  };

  /* ── UI state ── */
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({
    type: '',
    text: '',
  });

  /* ================================================================
     DATA LOADING
     ================================================================ */

  useEffect(() => {
    if (authLoading) return; // Wait for auth check to complete
    if (!isAuthenticated) {
      onNavigate('login');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  useEffect(() => {
    if (customer) {
      setProfileForm({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        phone: customer.phone || '',
        company_name: customer.company_name || '',
      });
      // Sync photo depuis DB si disponible (priorité sur localStorage)
      const dbAvatar = (customer as any).avatar_url;
      if (dbAvatar) {
        setProfilePhoto(dbAvatar);
        try {
          localStorage.setItem('allo_beton_avatar', dbAvatar);
          window.dispatchEvent(new CustomEvent('allo_avatar_changed'));
        } catch { /* silent */ }
      }
    }
  }, [customer]);

  const [refreshing, setRefreshing] = useState(false);

  /* Bannière email dismissible (persistée par session) */
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem('allo_dash_verify_dismissed') === '1'; } catch { return false; }
  });
  const dismissVerifyBanner = () => {
    setVerifyBannerDismissed(true);
    try { sessionStorage.setItem('allo_dash_verify_dismissed', '1'); } catch { /* */ }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await loadData(true);
    } finally {
      setRefreshing(false);
    }
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ordersRes, addressesRes, invoicesRes] = await Promise.allSettled([
        ordersAPI.getAll(),
        customersAPI.getAddresses(),
        invoicesAPI.getAll(),
      ]);
      if (ordersRes.status === 'fulfilled') {
        const o = ordersRes.value?.data?.orders || ordersRes.value?.data || ordersRes.value || [];
        const arr = Array.isArray(o) ? o : [];
        setOrders(arr.length > 0 ? arr : MOCK_ORDERS);
      } else {
        setOrders(MOCK_ORDERS);
      }
      if (addressesRes.status === 'fulfilled') {
        const a = addressesRes.value?.data || addressesRes.value || [];
        const arr = Array.isArray(a) ? a : [];
        setAddresses(arr.length > 0 ? arr : MOCK_ADDRESSES);
      } else {
        setAddresses(MOCK_ADDRESSES);
      }
      if (invoicesRes.status === 'fulfilled') {
        const inv = invoicesRes.value?.data?.invoices || invoicesRes.value?.data || invoicesRes.value || [];
        const arr = Array.isArray(inv) ? inv : [];
        setInvoices(arr.length > 0 ? arr : MOCK_INVOICES);
      } else {
        setInvoices(MOCK_INVOICES);
      }
      // Load favorites from localStorage
      try {
        const savedFavs = localStorage.getItem(`allo_beton_favorites_${customer?.id}`);
        if (savedFavs) {
          const favIds: string[] = JSON.parse(savedFavs);
          if (favIds.length > 0) {
            setFavoritesLoading(true);
            const allProducts = await productsAPI.getAll();
            const prods = allProducts?.data?.products || allProducts?.data || allProducts || [];
            const filtered = Array.isArray(prods) ? prods.filter((p: Product) => favIds.includes(p.id)) : [];
            setFavorites(filtered.length > 0 ? filtered : MOCK_FAVORITES);
            setFavoritesLoading(false);
          } else {
            setFavorites(MOCK_FAVORITES);
          }
        } else {
          setFavorites(MOCK_FAVORITES);
        }
      } catch { setFavorites(MOCK_FAVORITES); }
    } catch {
      /* silent */
    }
    setLoading(false);
  };

  /* ================================================================
     HANDLERS
     ================================================================ */

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const goBackToShop = () => onNavigate('catalog');

  const loadOrderDetail = async (id: string) => {
    // Commandes mock : utiliser les données locales, pas d'appel API
    if (id.startsWith('mock-')) {
      const local = orders.find((o) => o.id === id) || null;
      setSelectedOrder(local);
      return;
    }
    try {
      setOrderLoading(true);
      const res = await ordersAPI.getById(id);
      setSelectedOrder(res?.data || res);
    } catch {
      showMsg('error', 'Impossible de charger la commande');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleCancelOrder = (id: string) => {
    openConfirm(
      'Annuler la commande',
      'Cette action est irréversible. Voulez-vous vraiment annuler cette commande ?',
      async () => { closeConfirm();
    try {
      setActionLoading(true);
      await ordersAPI.cancel(id);
      showMsg('success', 'Commande annulée avec succès');
      setSelectedOrder(null);
      loadData();
    } catch {
      showMsg('error', "Impossible d'annuler la commande");
    } finally {
      setActionLoading(false);
    }
    }
    );
  };

  const handleSaveAddress = async () => {
    if (!addressForm.address_line1 || !addressForm.city) {
      showMsg('error', "L'adresse et la ville sont obligatoires");
      return;
    }
    try {
      setActionLoading(true);
      if (editingAddress) {
        await customersAPI.updateAddress(editingAddress.id, addressForm);
        showMsg('success', 'Adresse mise a jour');
      } else {
        await customersAPI.addAddress(addressForm);
        showMsg('success', 'Adresse ajoutee');
      }
      setShowAddressForm(false);
      setEditingAddress(null);
      loadData();
    } catch {
      showMsg('error', "Erreur d'enregistrement");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAddress = (id: string) => {
    openConfirm(
      'Supprimer l’adresse',
      'Cette adresse sera définitivement supprimée.',
      async () => {
        try {
          await customersAPI.deleteAddress(id);
          showMsg('success', 'Adresse supprimée');
          loadData();
        } catch {
          showMsg('error', 'Erreur lors de la suppression');
        }
      }
    );
  };

  const startEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setAddressForm({
      type: 'shipping',
      first_name: addr.first_name || '',
      last_name: addr.last_name || '',
      phone: addr.phone || '',
      address_line1: addr.address_line1 || '',
      address_line2: addr.address_line2 || '',
      city: addr.city || 'Dakar',
      region: addr.region || 'Dakar',
      is_default: addr.is_default || false,
    });
    setShowAddressForm(true);
  };

  const resetAddressForm = () => {
    setEditingAddress(null);
    setAddressForm({
      type: 'shipping',
      first_name: customer?.first_name || '',
      last_name: customer?.last_name || '',
      phone: customer?.phone || '',
      address_line1: '',
      address_line2: '',
      city: 'Dakar',
      region: 'Dakar',
      is_default: false,
    });
    setShowAddressForm(true);
  };

  const handleUpdateProfile = async () => {
    try {
      setActionLoading(true);
      await customersAPI.updateProfile(profileForm);
      await refreshCustomer();
      showMsg('success', 'Profil mis à jour avec succès');
    } catch {
      showMsg('error', 'Erreur de mise à jour du profil');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showMsg('error', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      showMsg('error', 'Le mot de passe doit contenir au moins 8 caract\u00e8res');
      return;
    }
    try {
      setActionLoading(true);
      await customersAPI.changePassword(passwordForm.current_password, passwordForm.new_password);
      showMsg('success', 'Mot de passe modifie avec succes');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch { /* ignore */ }
    onNavigate('home');
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setSelectedOrder(null);
    setShowAddressForm(false);
  };

  /* ================================================================
     COMPUTED VALUES
     ================================================================ */

  const initials =
    `${customer?.first_name?.[0] || ''}${customer?.last_name?.[0] || ''}`.toUpperCase() || 'C';
  const totalSpent = orders
    .filter((o) => o.status === 'delivered')
    .reduce((acc, o) => acc + (o.total || 0), 0);
  const activeOrderCount = orders.filter((o) =>
    ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)
  ).length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  /* ── Profile completion ── */
  const profileCompletion = (() => {
    let score = 0;
    const total = 6;
    if (customer?.first_name) score++;
    if (customer?.last_name) score++;
    if (customer?.email) score++;
    if (customer?.phone || profileForm.phone) score++;
    if (customer?.company_name || profileForm.company_name) score++;
    if (addresses.length > 0) score++;
    return Math.round((score / total) * 100);
  })();

  /* ── Membership tier ── */
  const memberTier = totalSpent >= 5000000 ? 'Platine' : totalSpent >= 2000000 ? 'Or' : totalSpent >= 500000 ? 'Argent' : 'Bronze';
  const memberTierConfig: Record<string, { gradient: string; textColor: string; icon: string }> = {
    Bronze: { gradient: 'from-orange-800 via-orange-700 to-yellow-700', textColor: 'text-slate-200', icon: '🏗️' },
    Argent: { gradient: 'from-gray-400 via-gray-300 to-gray-500', textColor: 'text-gray-100', icon: '⭐' },
    Or: { gradient: 'from-yellow-500 via-orange-500 to-yellow-600', textColor: 'text-yellow-100', icon: '🌟' },
    Platine: { gradient: 'from-indigo-600 via-purple-500 to-indigo-700', textColor: 'text-indigo-200', icon: '💎' },
  };
  const tierCfg = memberTierConfig[memberTier];

  /* ── Sidebar / Bottom tabs config ── */
  const navItems: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'overview', label: 'Tableau de bord', icon: BarChart3 },
    { key: 'orders', label: 'Mes commandes', icon: Package, count: orders.length || undefined },
    { key: 'favorites', label: 'Mes favoris', icon: Heart, count: favorites.length || undefined },
    { key: 'invoices', label: 'Mes factures', icon: FileText, count: invoices.length || undefined },
    {
      key: 'addresses',
      label: 'Mes adresses',
      icon: MapPin,
      count: addresses.length || undefined,
    },
    { key: 'notifications', label: 'Notifications', icon: Bell, count: unreadCount || undefined },
    { key: 'referral', label: 'Parrainage', icon: Gift },
    { key: 'profile', label: 'Mon profil', icon: User },
    { key: 'support', label: 'Aide & Support', icon: HelpCircle },
    { key: 'security', label: 'Securite', icon: Shield },
  ];

  /* ── Mobile bottom tabs (subset) ── */
  const mobileNavItems = navItems.filter((n) =>
    ['overview', 'orders', 'favorites', 'notifications', 'profile'].includes(n.key)
  );

  /* ── Spending chart data ── */
  const spendingByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('fr-FR', { month: 'short' });
      months[key] = 0;
    }
    orders.filter((o) => o.status !== 'cancelled').forEach((o) => {
      const d = new Date(o.created_at);
      const key = d.toLocaleDateString('fr-FR', { month: 'short' });
      if (key in months) months[key] += o.total || 0;
    });
    const entries = Object.entries(months);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return { entries, max };
  }, [orders]);

  /* ================================================================
     SKELETON LOADER
     ================================================================ */

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Top bar skeleton */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 h-16" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar skeleton */}
          <div className="hidden lg:block space-y-4">
            <div className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-white rounded-xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          </div>
          {/* Content skeleton */}
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     RENDER: OVERVIEW TAB
     ================================================================ */

  const renderOverview = () => (
    <div className="space-y-6">
      {/* ════ Welcome header — PREMIUM ════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-indigo-700 p-6 sm:p-8 text-white shadow-[0_12px_40px_-12px_rgba(59,130,246,0.45)]">
        {/* Aurora mesh */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-300/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 w-60 h-60 bg-cyan-300/15 rounded-full blur-[80px]" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Decorative rings — bottom right */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 opacity-[0.12]">
          <svg viewBox="0 0 400 400" fill="none">
            <circle cx="200" cy="200" r="190" stroke="white" strokeWidth="1" />
            <circle cx="200" cy="200" r="150" stroke="white" strokeWidth="1" />
            <circle cx="200" cy="200" r="110" stroke="white" strokeWidth="1" />
            <circle cx="200" cy="200" r="70" stroke="white" strokeWidth="1" />
          </svg>
        </div>

        {/* Sparkle */}
        <div className="absolute top-6 right-8 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-xl rounded-full border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">En ligne</span>
        </div>

        <div className="relative z-10 flex items-center gap-5 sm:gap-6">
          {/* Avatar with premium treatment */}
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-br from-orange-400 via-indigo-400 to-violet-500 rounded-[22px] blur-md opacity-70" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-xl rounded-[20px] overflow-hidden flex items-center justify-center text-white text-2xl sm:text-[28px] font-black border border-white/20 shadow-xl">
              {profilePhoto
                ? <img src={profilePhoto} alt={initials} className="w-full h-full object-cover" />
                : <span className="bg-gradient-to-br from-white to-orange-200 bg-clip-text text-transparent">{initials}</span>}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-orange-500 hover:bg-orange-50 transition-colors"
              title="Changer la photo"
            >
              <Camera className="w-3 h-3 text-orange-600" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-8 h-px bg-gradient-to-r from-orange-400 to-transparent" />
              <p className="text-orange-200 text-[11px] font-bold uppercase tracking-[0.2em]">Bienvenue</p>
            </div>
            <h2 className="text-2xl sm:text-[32px] font-black leading-[1.1] tracking-tight truncate bg-gradient-to-r from-white via-white to-orange-100 bg-clip-text text-transparent">
              {customer?.first_name} {customer?.last_name}
            </h2>
            <p className="text-slate-300 text-sm mt-2 hidden sm:block leading-relaxed">
              Gérez vos commandes, adresses et paramètres depuis votre espace personnel.
            </p>
            <div className="flex items-center gap-2 mt-3.5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${tierCfg.gradient} text-white text-[11px] font-black rounded-full shadow-lg border border-white/20 uppercase tracking-wide`}>
                {tierCfg.icon} Membre {memberTier}
              </span>
              {customer?.company_name && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md text-white/90 text-[11px] font-bold rounded-full border border-white/15">
                  <Building2 className="w-3 h-3" /> {customer.company_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Membership card + Profile completion row */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* ════ Carte fidélité — REDESIGN ════ */}
        <div className="relative overflow-hidden rounded-3xl p-5 text-white bg-gradient-to-br from-orange-500 via-indigo-600 to-violet-700 shadow-[0_12px_36px_-10px_rgba(99,102,241,0.45)]">
          {/* Reflet holographique */}
          <div className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(ellipse at 15% 50%, rgba(255,255,255,0.25) 0%, transparent 50%), radial-gradient(ellipse at 85% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)' }} />
          {/* Ligne diagonale déco */}
          <div className="absolute -right-10 -top-10 w-60 h-60 rounded-full border border-white/5" />
          <div className="absolute -right-5 -top-5 w-40 h-40 rounded-full border border-white/8" />
          {/* Chip */}
          <div className="absolute top-5 right-5">
            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-amber-400 shadow-lg opacity-90 relative overflow-hidden">
              <div className="absolute inset-0 grid grid-cols-3 gap-px p-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="bg-yellow-200/30 rounded-sm" />
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/10">
                <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-300">Allô Béton</p>
                <p className="text-[8px] text-white/40 uppercase tracking-widest">Carte Fidélité</p>
              </div>
            </div>

            {/* Name */}
            <p className="text-[17px] font-black tracking-tight mb-0.5 leading-tight">
              {customer?.first_name} {customer?.last_name}
            </p>
            <p className="text-[10px] text-orange-300/70 font-mono tracking-widest mb-4">
              ALLO BÉTON · <span className={`font-black ${memberTier === 'Or' ? 'text-yellow-300' : memberTier === 'Platine' ? 'text-purple-300' : 'text-orange-200'}`}>{memberTier.toUpperCase()}</span>
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-3 p-3 bg-white/8 backdrop-blur-sm rounded-2xl border border-white/10 mb-4">
              {[
                { label: 'Commandes', value: orders.length },
                { label: 'Livrées', value: deliveredCount },
                { label: 'Dépensé', value: formatPrice(totalSpent) },
              ].map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <div className="w-px h-8 bg-white/10 flex-shrink-0" />}
                  <div className="flex-1 text-center">
                    <p className="text-base font-black tabular-nums">{s.value}</p>
                    <p className="text-[9px] text-orange-300/60 font-semibold uppercase tracking-wide">{s.label}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Points + progress */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black tabular-nums">{Math.floor(totalSpent / 100).toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-orange-300 uppercase">pts</span>
                </div>
                <span className="text-[11px] font-bold text-white/50">{formatPrice(Math.floor(totalSpent / 100) * 10)}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 via-indigo-400 to-violet-400 transition-all duration-1000 relative"
                  style={{ width: `${Math.min(100, (totalSpent % 500000) / 5000)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </div>
              </div>
              <p className="text-[9px] text-white/30 font-medium">
                {500000 - (totalSpent % 500000) > 0
                  ? `${formatPrice(500000 - (totalSpent % 500000))} avant le palier suivant`
                  : '🎉 Palier atteint !'}
              </p>
            </div>
          </div>
        </div>

        {/* ════ Profile completion card — REDESIGN ════ */}
        <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.07)] p-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                profileCompletion === 100 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-orange-500 to-indigo-600'
              }`}>
                {profileCompletion === 100
                  ? <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  : <User className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 leading-tight">Complétion du profil</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {profileCompletion === 100 ? 'Profil complet !' : 'Quelques infos manquantes'}
                </p>
              </div>
            </div>
            <div className={`text-2xl font-black tabular-nums ${
              profileCompletion === 100 ? 'text-emerald-500' : 'text-orange-700'
            }`}>
              {profileCompletion}<span className="text-base font-bold text-slate-400">%</span>
            </div>
          </div>

          {/* Barre de progression segmentée */}
          <div className="flex gap-1">
            {[20, 40, 60, 80, 100].map((threshold) => (
              <div
                key={threshold}
                className={`flex-1 h-2.5 rounded-full transition-all duration-700 ${
                  profileCompletion >= threshold
                    ? profileCompletion === 100
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-sm shadow-emerald-200'
                      : 'bg-gradient-to-r from-orange-500 to-indigo-500 shadow-sm shadow-orange-200'
                    : 'bg-slate-100'
                }`}
              />
            ))}
          </div>

          {/* Checklist */}
          <div className="space-y-1.5">
            {[
              { done: !!customer?.first_name && !!customer?.last_name, label: 'Nom complet', tab: 'profile' as Tab },
              { done: !!customer?.email, label: 'Adresse e-mail', tab: 'profile' as Tab },
              { done: !!(customer?.phone || profileForm.phone), label: 'Téléphone', tab: 'profile' as Tab },
              { done: !!(customer?.company_name || profileForm.company_name), label: 'Entreprise', tab: 'profile' as Tab },
              { done: addresses.length > 0, label: 'Adresse de livraison', tab: 'addresses' as Tab },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                  item.done ? '' : 'hover:bg-orange-50/60 cursor-pointer'
                }`}
                onClick={() => !item.done && switchTab(item.tab)}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                  item.done
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-400 shadow-sm shadow-emerald-200'
                    : 'border-slate-200 bg-white'
                }`}>
                  {item.done
                    ? <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                </div>
                <span className={`text-[12px] flex-1 font-medium ${
                  item.done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'
                }`}>
                  {item.label}
                </span>
                {!item.done && (
                  <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    Compléter →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════ Stats cards — REDESIGN ════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            icon: Package,
            label: 'Total commandes',
            value: String(orders.length),
            gradient: 'from-orange-500 to-indigo-600',
            glow: 'shadow-orange-200',
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            trend: orders.length > 0 ? `${deliveredCount} livrées` : undefined,
          },
          {
            icon: TrendingUp,
            label: 'Total dépensé',
            value: formatPrice(totalSpent),
            gradient: 'from-emerald-500 to-teal-600',
            glow: 'shadow-emerald-200',
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            trend: memberTier !== 'Bronze' ? `Membre ${memberTier}` : undefined,
          },
          {
            icon: Truck,
            label: 'En cours',
            value: String(activeOrderCount),
            gradient: 'from-amber-500 to-orange-500',
            glow: 'shadow-amber-200',
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            trend: activeOrderCount > 0 ? 'En livraison' : undefined,
          },
          {
            icon: MapPin,
            label: 'Adresses',
            value: String(addresses.length),
            gradient: 'from-violet-500 to-purple-600',
            glow: 'shadow-violet-200',
            bg: 'bg-violet-50',
            text: 'text-violet-700',
            trend: addresses.filter(a => a.is_default).length > 0 ? '1 par défaut' : undefined,
          },
        ].map((stat, i) => {
          const StatIcon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_2px_16px_-4px_rgba(15,23,42,0.06)] p-4 sm:p-5 hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-default group overflow-hidden relative"
            >
              {/* Subtle background glow on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${stat.gradient} opacity-[0.02]`} />
              <div className="relative">
                <div className={`w-11 h-11 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-lg ${stat.glow} group-hover:scale-110 transition-transform duration-300`}>
                  <StatIcon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-none tabular-nums">{stat.value}</p>
                <p className="text-[11px] text-slate-400 mt-1.5 font-semibold">{stat.label}</p>
                {stat.trend && (
                  <p className={`text-[10px] ${stat.text} font-bold mt-1.5 flex items-center gap-0.5`}>
                    <span className="inline-block w-1 h-1 rounded-full bg-current opacity-60" />
                    {stat.trend}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Spending chart */}
      {orders.length > 0 && (
        <SectionCard>
          <SectionHeader
            icon={TrendingUp}
            iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
            title="Depenses des 6 derniers mois"
            subtitle={`Total: ${formatPrice(totalSpent)}`}
            action={
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-orange-700 bg-gray-50 hover:bg-slate-50 rounded-lg border border-gray-100 transition-all duration-200"
              >
                <Printer className="w-3.5 h-3.5" /> Exporter PDF
              </button>
            }
          />
          <div className="p-5 sm:p-6">
            <div className="flex items-end gap-2 h-32">
              {spendingByMonth.entries.map(([month, amount], i) => {
                const height = Math.max((amount / spendingByMonth.max) * 100, 4);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="relative w-full flex justify-center">
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap pointer-events-none">
                        {formatPrice(amount)}
                      </div>
                      <div
                        className={`w-full max-w-[48px] rounded-t-lg transition-all duration-500 ease-out ${amount > 0 ? 'bg-gradient-to-t from-orange-600 to-orange-500 group-hover:from-orange-700 group-hover:to-orange-600' : 'bg-gray-100'}`}
                        style={{ height: `${height}%`, minHeight: amount > 0 ? '8px' : '4px' }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 capitalize">{month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Active orders banner */}
      {activeOrderCount > 0 && (
        <div className="bg-gradient-to-r from-slate-50 via-slate-50 to-slate-50 border border-slate-200/50 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-200/40">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-orange-950">
              {activeOrderCount} commande{activeOrderCount > 1 ? 's' : ''} en cours
            </p>
            <p className="text-xs text-orange-700 mt-0.5">
              Suivez l'avancement de vos livraisons en temps reel
            </p>
          </div>
          <button
            onClick={() => switchTab('orders')}
            className="flex items-center gap-1.5 text-xs font-bold text-orange-800 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200/50 hover:shadow-md transition-all duration-200 flex-shrink-0"
          >
            Voir <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recent orders */}
      <SectionCard>
        <SectionHeader
          icon={Package}
          iconBg="bg-gradient-to-br from-orange-500 to-orange-700"
          title="Dernieres commandes"
          subtitle={
            orders.length > 0
              ? `${orders.length} commande${orders.length > 1 ? 's' : ''} au total`
              : undefined
          }
          action={
            orders.length > 0 ? (
              <button
                onClick={() => switchTab('orders')}
                className="text-xs font-bold text-orange-700 hover:text-orange-800 flex items-center gap-0.5 transition-colors"
              >
                Tout voir <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : undefined
          }
        />
        {orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Aucune commande"
            description="Vous n'avez pas encore passe de commande. Parcourez notre catalogue !"
            actionLabel="Commander maintenant"
            onAction={goBackToShop}
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 4).map((order) => {
              const cfg = statusConfigMap[order.status] || statusConfigMap.pending;
              const OrderIcon = cfg.icon;
              return (
                <div
                  key={order.id}
                  onClick={() => {
                    switchTab('orders');
                    loadOrderDetail(order.id);
                  }}
                  className="px-5 sm:px-6 py-4 flex items-center gap-4 hover:bg-gray-50/60 cursor-pointer transition-colors group"
                >
                  <div
                    className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <OrderIcon className={`w-4 h-4 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      #{order.order_number}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm font-black text-gray-900 hidden sm:block">
                    {formatPrice(order.total)}
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-orange-600 transition-colors flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={goBackToShop}
          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center group"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-slate-200/40 group-hover:scale-110 transition-transform duration-200">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-xs">Catalogue</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Parcourir</p>
          </div>
        </button>
        <button
          onClick={() => switchTab('orders')}
          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center group"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-200/40 group-hover:scale-110 transition-transform duration-200">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-xs">Commandes</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Historique</p>
          </div>
        </button>
        <button
          onClick={() => switchTab('addresses')}
          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center group"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-200/40 group-hover:scale-110 transition-transform duration-200">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-xs">Adresses</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Livraison</p>
          </div>
        </button>
        <button
          onClick={() => switchTab('profile')}
          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center group"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200/40 group-hover:scale-110 transition-transform duration-200">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-xs">Profil</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Modifier</p>
          </div>
        </button>
      </div>
    </div>
  );

  /* ================================================================
     RENDER: ORDERS TAB -- LIST
     ================================================================ */

  const renderOrdersList = () => {
    /* Filtrage côté client */
    const periodMs = orderPeriodFilter === 'all' ? null : parseInt(orderPeriodFilter) * 24 * 3600 * 1000;
    const filteredOrders = orders.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
      if (periodMs && (Date.now() - new Date(o.created_at).getTime()) > periodMs) return false;
      if (orderSearch) {
        const q = orderSearch.toLowerCase();
        const inNum = String(o.order_number || '').toLowerCase().includes(q);
        const inItems = (o.items || []).some((it: any) => (it.name || '').toLowerCase().includes(q));
        if (!inNum && !inItems) return false;
      }
      return true;
    });
    const statusOptions: Array<{ value: string; label: string }> = [
      { value: 'all', label: 'Tous' },
      { value: 'pending', label: 'En attente' },
      { value: 'confirmed', label: 'Confirmée' },
      { value: 'processing', label: 'En préparation' },
      { value: 'shipped', label: 'Expédiée' },
      { value: 'delivered', label: 'Livrée' },
      { value: 'cancelled', label: 'Annulée' },
    ];
    const hasActiveFilters = orderSearch || orderStatusFilter !== 'all' || orderPeriodFilter !== 'all';

    return (
    <SectionCard>
      <SectionHeader
        icon={Package}
        iconBg="bg-gradient-to-br from-orange-500 to-orange-700"
        title="Mes commandes"
        subtitle={`${filteredOrders.length}${hasActiveFilters ? ` / ${orders.length}` : ''} commande${orders.length > 1 ? 's' : ''}`}
        action={
          <button
            onClick={refreshData}
            disabled={refreshing}
            aria-label="Actualiser les commandes"
            title="Actualiser"
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl border border-gray-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Actualisation…' : 'Actualiser'}</span>
          </button>
        }
      />

      {/* Barre de recherche + filtres */}
      {orders.length > 0 && (
        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-50 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Rechercher par n° de commande ou produit..."
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-600/10 transition-all"
              aria-label="Rechercher une commande"
            />
            {orderSearch && (
              <button
                onClick={() => setOrderSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-lg"
                aria-label="Effacer"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {/* Statut */}
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOrderStatusFilter(opt.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  orderStatusFilter === opt.value
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <div className="w-px h-5 bg-gray-200 flex-shrink-0 mx-1" />
            {/* Période */}
            {([
              { v: 'all', l: 'Toutes' },
              { v: '30', l: '30 j' },
              { v: '90', l: '3 mois' },
              { v: '365', l: '1 an' },
            ] as const).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setOrderPeriodFilter(opt.v)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  orderPeriodFilter === opt.v
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {opt.l}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={() => { setOrderSearch(''); setOrderStatusFilter('all'); setOrderPeriodFilter('all'); }}
                className="flex-shrink-0 ml-auto px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Effacer
              </button>
            )}
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucune commande"
          description="Vous n'avez pas encore passe de commande"
          actionLabel="Commander maintenant"
          onAction={goBackToShop}
        />
      ) : filteredOrders.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-bold text-gray-700">Aucun résultat</p>
          <p className="text-xs text-gray-400 mt-1">Aucune commande ne correspond à vos filtres</p>
          <button
            onClick={() => { setOrderSearch(''); setOrderStatusFilter('all'); setOrderPeriodFilter('all'); }}
            className="mt-4 px-4 py-2 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {filteredOrders.map((ord) => {
            const isExpanded = expandedOrderId === ord.id;
            const cfg = statusConfigMap[ord.status] || statusConfigMap.pending;
            const OrdIcon = cfg.icon;
            return (
              <div key={ord.id}>
                {/* Order row */}
                <div
                  className="px-5 sm:px-6 py-4 flex items-center gap-4 hover:bg-gray-50/60 cursor-pointer transition-colors group"
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedOrderId(null);
                    } else {
                      setExpandedOrderId(ord.id);
                      loadOrderDetail(ord.id);
                    }
                  }}
                >
                  <div
                    className={`w-11 h-11 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.border}`}
                  >
                    <OrdIcon className={`w-5 h-5 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      Commande #{ord.order_number}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ord.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      {ord.items?.length
                        ? ` -- ${ord.items.length} article${ord.items.length > 1 ? 's' : ''}`
                        : ''}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <StatusBadge status={ord.status} />
                  </div>
                  <p className="text-sm font-black text-gray-900">{formatPrice(ord.total)}</p>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-300 group-hover:text-orange-600 transition-colors flex-shrink-0" />
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="bg-gray-50/50 border-t border-gray-100 px-5 sm:px-6 py-5">
                    {orderLoading && expandedOrderId === ord.id && !selectedOrder ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-2 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Mobile status badge */}
                        <div className="sm:hidden">
                          <StatusBadge status={ord.status} />
                        </div>

                        {/* Progress tracker */}
                        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                            Progression
                          </p>
                          <OrderTracker status={ord.status} />
                        </div>

                        {/* Order items */}
                        {selectedOrder?.id === ord.id && selectedOrder.items?.length ? (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                              Articles
                            </p>
                            <div className="space-y-2">
                              {selectedOrder.items.map((item: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-slate-200/50 transition-colors"
                                >
                                  {item.image_url ? (
                                    <img src={item.image_url} alt={item.name || item.product_name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                                  ) : (
                                    <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-100">
                                      <Package className="w-5 h-5 text-gray-300" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {item.name || item.product_name}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      Qte: {item.quantity} x {formatPrice(item.unit_price)}
                                    </p>
                                  </div>
                                  <p className="text-sm font-bold text-gray-900">
                                    {formatPrice(item.total || item.unit_price * item.quantity)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Order totals */}
                        {selectedOrder?.id === ord.id && (
                          <div className="bg-white rounded-xl border border-gray-100 p-4">
                            <div className="space-y-2">
                              {selectedOrder.subtotal != null && (
                                <div className="flex justify-between text-sm text-gray-500">
                                  <span>Sous-total</span>
                                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                                </div>
                              )}
                              {selectedOrder.shipping_amount != null && (
                                <div className="flex justify-between text-sm text-gray-500">
                                  <span>Livraison</span>
                                  <span>
                                    {selectedOrder.shipping_amount > 0 ? (
                                      formatPrice(selectedOrder.shipping_amount)
                                    ) : (
                                      <span className="text-emerald-600 font-medium">
                                        Gratuite
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                <span className="font-bold text-gray-900">Total</span>
                                <span className="text-lg font-black text-gray-900">
                                  {formatPrice(selectedOrder.total)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Cancel button */}
                        {(ord.status === 'pending' || ord.status === 'confirmed') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelOrder(ord.id);
                            }}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-all duration-200"
                          >
                            <XCircle className="w-4 h-4" />
                            {actionLoading ? 'Annulation...' : 'Annuler cette commande'}
                          </button>
                        )}

                        {/* Reorder button */}
                        {ord.status === 'delivered' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedOrder?.id === ord.id) handleReorder(selectedOrder);
                              else {
                                loadOrderDetail(ord.id).then(() => {
                                  // will reorder once detail loads
                                });
                                showMsg('success', 'Chargement des articles...');
                              }
                            }}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl shadow-md shadow-slate-200/30 hover:shadow-orange-300/50 hover:-translate-y-0.5 disabled:opacity-50 transition-all duration-200"
                          >
                            <RefreshCw className="w-4 h-4" />
                            {actionLoading ? 'Chargement...' : 'Re-commander'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
    );
  };

  /* ================================================================
     RENDER: ORDERS TAB -- DETAIL (full view)
     ================================================================ */

  const renderOrderDetail = () => {
    if (!selectedOrder) return null;
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedOrder(null)}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 group transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 group-hover:bg-gray-50 flex items-center justify-center shadow-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Retour aux commandes
        </button>

        {orderLoading ? (
          <SectionCard className="p-8 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
          </SectionCard>
        ) : (
          <SectionCard>
            {/* Order header */}
            <div className="bg-gradient-to-r from-gray-50 via-slate-50/30 to-gray-50 border-b border-gray-100 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    Commande
                  </p>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                    #{selectedOrder.order_number}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedOrder.created_at).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <div className="mt-6">
                <OrderTracker status={selectedOrder.status} />
              </div>
            </div>

            {/* Items */}
            {selectedOrder.items?.length ? (
              <div className="p-5 sm:p-6 border-b border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                  Articles commandes
                </p>
                <div className="space-y-3">
                  {selectedOrder.items.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-3.5 bg-gray-50/70 rounded-xl border border-gray-100/50 hover:border-slate-200/50 transition-colors"
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name || item.product_name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100 shadow-sm" />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-white to-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100">
                          <Package className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {item.name || item.product_name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Qte: {item.quantity} x {formatPrice(item.unit_price)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {formatPrice(item.total || item.unit_price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Totals */}
            <div className="p-5 sm:p-6">
              <div className="space-y-2.5 max-w-sm ml-auto">
                {selectedOrder.subtotal != null && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Sous-total</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                )}
                {selectedOrder.shipping_amount != null && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Livraison</span>
                    <span>
                      {selectedOrder.shipping_amount > 0 ? (
                        formatPrice(selectedOrder.shipping_amount)
                      ) : (
                        <span className="text-emerald-600 font-medium">Gratuite</span>
                      )}
                    </span>
                  </div>
                )}
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Remise</span>
                    <span>-{formatPrice(selectedOrder.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="font-bold text-gray-900 text-base">Total</span>
                  <span className="text-xl font-black text-gray-900">
                    {formatPrice(selectedOrder.total)}
                  </span>
                </div>
              </div>

              {/* Cancel action */}
              {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed') && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-all duration-200"
                  >
                    <XCircle className="w-4 h-4" />
                    {actionLoading ? 'Annulation...' : 'Annuler cette commande'}
                  </button>
                </div>
              )}

              {/* Reorder action */}
              {selectedOrder.status === 'delivered' && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <button
                    onClick={() => handleReorder(selectedOrder)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl shadow-md shadow-slate-200/30 hover:shadow-orange-300/50 hover:-translate-y-0.5 disabled:opacity-50 transition-all duration-200"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {actionLoading ? 'Chargement...' : 'Re-commander ces articles'}
                  </button>
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </div>
    );
  };

  /* ================================================================
     RENDER: INVOICES TAB -- LIST
     ================================================================ */

  const invoiceStatusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
    paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Payée' },
    pending: { bg: 'bg-slate-50', text: 'text-orange-800', border: 'border-slate-200', label: 'En attente' },
    partial: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Partielle' },
    overdue: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'En retard' },
    cancelled: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', label: 'Annulée' },
    draft: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', label: 'Brouillon' },
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber?: string) => {
    try {
      await invoicesAPI.downloadPdf(invoiceId, invoiceNumber);
    } catch {
      showMsg('error', 'Impossible de t\u00e9l\u00e9charger la facture');
    }
  };

  const renderInvoicesList = () => (
    <SectionCard>
      <SectionHeader
        icon={FileText}
        iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
        title="Mes factures"
        subtitle={invoices.length > 0 ? `${invoices.length} facture${invoices.length > 1 ? 's' : ''}` : undefined}
      />
      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          accent="emerald"
          title="Aucune facture pour le moment"
          description="Vos factures et bons de livraison apparaîtront ici une fois vos premières commandes passées."
          actionLabel="Commander maintenant"
          onAction={goBackToShop}
        />
      ) : (
        <div className="divide-y divide-gray-50">
          {invoices.map((inv: any) => {
            const st = invoiceStatusConfig[inv.status] || invoiceStatusConfig.pending;
            return (
              <div
                key={inv.id}
                className="px-5 sm:px-6 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors group"
              >
                <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-violet-200">
                  <FileText className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">
                    Facture #{inv.invoice_number}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(inv.issue_date || inv.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </p>
                </div>
                <div className="hidden sm:block">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${st.bg} ${st.text} ${st.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      inv.status === 'paid' ? 'bg-emerald-500' :
                      inv.status === 'pending' ? 'bg-orange-600' :
                      inv.status === 'partial' ? 'bg-orange-500' :
                      inv.status === 'overdue' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    {st.label}
                  </span>
                </div>
                <p className="text-sm font-black text-gray-900">
                  {formatPrice(inv.total)}
                </p>
                <button
                  onClick={() => handleDownloadInvoice(inv.id, inv.invoice_number)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-violet-700 bg-violet-50 rounded-xl border border-violet-200/50 hover:bg-violet-100 transition-colors flex-shrink-0"
                  title="Télécharger la facture PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );

  /* ================================================================
     RENDER: ADDRESSES TAB -- LIST
     ================================================================ */

  const renderAddressesList = () => (
    <SectionCard>
      <SectionHeader
        icon={MapPin}
        iconBg="bg-gradient-to-br from-teal-500 to-emerald-600"
        title="Mes adresses"
        subtitle={`${addresses.length} adresse${addresses.length > 1 ? 's' : ''} enregistree${addresses.length > 1 ? 's' : ''}`}
        action={
          <button
            onClick={resetAddressForm}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-bold rounded-xl hover:shadow-md hover:-translate-y-0.5 shadow-sm transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        }
      />
      {addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          accent="indigo"
          title="Aucune adresse enregistrée"
          description="Ajoutez vos adresses de livraison et de facturation pour accélérer vos prochaines commandes."
          actionLabel="Ajouter une adresse"
          onAction={resetAddressForm}
        />
      ) : (
        <div className="p-5 sm:p-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="relative bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-xl p-4 transition-colors group"
            >
              {/* Default badge */}
              {addr.is_default && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-orange-700 text-[10px] font-bold rounded-md border border-slate-100">
                    <Check className="w-3 h-3" /> Defaut
                  </span>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-teal-500" />
                </div>
                <div className="flex-1 min-w-0 pr-16">
                  <p className="text-sm font-bold text-gray-900">
                    {addr.first_name} {addr.last_name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{addr.address_line1}</p>
                  {addr.address_line2 && (
                    <p className="text-sm text-gray-500">{addr.address_line2}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {addr.city}
                    {addr.region ? `, ${addr.region}` : ''}
                  </p>
                  {addr.phone && (
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {addr.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100/80">
                <button
                  onClick={() => startEditAddress(addr)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-orange-700 hover:bg-slate-50 rounded-lg transition-all duration-200"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Modifier
                </button>
                <button
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );

  /* ================================================================
     RENDER: ADDRESSES TAB -- FORM
     ================================================================ */

  const renderAddressForm = () => (
    <SectionCard>
      <SectionHeader
        icon={MapPin}
        iconBg="bg-gradient-to-br from-teal-500 to-emerald-600"
        title={editingAddress ? "Modifier l'adresse" : 'Nouvelle adresse'}
        subtitle="Adresse de livraison chantier"
        action={
          <button
            onClick={() => {
              setShowAddressForm(false);
              setEditingAddress(null);
            }}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        }
      />
      <div className="p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StyledInput
            label="Prenom"
            value={addressForm.first_name}
            onChange={(v) => setAddressForm((p) => ({ ...p, first_name: v }))}
          />
          <StyledInput
            label="Nom"
            value={addressForm.last_name}
            onChange={(v) => setAddressForm((p) => ({ ...p, last_name: v }))}
          />
        </div>
        <StyledInput
          label="Telephone"
          type="tel"
          icon={Phone}
          value={addressForm.phone}
          onChange={(v) => setAddressForm((p) => ({ ...p, phone: v }))}
          placeholder="+221 77 000 00 00"
        />
        <StyledInput
          label="Adresse *"
          value={addressForm.address_line1}
          onChange={(v) => setAddressForm((p) => ({ ...p, address_line1: v }))}
          placeholder="Numero, rue, quartier..."
        />
        <StyledInput
          label="Complement"
          value={addressForm.address_line2}
          onChange={(v) => setAddressForm((p) => ({ ...p, address_line2: v }))}
          placeholder="Residence, appartement..."
        />
        <div className="grid grid-cols-2 gap-3">
          <StyledInput
            label="Ville *"
            value={addressForm.city}
            onChange={(v) => setAddressForm((p) => ({ ...p, city: v }))}
          />
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Region
            </label>
            <select
              value={addressForm.region}
              onChange={(e) => setAddressForm((p) => ({ ...p, region: e.target.value }))}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 hover:border-gray-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all duration-200"
            >
              {[
                'Dakar',
                'Thies',
                'Saint-Louis',
                'Diourbel',
                'Kaolack',
                'Ziguinchor',
                'Tambacounda',
                'Fatick',
                'Kolda',
                'Matam',
                'Kaffrine',
                'Kedougou',
                'Sedhiou',
                'Louga',
                'Autre',
              ].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/80 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={addressForm.is_default}
            onChange={(e) => setAddressForm((p) => ({ ...p, is_default: e.target.checked }))}
            className="w-4 h-4 rounded text-orange-700 border-gray-300 focus:ring-orange-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Adresse par defaut</p>
            <p className="text-xs text-gray-400">Utilisee automatiquement lors de la livraison</p>
          </div>
        </label>
        <div className="flex gap-3 pt-3">
          <button
            onClick={() => {
              setShowAddressForm(false);
              setEditingAddress(null);
            }}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all duration-200"
          >
            Annuler
          </button>
          <button
            onClick={handleSaveAddress}
            disabled={actionLoading}
            className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-300/30 hover:shadow-orange-300/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2 transition-all duration-200"
          >
            <Save className="w-4 h-4" />
            {actionLoading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </SectionCard>
  );

  /* ================================================================
     RENDER: PROFILE TAB
     ================================================================ */

  const renderProfile = () => (
    <div className="space-y-6">
      {/* Profile header card */}
      <SectionCard>
        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-indigo-700 p-6 sm:p-8 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 50%, white 0%, transparent 60%), radial-gradient(circle at 70% 80%, white 0%, transparent 40%)',
            }}
          />
          {/* Decorative pattern */}
          <div className="absolute top-0 right-0 w-48 h-48 opacity-5">
            <svg viewBox="0 0 100 100" fill="none"><circle cx="80" cy="20" r="50" stroke="white" strokeWidth="1"/><circle cx="80" cy="20" r="35" stroke="white" strokeWidth="0.8"/><circle cx="80" cy="20" r="20" stroke="white" strokeWidth="0.6"/></svg>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar with completion ring */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="absolute inset-0 w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="44" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
                <circle cx="48" cy="48" r="44" stroke="url(#profileGrad)" strokeWidth="3" fill="none"
                  strokeDasharray={`${(profileCompletion / 100) * 276} 276`}
                  strokeLinecap="round" className="transition-all duration-700" />
                <defs><linearGradient id="profileGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#f97316"/></linearGradient></defs>
              </svg>
              <div className="absolute inset-[6px] bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl overflow-hidden flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-orange-600/30">
                {profilePhoto
                  ? <img src={profilePhoto} alt={initials} className="w-full h-full object-cover" />
                  : initials}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -left-1 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-orange-500 hover:bg-orange-50 transition-colors z-10"
                title="Changer la photo"
              >
                <Camera className="w-3 h-3 text-orange-600" />
              </button>
              {profileCompletion === 100 && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center border-3 border-white shadow-sm">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <h3 className="text-white text-xl font-black truncate">
                {customer?.first_name} {customer?.last_name}
              </h3>
              <p className="text-white/60 text-sm truncate">{customer?.email}</p>
              {/* Photo actions */}
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold rounded-full backdrop-blur-sm border border-white/20 transition-colors"
                >
                  <Camera className="w-3 h-3" /> Changer la photo
                </button>
                {profilePhoto && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-400/20 hover:bg-red-400/30 text-red-100 text-[11px] font-bold rounded-full backdrop-blur-sm border border-red-300/20 transition-colors"
                  >
                    <X className="w-3 h-3" /> Supprimer
                  </button>
                )}
              </div>
              {customer?.company_name && (
                <div className="flex items-center gap-1.5 mt-2 justify-center sm:justify-start">
                  <Building2 className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-orange-500 text-xs font-semibold">
                    {customer.company_name}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-gradient-to-r ${tierCfg.gradient} text-white shadow-sm`}>
                  {tierCfg.icon} {memberTier}
                </span>
                <span className="text-[10px] text-gray-500 font-medium">
                  Profil {profileCompletion}% complet
                </span>
              </div>
            </div>
          </div>
          {/* Account stats bar */}
          <div className="relative z-10 grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/10">
            <div className="text-center">
              <p className="text-white text-lg font-black">{orders.length}</p>
              <p className="text-gray-500 text-[10px] font-semibold">Commandes</p>
            </div>
            <div className="text-center">
              <p className="text-white text-lg font-black">{addresses.length}</p>
              <p className="text-gray-500 text-[10px] font-semibold">Adresses</p>
            </div>
            <div className="text-center">
              <p className="text-orange-500 text-lg font-black">{formatPrice(totalSpent)}</p>
              <p className="text-gray-500 text-[10px] font-semibold">Depense totale</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Personal info form */}
      <SectionCard>
        <SectionHeader
          icon={User}
          iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
          title="Informations personnelles"
          subtitle="Modifiez vos donnees de contact"
        />
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <StyledInput
              label="Prenom"
              value={profileForm.first_name}
              onChange={(v) => setProfileForm((p) => ({ ...p, first_name: v }))}
            />
            <StyledInput
              label="Nom"
              value={profileForm.last_name}
              onChange={(v) => setProfileForm((p) => ({ ...p, last_name: v }))}
            />
          </div>
          <StyledInput
            label="Adresse email"
            type="email"
            icon={AtSign}
            value={customer?.email || ''}
            disabled
          />
          <StyledInput
            label="Telephone"
            type="tel"
            icon={Phone}
            value={profileForm.phone}
            onChange={(v) => setProfileForm((p) => ({ ...p, phone: v }))}
            placeholder="+221 77 000 00 00"
          />
          <StyledInput
            label="Entreprise"
            icon={Building2}
            value={profileForm.company_name}
            onChange={(v) => setProfileForm((p) => ({ ...p, company_name: v }))}
            placeholder="Nom de votre societe (optionnel)"
          />
          <div className="pt-2">
            <button
              onClick={handleUpdateProfile}
              disabled={actionLoading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-300/30 hover:shadow-orange-300/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-200"
            >
              <Save className="w-4 h-4" />
              {actionLoading ? 'Enregistrement...' : 'Sauvegarder les modifications'}
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  /* ================================================================
     RENDER: SECURITY TAB
     ================================================================ */

  const renderSecurity = () => (
    <div className="space-y-6">

      {/* Phone verification card */}
      <SectionCard>
        <SectionHeader
          icon={Phone}
          iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
          title="Vérification du téléphone"
          subtitle="Recevez un code SMS pour confirmer votre numéro"
        />
        <div className="p-5 sm:p-6 space-y-4">
          {phoneOtpStatus === 'verified' || (customer as any)?.phone_verified_at ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Téléphone vérifié</p>
                <p className="text-xs text-emerald-600">{customer?.phone}</p>
              </div>
            </div>
          ) : (
            <>
              {phoneOtpError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{phoneOtpError}</span>
                </div>
              )}
              {!phoneOtpSent ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Numéro de téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                      <input
                        type="tel"
                        value={phoneOtpPhone || customer?.phone || ''}
                        onChange={(e) => setPhoneOtpPhone(e.target.value)}
                        placeholder="77 123 45 67"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSendPhoneOtp}
                    disabled={phoneOtpStatus === 'sending'}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {phoneOtpStatus === 'sending' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Envoi...</> : <><Send className="w-4 h-4" /> Envoyer le code SMS</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Code envoyé au <strong>{phoneOtpPhone || customer?.phone}</strong>. Entrez le code à 6 chiffres :</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={phoneOtpValue}
                    onChange={(e) => setPhoneOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="_ _ _ _ _ _"
                    className="w-full py-3 text-center text-2xl font-black tracking-[0.5em] border border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleVerifyPhoneOtp}
                      disabled={phoneOtpStatus === 'verifying'}
                      className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-sm font-bold rounded-xl hover:from-orange-500 hover:to-orange-600 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                    >
                      {phoneOtpStatus === 'verifying' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Vérification...</> : <><CheckCircle className="w-4 h-4" /> Confirmer</>}
                    </button>
                    <button
                      onClick={() => { setPhoneOtpSent(false); setPhoneOtpValue(''); setPhoneOtpError(''); setPhoneOtpStatus('idle'); }}
                      className="px-4 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
                    >
                      Renvoyer
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SectionCard>

      {/* Change password */}
      <SectionCard>
        <SectionHeader
          icon={Lock}
          iconBg="bg-gradient-to-br from-orange-600 to-orange-800"
          title="Changer le mot de passe"
          subtitle="Assurez-vous d'utiliser un mot de passe fort"
        />
        <div className="p-5 sm:p-6 space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Mot de passe actuel
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, current_password: e.target.value }))
                }
                className="w-full pl-10 pr-11 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 hover:border-gray-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all duration-200"
                placeholder="Votre mot de passe actuel"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type={showNewPw ? 'text' : 'password'}
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, new_password: e.target.value }))
                }
                className="w-full pl-10 pr-11 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 hover:border-gray-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all duration-200"
                placeholder="Minimum 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength indicator */}
            {passwordForm.new_password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      passwordForm.new_password.length >= 10
                        ? 'bg-emerald-500 w-full'
                        : passwordForm.new_password.length >= 6
                        ? 'bg-orange-600 w-2/3'
                        : 'bg-red-500 w-1/3'
                    }`}
                    style={{
                      width:
                        passwordForm.new_password.length >= 10
                          ? '100%'
                          : passwordForm.new_password.length >= 6
                          ? '66%'
                          : '33%',
                    }}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    passwordForm.new_password.length >= 10
                      ? 'text-emerald-600'
                      : passwordForm.new_password.length >= 6
                      ? 'text-orange-700'
                      : 'text-red-500'
                  }`}
                >
                  {passwordForm.new_password.length >= 10
                    ? 'Fort'
                    : passwordForm.new_password.length >= 6
                    ? 'Moyen'
                    : 'Faible'}
                </span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <StyledInput
            label="Confirmer le mot de passe"
            type="password"
            icon={Lock}
            value={passwordForm.confirm_password}
            onChange={(v) => setPasswordForm((p) => ({ ...p, confirm_password: v }))}
            placeholder="Retapez le nouveau mot de passe"
          />

          {/* Password match indicator */}
          {passwordForm.confirm_password.length > 0 && (
            <div
              className={`flex items-center gap-2 text-xs font-medium ${
                passwordForm.new_password === passwordForm.confirm_password
                  ? 'text-emerald-600'
                  : 'text-red-500'
              }`}
            >
              {passwordForm.new_password === passwordForm.confirm_password ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" /> Les mots de passe correspondent
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" /> Les mots de passe ne correspondent pas
                </>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleChangePassword}
              disabled={
                actionLoading ||
                !passwordForm.current_password ||
                !passwordForm.new_password ||
                passwordForm.new_password !== passwordForm.confirm_password
              }
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              <Shield className="w-4 h-4" />
              {actionLoading ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Active sessions info */}
      <SectionCard>
        <SectionHeader
          icon={Shield}
          iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
          title="Securite du compte"
          subtitle="Informations sur votre session"
        />
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800">Session active</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Vous etes connecte en tant que {customer?.email}
              </p>
            </div>
          </div>
          {/* Account summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Package className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Commandes</span>
              </div>
              <p className="text-lg font-black text-gray-900">{orders.length}</p>
            </div>
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Star className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Statut</span>
              </div>
              <p className="text-lg font-black text-gray-900">{tierCfg.icon} {memberTier}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard className="border-red-100">
        <SectionHeader
          icon={LogOut}
          iconBg="bg-red-500"
          title="Deconnexion"
          subtitle="Se deconnecter de votre compte"
        />
        <div className="p-5 sm:p-6">
          <p className="text-sm text-gray-500 mb-4">
            Vous serez redirige vers la page d'accueil de la boutique.
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" /> Se deconnecter
          </button>
        </div>
      </SectionCard>
    </div>
  );

  /* ================================================================
     RENDER: NOTIFICATIONS TAB
     ================================================================ */

  const renderNotifications = () => (
    <div className="space-y-6">
      <SectionCard>
        <SectionHeader
          icon={Bell}
          iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est a jour'}
        />
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            accent="amber"
            title="Tout est calme par ici"
            description="Vous serez notifié ici dès qu'une commande est confirmée, expédiée ou livrée."
            secondaryActionLabel="Voir mes commandes"
            onSecondaryAction={() => switchTab('orders')}
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((notif) => {
              const NotifIcon = notif.icon;
              return (
                <div
                  key={notif.id}
                  className={`px-5 sm:px-6 py-4 flex items-start gap-4 transition-colors ${notif.read ? 'opacity-60' : 'bg-slate-50/30'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    notif.type === 'delivery' ? 'bg-emerald-50 text-emerald-600' :
                    notif.type === 'promo' ? 'bg-violet-50 text-violet-600' :
                    'bg-slate-50 text-orange-700'
                  }`}>
                    <NotifIcon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-bold ${notif.read ? 'text-gray-500' : 'text-gray-900'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{notif.message}</p>
                    <p className="text-[10px] text-gray-300 mt-1.5 font-medium">
                      {new Date(notif.date).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {notif.type === 'order' && (
                    <button
                      onClick={() => switchTab('orders')}
                      className="text-[10px] font-bold text-orange-700 hover:text-orange-800 flex items-center gap-1 flex-shrink-0 mt-1"
                    >
                      Voir <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );

  /* ================================================================
     RENDER: FAVORITES TAB
     ================================================================ */

  const toggleFavorite = (product: Product) => {
    const key = `allo_beton_favorites_${customer?.id}`;
    const saved = localStorage.getItem(key);
    let ids: string[] = saved ? JSON.parse(saved) : [];
    if (ids.includes(product.id)) {
      ids = ids.filter((id) => id !== product.id);
      setFavorites((prev) => prev.filter((p) => p.id !== product.id));
    } else {
      ids.push(product.id);
      setFavorites((prev) => [...prev, product]);
    }
    localStorage.setItem(key, JSON.stringify(ids));
  };

  const renderFavorites = () => (
    <div className="space-y-6">
      <SectionCard>
        <SectionHeader
          icon={Heart}
          iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
          title="Mes favoris"
          subtitle={favorites.length > 0 ? `${favorites.length} produit${favorites.length > 1 ? 's' : ''} sauvegarde${favorites.length > 1 ? 's' : ''}` : undefined}
        />
        {favoritesLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
          </div>
        ) : favorites.length === 0 ? (
          <EmptyState
            icon={Heart}
            accent="rose"
            title="Pas encore de favoris"
            description="Cliquez sur le cœur d'un produit pour le sauvegarder ici et le retrouver en un clin d'œil."
            actionLabel="Parcourir le catalogue"
            onAction={goBackToShop}
          />
        ) : (
          <div className="p-5 sm:p-6 grid gap-4 sm:grid-cols-2">
            {favorites.map((prod) => (
              <div
                key={prod.id}
                className="relative bg-gray-50/50 hover:bg-white border border-gray-100 hover:border-slate-200/50 rounded-xl p-4 transition-all duration-200 group hover:shadow-md"
              >
                <button
                  onClick={() => toggleFavorite(prod)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors z-10"
                  title="Retirer des favoris"
                >
                  <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                </button>
                <div className="flex items-start gap-3">
                  {prod.image_url ? (
                    <img src={prod.image_url} alt={prod.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate pr-8">{prod.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{prod.description}</p>
                    <p className="text-sm font-black text-orange-700 mt-2">{formatPrice(prod.price)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100/80">
                  <button
                    onClick={() => onNavigate('product', { slug: prod.slug })}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:text-orange-700 hover:bg-slate-50 rounded-lg transition-all duration-200"
                  >
                    <Eye className="w-3.5 h-3.5" /> Voir le produit
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await addToCart(prod.id, 1);
                        showMsg('success', `${prod.name} ajoute au panier`);
                      } catch {
                        showMsg('error', 'Erreur lors de l\'ajout au panier');
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg hover:shadow-md transition-all duration-200"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );

  /* ================================================================
     RENDER: SUPPORT TAB
     ================================================================ */

  const FAQ_ITEMS = [
    { q: 'Comment passer une commande ?', a: 'Parcourez notre catalogue, ajoutez les produits au panier et validez votre commande. Vous pouvez payer en ligne via PayDunya ou a la livraison.' },
    { q: 'Quels sont les delais de livraison ?', a: 'La livraison est effectuee sous 24 a 72h dans la region de Dakar. Pour les autres regions, comptez 3 a 5 jours ouvrables.' },
    { q: 'Comment annuler une commande ?', a: 'Vous pouvez annuler une commande en attente ou confirmee depuis l\'onglet "Mes commandes". Cliquez sur la commande puis sur "Annuler".' },
    { q: 'Comment obtenir un remboursement ?', a: 'Contactez notre service client via WhatsApp ou email. Les remboursements sont traites sous 5 a 7 jours ouvrables.' },
    { q: 'Livrez-vous en dehors de Dakar ?', a: 'Oui, nous livrons dans toutes les 14 regions du Senegal. Les frais de livraison varient selon la destination.' },
  ];

  const renderSupport = () => (
    <div className="space-y-6">
      {/* Contact options */}
      <div className="grid sm:grid-cols-3 gap-4">
        <a
          href="https://wa.me/221770000000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-200/40 group-hover:scale-110 transition-transform duration-200">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900 text-sm">WhatsApp</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Reponse rapide</p>
          </div>
        </a>
        <a
          href="mailto:contact@allobeton.sn"
          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-md shadow-orange-200/40 group-hover:scale-110 transition-transform duration-200">
            <AtSign className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900 text-sm">Email</p>
            <p className="text-[10px] text-gray-400 mt-0.5">contact@allobeton.sn</p>
          </div>
        </a>
        <a
          href="tel:+221338000000"
          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center shadow-md shadow-slate-200/40 group-hover:scale-110 transition-transform duration-200">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900 text-sm">Telephone</p>
            <p className="text-[10px] text-gray-400 mt-0.5">+221 33 800 00 00</p>
          </div>
        </a>
      </div>

      {/* FAQ */}
      <SectionCard>
        <SectionHeader
          icon={HelpCircle}
          iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
          title="Questions frequentes"
          subtitle="Reponses aux questions les plus posees"
        />
        <div className="divide-y divide-gray-50">
          {FAQ_ITEMS.map((faq, idx) => (
            <div key={idx} className="px-5 sm:px-6">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center gap-3 py-4 text-left group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${expandedFaq === idx ? 'bg-slate-50' : 'bg-gray-50 group-hover:bg-slate-50/50'}`}>
                  <HelpCircle className={`w-4 h-4 transition-colors ${expandedFaq === idx ? 'text-orange-700' : 'text-gray-400 group-hover:text-orange-600'}`} />
                </div>
                <span className={`flex-1 text-sm font-semibold transition-colors ${expandedFaq === idx ? 'text-gray-900' : 'text-gray-600'}`}>
                  {faq.q}
                </span>
                {expandedFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-orange-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0" />
                )}
              </button>
              {expandedFaq === idx && (
                <div className="pb-4 pl-11 -mt-1">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Contact form */}
      <SectionCard>
        <SectionHeader
          icon={Send}
          iconBg="bg-gradient-to-br from-orange-600 to-orange-800"
          title="Nous contacter"
          subtitle="Envoyez-nous un message"
        />
        <div className="p-5 sm:p-6 space-y-4">
          {supportSent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-gray-900 mb-1">Message envoye !</p>
              <p className="text-sm text-gray-500 mb-4">Notre equipe vous repondra dans les plus brefs delais.</p>
              <button
                onClick={() => { setSupportSent(false); setSupportForm({ subject: '', message: '' }); }}
                className="text-sm font-bold text-orange-700 hover:text-orange-800"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <>
              <StyledInput
                label="Sujet"
                value={supportForm.subject}
                onChange={(v) => setSupportForm((p) => ({ ...p, subject: v }))}
                placeholder="Objet de votre demande"
              />
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Message
                </label>
                <textarea
                  value={supportForm.message}
                  onChange={(e) => setSupportForm((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Decrivez votre probleme ou question..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 hover:border-gray-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all duration-200 resize-none"
                />
              </div>
              <button
                onClick={async () => {
                  if (!supportForm.subject.trim() || !supportForm.message.trim()) {
                    showMsg('error', 'Veuillez remplir tous les champs');
                    return;
                  }
                  try {
                    setActionLoading(true);
                    await customersAPI.sendSupport(supportForm.subject.trim(), supportForm.message.trim());
                    setSupportSent(true);
                    showMsg('success', 'Votre message a \u00e9t\u00e9 envoy\u00e9 — r\u00e9ponse sous 24h');
                  } catch {
                    showMsg('error', 'Erreur lors de l\'envoi. Veuillez r\u00e9essayer.');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-300/30 hover:shadow-orange-300/50 hover:-translate-y-0.5 transition-all duration-200"
              >
                <Send className="w-4 h-4" /> Envoyer le message
              </button>
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );

  /* ================================================================
     RENDER: REFERRAL TAB
     ================================================================ */

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setReferralCopied(true);
      showMsg('success', 'Code de parrainage copie !');
      setTimeout(() => setReferralCopied(false), 3000);
    }).catch(() => {
      showMsg('error', 'Impossible de copier le code');
    });
  };

  const handleShareReferral = () => {
    const text = `Rejoins Allo Beton pour tes materiaux BTP ! Utilise mon code ${referralCode} pour obtenir 5% de reduction sur ta premiere commande. https://allobeton.sn`;
    if (navigator.share) {
      navigator.share({ title: 'Allo Beton - Parrainage', text }).catch(() => {});
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const renderReferral = () => (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-600 via-orange-600 to-red-500 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%), radial-gradient(circle at 20% 80%, white 0%, transparent 50%)',
        }} />
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-black mb-2">Parrainez, gagnez !</h3>
          <p className="text-slate-100 text-sm max-w-md mx-auto">
            Invitez vos collegues et partenaires. Pour chaque filleul qui commande, vous recevez 5% de reduction sur votre prochaine commande.
          </p>
        </div>
      </div>

      {/* Referral code card */}
      <SectionCard>
        <SectionHeader
          icon={Gift}
          iconBg="bg-gradient-to-br from-orange-600 to-orange-800"
          title="Votre code de parrainage"
          subtitle="Partagez-le avec vos contacts"
        />
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <div className="flex-1 text-center">
              <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-widest font-mono">
                {referralCode}
              </p>
            </div>
            <button
              onClick={handleCopyReferral}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex-shrink-0 ${
                referralCopied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {referralCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {referralCopied ? 'Copie !' : 'Copier'}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={handleShareReferral}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-200/40 hover:shadow-emerald-300/50 hover:-translate-y-0.5 transition-all duration-200"
            >
              <MessageCircle className="w-4 h-4" /> Partager via WhatsApp
            </button>
            <button
              onClick={handleShareReferral}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <Share2 className="w-4 h-4" /> Partager autrement
            </button>
          </div>
        </div>
      </SectionCard>

      {/* How it works */}
      <SectionCard>
        <SectionHeader
          icon={Star}
          iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
          title="Comment ca marche ?"
          subtitle="3 etapes simples"
        />
        <div className="p-5 sm:p-6">
          <div className="space-y-4">
            {[
              { step: 1, title: 'Partagez votre code', desc: 'Envoyez votre code unique a vos contacts par WhatsApp, email ou SMS', icon: Share2, color: 'from-orange-500 to-orange-700' },
              { step: 2, title: 'Votre filleul commande', desc: 'Il s\'inscrit et passe sa premiere commande en utilisant votre code', icon: ShoppingBag, color: 'from-emerald-400 to-green-500' },
              { step: 3, title: 'Vous gagnez !', desc: 'Vous recevez 5% de reduction sur votre prochaine commande', icon: Gift, color: 'from-violet-500 to-purple-600' },
            ].map((s) => {
              const StepIcon = s.icon;
              return (
                <div key={s.step} className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center text-white shadow-md`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    {s.step < 3 && <div className="absolute top-11 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-200" />}
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-bold text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>
    </div>
  );

  /* ================================================================
     RENDER: REORDER HANDLER
     ================================================================ */

  const handleReorder = async (order: Order) => {
    try {
      setActionLoading(true);
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const productId = (item as any).product_id || (item as any).id;
          if (productId) {
            await addToCart(productId, item.quantity || 1);
          }
        }
        showMsg('success', 'Articles ajoutes au panier !');
        onNavigate('cart');
      } else {
        showMsg('error', 'Impossible de re-commander: details non disponibles');
      }
    } catch {
      showMsg('error', 'Erreur lors de la re-commande');
    } finally {
      setActionLoading(false);
    }
  };

  /* ================================================================
     RENDER: EXPORT PDF HANDLER
     ================================================================ */

  const handleExportPDF = () => {
    // Create a printable summary
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showMsg('error', 'Veuillez autoriser les popups pour exporter le PDF');
      return;
    }
    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Releve de compte - Allo Beton</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;color:#111}
h1{font-size:24px;margin-bottom:4px}
.subtitle{color:#666;font-size:14px;margin-bottom:30px}
.header-bar{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #f59e0b;padding-bottom:16px;margin-bottom:24px}
.logo{font-size:20px;font-weight:900;color:#f59e0b}
table{width:100%;border-collapse:collapse;margin-bottom:30px;font-size:13px}
th{background:#f9fafb;padding:10px 12px;text-align:left;font-weight:700;border-bottom:2px solid #e5e7eb;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280}
td{padding:10px 12px;border-bottom:1px solid #f3f4f6}
.total-row td{font-weight:700;border-top:2px solid #111}
.section-title{font-size:16px;font-weight:700;margin:24px 0 12px;padding-bottom:8px;border-bottom:1px solid #e5e7eb}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:30px}
.stat-card{background:#f9fafb;padding:16px;border-radius:8px;text-align:center}
.stat-value{font-size:24px;font-weight:900}
.stat-label{font-size:11px;color:#6b7280;margin-top:4px}
@media print{body{padding:20px}}
</style></head><body>
<div class="header-bar">
  <div class="logo">ALLO BETON</div>
  <div style="text-align:right;font-size:12px;color:#666">
    <div>Releve de compte</div>
    <div>${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  </div>
</div>
<h1>${customer?.first_name} ${customer?.last_name}</h1>
<p class="subtitle">${customer?.email}${customer?.company_name ? ' • ' + customer.company_name : ''}</p>
<div class="stats">
  <div class="stat-card"><div class="stat-value">${orders.length}</div><div class="stat-label">Commandes</div></div>
  <div class="stat-card"><div class="stat-value">${formatPrice(totalSpent)}</div><div class="stat-label">Total depense</div></div>
  <div class="stat-card"><div class="stat-value">${memberTier}</div><div class="stat-label">Niveau fidelite</div></div>
</div>
<div class="section-title">Historique des commandes</div>
<table>
<thead><tr><th>N° Commande</th><th>Date</th><th>Statut</th><th style="text-align:right">Montant</th></tr></thead>
<tbody>
${orders.map(o => `<tr>
  <td>#${o.order_number}</td>
  <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
  <td><span class="badge" style="background:${o.status === 'delivered' ? '#d1fae5;color:#065f46' : o.status === 'cancelled' ? '#fee2e2;color:#991b1b' : '#fef3c7;color:#92400e'}">${(statusConfigMap[o.status] || statusConfigMap.pending).label}</span></td>
  <td style="text-align:right;font-weight:600">${formatPrice(o.total)}</td>
</tr>`).join('')}
<tr class="total-row"><td colspan="3">Total</td><td style="text-align:right">${formatPrice(orders.reduce((s,o) => s + (o.total || 0), 0))}</td></tr>
</tbody></table>
${invoices.length > 0 ? `<div class="section-title">Factures</div>
<table><thead><tr><th>N° Facture</th><th>Date</th><th>Statut</th><th style="text-align:right">Montant</th></tr></thead>
<tbody>${invoices.map((inv: any) => `<tr>
  <td>#${inv.invoice_number}</td>
  <td>${new Date(inv.issue_date || inv.created_at).toLocaleDateString('fr-FR')}</td>
  <td>${inv.status}</td>
  <td style="text-align:right;font-weight:600">${formatPrice(inv.total)}</td>
</tr>`).join('')}</tbody></table>` : ''}
<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
  Allo Beton - Materiaux de construction BTP au Senegal<br>
  Document genere le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
</div></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  /* ================================================================
     RENDER: TAB CONTENT DISPATCHER
     ================================================================ */

  const renderContent = () => {
    switch (tab) {
      case 'overview':
        return renderOverview();
      case 'orders':
        return selectedOrder ? renderOrderDetail() : renderOrdersList();
      case 'invoices':
        return renderInvoicesList();
      case 'addresses':
        return showAddressForm ? renderAddressForm() : renderAddressesList();
      case 'profile':
        return renderProfile();
      case 'security':
        return renderSecurity();
      case 'notifications':
        return renderNotifications();
      case 'favorites':
        return renderFavorites();
      case 'support':
        return renderSupport();
      case 'referral':
        return renderReferral();
      default:
        return renderOverview();
    }
  };

  /* ================================================================
     MAIN RENDER
     ================================================================ */

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Barre de progression top pendant refresh non bloquant */}
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 overflow-hidden pointer-events-none">
          <div className="h-full bg-gradient-to-r from-orange-400 via-orange-600 to-indigo-600 animate-[allo-progress_1.2s_ease-in-out_infinite]" style={{ width: '40%' }} />
        </div>
      )}
      <style>{`@keyframes allo-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }`}</style>

      {/* ── Email not verified banner (dismissible) ── */}
      {customer && !(customer as any).email_verified && !verifyBannerDismissed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-2">
            <Mail className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-amber-800 font-medium">Votre email n'est pas encore vérifié.</span>
          </span>
          <button
            onClick={handleResendVerification}
            disabled={resendStatus === 'sending' || resendStatus === 'sent'}
            className="text-xs font-bold text-amber-800 underline hover:text-amber-900 disabled:opacity-50"
          >
            {resendStatus === 'sending' ? 'Envoi…' : resendStatus === 'sent' ? '✓ Email envoyé' : resendStatus === 'error' ? 'Erreur, réessayer' : 'Renvoyer'}
          </button>
          <span className="text-amber-300">·</span>
          <button
            onClick={() => switchTab('security')}
            className="text-xs font-bold text-amber-900 hover:underline underline-offset-2"
          >
            Aller à Sécurité →
          </button>
          <button
            onClick={dismissVerifyBanner}
            aria-label="Masquer"
            className="ml-1 p-1 hover:bg-amber-100 rounded-lg text-amber-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── TOP NAVBAR ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button
            onClick={goBackToShop}
            className="flex items-center gap-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 group transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="hidden sm:inline">Boutique</span>
          </button>

          <div className="h-6 w-px bg-gray-200" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-gray-900 text-sm hidden sm:inline tracking-tight">
              Allo Beton
            </span>
          </div>

          <div className="flex-1" />

          {/* Active orders indicator */}
          {activeOrderCount > 0 && (
            <button
              onClick={() => switchTab('orders')}
              className="relative flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-orange-800 text-xs font-bold rounded-lg border border-slate-200/50 hover:bg-slate-100 transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{activeOrderCount} en cours</span>
              <span className="sm:hidden">{activeOrderCount}</span>
            </button>
          )}

          {/* Notifications bell */}
          <button
            onClick={() => switchTab('notifications')}
            className="relative w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <Bell className="w-4 h-4 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-2.5 pl-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {customer?.first_name}
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">Mon compte</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* ── CONFIRM DIALOG ── */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeConfirm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-black text-gray-900 mb-1">{confirmDialog.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{confirmDialog.description}</p>
            <div className="flex gap-3">
              <button
                onClick={closeConfirm}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST MESSAGE ── */}
      {message.text && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div
            className={`px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-red-500 text-white shadow-red-500/20'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            {message.text}
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="ml-2 p-0.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT: SIDEBAR + CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8 pb-24 lg:pb-8">
        <div className="grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-8 items-start">
          {/* ════ DESKTOP SIDEBAR ════ */}
          <div className="hidden lg:block space-y-4 sticky top-24">
            {/* ════ User card — PREMIUM REDESIGN ════ */}
            <div className="relative bg-white rounded-3xl border border-slate-200/70 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] overflow-hidden">
              {/* Aurora header */}
              <div className="h-28 relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-indigo-700">
                {/* Mesh blobs */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/15 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-300/20 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-cyan-200/20 rounded-full blur-2xl" />
                {/* Grid pattern */}
                <div
                  className="absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />
                {/* Corner accent */}
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest">Actif</span>
                </div>
              </div>

              <div className="px-5 pb-5 -mt-12 relative">
                {/* Avatar with animated completion ring */}
                <div className="relative w-[88px] h-[88px] mb-3.5">
                  <svg className="absolute inset-0 w-[88px] h-[88px] -rotate-90" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r="40" stroke="rgba(226,232,240,0.8)" strokeWidth="3" fill="none" />
                    <circle
                      cx="44" cy="44" r="40"
                      stroke="url(#avatarRing)"
                      strokeWidth="3.5"
                      fill="none"
                      strokeDasharray={`${(profileCompletion / 100) * 251.3} 251.3`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="avatarRing" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-[7px] rounded-[20px] bg-gradient-to-br from-orange-500 via-indigo-600 to-violet-600 overflow-hidden flex items-center justify-center text-white text-2xl font-black shadow-[0_10px_25px_-8px_rgba(79,70,229,0.55)] border-[3px] border-white">
                    {profilePhoto
                      ? <img src={profilePhoto} alt={initials} className="w-full h-full object-cover" />
                      : initials}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-0.5 -left-0.5 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-orange-500 hover:bg-orange-50 transition-colors z-10"
                    title="Changer la photo"
                  >
                    <Camera className="w-3 h-3 text-orange-600" />
                  </button>
                  {profileCompletion === 100 ? (
                    <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center border-[3px] border-white shadow-lg shadow-emerald-500/40">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="absolute -bottom-0.5 -right-0.5 px-2 h-6 bg-white rounded-full flex items-center justify-center border-2 border-orange-600 shadow-lg shadow-orange-500/20">
                      <span className="text-[10px] font-black text-orange-700">{profileCompletion}%</span>
                    </div>
                  )}
                </div>

                {/* Name + email */}
                <div className="mb-3">
                  <p className="font-black text-slate-900 text-[15px] tracking-tight truncate leading-tight">
                    {customer?.first_name} {customer?.last_name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">{customer?.email}</p>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                  {customer?.customer_type && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-700 text-[10px] font-bold rounded-full border border-slate-200/70">
                      <CreditCard className="w-2.5 h-2.5" />
                      {customer.customer_type === 'entreprise'
                        ? 'Entreprise'
                        : customer.customer_type === 'professionnel'
                        ? 'Pro'
                        : 'Particulier'}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-full bg-gradient-to-r ${tierCfg.gradient} text-white shadow-md shadow-amber-500/25 uppercase tracking-wide`}>
                    {tierCfg.icon} {memberTier}
                  </span>
                </div>

                {/* Mini profile completion with gradient */}
                <div className="pt-3.5 border-t border-dashed border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Profil</span>
                    <span className={`text-[11px] font-black tabular-nums ${profileCompletion === 100 ? 'text-emerald-600' : 'text-orange-700'}`}>
                      {profileCompletion}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                        profileCompletion === 100
                          ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-orange-500 via-indigo-500 to-violet-500'
                      }`}
                      style={{ width: `${profileCompletion}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.07)] p-2 overflow-hidden">
              <nav className="space-y-0.5">
                {navItems.map((item) => {
                  const NavIcon = item.icon;
                  const isActive = tab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => switchTab(item.key)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-200 relative group ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-600 via-orange-600 to-indigo-600 text-white shadow-[0_4px_14px_-4px_rgba(37,99,235,0.5)]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/30 rounded-r-full" />
                      )}
                      {/* Icon container */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        isActive
                          ? 'bg-white/15'
                          : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}>
                        <NavIcon className={`w-4 h-4 ${
                          isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
                        }`} />
                      </div>
                      <span className="flex-1 text-left tracking-tight">{item.label}</span>
                      {item.count != null && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black min-w-[22px] text-center ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-orange-50 text-orange-700'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 bg-white border border-red-100/70 shadow-sm transition-all duration-200 group"
            >
              <div className="w-8 h-8 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              Déconnexion
            </button>
          </div>

          {/* ════ MAIN CONTENT ════ */}
          <div className="min-w-0">{renderContent()}</div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM TABS ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200/60 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const NavIcon = item.icon;
            const isActive = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => switchTab(item.key)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-0 transition-all duration-200 relative ${
                  isActive ? 'text-orange-700' : 'text-gray-400'
                }`}
              >
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-1 bg-gradient-to-r from-orange-500 to-orange-700 rounded-full" />
                )}
                <div
                  className={`p-1.5 rounded-lg transition-colors duration-200 ${
                    isActive ? 'bg-slate-50' : ''
                  }`}
                >
                  <NavIcon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[9px] font-bold truncate max-w-[60px] ${
                    isActive ? 'text-orange-700' : 'text-gray-400'
                  }`}
                >
                  {item.label.replace('Mes ', '').replace('Mon ', '')}
                </span>
                {item.count != null && item.count > 0 && (
                  <span className="absolute top-0.5 right-1 w-4 h-4 bg-orange-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {item.count > 9 ? '9+' : item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
