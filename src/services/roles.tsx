// Service de gestion des rôles pour MySQL
export type UserRole = 'admin' | 'manager' | 'seller' | 'viewer';

export interface Permission {
  resource: string;
  actions: string[];
}

export interface UserPermission {
  menu_id: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

// Liste complète des menus (synchronisée avec le backend et le sidebar)
export const MENU_RESOURCES = [
  { id: 'dashboard', label: 'Tableau de Bord', group: 'Principal' },
  { id: 'sales', label: 'Ventes', group: 'Commercial' },
  { id: 'transport', label: 'Bons de Transport', group: 'Commercial' },
  { id: 'customers', label: 'Clients', group: 'Commercial' },
  { id: 'inventory', label: 'Stock & Inventaire', group: 'Logistique' },
  { id: 'suppliers', label: 'Fournisseurs', group: 'Logistique' },
  { id: 'payments', label: 'Paiements', group: 'Finance' },
  { id: 'cash', label: 'Gestion de Caisse', group: 'Finance' },
  { id: 'cash-report', label: 'Rapport Journalier', group: 'Finance' },
  { id: 'banks', label: 'Gestion Bancaire', group: 'Finance' },
  { id: 'partners', label: 'Partenaires', group: 'Finance' },
  { id: 'comptabilite', label: 'Comptabilité OHADA', group: 'Finance' },
  { id: 'sage-import', label: 'Import Sage', group: 'Finance' },
  { id: 'ecommerce', label: 'E-commerce', group: 'Outils' },
  { id: 'ai-expert', label: 'IA Expert PRO', group: 'Outils' },
  { id: 'hr', label: 'RH & Paie', group: 'Outils' },
  { id: 'company', label: 'Profil Entreprise', group: 'Entreprise' },
  { id: 'admin', label: 'Administration', group: 'Systeme' },
  { id: 'settings', label: 'Paramètres', group: 'Systeme' },
];

export const RolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // ✅ Dashboard visible
    { resource: 'dashboard', actions: ['read'] },

    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'sales', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'customers', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'suppliers', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'payments', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'comptabilite', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'sage-import', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'audit', actions: ['read'] },
  ],
  manager: [
    // ✅ Dashboard visible
    { resource: 'dashboard', actions: ['read'] },

    { resource: 'sales', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'products', actions: ['create', 'read', 'update'] },
    { resource: 'customers', actions: ['create', 'read', 'update'] },
    { resource: 'suppliers', actions: ['create', 'read', 'update'] },
    { resource: 'payments', actions: ['create', 'read', 'update'] },
    { resource: 'reports', actions: ['read', 'export'] },
  ],
  seller: [
    // ✅ Dashboard visible
    { resource: 'dashboard', actions: ['read'] },

    { resource: 'sales', actions: ['create', 'read', 'update'] },
    { resource: 'products', actions: ['read'] },
    { resource: 'customers', actions: ['create', 'read', 'update'] },
    { resource: 'payments', actions: ['create', 'read'] },
  ],
  viewer: [
    // ✅ Dashboard visible
    { resource: 'dashboard', actions: ['read'] },

    { resource: 'sales', actions: ['read'] },
    { resource: 'products', actions: ['read'] },
    { resource: 'customers', actions: ['read'] },
    { resource: 'reports', actions: ['read'] },
  ],
};

/**
 * Vérifie si un rôle a une permission spécifique sur une ressource
 * Supporte les permissions custom par utilisateur
 */
export const hasPermission = (
  userRole: UserRole,
  resource: string,
  action: string,
  customPermissions?: UserPermission[]
): boolean => {
  // Vérifier les permissions custom en priorité
  if (customPermissions && customPermissions.length > 0) {
    const perm = customPermissions.find(p => p.menu_id === resource);
    if (perm) {
      switch (action) {
        case 'create': return perm.can_create;
        case 'read': return perm.can_read;
        case 'update': return perm.can_update;
        case 'delete': return perm.can_delete;
        default: return false;
      }
    }
  }
  // Fallback sur les permissions du rôle
  const permissions = RolePermissions[userRole];
  if (!Array.isArray(permissions)) return false;
  const resourcePermission = permissions.find(p => p.resource === resource);
  return resourcePermission?.actions.includes(action) || false;
};

/**
 * Vérifie si un utilisateur a un accès quelconque à une ressource
 * Supporte les permissions custom par utilisateur
 */
export const canAccess = (
  userRole: UserRole,
  resource: string,
  customPermissions?: UserPermission[]
): boolean => {
  // Vérifier les permissions custom en priorité
  if (customPermissions && customPermissions.length > 0) {
    const perm = customPermissions.find(p => p.menu_id === resource);
    if (perm) {
      return perm.can_create || perm.can_read || perm.can_update || perm.can_delete;
    }
  }
  // Fallback sur les permissions du rôle
  const permissions = RolePermissions[userRole];
  if (!Array.isArray(permissions)) return false;
  return permissions.some(p => p.resource === resource);
};

/**
 * HOC React pour protéger un composant en fonction des permissions
 */
export const withPermission = (
  WrappedComponent: React.ComponentType<any>,
  resource: string,
  action: string
) => {
  return (props: any) => {
    const userRole = props.userRole as UserRole;

    if (!hasPermission(userRole, resource, action)) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Accès refusé</h3>
          <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

// ─── API calls pour la gestion des utilisateurs ────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const getAllUsers = async (): Promise<{ success: boolean; data: any[] }> => {
  try {
    const res = await fetch(`${API_BASE}/auth/users`, { headers: getHeaders() });
    return await res.json();
  } catch {
    return { success: false, data: [] };
  }
};

export const createUser = async (userData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  company?: string;
  phone?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Erreur réseau' };
  }
};

export const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/role`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    return data.success;
  } catch {
    return false;
  }
};

export const toggleUserStatus = async (userId: string, isActive: boolean): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ is_active: isActive }),
    });
    const data = await res.json();
    return data.success;
  } catch {
    return false;
  }
};

export const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Erreur réseau' };
  }
};

// ─── API Permissions custom par utilisateur ──────────────────────────────────

export const getUserPermissionsAPI = async (userId: string): Promise<{ success: boolean; data: UserPermission[] }> => {
  try {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/permissions`, { headers: getHeaders() });
    return await res.json();
  } catch {
    return { success: false, data: [] };
  }
};

export const saveUserPermissions = async (userId: string, permissions: UserPermission[]): Promise<{ success: boolean; data?: UserPermission[]; error?: string }> => {
  try {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/permissions`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ permissions }),
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Erreur réseau' };
  }
};

export const resetUserPermissions = async (userId: string): Promise<{ success: boolean; data?: UserPermission[]; error?: string }> => {
  try {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/permissions/reset`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Erreur réseau' };
  }
};
