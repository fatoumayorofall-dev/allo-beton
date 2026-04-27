/**
 * Allô Béton - Page À Propos
 * Histoire, mission, vision et impact social
 */

import React from 'react';
import {
  ArrowRight,
  Award,
  Building2,
  Bot,
  Check,
  Globe,
  Heart,
  HeartHandshake,
  Leaf,
  Lightbulb,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from 'lucide-react';

interface Props {
  onNavigate: (view: any, data?: any) => void;
}

const VALUES = [
  {
    icon: <ShieldCheck className="w-6 h-6 text-orange-600" />,
    title: 'Confiance',
    description: 'Qualité garantie, prix transparents, et engagement total envers nos clients.',
    bg: 'bg-orange-50',
  },
  {
    icon: <Lightbulb className="w-6 h-6 text-amber-600" />,
    title: 'Innovation',
    description: 'L\'intelligence artificielle au service du BTP pour transformer le secteur.',
    bg: 'bg-amber-50',
  },
  {
    icon: <HeartHandshake className="w-6 h-6 text-emerald-600" />,
    title: 'Inclusion',
    description: 'Accessible à tous : particuliers, petits entrepreneurs, grandes entreprises.',
    bg: 'bg-emerald-50',
  },
  {
    icon: <Leaf className="w-6 h-6 text-green-600" />,
    title: 'Durabilité',
    description: 'Optimisation des livraisons, zéro papier, et impact environnemental réduit.',
    bg: 'bg-green-50',
  },
];

const MILESTONES = [
  { year: '2024', title: 'Naissance de l\'idée', description: 'Constat du retard digital du secteur BTP au Sénégal.' },
  { year: '2025', title: 'Création d\'ICOPS SUARL', description: 'Structuration juridique et premiers prototypes.' },
  { year: '2026', title: 'Lancement Allô Béton', description: 'Plateforme e-commerce + IA déployée sur allobeton.sn.' },
  { year: '2027', title: 'Expansion régionale', description: 'Couverture Thiès, Saint-Louis et application mobile native.' },
  { year: '2028', title: 'Afrique de l\'Ouest', description: 'Réplication au Mali, Côte d\'Ivoire, Guinée.' },
];

const TEAM_VALUES = [
  '🇸🇳 Une équipe 100% sénégalaise',
  '👩 Leadership féminin',
  '🎓 Expertise terrain BTP + Tech',
  '🤝 Partenariats locaux solides',
];

export const AboutPage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="bg-white">
      {/* ============================================================ */}
      {/* HERO                                                          */}
      {/* ============================================================ */}
      <section className="relative bg-gradient-to-br from-slate-900 via-orange-950 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 text-xs font-bold uppercase tracking-widest">À propos d'Allô Béton</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              La révolution digitale du <span className="text-orange-400">BTP au Sénégal</span>
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl leading-relaxed">
              Allô Béton transforme l'accès aux matériaux de construction grâce à l'intelligence artificielle,
              le e-commerce et les paiements mobiles locaux.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* MISSION                                                       */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 mb-4">
              <Target className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-orange-700 text-xs font-bold uppercase tracking-wide">Notre Mission</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-6">
              Démocratiser l'accès aux matériaux BTP de qualité
            </h2>
            <p className="text-slate-600 text-base leading-relaxed mb-4">
              Le secteur du BTP représente <strong>plus de 6% du PIB sénégalais</strong> mais souffre encore
              d'une grande informalité. Les petits entrepreneurs perdent du temps à courir entre les dépôts,
              les prix sont opaques, et les femmes sont sous-représentées.
            </p>
            <p className="text-slate-600 text-base leading-relaxed mb-6">
              Allô Béton apporte une solution digitale complète : <strong>commander en 3 clics</strong>,
              recevoir des conseils par IA, payer en mobile money et se faire livrer sur chantier en 24-48h.
            </p>
            <div className="space-y-2">
              {[
                'Inclusion financière des non-bancarisés',
                'Transparence totale des prix du marché',
                'Accompagnement IA gratuit 24h/24',
                'Création d\'emplois locaux',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.pexels.com/photos/9485313/pexels-photo-9485313.jpeg?auto=compress&cs=tinysrgb&w=900"
                alt="Chantier BTP Sénégal"
                className="w-full h-[480px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6 border border-slate-100 max-w-xs">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Depuis</p>
                  <p className="text-2xl font-black text-slate-900">2024</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                ICOPS SUARL — Société de Commerce de Matériaux BTP
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FONDATEUR                                                      */}
      {/* ============================================================ */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            <div className="lg:col-span-2">
              <div className="relative">
                <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center text-white text-6xl font-black shadow-xl">
                    AC
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-xs text-slate-500">Entreprise</p>
                      <p className="text-sm font-black text-slate-900">ICOPS SUARL</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 mb-4">
                <Quote className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-orange-700 text-xs font-bold uppercase tracking-wide">Mot du fondateur</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2">
                Alioune CISSE
              </h2>
              <p className="text-orange-700 font-semibold text-sm mb-6">Fondateur & Gérant · ICOPS SUARL</p>
              <blockquote className="text-slate-700 text-base leading-relaxed border-l-4 border-orange-500 pl-6 italic mb-6">
                "Au Sénégal, trop d'entrepreneurs perdent des journées entières à chercher leurs matériaux,
                trop de chantiers sont retardés par manque d'information sur les bons matériaux à utiliser.
                <br /><br />
                <strong className="text-slate-900 not-italic">
                  Allô Béton, c'est notre réponse à ces problèmes :
                </strong> une plateforme où tout le monde — du particulier qui construit sa première maison
                au grand entrepreneur — a accès aux mêmes outils, aux mêmes prix, et aux mêmes conseils experts."
              </blockquote>
              <div className="flex flex-wrap gap-3">
                <a
                  href="mailto:contact@allobeton.sn"
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                >
                  <Mail className="w-4 h-4" /> Nous contacter
                </a>
                <button
                  className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                >
                  <Linkedin className="w-4 h-4 text-orange-700" /> LinkedIn
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* VALEURS                                                       */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 mb-3">
            <Heart className="w-3.5 h-3.5 text-orange-600" />
            <span className="text-orange-700 text-xs font-bold uppercase tracking-wide">Nos Valeurs</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
            Ce qui nous fait avancer
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            4 piliers qui guident chacune de nos décisions et chaque interaction avec nos clients.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map((v) => (
            <div key={v.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow group">
              <div className={`w-12 h-12 ${v.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                {v.icon}
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">{v.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* HISTOIRE / TIMELINE                                            */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-slate-900 via-orange-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 rounded-full px-4 py-1.5 mb-4">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 text-xs font-bold uppercase tracking-widest">Notre Parcours</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              D'une idée à une révolution
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              De la conception à la conquête de l'Afrique de l'Ouest.
            </p>
          </div>
          <div className="relative max-w-4xl mx-auto">
            {/* Timeline line */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-orange-500/30 transform sm:-translate-x-1/2" />
            <div className="space-y-8">
              {MILESTONES.map((m, i) => (
                <div key={m.year} className={`relative flex items-start gap-6 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse sm:text-right'}`}>
                  {/* Dot */}
                  <div className="relative z-10 w-9 h-9 bg-orange-500 rounded-full border-4 border-slate-900 flex items-center justify-center flex-shrink-0 sm:absolute sm:left-1/2 sm:transform sm:-translate-x-1/2">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  {/* Card */}
                  <div className={`flex-1 sm:max-w-md bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 ${i % 2 === 0 ? 'sm:mr-auto sm:pr-12' : 'sm:ml-auto sm:pl-12'}`}>
                    <p className="text-orange-400 text-sm font-bold mb-1">{m.year}</p>
                    <h3 className="text-white font-bold text-lg mb-2">{m.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* IMPACT SOCIAL                                                  */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-3">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-wide">Impact Social</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
            Plus qu'une plateforme, un mouvement
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Allô Béton crée un impact mesurable au Sénégal et bientôt en Afrique de l'Ouest.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { value: '2 500+', label: 'Clients servis', icon: <Users className="w-6 h-6" />, color: 'text-orange-700 bg-orange-50' },
            { value: '50+', label: 'Emplois créés', icon: <Building2 className="w-6 h-6" />, color: 'text-emerald-700 bg-emerald-50' },
            { value: '25%', label: 'Économies clients', icon: <TrendingUp className="w-6 h-6" />, color: 'text-violet-700 bg-violet-50' },
            { value: '24/7', label: 'IA disponible', icon: <Bot className="w-6 h-6" />, color: 'text-amber-700 bg-amber-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
              <div className={`w-14 h-14 ${s.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                {s.icon}
              </div>
              <p className="text-4xl font-black text-slate-900 mb-1">{s.value}</p>
              <p className="text-sm text-slate-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Team values */}
        <div className="mt-12 bg-gradient-to-br from-orange-50 to-cyan-50 border border-orange-100 rounded-2xl p-8 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-900 mb-3">Une équipe sénégalaise engagée</h3>
              <p className="text-slate-600 leading-relaxed">
                Allô Béton est avant tout un projet humain, porté par des Sénégalais
                qui croient au potentiel digital de leur pays et de l'Afrique.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEAM_VALUES.map((v) => (
                <div key={v} className="bg-white rounded-xl p-3 text-sm font-semibold text-slate-700 flex items-center gap-2 shadow-sm">
                  {v}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* TECHNOLOGIE                                                    */}
      {/* ============================================================ */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-3 py-1 mb-3">
              <Zap className="w-3.5 h-3.5 text-violet-600" />
              <span className="text-violet-700 text-xs font-bold uppercase tracking-wide">Technologie</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Une stack technologique de pointe
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Allô Béton utilise les dernières technologies pour offrir une expérience moderne, sécurisée et performante.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Bot className="w-6 h-6 text-orange-600" />
                <h3 className="font-bold text-slate-900">Intelligence Artificielle</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Chatbot IA expert BTP, calculs automatiques de quantités et conseils techniques 24h/24.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <h3 className="font-bold text-slate-900">Cybersécurité</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Chiffrement SSL 256-bit, paiements sécurisés via Wave, Orange Money et carte bancaire.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-6 h-6 text-violet-600" />
                <h3 className="font-bold text-slate-900">Cloud Scalable</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Infrastructure cloud (Netlify + Railway) pour une disponibilité 99.9% et une scalabilité Afrique.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA                                                           */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-r from-orange-600 to-orange-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                Rejoignez l'aventure Allô Béton
              </h2>
              <p className="text-orange-100">
                Découvrez nos produits et bénéficiez de nos conseils experts gratuitement.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('catalog')}
                className="inline-flex items-center gap-2 bg-white text-orange-700 font-bold px-7 py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-lg"
              >
                Voir le catalogue <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="tel:+221338001234"
                className="inline-flex items-center gap-2 border-2 border-white/40 hover:border-white text-white font-bold px-7 py-3.5 rounded-xl transition-colors"
              >
                <Phone className="w-5 h-5" /> Nous contacter
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
