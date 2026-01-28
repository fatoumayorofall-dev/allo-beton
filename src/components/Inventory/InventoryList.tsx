import React, { useState } from 'react';
import { Plus, Search, Filter, AlertTriangle, Package, Edit, RotateCcw } from 'lucide-react';
import { products } from '../../data/mockData';
import { Product } from '../../types';

interface InventoryListProps {
  onCreateProduct: () => void;
  onEditProduct: (product: Product) => void;
  onRestockProduct: (product: Product) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({ 
  onCreateProduct, 
  onEditProduct, 
  onRestockProduct 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category))];
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  const getStockStatus = (product: any) => {
    if (product.stock <= product.minStock) return 'low';
    if (product.stock <= product.minStock * 2) return 'medium';
    return 'good';
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-orange-600 bg-orange-50';
      case 'good': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Stock</h1>
          <p className="text-gray-600">Suivez vos stocks de béton et matériaux</p>
        </div>
        
        <button 
          onClick={onCreateProduct}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Produit</span>
        </button>
      </div>

      {/* Alert for low stock */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-red-800 font-medium">Alerte Stock Faible</h3>
          </div>
          <p className="text-red-700 text-sm">
            {lowStockProducts.length} produit(s) ont un stock critique. Pensez à vous réapprovisionner.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Toutes catégories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product);
          return (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-500">{product.category}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStockColor(stockStatus)}`}>
                    {stockStatus === 'low' ? 'Stock faible' : 
                     stockStatus === 'medium' ? 'Stock moyen' : 'Stock OK'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Prix unitaire:</span>
                    <span className="font-medium">{product.price.toLocaleString()} FCFA/{product.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Stock actuel:</span>
                    <span className={`font-medium ${stockStatus === 'low' ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.stock} {product.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Stock minimum:</span>
                    <span className="text-gray-600">{product.minStock} {product.unit}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
                  <button 
                    onClick={() => onEditProduct(product)}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors duration-200 flex items-center justify-center space-x-1"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                  <button 
                    onClick={() => onRestockProduct(product)}
                    className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-green-100 transition-colors duration-200 flex items-center justify-center space-x-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Réapprovisionner</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};