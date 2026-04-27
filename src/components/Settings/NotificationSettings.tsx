import React, { useState, useEffect } from 'react';
import { 
  Bell, Smartphone, Mail, Save, CheckCircle, AlertCircle, Send, 
  Zap, Package, CreditCard, Truck, ShoppingBag, Shield, Clock,
  Sparkles, Volume2
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

interface NotificationPreference {
  id?: string;
  notification_type: 'sms' | 'email';
  event_type: string;
  enabled: boolean;
  phone_number?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const NotificationSettings: React.FC = () => {
  const { profile } = useAuthContext();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
  const [emailAddress, setEmailAddress] = useState(profile?.email || 'contact@allobeton.sn');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState<{ configured: boolean; message: string } | null>(null);
  const [gmailStatus, setGmailStatus] = useState<{ configured: boolean; message: string; user?: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const eventTypes = [
    { key: 'low_stock', label: 'Stock faible', description: 'Alerte quand un produit atteint le stock minimum', icon: Package, color: 'rose' },
    { key: 'new_sale', label: 'Nouvelle vente', description: 'Notification lors d\'une nouvelle vente', icon: ShoppingBag, color: 'emerald' },
    { key: 'payment_received', label: 'Paiement reçu', description: 'Confirmation de réception de paiement', icon: CreditCard, color: 'blue' },
    { key: 'delivery_scheduled', label: 'Livraison programmée', description: 'Rappel de livraison programmée', icon: Truck, color: 'amber' },
    { key: 'order_confirmed', label: 'Commande confirmée', description: 'Confirmation de commande client', icon: Zap, color: 'violet' },
  ];

  useEffect(() => {
    loadPreferences();
    checkTwilioStatus();
    checkGmailStatus();
  }, []);

  const checkGmailStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/notifications/email/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await response.json();
      setGmailStatus({
        configured: data.gmailConfigured,
        message: data.message,
        user: data.gmailUser
      });
    } catch (error) {
      console.error('Erreur vérification Gmail:', error);
      setGmailStatus({ configured: false, message: 'Impossible de vérifier le statut du service Email' });
    }
  };

  const checkTwilioStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/notifications/sms/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await response.json();
      setTwilioStatus({ configured: data.twilioConfigured, message: data.message });
    } catch (error) {
      console.error('Erreur vérification Twilio:', error);
      setTwilioStatus({ configured: false, message: 'Impossible de vérifier le statut du service SMS' });
    }
  };

  const loadPreferences = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        initDefaultPreferences();
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success && result.data) {
        if (result.data.phoneNumber) setPhoneNumber(result.data.phoneNumber);
        if (result.data.preferences && result.data.preferences.length > 0) {
          const prefs = result.data.preferences.map((p: any) => ({
            notification_type: p.notification_type,
            event_type: p.event_type,
            enabled: p.enabled === 1 || p.enabled === true
          }));
          setPreferences(prefs);
        } else {
          initDefaultPreferences();
        }
      } else {
        initDefaultPreferences();
      }
    } catch (error) {
      console.error('Erreur chargement préférences:', error);
      initDefaultPreferences();
    } finally {
      setLoading(false);
    }
  };

  const initDefaultPreferences = () => {
    const defaultPrefs: NotificationPreference[] = [];
    eventTypes.forEach(eventType => {
      ['sms', 'email'].forEach(notificationType => {
        defaultPrefs.push({
          notification_type: notificationType as 'sms' | 'email',
          event_type: eventType.key,
          enabled: notificationType === 'sms',
        });
      });
    });
    setPreferences(defaultPrefs);
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
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setMessage({ type: 'error', text: 'Session expirée. Veuillez vous reconnecter.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ preferences, phoneNumber })
      });

      if (!response.ok) {
        setMessage({ type: 'error', text: `Erreur serveur: ${response.status}` });
        return;
      }

      const result = await response.json();
      if (result.success) {
        setMessage({ type: 'success', text: 'Préférences sauvegardées avec succès !' });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de la sauvegarde' });
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      setMessage({ type: 'error', text: `Erreur de connexion: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const sendTestSms = async () => {
    if (!phoneNumber) {
      setMessage({ type: 'error', text: 'Veuillez entrer un numéro de téléphone' });
      return;
    }

    setTestingSms(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/notifications/sms/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber,
          message: '🔔 Test ALLO BÉTON - Vos notifications SMS fonctionnent correctement !'
        })
      });

      const result = await response.json();
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.simulated ? 'SMS simulé avec succès ! (Twilio non configuré)' : 'SMS de test envoyé avec succès !' 
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de l\'envoi du SMS' });
      }
    } catch (error: any) {
      console.error('Erreur envoi SMS test:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'envoi du SMS' });
    } finally {
      setTestingSms(false);
    }
  };

  const sendTestEmail = async () => {
    if (!emailAddress) {
      setMessage({ type: 'error', text: 'Veuillez entrer une adresse email' });
      return;
    }

    setTestingEmail(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/notifications/email/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: emailAddress,
          subject: '🔔 Test ALLO BÉTON',
          message: 'Ceci est un email de test du système Allo Béton. Vos notifications email fonctionnent correctement !'
        })
      });

      const result = await response.json();
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.simulated ? 'Email simulé avec succès !' : 'Email de test envoyé avec succès !' 
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de l\'envoi de l\'email' });
      }
    } catch (error: any) {
      console.error('Erreur envoi email test:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'envoi de l\'email' });
    } finally {
      setTestingEmail(false);
    }
  };

  const smsCount = preferences.filter(p => p.notification_type === 'sms' && p.enabled).length;
  const emailCount = preferences.filter(p => p.notification_type === 'email' && p.enabled).length;

  const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
    rose: { bg: 'bg-rose-100', icon: 'text-rose-600', border: 'border-rose-200' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'border-emerald-200' },
    blue: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-orange-200' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-amber-200' },
    violet: { bg: 'bg-violet-100', icon: 'text-violet-600', border: 'border-violet-200' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 font-medium">Chargement des notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 p-5 border-b border-gray-50">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Centre de Notifications</h3>
            <p className="text-sm text-gray-500">Gérez vos alertes SMS et Email en temps réel</p>
          </div>
        </div>
        
        <div className="p-5 bg-gradient-to-br from-gray-50/50 to-slate-50/30">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{smsCount}</p>
                <p className="text-xs text-gray-500">SMS actifs</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{emailCount}</p>
                <p className="text-xs text-gray-500">Emails actifs</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{smsCount + emailCount}</p>
                <p className="text-xs text-gray-500">Total actifs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - SMS & Email Config */}
        <div className="space-y-5">
          {/* SMS Config */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-cyan-50 border-b border-orange-100">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Configuration SMS</h4>
                <p className="text-xs text-gray-500">Numéro pour les alertes</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {twilioStatus && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  twilioStatus.configured 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <Shield className="w-4 h-4" />
                  {twilioStatus.configured ? 'Service connecté' : 'Mode simulation'}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Numéro de téléphone</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all"
                  placeholder="+221 77 123 45 67"
                />
              </div>

              <button
                type="button"
                onClick={sendTestSms}
                disabled={testingSms || !phoneNumber}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-cyan-500 text-white rounded-xl hover:from-orange-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-orange-200/50"
              >
                {testingSms ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Envoyer SMS test</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Email Config */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Configuration Email</h4>
                <p className="text-xs text-gray-500">Adresse pour les notifications</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {gmailStatus && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  gmailStatus.configured 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-violet-50 text-violet-700 border border-violet-200'
                }`}>
                  <Shield className="w-4 h-4" />
                  {gmailStatus.configured ? 'Service connecté' : 'Mode simulation'}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Adresse email</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-violet-500/20 transition-all"
                  placeholder="contact@email.com"
                />
              </div>

              <button
                type="button"
                onClick={sendTestEmail}
                disabled={testingEmail || !emailAddress}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-violet-200/50"
              >
                {testingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Envoyer Email test</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pro Tip */}
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <h4 className="font-bold text-indigo-800">Astuce Pro</h4>
            </div>
            <p className="text-sm text-indigo-700 leading-relaxed">
              Activez les notifications SMS pour les événements critiques comme le stock faible pour ne jamais manquer une alerte importante.
            </p>
          </div>
        </div>

        {/* Right Column - Event Preferences */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Événements & Alertes</h4>
                  <p className="text-sm text-gray-500">Personnalisez vos notifications</p>
                </div>
              </div>
              <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold">
                {eventTypes.length} types
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {eventTypes.map((eventType) => {
                const smsEnabled = preferences.find(
                  p => p.event_type === eventType.key && p.notification_type === 'sms'
                )?.enabled || false;

                const emailEnabled = preferences.find(
                  p => p.event_type === eventType.key && p.notification_type === 'email'
                )?.enabled || false;

                const colors = colorClasses[eventType.color] || colorClasses.blue;
                const Icon = eventType.icon;

                return (
                  <div key={eventType.key} className="flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center border ${colors.border} group-hover:scale-105 transition-transform`}>
                        <Icon className={`w-6 h-6 ${colors.icon}`} />
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900">{eventType.label}</h5>
                        <p className="text-sm text-gray-500">{eventType.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      {/* SMS Toggle */}
                      <div className="flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updatePreference(eventType.key, 'sms', !smsEnabled)}
                          className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                            smsEnabled 
                              ? 'bg-gradient-to-r from-orange-500 to-cyan-500 shadow-lg shadow-orange-200/50' 
                              : 'bg-gray-200'
                          }`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${
                            smsEnabled ? 'left-7' : 'left-1'
                          }`}>
                            <Smartphone className={`w-3.5 h-3.5 ${smsEnabled ? 'text-orange-500' : 'text-gray-400'}`} />
                          </div>
                        </button>
                        <span className={`text-xs font-bold uppercase tracking-wide ${smsEnabled ? 'text-orange-600' : 'text-gray-400'}`}>
                          SMS
                        </span>
                      </div>

                      {/* Email Toggle */}
                      <div className="flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updatePreference(eventType.key, 'email', !emailEnabled)}
                          className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                            emailEnabled 
                              ? 'bg-gradient-to-r from-violet-500 to-purple-500 shadow-lg shadow-violet-200/50' 
                              : 'bg-gray-200'
                          }`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${
                            emailEnabled ? 'left-7' : 'left-1'
                          }`}>
                            <Mail className={`w-3.5 h-3.5 ${emailEnabled ? 'text-violet-500' : 'text-gray-400'}`} />
                          </div>
                        </button>
                        <span className={`text-xs font-bold uppercase tracking-wide ${emailEnabled ? 'text-violet-600' : 'text-gray-400'}`}>
                          Email
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>N'oubliez pas de sauvegarder</span>
              </div>
              <button
                type="button"
                onClick={savePreferences}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:via-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold shadow-lg shadow-indigo-200/50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Sauvegarder les préférences</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
