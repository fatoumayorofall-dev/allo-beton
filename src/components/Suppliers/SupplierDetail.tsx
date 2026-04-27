import React, { useState } from 'react';
import { X, Building2, Mail, Phone, MapPin, Star, Calendar, Package, ShoppingCart, Download, Printer, Award, TrendingUp, Edit3 } from 'lucide-react';
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
        className={`w-3.5 h-3.5 ${
          index < Math.floor(rating) 
            ? 'text-amber-400 fill-current' 
            : index < rating 
            ? 'text-amber-400 fill-current opacity-50' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const rating = Number(supplier.rating) || 0;
  const isTop = rating >= 4;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                isTop ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-white/20'
              }`}>
                {isTop ? <Award className="w-5 h-5" /> : supplier.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">{supplier.name}</h2>
                <p className="text-[11px] text-white/80">{supplier.contactPerson || supplier.contact_person}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                title="Télécharger PDF"
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handlePrintPDF}
                title="Imprimer"
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-teal-600 rounded-lg text-xs font-semibold hover:bg-teal-50 transition-all"
              >
                Modifier
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-5 space-y-4">
            {/* Contact & Evaluation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-5 h-5 bg-teal-100 rounded flex items-center justify-center">
                    <Building2 className="w-3 h-3 text-teal-600" />
                  </div>
                  Informations de Contact
                </h3>
                <div className="space-y-2">
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[11px] text-gray-700">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[11px] text-gray-700">{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[11px] text-gray-700">{supplier.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Evaluation */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center">
                    <Star className="w-3 h-3 text-amber-600" />
                  </div>
                  Évaluation
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-600">Note:</span>
                      <div className="flex items-center gap-0.5">
                        {renderStars(rating)}
                      </div>
                      <span className="text-[10px] text-gray-500">({rating.toFixed(1)}/5)</span>
                    </div>
                    <button
                      onClick={() => setShowRatingModal(true)}
                      className="px-2 py-1 text-[10px] font-medium bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                    >
                      Évaluer
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[11px] text-gray-600">Dernière commande:</span>
                    <span className="text-[11px] font-medium text-gray-800">
                      {supplier.lastOrderDate ? new Date(supplier.lastOrderDate).toLocaleDateString('fr-FR') : 'Aucune'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-3 border border-orange-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-orange-600 mb-0.5">Total Commandes</p>
                    <p className="text-xl font-bold text-orange-800">{supplier.totalOrders || 0}</p>
                  </div>
                  <div className="w-9 h-9 bg-orange-200/50 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 border border-emerald-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-emerald-600 mb-0.5">Produits Fournis</p>
                    <p className="text-xl font-bold text-emerald-800">{supplier.productsSupplied?.length || 0}</p>
                  </div>
                  <div className="w-9 h-9 bg-emerald-200/50 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-3 border border-amber-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-amber-600 mb-0.5">Note Moyenne</p>
                    <p className="text-xl font-bold text-amber-800">{rating.toFixed(1)}/5</p>
                  </div>
                  <div className="w-9 h-9 bg-amber-200/50 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Products Supplied */}
            {supplier.productsSupplied && supplier.productsSupplied.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-5 h-5 bg-teal-100 rounded flex items-center justify-center">
                    <Package className="w-3 h-3 text-teal-600" />
                  </div>
                  Produits Fournis
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {supplier.productsSupplied.map((product, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-700"
                    >
                      <Package className="w-3 h-3 text-teal-500" />
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <button 
                onClick={() => setShowPurchaseForm(true)}
                className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-xs font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Nouvelle Commande
              </button>
              <button 
                onClick={() => setShowOrdersList(true)}
                className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-xs font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Voir Historique
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl text-xs font-semibold hover:from-gray-700 hover:to-gray-800 transition-all shadow-sm">
                <Mail className="w-3.5 h-3.5" />
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