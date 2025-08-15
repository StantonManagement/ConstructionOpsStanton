import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  system_access: string[]; // ['construction', 'tenant_assessment']
  avatar_url?: string;
  phone?: string;
  company?: string;
  address?: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface SystemConfig {
  id: string;
  name: string;
  display_name: string;
  description: string;
  base_url: string;
  features: string[];
  is_active: boolean;
}

export interface AuthContext {
  user: UserProfile | null;
  currentSystem: string | null;
  availableSystems: SystemConfig[];
  loading: boolean;
  error: string | null;
}

// System configurations based on your existing projects
export const SYSTEM_CONFIGS: Record<string, SystemConfig> = {
  construction: {
    id: 'construction',
    name: 'construction',
    display_name: 'Construction Operations',
    description: 'Manage construction projects, payments, and contractors',
    base_url: '/',
    features: [
      'projects',
      'contractors', 
      'payment_applications',
      'daily_logs',
      'pm_notes',
      'lien_waivers',
      'site_verification'
    ],
    is_active: true
  },
  tenant_assessment: {
    id: 'tenant_assessment',
    name: 'tenant_assessment',
    display_name: 'Tenant Assessment',
    description: 'Manage tenant communications and assessments',
    base_url: '/tenant-assessment',
    features: [
      'tenants',
      'properties',
      'maintenance_requests',
      'communications',
      'assessments',
      'documents'
    ],
    is_active: true
  }
};

class AuthService {
  private currentSystem: string | null = null;

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      // Get user profile from auth metadata and user_role table
      const { data: roleData, error: roleError } = await supabase
        .from('user_role')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const role = roleError ? 'staff' : (roleData?.role || 'staff');

      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        role: role,
        system_access: user.user_metadata?.system_access || ['construction'], // Default to construction
        avatar_url: user.user_metadata?.avatar_url,
        phone: user.user_metadata?.phone,
        company: user.user_metadata?.company,
        address: user.user_metadata?.address,
        created_at: user.created_at,
        last_login: user.last_sign_in_at,
        is_active: true // Default to true for auth users
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Update last login
        await this.updateLastLogin(data.user.id);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async signUp(email: string, password: string, name: string, systemAccess: string[] = ['construction']): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            system_access: systemAccess
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Create user profile in your existing users table
        // Update user metadata with additional profile information
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            name,
            system_access: systemAccess
          }
        });

        if (updateError) {
          console.error('Error updating user metadata:', updateError);
          // Don't fail the signup, but log the error
        }

        // Insert role into user_role table
        const { error: roleError } = await supabase
          .from('user_role')
          .insert([{
            user_id: data.user.id,
            role: 'staff' // Default role
          }]);

        if (roleError) {
          console.error('Error creating user role:', roleError);
          // Don't fail the signup, but log the error
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { success: false, error: error.message };
      }

      this.currentSystem = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async switchSystem(systemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      if (!user.system_access.includes(systemId)) {
        return { success: false, error: 'Access denied to this system' };
      }

      this.currentSystem = systemId;
      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getCurrentUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          name: updates.name,
          phone: updates.phone,
          company: updates.company,
          address: updates.address,
          system_access: updates.system_access,
          avatar_url: updates.avatar_url
        }
      });

      // Update role in user_role table if role is being updated
      if (updates.role) {
        const { error: roleError } = await supabase
          .from('user_role')
          .upsert([{
            user_id: user.id,
            role: updates.role
          }], {
            onConflict: 'user_id'
          });

        if (roleError) {
          console.error('Error updating user role:', roleError);
          return { success: false, error: roleError.message };
        }
      }

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async hasPermission(feature: string, systemId?: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      
      if (!user) {
        return false;
      }

      const targetSystem = systemId || this.currentSystem || 'construction';
      
      if (!user.system_access.includes(targetSystem)) {
        return false;
      }

      const systemConfig = SYSTEM_CONFIGS[targetSystem];
      if (!systemConfig || !systemConfig.is_active) {
        return false;
      }

      // Check if user has access to the specific feature
      return systemConfig.features.includes(feature);
    } catch (error) {
      return false;
    }
  }

  async getAvailableSystems(): Promise<SystemConfig[]> {
    try {
      const user = await this.getCurrentUser();
      
      if (!user) {
        return [];
      }

      return user.system_access
        .map(systemId => SYSTEM_CONFIGS[systemId])
        .filter(system => system && system.is_active);
    } catch (error) {
      return [];
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('uuid', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  getCurrentSystem(): string | null {
    return this.currentSystem;
  }

  setCurrentSystem(systemId: string): void {
    this.currentSystem = systemId;
  }
}

export const auth = new AuthService();
