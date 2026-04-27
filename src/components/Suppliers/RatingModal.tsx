import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { Supplier } from '../../types';
import { suppliersAPI } from '../../services/mysql-api';

interface RatingModalProps {
  supplier: Supplier;
  onClose: () => void;
  onUpdate: () => void;
}

const RATING_OPTIONS = [
  { value: 1, label: 'Mauvaise', icon: '😞', color: 'from-red-500 to-red-600', bgColor: 'hover:bg-red-50' },
  { value: 2, label: 'Faible', icon: '😐', color: 'from-orange-500 to-orange-600', bgColor: 'hover:bg-orange-50' },
  { value: 3, label: 'Bonne', icon: '🙂', color: 'from-yellow-500 to-yellow-600', bgColor: 'hover:bg-yellow-50' },
  { value: 4, label: 'Très Bonne', icon: '😊', color: 'from-orange-500 to-orange-600', bgColor: 'hover:bg-orange-50' },
  { value: 5, label: 'Excellente', icon: '🤩', color: 'from-green-500 to-green-600', bgColor: 'hover:bg-green-50' },
];

export const RatingModal: React.FC<RatingModalProps> = ({ supplier, onClose, onUpdate }) => {
  const [selectedRating, setSelectedRating] = useState<number>(Math.round(supplier.rating ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSaveRating = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      console.log('📝 Tentative de mise à jour - Supplier ID:', supplier.id);
      console.log('📝 Nouvelle note:', selectedRating);

      const result = await suppliersAPI.update(supplier.id, {
        rating: selectedRating
      });

      console.log('✅ Réponse du serveur:', result);

      if (result.success) {
        setSuccess(true);
        console.log('✅ Note mise à jour avec succès:', selectedRating);
        setTimeout(() => {
          onUpdate();
          onClose();
        }, 1000);
      } else {
        setError(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err: any) {
      console.error('❌ Erreur mise à jour note:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const currentOption = RATING_OPTIONS.find(opt => opt.value === selectedRating);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all">
        {/* Header avec gradient */}
        <div className={`bg-gradient-to-r ${currentOption?.color || 'from-gray-500 to-gray-600'} p-6 text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Évaluer le Fournisseur</h2>
              <p className="text-white text-opacity-90 text-sm mt-1">{supplier.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white text-opacity-80 hover:text-opacity-100 transition-all transform hover:scale-110"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Affichage de la note actuelle */}
          <div className="text-center py-2">
            <div className="text-5xl mb-3">{currentOption?.icon || '⭐'}</div>
            <div className="flex justify-center gap-1 mb-4">
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  className={`w-6 h-6 transition-all ${
                    index < selectedRating
                      ? 'text-yellow-400 fill-yellow-400 scale-110'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-3xl font-bold text-gray-900">{selectedRating}/5</p>
            <p className="text-sm text-gray-600 mt-1 font-medium">{currentOption?.label || 'Sélectionnez une note'}</p>
          </div>

          {/* Options de notation - Grid compact */}
          <div className="grid grid-cols-5 gap-2">
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedRating(option.value)}
                className={`p-3 rounded-xl border-2 transition-all transform hover:scale-105 ${
                  selectedRating === option.value
                    ? `bg-gradient-to-br ${option.color} text-white border-gray-900 shadow-lg scale-105`
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-xs font-semibold">{option.value}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Messages de succès/erreur */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <div className="text-2xl">✅</div>
              <div>
                <p className="text-sm font-semibold text-green-800">Note enregistrée avec succès!</p>
                <p className="text-xs text-green-700">La note du fournisseur a été mise à jour.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <div className="text-2xl">❌</div>
              <div>
                <p className="text-sm font-semibold text-red-800">Erreur d'enregistrement</p>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveRating}
              disabled={loading || success}
              className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-all transform text-sm ${
                success
                  ? 'bg-green-600 hover:bg-green-700'
                  : currentOption
                  ? `bg-gradient-to-r ${currentOption.color} hover:shadow-lg`
                  : 'bg-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {loading ? 'Enregistrement...' : success ? 'Enregistré ✓' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
