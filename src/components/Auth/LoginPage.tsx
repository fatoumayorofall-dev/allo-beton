import React, { useState } from 'react';
import { Package, Eye, EyeOff, Mail, Lock, AlertCircle, UserPlus, Sparkles, Shield, TrendingUp } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

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
        result = await register(email, password, firstName, lastName);
      }
      
      if (!result.success) {
        setError(result.error || 'Une erreur est survenue');
      } else if (!isLogin) {
        setMessage('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
        setIsLogin(true);
      }
    } catch (error) {
      setError('Une erreur est survenue lors de l\'opération');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Veuillez saisir votre adresse email');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-20"></div>
      
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="text-center lg:text-left space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center lg:justify-start space-x-3">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Allo Béton</h1>
                <p className="text-blue-200 font-medium">Gestion Professionnelle</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
                La solution complète pour votre entreprise de béton
              </h2>
              <p className="text-xl text-blue-100 leading-relaxed">
                Gérez vos ventes, stock, clients et paiements avec une interface moderne et intuitive.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1">Ventes Optimisées</h3>
              <p className="text-sm text-blue-100">Gestion complète des commandes et factures</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-3">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1">Stock Intelligent</h3>
              <p className="text-sm text-blue-100">Alertes automatiques et réapprovisionnement</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1">Sécurisé</h3>
              <p className="text-sm text-blue-100">Données protégées et sauvegardées</p>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="max-w-md mx-auto w-full">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isLogin ? 'Connexion' : 'Créer un compte'}
              </h3>
              <p className="text-gray-600">
                {isLogin ? 'Accédez à votre espace de gestion' : 'Rejoignez Allo Béton dès aujourd\'hui'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-green-700 text-sm">{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80"
                      placeholder="Prénom"
                      required={!isLogin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80"
                      placeholder="Nom"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Se souvenir de moi</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200 font-medium"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {isLogin ? 'Connexion...' : 'Création...'}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    {isLogin ? (
                      <>
                        <Mail className="w-5 h-5 mr-2" />
                        Se connecter
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Créer un compte
                      </>
                    )}
                  </div>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{' '}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setMessage('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200"
                >
                  {isLogin ? 'Créer un compte' : 'Se connecter'}
                </button>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-blue-200">
              © 2024 Allo Béton. Tous droits réservés.
            </p>
            <p className="text-xs text-blue-300 mt-1">
              Fait avec ❤️ au Sénégal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};