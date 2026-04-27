import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { DataProvider, useDataContext } from './contexts/DataContext';
import { LoginPage } from './components/Auth/LoginPage';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { hasPermission } from './services/roles';
import { suppliersAPI, invoicesAPI, deliveryNotesAPI } from './services/mysql-api';
import { Sale, Customer, Product, Supplier, Invoice, DeliveryNote } from './types';

// Lazy loading des composants pour améliorer les performances
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const SalesList = lazy(() => import('./components/Sales/SalesList').then(module => ({ default: module.SalesList })));
const SaleForm = lazy(() => import('./components/Sales/SaleForm').then(module => ({ default: module.SaleForm })));
const SaleActions = lazy(() => import('./components/Sales/SaleActions').then(module => ({ default: module.SaleActions })));
const SaleDetail = lazy(() => import('./components/Sales/SaleDetail').then(module => ({ default: module.SaleDetail })));
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

// Nouveaux composants Factures et Transport
const InvoicesList = lazy(() => import('./components/Invoices/InvoicesList').then(module => ({ default: module.InvoicesList })));
const InvoiceForm = lazy(() => import('./components/Invoices/InvoiceForm').then(module => ({ default: module.InvoiceForm })));
const InvoicePDF = lazy(() => import('./components/Invoices/InvoicePDF').then(module => ({ default: module.InvoicePDF })));
const DeliveryNotesList = lazy(() => import('./components/Transport/DeliveryNotesList').then(module => ({ default: module.DeliveryNotesList })));
const DeliveryNoteForm = lazy(() => import('./components/Transport/DeliveryNoteForm').then(module => ({ default: module.DeliveryNoteForm })));

// Gestion de Caisse
const CashManagement = lazy(() => import('./components/Cash/CashManagement'));
const CashDailyReport = lazy(() => import('./components/Cash/CashDailyReport').then(module => ({ default: module.default })));

// 🏦 Gestion Bancaire
const BankManagement = lazy(() => import('./components/Banks/BankManagement'));

// 🤝 Partenaires & Investisseurs
const PartnerManagement = lazy(() => import('./components/Partners/PartnerManagement'));

// 🏗️ Projets & Chantiers
const ProjectManagement = lazy(() => import('./components/Projects/ProjectManagement'));

// E-COMMERCE - Boutique en ligne PROFESSIONNELLE
const ShopPagePro = lazy(() => import('./components/Shop/ShopPagePro'));
const EcommerceAdmin = lazy(() => import('./components/Shop/Admin/EcommerceAdmin').then(module => ({ default: module.default })));

// 🤖 INTELLIGENCE ARTIFICIELLE — Module Unifié
const AIChat = lazy(() => import('./components/AI/AIChat').then(module => ({ default: module.AIChat })));

// 👔 RH — Gestion des Salaires
const HRDashboard = lazy(() => import('./components/HR/HRDashboard').then(module => ({ default: module.HRDashboard })));

// 🏢 Profil Entreprise — ICOPS SUARL
const CompanyProfile = lazy(() => import('./components/Company/CompanyProfile').then(module => ({ default: module.CompanyProfile })));

// 📒 Comptabilité SYSCOHADA (Style Sage)
const ComptabiliteSYSCOHADA = lazy(() => import('./components/Comptabilite/ComptabiliteSYSCOHADA').then(module => ({ default: module.ComptabiliteSYSCOHADA })));

// 📥 Import Sage SAARI
const SageImport = lazy(() => import('./components/Comptabilite/SageImport').then(module => ({ default: module.SageImport })));

// Composant de chargement amélioré
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-orange-400 rounded-full animate-ping mx-auto"></div>
      </div>
      <p className="text-gray-600 font-medium">Chargement...</p>
      <p className="text-gray-400 text-sm mt-2">Préparation de votre espace de travail</p>
    </div>
  </div>
);

// ErrorBoundary pour capturer les erreurs de rendu
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 rounded-lg m-4 border border-red-200">
          <h2 className="text-red-700 text-xl font-bold mb-2">Erreur d'affichage</h2>
          <p className="text-red-600 mb-2">{this.state.error?.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Redirection racine → boutique */}
          <Route path="/" element={<Navigate to="/shop" replace />} />

          {/* Route publique - Boutique e-commerce PROFESSIONNELLE */}
          <Route path="/shop/*" element={
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
              <Suspense fallback={<LoadingSpinner />}>
                <ShopPagePro />
              </Suspense>
            </GoogleOAuthProvider>
          } />

          {/* Routes admin (accès réservé via /admin) */}
          <Route path="/admin/*" element={<AppContent />} />
          <Route path="/admin" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// Contenu de l'application (admin)
const AppContent: React.FC = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <DataProvider>
      <AdminDashboard />
    </DataProvider>
  );
};

// Composant Dashboard Admin (après connexion)
const AdminDashboard: React.FC = () => {
  const { user, profile, loading } = useAuthContext();
  const { refreshData, refreshSales, refreshProducts, refreshCustomers, refreshSuppliers, refreshPayments } = useDataContext();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modals state
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showRestockForm, setShowRestockForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [preSelectedSaleId, setPreSelectedSaleId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSaleActions, setShowSaleActions] = useState(false);
  const [showSaleDetail, setShowSaleDetail] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showInvoicePDF, setShowInvoicePDF] = useState(false);
  const [showDeliveryNoteForm, setShowDeliveryNoteForm] = useState(false);

  // Selected items
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedDeliveryNote, setSelectedDeliveryNote] = useState<DeliveryNote | null>(null);
  const [editingDeliveryNote, setEditingDeliveryNote] = useState<DeliveryNote | null>(null);

  const userRole = profile?.role || 'viewer';

  if (loading) {
    return <LoadingSpinner />;
  }

  // Handlers
  const handleCreateSale = () => {
    setShowSaleForm(true);
  };

  const handleCloseSaleForm = () => {
    setShowSaleForm(false);
  };

  const handleSaleCreated = () => {
    setShowSaleForm(false);
    refreshSales();
  };

  const handleSaleClick = (sale: Sale) => {
    setSelectedSale(sale);
    setShowSaleDetail(true);
  };

  const handleCloseSaleDetail = () => {
    setShowSaleDetail(false);
    setSelectedSale(null);
  };

  const handleSaleDuplicated = () => {
    setShowSaleDetail(false);
    setSelectedSale(null);
    refreshSales();
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleCloseProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleProductCreated = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    refreshProducts();
  };

  const handleRestockClick = (product: Product) => {
    setSelectedProduct(product);
    setShowRestockForm(true);
  };

  const handleCloseRestockForm = () => {
    setShowRestockForm(false);
    setSelectedProduct(null);
  };

  const handleRestockCreated = () => {
    setShowRestockForm(false);
    setSelectedProduct(null);
    refreshProducts();
  };

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleCloseCustomerForm = () => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
  };

  const handleCustomerCreated = () => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
    refreshCustomers();
  };

  const handleSupplierClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierForm(true);
  };

  const handleCloseSupplierForm = () => {
    setShowSupplierForm(false);
    setEditingSupplier(null);
  };

  const handleSupplierCreated = () => {
    setShowSupplierForm(false);
    setEditingSupplier(null);
    refreshSuppliers();
  };

  const handleAddPayment = (saleId: string) => {
    setPreSelectedSaleId(saleId);
    setShowPaymentForm(true);
  };

  const handleClosePaymentForm = () => {
    setShowPaymentForm(false);
    setPreSelectedSaleId(null);
  };

  const handlePaymentCreated = () => {
    setShowPaymentForm(false);
    setPreSelectedSaleId(null);
    refreshPayments();
    refreshSales();
    refreshCustomers();
  };

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
  };

  const handleSettingsClick = () => {
    setActiveSection('settings');
  };

  const handleCloseSettings = () => {
    setActiveSection('dashboard');
  };

  const handleSupportClick = () => {
    setShowSupport(true);
  };

  const handleCloseSupport = () => {
    setShowSupport(false);
  };

  const handleSaleActions = (sale: Sale) => {
    setSelectedSale(sale);
    setShowSaleActions(true);
  };

  const handleCloseSaleActions = () => {
    setShowSaleActions(false);
    setSelectedSale(null);
  };

  const handleInvoiceClick = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoicePDF(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
  };

  const handleCloseInvoiceForm = () => {
    setShowInvoiceForm(false);
    setEditingInvoice(null);
  };

  const handleInvoiceCreated = () => {
    setShowInvoiceForm(false);
    setEditingInvoice(null);
    refreshData();
  };

  const handleCloseInvoicePDF = () => {
    setShowInvoicePDF(false);
    setSelectedInvoice(null);
  };

  const handleDeliveryNoteClick = (note: DeliveryNote) => {
    setSelectedDeliveryNote(note);
  };

  const handleEditDeliveryNote = (note: DeliveryNote) => {
    setEditingDeliveryNote(note);
    setShowDeliveryNoteForm(true);
  };

  const handleCloseDeliveryNoteForm = () => {
    setShowDeliveryNoteForm(false);
    setEditingDeliveryNote(null);
  };

  const handleDeliveryNoteCreated = () => {
    setShowDeliveryNoteForm(false);
    setEditingDeliveryNote(null);
    refreshData();
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onSaleClick={handleSaleClick} onProductClick={handleProductClick} />;
      case 'sales':
        return <SalesList onCreateSale={handleCreateSale} onViewSale={handleSaleClick} onCreateDeliveryNote={(sale: Sale) => { setShowDeliveryNoteForm(true); }} />;
      case 'inventory':
        return <InventoryList onCreateProduct={() => setShowProductForm(true)} onEditProduct={handleEditProduct} onRestockProduct={handleRestockClick} />;
      case 'customers':
        return <CustomersList onCreateCustomer={() => { setEditingCustomer(null); setShowCustomerForm(true); }} onViewCustomer={handleCustomerClick} onEditCustomer={handleEditCustomer} />;
      case 'suppliers':
        return <SuppliersList onCreateSupplier={() => setShowSupplierForm(true)} onViewSupplier={handleSupplierClick} onEditSupplier={handleEditSupplier} />;
      case 'payments':
        return <PaymentsList onCreatePayment={() => { setPreSelectedSaleId(null); setShowPaymentForm(true); }} />;
      case 'reports':
        return <ReportsPage />;
      case 'invoices':
        return <InvoicesList onInvoiceClick={handleInvoiceClick} onEditInvoice={handleEditInvoice} />;
      case 'transport':
        return <DeliveryNotesList onDeliveryNoteClick={handleDeliveryNoteClick} onEditDeliveryNote={handleEditDeliveryNote} />;
      case 'cash':
        return <CashManagement />;
      case 'cash-report':
        return <CashDailyReport />;
      case 'banks':
        return <BankManagement />;
      case 'partners':
        return <PartnerManagement />;
      case 'projects':
        return <ProjectManagement />;
      case 'ecommerce':
        return <EcommerceAdmin />;
      case 'ai-expert':
        return <AIChat />;
      case 'hr':
        return <HRDashboard />;
      case 'company':
        return <CompanyProfile />;
      case 'comptabilite':
        return <ComptabiliteSYSCOHADA />;
      case 'sage-import':
        return <SageImport />;
      case 'admin':
      case 'users':
        return hasPermission(userRole, 'users', 'read') ? <UserManagement /> : <div className="p-8 text-center text-gray-500">Accès refusé</div>;
      case 'settings':
        return <SettingsPage onClose={() => setActiveSection('dashboard')} />;
      case 'notifications':
        return <NotificationSettings />;
      default:
        return <Dashboard onSaleClick={handleSaleClick} onProductClick={handleProductClick} />;
    }
  };

  // Handler pour le changement de section
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[270px]'}`}>
        <Header
          onProfileClick={handleProfileClick}
          onSettingsClick={handleSettingsClick}
          onSupportClick={handleSupportClick}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="p-4 lg:p-6">
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              {renderContent()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Modals — wrapped in Suspense for lazy-loaded components */}
      <Suspense fallback={null}>
        {showSaleForm && (
          <SaleForm
            onClose={handleCloseSaleForm}
            onSave={handleSaleCreated}
          />
        )}

        {showProductForm && (
          <ProductForm
            onClose={handleCloseProductForm}
            onSave={handleProductCreated}
            product={editingProduct || undefined}
          />
        )}

        {showRestockForm && selectedProduct && (
          <RestockForm
            product={selectedProduct}
            onClose={handleCloseRestockForm}
            onSave={handleRestockCreated}
          />
        )}

        {showCustomerForm && (
          <CustomerForm
            onClose={handleCloseCustomerForm}
            onCustomerCreated={handleCustomerCreated}
            editingCustomer={editingCustomer}
          />
        )}

        {showSupplierForm && (
          <SupplierForm
            onClose={handleCloseSupplierForm}
            onSupplierCreated={handleSupplierCreated}
            editingSupplier={editingSupplier}
          />
        )}

        {showPaymentForm && (
          <PaymentForm
            onClose={handleClosePaymentForm}
            onPaymentCreated={handlePaymentCreated}
            preSelectedSaleId={preSelectedSaleId}
          />
        )}

        {showProfile && (
          <ProfilePage onClose={handleCloseProfile} />
        )}


        {showSupport && (
          <SupportPage onClose={handleCloseSupport} />
        )}

        {showSaleActions && selectedSale && (
          <SaleActions
            sale={selectedSale}
            onClose={handleCloseSaleActions}
          />
        )}

        {showSaleDetail && selectedSale && (
          <SaleDetail
            sale={selectedSale}
            onClose={handleCloseSaleDetail}
            onDuplicate={handleSaleDuplicated}
            onAddPayment={(saleId: string) => { handleCloseSaleDetail(); handleAddPayment(saleId); }}
          />
        )}

        {selectedCustomer && (
          <CustomerDetail
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
            onEdit={(customer: any) => { setSelectedCustomer(null); handleEditCustomer(customer); }}
          />
        )}

        {selectedSupplier && (
          <SupplierDetail
            supplier={selectedSupplier}
            onClose={() => setSelectedSupplier(null)}
          />
        )}

        {showInvoiceForm && (
          <InvoiceForm
            onClose={handleCloseInvoiceForm}
            onInvoiceCreated={handleInvoiceCreated}
            editingInvoice={editingInvoice}
          />
        )}

        {showInvoicePDF && selectedInvoice && (
          <InvoicePDF
            invoice={selectedInvoice}
            onClose={handleCloseInvoicePDF}
          />
        )}

        {showDeliveryNoteForm && (
          <DeliveryNoteForm
            onClose={handleCloseDeliveryNoteForm}
            onDeliveryNoteCreated={handleDeliveryNoteCreated}
            editingDeliveryNote={editingDeliveryNote}
          />
        )}
      </Suspense>

      {/* Bouton Vente rapide */}
      {hasPermission(userRole, 'sales', 'create') && (
        <button
          onClick={handleCreateSale}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-orange-600 to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:shadow-orange-500/50 hover:scale-110 transition-all duration-300 z-50 group"
          title="Nouvelle vente"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Nouvelle vente
          </span>
        </button>
      )}
    </div>
  );
};

export default App;
