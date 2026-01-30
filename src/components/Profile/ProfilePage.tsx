import React, { useState, useEffect, useRef } from 'react';
import { X, User, Mail, Phone, Building, Camera, Save, Loader2, CheckCircle, AlertCircle, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
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
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
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
      setAvatarUrl(profile.avatar_url || null);
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
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Veuillez sélectionner une image' });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'L\'image ne doit pas dépasser 5 MB' });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (err) => reject(err));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<File> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx?.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const file = new File([blob!], 'avatar.jpeg', { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg');
    });
  };

  const handleCropConfirm = async () => {
    if (!avatarPreview || !croppedAreaPixels) return;
    
    try {
      const croppedFile = await getCroppedImg(avatarPreview, croppedAreaPixels);
      setAvatarFile(croppedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(croppedFile);
      
      setShowCropper(false);
    } catch (error) {
      console.error('Erreur cropping:', error);
      setMessage({ type: 'error', text: 'Erreur lors du redimensionnement de la photo' });
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return avatarUrl;
    
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('avatar', avatarFile);
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataUpload
      });
      
      const result = await response.json();
      
      if (result.success) {
        return result.data.avatar_url;
      } else {
        throw new Error(result.error || 'Erreur upload avatar');
      }
    } catch (error: any) {
      console.error('Erreur upload avatar:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'upload de la photo' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        newAvatarUrl = await uploadAvatar();
      }
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          company: formData.company,
          position: formData.position,
          bio: formData.bio,
          avatar_url: newAvatarUrl
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
        
        if (refreshProfile) {
          await refreshProfile();
        }
        
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de la sauvegarde' });
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde profil:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde du profil' });
    } finally {
      setLoading(false);
    }
  };

  const displayAvatar = avatarPreview || avatarUrl;

  return (
    <>
      {showCropper && avatarPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Rogner votre photo</h2>
              <button
                onClick={() => setShowCropper(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
                <Cropper
                  image={avatarPreview}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <ZoomIn className="w-4 h-4 inline mr-2" />
                    Zoom
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setZoom(1)}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Réinitialiser</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCropper(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCropConfirm}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  <span>Valider</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Mon Profil</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {message && (
            <div className={`flex items-center space-x-2 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="flex items-center space-x-6">
            <div className="relative">
              {displayAvatar ? (
                <img 
                  src={displayAvatar} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
              <button 
                onClick={handleAvatarClick}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
              >
                {uploading ? <Loader2 className="w-4 h-4 text-gray-600 animate-spin" /> : <Camera className="w-4 h-4 text-gray-600" />}
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
              <h3 className="text-lg font-medium text-gray-900">
                {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : 'Votre nom'}
              </h3>
              <p className="text-gray-600">{formData.position || 'Poste non défini'}</p>
              <p className="text-sm text-gray-500">{formData.company || 'Entreprise non définie'}</p>
              <p className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline" onClick={handleAvatarClick}>
                📷 Cliquez pour changer la photo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Votre prénom"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="77 123 45 67"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entreprise</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom de l'entreprise"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Poste</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Votre fonction"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Biographie</label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Quelques mots sur vous..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading || uploading}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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
      </div>
    </>
  );
};
