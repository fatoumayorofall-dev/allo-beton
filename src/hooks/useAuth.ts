import { useState, useEffect } from 'react';
import { authAPI } from '../services/mysql-api.js';
import { Profile } from '../types';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  company?: string;
  phone?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        // Récupérer le profil utilisateur
        const result = await authAPI.getProfile();
        
        if (result.success && mounted) {
          const userData = result.data;
          setUser(userData);
          setProfile({
            id: userData.id,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role,
            company: userData.company,
            phone: userData.phone
          });
          setSession({ user: userData });
        }
      } catch (error) {
        console.error('Erreur initialisation auth:', error);
        localStorage.removeItem('auth_token');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Tentative de connexion pour:', email);
      
      const result = await authAPI.login(email, password);

      if (result.success) {
        const userData = result.data.user;
        setUser(userData);
        setProfile({
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          company: userData.company,
          phone: userData.phone
        });
        setSession({ user: userData });
        
        console.log('Connexion réussie:', userData.email);
        return { success: true, user: userData };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Erreur login:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur de connexion'
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setLoading(true);
      console.log('Tentative d\'inscription pour:', email);
      
      const result = await authAPI.register(email, password, firstName, lastName, '', '');

      if (result.success) {
        const userData = result.data.user;
        setUser(userData);
        setProfile({
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          company: userData.company,
          phone: userData.phone
        });
        setSession({ user: userData });
        
        console.log('Inscription réussie:', userData.email);
        return { success: true, user: userData };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Erreur register:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de l\'inscription'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Déconnexion...');
      await authAPI.logout();
      
      setUser(null);
      setProfile(null);
      setSession(null);
      
      console.log('Déconnexion réussie');
      return { success: true };
    } catch (error: any) {
      console.error('Erreur logout:', error);
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Réinitialisation mot de passe pour:', email);
      const result = await authAPI.resetPassword(email);
      
      console.log('Email de réinitialisation envoyé');
      return { success: true };
    } catch (error: any) {
      console.error('Erreur reset password:', error);
      return { success: false, error: error.message };
    }
  };

  const refreshProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const result = await authAPI.getProfile();
      
      if (result.success) {
        const userData = result.data;
        setUser(userData);
        setProfile({
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          company: userData.company,
          phone: userData.phone,
          avatar_url: userData.avatar_url,
          position: userData.position,
          bio: userData.bio
        });
        setSession({ user: userData });
      }
    } catch (error) {
      console.error('Erreur refresh profile:', error);
    }
  };

  return {
    user,
    profile,
    session,
    loading,
    login,
    register,
    logout,
    resetPassword,
    refreshProfile
  };
};