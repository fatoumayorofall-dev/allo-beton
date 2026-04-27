/**
 * Allô Béton - Chatbot IA Flottant
 * Assistant intelligent pour conseils BTP et matériaux
 * Disponible sur toutes les pages de la boutique
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, MessageCircle, ChevronDown, ShieldCheck, Mic, MicOff, Trash2, Volume2, VolumeX } from 'lucide-react';
import { processMessage, createContext, type ConversationContext } from './ai-engine';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: React.ReactNode;
  timestamp: Date;
  rawText?: string;
  followUp?: string[];
}

/**
 * Petit moteur de rendu Markdown vers React.
 * Supporte : **gras**, *italique*, listes à puces, liens, retours à la ligne, emojis
 */
const renderMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;
  // Split en paragraphes
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, bi) => {
    const lines = block.split('\n');
    // Détection liste à puces
    const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l));
    if (isList && lines.length > 0) {
      return (
        <ul key={bi} className="my-2 space-y-1 list-disc list-inside">
          {lines.map((l, li) => (
            <li key={li} className="text-xs leading-relaxed">{renderInline(l.replace(/^\s*[-*•\d.)]+\s+/, ''))}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={bi} className={bi > 0 ? 'mt-2' : ''}>
        {lines.map((l, li) => (
          <React.Fragment key={li}>
            {renderInline(l)}
            {li < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
};

const renderInline = (text: string): React.ReactNode => {
  // Liens markdown [text](url)
  // **gras**, *italique*, `code`
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  // Regex combiné simple
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(remaining)) !== null) {
    if (m.index > lastIndex) tokens.push(remaining.slice(lastIndex, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      tokens.push(<strong key={key++} className="font-bold text-slate-900">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('*')) {
      tokens.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith('`')) {
      tokens.push(<code key={key++} className="bg-slate-100 px-1 rounded text-[11px]">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith('[')) {
      const linkMatch = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        tokens.push(
          <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-orange-600 underline">
            {linkMatch[1]}
          </a>
        );
      }
    }
    lastIndex = m.index + tok.length;
  }
  if (lastIndex < remaining.length) tokens.push(remaining.slice(lastIndex));
  return <>{tokens}</>;
};


interface QuickAction {
  label: string;
  query: string;
  icon?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Calcul béton', query: 'calcul', icon: '🧮' },
  { label: 'Prix ciment', query: 'prix ciment', icon: '💰' },
  { label: 'Livraison', query: 'livraison', icon: '🚚' },
  { label: 'Conseil dalle', query: 'dalle', icon: '🏗️' },
];

/**
 * Logique de réponse IA basée sur règles intelligentes
 * Couvre les questions BTP les plus fréquentes
 */
const generateBotResponse = (userMessage: string): React.ReactNode => {
  const msg = userMessage.toLowerCase().trim();

  // === Salutations ===
  if (/^(bonjour|salut|bonsoir|hello|hi|hey|coucou)/i.test(msg)) {
    return (
      <>
        Bonjour ! 👋 Je suis l'assistant IA d'Allô Béton. Je peux vous aider avec :
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>Calcul de quantités (béton, ciment, fer)</li>
          <li>Prix et disponibilité des matériaux</li>
          <li>Conseils techniques BTP</li>
          <li>Livraison et commande</li>
        </ul>
        <p className="mt-2">Que souhaitez-vous savoir ?</p>
      </>
    );
  }

  // === Calcul béton (avec extraction de dimensions) ===
  const dalleMatch = msg.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2|metres?\s*carres?|metre\s*carre)/);
  const epaisseurMatch = msg.match(/(\d+(?:[.,]\d+)?)\s*(?:cm|centim)/);
  if ((msg.includes('dalle') || msg.includes('beton') || msg.includes('béton')) && dalleMatch) {
    const surface = parseFloat(dalleMatch[1].replace(',', '.'));
    const epaisseur = epaisseurMatch ? parseFloat(epaisseurMatch[1].replace(',', '.')) / 100 : 0.15;
    const volume = surface * epaisseur;
    const sacs = Math.ceil(volume * 7);
    const prixEstime = Math.round(volume * 85000);
    return (
      <>
        🧮 <strong>Calcul pour {surface}m² à {(epaisseur * 100).toFixed(0)}cm :</strong>
        <ul className="mt-2 space-y-1 text-xs">
          <li>📦 Volume : <strong className="text-orange-600">{volume.toFixed(2)} m³</strong></li>
          <li>🪣 Sacs ciment 50kg : <strong>≈ {sacs}</strong></li>
          <li>💰 Coût estimé : <strong className="text-emerald-600">{prixEstime.toLocaleString('fr-FR')} FCFA</strong></li>
        </ul>
        <p className="mt-2 text-xs">Je recommande notre <strong>Béton B25</strong>. Voulez-vous voir le produit ?</p>
      </>
    );
  }

  // === Calcul général ===
  if (msg.includes('calcul') || msg.includes('quantité') || msg.includes('quantite') || msg.includes('combien')) {
    return (
      <>
        🧮 Je peux vous aider à calculer ! Donnez-moi :
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li>La <strong>surface</strong> en m² (ex: 50m²)</li>
          <li>L'<strong>épaisseur</strong> en cm (ex: 15cm)</li>
          <li>Le <strong>type de matériau</strong> (béton, ciment, fer...)</li>
        </ul>
        <p className="mt-2 text-xs">Exemple : "Béton pour dalle de 50m² à 15cm"</p>
      </>
    );
  }

  // === Prix ===
  if (msg.includes('prix') || msg.includes('tarif') || msg.includes('coût') || msg.includes('cout') || msg.includes('combien coute')) {
    if (msg.includes('ciment')) {
      return (
        <>
          💰 <strong>Prix du ciment Allô Béton :</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>Ciment CPA 32.5 - 50kg : <strong>4 250 FCFA</strong></li>
            <li>Ciment CPA 42.5 - 50kg : <strong>4 750 FCFA</strong></li>
            <li>Ciment Portland 50kg : <strong>4 500 FCFA</strong></li>
          </ul>
          <p className="mt-2 text-xs">🎁 <strong>-15%</strong> avec le code <strong>CIMENT15</strong></p>
        </>
      );
    }
    if (msg.includes('beton') || msg.includes('béton')) {
      return (
        <>
          💰 <strong>Prix du béton Allô Béton :</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>Béton B20 : <strong>75 000 FCFA/m³</strong></li>
            <li>Béton B25 : <strong>85 000 FCFA/m³</strong></li>
            <li>Béton B30 : <strong>95 000 FCFA/m³</strong></li>
          </ul>
          <p className="mt-2 text-xs">Livraison incluse à partir de 5m³</p>
        </>
      );
    }
    if (msg.includes('fer') || msg.includes('armature')) {
      return (
        <>
          💰 <strong>Prix du fer à béton :</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>HA8 (8mm) : <strong>650 FCFA/kg</strong></li>
            <li>HA10 (10mm) : <strong>675 FCFA/kg</strong></li>
            <li>HA12 (12mm) : <strong>700 FCFA/kg</strong></li>
          </ul>
        </>
      );
    }
    return (
      <>
        💰 De quel <strong>matériau</strong> souhaitez-vous le prix ?
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['Béton', 'Ciment', 'Fer', 'Sable', 'Granulats'].map((m) => (
            <span key={m} className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">{m}</span>
          ))}
        </div>
      </>
    );
  }

  // === Livraison ===
  if (msg.includes('livraison') || msg.includes('livrer') || msg.includes('expédition') || msg.includes('expedition')) {
    return (
      <>
        🚚 <strong>Notre service de livraison :</strong>
        <ul className="mt-2 space-y-1 text-xs">
          <li>📍 Zone : Dakar, Thiès, Saint-Louis</li>
          <li>⏱️ Délai : <strong>24h à 48h</strong></li>
          <li>💰 Frais : selon distance (calculé au panier)</li>
          <li>🎁 <strong>GRATUITE</strong> dès 500 000 FCFA d'achat à Dakar</li>
        </ul>
        <p className="mt-2 text-xs">Suivi en temps réel sur votre espace client.</p>
      </>
    );
  }

  // === Paiement ===
  if (msg.includes('paie') || msg.includes('wave') || msg.includes('orange money') || msg.includes('carte')) {
    return (
      <>
        💳 <strong>Moyens de paiement acceptés :</strong>
        <ul className="mt-2 space-y-1 text-xs">
          <li>📱 <strong>Wave</strong> - Le plus rapide</li>
          <li>📱 <strong>Orange Money</strong></li>
          <li>💳 <strong>Carte bancaire</strong> (Visa, Mastercard)</li>
          <li>🏦 <strong>Virement bancaire</strong></li>
          <li>💵 <strong>Espèces</strong> à la livraison</li>
        </ul>
        <p className="mt-2 text-xs">🔒 Tous nos paiements sont sécurisés SSL 256-bit</p>
      </>
    );
  }

  // === Contact ===
  if (msg.includes('contact') || msg.includes('téléphone') || msg.includes('telephone') || msg.includes('appeler') || msg.includes('numero')) {
    return (
      <>
        📞 <strong>Contactez-nous :</strong>
        <ul className="mt-2 space-y-1 text-xs">
          <li>☎️ Tél : <strong>+221 33 800 12 34</strong></li>
          <li>💬 WhatsApp : <strong>+221 77 XXX XX XX</strong></li>
          <li>📧 Email : <strong>contact@allobeton.sn</strong></li>
          <li>🕐 Horaires : Lun-Sam 8h-18h</li>
        </ul>
      </>
    );
  }

  // === Conseil dalle ===
  if (msg.includes('dalle')) {
    return (
      <>
        🏗️ <strong>Conseils pour votre dalle :</strong>
        <ul className="mt-2 space-y-1 text-xs">
          <li>📐 Épaisseur recommandée : <strong>12-15 cm</strong></li>
          <li>🧱 Béton : <strong>B25 minimum</strong></li>
          <li>🔩 Armature : <strong>HA10 en quadrillage 15x15</strong></li>
          <li>💧 Cure : <strong>arroser 7 jours</strong></li>
        </ul>
        <p className="mt-2 text-xs">Donnez-moi vos dimensions pour un calcul précis !</p>
      </>
    );
  }

  // === Fondation ===
  if (msg.includes('fondation') || msg.includes('semelle')) {
    return (
      <>
        🏗️ <strong>Pour vos fondations :</strong>
        <ul className="mt-2 space-y-1 text-xs">
          <li>📐 Semelle filante : <strong>40-60 cm de large</strong></li>
          <li>🧱 Béton : <strong>B25 ou B30</strong> (résistance)</li>
          <li>🔩 Armature : <strong>HA12 minimum</strong></li>
          <li>⚠️ Étude de sol recommandée</li>
        </ul>
      </>
    );
  }

  // === Catégories produits ===
  if (msg.includes('produit') || msg.includes('catalogue') || msg.includes('disponible')) {
    return (
      <>
        📦 <strong>Notre catalogue Allô Béton :</strong>
        <ul className="mt-2 space-y-1 text-xs">
          <li>🧱 Béton prêt à l'emploi (B20, B25, B30)</li>
          <li>📦 Ciment (Portland, CPA 32.5, CPA 42.5)</li>
          <li>🔩 Fer à béton (HA6 à HA20)</li>
          <li>🏖️ Sable et granulats</li>
          <li>🧪 Adjuvants et accessoires</li>
        </ul>
        <p className="mt-2 text-xs">28+ produits disponibles ! Voulez-vous voir le catalogue ?</p>
      </>
    );
  }

  // === Merci ===
  if (msg.includes('merci') || msg.includes('thanks')) {
    return <>De rien ! 😊 Je suis là 24h/24 pour vous aider. N'hésitez pas si vous avez d'autres questions !</>;
  }

  // === Au revoir ===
  if (msg.includes('au revoir') || msg.includes('bye') || msg.includes('a bientot') || msg.includes('à bientôt')) {
    return <>Au revoir ! 👋 À bientôt sur Allô Béton. Bonne continuation pour vos chantiers !</>;
  }

  // === Réponse par défaut intelligente ===
  return (
    <>
      Je comprends votre question, mais j'ai besoin de plus de précisions. 🤔
      <p className="mt-2 text-xs">Vous pouvez me demander :</p>
      <ul className="mt-1 space-y-0.5 text-xs">
        <li>• <strong>Calcul</strong> : "Béton pour 50m² à 15cm"</li>
        <li>• <strong>Prix</strong> : "Prix du ciment"</li>
        <li>• <strong>Conseil</strong> : "Comment faire une dalle ?"</li>
        <li>• <strong>Livraison</strong> : "Délais de livraison"</li>
      </ul>
      <p className="mt-2 text-xs">Ou contactez-nous au <strong>+221 33 800 12 34</strong></p>
    </>
  );
};

export const ShopChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      content: (
        <>
          Bonjour ! 👋 Je suis <strong>l'assistant IA d'Allô Béton</strong>. Comment puis-je vous aider aujourd'hui ?
        </>
      ),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext>(() => createContext());
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Vérifie support reconnaissance vocale (Chrome, Edge, Safari)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const rec = new SpeechRecognition();
      rec.lang = 'fr-FR';
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setInput(transcript);
        if (event.results[event.results.length - 1].isFinal) {
          setTimeout(() => {
            sendMessage(transcript);
            setIsListening(false);
          }, 300);
        }
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  // Persistance de la conversation (localStorage)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('allo_ai_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.messages?.length > 1 && parsed?.context) {
          // Restaure les messages (les contenus React seront re-rendus via rawText)
          const restored: Message[] = parsed.messages.map((m: any) => ({
            ...m,
            content: m.role === 'bot' && m.rawText ? renderMarkdown(m.rawText) : m.rawText || m.content,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(restored);
          setConversationContext(parsed.context);
        }
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    try {
      const toSave = {
        messages: messages.map((m) => ({ id: m.id, role: m.role, rawText: m.rawText, followUp: m.followUp, timestamp: m.timestamp })),
        context: conversationContext,
      };
      localStorage.setItem('allo_ai_history', JSON.stringify(toSave));
    } catch { /* quota exceeded */ }
  }, [messages, conversationContext]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch { /* déjà en cours */ }
    }
  };

  const clearConversation = () => {
    if (!confirm('Effacer toute la conversation ?')) return;
    localStorage.removeItem('allo_ai_history');
    setMessages([{
      id: '1',
      role: 'bot',
      content: <>Bonjour ! 👋 Je suis <strong>l'IA Allô Béton</strong>. Comment puis-je vous aider ?</>,
      rawText: "Bonjour ! 👋 Je suis l'IA Allô Béton. Comment puis-je vous aider ?",
      timestamp: new Date(),
    }]);
    setConversationContext(createContext());
  };

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus auto sur l'input quand on ouvre
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Notification de bienvenue après 5s sur la page
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setHasNewMessage(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      rawText: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // L’IA Allo Béton tourne 100% en local : pas d’API externe, pas de fuite de données
    const thinkTime = 400 + Math.random() * 800;
    await new Promise((r) => setTimeout(r, thinkTime));

    const { response, updatedContext } = processMessage(text, conversationContext);
    setConversationContext(updatedContext);

    const botResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: 'bot',
      content: renderMarkdown(response.text),
      rawText: response.text,
      followUp: response.followUp,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botResponse]);
    setIsTyping(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.query);
  };

  return (
    <>
      {/* Bouton flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Ouvrir le chatbot IA"
        >
          <div className="relative">
            {/* Pulse rings */}
            <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-20" />
            <div className="absolute inset-0 bg-orange-500 rounded-full animate-pulse opacity-30" />
            {/* Bouton principal */}
            <div className="relative w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 rounded-full shadow-2xl shadow-orange-500/50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bot className="w-8 h-8 text-white" />
            </div>
            {/* Badge "AI" */}
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
              <Sparkles className="w-2 h-2" />
              IA
            </div>
            {/* Notification rouge si nouveau message */}
            {hasNewMessage && (
              <div className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-bounce" />
            )}
          </div>

          {/* Tooltip au survol */}
          <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
              💬 Besoin d'aide ? Demandez-moi !
              <div className="absolute top-full right-6 w-2 h-2 bg-slate-900 transform rotate-45 -translate-y-1" />
            </div>
          </div>
        </button>
      )}

      {/* Fenêtre du chatbot */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 h-[calc(100vh-6rem)] sm:h-[600px] max-h-[700px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* Header */}
          <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-4 flex items-center gap-3 relative overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl" />
            </div>
            <div className="relative w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="relative flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-white font-bold text-sm">IA Allô Béton</p>
                <Sparkles className="w-3 h-3 text-yellow-300" />
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                <span className="text-orange-100 text-[11px]">100% privée · Hors-ligne</span>
              </div>
            </div>
            <button
              onClick={clearConversation}
              className="relative w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
              aria-label="Effacer la conversation"
              title="Effacer la conversation"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="relative w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
              aria-label="Fermer"
            >
              <ChevronDown className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 to-white">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}
              >
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-orange-600" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-orange-600 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                  {/* Suggestions de questions de suivi (pour bot) */}
                  {msg.role === 'bot' && msg.followUp && msg.followUp.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Suggestions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.followUp.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(s)}
                            className="text-[11px] bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-full transition-colors border border-orange-100"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Indicateur de frappe */}
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-orange-600" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions (visible uniquement au début) */}
          {messages.length <= 2 && !isTyping && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action)}
                    className="text-xs bg-white hover:bg-orange-50 hover:border-orange-300 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                  >
                    {action.icon && <span>{action.icon}</span>}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-slate-100 p-3 bg-white">
            <div className={`flex items-center gap-2 rounded-2xl border transition-all ${
              isListening
                ? 'bg-red-50 border-red-300 ring-2 ring-red-200 animate-pulse'
                : 'bg-slate-50 border-slate-200 focus-within:border-orange-400 focus-within:bg-white'
            }`}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "🎙️ Écoute en cours..." : "Posez votre question ou parlez..."}
                className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder-slate-400"
                disabled={isListening}
              />
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={isTyping}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
                      : 'bg-slate-200 hover:bg-orange-100 text-slate-600 hover:text-orange-600'
                  }`}
                  aria-label={isListening ? 'Arrêter l\'écoute' : 'Parler à l\'IA'}
                  title={isListening ? 'Arrêter l\'écoute' : 'Parler à l\'IA (vocal)'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || isTyping || isListening}
                className="mr-1 w-9 h-9 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
                aria-label="Envoyer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
              IA Allô Béton · 100% privée · Sans clé API
            </p>
          </form>
        </div>
      )}
    </>
  );
};

export default ShopChatbot;
