import { Product, Customer, Sale, Payment, DashboardStats, Supplier, Notification } from '../types';

export const products: Product[] = [
  {
    id: '1',
    name: 'Béton 3/8',
    sku: 'BET-38',
    selling_price: 70000,
    cost_price: 55000,
    unit: 'm³',
    description: 'Béton prêt à l\'emploi avec granulats fins 3/8mm. Idéal pour dalles, fondations, chapes et travaux de maçonnerie courante. Livraison par camion toupie.',
    status: 'active',
  },
  {
    id: '2',
    name: 'Béton 8/16',
    sku: 'BET-816',
    selling_price: 65000,
    cost_price: 50000,
    unit: 'm³',
    description: 'Béton prêt à l\'emploi avec granulats moyens 8/16mm. Parfait pour structures porteuses, poteaux, poutres et gros œuvre. Livraison par camion toupie.',
    status: 'active',
  },
  {
    id: '3',
    name: 'Gravier Concassé 5/15',
    sku: 'CAR-GRA-515',
    selling_price: 15000,
    cost_price: 10000,
    unit: 'm³',
    description: 'Gravier concassé de carrière, calibre 5/15mm pour vos mélanges béton et travaux de voirie.',
    status: 'active',
  },
  {
    id: '4',
    name: 'Sable fin de carrière',
    sku: 'CAR-SAB-FIN',
    selling_price: 12000,
    cost_price: 8000,
    unit: 'm³',
    description: 'Sable fin lavé de carrière pour maçonnerie, enduits et finition.',
    status: 'active',
  },
  {
    id: '5',
    name: 'Ciment CEM II 42.5 (50kg)',
    sku: 'CIM-42-50',
    selling_price: 5500,
    cost_price: 4200,
    unit: 'sac',
    description: 'Ciment Portland composé CEM II/B 42.5N. Sac de 50kg. Usage courant pour béton et maçonnerie.',
    status: 'active',
  },
];

export const customers: Customer[] = [
  {
    id: '1',
    name: 'Jean Dupont',
    email: 'jean.dupont@email.com',
    phone: '77 123 45 67',
    address: '123 Rue de la Construction, Dakar',
    company: 'Dupont Construction',
    creditLimit: 6000000,
    balance: 1500000,
    totalPurchases: 15420000
  },
  {
    id: '2',
    name: 'Marie Martin',
    email: 'marie.martin@batiment.sn',
    phone: '76 987 65 43',
    address: '456 Avenue des Bâtisseurs, Thiès',
    company: 'Martin & Fils',
    creditLimit: 9000000,
    balance: 0,
    totalPurchases: 22800000
  },
  {
    id: '3',
    name: 'Pierre Legrand',
    email: 'p.legrand@construction.sn',
    phone: '78 112 233 44',
    address: '789 Boulevard du Béton, Saint-Louis',
    creditLimit: 4800000,
    balance: 720000,
    totalPurchases: 8950000
  },
  {
    id: '4',
    name: 'Fatou Diop',
    email: 'f.diop@senegal-build.sn',
    phone: '77 555 66 77',
    address: '321 Avenue Cheikh Anta Diop, Dakar',
    company: 'Sénégal Build',
    creditLimit: 12000000,
    balance: 2400000,
    totalPurchases: 31200000
  },
  {
    id: '5',
    name: 'Moussa Ba',
    email: 'moussa.ba@construction.sn',
    phone: '76 444 55 66',
    address: '654 Rue de Kaolack, Kaolack',
    company: 'Ba Construction',
    creditLimit: 7500000,
    balance: 0,
    totalPurchases: 18600000
  }
];

export const suppliers: Supplier[] = [
  {
    id: '1',
    name: 'Ciments du Sahel',
    contactPerson: 'Amadou Diallo',
    email: 'a.diallo@ciments-sahel.sn',
    phone: '33 821 45 67',
    address: 'Zone Industrielle de Rufisque, Dakar',
    productsSupplied: ['Ciment Portland', 'Ciment Blanc', 'Chaux'],
    rating: 4.8,
    totalOrders: 156,
    lastOrderDate: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Granulats de l\'Ouest',
    contactPerson: 'Ibrahima Sarr',
    email: 'i.sarr@granulats-ouest.sn',
    phone: '33 955 12 34',
    address: 'Carrière de Diack, Thiès',
    productsSupplied: ['Sable', 'Gravier', 'Concassé'],
    rating: 4.5,
    totalOrders: 89,
    lastOrderDate: '2024-01-12T14:20:00Z'
  },
  {
    id: '3',
    name: 'Additifs Chimiques SARL',
    contactPerson: 'Aïssatou Ndiaye',
    email: 'a.ndiaye@additifs-chimiques.sn',
    phone: '77 333 44 55',
    address: '45 Rue des Industries, Dakar',
    productsSupplied: ['Plastifiants', 'Accélérateurs', 'Retardateurs'],
    rating: 4.9,
    totalOrders: 234,
    lastOrderDate: '2024-01-18T09:15:00Z'
  },
  {
    id: '4',
    name: 'Transport Béton Express',
    contactPerson: 'Ousmane Fall',
    email: 'o.fall@beton-express.sn',
    phone: '76 777 88 99',
    address: 'Parcelles Assainies, Dakar',
    productsSupplied: ['Transport', 'Livraison', 'Pompage'],
    rating: 4.3,
    totalOrders: 67,
    lastOrderDate: '2024-01-10T16:45:00Z'
  }
];

export const sales: Sale[] = [
  {
    id: '1',
    customerId: '1',
    customerName: 'Jean Dupont',
    sellerName: 'Mamadou Diop',
    items: [
      {
        productId: '1',
        productName: 'Béton C25/30',
        quantity: 10,
        price: 72000,
        total: 720000
      },
      {
        productId: '4',
        productName: 'Adjuvant Plastifiant',
        quantity: 5,
        price: 15000,
        total: 75000
      }
    ],
    subtotal: 795000,
    tax: 143100, // 18% TVA
    total: 938100,
    status: 'confirmed',
    paymentStatus: 'partial',
    createdAt: '2024-01-15T10:30:00Z',
    deliveryDate: '2024-01-20T09:00:00Z',
    notes: 'Livraison sur chantier rue de la Paix'
  },
  {
    id: '2',
    customerId: '2',
    customerName: 'Marie Martin',
    sellerName: 'Fatou Seck',
    items: [
      {
        productId: '2',
        productName: 'Béton C30/37',
        quantity: 8,
        price: 87000,
        total: 696000
      }
    ],
    subtotal: 696000,
    tax: 125280, // 18% TVA
    total: 821280,
    status: 'delivered',
    paymentStatus: 'paid',
    createdAt: '2024-01-10T14:15:00Z',
    deliveryDate: '2024-01-12T08:00:00Z'
  },
  {
    id: '3',
    customerId: '3',
    customerName: 'Pierre Legrand',
    sellerName: 'Aminata Ba',
    items: [
      {
        productId: '3',
        productName: 'Béton Fibré',
        quantity: 12,
        price: 108000,
        total: 1296000
      }
    ],
    subtotal: 1296000,
    tax: 233280, // 18% TVA
    total: 1529280,
    status: 'draft',
    paymentStatus: 'pending',
    createdAt: '2024-01-18T16:45:00Z'
  },
  {
    id: '4',
    customerId: '4',
    customerName: 'Fatou Diop',
    sellerName: 'Mamadou Diop',
    items: [
      {
        productId: '1',
        productName: 'Béton C25/30',
        quantity: 25,
        price: 72000,
        total: 1800000
      },
      {
        productId: '2',
        productName: 'Béton C30/37',
        quantity: 15,
        price: 87000,
        total: 1305000
      }
    ],
    subtotal: 3105000,
    tax: 558900, // 18% TVA
    total: 3663900,
    status: 'delivered',
    paymentStatus: 'paid',
    createdAt: '2024-01-08T11:20:00Z',
    deliveryDate: '2024-01-10T07:30:00Z'
  },
  {
    id: '5',
    customerId: '5',
    customerName: 'Moussa Ba',
    sellerName: 'Fatou Seck',
    items: [
      {
        productId: '3',
        productName: 'Béton Fibré',
        quantity: 18,
        price: 108000,
        total: 1944000
      }
    ],
    subtotal: 1944000,
    tax: 349920, // 18% TVA
    total: 2293920,
    status: 'confirmed',
    paymentStatus: 'paid',
    createdAt: '2024-01-14T13:10:00Z',
    deliveryDate: '2024-01-16T08:45:00Z'
  }
];

export const payments: Payment[] = [
  {
    id: '1',
    saleId: '1',
    amount: 470000,
    method: 'transfer',
    reference: 'VIR20240115001',
    date: '2024-01-15T15:30:00Z',
    notes: 'Acompte 50%'
  },
  {
    id: '2',
    saleId: '2',
    amount: 821280,
    method: 'card',
    date: '2024-01-12T10:20:00Z',
    notes: 'Paiement complet'
  },
  {
    id: '3',
    saleId: '4',
    amount: 3663900,
    method: 'transfer',
    reference: 'VIR20240110002',
    date: '2024-01-10T14:45:00Z',
    notes: 'Paiement complet'
  },
  {
    id: '4',
    saleId: '5',
    amount: 2293920,
    method: 'cash',
    date: '2024-01-16T16:30:00Z',
    notes: 'Paiement en espèces'
  }
];

export const notifications: Notification[] = [
  {
    id: '1',
    title: 'Stock Faible',
    message: 'Le stock d\'Accélérateur de Prise est critique (8 kg restants)',
    type: 'warning',
    read: false,
    createdAt: '2024-01-18T09:30:00Z'
  },
  {
    id: '2',
    title: 'Nouvelle Commande',
    message: 'Nouvelle commande de Fatou Diop pour 3,663,900 FCFA',
    type: 'success',
    read: false,
    createdAt: '2024-01-18T08:15:00Z'
  },
  {
    id: '3',
    title: 'Paiement Reçu',
    message: 'Paiement de 2,293,920 FCFA reçu de Moussa Ba',
    type: 'success',
    read: true,
    createdAt: '2024-01-16T16:35:00Z'
  },
  {
    id: '4',
    title: 'Livraison Programmée',
    message: 'Livraison prévue demain à 09h00 chez Jean Dupont',
    type: 'info',
    read: false,
    createdAt: '2024-01-19T17:20:00Z'
  }
];

export const dashboardStats: DashboardStats = {
  totalSales: 156,
  monthlyRevenue: 27408000,
  pendingOrders: 12,
  lowStockItems: 3
};