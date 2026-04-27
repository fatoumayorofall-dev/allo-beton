/**
 * ALLO BÉTON — CHATBOT EN LIGNE — 2026
 * Assistant virtuel avec réponses automatiques FAQ,
 * transfert WhatsApp et historique de conversation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Bot, User, Phone,
  ChevronDown, Loader2, ExternalLink, Package,
  Truck, CreditCard, Clock, HelpCircle, ShoppingBag,
} from 'lucide-react';
import { SITE_CONFIG } from './siteConfig';

/* ================================================================
   TYPES
   ================================================================ */

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
  timestamp: Date;
  quickReplies?: QuickReply[];
}

interface QuickReply {
  label: string;
  value: string;
  icon?: React.ElementType;
}

/* ================================================================
   BASE DE CONNAISSANCES — FAQ
   ================================================================ */

interface FAQEntry {
  keywords: string[];
  response: string;
  quickReplies?: QuickReply[];
}

const FAQ_DATABASE: FAQEntry[] = [
  {
    keywords: ['bonjour', 'salut', 'hello', 'bonsoir', 'hey', 'coucou', 'hi'],
    response: 'Bonjour et bienvenue chez Allo Béton ! 👋 Je suis votre assistant virtuel. Comment puis-je vous aider aujourd\'hui ?',
    quickReplies: [
      { label: '📦 Produits', value: 'Quels produits proposez-vous ?', icon: Package },
      { label: '🚚 Livraison', value: 'Quels sont les délais de livraison ?', icon: Truck },
      { label: '💳 Paiement', value: 'Quels modes de paiement acceptez-vous ?', icon: CreditCard },
      { label: '📞 Contact', value: 'Je veux parler à un conseiller', icon: Phone },
    ],
  },
  {
    keywords: ['produit', 'catalogue', 'béton', 'beton', 'ciment', 'granulat', 'fer', 'armature', 'adjuvant', 'proposez', 'vendez', 'gamme'],
    response: 'Nous proposons une large gamme de matériaux de construction :\n\n🏗️ **Bétons** — B15, B20, B25, B30 (prêts à l\'emploi)\n🪨 **Granulats** — Sable, gravier, concassé\n🧱 **Ciments** — CEM I, CEM II, ciment blanc\n🔩 **Fers & Armatures** — Ronds à béton, treillis soudés\n🧪 **Adjuvants** — Plastifiants, accélérateurs, retardateurs\n\nParcourez notre catalogue pour voir tous les détails et les prix !',
    quickReplies: [
      { label: '💰 Prix', value: 'Quels sont vos prix ?', icon: CreditCard },
      { label: '🚚 Livraison', value: 'Livrez-vous à Dakar ?', icon: Truck },
      { label: '📞 Devis', value: 'Je voudrais un devis personnalisé', icon: Phone },
    ],
  },
  {
    keywords: ['prix', 'tarif', 'coût', 'cout', 'combien', 'cher'],
    response: 'Nos prix varient selon les produits et les quantités commandées. Voici quelques exemples :\n\n• Béton B25 : à partir de **85 000 F/m³**\n• Ciment CEM II : à partir de **4 500 F/sac**\n• Fer à béton : selon le diamètre\n\n💡 **Conseil** : Pour les grandes quantités, nous proposons des remises professionnelles. Contactez-nous pour un devis personnalisé !',
    quickReplies: [
      { label: '📋 Devis', value: 'Je voudrais un devis personnalisé', icon: HelpCircle },
      { label: '🛒 Commander', value: 'Comment passer commande ?', icon: ShoppingBag },
    ],
  },
  {
    keywords: ['livraison', 'livrez', 'délai', 'delai', 'quand', 'expedition', 'expédition', 'recevoir'],
    response: '🚚 **Livraison Allo Béton** :\n\n• **Dakar & banlieue** : Livraison sous 24-48h\n• **Régions du Sénégal** : 3-5 jours ouvrés\n• **Livraison gratuite** dès 500 000 F CFA d\'achat\n• Possibilité de livraison express sur demande\n\nNos camions sont équipés pour le transport sécurisé de tous vos matériaux.',
    quickReplies: [
      { label: '📍 Zones', value: 'Quelles zones livrez-vous ?', icon: Truck },
      { label: '💰 Gratuite ?', value: 'La livraison est-elle gratuite ?', icon: CreditCard },
    ],
  },
  {
    keywords: ['zone', 'lieu', 'adresse', 'dakar', 'banlieue', 'région', 'region', 'sénégal', 'senegal', 'où', 'ou'],
    response: '📍 Nous livrons dans tout le Sénégal !\n\n• **Dakar** : Plateau, Almadies, Mermoz, Ouakam, Yoff, Ngor...\n• **Banlieue** : Pikine, Guédiawaye, Keur Massar, Rufisque, Diamniadio...\n• **Régions** : Thiès, Saint-Louis, Mbour, Kaolack, Ziguinchor...\n\n📌 Notre adresse : Zone industrielle, Dakar, Sénégal\n\nPour les chantiers éloignés, contactez-nous pour organiser la livraison.',
  },
  {
    keywords: ['paiement', 'payer', 'payment', 'wave', 'orange money', 'carte', 'visa', 'mastercard', 'espèce', 'cash'],
    response: '💳 **Modes de paiement acceptés** :\n\n• 📱 **Wave** — Paiement mobile instantané\n• 📱 **Orange Money** — Mobile money\n• 📱 **Free Money** — Mobile money\n• 💳 **Carte bancaire** — Visa / Mastercard (3D Secure)\n• 💵 **Espèces** — Paiement à la livraison\n\nTous nos paiements en ligne sont 100% sécurisés.',
    quickReplies: [
      { label: '🛒 Commander', value: 'Comment passer commande ?', icon: ShoppingBag },
      { label: '🔒 Sécurité', value: 'Le paiement est-il sécurisé ?', icon: HelpCircle },
    ],
  },
  {
    keywords: ['commande', 'commander', 'acheter', 'comment', 'processus', 'étape', 'passer'],
    response: '🛒 **Comment commander** :\n\n1️⃣ Parcourez le **catalogue** et ajoutez vos produits au panier\n2️⃣ Vérifiez votre **panier** et les quantités\n3️⃣ Renseignez votre **adresse de livraison**\n4️⃣ Choisissez votre **mode de paiement**\n5️⃣ Confirmez et recevez votre **facture** automatiquement !\n\n💡 Vous pouvez aussi commander directement via **WhatsApp** !',
    quickReplies: [
      { label: '📱 WhatsApp', value: 'Commander via WhatsApp', icon: MessageCircle },
      { label: '📦 Catalogue', value: 'Voir les produits', icon: Package },
    ],
  },
  {
    keywords: ['whatsapp', 'whatapp', 'whasap', 'message'],
    response: `📱 **Commande via WhatsApp** :\n\nCliquez sur le bouton WhatsApp en bas de page ou contactez-nous directement au **${SITE_CONFIG.whatsapp}**.\n\nEnvoyez-nous :\n• Le nom des produits souhaités\n• Les quantités\n• Votre adresse de livraison\n\nNotre équipe vous répondra rapidement avec un devis et la confirmation !`,
  },
  {
    keywords: ['sécuris', 'securis', 'fiable', 'confiance', 'arnaque', 'sûr', 'sur'],
    response: '🔒 **Sécurité garantie** :\n\n• Paiements cryptés **SSL** et **3D Secure**\n• Partenariat avec **PayDunya** (leader du paiement au Sénégal)\n• Factures générées automatiquement\n• Service client réactif\n• Plus de **10 ans d\'expérience** dans le BTP au Sénégal\n\nVotre confiance est notre priorité.',
  },
  {
    keywords: ['horaire', 'heure', 'ouvert', 'ouverture', 'fermeture', 'fermé', 'disponible', 'quand joindre'],
    response: '🕐 **Horaires d\'ouverture** :\n\n• **Lundi – Vendredi** : 8h00 – 18h00\n• **Samedi** : 8h00 – 13h00\n• **Dimanche** : Fermé\n\n📱 Le chatbot est disponible 24h/24 !\n📞 Service client : ' + SITE_CONFIG.phone,
  },
  {
    keywords: ['devis', 'estimation', 'projet', 'personnalis', 'gros', 'quantité', 'professionnel', 'entreprise', 'chantier'],
    response: '📋 **Devis personnalisé** :\n\nPour les projets importants ou les professionnels du BTP, nous proposons :\n\n• 📊 **Devis gratuit** sous 24h\n• 💰 **Remises volume** pour grandes quantités\n• 🤝 **Compte professionnel** avec facilités de paiement\n• 🚚 **Livraison planifiée** sur chantier\n\nContactez notre service commercial pour votre devis !',
    quickReplies: [
      { label: '📞 Appeler', value: 'Je veux parler à un conseiller', icon: Phone },
      { label: '📱 WhatsApp', value: 'Commander via WhatsApp', icon: MessageCircle },
    ],
  },
  {
    keywords: ['retour', 'rembours', 'annul', 'problème', 'probleme', 'réclamation', 'plainte', 'erreur'],
    response: '🔄 **Retours & Réclamations** :\n\n• Les commandes peuvent être annulées tant qu\'elles n\'ont pas été expédiées\n• En cas de produit défectueux, contactez-nous sous 48h\n• Remboursement traité sous 5 jours ouvrés\n\nPour toute réclamation, contactez notre service client.',
    quickReplies: [
      { label: '📞 Service client', value: 'Je veux parler à un conseiller', icon: Phone },
    ],
  },
  {
    keywords: ['conseiller', 'humain', 'agent', 'parler', 'appeler', 'téléphone', 'telephone', 'contact', 'joindre'],
    response: `📞 **Contactez-nous** :\n\n• 📱 **WhatsApp** : ${SITE_CONFIG.whatsapp}\n• 📞 **Téléphone** : ${SITE_CONFIG.phone}\n• 📧 **Email** : ${SITE_CONFIG.email}\n• 📍 **Adresse** : ${SITE_CONFIG.address}\n\nNotre équipe est disponible du lundi au vendredi, 8h-18h.`,
    quickReplies: [
      { label: '📱 WhatsApp', value: 'whatsapp_transfer', icon: MessageCircle },
    ],
  },
  {
    keywords: ['merci', 'remercie', 'super', 'parfait', 'génial', 'genial', 'top', 'excellent', 'bien'],
    response: 'Merci beaucoup ! 😊 N\'hésitez pas si vous avez d\'autres questions. Toute l\'équipe Allo Béton est à votre service ! 🏗️',
  },
  {
    keywords: ['au revoir', 'bye', 'aurevoir', 'bonne journée', 'bonne soirée', 'à bientôt', 'a bientot'],
    response: 'Au revoir et à bientôt ! 👋 N\'hésitez pas à revenir si vous avez besoin d\'aide. Bonne journée ! 🌟',
  },
  {
    keywords: ['compte', 'inscription', 'inscrire', 'connecter', 'connexion', 'login', 'créer un compte'],
    response: '👤 **Votre compte client** :\n\n• **Créer un compte** : Cliquez sur "Mon compte" dans le menu\n• **Avantages** : Suivi de commandes, historique, factures, adresses sauvegardées\n• **Professionnel** : Créez un compte entreprise pour des remises\n\nL\'inscription est gratuite et rapide !',
  },
  {
    keywords: ['facture', 'invoice', 'reçu', 'recu', 'justificatif'],
    response: '🧾 **Factures** :\n\nChaque commande génère automatiquement une facture PDF que vous pouvez :\n• 📥 Télécharger depuis votre espace client\n• 📧 Recevoir par email\n• 🖨️ Imprimer à tout moment\n\nRetrouvez toutes vos factures dans l\'onglet "Mes factures" de votre tableau de bord.',
  },
];

/* ================================================================
   HELPER — Trouver la meilleure réponse
   ================================================================ */

const findBestResponse = (userMessage: string): { response: string; quickReplies?: QuickReply[] } => {
  const normalizedMsg = userMessage
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  let bestMatch: FAQEntry | null = null;
  let bestScore = 0;

  for (const entry of FAQ_DATABASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const normalizedKw = keyword
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (normalizedMsg.includes(normalizedKw)) {
        score += normalizedKw.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore >= 3) {
    return { response: bestMatch.response, quickReplies: bestMatch.quickReplies };
  }

  return {
    response: 'Je ne suis pas sûr de bien comprendre votre question. 🤔 Voici ce que je peux faire pour vous :',
    quickReplies: [
      { label: '📦 Produits', value: 'Quels produits proposez-vous ?', icon: Package },
      { label: '🚚 Livraison', value: 'Quels sont les délais de livraison ?', icon: Truck },
      { label: '💳 Paiement', value: 'Quels modes de paiement acceptez-vous ?', icon: CreditCard },
      { label: '🛒 Commander', value: 'Comment passer commande ?', icon: ShoppingBag },
      { label: '📞 Conseiller', value: 'Je veux parler à un conseiller', icon: Phone },
    ],
  };
};

/* ================================================================
   COMPOSANT PRINCIPAL
   ================================================================ */

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgIdRef = useRef(0);

  const genId = () => String(++msgIdRef.current);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Message de bienvenue au premier ouverture
  const handleOpen = () => {
    setIsOpen(true);
    setUnread(0);
    if (messages.length === 0) {
      setMessages([
        {
          id: genId(),
          role: 'bot',
          text: 'Bonjour ! 👋 Je suis **Béto**, l\'assistant virtuel d\'Allo Béton. Comment puis-je vous aider ?',
          timestamp: new Date(),
          quickReplies: [
            { label: '📦 Nos produits', value: 'Quels produits proposez-vous ?', icon: Package },
            { label: '🚚 Livraison', value: 'Quels sont les délais de livraison ?', icon: Truck },
            { label: '💳 Paiement', value: 'Quels modes de paiement acceptez-vous ?', icon: CreditCard },
            { label: '🛒 Commander', value: 'Comment passer commande ?', icon: ShoppingBag },
            { label: '📞 Contact', value: 'Je veux parler à un conseiller', icon: Phone },
          ],
        },
      ]);
    }
  };

  const addBotResponse = useCallback((text: string, quickReplies?: QuickReply[]) => {
    setIsTyping(true);
    const delay = Math.min(500 + text.length * 8, 2000);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: 'bot',
          text,
          timestamp: new Date(),
          quickReplies,
        },
      ]);
      setIsTyping(false);
      if (!isOpen) {
        setUnread((u) => u + 1);
      }
    }, delay);
  }, [isOpen]);

  const handleSend = useCallback((text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;

    // WhatsApp transfer
    if (msg === 'whatsapp_transfer') {
      const waUrl = `https://wa.me/${SITE_CONFIG.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Bonjour Allo Béton ! J\'ai une question.')}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      addBotResponse('Je vous redirige vers WhatsApp pour discuter avec un conseiller. 📱');
      setInput('');
      return;
    }

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: genId(), role: 'user', text: msg, timestamp: new Date() },
    ]);
    setInput('');

    // Find response
    const result = findBestResponse(msg);
    addBotResponse(result.response, result.quickReplies);
  }, [input, addBotResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (qr: QuickReply) => {
    handleSend(qr.value);
  };

  /* ================================================================
     RENDER — Markdown minimal (gras uniquement)
     ================================================================ */
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      // Gérer les sauts de ligne
      return part.split('\n').map((line, j) => (
        <React.Fragment key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </React.Fragment>
      ));
    });
  };

  /* ================================================================
     RENDER PRINCIPAL
     ================================================================ */

  return (
    <>
      {/* ── Bulle flottante ── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          aria-label="Ouvrir le chat"
          className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-600 text-white rounded-2xl shadow-2xl shadow-orange-600/30 flex items-center justify-center active:scale-90 transition-all duration-300 group animate-bounce hover:animate-none"
        >
          <Bot className="w-7 h-7 group-hover:scale-110 transition-transform" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg">
              {unread}
            </span>
          )}
        </button>
      )}

      {/* ── Fenêtre de chat ── */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-[400px] h-[min(600px,calc(100vh-3rem))] bg-white rounded-2xl shadow-2xl shadow-black/15 border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-orange-600 via-orange-600 to-orange-700 px-5 py-4 flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-black text-sm">Béto — Assistant Allo Béton</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
                <span className="text-slate-100 text-[11px] font-medium">En ligne — Réponse instantanée</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50 scroll-smooth">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] space-y-2`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-br-md shadow-md shadow-slate-200/40'
                        : 'bg-white text-gray-700 border border-gray-100 rounded-bl-md shadow-sm'
                    }`}
                  >
                    {renderText(msg.text)}
                  </div>

                  {/* Quick replies */}
                  {msg.role === 'bot' && msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.quickReplies.map((qr, i) => (
                        <button
                          key={i}
                          onClick={() => handleQuickReply(qr)}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-orange-800 text-xs font-bold rounded-xl hover:bg-slate-50 hover:border-orange-300 active:scale-95 transition-all shadow-sm"
                        >
                          {qr.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Footer — WhatsApp link ── */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex-shrink-0">
            <a
              href={`https://wa.me/${SITE_CONFIG.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Bonjour Allo Béton !')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 text-[11px] font-bold text-[#25D366] hover:bg-[#25D366]/5 rounded-lg transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Parler à un conseiller sur WhatsApp
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* ── Input ── */}
          <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre message..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-600/10 transition-all"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 transition-all shadow-md shadow-slate-200/40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
