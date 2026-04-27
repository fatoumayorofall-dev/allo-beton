import React, { useState } from 'react';
import {
  Eye, EyeOff, Mail, Lock, AlertCircle, UserPlus,
  ArrowRight, CheckCircle, User, Loader2,
  BarChart3, Users, ShieldCheck, Truck
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

// Composant Logo Allo Béton - Design Premium avec effet 3D
const AlloBétonLogo: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size = 'md' }) => {
  const sizes = {
    sm: { width: 40, height: 40 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 80, height: 80 },
  };
  const s = sizes[size];

  return (
    <div style={{ width: s.width, height: s.height }} className="relative group">
      <svg viewBox="0 0 100 100" className="w-full h-full transition-transform duration-500 group-hover:scale-105">
        <defs>
          {/* Dégradé principal bleu marine */}
          <linearGradient id="loginBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2c5282" />
            <stop offset="50%" stopColor="#1a365d" />
            <stop offset="100%" stopColor="#0f2744" />
          </linearGradient>

          {/* Dégradé orange accent */}
          <linearGradient id="loginAccentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f6ad55" />
            <stop offset="50%" stopColor="#ed8936" />
            <stop offset="100%" stopColor="#dd6b20" />
          </linearGradient>

          {/* Effet de brillance */}
          <linearGradient id="loginShineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="50%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* Ombre portée */}
          <filter id="loginShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1a365d" floodOpacity="0.3"/>
          </filter>

          {/* Effet de relief pour les lettres */}
          <filter id="loginLetterShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#0f2744" floodOpacity="0.4"/>
          </filter>
        </defs>

        {/* Fond carré arrondi avec dégradé */}
        <rect
          x="4" y="4"
          width="92" height="92"
          rx="18" ry="18"
          fill="url(#loginBgGradient)"
          filter="url(#loginShadow)"
        />

        {/* Effet de brillance en haut à gauche */}
        <path
          d="M4 22 Q4 4 22 4 L78 4 Q96 4 96 22 L96 40 Q50 35 4 22 Z"
          fill="url(#loginShineGradient)"
          opacity="0.6"
        />

        {/* Bande décorative en bas - représente le béton coulé */}
        <rect
          x="4" y="75"
          width="92" height="21"
          rx="0" ry="0"
          fill="url(#loginAccentGradient)"
          clipPath="inset(0 0 0 0 round 0 0 18px 18px)"
        />
        <rect
          x="4" y="75"
          width="92" height="4"
          fill="white"
          opacity="0.15"
        />

        {/* Lettre A - Style moderne avec effet 3D */}
        <g filter="url(#loginLetterShadow)">
          <text
            x="18" y="68"
            fontFamily="'Poppins', 'Segoe UI', 'Arial Black', sans-serif"
            fontSize="52"
            fontWeight="800"
            fill="white"
            letterSpacing="-3"
          >
            A
          </text>
        </g>

        {/* Lettre B - Style moderne avec accent orange */}
        <g filter="url(#loginLetterShadow)">
          <text
            x="50" y="68"
            fontFamily="'Poppins', 'Segoe UI', 'Arial Black', sans-serif"
            fontSize="52"
            fontWeight="800"
            fill="url(#loginAccentGradient)"
            letterSpacing="-3"
          >
            B
          </text>
        </g>

        {/* Petit accent décoratif - cube de béton stylisé */}
        <g transform="translate(78, 8)">
          <rect x="0" y="0" width="12" height="12" rx="3" fill="url(#loginAccentGradient)" opacity="0.9"/>
          <rect x="0" y="0" width="12" height="4" rx="2" fill="white" opacity="0.3"/>
        </g>

        {/* Points décoratifs effet texture béton */}
        <circle cx="85" cy="35" r="2" fill="white" opacity="0.15"/>
        <circle cx="12" cy="45" r="1.5" fill="white" opacity="0.1"/>
        <circle cx="88" cy="55" r="1" fill="white" opacity="0.12"/>
      </svg>
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const { login, register, resetPassword } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      let result;

      if (isLogin) {
        result = await login(email, password);
      } else {
        if (!agreeTerms) {
          setError('Veuillez accepter les conditions d\'utilisation');
          setIsLoading(false);
          return;
        }
        result = await register(email, password, firstName, lastName);
      }

      if (!result.success) {
        setError(result.error || 'Une erreur est survenue');
      } else if (!isLogin) {
        setMessage('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
        setIsLogin(true);
        setFirstName('');
        setLastName('');
        setPassword('');
        setAgreeTerms(false);
      }
    } catch (error) {
      setError('Une erreur est survenue lors de l\'opération');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Veuillez saisir votre adresse email ou téléphone');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await resetPassword(email);
      if (result.success) {
        setMessage('Un email de réinitialisation a été envoyé à votre adresse');
      } else {
        setError(result.error || 'Erreur lors de l\'envoi de l\'email');
      }
    } catch (error) {
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setMessage('');
  };

  const features = [
    { icon: BarChart3, title: 'Tableau de bord', desc: 'Statistiques en temps réel' },
    { icon: Users, title: 'Gestion clients', desc: 'Suivi complet des clients' },
    { icon: Truck, title: 'Livraisons', desc: 'Traçabilité des commandes' },
    { icon: ShieldCheck, title: 'Sécurisé', desc: 'Données protégées' },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-white via-gray-50 to-orange-50/30">
      {/* Subtle animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-100/40 to-indigo-100/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '8s' }}
        ></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-50/50 to-cyan-50/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '10s', animationDelay: '2s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-transparent via-orange-50/20 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '12s', animationDelay: '4s' }}
        ></div>
      </div>

      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between p-12 xl:p-16">
        {/* Content */}
        <div className="relative z-10">
          {/* Logo Allo Béton */}
          <div className="flex items-center space-x-3 group">
            <div className="transition-transform duration-300 group-hover:scale-105">
              <AlloBétonLogo size="lg" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                <span className="text-[#1e3a5f]">Allô</span>
                <span className="text-[#F5A623] ml-1">Béton</span>
              </h1>
              <p className="text-[10px] text-[#1e3a5f]/60 uppercase tracking-widest font-medium">
                BÉTON <span className="text-[#F5A623]">•</span> MORTIER <span className="text-[#F5A623]">•</span> LIVRAISON
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 space-y-10 max-w-lg">
          <div className="space-y-5">
            <h2 className="text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">
              Gérez votre entreprise
              <span className="bg-gradient-to-r from-orange-600 to-indigo-600 bg-clip-text text-transparent"> simplement</span>
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Une plateforme complète pour gérer vos ventes, stocks, clients et livraisons au quotidien.
            </p>
          </div>

          {/* Features with hover animations and colored backgrounds */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => {
              const cardStyles = [
                { bg: 'bg-gradient-to-br from-orange-50/80 to-orange-100/50', border: 'border-l-orange-400', iconBg: 'from-orange-200 to-orange-100', iconColor: 'text-orange-600', hoverShadow: 'hover:shadow-orange-200/50' },
                { bg: 'bg-gradient-to-br from-indigo-50/80 to-indigo-100/50', border: 'border-l-indigo-400', iconBg: 'from-indigo-200 to-indigo-100', iconColor: 'text-indigo-600', hoverShadow: 'hover:shadow-indigo-200/50' },
                { bg: 'bg-gradient-to-br from-cyan-50/80 to-cyan-100/50', border: 'border-l-cyan-400', iconBg: 'from-cyan-200 to-cyan-100', iconColor: 'text-cyan-600', hoverShadow: 'hover:shadow-cyan-200/50' },
                { bg: 'bg-gradient-to-br from-violet-50/80 to-violet-100/50', border: 'border-l-violet-400', iconBg: 'from-violet-200 to-violet-100', iconColor: 'text-violet-600', hoverShadow: 'hover:shadow-violet-200/50' },
              ];
              const style = cardStyles[index];
              return (
                <div
                  key={index}
                  className={`group ${style.bg} backdrop-blur-sm rounded-2xl p-5 border border-white/60 border-l-4 ${style.border} hover:shadow-lg ${style.hoverShadow} transition-all duration-300 cursor-default`}
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${style.iconBg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <feature.icon className={`w-5 h-5 ${style.iconColor}`} />
                  </div>
                  <h3 className="text-gray-800 font-semibold mb-1">{feature.title}</h3>
                  <p className="text-gray-500 text-sm">{feature.desc}</p>
                </div>
              );
            })}
          </div>

          </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center space-x-6 text-sm text-gray-400">
          <span>© {new Date().getFullYear()} Allo Béton</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
          <span className="hover:text-gray-600 transition-colors cursor-pointer">Confidentialité</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
          <span className="hover:text-gray-600 transition-colors cursor-pointer">Conditions</span>
        </div>
      </div>

      {/* Right Panel - Form with gradient background */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 relative z-10 bg-gradient-to-br from-orange-50 via-indigo-50/50 to-violet-50/30">
        {/* Decorative background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-orange-200/30 to-indigo-200/20 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-10 w-40 h-40 bg-gradient-to-tr from-violet-200/30 to-purple-200/20 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-gradient-to-r from-cyan-200/20 to-orange-200/20 rounded-full blur-xl"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-10">
            <AlloBétonLogo size="md" />
            <div>
              <h1 className="text-xl font-bold">
                <span className="text-[#1e3a5f]">Allô</span>
                <span className="text-[#F5A623] ml-1">Béton</span>
              </h1>
              <p className="text-[9px] text-[#1e3a5f]/60 uppercase tracking-wider font-medium">
                BÉTON <span className="text-[#F5A623]">•</span> MORTIER <span className="text-[#F5A623]">•</span> LIVRAISON
              </p>
            </div>
          </div>

          {/* Form Card with gradient border */}
          <div className="relative">
            {/* Animated gradient border effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 via-indigo-400 to-violet-400 rounded-3xl blur-sm opacity-40 animate-pulse" style={{ animationDuration: '4s' }}></div>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 via-indigo-500 to-violet-500 rounded-3xl opacity-20"></div>

            <div className="relative bg-white rounded-3xl p-8 shadow-2xl shadow-indigo-200/50 border border-white/80">
              {/* Form Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 via-indigo-500 to-violet-500 rounded-2xl mb-5 transition-transform duration-300 hover:scale-105 shadow-lg shadow-indigo-500/30">
                  {isLogin ? (
                    <Lock className="w-8 h-8 text-white" />
                  ) : (
                    <UserPlus className="w-8 h-8 text-white" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {isLogin ? 'Bon retour !' : 'Créer un compte'}
                </h2>
                <p className="text-gray-500">
                  {isLogin
                    ? 'Connectez-vous pour continuer'
                    : 'Inscrivez-vous gratuitement'
                  }
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-600 text-sm">{error}</span>
                </div>
              )}

              {/* Success Message */}
              {message && (
                <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start space-x-3 animate-in slide-in-from-top-2 duration-300">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-green-600 text-sm">{message}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name fields for registration */}
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prénom
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className={`w-5 h-5 transition-colors duration-200 ${focusedField === 'firstName' ? 'text-orange-500' : 'text-gray-400'}`} />
                        </div>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          onFocus={() => setFocusedField('firstName')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full pl-12 pr-4 py-3 bg-gray-50/50 border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-all duration-200 ${
                            focusedField === 'firstName'
                              ? 'border-orange-500 bg-white ring-4 ring-orange-500/10'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-white'
                          }`}
                          placeholder="Jean"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className={`w-5 h-5 transition-colors duration-200 ${focusedField === 'lastName' ? 'text-orange-500' : 'text-gray-400'}`} />
                        </div>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          onFocus={() => setFocusedField('lastName')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full pl-12 pr-4 py-3 bg-gray-50/50 border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-all duration-200 ${
                            focusedField === 'lastName'
                              ? 'border-orange-500 bg-white ring-4 ring-orange-500/10'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-white'
                          }`}
                          placeholder="Dupont"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Email ou téléphone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail ou téléphone
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className={`w-5 h-5 transition-colors duration-200 ${focusedField === 'email' ? 'text-orange-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-12 pr-4 py-3 bg-gray-50/50 border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-all duration-200 ${
                        focusedField === 'email'
                          ? 'border-orange-500 bg-white ring-4 ring-orange-500/10'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-white'
                      }`}
                      placeholder="vous@exemple.com ou 77 xxx xx xx"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Mot de passe
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
                      >
                        Oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className={`w-5 h-5 transition-colors duration-200 ${focusedField === 'password' ? 'text-orange-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-12 pr-12 py-3 bg-gray-50/50 border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-all duration-200 ${
                        focusedField === 'password'
                          ? 'border-orange-500 bg-white ring-4 ring-orange-500/10'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-white'
                      }`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Terms checkbox for registration */}
                {!isLogin && (
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="w-4 h-4 text-orange-600 border-2 border-gray-300 rounded focus:ring-orange-500 cursor-pointer transition-colors"
                      />
                    </div>
                    <label className="text-sm text-gray-600 cursor-pointer" onClick={() => setAgreeTerms(!agreeTerms)}>
                      J'accepte les{' '}
                      <span className="text-orange-600 hover:underline font-medium">
                        conditions d'utilisation
                      </span>{' '}
                      et la{' '}
                      <span className="text-orange-600 hover:underline font-medium">
                        politique de confidentialité
                      </span>
                    </label>
                  </div>
                )}

                {/* Remember me for login */}
                {isLogin && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      className="w-4 h-4 text-orange-600 border-2 border-gray-300 rounded focus:ring-orange-500 cursor-pointer transition-colors"
                    />
                    <label htmlFor="remember" className="ml-2 text-sm text-gray-600 cursor-pointer">
                      Se souvenir de moi
                    </label>
                  </div>
                )}

                {/* Submit Button with gradient */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 via-indigo-500 to-violet-500 hover:from-orange-600 hover:via-indigo-600 hover:to-violet-600 disabled:from-orange-400 disabled:via-indigo-400 disabled:to-violet-400 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:shadow-none hover:-translate-y-0.5 disabled:translate-y-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{isLogin ? 'Connexion...' : 'Création...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isLogin ? 'Se connecter' : 'Créer mon compte'}</span>
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-400">ou</span>
                </div>
              </div>

              {/* Toggle Login/Register */}
              <p className="text-center text-gray-600">
                {isLogin ? "Pas encore de compte ?" : 'Déjà inscrit ?'}{' '}
                <button
                  onClick={switchMode}
                  className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
                >
                  {isLogin ? 'Créer un compte' : 'Se connecter'}
                </button>
              </p>
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="lg:hidden mt-10 text-center">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Allo Béton. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
