/**
 * ALLO BETON - CHECKOUT PRO (Modern Refonte)
 * Multi-step checkout: Adresse -> Paiement -> Confirmation
 * Payment methods: Wave, Orange Money, Carte Bancaire, Especes
 * Currency: FCFA, 18% TVA, free shipping at 500,000 FCFA
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight, MapPin, CreditCard, Check, ArrowRight, ArrowLeft,
  Phone, Shield, Package, AlertCircle, Lock, Smartphone, Banknote,
  Wifi, Eye, EyeOff, CheckCircle2, Clock, Zap, Truck, Headphones,
  Tag, Plus, X, Home, Star, Gift, BadgeCheck
} from 'lucide-react';
import { ordersAPI, paymentsAPI, customersAPI, Address } from '../../services/ecommerce-api';
import { useEcommerce } from '../../contexts/EcommerceContext';

type View = 'home' | 'catalog' | 'product' | 'cart' | 'checkout' | 'success' | 'login' | 'dashboard';

interface CheckoutProProps {
  onNavigate: (view: View, data?: any) => void;
}

type Step = 'address' | 'payment' | 'confirm';
type PaymentMethodType = 'wave' | 'orange_money' | 'free_money' | 'card' | 'cash';

/* ================================================================
   PAYMENT LOGOS — Vrais logos officiels
   ================================================================ */

const LOGO_URLS = {
  wave: '/logos/payments/wave.png',
  orange_money: '/logos/payments/orange-money.png',
  visa: '/logos/payments/visa.png',
  mastercard: '/logos/payments/mastercard.png',
};

const LogoImg: React.FC<{ src: string; alt: string; className?: string; fallbackBg?: string; fallbackText?: string }> = ({
  src, alt, className, fallbackBg = '#888', fallbackText = '?',
}) => {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <div className={`flex items-center justify-center rounded-xl text-white font-black text-sm ${className || ''}`}
        style={{ background: fallbackBg, width: 48, height: 48 }}>
        {fallbackText}
      </div>
    );
  }
  return (
    <img src={src} alt={alt} onError={() => setFailed(true)}
      className={`object-contain rounded-xl ${className || ''}`}
      style={{ width: 48, height: 48 }} loading="lazy" />
  );
};

const WaveLogo: React.FC<{ className?: string }> = ({ className }) => (
  <LogoImg src={LOGO_URLS.wave} alt="Wave" className={className}
    fallbackBg="#1DC3F0" fallbackText="W" />
);

const OrangeMoneyLogo: React.FC<{ className?: string }> = ({ className }) => (
  <LogoImg src={LOGO_URLS.orange_money} alt="Orange Money" className={className}
    fallbackBg="#FF6600" fallbackText="OM" />
);

const FreeMoneyLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center justify-center rounded-xl ${className || ''}`}
    style={{ background: 'linear-gradient(135deg, #E30613, #9B0D15)', width: 48, height: 48 }}>
    <span className="text-white font-black text-xs leading-none text-center">Free<br/>Money</span>
  </div>
);

const CardBrandsLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center justify-center gap-0.5 bg-white border border-gray-200 rounded-xl p-1 ${className || ''}`}
    style={{ width: 48, height: 48 }}>
    <img src={LOGO_URLS.visa} alt="Visa" className="h-5 object-contain" loading="lazy"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    <img src={LOGO_URLS.mastercard} alt="Mastercard" className="h-5 object-contain" loading="lazy"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
  </div>
);

const CashLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center justify-center rounded-xl ${className || ''}`}
    style={{ background: 'linear-gradient(135deg, #059669, #10B981)', width: 48, height: 48 }}>
    <Banknote className="w-6 h-6 text-white" />
  </div>
);

/* ================================================================
   SENEGAL REGIONS
   ================================================================ */
const SENEGAL_REGIONS = [
  'Dakar', 'Thies', 'Saint-Louis', 'Diourbel', 'Kaolack',
  'Ziguinchor', 'Fatick', 'Kolda', 'Tambacounda', 'Louga',
  'Matam', 'Kedougou', 'Sedhiou', 'Kaffrine', 'Autre',
];

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export const CheckoutPro: React.FC<CheckoutProProps> = ({ onNavigate }) => {
  const { cart, formatPrice, isAuthenticated, customer, refreshCart, applyCoupon, removeCoupon } = useEcommerce();

  /* ── Core state ── */
  const [step, setStep] = useState<Step>('address');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  /* ── Address state ── */
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    phone: customer?.phone || '',
    address_line1: '',
    address_line2: '',
    city: 'Dakar',
    region: 'Dakar',
    instructions: '',
  });

  /* ── Payment state ── */
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('wave');
  const [paymentPhone, setPaymentPhone] = useState(customer?.phone || '');

  /* ── Card fields ── */
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardName, setCardName] = useState('');
  const [showCVC, setShowCVC] = useState(false);

  /* ── Notes & coupon ── */
  const [notes, setNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState(false);

  /* ── Derived ── */
  const steps: { key: Step; label: string; icon: React.ElementType }[] = [
    { key: 'address', label: 'Livraison', icon: MapPin },
    { key: 'payment', label: 'Paiement', icon: CreditCard },
    { key: 'confirm', label: 'Confirmation', icon: Check },
  ];
  const currentStepIndex = steps.findIndex(s => s.key === step);
  const items = cart?.items || [];
  const progressPercent = ((currentStepIndex) / (steps.length - 1)) * 100;

  /* ================================================================
     EFFECTS
     ================================================================ */

  useEffect(() => {
    if (!isAuthenticated) {
      onNavigate('login');
      return;
    }
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================================================================
     API FUNCTIONS (all preserved from original)
     ================================================================ */

  const loadAddresses = async () => {
    try {
      const res = await customersAPI.getAddresses();
      const addrs = res?.data || res || [];
      setAddresses(addrs);
      const defaultAddr = addrs.find((a: Address) => a.is_default);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      else if (addrs.length > 0) setSelectedAddressId(addrs[0].id);
      else setShowNewAddress(true);
    } catch {
      setShowNewAddress(true);
    }
  };

  const handleSaveAddress = async () => {
    if (!newAddress.address_line1 || !newAddress.city) {
      setError('Veuillez remplir l\'adresse et la ville');
      return;
    }
    try {
      setLoading(true);
      const res = await customersAPI.addAddress({
        type: 'shipping',
        ...newAddress,
        is_default: addresses.length === 0,
      });
      const saved = res?.data || res;
      setAddresses(prev => [...prev, saved]);
      setSelectedAddressId(saved.id);
      setShowNewAddress(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement de l\'adresse');
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const getCardType = (num: string): string => {
    const d = num.replace(/\s/g, '');
    if (/^4/.test(d)) return 'visa';
    if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'mastercard';
    return '';
  };

  const isPaymentValid = useCallback((): boolean => {
    if (paymentMethod === 'wave' || paymentMethod === 'orange_money' || paymentMethod === 'free_money') {
      return paymentPhone.replace(/\D/g, '').length >= 9;
    }
    if (paymentMethod === 'card') {
      return cardNumber.replace(/\s/g, '').length === 16
        && cardExpiry.length === 5
        && cardCVC.length >= 3
        && cardName.length >= 2;
    }
    return true; // cash
  }, [paymentMethod, paymentPhone, cardNumber, cardExpiry, cardCVC, cardName]);

  const handlePlaceOrder = async () => {
    try {
      setProcessing(true);
      setLoading(true);
      setError('');

      const selectedAddr = addresses.find(a => a.id === selectedAddressId);

      // 1. Créer la commande
      const orderRes = await ordersAPI.create({
        shipping_address: selectedAddr || newAddress as any,
        customer_notes: notes || undefined,
        shipping_method: 'standard',
      });

      const order = orderRes?.data || orderRes;

      // 2. Initier le paiement via PayDunya
      try {
        const payPhone = ['wave', 'orange_money', 'free_money'].includes(paymentMethod)
          ? paymentPhone
          : undefined;

        const payRes = await paymentsAPI.initiate(order.id, paymentMethod, payPhone);
        const payData = payRes?.data;

        // Si PayDunya retourne une URL de checkout, rediriger le client
        if (payData?.checkout_url || payData?.redirect_url) {
          const redirectUrl = payData.checkout_url || payData.redirect_url;
          // Rediriger vers la page de paiement PayDunya
          window.location.href = redirectUrl;
          return; // on arrête ici, PayDunya gère le retour
        }
      } catch (payErr: any) {
        console.warn('Erreur initiation paiement:', payErr.message);
        // La commande est créée, on continue vers la page succès
      }

      // 3. Espèces ou simulation : rafraîchir et rediriger
      await refreshCart();
      setProcessing(false);
      onNavigate('success', {
        orderId: order.id,
        orderNumber: order.order_number,
        invoiceId: order.invoice?.id || null,
        invoiceNumber: order.invoice?.invoice_number || null
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation de la commande');
      setProcessing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponSuccess(false);
    try {
      const ok = await applyCoupon(couponCode.trim());
      if (ok) {
        setCouponSuccess(true);
        setTimeout(() => setCouponSuccess(false), 3000);
      }
    } catch {
      // error handled by context
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    await removeCoupon();
    setCouponCode('');
    setCouponSuccess(false);
  };

  const goToStep = (target: Step) => {
    setError('');
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ================================================================
     PAYMENT METHOD DEFINITIONS
     ================================================================ */

  const paymentMethods: {
    id: PaymentMethodType;
    name: string;
    desc: string;
    features: string[];
    Logo: React.FC<{ className?: string }>;
    color: string;
    lightBg: string;
    borderActive: string;
    badgeBg: string;
    badgeText: string;
  }[] = [
    {
      id: 'wave',
      name: 'Wave',
      desc: 'Paiement mobile instantane',
      features: ['Instantane', 'Sans frais', 'Securise'],
      Logo: WaveLogo,
      color: 'cyan',
      lightBg: 'bg-cyan-50/50',
      borderActive: 'border-cyan-400',
      badgeBg: 'bg-cyan-50',
      badgeText: 'text-cyan-700',
    },
    {
      id: 'orange_money',
      name: 'Orange Money',
      desc: 'Paiement mobile via Orange',
      features: ['USSD disponible', 'Partout au Senegal', 'SMS'],
      Logo: OrangeMoneyLogo,
      color: 'orange',
      lightBg: 'bg-slate-50/50',
      borderActive: 'border-orange-500',
      badgeBg: 'bg-orange-50',
      badgeText: 'text-orange-800',
    },
    {
      id: 'free_money',
      name: 'Free Money',
      desc: 'Paiement mobile Free',
      features: ['Instantane', 'Partout au Senegal', 'Sans frais'],
      Logo: FreeMoneyLogo,
      color: 'rose',
      lightBg: 'bg-rose-50/50',
      borderActive: 'border-rose-400',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700',
    },
    {
      id: 'card',
      name: 'Carte Bancaire',
      desc: 'Visa, Mastercard, CB',
      features: ['3D Secure', 'Visa & MC', 'Cryptage SSL'],
      Logo: CardBrandsLogo,
      color: 'indigo',
      lightBg: 'bg-indigo-50/50',
      borderActive: 'border-indigo-400',
      badgeBg: 'bg-indigo-50',
      badgeText: 'text-indigo-700',
    },
    {
      id: 'cash',
      name: 'Especes',
      desc: 'Paiement a la livraison',
      features: ['Simple', 'Sans compte', 'Pratique'],
      Logo: CashLogo,
      color: 'emerald',
      lightBg: 'bg-emerald-50/50',
      borderActive: 'border-emerald-400',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
    },
  ];

  const selectedPM = paymentMethods.find(p => p.id === paymentMethod)!;

  /* ================================================================
     PROCESSING OVERLAY
     ================================================================ */

  if (processing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl p-10 text-center max-w-md w-full">
          {/* Animated spinner */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-600 animate-spin" />
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center shadow-lg shadow-orange-600/30">
              {paymentMethod === 'wave' && <Wifi className="w-7 h-7 text-white" />}
              {paymentMethod === 'orange_money' && <Smartphone className="w-7 h-7 text-white" />}
              {paymentMethod === 'free_money' && <Smartphone className="w-7 h-7 text-white" />}
              {paymentMethod === 'card' && <CreditCard className="w-7 h-7 text-white" />}
              {paymentMethod === 'cash' && <Banknote className="w-7 h-7 text-white" />}
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Traitement en cours...</h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            {paymentMethod === 'wave' && 'Connexion au service Wave. Validez sur votre telephone.'}
            {paymentMethod === 'orange_money' && 'Connexion a Orange Money. Verifiez votre SMS.'}
            {paymentMethod === 'free_money' && 'Connexion a Free Money. Validez sur votre telephone.'}
            {paymentMethod === 'card' && 'Verification 3D Secure en cours...'}
            {paymentMethod === 'cash' && 'Enregistrement de votre commande...'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
          <p className="mt-6 text-xs text-gray-400">Ne fermez pas cette page</p>
        </div>
      </div>
    );
  }

  /* ================================================================
     RENDER: STEPPER HEADER
     ================================================================ */

  const renderStepper = () => (
    <div className="mb-10">
      {/* Progress bar background */}
      <div className="relative max-w-xl mx-auto">
        {/* Connector line */}
        <div className="absolute top-6 left-[10%] right-[10%] h-1 bg-gray-200 rounded-full" />
        <div
          className="absolute top-6 left-[10%] h-1 bg-gradient-to-r from-orange-600 to-orange-700 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progressPercent * 0.8}%` }}
        />

        {/* Step circles */}
        <div className="relative flex items-center justify-between">
          {steps.map((s, i) => {
            const isCompleted = i < currentStepIndex;
            const isCurrent = i === currentStepIndex;
            const isFuture = i > currentStepIndex;
            const StepIcon = s.icon;

            return (
              <button
                key={s.key}
                onClick={() => isCompleted && goToStep(s.key)}
                disabled={isFuture}
                className="flex flex-col items-center gap-2 group relative z-10"
              >
                {/* Circle */}
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500
                  ${isCompleted
                    ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30 scale-100'
                    : isCurrent
                    ? 'bg-gradient-to-br from-orange-600 to-orange-800 shadow-lg shadow-orange-600/30 scale-110 ring-4 ring-slate-100'
                    : 'bg-white border-2 border-gray-200 scale-100'
                  }
                `}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <StepIcon className={`w-5 h-5 ${isCurrent ? 'text-white' : 'text-gray-400'}`} />
                  )}
                </div>

                {/* Label */}
                <span className={`
                  text-xs font-bold tracking-wide transition-colors duration-300
                  ${isCompleted ? 'text-emerald-600' : isCurrent ? 'text-orange-700' : 'text-gray-400'}
                `}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ================================================================
     RENDER: ERROR BANNER
     ================================================================ */

  const renderError = () => error ? (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 max-w-5xl mx-auto animate-in">
      <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-4 h-4 text-red-500" />
      </div>
      <p className="text-sm text-red-700 flex-1">{error}</p>
      <button
        onClick={() => setError('')}
        className="w-7 h-7 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors"
      >
        <X className="w-3.5 h-3.5 text-red-500" />
      </button>
    </div>
  ) : null;

  /* ================================================================
     RENDER: STEP 1 - ADDRESS
     ================================================================ */

  const renderAddressStep = () => (
    <div className="space-y-6">
      {/* Section header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-gray-900">Adresse de livraison</h2>
            <p className="text-sm text-gray-400 mt-0.5">Livraison sur Dakar et regions du Senegal</p>
          </div>
          {addresses.length > 0 && (
            <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full">
              {addresses.length} adresse{addresses.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Saved addresses list */}
          {addresses.length > 0 && !showNewAddress && (
            <div className="space-y-3">
              {addresses.map((addr) => {
                const isSelected = selectedAddressId === addr.id;
                return (
                  <label
                    key={addr.id}
                    className={`
                      relative flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer
                      transition-all duration-300
                      ${isSelected
                        ? 'border-orange-500 bg-gradient-to-br from-slate-50/60 to-slate-50/30 shadow-md shadow-slate-100/50'
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-sm bg-white'
                      }
                    `}
                  >
                    {/* Radio indicator */}
                    <div className={`
                      w-6 h-6 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      transition-all duration-300
                      ${isSelected ? 'border-orange-600 bg-orange-600 scale-110' : 'border-gray-300 bg-white'}
                    `}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input
                      type="radio"
                      name="address"
                      checked={isSelected}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="hidden"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900">
                          {addr.first_name} {addr.last_name}
                        </p>
                        {addr.is_default && (
                          <span className="text-[10px] font-bold text-orange-700 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Par defaut
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{addr.address_line1}</p>
                      {addr.address_line2 && <p className="text-sm text-gray-500">{addr.address_line2}</p>}
                      <p className="text-sm text-gray-500">{addr.city}{addr.region ? `, ${addr.region}` : ''}</p>
                      {addr.phone && (
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> {addr.phone}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="w-7 h-7 bg-orange-600 rounded-full flex items-center justify-center shadow-md">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </label>
                );
              })}

              {/* Add new address button */}
              <button
                onClick={() => setShowNewAddress(true)}
                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-bold text-gray-400 hover:text-orange-700 hover:border-orange-300 hover:bg-slate-50/30 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter une nouvelle adresse
              </button>
            </div>
          )}

          {/* New address form */}
          {(showNewAddress || addresses.length === 0) && (
            <div className="space-y-5">
              {addresses.length > 0 && (
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <Home className="w-5 h-5 text-orange-600" />
                  <h3 className="font-bold text-gray-900">Nouvelle adresse</h3>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">
                    Prenom
                  </label>
                  <input
                    type="text"
                    value={newAddress.first_name}
                    onChange={(e) => setNewAddress(p => ({ ...p, first_name: e.target.value }))}
                    placeholder="Votre prenom"
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={newAddress.last_name}
                    onChange={(e) => setNewAddress(p => ({ ...p, last_name: e.target.value }))}
                    placeholder="Votre nom"
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">
                  Telephone
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <div className="w-6 h-4 rounded-sm overflow-hidden flex shadow-sm">
                      <div className="w-1/3 bg-green-600" />
                      <div className="w-1/3 bg-yellow-400" />
                      <div className="w-1/3 bg-red-500" />
                    </div>
                    <span className="text-xs font-medium text-gray-400">+221</span>
                  </div>
                  <input
                    type="tel"
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress(p => ({ ...p, phone: e.target.value }))}
                    placeholder="77 123 45 67"
                    className="w-full pl-24 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">
                  Adresse <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newAddress.address_line1}
                  onChange={(e) => setNewAddress(p => ({ ...p, address_line1: e.target.value }))}
                  placeholder="Numero, rue, quartier..."
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">
                  Complement
                </label>
                <input
                  type="text"
                  value={newAddress.address_line2}
                  onChange={(e) => setNewAddress(p => ({ ...p, address_line2: e.target.value }))}
                  placeholder="Batiment, etage, porte..."
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">
                    Ville <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress(p => ({ ...p, city: e.target.value }))}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">
                    Region
                  </label>
                  <select
                    value={newAddress.region}
                    onChange={(e) => setNewAddress(p => ({ ...p, region: e.target.value }))}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none appearance-none"
                  >
                    {SENEGAL_REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">
                  Instructions de livraison
                </label>
                <textarea
                  value={newAddress.instructions}
                  onChange={(e) => setNewAddress(p => ({ ...p, instructions: e.target.value }))}
                  rows={2}
                  placeholder="Point de repere, indications pour le livreur..."
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                {addresses.length > 0 && (
                  <button
                    onClick={() => setShowNewAddress(false)}
                    className="px-6 py-3 text-sm font-bold text-gray-600 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all"
                  >
                    Annuler
                  </button>
                )}
                <button
                  onClick={handleSaveAddress}
                  disabled={loading}
                  className="px-8 py-3 text-sm font-bold bg-gray-900 text-white rounded-2xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg shadow-gray-900/10"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer l\'adresse'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continue button */}
      {(selectedAddressId || !showNewAddress) && addresses.length > 0 && (
        <button
          onClick={() => goToStep('payment')}
          disabled={!selectedAddressId}
          className="w-full py-4.5 bg-gradient-to-r from-orange-600 to-orange-800 text-white font-black rounded-2xl shadow-xl shadow-orange-600/25 hover:shadow-orange-600/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-orange-600/25 flex items-center justify-center gap-3 text-base"
        >
          Continuer vers le paiement
          <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  /* ================================================================
     RENDER: STEP 2 - PAYMENT
     ================================================================ */

  const renderPaymentStep = () => (
    <div className="space-y-6">
      {/* Payment method selector card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Mode de paiement</h2>
              <p className="text-sm text-gray-400 mt-0.5">Choisissez votre methode preferee</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3.5 py-2 rounded-full font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Securise</span>
          </div>
        </div>

        {/* Payment method cards grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {paymentMethods.map((pm) => {
              const isActive = paymentMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => { setPaymentMethod(pm.id); setError(''); }}
                  className={`
                    relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2
                    transition-all duration-300 group
                    ${isActive
                      ? `${pm.borderActive} ${pm.lightBg} shadow-md scale-[1.02]`
                      : 'border-gray-100 hover:border-gray-200 hover:shadow-sm bg-white'
                    }
                  `}
                >
                  {/* Check badge */}
                  {isActive && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-orange-600 to-orange-800 rounded-full flex items-center justify-center shadow-lg animate-in">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <pm.Logo className="w-14 h-14" />
                  <div className="text-center">
                    <p className={`text-sm font-black ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                      {pm.name}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">{pm.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected method description card */}
          <div className={`rounded-2xl p-5 ${selectedPM.lightBg} border ${selectedPM.borderActive.replace('border-', 'border-')}/30`}>
            <div className="flex items-start gap-4">
              <selectedPM.Logo className="w-12 h-12 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-black text-gray-900">{selectedPM.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{selectedPM.desc}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedPM.features.map((f, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg ${selectedPM.badgeBg} ${selectedPM.badgeText}`}
                    >
                      <Zap className="w-2.5 h-2.5" />{f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── WAVE FORM ── */}
      {paymentMethod === 'wave' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-cyan-50/80 to-teal-50/40">
            <div className="flex items-center gap-3">
              <WaveLogo className="w-10 h-10" />
              <div>
                <h3 className="font-black text-gray-900">Payer avec Wave</h3>
                <p className="text-xs text-gray-500">Entrez votre numero Wave</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-2 block">Numero Wave</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="w-6 h-4 rounded-sm overflow-hidden flex shadow-sm">
                    <div className="w-1/3 bg-green-600" />
                    <div className="w-1/3 bg-yellow-400" />
                    <div className="w-1/3 bg-red-500" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">+221</span>
                </div>
                <input
                  type="tel"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  placeholder="77 123 45 67"
                  className="w-full pl-24 pr-4 py-4 border border-gray-200 rounded-2xl text-sm font-medium bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400 transition-all outline-none"
                />
              </div>
            </div>
            <div className="bg-cyan-50/60 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-cyan-800 flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Comment ca marche ?
              </p>
              <ol className="text-sm text-cyan-700 space-y-2 pl-5 list-decimal">
                <li>Vous recevrez une notification sur votre app Wave</li>
                <li>Confirmez le paiement avec votre code PIN</li>
                <li>Votre commande est validee instantanement !</li>
              </ol>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield className="w-4 h-4" />
              <span>Paiement securise -- Aucune information stockee</span>
            </div>
          </div>
        </div>
      )}

      {/* ── ORANGE MONEY FORM ── */}
      {paymentMethod === 'orange_money' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-slate-50/80 to-slate-50/40">
            <div className="flex items-center gap-3">
              <OrangeMoneyLogo className="w-10 h-10" />
              <div>
                <h3 className="font-black text-gray-900">Payer avec Orange Money</h3>
                <p className="text-xs text-gray-500">Paiement via application ou code USSD</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-2 block">Numero Orange Money</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="w-6 h-4 rounded-sm overflow-hidden flex shadow-sm">
                    <div className="w-1/3 bg-green-600" />
                    <div className="w-1/3 bg-yellow-400" />
                    <div className="w-1/3 bg-red-500" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">+221</span>
                </div>
                <input
                  type="tel"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  placeholder="77 123 45 67"
                  className="w-full pl-24 pr-4 py-4 border border-gray-200 rounded-2xl text-sm font-medium bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                />
              </div>
            </div>

            {/* USSD code */}
            <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-100/60">
              <p className="text-xs font-bold text-orange-900 mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Code USSD alternatif
              </p>
              <div className="bg-white rounded-xl p-4 text-center border border-slate-200/50 shadow-sm">
                <code className="text-lg font-black text-orange-700 tracking-wider">
                  #144*391*{formatPrice(cart?.total || 0).replace(/\s/g, '')}#
                </code>
              </div>
              <p className="text-xs text-orange-700/70 mt-3 text-center">
                Composez ce code depuis votre telephone Orange
              </p>
            </div>

            {/* Payment options */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50/40 rounded-2xl p-4 border border-slate-100/50 text-center">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Smartphone className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-xs font-bold text-gray-700">Application</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Validez dans l&apos;app</p>
              </div>
              <div className="bg-slate-50/40 rounded-2xl p-4 border border-slate-100/50 text-center">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Phone className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-xs font-bold text-gray-700">Code USSD</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Depuis votre mobile</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield className="w-4 h-4" />
              <span>Confirme par SMS -- Transaction Orange Money certifiee</span>
            </div>
          </div>
        </div>
      )}

      {/* ── FREE MONEY FORM ── */}
      {paymentMethod === 'free_money' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-rose-50/80 to-pink-50/40">
            <div className="flex items-center gap-3">
              <FreeMoneyLogo className="w-10 h-10" />
              <div>
                <h3 className="font-black text-gray-900">Payer avec Free Money</h3>
                <p className="text-xs text-gray-500">Paiement mobile instantane via Free</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-2 block">Numero Free Money</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="w-6 h-4 rounded-sm overflow-hidden flex shadow-sm">
                    <div className="w-1/3 bg-green-600" />
                    <div className="w-1/3 bg-yellow-400" />
                    <div className="w-1/3 bg-red-500" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">+221</span>
                </div>
                <input
                  type="tel"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  placeholder="76 123 45 67"
                  className="w-full pl-24 pr-4 py-4 border border-gray-200 rounded-2xl text-sm font-medium bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition-all outline-none"
                />
              </div>
            </div>
            <div className="bg-rose-50/60 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-bold text-rose-800 flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Comment ca marche ?
              </p>
              <ol className="text-sm text-rose-700 space-y-2 pl-5 list-decimal">
                <li>Vous recevrez une notification sur votre app Free Money</li>
                <li>Confirmez le paiement avec votre code PIN</li>
                <li>Votre commande est validee instantanement !</li>
              </ol>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield className="w-4 h-4" />
              <span>Paiement securise -- Aucune information stockee</span>
            </div>
          </div>
        </div>
      )}

      {/* ── CARD FORM ── */}
      {paymentMethod === 'card' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-slate-50/80 to-indigo-50/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardBrandsLogo className="w-10 h-10" />
                <div>
                  <h3 className="font-black text-gray-900">Payer par Carte Bancaire</h3>
                  <p className="text-xs text-gray-500">Visa, Mastercard -- Paiement securise 3D Secure</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="w-10 h-6 bg-gradient-to-r from-orange-700 to-orange-900 rounded-md text-white flex items-center justify-center text-[8px] font-black">VISA</div>
                <div className="w-10 h-6 bg-gradient-to-r from-red-500 to-orange-600 rounded-md flex items-center justify-center">
                  <div className="flex -space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-600 opacity-80" />
                    <div className="w-3 h-3 rounded-full bg-orange-500 opacity-80" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Card visual preview */}
            <div className="relative w-full max-w-sm mx-auto h-52 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 shadow-2xl p-6 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="flex justify-between items-start relative">
                <div className="w-12 h-8 rounded-lg bg-gradient-to-br from-orange-300 to-orange-600 flex items-center justify-center shadow-md">
                  <div className="w-7 h-5 rounded-sm border border-orange-700/40" />
                </div>
                <div className="text-right">
                  {getCardType(cardNumber) === 'visa' && <span className="text-xl font-black tracking-wide opacity-80">VISA</span>}
                  {getCardType(cardNumber) === 'mastercard' && (
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-red-500 opacity-80" />
                      <div className="w-6 h-6 rounded-full bg-orange-500 opacity-80" />
                    </div>
                  )}
                  {!getCardType(cardNumber) && <Wifi className="w-6 h-6 opacity-40 rotate-90" />}
                </div>
              </div>
              <p className="mt-6 text-xl tracking-[0.25em] font-mono opacity-90">
                {cardNumber || '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022'}
              </p>
              <div className="mt-4 flex justify-between items-end">
                <div>
                  <p className="text-[9px] uppercase tracking-wider opacity-50">Titulaire</p>
                  <p className="text-sm font-bold tracking-wide opacity-90">{cardName || 'NOM PRENOM'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider opacity-50">Expire</p>
                  <p className="text-sm font-bold opacity-90">{cardExpiry || 'MM/AA'}</p>
                </div>
              </div>
            </div>

            {/* Card form fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-2 block">Numero de carte</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full pl-12 pr-14 py-4 border border-gray-200 rounded-2xl text-sm font-mono tracking-wider bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition-all outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {getCardType(cardNumber) === 'visa' && (
                      <div className="w-10 h-6 bg-gradient-to-r from-orange-700 to-orange-900 rounded-md text-white flex items-center justify-center text-[8px] font-black">VISA</div>
                    )}
                    {getCardType(cardNumber) === 'mastercard' && (
                      <div className="flex -space-x-1">
                        <div className="w-5 h-5 rounded-full bg-red-500 opacity-80" />
                        <div className="w-5 h-5 rounded-full bg-orange-500 opacity-80" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-2 block">Nom sur la carte</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="NOM PRENOM"
                  className="w-full px-4 py-4 border border-gray-200 rounded-2xl text-sm font-bold tracking-wide bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition-all uppercase outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">Expiration</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/AA"
                      maxLength={5}
                      className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-2xl text-sm font-mono bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition-all outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">CVV</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showCVC ? 'text' : 'password'}
                      value={cardCVC}
                      onChange={(e) => setCardCVC(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder={'\u2022\u2022\u2022'}
                      maxLength={4}
                      className="w-full pl-11 pr-11 py-4 border border-gray-200 rounded-2xl text-sm font-mono bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCVC(!showCVC)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showCVC ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100/50">
              <Lock className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                Paiement crypte SSL 256 bits -- Vos donnees bancaires ne sont jamais stockees sur nos serveurs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CASH FORM ── */}
      {paymentMethod === 'cash' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50/80 to-green-50/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
                <Banknote className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-gray-900">Paiement a la livraison</h3>
                <p className="text-xs text-gray-500">Payez en especes lors de la reception</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="bg-emerald-50/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Montant a preparer</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">{formatPrice(cart?.total || 0)}</p>
                </div>
              </div>
              <hr className="border-emerald-200/50" />
              <ul className="space-y-3">
                {[
                  'Preparez le montant exact si possible',
                  'Le livreur peut rendre la monnaie',
                  'Un recu vous sera remis a la livraison',
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-emerald-700">
                    <div className="w-5 h-5 bg-emerald-200/50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-50/60 rounded-2xl p-4 flex items-start gap-3 border border-slate-100/60">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-800 leading-relaxed">
                La commande sera confirmee une fois le paiement recu par notre livreur.
                Delai de livraison : 24-72h selon votre zone.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes & navigation ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">
            Notes pour la commande (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Instructions speciales pour la livraison ou la commande..."
            className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none outline-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => goToStep('address')}
            className="px-6 py-4 text-sm font-bold text-gray-600 border border-gray-200 rounded-2xl hover:bg-gray-50 flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <button
            onClick={() => {
              if (isPaymentValid()) {
                goToStep('confirm');
              } else {
                setError('Veuillez remplir tous les champs de paiement');
              }
            }}
            disabled={!isPaymentValid()}
            className="flex-1 py-4 bg-gradient-to-r from-orange-600 to-orange-800 text-white font-black rounded-2xl shadow-xl shadow-orange-600/25 hover:shadow-orange-600/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-orange-600/25 flex items-center justify-center gap-2"
          >
            Verifier la commande <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  /* ================================================================
     RENDER: STEP 3 - CONFIRMATION
     ================================================================ */

  const renderConfirmStep = () => {
    const selectedAddr = addresses.find(a => a.id === selectedAddressId);

    return (
      <div className="space-y-5">
        {/* Confirmation title card */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-50/60 rounded-2xl p-6 border border-slate-100/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20">
              <BadgeCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Verification de la commande</h2>
              <p className="text-sm text-gray-500 mt-0.5">Relisez et confirmez votre commande</p>
            </div>
          </div>
        </div>

        {/* Address summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-teal-500" />
              </div>
              Adresse de livraison
            </h3>
            <button
              onClick={() => goToStep('address')}
              className="text-xs font-bold text-orange-700 hover:text-orange-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all"
            >
              Modifier
            </button>
          </div>
          {selectedAddr && (
            <div className="ml-12 text-sm text-gray-600 space-y-0.5">
              <p className="font-bold text-gray-900 text-base">{selectedAddr.first_name} {selectedAddr.last_name}</p>
              <p>{selectedAddr.address_line1}</p>
              {selectedAddr.address_line2 && <p>{selectedAddr.address_line2}</p>}
              <p>{selectedAddr.city}{selectedAddr.region ? `, ${selectedAddr.region}` : ''}</p>
              {selectedAddr.phone && (
                <p className="text-gray-400 mt-2 flex items-center gap-1.5 text-xs">
                  <Phone className="w-3.5 h-3.5" /> {selectedAddr.phone}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Payment summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-orange-600" />
              </div>
              Mode de paiement
            </h3>
            <button
              onClick={() => goToStep('payment')}
              className="text-xs font-bold text-orange-700 hover:text-orange-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all"
            >
              Modifier
            </button>
          </div>
          <div className="ml-12 flex items-center gap-4">
            <selectedPM.Logo className="w-12 h-12" />
            <div>
              <p className="font-bold text-gray-900">{selectedPM.name}</p>
              <p className="text-sm text-gray-500">
                {(paymentMethod === 'wave' || paymentMethod === 'orange_money' || paymentMethod === 'free_money') && paymentPhone && paymentPhone}
                {paymentMethod === 'card' && cardNumber && `\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${cardNumber.slice(-4)}`}
                {paymentMethod === 'cash' && 'Paiement a la reception'}
              </p>
            </div>
          </div>
        </div>

        {/* Items summary with images */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-black text-gray-900 flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-teal-500" />
              </div>
              Articles ({cart?.item_count || 0})
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-5 hover:bg-gray-50/50 transition-colors">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 line-clamp-1">{item.name}</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {item.quantity} {item.unit || 'x'} &times; {formatPrice(item.unit_price)}
                  </p>
                </div>
                <p className="text-base font-black text-gray-900">{formatPrice(item.total_price)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coupon section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
              <Tag className="w-5 h-5 text-violet-500" />
            </div>
            <h3 className="font-black text-gray-900">Code promo</h3>
          </div>
          {cart?.coupon_code ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/50">
              <Gift className="w-5 h-5 text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-700">
                  Code &quot;{cart.coupon_code}&quot; applique
                </p>
                <p className="text-xs text-emerald-600">-{formatPrice(cart.discount_amount)}</p>
              </div>
              <button
                onClick={handleRemoveCoupon}
                className="text-emerald-500 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Entrez votre code promo"
                className="flex-1 px-4 py-3.5 border border-gray-200 rounded-2xl text-sm font-bold bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 transition-all uppercase outline-none"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="px-6 py-3.5 bg-gray-900 text-white text-sm font-bold rounded-2xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg shadow-gray-900/10"
              >
                {couponLoading ? '...' : 'Appliquer'}
              </button>
            </div>
          )}
          {couponSuccess && (
            <p className="mt-3 text-sm text-emerald-600 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Code promo applique avec succes !
            </p>
          )}
        </div>

        {/* Total breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h3 className="font-black text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-orange-600" />
            </div>
            Resume de la commande
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Sous-total HT</span>
              <span className="font-bold">{formatPrice(cart?.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">TVA (18%)</span>
              <span className="font-bold">{formatPrice(cart?.tax_amount || 0)}</span>
            </div>
            {(cart?.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Reduction
                </span>
                <span className="font-bold">-{formatPrice(cart!.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Livraison</span>
              <span className="font-bold">
                {(cart?.shipping_cost || 0) > 0
                  ? formatPrice(cart!.shipping_cost)
                  : <span className="text-emerald-600">Gratuite</span>
                }
              </span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
              <span className="text-lg font-black text-gray-900">Total TTC</span>
              <span className="text-2xl font-black bg-gradient-to-r from-orange-700 to-orange-700 bg-clip-text text-transparent">
                {formatPrice(cart?.total || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => goToStep('payment')}
            className="px-6 py-4 text-sm font-bold text-gray-600 border border-gray-200 rounded-2xl hover:bg-gray-50 flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="flex-1 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-emerald-500/30 flex items-center justify-center gap-3 text-lg"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="w-6 h-6" />
                Confirmer et payer
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  /* ================================================================
     RENDER: ORDER SUMMARY SIDEBAR
     ================================================================ */

  const renderSidebar = () => (
    <div className="lg:col-span-1">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-24 overflow-hidden">
        {/* Sidebar header */}
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Votre commande
          </h2>
        </div>

        {/* Items preview */}
        <div className="p-5 space-y-3">
          {items.slice(0, 4).map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-4 h-4 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 line-clamp-1 text-sm">{item.name}</p>
                <p className="text-xs text-gray-400">&times;{item.quantity}</p>
              </div>
              <span className="font-black text-sm">{formatPrice(item.total_price)}</span>
            </div>
          ))}
          {items.length > 4 && (
            <p className="text-xs text-center text-gray-400 font-bold py-1">
              + {items.length - 4} autre{items.length > 5 ? 's' : ''} article{items.length > 5 ? 's' : ''}
            </p>
          )}

          {/* Price breakdown */}
          <div className="border-t border-gray-100 pt-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sous-total HT</span>
              <span className="font-bold">{formatPrice(cart?.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">TVA (18%)</span>
              <span className="font-bold">{formatPrice(cart?.tax_amount || 0)}</span>
            </div>
            {(cart?.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Reduction</span>
                <span className="font-bold">-{formatPrice(cart!.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Livraison</span>
              <span className="font-bold">
                {(cart?.shipping_cost || 0) > 0
                  ? formatPrice(cart!.shipping_cost)
                  : <span className="text-emerald-600 font-black">Gratuite</span>
                }
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
              <span className="font-black text-gray-900">Total TTC</span>
              <span className="text-xl font-black bg-gradient-to-r from-orange-700 to-orange-700 bg-clip-text text-transparent">
                {formatPrice(cart?.total || 0)}
              </span>
            </div>
          </div>

          {/* Free shipping progress */}
          {(cart?.free_shipping_remaining || 0) > 0 && (
            <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100/50">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-orange-600" />
                <p className="text-xs font-bold text-orange-800">Livraison gratuite</p>
              </div>
              <div className="w-full bg-slate-200/40 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-600 to-orange-700 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((500000 - (cart?.free_shipping_remaining || 0)) / 500000) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-orange-700 mt-1.5 font-bold">
                Plus que {formatPrice(cart?.free_shipping_remaining || 0)} pour la livraison gratuite
              </p>
            </div>
          )}

          {/* Trust badges */}
          <div className="pt-4 space-y-2.5">
            <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-xl">
              <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-[11px] font-bold text-emerald-700">Paiement 100% securise</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50/60 rounded-xl">
              <Truck className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-[11px] font-bold text-orange-700">Livraison 24-72h Dakar & regions</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-violet-50/60 rounded-xl">
              <Headphones className="w-4 h-4 text-violet-500 flex-shrink-0" />
              <p className="text-[11px] font-bold text-violet-700">Support client 7j/7</p>
            </div>
          </div>

          {/* Payment logos */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-center gap-3 py-2">
              <WaveLogo className="w-8 h-8 opacity-60 hover:opacity-100 transition-opacity" />
              <OrangeMoneyLogo className="w-8 h-8 opacity-60 hover:opacity-100 transition-opacity" />
              <CardBrandsLogo className="w-8 h-8 opacity-60 hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-[10px] text-center text-gray-400 font-medium">
              Wave - Orange Money - Visa - Mastercard
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  /* ================================================================
     MAIN RENDER
     ================================================================ */

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <button onClick={() => onNavigate('home')} className="hover:text-orange-700 transition-colors font-medium">
            Accueil
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <button onClick={() => onNavigate('cart')} className="hover:text-orange-700 transition-colors font-medium">
            Panier
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 font-bold">Commande</span>
        </nav>

        {/* Stepper */}
        {renderStepper()}

        {/* Error banner */}
        {renderError()}

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Step content */}
          <div className="lg:col-span-2">
            {step === 'address' && renderAddressStep()}
            {step === 'payment' && renderPaymentStep()}
            {step === 'confirm' && renderConfirmStep()}
          </div>

          {/* Sidebar */}
          {renderSidebar()}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPro;
