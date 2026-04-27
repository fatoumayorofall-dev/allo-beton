import React, { useState, useEffect, useRef } from 'react';
import { X, User, Camera, Save, AlertCircle, CheckCircle, RotateCw, Phone, Mail, Building, Briefcase, FileText, Shield } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import Cropper from 'react-easy-crop';

interface ProfilePageProps {
  onClose: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const ProfilePage: React.FC<ProfilePageProps> = ({ onClose }) => {
  const { user, profile, refreshProfile } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    bio: ''
  });

  const [displayAvatar, setDisplayAvatar] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || '',
        company: profile.company || '',
        position: profile.position || '',
        bio: profile.bio || ''
      });
      if (profile.avatar_url) {
        let fullAvatarUrl = profile.avatar_url;
        if (profile.avatar_url.startsWith('/')) {
          fullAvatarUrl = `${API_BASE_URL.replace('/api', '')}${profile.avatar_url}`;
        }
        setDisplayAvatar(fullAvatarUrl);
      }
    }
  }, [profile, user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result as string);
        setShowCropper(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropConfirm = async () => {
    if (!avatarPreview || !croppedAreaPixels) return;

    setUploading(true);
    setMessage(null);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = avatarPreview;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const { x, y, width, height } = croppedAreaPixels;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(image, x, y, width, height, 0, 0, width, height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => { if (b) resolve(b); else reject(new Error('Failed to create blob')); },
          'image/jpeg',
          0.9
        );
      });

      const formDataToSend = new FormData();
      formDataToSend.append('avatar', blob, 'avatar.jpeg');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      const avatarUrl = result.data?.avatar_url || result.avatar_url;

      let fullAvatarUrl = avatarUrl;
      if (avatarUrl && avatarUrl.startsWith('/')) {
        fullAvatarUrl = `${API_BASE_URL.replace('/api', '')}${avatarUrl}`;
      }

      setDisplayAvatar(fullAvatarUrl);
      setShowCropper(false);
      setAvatarPreview(null);
      await refreshProfile();

      setMessage({ type: 'success', text: 'Photo mise à jour avec succès' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors du téléchargement de la photo' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          company: formData.company,
          position: formData.position,
          bio: formData.bio
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Save failed: ${response.status}`);
      }

      await refreshProfile();
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
      setTimeout(() => { onClose(); }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erreur lors de la sauvegarde du profil' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Cropper Modal */}
      {showCropper && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl sm:max-w-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Redimensionner la photo</h3>
                  <p className="text-sm text-gray-500">Ajustez votre photo de profil</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCropper(false); setAvatarPreview(null); }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 flex-1">
              {/* Tip */}
              <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">💡</span>
                </div>
                <p className="text-sm text-gray-600">Glissez pour déplacer, utilisez la molette ou le curseur pour zoomer</p>
              </div>

              {/* Cropper Area */}
              <div className="relative w-full h-72 sm:h-96 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                {avatarPreview && (
                  <Cropper
                    image={avatarPreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={true}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                )}
              </div>

              {/* Zoom Controls */}
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Niveau de zoom</label>
                  <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
                    {Math.round((zoom - 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>Normal</span>
                  <span>Maximum</span>
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
              >
                <RotateCw className="w-4 h-4" />
                Réinitialiser la position
              </button>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button
                onClick={() => { setShowCropper(false); setAvatarPreview(null); }}
                disabled={uploading}
                className="px-5 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCropConfirm}
                disabled={uploading}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-lg hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Téléchargement...</span>
                  </>
                ) : (
                  <span>Appliquer</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Profile Modal */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-200">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Mon Profil</h2>
                <p className="text-sm text-gray-500">Gérez vos informations personnelles</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Message */}
            {message && (
              <div className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {message.type === 'success'
                  ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                }
                <span>{message.text}</span>
              </div>
            )}

            {/* Avatar Section */}
            <div className="flex items-center gap-5 p-5 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="relative flex-shrink-0">
                <div className="w-28 h-28 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={() => setDisplayAvatar(null)}
                    />
                  ) : (
                    <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                      <User className="w-12 h-12 text-indigo-300" />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute -bottom-2 -right-2 w-9 h-9 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera className="w-4 h-4 text-indigo-600" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {formData.firstName || formData.lastName
                    ? `${formData.firstName} ${formData.lastName}`.trim()
                    : 'Votre nom'}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {formData.position && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Briefcase className="w-3.5 h-3.5" />
                      {formData.position}
                    </span>
                  )}
                  {formData.position && formData.company && <span className="text-gray-300">•</span>}
                  {formData.company && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Building className="w-3.5 h-3.5" />
                      {formData.company}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAvatarClick}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Modifier la photo
                </button>
              </div>
            </div>

            {/* Section: Informations personnelles */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Informations personnelles</h4>
                  <p className="text-xs text-gray-500">Votre identité et nom</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <User className="w-4 h-4 text-indigo-500" />
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Ex: Jean"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <User className="w-4 h-4 text-indigo-500" />
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Ex: Dupont"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100"></div>

            {/* Section: Coordonnées */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Coordonnées</h4>
                  <p className="text-xs text-gray-500">Vos informations de contact</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Email
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Protégé</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Shield className="w-4 h-4 text-amber-500" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    Contactez l'admin pour modifier
                  </p>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="+221 77 123 45 67"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100"></div>

            {/* Section: Professionnel */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Professionnel</h4>
                  <p className="text-xs text-gray-500">Votre parcours et expertise</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <Building className="w-4 h-4 text-violet-500" />
                    Entreprise
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Ex: Allo Béton SARL"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <Briefcase className="w-4 h-4 text-violet-500" />
                    Poste / Fonction
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Ex: Directeur Commercial"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <FileText className="w-4 h-4 text-violet-500" />
                  Biographie
                  <span className="ml-auto text-xs text-gray-400">{formData.bio.length}/500</span>
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  placeholder="Décrivez-vous en quelques mots..."
                />
                <div className="mt-1.5 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      formData.bio.length > 400 ? 'bg-rose-500' : formData.bio.length > 250 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min((formData.bio.length / 500) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={loading || uploading}
              className="px-5 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading || uploading}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-lg hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
