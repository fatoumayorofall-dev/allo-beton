import React, { useState, useEffect } from 'react';
import { Bell, Smartphone, Mail, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';

interface NotificationPreference {
  id?: string;
  notification_type: 'sms' | 'email';
  event_type: string;
  enabled: boolean;
  phone_number?: string;
}

export const NotificationSettings: React.FC = () => {
  const { user, profile } = useAuthContext();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const eventTypes = [
    { key: 'low_stock', label: 'Stock faible', description: 'Alerte quand un produit atteint le stock minimum' },
    { key: 'new_sale', label: 'Nouvelle vente', description: 'Notification lors d\'une nouvelle vente' },
    { key: 'payment_received', label: 'Paiement reçu', description: 'Confirmation de réception de paiement' },
    { key: 'delivery_scheduled', label: 'Livraison programmée', description: 'Rappel de livraison programmée' },
    { key: 'order_confirmed', label: 'Commande confirmée', description: 'Confirmation de commande client' },
  ];

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Créer les préférences par défaut si elles n'existent pas
      const existingPrefs = data || [];
      const defaultPrefs: NotificationPreference[] = [];

      eventTypes.forEach(eventType => {
        ['sms', 'email'].forEach(notificationType => {
          const existing = existingPrefs.find(
            p => p.event_type === eventType.key && p.notification_type === notificationType
          );
          
          if (existing) {
            defaultPrefs.push(existing);
          } else {
            defaultPrefs.push({
              notification_type: notificationType as 'sms' | 'email',
              event_type: eventType.key,
              enabled: notificationType === 'sms' ? true : false, // SMS activé par défaut
            });
          }
        });
      });

      setPreferences(defaultPrefs);
    } catch (error) {
      console.error('Erreur chargement préférences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (eventType: string, notificationType: 'sms' | 'email', enabled: boolean) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.event_type === eventType && pref.notification_type === notificationType
          ? { ...pref, enabled }
          : pref
      )
    );
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Mettre à jour le numéro de téléphone dans le profil
      if (phoneNumber !== profile?.phone) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ phone: phoneNumber })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // Supprimer les anciennes préférences
      await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', user.id);

      // Insérer les nouvelles préférences
      const prefsToInsert = preferences.map(pref => ({
        user_id: user.id,
        notification_type: pref.notification_type,
        event_type: pref.event_type,
        enabled: pref.enabled,
        phone_number: pref.notification_type === 'sms' ? phoneNumber : null,
      }));

      const { error } = await supabase
        .from('notification_preferences')
        .insert(prefsToInsert);

      if (error) throw error;

      alert('Préférences sauvegardées avec succès !');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Préférences de Notifications</h2>
        <p className="text-gray-600">Configurez comment vous souhaitez être notifié des événements importants</p>
      </div>

      {/* Numéro de téléphone */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Smartphone className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Numéro de téléphone</h3>
        </div>
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Numéro pour les SMS
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="77 123 45 67"
          />
          <p className="text-sm text-gray-500 mt-1">
            Format: 77 123 45 67 (Sénégal)
          </p>
        </div>
      </div>

      {/* Préférences par événement */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Notifications par événement</h3>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {eventTypes.map((eventType) => {
            const smsEnabled = preferences.find(
              p => p.event_type === eventType.key && p.notification_type === 'sms'
            )?.enabled || false;

            const emailEnabled = preferences.find(
              p => p.event_type === eventType.key && p.notification_type === 'email'
            )?.enabled || false;

            return (
              <div key={eventType.key} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{eventType.label}</h4>
                    <p className="text-sm text-gray-500 mt-1">{eventType.description}</p>
                  </div>
                  
                  <div className="flex items-center space-x-6 ml-4">
                    {/* SMS Toggle */}
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-gray-400" />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smsEnabled}
                          onChange={(e) => updatePreference(eventType.key, 'sms', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <span className="text-sm text-gray-600">SMS</span>
                    </div>

                    {/* Email Toggle */}
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailEnabled}
                          onChange={(e) => updatePreference(eventType.key, 'email', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <span className="text-sm text-gray-600">Email</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
        </button>
      </div>
    </div>
  );
};