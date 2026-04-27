import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Bot, Send, Sparkles, Loader2, Copy, Check,
  Lightbulb, Brain, Cpu, Activity, Zap,
  TrendingUp, TrendingDown, RotateCcw,
  Clock, MessageCircle, FileText, Shield,
  AlertTriangle, AlertOctagon,
  ArrowUpRight, ArrowDownRight, Target,
  BarChart3, DollarSign, ShoppingCart, Award,
  ChevronDown, ChevronUp, Filter, Info, CheckCircle,
  Layers, Eye, Gauge, Flame, CircleDot, Wand2,
  Database, GitBranch, Terminal, Radio, Radar,
  PieChart, Users, Package, Truck, Banknote,
  CalendarDays, Star, Hash, Minus, Mic, MicOff,
  Maximize2, Minimize2, BookOpen, Workflow,
  ScanLine, Fingerprint, Globe, Cpu as CpuIcon,
  Volume2, BrainCircuit, Waves, MousePointerClick
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar,
  LineChart, Line
} from 'recharts';

/* ──────────── CONSTANTS ──────────── */
const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/ai`;
const COLORS = ['#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#22d3ee', '#34d399', '#fbbf24'];
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

function getAuthHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

type ActiveTab = 'chat' | 'report' | 'predictions' | 'anomalies';

interface Message {
  id: string; role: 'user' | 'assistant'; content: string;
  data?: any; chartType?: string | null; intent?: string; confidence?: number;
  method?: string; insights?: string[];
  recommendations?: { icon: string; text: string }[];
  contextualSuggestions?: { text: string; icon: string; type: string }[];
  processingTime?: string;
  contextInfo?: { isFollowUp: boolean; resolvedFrom: string[]; turnCount: number };
  timestamp: Date; isLoading?: boolean;
}
interface Suggestion { icon: string; text: string; category: string; }
interface DailyReport {
  date: string; generatedAt: string; performanceScore: number; performanceLevel: string;
  kpi: any; comparisons: any; topClients: any[]; topProducts: any[];
  insights: { type: string; icon: string; text: string }[];
  recommendations: { priority: string; icon: string; text: string }[];
}
interface PredictionData {
  summary: any; historical: any[]; predictions: any[];
  insights: { type: string; icon: string; text: string }[];
  model: any;
}
interface Anomaly {
  type: string; category: string; severity: number; icon: string;
  title: string; description: string; date: string; value: number;
}
interface AnomalyData {
  riskScore: number; riskLevel: string;
  summary: { total: number; critical: number; warning: number; info: number };
  anomalies: Anomaly[];
  recommendations: { icon: string; text: string }[];
}

/* ╔═══════════════════════════════════════════════════════════════╗
   ║                    MAIN COMPONENT                           ║
   ╚═══════════════════════════════════════════════════════════════╝ */
export function AIChat() {
  const [tab, setTab] = useState<ActiveTab>('chat');
  const [pulse, setPulse] = useState(true);
  const [time, setTime] = useState(new Date());
  const [aiEngine, setAiEngine] = useState<string>('local');
  const [aiModel, setAiModel] = useState<string>('NLP v3');

  useEffect(() => {
    const t1 = setInterval(() => setPulse(p => !p), 3000);
    const t2 = setInterval(() => setTime(new Date()), 1000);
    // Fetch AI engine status
    fetch(`${API}/status`, { headers: getAuthHeaders() }).then(r => r.json()).then(d => {
      if (d.success) {
        setAiEngine(d.engine || 'local');
        setAiModel(d.model || 'NLP v3');
      }
    }).catch(() => {});
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType; desc: string; gradient: string; glow: string }[] = [
    { id: 'chat', label: 'Chat IA', icon: MessageCircle, desc: 'Assistant intelligent', gradient: 'from-violet-600 via-indigo-600 to-purple-600', glow: 'shadow-violet-500/25' },
    { id: 'report', label: 'Rapport', icon: FileText, desc: 'Analyse quotidienne', gradient: 'from-cyan-600 via-orange-600 to-indigo-600', glow: 'shadow-cyan-500/25' },
    { id: 'predictions', label: 'Prédictions', icon: TrendingUp, desc: 'Visions du futur', gradient: 'from-emerald-600 via-teal-600 to-cyan-600', glow: 'shadow-emerald-500/25' },
    { id: 'anomalies', label: 'Anomalies', icon: Shield, desc: 'Détection risques', gradient: 'from-rose-600 via-red-600 to-orange-600', glow: 'shadow-rose-500/25' },
  ];

  return (
    <div className="h-full min-h-[calc(100vh-160px)] flex flex-col text-white overflow-hidden rounded-2xl border border-white/[0.06] relative" style={{ backgroundColor: '#07071a' }}>
      {/* ═══ Animated background ═══ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-violet-600/[0.06] rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-5%] right-[15%] w-[400px] h-[400px] bg-cyan-600/[0.04] rounded-full blur-[120px]" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[700px] h-[700px] bg-indigo-600/[0.025] rounded-full blur-[160px]" />
        {/* Grid overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
        {/* Scanning line */}
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent animate-[scan_6s_linear_infinite]"
          style={{ top: '30%' }} />
      </div>

      {/* ═══ HEADER ═══ */}
      <div className="flex-none px-5 pt-5 pb-3 relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            {/* AI Brain Logo */}
            <div className="relative group">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30 transition-all duration-1000 ${pulse ? 'scale-100' : 'scale-[1.06]'}`}>
                <BrainCircuit className="w-7 h-7 text-white drop-shadow-lg" />
              </div>
              {/* Status dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40" style={{ borderWidth: '2.5px', borderColor: '#07071a' }}>
                <Zap className="w-2 h-2 text-white" />
              </div>
              {/* Orbiting ring */}
              <div className="absolute inset-[-6px] border border-violet-500/15 rounded-[18px] animate-[spin_10s_linear_infinite]" style={{ borderStyle: 'dashed', borderWidth: 1 }} />
              {/* Pulse ring */}
              <div className={`absolute inset-[-10px] border border-violet-400/10 rounded-[22px] transition-all duration-1000 ${pulse ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`} />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-violet-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
                    IA Expert
                  </span>
                </h1>
                <span className="px-2.5 py-0.5 text-[9px] font-black rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white tracking-[0.15em] uppercase shadow-lg shadow-violet-500/20 border border-violet-400/20">
                  PRO
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">En ligne</span>
                </div>
                <span className="text-[10px] text-slate-700">│</span>
                <span className="text-[10px] text-slate-500 font-mono tracking-wide">Allo Béton Intelligence</span>
              </div>
            </div>
          </div>

          {/* Right side chips */}
          <div className="flex items-center gap-2">
            {/* Live clock */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] font-mono">
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-400 tabular-nums">
                {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <Database className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-slate-400">MySQL</span>
              <div className="w-1 h-1 rounded-full bg-emerald-400" />
            </div>
            <div className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${aiEngine === 'claude' ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              {aiEngine === 'claude' ? <Sparkles className="w-3 h-3 text-amber-400" /> : <Cpu className="w-3 h-3 text-violet-400" />}
              <span className={`text-[10px] font-semibold ${aiEngine === 'claude' ? 'text-amber-400' : 'text-slate-400'}`}>
                {aiEngine === 'claude' ? 'Claude IA' : 'IA Expert PRO'}
              </span>
              {aiEngine === 'claude' && <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />}
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
              <span className="text-[10px] text-violet-300 font-black tracking-wider">v5.0</span>
            </div>
          </div>
        </div>

        {/* ═══ Tab Bar ═══ */}
        <div className="flex gap-1 p-1 bg-white/[0.025] rounded-2xl border border-white/[0.06] backdrop-blur-sm">
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 relative overflow-hidden ${
                  active
                    ? `bg-gradient-to-r ${t.gradient} text-white shadow-xl ${t.glow}`
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                }`}>
                {active && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.12] via-white/[0.04] to-transparent" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white/40 rounded-full" />
                  </>
                )}
                <t.icon className={`w-4 h-4 relative z-10 ${active ? 'drop-shadow-md' : ''}`} />
                <span className="hidden sm:inline relative z-10">{t.label}</span>
                {active && <Sparkles className="w-3 h-3 relative z-10 animate-pulse opacity-60" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div className="flex-1 overflow-hidden relative z-10">
        {tab === 'chat' && <ChatPanel />}
        {tab === 'report' && <ReportPanel />}
        {tab === 'predictions' && <PredictionsPanel />}
        {tab === 'anomalies' && <AnomaliesPanel />}
      </div>

      {/* ═══ Footer status bar ═══ */}
      <div className="flex-none px-5 py-2 border-t border-white/[0.04] relative z-10" style={{ backgroundColor: 'rgba(7,7,26,0.9)' }}>
        <div className="flex items-center justify-between text-[9px] text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Fingerprint className="w-2.5 h-2.5" /> Session sécurisée</span>
            <span className="flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> Sénégal • FCFA</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Database className="w-2.5 h-2.5 text-emerald-600" /> DB connectée</span>
            <span className="flex items-center gap-1"><Waves className="w-2.5 h-2.5 text-violet-600" /> IA active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ╔═══════════════════════════════════════════════════════════════╗
   ║                     CHAT PANEL                              ║
   ╚═══════════════════════════════════════════════════════════════╝ */
function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState('');
  const [msgCount, setMsgCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/suggestions`, { headers: getAuthHeaders() }).then(r => r.json()).then(d => {
      if (d.success) setSuggestions(d.suggestions);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date() };
    const loadMsg: Message = { id: `l_${Date.now()}`, role: 'assistant', content: '', timestamp: new Date(), isLoading: true };
    setMessages(prev => [...prev, userMsg, loadMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/query`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ question: text.trim(), sessionId: SESSION_ID })
      });
      const data = await res.json();
      const aiMsg: Message = {
        id: `a_${Date.now()}`, role: 'assistant',
        content: data.answer || 'Pas de réponse.',
        data: data.data, chartType: data.chartType,
        intent: data.intent, confidence: data.confidence, method: data.method,
        insights: data.insights, recommendations: data.recommendations,
        contextualSuggestions: data.contextualSuggestions,
        processingTime: data.processingTime,
        contextInfo: data.contextInfo,
        timestamp: new Date()
      };
      setMessages(prev => prev.filter(m => !m.isLoading).concat(aiMsg));
      setMsgCount(c => c + 1);
    } catch {
      setMessages(prev => prev.filter(m => !m.isLoading).concat({
        id: `e_${Date.now()}`, role: 'assistant',
        content: '⚠️ Erreur de connexion au serveur IA. Vérifiez que le backend est lancé.',
        timestamp: new Date()
      }));
    } finally { setLoading(false); }
  }, [loading]);

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text.replace(/\*\*/g, ''));
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const clearChat = async () => {
    setMessages([]);
    setMsgCount(0);
    try { await fetch(`${API}/context?sessionId=${SESSION_ID}`, { method: 'DELETE', headers: getAuthHeaders() }); } catch {}
  };

  const categories = useMemo(() => Array.from(new Set(suggestions.map(s => s.category))), [suggestions]);
  const filteredSuggs = activeCat ? suggestions.filter(s => s.category === activeCat) : suggestions.slice(0, 12);

  const catIcons: Record<string, React.ElementType> = {
    'Ventes': ShoppingCart, 'Clients': Users, 'Finance': DollarSign, 'Produits': Package,
    'Stock': Package, 'Fournisseurs': Truck, 'Logistique': Truck, 'Dashboard': BarChart3,
    'Factures': FileText, 'Conversation': MessageCircle, 'Systeme': Terminal, 'Avance': Brain,
    'E-commerce': ShoppingCart, 'Aide': Info, 'Explorer BDD': Database, 'Agent IA': Cpu
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {messages.length === 0 && (
          <div className="space-y-6 py-2">
            {/* ═══ Welcome Hero ═══ */}
            <div className="text-center py-10 relative">
              {/* Decorative rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 border border-violet-500/[0.05] rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 border border-indigo-500/[0.03] rounded-full" />

              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-violet-500/20 via-indigo-500/15 to-cyan-500/20 flex items-center justify-center border border-white/[0.08] backdrop-blur-xl shadow-2xl shadow-violet-500/10">
                  <Wand2 className="w-12 h-12 text-indigo-400 drop-shadow-lg" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
                  <Zap className="w-3 h-3 text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-2">
                Comment puis-je vous aider ?
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Posez vos questions en langage naturel sur les ventes, clients, stock, finances, logistique...
                L'IA analyse vos données MySQL en temps réel avec une compréhension contextuelle avancée.
              </p>

              {/* Capability badges */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  { icon: BrainCircuit, label: 'NLP Avancé', color: 'violet', description: 'Compréhension naturelle' },
                  { icon: Database, label: 'Données Live', color: 'cyan', description: 'MySQL temps réel' },
                  { icon: Radar, label: '50+ Intents', color: 'emerald', description: 'Reconnaissance complète' },
                  { icon: Workflow, label: 'Contexte', color: 'amber', description: 'Suivi conversation' },
                ].map((s, i) => (
                  <div key={i} className="group relative">
                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl bg-${s.color}-500/[0.06] border border-${s.color}-500/10 hover:border-${s.color}-500/25 transition-all cursor-default`}>
                      <s.icon className={`w-3.5 h-3.5 text-${s.color}-400`} />
                      <span className={`text-[10px] text-${s.color}-400 font-semibold`}>{s.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ Category Filters ═══ */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <Filter className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-bold">Explorer par catégorie</span>
                <div className="flex-1 h-px bg-gradient-to-r from-white/[0.04] to-transparent" />
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                <button onClick={() => setActiveCat('')}
                  className={`px-3.5 py-2 rounded-xl text-[11px] font-semibold transition-all duration-300 ${
                    !activeCat
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 scale-[1.02]'
                      : 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 border border-white/[0.06]'
                  }`}>
                  ✦ Tout
                </button>
                {categories.map(cat => {
                  const CatIcon = catIcons[cat] || Star;
                  return (
                    <button key={cat} onClick={() => setActiveCat(activeCat === cat ? '' : cat)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all duration-300 ${
                        activeCat === cat
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 scale-[1.02]'
                          : 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 border border-white/[0.06]'
                      }`}>
                      <CatIcon className="w-3 h-3" />
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ═══ Suggestions Grid ═══ */}
            <div className="grid grid-cols-2 gap-2 px-1">
              {filteredSuggs.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.text)}
                  className="text-left p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-gradient-to-br hover:from-violet-600/[0.06] hover:to-indigo-600/[0.04] hover:border-violet-500/20 transition-all duration-300 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-500/[0.03] to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start gap-2.5 relative">
                    <span className="text-base flex-none mt-0.5 group-hover:scale-110 transition-transform">{s.icon}</span>
                    <div>
                      <span className="text-[11px] text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors block">{s.text}</span>
                      <span className="text-[9px] text-slate-700 mt-1 group-hover:text-violet-400/60 transition-colors block">{s.category}</span>
                    </div>
                  </div>
                  <MousePointerClick className="absolute bottom-2 right-2 w-3 h-3 text-slate-800 group-hover:text-violet-400/40 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Messages ═══ */}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.isLoading ? (
              /* ═══ Loading state ═══ */
              <div className="flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur max-w-[85%]">
                <div className="relative">
                  <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                  <div className="absolute inset-0 bg-violet-400/20 blur-lg rounded-full" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-slate-300 font-medium">Analyse en cours...</span>
                  <div className="flex gap-1">
                    <div className="w-10 h-1 bg-violet-500/30 rounded-full animate-pulse" />
                    <div className="w-14 h-1 bg-indigo-500/20 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                    <div className="w-8 h-1 bg-cyan-500/20 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                    <div className="w-6 h-1 bg-purple-500/15 rounded-full animate-pulse" style={{ animationDelay: '0.45s' }} />
                  </div>
                </div>
              </div>
            ) : msg.role === 'user' ? (
              /* ═══ User bubble ═══ */
              <div className="max-w-[80%]">
                <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-sm shadow-xl shadow-violet-500/15 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/[0.08] to-transparent" />
                  <span className="relative z-10">{msg.content}</span>
                </div>
                <div className="text-[9px] text-slate-600 text-right mt-1 mr-2 flex items-center justify-end gap-1">
                  <Check className="w-2.5 h-2.5 text-violet-500" />
                  {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ) : (
              /* ═══ AI Message ═══ */
              <div className="max-w-[95%] space-y-2.5">
                <div className="relative px-4 py-4 rounded-2xl rounded-bl-sm bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl">
                  {/* AI avatar */}
                  <div className="absolute -left-2 -top-2 w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <Brain className="w-3 h-3 text-white" />
                  </div>

                  {/* Method & confidence badges */}
                  {msg.confidence !== undefined && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap ml-4">
                      <ConfBadge label={msg.method === 'claude' ? 'Claude IA' : msg.method === 'agent_ia' ? '🤖 Agent IA' : msg.method === 'db_explorer' ? '🗄️ Explorer BDD' : msg.method === 'ia_expert' ? 'IA Expert' : msg.method === 'regex' ? 'Exact' : msg.method === 'fuzzy' ? 'NLP' : msg.method === 'context_followup' ? 'Contexte' : 'IA Expert'} value={msg.confidence} />
                      {msg.processingTime && (
                        <span className="text-[9px] text-slate-600 flex items-center gap-1 bg-white/[0.03] px-2 py-0.5 rounded-md">
                          <Clock className="w-2.5 h-2.5" />{msg.processingTime}
                        </span>
                      )}
                      {msg.contextInfo?.isFollowUp && (
                        <span className="text-[9px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                          <GitBranch className="w-2.5 h-2.5" /> Suivi #{msg.contextInfo.turnCount}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                        .replace(/\n/g, '<br/>')
                        .replace(/---/g, '<hr class="border-white/[0.06] my-2.5"/>')
                    }}
                  />

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-600">{msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.intent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-600 font-mono">{msg.intent}</span>
                      )}
                    </div>
                    <button onClick={() => copyText(msg.id, msg.content)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-600 hover:text-slate-300 transition">
                      {copied === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Chart */}
                {msg.data && msg.chartType && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <ChartRenderer data={msg.data} type={msg.chartType} />
                  </div>
                )}

                {/* Insights */}
                {msg.insights && msg.insights.length > 0 && (
                  <div className="space-y-1.5">
                    {msg.insights.map((ins, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/10">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-none mt-0.5" />
                        <span className="text-xs text-amber-200/80 leading-relaxed">{ins}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Contextual Suggestions */}
                {msg.contextualSuggestions && msg.contextualSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.contextualSuggestions.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s.text)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] bg-white/[0.02] border border-white/[0.06] hover:bg-violet-600/10 hover:border-violet-500/20 text-slate-400 hover:text-white transition-all group">
                        <span className="group-hover:scale-110 transition-transform">{s.icon}</span>
                        <span>{s.text}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ═══ Input Bar ═══ */}
      <div className="flex-none p-4 border-t border-white/[0.06] backdrop-blur-xl" style={{ backgroundColor: 'rgba(7,7,26,0.95)' }}>
        {/* Message count */}
        {msgCount > 0 && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.04]" />
            <span className="text-[9px] text-slate-700 font-medium">{msgCount} échange{msgCount > 1 ? 's' : ''} dans cette session</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.04]" />
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {messages.length > 0 && (
            <button onClick={clearChat}
              className="p-2.5 rounded-xl text-slate-600 hover:text-white hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent transition-all"
              title="Nouvelle conversation">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1 flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-violet-500/30 focus-within:bg-white/[0.04] transition-all duration-300 focus-within:shadow-lg focus-within:shadow-violet-500/5 group">
            <Bot className="w-4 h-4 text-slate-600 flex-none group-focus-within:text-violet-400 transition-colors" />
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Posez votre question à l'IA..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none" />
            <div className="flex items-center gap-1">
              <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white disabled:opacity-20 hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-200 hover:scale-105 active:scale-95">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ╔═══════════════════════════════════════════════════════════════╗
   ║                    REPORT PANEL                             ║
   ╚═══════════════════════════════════════════════════════════════╝ */
function ReportPanel() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const loadReport = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/daily-report?date=${d}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setReport(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadReport(date); }, [date, loadReport]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
          <div className="absolute inset-0 bg-cyan-400/20 blur-2xl rounded-full" />
        </div>
        <div className="text-center">
          <span className="text-sm text-slate-300 font-medium block">Génération du rapport...</span>
          <span className="text-[10px] text-slate-600 mt-1 block">Analyse des données MySQL</span>
        </div>
      </div>
    );
  }
  if (!report) return <EmptyState icon={FileText} text="Aucune donnée disponible" />;

  const k = report.kpi;
  const scoreColor = report.performanceScore >= 80 ? '#10b981' : report.performanceScore >= 60 ? '#818cf8' : report.performanceScore >= 40 ? '#fbbf24' : '#ef4444';
  const scoreLabel = report.performanceScore >= 80 ? 'Excellent' : report.performanceScore >= 60 ? 'Bon' : report.performanceScore >= 40 ? 'Moyen' : 'Faible';
  const scoreEmoji = report.performanceScore >= 80 ? '🔥' : report.performanceScore >= 60 ? '✅' : report.performanceScore >= 40 ? '⚠️' : '❌';
  const gaugeData = [{ name: 'score', value: report.performanceScore, fill: scoreColor }];

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
      {/* Date selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {scoreEmoji} {new Date(report.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <span className="text-[10px] text-slate-500">Rapport de performance quotidien</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadReport(date)} className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition">
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-500/30" />
        </div>
      </div>

      {/* Score card */}
      <div className="relative p-6 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/[0.08] to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-violet-500/[0.05] to-transparent rounded-full blur-2xl" />
        <div className="flex items-center gap-6 relative">
          <div className="w-28 h-20 flex-none">
            <ResponsiveContainer>
              <RadialBarChart cx="50%" cy="100%" innerRadius="55%" outerRadius="100%" startAngle={180} endAngle={0} barSize={12} data={gaugeData}>
                <RadialBar background={{ fill: 'rgba(255,255,255,0.04)' }} dataKey="value" cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-5xl font-black tracking-tight" style={{ color: scoreColor }}>{report.performanceScore}</div>
            <div className="text-xs text-slate-400 font-semibold mt-0.5">{report.performanceLevel || scoreLabel}</div>
          </div>
          <div className="flex-1 text-right">
            <Gauge className="w-10 h-10 text-slate-800 ml-auto" />
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <KpiCard icon={DollarSign} label="Chiffre d'affaires" value={`${fmt(k.ca)} F`} sub={`${Number(k.ca_variation) > 0 ? '+' : ''}${k.ca_variation}% vs hier`} positive={Number(k.ca_variation) > 0} color="violet" />
        <KpiCard icon={ShoppingCart} label="Ventes" value={String(k.nb_ventes)} sub={`Moy: ${fmt(k.panier_moyen)} F`} color="indigo" />
        <KpiCard icon={Package} label="Tonnage" value={`${Number(k.tonnes).toFixed(1)}t`} color="cyan" />
        <KpiCard icon={Banknote} label="Recettes" value={`${fmt(k.recettes)} F`} positive color="emerald" />
        <KpiCard icon={TrendingDown} label="Dépenses" value={`${fmt(k.depenses)} F`} positive={false} color="red" />
        <KpiCard icon={Target} label="Marge" value={`${fmt(k.marge_estimee)} F`} positive={k.marge_estimee > 0} color="amber" />
      </div>

      {/* Comparisons */}
      <div className="grid grid-cols-2 gap-2.5">
        <CompCard title="vs Hier" value={report.comparisons.vs_yesterday.ca} />
        <CompCard title="vs Moy. Hebdo" value={report.comparisons.vs_week_avg.ca} />
      </div>

      {/* Monthly progress */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-slate-400 font-medium flex items-center gap-1.5"><Target className="w-3 h-3 text-cyan-400" /> Progression mensuelle</span>
          <span className="font-bold text-cyan-400">{report.comparisons.month_progress.progress}%</span>
        </div>
        <div className="w-full h-3 bg-white/[0.04] rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 rounded-full transition-all duration-700 relative"
            style={{ width: `${Math.min(100, Number(report.comparisons.month_progress.progress))}%` }}>
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
          </div>
        </div>
        <div className="text-[10px] text-slate-600 mt-1.5 flex justify-between">
          <span>{fmt(report.comparisons.month_progress.ca_month)} FCFA</span>
          <span>Objectif: {fmt(report.comparisons.month_progress.target)} FCFA</span>
        </div>
      </div>

      {/* Top clients + products */}
      <div className="grid grid-cols-2 gap-2.5">
        {report.topClients.length > 0 && (
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <h4 className="text-xs font-bold text-slate-300">Top Clients</h4>
            </div>
            <div className="space-y-1">
              {report.topClients.map((c: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0 group hover:bg-white/[0.02] rounded-lg px-1 -mx-1 transition">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${i === 0 ? 'bg-amber-500/15 text-amber-400' : i === 1 ? 'bg-slate-500/15 text-slate-400' : 'bg-orange-500/15 text-orange-400'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-[11px] text-slate-300 truncate max-w-[80px]">{c.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-400">{fmt(c.ca)} F</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.topProducts.length > 0 && (
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <h4 className="text-xs font-bold text-slate-300">Top Produits</h4>
            </div>
            <div className="space-y-1">
              {report.topProducts.map((p: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0 group hover:bg-white/[0.02] rounded-lg px-1 -mx-1 transition">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${i === 0 ? 'bg-violet-500/15 text-violet-400' : i === 1 ? 'bg-indigo-500/15 text-indigo-400' : 'bg-purple-500/15 text-purple-400'}`}>
                      {i + 1}
                    </span>
                    <span className="text-[11px] text-slate-300 truncate max-w-[80px]">{p.produit}</span>
                  </div>
                  <span className="text-[11px] font-bold text-purple-400">{fmt(p.ca)} F</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Insights */}
      {report.insights.length > 0 && (
        <div className="space-y-2">
          <SectionTitle icon={Lightbulb} label="Insights IA" color="amber" />
          {report.insights.map((ins, i) => (
            <InsightRow key={i} type={ins.type} icon={ins.icon} text={ins.text} />
          ))}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="space-y-2">
          <SectionTitle icon={Target} label="Recommandations" color="indigo" />
          {report.recommendations.map((r, i) => (
            <div key={i} className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl border transition-all hover:bg-white/[0.02] ${
              r.priority === 'high' ? 'bg-rose-500/[0.04] border-rose-500/10' :
              r.priority === 'medium' ? 'bg-amber-500/[0.04] border-amber-500/10' :
              'bg-emerald-500/[0.04] border-emerald-500/10'
            }`}>
              <span className="text-sm flex-none">{r.icon}</span>
              <div>
                <span className="text-xs text-slate-300 leading-relaxed">{r.text}</span>
                <span className={`ml-2 text-[9px] font-bold uppercase tracking-wider ${
                  r.priority === 'high' ? 'text-rose-400' : r.priority === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                }`}>{r.priority}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ╔═══════════════════════════════════════════════════════════════╗
   ║                  PREDICTIONS PANEL                          ║
   ╚═══════════════════════════════════════════════════════════════╝ */
function PredictionsPanel() {
  const [data, setData] = useState<PredictionData | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [subTab, setSubTab] = useState<'global' | 'products'>('global');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [globalRes, prodRes] = await Promise.all([
        fetch(`${API}/predictions?days=${days}&forecast=7`, { headers: getAuthHeaders() }).then(r => r.json()),
        fetch(`${API}/predictions/products?days=${days}`, { headers: getAuthHeaders() }).then(r => r.json())
      ]);
      if (globalRes.success) setData(globalRes);
      if (prodRes.success) setProducts(prodRes.products || []);
    } catch {} finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full" />
        </div>
        <div className="text-center">
          <span className="text-sm text-slate-300 font-medium block">Calcul des prédictions...</span>
          <span className="text-[10px] text-slate-600 mt-1 block">Modèle de régression linéaire</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
          {(['global', 'products'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                subTab === t
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
              }`}>
              {t === 'global' ? '🌍 Global' : '📦 Par produit'}
            </button>
          ))}
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-emerald-500/30 appearance-none cursor-pointer">
          <option value={14}>14 jours</option>
          <option value={30}>30 jours</option>
          <option value={60}>60 jours</option>
          <option value={90}>90 jours</option>
        </select>
      </div>

      {subTab === 'global' && data && data.summary && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-2">
            <PredKpi icon={BarChart3} label="Moy/jour" value={`${fmt(data.summary.historical_avg)} F`} color="violet" />
            <PredKpi icon={data.summary.trend === 'hausse' ? TrendingUp : TrendingDown} label="Tendance"
              value={data.summary.trend === 'hausse' ? '↑ Hausse' : data.summary.trend === 'baisse' ? '↓ Baisse' : '→ Stable'}
              sub={`${data.summary.trend_percentage}%`}
              color={data.summary.trend === 'hausse' ? 'emerald' : data.summary.trend === 'baisse' ? 'red' : 'slate'} />
            <PredKpi icon={Target} label="Prévu 7j" value={`${fmt(data.summary.predicted_total)} F`} color="cyan" />
            <PredKpi icon={Activity} label="Fiabilité" value={data.model?.r_squared || '?'} sub="R²" color="indigo" />
          </div>

          {/* Chart */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-24 bg-gradient-to-br from-emerald-500/[0.06] to-transparent blur-2xl" />
            <div className="flex items-center gap-2 mb-4 relative">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="text-xs font-bold text-slate-300">Historique + Prévisions</h4>
            </div>
            <div className="h-60 relative">
              <ResponsiveContainer>
                <AreaChart data={[
                  ...data.historical.map((h: any) => ({ date: String(h.date).slice(5), ca: h.ca, predicted: null })),
                  ...data.predictions.map((p: any) => ({ date: p.dayName, ca: null, predicted: p.predicted_ca, lower: p.lower_bound, upper: p.upper_bound }))
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#475569' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
                  <Tooltip contentStyle={{ background: '#0f0f2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, fontSize: 11, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }} />
                  <Area type="monotone" dataKey="upper" fill="rgba(99,102,241,0.03)" stroke="none" />
                  <Area type="monotone" dataKey="lower" fill="rgba(99,102,241,0.03)" stroke="none" />
                  <Area type="monotone" dataKey="ca" fill="rgba(129,140,248,0.12)" stroke="#818cf8" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="predicted" fill="rgba(168,85,247,0.12)" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="6 3" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-5 mt-3 justify-center">
              <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-indigo-400 rounded-full" /><span className="text-[9px] text-slate-600">Historique</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-purple-400 rounded-full" style={{ borderBottom: '1px dashed' }} /><span className="text-[9px] text-slate-600">Prévisions</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-3 bg-indigo-500/10 rounded" /><span className="text-[9px] text-slate-600">Intervalle</span></div>
            </div>
          </div>

          {/* Forecast details */}
          <div className="space-y-1.5">
            <SectionTitle icon={CalendarDays} label="Prévisions détaillées" color="emerald" />
            {data.predictions.map((p: any, i: number) => (
              <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-white/[0.1] transition-all">
                <button onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs hover:bg-white/[0.02] transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-slate-300 font-medium block">{p.dayName}</span>
                      <span className="text-[10px] text-slate-600">{p.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold text-sm">{fmt(p.predicted_ca)} F</span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${p.confidence >= 70 ? 'bg-emerald-500/10 text-emerald-400' : p.confidence >= 50 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                      {p.confidence}%
                    </span>
                    {expandedDay === i ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
                  </div>
                </button>
                {expandedDay === i && (
                  <div className="px-4 pb-3 grid grid-cols-3 gap-3 text-[10px] border-t border-white/[0.04] pt-3">
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"><span className="text-slate-600">Prévu</span><br/><span className="text-white font-bold">{fmt(p.predicted_ca)} F</span></div>
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"><span className="text-slate-600">Min</span><br/><span className="text-red-400 font-bold">{fmt(p.lower_bound)} F</span></div>
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"><span className="text-slate-600">Max</span><br/><span className="text-emerald-400 font-bold">{fmt(p.upper_bound)} F</span></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Insights */}
          {data.insights && data.insights.length > 0 && (
            <div className="space-y-1.5">
              {data.insights.map((ins: any, i: number) => (
                <InsightRow key={i} type={ins.type} icon={ins.icon} text={ins.text} />
              ))}
            </div>
          )}
        </>
      )}

      {subTab === 'global' && (!data || !data.summary) && (
        <EmptyState icon={BarChart3} text={data?.message || 'Aucune donnée de prédiction disponible. Vérifiez que vous êtes connecté.'} />
      )}

      {subTab === 'products' && (
        <div className="space-y-2.5">
          {products.length === 0 && <EmptyState icon={Package} text="Aucune donnée produit" />}
          {products.map((p, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all group">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${p.trend === 'hausse' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {p.trend === 'hausse' ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">{p.produit}</span>
                    <span className="text-[10px] text-slate-600 block mt-0.5">Analyse sur {days} jours</span>
                  </div>
                </div>
                <span className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold ${p.trend === 'hausse' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {p.trend === 'hausse' ? '↑' : '↓'} {p.trend === 'hausse' ? '+' : ''}{p.trend_pct}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-slate-600 block mb-0.5">Moy/jour</span>
                  <span className="text-white font-bold">{fmt(p.ca_moyen)} F</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-slate-600 block mb-0.5">Total</span>
                  <span className="text-white font-bold">{fmt(p.ca_total)} F</span>
                </div>
                <div className="p-2.5 rounded-lg bg-violet-500/[0.06] border border-violet-500/10">
                  <span className="text-slate-600 block mb-0.5">Demain</span>
                  <span className="text-violet-400 font-black">{fmt(p.next_day_prediction)} F</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ╔═══════════════════════════════════════════════════════════════╗
   ║                   ANOMALIES PANEL                           ║
   ╚═══════════════════════════════════════════════════════════════╝ */
function AnomaliesPanel() {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [filterCat, setFilterCat] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/anomalies?days=${days}`, { headers: getAuthHeaders() });
      const d = await res.json();
      if (d.success) setData(d);
    } catch {} finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-rose-400 animate-spin" />
          <div className="absolute inset-0 bg-rose-400/20 blur-2xl rounded-full" />
        </div>
        <div className="text-center">
          <span className="text-sm text-slate-300 font-medium block">Scan des anomalies...</span>
          <span className="text-[10px] text-slate-600 mt-1 block">Analyse statistique des écarts</span>
        </div>
      </div>
    );
  }
  if (!data) return <EmptyState icon={Shield} text="Aucune donnée" />;

  const riskColor = data.riskScore >= 70 ? '#f43f5e' : data.riskScore >= 40 ? '#fbbf24' : data.riskScore >= 15 ? '#818cf8' : '#10b981';
  const riskEmoji = data.riskScore >= 70 ? '🔴' : data.riskScore >= 40 ? '🟡' : data.riskScore >= 15 ? '🔵' : '🟢';
  const riskGradient = data.riskScore >= 70 ? 'from-rose-500/10' : data.riskScore >= 40 ? 'from-amber-500/10' : 'from-indigo-500/10';
  const gaugeData = [{ name: 'risk', value: data.riskScore, fill: riskColor }];
  const categories = Array.from(new Set(data.anomalies.map(a => a.category)));
  const filtered = filterCat ? data.anomalies.filter(a => a.category === filterCat) : data.anomalies;

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
      {/* Period */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {riskEmoji} Détection d'anomalies
          </h3>
          <span className="text-[10px] text-slate-500">Surveillance intelligente en continu</span>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-rose-500/30">
          <option value={7}>7 jours</option>
          <option value={14}>14 jours</option>
          <option value={30}>30 jours</option>
          <option value={60}>60 jours</option>
        </select>
      </div>

      {/* Risk score */}
      <div className={`relative p-6 rounded-2xl bg-gradient-to-br ${riskGradient} to-transparent border border-white/[0.06] overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/[0.01]" />
        <div className="flex items-center gap-6 relative">
          <div className="w-28 h-20 flex-none">
            <ResponsiveContainer>
              <RadialBarChart cx="50%" cy="100%" innerRadius="55%" outerRadius="100%" startAngle={180} endAngle={0} barSize={14} data={gaugeData}>
                <RadialBar background={{ fill: 'rgba(255,255,255,0.04)' }} dataKey="value" cornerRadius={7} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-5xl font-black tracking-tight" style={{ color: riskColor }}>{data.riskScore}</div>
            <div className="text-xs text-slate-400 capitalize font-semibold mt-0.5">Risque: {data.riskLevel}</div>
          </div>
          <div className="flex-1 text-right">
            <Shield className="w-10 h-10 text-slate-800 ml-auto" />
          </div>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-2.5">
        <CountCard icon={AlertOctagon} label="Critique" count={data.summary.critical} color="rose" />
        <CountCard icon={AlertTriangle} label="Alerte" count={data.summary.warning} color="amber" />
        <CountCard icon={Info} label="Info" count={data.summary.info} color="blue" />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFilterCat('')}
          className={`px-3.5 py-2 rounded-xl text-[11px] font-semibold transition-all duration-300 ${
            !filterCat ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-500/15' : 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06] border border-white/[0.06]'
          }`}>
          Toutes ({data.summary.total})
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilterCat(filterCat === cat ? '' : cat)}
            className={`px-3 py-2 rounded-xl text-[11px] font-semibold transition-all duration-300 ${
              filterCat === cat ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-500/15' : 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.06] border border-white/[0.06]'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Anomaly list */}
      <div className="space-y-2">
        {filtered.map((a, i) => (
          <div key={i} className={`rounded-xl border overflow-hidden transition-all ${
            expandedId === i ? 'bg-white/[0.04] border-white/[0.1] shadow-lg' : 'bg-white/[0.02] border-white/[0.06]'
          }`}>
            <button onClick={() => setExpandedId(expandedId === i ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition">
              <SevIndicator severity={a.severity} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{a.title}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{a.category} • {a.date}</div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide ${
                a.severity >= 8 ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' : a.severity >= 5 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
              }`}>
                {a.severity >= 8 ? '🔴 CRITIQUE' : a.severity >= 5 ? '🟡 ALERTE' : '🔵 INFO'}
              </span>
              {expandedId === i ? <ChevronUp className="w-4 h-4 text-slate-600 flex-none" /> : <ChevronDown className="w-4 h-4 text-slate-600 flex-none" />}
            </button>
            {expandedId === i && (
              <div className="px-4 pb-4 text-xs text-slate-400 border-t border-white/[0.04] pt-3 leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: a.description.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') }} />
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-emerald-500/40" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Aucune anomalie</p>
            <p className="text-[10px] text-slate-700 mt-1">Tout est normal dans cette catégorie</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="space-y-2">
          <SectionTitle icon={Target} label="Recommandations" color="rose" />
          {data.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/10 hover:bg-indigo-500/[0.06] transition-all">
              <span className="text-sm flex-none">{r.icon}</span>
              <span className="text-xs text-slate-300 leading-relaxed">{r.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ╔═══════════════════════════════════════════════════════════════╗
   ║                   CHART RENDERER                            ║
   ╚═══════════════════════════════════════════════════════════════╝ */
function ChartRenderer({ data, type }: { data: any[]; type: string }) {
  if (!data || !data.length) return null;

  const tooltipStyle = {
    background: '#0f0f2a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    fontSize: 11,
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
  };

  if (type === 'bar') {
    return (
      <div className="h-52">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#475569' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
            <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v) + ' FCFA', 'Montant']} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'pie') {
    return (
      <div className="h-52">
        <ResponsiveContainer>
          <RechartsPie>
            <Pie data={data} cx="50%" cy="50%" outerRadius={75} innerRadius={42} dataKey="value" paddingAngle={3}
              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}
              style={{ fontSize: 9 }}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v) + ' FCFA', 'Montant']} />
          </RechartsPie>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'area' || type === 'line') {
    return (
      <div className="h-52">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#475569' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
            <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v) + ' FCFA', 'Montant']} />
            <Area type="monotone" dataKey="value" fill="rgba(129,140,248,0.12)" stroke="#818cf8" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}

/* ╔═══════════════════════════════════════════════════════════════╗
   ║                  SHARED SUB-COMPONENTS                      ║
   ╚═══════════════════════════════════════════════════════════════╝ */

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
        <Icon className="w-8 h-8 text-slate-700" />
      </div>
      <span className="text-sm text-slate-600 font-medium">{text}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-md bg-${color}-500/10 flex items-center justify-center`}>
        <Icon className={`w-3 h-3 text-${color}-400`} />
      </div>
      <h4 className="text-xs font-bold text-slate-300 tracking-wide">{label}</h4>
      <div className="flex-1 h-px bg-gradient-to-r from-white/[0.04] to-transparent" />
    </div>
  );
}

function ConfBadge({ label, value }: { label: string; value: number }) {
  const [bg, text, border] = value >= 90
    ? ['bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20']
    : value >= 65 ? ['bg-violet-500/10', 'text-violet-400', 'border-violet-500/20']
    : value >= 50 ? ['bg-amber-500/10', 'text-amber-400', 'border-amber-500/20']
    : ['bg-red-500/10', 'text-red-400', 'border-red-500/20'];
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-md ${bg} ${text} border ${border} font-bold flex items-center gap-1`}>
      <Gauge className="w-2.5 h-2.5" /> {label} {value}%
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, positive, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; positive?: boolean; color: string
}) {
  return (
    <div className={`p-3.5 rounded-xl bg-${color}-500/[0.04] border border-${color}-500/[0.08] relative overflow-hidden group hover:bg-${color}-500/[0.06] transition-all`}>
      <div className={`absolute top-0 right-0 w-16 h-16 bg-${color}-500/[0.03] rounded-full blur-2xl`} />
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className={`w-3.5 h-3.5 text-${color}-400`} />
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</span>
        </div>
        <div className={`text-base font-black text-${color}-400`}>{value}</div>
        {sub && (
          <div className={`text-[10px] mt-1 font-semibold ${positive !== undefined ? (positive ? 'text-emerald-400' : 'text-red-400') : `text-${color}-400/60`}`}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function CompCard({ title, value }: { title: string; value: number }) {
  const positive = value > 0;
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{title}</span>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {positive ? '+' : ''}{value}%
        </div>
      </div>
    </div>
  );
}

function PredKpi({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className={`p-3 rounded-xl bg-${color}-500/[0.04] border border-${color}-500/[0.08] text-center hover:bg-${color}-500/[0.06] transition-all`}>
      <Icon className={`w-4 h-4 text-${color}-400 mx-auto mb-1.5`} />
      <div className={`text-[11px] font-black text-${color}-400 leading-tight`}>{value}</div>
      {sub && <div className={`text-[9px] text-${color}-400/60 font-semibold mt-0.5`}>{sub}</div>}
      <div className="text-[9px] text-slate-600 mt-1">{label}</div>
    </div>
  );
}

function CountCard({ icon: Icon, label, count, color }: {
  icon: React.ElementType; label: string; count: number; color: string
}) {
  return (
    <div className={`p-3.5 rounded-xl bg-${color}-500/[0.04] border border-${color}-500/[0.08] flex items-center gap-3 hover:bg-${color}-500/[0.06] transition-all`}>
      <div className={`w-9 h-9 rounded-lg bg-${color}-500/10 flex items-center justify-center`}>
        <Icon className={`w-4 h-4 text-${color}-400`} />
      </div>
      <div>
        <div className={`text-xl font-black text-${color}-400`}>{count}</div>
        <div className="text-[10px] text-slate-500 font-medium">{label}</div>
      </div>
    </div>
  );
}

function InsightRow({ type, icon, text }: { type: string; icon: string; text: string }) {
  const style = type === 'positive' ? 'bg-emerald-500/[0.04] border-emerald-500/10'
    : type === 'warning' ? 'bg-amber-500/[0.04] border-amber-500/10'
    : type === 'danger' ? 'bg-rose-500/[0.04] border-rose-500/10'
    : 'bg-orange-500/[0.04] border-orange-500/10';
  return (
    <div className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border ${style} hover:bg-white/[0.02] transition-all`}>
      <span className="text-sm flex-none">{icon}</span>
      <span className="text-xs text-slate-300 leading-relaxed">{text}</span>
    </div>
  );
}

function SevIndicator({ severity }: { severity: number }) {
  const lvl = Math.min(5, Math.ceil(severity / 2));
  const color = severity >= 8 ? 'bg-rose-400' : severity >= 5 ? 'bg-amber-400' : 'bg-orange-400';
  return (
    <div className="flex gap-0.5 flex-none">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={`w-1.5 h-5 rounded-sm transition-all ${i < lvl ? color : 'bg-white/[0.06]'}`} />
      ))}
    </div>
  );
}

export default AIChat;
