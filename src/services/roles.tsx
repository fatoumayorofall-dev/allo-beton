// Service de gestion des rôles pour MySQL
export type UserRole = 'admin' | 'manager' | 'seller' | 'viewer';

export interface Permission {
  resource: string;
  actions: string[];
}

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
 */
export const hasPermission = (
  userRole: UserRole,
  resource: string,
  action: string
): boolean => {
  const permissions = RolePermissions[userRole];
  if (!Array.isArray(permissions)) return false;
  const resourcePermission = permissions.find(p => p.resource === resource);
  return resourcePermission?.actions.includes(action) || false;
};

/**
 * Vérifie si un rôle a un accès quelconque à une ressource
 */
export const canAccess = (
  userRole: UserRole,
  resource: string
): boolean => {
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

// Fonctions simplifiées pour la compatibilité
export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  // Cette fonction sera gérée côté backend
  return null;
};

export const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
  // Cette fonction sera gérée côté backend
  return false;
};

export const getAllUsers = async () => {
  // Cette fonction sera gérée côté backend
  return { success: false, data: [] };
};

export const toggleUserStatus = async (userId: string, isActive: boolean): Promise<boolean> => {
  // Cette fonction sera gérée côté backend
  return false;
};
