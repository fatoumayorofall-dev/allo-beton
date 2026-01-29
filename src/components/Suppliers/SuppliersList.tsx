import React, { useState } from 'react';
import { Plus, Search, Truck, Phone, Mail, Star, Calendar, Package, Eye, Edit } from 'lucide-react';
import { Supplier } from '../../types';
import { useDataContext } from '../../contexts/DataContext';

interface SuppliersListProps {
  onCreateSupplier: () => void;
  onViewSupplier: (supplier: Supplier) => void;
  onEditSupplier: (supplier: Supplier) => void;
}

export const SuppliersList: React.FC<SuppliersListProps> = ({ 
  onCreateSupplier, 
  onViewSupplier, 
  onEditSupplier 
}) => {
  const { suppliers } = useDataContext();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (supplier.productsSupplied?.some(product => 
      product.toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? false)
  );

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Fournisseurs</h1>
          <p className="text-gray-600">Gérez vos partenaires et fournisseurs</p>
        </div>
        
        <button 
          onClick={onCreateSupplier}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Fournisseur</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Suppliers Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Fournisseurs</p>
              <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Commandes Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {suppliers.reduce((sum, supplier) => sum + (supplier.totalOrders ?? 0), 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Note Moyenne</p>
              <p className="text-2xl font-bold text-gray-900">
                {(suppliers.length > 0 ? (suppliers.reduce((sum, supplier) => sum + (supplier.rating ?? 0), 0) / suppliers.length).toFixed(1) : '0.0')}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Fournisseurs Actifs</p>
              <p className="text-2xl font-bold text-gray-900">
                {suppliers.filter(s => s.lastOrderDate && new Date(s.lastOrderDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                    <p className="text-sm text-gray-500">{supplier.contact_person ?? ''}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {renderStars(supplier.rating ?? 0)}
                  <span className="text-sm text-gray-600 ml-1">({supplier.rating ?? 0})</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  {supplier.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  {supplier.phone}
                </div>
              </div>
              
              <div className="text-xs text-gray-500 mb-4">
                {supplier.address}
              </div>

              {/* Products Supplied */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Produits fournis:</p>
                <div className="flex flex-wrap gap-1">
                  {supplier.productsSupplied?.slice(0, 3).map((product, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      {product}
                    </span>
                  ))}
                  {supplier.productsSupplied && supplier.productsSupplied.length > 3 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      +{supplier.productsSupplied.length - 3}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm mb-4">
                <div>
                  <span className="text-gray-500">Commandes:</span>
                  <span className="ml-1 font-medium">{supplier.totalOrders ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Dernière:</span>
                  <span className="ml-1 font-medium">
                    {supplier.lastOrderDate ? new Date(supplier.lastOrderDate).toLocaleDateString('fr-FR') : ''}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => onViewSupplier(supplier)}
                  className="flex-1 text-blue-600 hover:text-blue-700 transition-colors duration-200 text-sm font-medium flex items-center justify-center space-x-1"
                >
                  <Eye className="w-4 h-4" />
                  <span>Voir Détails</span>
                </button>
                <button 
                  onClick={() => onEditSupplier(supplier)}
                  className="flex-1 text-gray-600 hover:text-gray-700 transition-colors duration-200 text-sm font-medium flex items-center justify-center space-x-1"
                >
                  <Edit className="w-4 h-4" />
                  <span>Modifier</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};