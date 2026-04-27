// Traductions français pour l'affichage

export const translations = {
  // Statuts des ventes
  saleStatus: {
    draft: 'Brouillon',
    confirmed: 'Confirmée',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    pending: 'En attente',
    completed: 'Complétée'
  },

  // Statuts des paiements
  paymentStatus: {
    pending: 'En attente',
    completed: 'Complété',
    failed: 'Échoué',
    refunded: 'Remboursé',
    cancelled: 'Annulé'
  },

  // Méthodes de paiement
  paymentMethod: {
    cash: 'Espèces',
    card: 'Carte bancaire',
    bank_transfer: 'Virement',
    check: 'Chèque',
    online: 'En ligne',
    mobile_money: 'Mobile Money',
    cheque: 'Chèque'
  },

  // Statuts clients
  customerStatus: {
    active: 'Actif',
    actif: 'Actif',
    inactive: 'Inactif',
    inactif: 'Inactif',
    suspended: 'Suspendu',
    suspendu: 'Suspendu',
    bloque: 'Bloqué'
  },

  // Types de clients
  customerType: {
    individual: 'Particulier',
    business: 'Entreprise',
    reseller: 'Revendeur',
    simple: 'Simple',
    occasionnel: 'Occasionnel',
    revendeur: 'Revendeur',
    quotataire: 'Quotataire',
    particulier: 'Particulier',
    entreprise: 'Entreprise'
  },

  // Statuts produits
  productStatus: {
    active: 'Actif',
    inactive: 'Inactif',
    out_of_stock: 'Épuisé'
  },

  // Types de produits
  productType: {
    beton: 'Béton',
    béton: 'Béton',
    agregats: 'Agrégats',
    agrégats: 'Agrégats',
    ciment: 'Ciment',
    cement: 'Ciment',
    ferraillage: 'Ferraillage',
    steel: 'Ferraillage',
    materiaux: 'Matériaux',
    matériaux: 'Matériaux',
    carriere: 'Carrière',
    carrière: 'Carrière',
    service: 'Service',
    autre: 'Autre'
  },

  // Statuts fournisseurs
  supplierStatus: {
    active: 'Actif',
    inactive: 'Inactif',
    suspended: 'Suspendu'
  },

  // Types de mouvements caisse
  cashMovementType: {
    income: 'Recette',
    expense: 'Dépense',
    entree: 'Entrée',
    sortie: 'Sortie',
    recette: 'Recette',
    depense: 'Dépense'
  }
};

// Fonctions helper pour traduire
export const translateSaleStatus = (status: string): string => {
  return translations.saleStatus[status as keyof typeof translations.saleStatus] || status;
};

export const translatePaymentStatus = (status: string): string => {
  return translations.paymentStatus[status as keyof typeof translations.paymentStatus] || status;
};

export const translatePaymentMethod = (method: string): string => {
  return translations.paymentMethod[method as keyof typeof translations.paymentMethod] || method;
};

export const translateCustomerStatus = (status: string): string => {
  return translations.customerStatus[status as keyof typeof translations.customerStatus] || status;
};

export const translateCustomerType = (type: string): string => {
  return translations.customerType[type as keyof typeof translations.customerType] || type;
};

export const translateProductStatus = (status: string): string => {
  return translations.productStatus[status as keyof typeof translations.productStatus] || status;
};

export const translateProductType = (type: string): string => {
  return translations.productType[type as keyof typeof translations.productType] || type;
};

export const translateSupplierStatus = (status: string): string => {
  return translations.supplierStatus[status as keyof typeof translations.supplierStatus] || status;
};

export const translateCashMovementType = (type: string): string => {
  return translations.cashMovementType[type as keyof typeof translations.cashMovementType] || type;
};

// Couleurs des badges selon le statut
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    // Ventes
    draft: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-orange-100 text-orange-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    // Paiements
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-orange-100 text-orange-700',
    // Clients/Produits
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-700',
    out_of_stock: 'bg-orange-100 text-orange-700',
    actif: 'bg-emerald-100 text-emerald-700',
    inactif: 'bg-gray-100 text-gray-700',
    bloque: 'bg-red-100 text-red-700'
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};
