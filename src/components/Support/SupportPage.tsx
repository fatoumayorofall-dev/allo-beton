import React, { useState } from 'react';
import { X, HelpCircle, MessageCircle, Phone, Mail, Book, Video, FileText } from 'lucide-react';

interface SupportPageProps {
  onClose: () => void;
}

export const SupportPage: React.FC<SupportPageProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('faq');
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });

  const faqs = [
    {
      question: "Comment ajouter un nouveau produit ?",
      answer: "Allez dans la section Stock, cliquez sur 'Nouveau Produit' et remplissez les informations requises."
    },
    {
      question: "Comment modifier le taux de TVA ?",
      answer: "Rendez-vous dans Paramètres > Général et modifiez le taux de TVA. Il est actuellement fixé à 18%."
    },
    {
      question: "Comment gérer les alertes de stock ?",
      answer: "Dans chaque produit, définissez un stock minimum. Le système vous alertera automatiquement."
    },
    {
      question: "Comment créer une nouvelle vente ?",
      answer: "Cliquez sur 'Nouvelle Vente' dans la section Ventes, sélectionnez un client et ajoutez les produits."
    },
    {
      question: "Comment suivre les paiements ?",
      answer: "La section Paiements vous permet de voir tous les encaissements et créances en cours."
    }
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Message de support envoyé:', contactForm);
    setContactForm({ subject: '', message: '', priority: 'normal' });
    alert('Votre message a été envoyé. Nous vous répondrons dans les plus brefs délais.');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'faq':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Questions Fréquentes</h3>
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg">
                <details className="group">
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200">
                    <span className="font-medium text-gray-900">{faq.question}</span>
                    <HelpCircle className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform duration-200" />
                  </summary>
                  <div className="px-4 pb-4 text-gray-600">
                    {faq.answer}
                  </div>
                </details>
              </div>
            ))}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Contactez le Support</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <Phone className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h4 className="font-medium text-gray-900 mb-2">Téléphone</h4>
                <p className="text-sm text-gray-600">+221 33 123 45 67</p>
                <p className="text-xs text-gray-500 mt-1">Lun-Ven 8h-18h</p>
              </div>
              
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <Mail className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h4 className="font-medium text-gray-900 mb-2">Email</h4>
                <p className="text-sm text-gray-600">support@allobeton.sn</p>
                <p className="text-xs text-gray-500 mt-1">Réponse sous 24h</p>
              </div>
              
              <div className="text-center p-6 bg-purple-50 rounded-lg">
                <MessageCircle className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h4 className="font-medium text-gray-900 mb-2">Chat</h4>
                <p className="text-sm text-gray-600">Chat en direct</p>
                <p className="text-xs text-gray-500 mt-1">Disponible maintenant</p>
              </div>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sujet
                </label>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Décrivez brièvement votre problème"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <select
                  value={contactForm.priority}
                  onChange={(e) => setContactForm(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Faible</option>
                  <option value="normal">Normale</option>
                  <option value="high">Élevée</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Décrivez votre problème en détail..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Envoyer le Message
              </button>
            </form>
          </div>
        );

      case 'guides':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Guides d'Utilisation</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <Book className="w-8 h-8 text-blue-600 mb-3" />
                <h4 className="font-medium text-gray-900 mb-2">Guide de Démarrage</h4>
                <p className="text-sm text-gray-600 mb-4">Apprenez les bases d'Allo Béton en 10 minutes</p>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Lire le guide →
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <Video className="w-8 h-8 text-green-600 mb-3" />
                <h4 className="font-medium text-gray-900 mb-2">Tutoriels Vidéo</h4>
                <p className="text-sm text-gray-600 mb-4">Regardez nos tutoriels pas à pas</p>
                <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                  Voir les vidéos →
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <FileText className="w-8 h-8 text-purple-600 mb-3" />
                <h4 className="font-medium text-gray-900 mb-2">Documentation</h4>
                <p className="text-sm text-gray-600 mb-4">Documentation complète de l'application</p>
                <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                  Consulter →
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                <MessageCircle className="w-8 h-8 text-orange-600 mb-3" />
                <h4 className="font-medium text-gray-900 mb-2">Forum Communauté</h4>
                <p className="text-sm text-gray-600 mb-4">Échangez avec d'autres utilisateurs</p>
                <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                  Rejoindre →
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Aide & Support</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200">
            <nav className="p-4 space-y-2">
              <button
                onClick={() => setActiveTab('faq')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                  activeTab === 'faq' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">FAQ</span>
              </button>
              
              <button
                onClick={() => setActiveTab('contact')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                  activeTab === 'contact' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="font-medium">Contact</span>
              </button>
              
              <button
                onClick={() => setActiveTab('guides')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                  activeTab === 'guides' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Book className="w-5 h-5" />
                <span className="font-medium">Guides</span>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};