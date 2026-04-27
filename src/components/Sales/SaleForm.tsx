import React, { useState, useEffect, useMemo } from 'react';
import {
  X, ShoppingCart, User, Search, Receipt, AlertCircle, CheckCircle, Truck,
  Package, Plus, Minus, Trash2, Wallet, Banknote, Phone, Store, Globe
} from 'lucide-react';
import { Product, Customer } from '../../types';
import { salesAPI, productsAPI, customersAPI } from '../../services/mysql-api';

interface SaleFormProps {
  onClose: () => void;
  onSave: (saleData: any) => void;
}

interface CartItem {
  id: string;
  productId: string | null;
  productName: string;
  productType: string;
  variant: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

const PRODUCT_TYPES = [
  { value: 'beton', label: 'Béton', color: 'bg-emerald-600' },
  { value: 'carriere', label: 'Carrière', color: 'bg-amber-600' },
  { value: 'autre', label: 'Autre Produit', color: 'bg-orange-600' },
];

// Variantes par défaut (seront chargées depuis l'API)
const VARIANTS: Record<string, string[]> = {
  beton: ['3/8', '8/16'],
  carriere: ['Gravier 5/15', 'Gravier 15/25', 'Sable fin', 'Sable grossier', 'Tout-venant', 'Latérite', 'Basalte'],
};

// Prix par défaut (seront chargés depuis l'API)
const DEFAULT_PRICES: Record<string, number> = {
  'beton_3/8': 70000,
  'beton_8/16': 65000,
  'carriere_Gravier 5/15': 15000,
  'carriere_Gravier 15/25': 14000,
  'carriere_Sable fin': 12000,
  'carriere_Sable grossier': 11000,
  'carriere_Tout-venant': 10000,
  'carriere_Latérite': 8000,
  'carriere_Basalte': 20000,
};

export const SaleForm: React.FC<SaleFormProps> = ({ onClose, onSave }) => {
  // Source (canal de vente)
  const [saleSource, setSaleSource] = useState<'counter' | 'phone'>('counter');

  // Client state
  const [clientType, setClientType] = useState<'simple' | 'quotataire'>('simple');
  const [clientName, setClientName] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchCustomer, setSearchCustomer] = useState('');

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productVariants, setProductVariants] = useState<Record<string, string[]>>(VARIANTS);
  const [apiPrices, setApiPrices] = useState<Record<string, number>>(DEFAULT_PRICES);
  const [selectedProductType, setSelectedProductType] = useState<string>('beton');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [basePrice, setBasePrice] = useState<number>(0);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Other state
  const [camion, setCamion] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // TVA state
  const [taxOption, setTaxOption] = useState<'18' | '0' | 'custom'>('18');
  const [customTaxRate, setCustomTaxRate] = useState<string>('18');

  // Discount state (for quotataire/revendeur)
  const [discountPercent, setDiscountPercent] = useState<string>('0');

  // New carrière type modal
  const [showNewCarriereModal, setShowNewCarriereModal] = useState(false);
  const [newCarriereName, setNewCarriereName] = useState('');
  const [newCarrierePrice, setNewCarrierePrice] = useState('');

  useEffect(() => {
    loadProducts();
    loadProductTypes();
    if (clientType === 'quotataire') {
      loadCustomers();
    }
  }, [clientType]);

  useEffect(() => {
    // Update default price when variant changes
    if (selectedProductType !== 'autre' && selectedVariant) {
      const key = `${selectedProductType}_${selectedVariant}`;
      const defaultPrice = apiPrices[key] || DEFAULT_PRICES[key] || 0;
      setBasePrice(defaultPrice);
      setUnitPrice(defaultPrice.toString());
    }
  }, [selectedProductType, selectedVariant, apiPrices]);

  const loadProducts = async () => {
    try {
      const result = await productsAPI.getAll();
      if (result.success) setProducts(result.data || []);
    } catch (e) { console.error('Erreur produits:', e); }
  };

  const loadProductTypes = async () => {
    try {
      const result = await productsAPI.getTypes();
      if (result.success && result.data) {
        if (result.data.variants) setProductVariants(result.data.variants);
        if (result.data.defaultPrices) setApiPrices(result.data.defaultPrices);
      }
    } catch (e) { console.error('Erreur types:', e); }
  };

  const loadCustomers = async () => {
    try {
      const result = await customersAPI.getAll();
      if (result.success) {
        // Filter only quotataire customers
        const quotataireCustomers = (result.data || []).filter(
          (c: any) => c.customerType === 'quotataire' || c.customer_type === 'quotataire'
        );
        setCustomers(quotataireCustomers);
      }
    } catch (e) { console.error('Erreur clients:', e); }
  };

  // Add new carrière type
  const handleAddCarriereType = async () => {
    if (!newCarriereName.trim() || !newCarrierePrice) return;
    try {
      const result = await productsAPI.addCarriereType(newCarriereName.trim(), parseFloat(newCarrierePrice));
      if (result.success) {
        // Reload product types to get the new variant
        await loadProductTypes();
        setShowNewCarriereModal(false);
        setNewCarriereName('');
        setNewCarrierePrice('');
        setSelectedVariant(newCarriereName.trim());
      } else {
        setFormError(result.error || 'Échec de la création du produit');
      }
    } catch (e: any) {
      setFormError(e?.message || 'Erreur');
    }
  };

  // Apply discount to price
  const applyDiscount = (discount: string) => {
    setDiscountPercent(discount);
    const discountVal = parseFloat(discount) || 0;
    if (basePrice > 0 && discountVal >= 0 && discountVal <= 100) {
      const discountedPrice = basePrice * (1 - discountVal / 100);
      setUnitPrice(Math.round(discountedPrice).toString());
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchCustomer) return customers;
    const s = searchCustomer.toLowerCase();
    return customers.filter((c: any) =>
      c.name?.toLowerCase().includes(s) || c.company?.toLowerCase().includes(s)
    );
  }, [customers, searchCustomer]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Get prepaid balance from selected customer
  const prepaidBalance = useMemo(() => {
    if (!selectedCustomer) return 0;
    return Number((selectedCustomer as any).prepaidBalance ?? (selectedCustomer as any).prepaid_balance ?? 0);
  }, [selectedCustomer]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => (p as any).productType === 'autre' || !(p as any).productType);
  }, [products]);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Cart calculations
  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  const effectiveTaxRate = useMemo(() => {
    if (taxOption === '0') return 0;
    if (taxOption === 'custom') return parseFloat(customTaxRate) || 0;
    return 18;
  }, [taxOption, customTaxRate]);

  const taxAmount = useMemo(() => cartTotal * (effectiveTaxRate / 100), [cartTotal, effectiveTaxRate]);
  const cartTotalTTC = useMemo(() => cartTotal + taxAmount, [cartTotal, taxAmount]);

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // Info si le solde prépayé est insuffisant (mais on permet la vente, le reste ira en dette)
  const balanceInsufficient = clientType === 'quotataire' && selectedCustomer && cartTotalTTC > prepaidBalance;
  const amountToDebt = balanceInsufficient ? cartTotalTTC - prepaidBalance : 0;

  const displayClientName = clientType === 'simple' ? clientName.trim() : ((selectedCustomer as any)?.name || '');

  // Add item to cart
  const addToCart = () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    if (qty <= 0) return;

    let itemName = '';
    let prodId: string | null = null;
    let variant: string | null = null;

    if (selectedProductType === 'autre') {
      if (!selectedProductId || !selectedProduct) return;
      itemName = selectedProduct.name;
      prodId = selectedProductId;
    } else {
      if (!selectedVariant) return;
      itemName = `${selectedProductType === 'beton' ? 'Béton' : 'Carrière'} ${selectedVariant}`;
      variant = selectedVariant;
    }

    const newItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      productId: prodId,
      productName: itemName,
      productType: selectedProductType,
      variant,
      quantity: qty,
      unitPrice: price,
      total: qty * price,
    };

    setCartItems(prev => [...prev, newItem]);
    setQuantity('1');
    setSelectedVariant('');
    setSelectedProductId('');
    setUnitPrice('');
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const updateCartItemQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newQty = Math.max(0.5, item.quantity + delta);
      return { ...item, quantity: newQty, total: newQty * item.unitPrice };
    }));
  };

  // Validation
  const isValid = cartItems.length > 0 &&
    (clientType === 'simple' ? clientName.trim().length > 0 : selectedCustomerId !== '');

  const canAddToCart = () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    if (qty <= 0) return false;
    if (price <= 0) return false;
    if (selectedProductType === 'autre') return !!selectedProductId;
    return !!selectedVariant;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      // Build items array for API
      const items = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.unitPrice,
        productName: item.productName,
        productType: item.productType,
        variant: item.variant,
      }));

      const saleData = {
        customerId: clientType === 'quotataire' ? selectedCustomerId : null,
        client_name: clientType === 'simple' ? clientName.trim() : null,
        sale_type: clientType === 'quotataire' ? 'quotataire' : 'cash',
        source: saleSource,
        camion: camion.trim() || null,
        type_beton: cartItems.find(i => i.productType === 'beton')?.variant || null,
        items,
        notes: notes || null,
        tax_rate: effectiveTaxRate,
        // Ajouter info sur la dette si solde insuffisant
        amount_to_debt: amountToDebt > 0 ? amountToDebt : undefined,
      };

      const result = await salesAPI.create(saleData);
      if (result.success) {
        // Le backend gère atomiquement: déduction solde prépayé, ajout dette, paiement auto
        onSave(result.data);
        onClose();
      } else {
        setFormError(result.error || 'Échec de la création');
      }
    } catch (error: any) {
      setFormError(error?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' F';

  const inputClass = "w-full px-3.5 py-2.5 border border-gray-200/80 rounded-xl text-sm text-gray-800 bg-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 focus:border-emerald-300 hover:border-gray-300 transition-all shadow-sm shadow-gray-100/50";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200/40">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Nouvelle Vente</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Béton, Carrière ou autres produits</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left Panel - Form */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Error banner */}
            {formError && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{formError}</p>
                <button onClick={() => setFormError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Canal de Vente (Source) */}
            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 rounded-xl border border-amber-200/40 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Canal de Vente</h3>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSaleSource('counter')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${saleSource === 'counter' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/30' : 'bg-white/80 border border-gray-200/60 text-gray-600 hover:border-gray-300'}`}>
                  <Store className="w-4 h-4" /> Comptoir
                </button>
                <button type="button" onClick={() => setSaleSource('phone')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${saleSource === 'phone' ? 'bg-gradient-to-r from-sky-500 to-orange-500 text-white shadow-md shadow-sky-200/30' : 'bg-white/80 border border-gray-200/60 text-gray-600 hover:border-gray-300'}`}>
                  <Phone className="w-4 h-4" /> Téléphone
                </button>
              </div>
            </div>

            {/* Client Section */}
            <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/30 rounded-xl border border-indigo-200/40 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Client</h3>
              </div>

              <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => { setClientType('simple'); setSelectedCustomerId(''); }}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${clientType === 'simple' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/30' : 'bg-white/80 border border-gray-200/60 text-gray-600 hover:border-gray-300'}`}>
                  Client Simple
                </button>
                <button type="button" onClick={() => { setClientType('quotataire'); setClientName(''); }}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${clientType === 'quotataire' ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-200/30' : 'bg-white/80 border border-gray-200/60 text-gray-600 hover:border-gray-300'}`}>
                  Client Quotataire
                </button>
              </div>

              {clientType === 'simple' && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nom du Client</label>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: MODA FALL" className={inputClass} />
                </div>
              )}

              {clientType === 'quotataire' && (
                <div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={searchCustomer} onChange={(e) => setSearchCustomer(e.target.value)}
                      placeholder="Rechercher un client quotataire..." className={`${inputClass} pl-10`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {filteredCustomers.map((c: any) => {
                      const balance = Number(c.prepaidBalance ?? c.prepaid_balance ?? 0);
                      const hasBalance = balance > 0;
                      return (
                        <button key={c.id} type="button" onClick={() => setSelectedCustomerId(c.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${selectedCustomerId === c.id ? 'border-violet-400 bg-violet-50/60 shadow-sm' : 'border-gray-200/60 bg-white/70 hover:border-violet-300'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900 text-xs truncate">{c.name}</p>
                            {selectedCustomerId === c.id && <CheckCircle className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-xs">
                              <Banknote className="w-3 h-3 text-violet-500" />
                              <span className={hasBalance ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                                {formatCurrency(balance)}
                              </span>
                            </span>
                            {!hasBalance && (
                              <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full font-bold border border-red-100/60">Épuisé</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {filteredCustomers.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">Aucun client quotataire trouvé</p>
                  )}
                </div>
              )}
            </div>

            {/* Add Product Section */}
            <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 rounded-xl border border-emerald-200/40 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Ajouter un Produit</h3>
              </div>

              {/* Product Type Selection */}
              <div className="flex gap-2 mb-4">
                {PRODUCT_TYPES.map(type => (
                  <button key={type.value} type="button" onClick={() => { setSelectedProductType(type.value); setSelectedVariant(''); setSelectedProductId(''); setUnitPrice(''); }}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedProductType === type.value ? `${type.color} text-white shadow-md` : 'bg-white/80 border border-gray-200/60 text-gray-600 hover:border-gray-300'}`}>
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Variant Selection for Béton/Carrière */}
              {selectedProductType !== 'autre' && (
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Type de {selectedProductType === 'beton' ? 'Béton' : 'Carrière'} *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(productVariants[selectedProductType] || []).map((v: string) => (
                      <button key={v} type="button" onClick={() => setSelectedVariant(v)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${selectedVariant === v ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/30' : 'bg-white/80 border border-gray-200/60 text-gray-600 hover:border-emerald-300'}`}>
                        {v}
                      </button>
                    ))}
                    {selectedProductType === 'carriere' && (
                      <button type="button" onClick={() => setShowNewCarriereModal(true)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 hover:bg-amber-100/60 flex items-center gap-1 transition-all">
                        <Plus className="w-3 h-3" /> Ajouter
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Product Selection for Autre */}
              {selectedProductType === 'autre' && (
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Produit *</label>
                  <select value={selectedProductId} onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const prod = products.find(p => p.id === e.target.value);
                    if (prod) setUnitPrice((prod.selling_price || (prod as any).price || 0).toString());
                  }} className={inputClass}>
                    <option value="">Sélectionner un produit...</option>
                    {filteredProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.selling_price || (p as any).price || 0)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity and Price */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Quantité *</label>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1" min="0.5" step="0.5" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Prix Unitaire (FCFA) *</label>
                  <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0" min="0" className={inputClass} />
                </div>
              </div>

              {/* Discount section for quotataire/revendeur */}
              {clientType === 'quotataire' && basePrice > 0 && (
                <div className="mb-4 p-3 bg-violet-50/60 border border-violet-200/40 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-violet-700">Prix de base: {formatCurrency(basePrice)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-violet-600 font-medium">Remise (%):</label>
                    <input type="number" value={discountPercent} onChange={(e) => applyDiscount(e.target.value)}
                      min="0" max="100" step="1" className="w-20 px-2 py-1.5 border border-violet-200/60 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-400/25 bg-white shadow-sm" />
                    <div className="flex gap-1 ml-2">
                      {[5, 10, 15].map(d => (
                        <button key={d} type="button" onClick={() => applyDiscount(d.toString())}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${discountPercent === d.toString() ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm' : 'bg-white border border-violet-200/60 text-violet-600 hover:bg-violet-50'}`}>
                          {d}%
                        </button>
                      ))}
                    </div>
                  </div>
                  {parseFloat(discountPercent) > 0 && (
                    <p className="text-xs text-violet-600 mt-2">
                      Prix après remise: <span className="font-bold">{formatCurrency(parseFloat(unitPrice) || 0)}</span>
                      <span className="text-violet-400 ml-2">(économie: {formatCurrency(basePrice - (parseFloat(unitPrice) || 0))})</span>
                    </p>
                  )}
                </div>
              )}

              {/* Add Button */}
              <button type="button" onClick={addToCart} disabled={!canAddToCart()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/30">
                <Plus className="w-4 h-4" /> Ajouter au panier
              </button>
            </div>

            {/* Camion / Notes / TVA */}
            <div className="bg-gradient-to-br from-sky-50/50 to-orange-50/30 rounded-xl border border-sky-200/40 p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-4 h-4 text-sky-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Transport, TVA & Notes</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Camion</label>
                  <div className="relative">
                    <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={camion} onChange={(e) => setCamion(e.target.value)}
                      placeholder="Ex: AA 976" className={`${inputClass} pl-10`} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Remarques..." className={inputClass} />
                </div>
              </div>
              {/* TVA Section */}
              <div className="mt-3 pt-3 border-t border-sky-200/40">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Taux de TVA</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { value: '18' as const, label: '18% (standard)' },
                    { value: '0' as const, label: '0% (exonéré)' },
                    { value: 'custom' as const, label: 'Personnalisé' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => { setTaxOption(opt.value); if (opt.value !== 'custom') setCustomTaxRate(opt.value); }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        taxOption === opt.value ? 'bg-gradient-to-r from-sky-500 to-orange-500 text-white shadow-md' : 'bg-white border border-gray-200/60 text-gray-600 hover:border-sky-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                  {taxOption === 'custom' && (
                    <div className="flex items-center gap-1.5">
                      <input type="number" value={customTaxRate} onChange={(e) => setCustomTaxRate(e.target.value)}
                        min="0" max="100" step="0.5" className="w-20 px-2.5 py-2 border border-sky-200/60 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-sky-400/25 bg-white shadow-sm" />
                      <span className="text-xs text-gray-500 font-medium">%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {balanceInsufficient && (
              <div className="bg-gradient-to-br from-amber-50/60 to-yellow-50/30 border border-amber-200/50 rounded-xl p-3 flex items-start gap-2.5">
                <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-sm text-amber-700">
                  <p className="font-bold text-xs">Solde prépayé insuffisant</p>
                  <p className="text-[11px] mt-1">
                    {formatCurrency(prepaidBalance)} sera déduit du solde prépayé.
                    <br />
                    <span className="text-red-600 font-bold">{formatCurrency(amountToDebt)}</span> sera ajouté aux créances du client.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Cart */}
          <div className="w-full lg:w-80 bg-gradient-to-b from-gray-50/80 to-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">Panier</h3>
                <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{cartItems.length}</span>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100/50">
                    <ShoppingCart className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">Panier vide</p>
                </div>
              ) : (
                cartItems.map(item => (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-100/80 p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.productName}</p>
                        <p className="text-[11px] text-gray-400">{formatCurrency(item.unitPrice)} / unité</p>
                      </div>
                      <button type="button" onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => updateCartItemQuantity(item.id, -0.5)} className="w-6 h-6 flex items-center justify-center bg-gray-50 border border-gray-200/60 rounded-lg hover:bg-gray-100 transition-colors">
                          <Minus className="w-3 h-3 text-gray-500" />
                        </button>
                        <span className="text-sm font-bold w-10 text-center text-gray-900">{item.quantity}</span>
                        <button type="button" onClick={() => updateCartItemQuantity(item.id, 0.5)} className="w-6 h-6 flex items-center justify-center bg-gray-50 border border-gray-200/60 rounded-lg hover:bg-gray-100 transition-colors">
                          <Plus className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(item.total)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary */}
            <div className="p-4 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Client</span>
                <span className="font-semibold text-gray-800 truncate ml-2">{displayClientName || '—'}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Type</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${clientType === 'quotataire' ? 'bg-violet-50 text-violet-700 border-violet-200/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'}`}>
                  {clientType === 'quotataire' ? 'Quotataire' : 'Cash'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Quantité totale</span>
                <span className="font-bold text-gray-800">{totalQuantity}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-gray-100/50">
                <span>Sous-total HT</span>
                <span className="font-semibold text-gray-700">{formatCurrency(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>TVA ({effectiveTaxRate}%)</span>
                <span className="font-semibold text-gray-600">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="font-bold text-gray-900">Total TTC</span>
                <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{formatCurrency(cartTotalTTC)}</span>
              </div>
            </div>

            {/* Prepaid balance info */}
            {clientType === 'quotataire' && selectedCustomer && (
              <div className={`mx-4 mb-3 p-2.5 rounded-xl border ${balanceInsufficient ? 'bg-red-50/60 border-red-200/50' : 'bg-violet-50/60 border-violet-200/40'}`}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={balanceInsufficient ? 'text-red-600 font-medium' : 'text-violet-600 font-medium'}>
                    <Wallet className="w-3 h-3 inline mr-1" />
                    Solde prépayé
                  </span>
                  <span className={`font-bold ${balanceInsufficient ? 'text-red-600' : 'text-violet-600'}`}>{formatCurrency(prepaidBalance)}</span>
                </div>
                {cartTotalTTC > 0 && (
                  <div className="flex justify-between text-xs mt-1 pt-1 border-t border-violet-100/50">
                    <span className="text-violet-500 font-medium">Après cette vente</span>
                    <span className={`font-bold ${prepaidBalance - cartTotalTTC < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrency(Math.max(0, prepaidBalance - cartTotalTTC))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {balanceInsufficient && (
              <div className="mx-4 mb-2 p-2 bg-red-50/60 border border-red-200/50 rounded-xl">
                <div className="flex justify-between text-xs">
                  <span className="text-red-600 font-medium">Dette à créer</span>
                  <span className="font-bold text-red-700">{formatCurrency(amountToDebt)}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 border-t border-gray-100 space-y-2">
              <button type="submit" disabled={!isValid || loading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md ${
                  balanceInsufficient
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-200/30'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-200/30'
                }`}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : balanceInsufficient ? (
                  'Créer avec dette'
                ) : (
                  'Créer la Vente'
                )}
              </button>
              <button type="button" onClick={onClose} className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </form>

        {/* Modal for adding new carrière type */}
        {showNewCarriereModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4.5 h-4.5 text-amber-600" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Nouveau Type de Carrière</h3>
                  </div>
                  <button type="button" onClick={() => setShowNewCarriereModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nom du type *</label>
                    <input type="text" value={newCarriereName} onChange={(e) => setNewCarriereName(e.target.value)}
                      placeholder="Ex: Gravier concassé, Sable de mer..." className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Prix par m³ (FCFA) *</label>
                    <input type="number" value={newCarrierePrice} onChange={(e) => setNewCarrierePrice(e.target.value)}
                      placeholder="Ex: 15000" min="0" className={inputClass} />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button type="button" onClick={() => setShowNewCarriereModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200/80 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors">
                    Annuler
                  </button>
                  <button type="button" onClick={handleAddCarriereType} disabled={!newCarriereName.trim() || !newCarrierePrice}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 text-sm font-bold transition-all shadow-md shadow-amber-200/30">
                    Créer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
