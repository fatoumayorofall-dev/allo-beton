import React, { useState } from 'react';
import { X, Truck, Mail, Phone, MapPin, Star, Calendar, Package, ShoppingCart, Download, Printer } from 'lucide-react';
import { Supplier } from '../../types';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { PurchaseOrdersList } from './PurchaseOrdersList';
import { RatingModal } from './RatingModal';
import { purchaseOrdersAPI } from '../../services/mysql-api';
import { generateSupplierPDF, printSupplierPDF } from '../../services/SupplierPDF';

interface SupplierDetailProps {
  supplier: Supplier;
  onClose: () => void;
  onEdit: () => void;
}

export const SupplierDetail: React.FC<SupplierDetailProps> = ({ supplier, onClose, onEdit }) => {
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showOrdersList, setShowOrdersList] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentSupplier, setCurrentSupplier] = useState(supplier);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  
  const handlePurchaseOrderSaved = () => {
    setShowPurchaseForm(false);
    // Actualiser la liste des commandes
    setRefreshKey(prev => prev + 1);
    // Dispatcher l'événement pour actualiser le DataContext aussi
    window.dispatchEvent(new Event('refreshData'));
  };

  const handleRatingUpdated = () => {
    // Actualiser les données du fournisseur
    window.dispatchEvent(new Event('refreshData'));
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const result = await generateSupplierPDF(currentSupplier);
      if (!result.success) {
        alert('Erreur: ' + result.error);
      }
    } catch (error: any) {
      console.error('Erreur PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handlePrintPDF = async () => {
    try {
      const result = await printSupplierPDF(currentSupplier);
      if (!result.success) {
        alert('Erreur: ' + result.error);
      }
    } catch (error: any) {
      console.error('Erreur impression:', error);
      alert('Erreur lors de l\'impression');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : index < rating 
            ? 'text-yellow-400 fill-current opacity-50' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{supplier.name}</h2>
              <p className="text-gray-600">{supplier.contactPerson}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              title="Télécharger PDF"
              className="p-2 text-gray-600 hover:bg-orange-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrintPDF}
              title="Imprimer"
              className="p-2 text-gray-600 hover:bg-orange-100 rounded-lg transition-colors duration-200"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Modifier
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Supplier Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Informations de Contact</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{supplier.email}</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{supplier.phone}</span>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <span className="text-gray-900">{supplier.address}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Évaluation</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">Note:</span>
                    <div className="flex items-center space-x-1">
                      {renderStars(supplier.rating)}
                      <span className="text-sm text-gray-600 ml-2">({supplier.rating}/5)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                  >
                    Évaluer
                  </button>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-gray-600">Dernière commande:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(supplier.lastOrderDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Commandes</p>
                  <p className="text-2xl font-bold text-blue-900">{supplier.totalOrders}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Produits Fournis</p>
                  <p className="text-2xl font-bold text-green-900">{supplier.productsSupplied.length}</p>
                </div>
                <Package className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-yellow-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600 mb-1">Note Moyenne</p>
                  <p className="text-2xl font-bold text-yellow-900">{supplier.rating}/5</p>
                </div>
                <Star className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Products Supplied */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Produits Fournis</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {supplier.productsSupplied.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <Package className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{product}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex space-x-4">
              <button 
                onClick={() => setShowPurchaseForm(true)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Nouvelle Commande
              </button>
              <button 
                onClick={() => setShowOrdersList(true)}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                Voir Historique
              </button>
              <button className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors duration-200">
                Contacter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Order Form Modal */}
      {showPurchaseForm && (
        <PurchaseOrderForm
          supplier={supplier}
          onClose={() => setShowPurchaseForm(false)}
          onSave={async (orderData) => {
            try {
              console.log('Création commande:', orderData);
              const result = await purchaseOrdersAPI.create(orderData);
              if (result && result.success) {
                console.log('✅ Commande créée avec succès');
                handlePurchaseOrderSaved();
              } else {
                console.error('Erreur création commande:', result?.error);
              }
            } catch (err: any) {
              console.error('Erreur:', err);
            }
          }}
        />
      )}

      {/* Purchase Orders List Modal */}
      {showOrdersList && (
        <PurchaseOrdersList
          key={refreshKey}
          supplierId={supplier.id}
          supplierName={supplier.name}
          onClose={() => setShowOrdersList(false)}
        />
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <RatingModal
          supplier={supplier}
          onClose={() => setShowRatingModal(false)}
          onUpdate={handleRatingUpdated}
        />
      )}
    </div>
  );
};