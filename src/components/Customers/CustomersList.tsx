import React, { useMemo, useState } from 'react';
import { Plus, Search, User, Phone, Mail, Building, Eye, Edit } from 'lucide-react';
import { Customer } from '../../types';
import { useDataContext } from '../../contexts/DataContext';

interface CustomersListProps {
  onCreateCustomer: () => void;
  onViewCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
}

export const CustomersList: React.FC<CustomersListProps> = ({
  onCreateCustomer,
  onViewCustomer,
  onEditCustomer
}) => {
  const { customers, loading, error, refreshCustomers } = useDataContext();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;

    return customers.filter((c: any) => {
      const name = (c?.name || '').toLowerCase();
      const email = (c?.email || '').toLowerCase();
      const company = (c?.company || '').toLowerCase();
      const phone = (c?.phone || '').toLowerCase();
      return (
        name.includes(term) ||
        email.includes(term) ||
        company.includes(term) ||
        phone.includes(term)
      );
    });
  }, [customers, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Clients</h1>
          <p className="text-gray-600">Gérez vos contacts clients</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshCustomers()}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            type="button"
          >
            Rafraîchir
          </button>

          <button
            onClick={onCreateCustomer}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Client</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher un client (nom, téléphone, email, société)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          <div className="font-semibold">Erreur</div>
          <div className="text-sm">{error}</div>
        </div>
      )}

      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg">
          Chargement des clients...
        </div>
      )}

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer: any) => {
          const balance = Number(customer?.balance ?? customer?.current_balance ?? 0);
          const creditLimit = Number(customer?.creditLimit ?? customer?.credit_limit ?? 0);

          return (
            <div
              key={customer.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                      {customer.company && (
                        <p className="text-sm text-gray-500 flex items-center">
                          <Building className="w-3 h-3 mr-1" />
                          {customer.company}
                        </p>
                      )}
                    </div>
                  </div>

                  {balance > 0 && (
                    <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                      Créance: {balance.toLocaleString()} FCFA
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {customer.email || <span className="text-gray-400">—</span>}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {customer.phone || <span className="text-gray-400">—</span>}
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  {customer.address || <span className="text-gray-400">Adresse non renseignée</span>}
                </div>

                <div className="flex justify-between items-center text-sm mb-4">
                  <div>
                    <span className="text-gray-500">Limite crédit:</span>
                    <span className="ml-1 font-medium">
                      {creditLimit.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => onViewCustomer(customer)}
                    className="flex-1 text-blue-600 hover:text-blue-700 transition-colors duration-200 text-sm font-medium flex items-center justify-center space-x-1"
                    type="button"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Voir</span>
                  </button>

                  <button
                    onClick={() => onEditCustomer(customer)}
                    className="flex-1 text-gray-600 hover:text-gray-700 transition-colors duration-200 text-sm font-medium flex items-center justify-center space-x-1"
                    type="button"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filteredCustomers.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          Aucun client trouvé.
        </div>
      )}
    </div>
  );
};

