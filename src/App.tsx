import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { LoginPage } from './components/Auth/LoginPage';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { hasPermission } from './services/roles';
import { suppliersAPI } from './services/mysql-api';
import { Sale, Customer, Product, Supplier } from './types';

// Lazy loading des composants pour améliorer les performances
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const SalesList = lazy(() => import('./components/Sales/SalesList').then(module => ({ default: module.SalesList })));
const SaleForm = lazy(() => import('./components/Sales/SaleForm').then(module => ({ default: module.SaleForm })));
const SaleActions = lazy(() => import('./components/Sales/SaleActions').then(module => ({ default: module.SaleActions })));
const InventoryList = lazy(() => import('./components/Inventory/InventoryList').then(module => ({ default: module.InventoryList })));
const ProductForm = lazy(() => import('./components/Inventory/ProductForm').then(module => ({ default: module.ProductForm })));
const RestockForm = lazy(() => import('./components/Inventory/RestockForm').then(module => ({ default: module.RestockForm })));
const CustomersList = lazy(() => import('./components/Customers/CustomersList').then(module => ({ default: module.CustomersList })));
const CustomerForm = lazy(() => import('./components/Customers/CustomerForm').then(module => ({ default: module.CustomerForm })));
const CustomerDetail = lazy(() => import('./components/Customers/CustomerDetail').then(module => ({ default: module.CustomerDetail })));
const SuppliersList = lazy(() => import('./components/Suppliers/SuppliersList').then(module => ({ default: module.SuppliersList })));
const SupplierForm = lazy(() => import('./components/Suppliers/SupplierForm').then(module => ({ default: module.SupplierForm })));
const SupplierDetail = lazy(() => import('./components/Suppliers/SupplierDetail').then(module => ({ default: module.SupplierDetail })));
const PaymentsList = lazy(() => import('./components/Payments/PaymentsList').then(module => ({ default: module.PaymentsList })));
const PaymentForm = lazy(() => import('./components/Payments/PaymentForm').then(module => ({ default: module.PaymentForm })));
const ReportsPage = lazy(() => import('./components/Reports/ReportsPage').then(module => ({ default: module.ReportsPage })));
const ProfilePage = lazy(() => import('./components/Profile/ProfilePage').then(module => ({ default: module.ProfilePage })));
const SettingsPage = lazy(() => import('./components/Settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const SupportPage = lazy(() => import('./components/Support/SupportPage').then(module => ({ default: module.SupportPage })));
const UserManagement = lazy(() => import('./components/Admin/UserManagement').then(module => ({ default: module.UserManagement })));
const NotificationSettings = lazy(() => import('./components/Settings/NotificationSettings').then(module => ({ default: module.NotificationSettings })));

// Composant de chargement amélioré
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-400 rounded-full animate-ping mx-auto"></div>
      </div>
      <p className="text-gray-600 font-medium">Chargement...</p>
      <p className="text-gray-400 text-sm mt-2">Préparation de votre espace de travail</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuthContext();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Modals state
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showRestockForm, setShowRestockForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSaleActions, setShowSaleActions] = useState(false);
  
  // Selected items
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const userRole = profile?.role || 'viewer';

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    closeAllModals();
  };

  const closeAllModals = () => {
    setShowSaleForm(false);
    setShowProductForm(false);
    setShowRestockForm(false);
    setShowCustomerForm(false);
    setShowSupplierForm(false);
    setShowPaymentForm(false);
    setShowProfile(false);
    setShowSettings(false);
    setShowSupport(false);
    setShowSaleActions(false);
    setSelectedSale(null);
    setSelectedCustomer(null);
    setSelectedSupplier(null);
    setSelectedProduct(null);
    setEditingCustomer(null);
    setEditingSupplier(null);
    setEditingProduct(null);
  };

  // Handlers optimisés
  const handleCreateSale = () => {
    if (hasPermission(userRole as any, 'sales', 'create')) {
      setShowSaleForm(true);
    }
  };

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setShowSaleActions(true);
  };

  const handleSaveSale = (saleData: any) => {
    console.log('Saving sale:', saleData);
    setShowSaleForm(false);
  };

  const handleCreateProduct = () => {
    if (hasPermission(userRole as any, 'products', 'create')) {
      setEditingProduct(null);
      setShowProductForm(true);
    }
  };

  const handleEditProduct = (product: Product) => {
    if (hasPermission(userRole as any, 'products', 'update')) {
      setEditingProduct(product);
      setShowProductForm(true);
    }
  };

  const handleRestockProduct = (product: Product) => {
    if (hasPermission(userRole as any, 'products', 'update')) {
      setSelectedProduct(product);
      setShowRestockForm(true);
    }
  };

  const handleSaveProduct = (productData: any) => {
    console.log('Saving product:', productData);
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleSaveRestock = (restockData: any) => {
    console.log('Saving restock:', restockData);
    setShowRestockForm(false);
    setSelectedProduct(null);
  };

  const handleCreateCustomer = () => {
    if (hasPermission(userRole as any, 'customers', 'create')) {
      setEditingCustomer(null);
      setShowCustomerForm(true);
    }
  };

  const handleViewCustomer = (customer: Customer) => setSelectedCustomer(customer);
  
  const handleEditCustomer = (customer: Customer) => {
    if (hasPermission(userRole as any, 'customers', 'update')) {
      setEditingCustomer(customer);
      setShowCustomerForm(true);
    }
  };

  const handleSaveCustomer = (customerData: any) => {
    console.log('Saving customer:', customerData);
    setShowCustomerForm(false);
    setEditingCustomer(null);
  };

  const handleCreateSupplier = () => {
    if (hasPermission(userRole as any, 'suppliers', 'create')) {
      setEditingSupplier(null);
      setShowSupplierForm(true);
    }
  };

  const handleViewSupplier = (supplier: Supplier) => setSelectedSupplier(supplier);
  
  const handleEditSupplier = (supplier: Supplier) => {
    if (hasPermission(userRole as any, 'suppliers', 'update')) {
      setEditingSupplier(supplier);
      setShowSupplierForm(true);
    }
  };

  const handleSaveSupplier = async (supplierData: any) => {
    try {
      console.log('Saving supplier:', supplierData);
      
      // Si en mode édition, faire un UPDATE au lieu d'un CREATE
      if (editingSupplier) {
        const result = await suppliersAPI.update(editingSupplier.id, supplierData);
        if (result && result.success) {
          console.log('✅ Fournisseur modifié avec succès');
          window.dispatchEvent(new Event('refreshData'));
          setShowSupplierForm(false);
          setEditingSupplier(null);
        } else {
          console.error('Erreur modification fournisseur:', result?.error || result);
        }
      } else {
        // Mode création
        const result = await suppliersAPI.create(supplierData);
        if (result && result.success) {
          console.log('✅ Fournisseur créé avec succès:', result.data);
          window.dispatchEvent(new Event('refreshData'));
          setShowSupplierForm(false);
          setEditingSupplier(null);
        } else {
          console.error('Erreur création fournisseur:', result?.error || result);
        }
      }
    } catch (err: any) {
      console.error('Erreur saving supplier:', err);
    }
  };

  const handleCreatePayment = () => {
    if (hasPermission(userRole as any, 'payments', 'create')) {
      setShowPaymentForm(true);
    }
  };

  const handleSavePayment = (paymentData: any) => {
    console.log('Saving payment:', paymentData);
    setShowPaymentForm(false);
    
    // Déclencher un rafraîchissement des données
    window.dispatchEvent(new Event('paymentCreated'));
    window.dispatchEvent(new Event('refreshData'));
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Dashboard key={activeSection} />
          </Suspense>
        );
      case 'sales':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SalesList 
              key={activeSection}
              onCreateSale={handleCreateSale} 
              onViewSale={handleViewSale} 
            />
          </Suspense>
        );
      case 'inventory':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <InventoryList 
              key={activeSection}
              onCreateProduct={handleCreateProduct}
              onEditProduct={handleEditProduct}
              onRestockProduct={handleRestockProduct}
            />
          </Suspense>
        );
      case 'customers':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CustomersList 
              key={activeSection}
              onCreateCustomer={handleCreateCustomer}
              onViewCustomer={handleViewCustomer}
              onEditCustomer={handleEditCustomer}
            />
          </Suspense>
        );
      case 'suppliers':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SuppliersList 
              key={activeSection}
              onCreateSupplier={handleCreateSupplier}
              onViewSupplier={handleViewSupplier}
              onEditSupplier={handleEditSupplier}
            />
          </Suspense>
        );
      case 'payments':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <PaymentsList key={activeSection} onCreatePayment={handleCreatePayment} />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ReportsPage key={activeSection} />
          </Suspense>
        );
      case 'admin':
        return userRole === 'admin' ? (
          <Suspense fallback={<LoadingSpinner />}>
            <UserManagement key={activeSection} />
          </Suspense>
        ) : (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Accès refusé</h3>
            <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>
          </div>
        );
      case 'settings':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <NotificationSettings key={activeSection} />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Dashboard key={activeSection} />
          </Suspense>
        );
    }
  };

  return (
    <DataProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <div className="flex-1 flex flex-col min-w-0">
          <Header 
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            onProfileClick={() => setShowProfile(true)}
            onSettingsClick={() => setShowSettings(true)}
            onSupportClick={() => setShowSupport(true)}
          />
          
          <main className="flex-1 overflow-auto p-6">
            {renderContent()}
          </main>
        </div>

        {/* Modals avec Suspense */}
        {showSaleForm && (
          <Suspense fallback={<LoadingSpinner />}>
            <SaleForm
              onClose={() => setShowSaleForm(false)}
              onSave={handleSaveSale}
            />
          </Suspense>
        )}

        {showSaleActions && selectedSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Vente #{selectedSale.sale_number}
                </h2>
                <button
                  onClick={() => setShowSaleActions(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <span className="sr-only">Fermer</span>
                  ×
                </button>
              </div>
              <div className="p-6">
                <Suspense fallback={<LoadingSpinner />}>
                  <SaleActions sale={selectedSale} onClose={() => setShowSaleActions(false)} />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {showProductForm && (
          <Suspense fallback={<LoadingSpinner />}>
            <ProductForm
              onClose={() => {
                setShowProductForm(false);
                setEditingProduct(null);
              }}
              onSave={handleSaveProduct}
              product={editingProduct || undefined}
            />
          </Suspense>
        )}

        {showRestockForm && selectedProduct && (
          <Suspense fallback={<LoadingSpinner />}>
            <RestockForm
              onClose={() => {
                setShowRestockForm(false);
                setSelectedProduct(null);
              }}
              onSave={handleSaveRestock}
              product={selectedProduct}
            />
          </Suspense>
        )}

        {showCustomerForm && (
          <Suspense fallback={<LoadingSpinner />}>
            <CustomerForm
              onClose={() => {
                setShowCustomerForm(false);
                setEditingCustomer(null);
              }}
              onSave={handleSaveCustomer}
              customer={editingCustomer || undefined}
            />
          </Suspense>
        )}

        {selectedCustomer && (
          <Suspense fallback={<LoadingSpinner />}>
            <CustomerDetail
              customer={selectedCustomer}
              onClose={() => setSelectedCustomer(null)}
              onEdit={() => {
                setEditingCustomer(selectedCustomer);
                setSelectedCustomer(null);
                setShowCustomerForm(true);
              }}
            />
          </Suspense>
        )}

        {showSupplierForm && (
          <Suspense fallback={<LoadingSpinner />}>
            <SupplierForm
              onClose={() => {
                setShowSupplierForm(false);
                setEditingSupplier(null);
              }}
              onSave={handleSaveSupplier}
              supplier={editingSupplier || undefined}
            />
          </Suspense>
        )}

        {selectedSupplier && (
          <Suspense fallback={<LoadingSpinner />}>
            <SupplierDetail
              supplier={selectedSupplier}
              onClose={() => setSelectedSupplier(null)}
              onEdit={() => {
                setEditingSupplier(selectedSupplier);
                setSelectedSupplier(null);
                setShowSupplierForm(true);
              }}
            />
          </Suspense>
        )}

        {showPaymentForm && (
          <Suspense fallback={<LoadingSpinner />}>
            <PaymentForm
              onClose={() => setShowPaymentForm(false)}
              onSave={handleSavePayment}
            />
          </Suspense>
        )}

        {showProfile && (
          <Suspense fallback={<LoadingSpinner />}>
            <ProfilePage onClose={() => setShowProfile(false)} />
          </Suspense>
        )}

        {showSettings && (
          <Suspense fallback={<LoadingSpinner />}>
            <SettingsPage onClose={() => setShowSettings(false)} />
          </Suspense>
        )}

        {showSupport && (
          <Suspense fallback={<LoadingSpinner />}>
            <SupportPage onClose={() => setShowSupport(false)} />
          </Suspense>
        )}
      </div>
    </DataProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;