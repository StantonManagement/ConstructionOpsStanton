'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { SYSTEM_CONFIGS } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredSystem?: string;
  requiredFeature?: string;
  roles?: string[];
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredSystem, 
  requiredFeature,
  roles,
  fallback 
}) => {
  const { user, loading, currentSystem, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // If no user, redirect to login
      if (!user) {
        router.push('/auth');
        return;
      }

      // If system is required but user doesn't have access
      if (requiredSystem && !user.system_access.includes(requiredSystem)) {
        const availableSystem = user.system_access[0];
        if (availableSystem) {
          const systemConfig = SYSTEM_CONFIGS[availableSystem];
          router.push(systemConfig.base_url);
        } else {
          router.push('/auth');
        }
        return;
      }

      // If feature is required, check permission
      if (requiredFeature) {
        hasPermission(requiredFeature, requiredSystem).then((hasAccess) => {
          if (!hasAccess) {
            // Redirect to current system's base URL or show fallback
            const systemConfig = SYSTEM_CONFIGS[currentSystem || 'construction'];
            router.push(systemConfig.base_url);
          }
        });
      }
    }
  }, [user, loading, requiredSystem, requiredFeature, currentSystem, hasPermission, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show fallback if provided
  if (fallback && (!user || (requiredSystem && !user.system_access.includes(requiredSystem)))) {
    return <>{fallback}</>;
  }

  // If no user, don't render children
  if (!user) {
    return null;
  }

  // If system is required but user doesn't have access, don't render children
  if (requiredSystem && !user.system_access.includes(requiredSystem)) {
    return null;
  }

  // Check role-based access
  if (roles && roles.length > 0 && !roles.map(r => r.toLowerCase()).includes(user.role?.toLowerCase())) {
    if (fallback) {
      return <>{fallback}</>;
    }
    router.push('/');
    return null;
  }

  // Render children if all checks pass
  return <>{children}</>;
};

export default AuthGuard;
