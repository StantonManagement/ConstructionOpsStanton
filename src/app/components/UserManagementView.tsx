'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserPlus, Edit2, Trash2, Search, AlertCircle, Loader2, Eye, EyeOff, Key } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, Column } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { SystemStatus } from '@/lib/theme';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'staff' | 'pm' | 'admin';
  created_at: string;
  is_active: boolean;
  uuid?: string;
}

interface EditingUser extends User {
  isEditing?: boolean;
}

interface NewUser {
  email: string;
  name: string;
  role: 'staff' | 'pm' | 'admin';
  password: string;
}

interface AlertState {
  type: 'error' | 'success';
  message: string;
}

import { ROLE_OPTIONS, hasPermission, canAccessUserManagement } from '@/lib/permissions';

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session found');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
};

// Custom hooks for better separation of concerns
const useCurrentUserRole = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    const getRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          throw new Error('No active session found');
        }

        // Get user role from user_role table
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('User not found');
        }

        // Get role from user_role table
        const { data: roleData, error: roleError } = await supabase
          .from('user_role')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError) {
          console.error('Error fetching user role:', roleError);
          setUserRole('staff'); // Default to staff if role not found
        } else {
          setUserRole(roleData?.role || 'staff');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setRoleError(errorMessage);
        console.error('Error in getRole:', error);
      } finally {
        setRoleLoading(false);
      }
    };

    getRole();
  }, []);

  return { userRole, roleLoading, roleError };
};

const useUsers = () => {
  const [users, setUsers] = useState<EditingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in to view users');
      }

      // Get users from the API endpoint which now uses auth.users
      const headers = await getAuthHeaders();
      const response = await fetch('/api/users', { headers });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch users: ${response.statusText}`);
      }
      
      const result = await response.json();
      const data = result.users;

      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }

      setUsers(data.map(user => ({
        ...user,
        is_active: user.is_active !== false
      })));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Exception fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, setUsers, loading, error, refetch: fetchUsers };
};

// Alert component for better UX
const Alert: React.FC<{ alert: AlertState; onClose: () => void }> = ({ alert, onClose }) => (
  <div className={`mb-4 p-4 rounded-lg flex items-start justify-between ${
    alert.type === 'error' ? 'bg-[var(--status-critical-bg)] text-[var(--status-critical-text)] border border-[var(--status-critical-border)]' : 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]'
  }`}>
    <div className="flex items-start">
      <AlertCircle className={`w-5 h-5 mr-2 mt-0.5 ${alert.type === 'error' ? 'text-[var(--status-critical-text)]' : 'text-[var(--status-success-text)]'}`} />
      <span>{alert.message}</span>
    </div>
    <Button 
      variant="ghost"
      size="sm"
      onClick={onClose}
      className={`ml-4 h-auto p-1 ${alert.type === 'error' ? 'text-[var(--status-critical-text)] hover:text-[var(--status-critical-text)]' : 'text-[var(--status-success-text)] hover:text-[var(--status-success-text)]'}`}
      aria-label="Close alert"
    >
      ✕
    </Button>
  </div>
);

// Loading component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="p-8 text-center">
    <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto" />
    <p className="mt-2 text-sm text-muted-foreground">{message}</p>
  </div>
);

// Add user modal component
const AddUserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: NewUser) => Promise<void>;
  isSubmitting: boolean;
}> = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  // Use key prop to force re-mount when modal opens
  const [key, setKey] = useState(0);
  const [formData, setFormData] = useState<NewUser>({
    email: '',
    name: '',
    role: 'staff',
    password: ''
  });
  const [validationErrors, setValidationErrors] = useState<Partial<NewUser>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Reset form when modal opens by changing the key
  useEffect(() => {
    if (isOpen) {
      setKey(prev => prev + 1);
      setFormData({
        email: '',
        name: '',
        role: 'staff',
        password: ''
      });
      setValidationErrors({});
      setShowPassword(false);
    }
  }, [isOpen]);

  const validateForm = useCallback(() => {
    const errors: Partial<NewUser> = {};
    
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.password || formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog key={key} open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              disabled={isSubmitting}
              className={validationErrors.email ? 'border-[var(--status-critical-border)] focus:border-[var(--status-critical-border)] focus:ring-[var(--status-critical-border)]' : ''}
            />
            {validationErrors.email && (
              <p className="text-sm text-[var(--status-critical-text)]">{validationErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter full name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
              className={validationErrors.name ? 'border-[var(--status-critical-border)] focus:border-[var(--status-critical-border)] focus:ring-[var(--status-critical-border)]' : ''}
            />
            {validationErrors.name && (
              <p className="text-sm text-[var(--status-critical-text)]">{validationErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value: NewUser['role']) => setFormData({ ...formData, role: value })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password (min. 6 characters)"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                disabled={isSubmitting}
                className={`pr-10 ${validationErrors.password ? 'border-[var(--status-critical-border)] focus:border-[var(--status-critical-border)] focus:ring-[var(--status-critical-border)]' : ''}`}
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="sr-only">
                  {showPassword ? 'Hide password' : 'Show password'}
                </span>
              </Button>
            </div>
            {validationErrors.password && (
              <p className="text-sm text-[var(--status-critical-text)]">{validationErrors.password}</p>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
              {isSubmitting ? 'Adding...' : 'Add User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Password reset confirmation modal component
const PasswordResetModal: React.FC<{
  user: EditingUser | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: number, userName: string) => Promise<void>;
  isSubmitting: boolean;
}> = ({ user, isOpen, onClose, onConfirm, isSubmitting }) => {
  const handleConfirm = async () => {
    if (user) {
      await onConfirm(user.id, user.name);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to reset the password for <strong>{user?.name}</strong>?
          </p>
          <p className="text-sm text-muted-foreground">
            This will send a password reset email to <strong>{user?.email}</strong>.
          </p>
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            {isSubmitting ? 'Sending...' : 'Reset Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Delete confirmation modal component
const DeleteUserModal: React.FC<{
  user: EditingUser | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: number, userName: string) => Promise<void>;
  isSubmitting: boolean;
}> = ({ user, isOpen, onClose, onConfirm, isSubmitting }) => {
  const handleConfirm = async () => {
    if (user) {
      await onConfirm(user.id, user.name);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete user <strong>{user?.name}</strong>?
          </p>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The user will be permanently removed from the system.
          </p>
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            {isSubmitting ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Edit user modal component
const EditUserModal: React.FC<{
  user: EditingUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (user: EditingUser) => Promise<void>;
  isSubmitting: boolean;
}> = ({ user, isOpen, onClose, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState<EditingUser>({
    id: 0,
    email: '',
    name: '',
    role: 'staff',
    created_at: '',
    is_active: true,
    isEditing: false
  });

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({ ...user });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      await onSubmit(formData);
    }
  };

  const handleClose = () => {
    onClose();
  };



  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              type="text"
              value={formData.name ?? ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email ?? ''}
              disabled={true}
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={formData.role ?? 'staff'}
              onValueChange={(value: User['role']) => setFormData({ ...formData, role: value })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select
              value={formData.is_active ? 'active' : 'inactive'}
              onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const UserManagementView: React.FC = () => {
  const { userRole, roleLoading, roleError } = useCurrentUserRole();
  const { users, setUsers, loading, error: usersError, refetch } = useUsers();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [resettingUser, setResettingUser] = useState<EditingUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<EditingUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState<AlertState | null>(null);

  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Permission checks
  const canCreateUsers = hasPermission(userRole, 'create');
  const canUpdateUsers = hasPermission(userRole, 'update');
  const canDeleteUsers = hasPermission(userRole, 'delete');

  const showAlert = useCallback((type: AlertState['type'], message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000); // Auto-hide after 5 seconds
  }, []);

  const userColumns = useMemo(() => {
    const cols: Column<EditingUser>[] = [
      {
        header: 'Name',
        accessor: (row: EditingUser) => <div className="font-medium text-foreground">{row.name}</div>
      },
      {
        header: 'Email',
        accessor: (row: EditingUser) => <div className="text-muted-foreground">{row.email}</div>
      },
      {
        header: 'Role',
        accessor: (row: EditingUser) => (
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">
            {ROLE_OPTIONS.find(r => r.value === row.role)?.label || row.role}
          </span>
        )
      },
      {
        header: 'Status',
        accessor: (row: EditingUser) => (
          <SignalBadge status={row.is_active ? 'success' : 'critical'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </SignalBadge>
        )
      },
      {
        header: 'Created',
        accessor: (row: EditingUser) => new Date(row.created_at).toLocaleDateString()
      }
    ];

    if (canUpdateUsers || canDeleteUsers || userRole?.toLowerCase() === 'admin') {
      cols.push({
        header: 'Actions',
        accessor: (row: EditingUser) => (
          <div className="flex items-center justify-end space-x-2">
            {canUpdateUsers && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleEdit(row)}
                className="text-primary hover:text-primary h-8 w-8 p-0"
                title="Edit user"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
            {userRole?.toLowerCase() === 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openPasswordResetModal(row)}
                className="text-[var(--status-warning-text)] hover:text-[var(--status-warning-text)] h-8 w-8 p-0"
                title="Reset password"
              >
                <Key className="w-4 h-4" />
              </Button>
            )}
            {canDeleteUsers && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDeleteModal(row)}
                className="text-[var(--status-critical-text)] hover:text-[var(--status-critical-text)] h-8 w-8 p-0"
                title="Delete user"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ),
        align: 'right' as const
      });
    }
    return cols;
  }, [canUpdateUsers, canDeleteUsers, userRole]);

  const handleAddUser = async (userData: NewUser) => {
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add user');
      }

      showAlert('success', result.message || `User "${userData.name}" added successfully`);
      setIsAddModalOpen(false);
      await refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add user';
      showAlert('error', errorMessage);
      console.error('Error adding user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (user: EditingUser) => {
    setIsSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: user.id,
          name: user.name,
          role: user.role,
          is_active: user.is_active
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      showAlert('success', result.message || 'User updated successfully');
      setIsEditModalOpen(false);
      setEditingUser(null);
      setUsers(users.map(u => u.id === user.id ? { ...user, isEditing: false } : u));
    } catch (error) {
      console.error('Full error object:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      showAlert('error', errorMessage);
      console.error('Error updating user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      showAlert('success', result.message || `User "${userName}" deleted successfully`);
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Full error object:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      showAlert('error', errorMessage);
      console.error('Error deleting user:', error);
    }
  };

  const openDeleteModal = (user: EditingUser) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleResetPassword = async (userId: number, userName: string) => {
    try {
      // Get the user's email from the users array
      const user = users.find(u => u.id === userId);
      if (!user?.email) {
        throw new Error('User email not found');
      }

      // Use server-side API for password reset
      const headers = await getAuthHeaders();
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: user.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      showAlert('success', result.message || `Password reset email sent to ${user.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      showAlert('error', errorMessage);
      console.error('Error resetting password:', error);
    }
  };

  const openPasswordResetModal = (user: EditingUser) => {
    setResettingUser(user);
    setIsPasswordResetModalOpen(true);
  };

  const toggleEdit = (user: EditingUser) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  // Loading states
  if (roleLoading) {
    return <LoadingSpinner message="Checking permissions..." />;
  }

  // Error states
  if (roleError) {
    return (
      <div className="p-4">
        <Alert alert={{ type: 'error', message: roleError }} onClose={() => {}} />
      </div>
    );
  }

  // Permission check using centralized permission system
  if (!canAccessUserManagement(userRole)) {
    return (
      <div className="p-4">
        <div className="bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-[var(--status-warning-text)]">Access Denied</h3>
              <p className="text-sm text-[var(--status-warning-text)] mt-1">
                You don&apos;t have permission to access this page. Contact your administrator for access.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">User Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage users and their roles in the system
          </p>
        </div>
        {canCreateUsers && (
          <Button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isAddModalOpen}
            className="mt-4 sm:mt-0"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {/* Modals */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddUser}
        isSubmitting={isSubmitting}
      />

             <EditUserModal
         user={editingUser}
         isOpen={isEditModalOpen}
         onClose={() => {
           setIsEditModalOpen(false);
           setEditingUser(null);
         }}
         onSubmit={handleUpdateUser}
         isSubmitting={isSubmitting}
       />

       <PasswordResetModal
         user={resettingUser}
         isOpen={isPasswordResetModalOpen}
         onClose={() => {
           setIsPasswordResetModalOpen(false);
           setResettingUser(null);
         }}
         onConfirm={handleResetPassword}
         isSubmitting={isSubmitting}
       />

       <DeleteUserModal
         user={deletingUser}
         isOpen={isDeleteModalOpen}
         onClose={() => {
           setIsDeleteModalOpen(false);
           setDeletingUser(null);
         }}
         onConfirm={handleDeleteUser}
         isSubmitting={isSubmitting}
       />

      {/* Alerts */}
      {alert && <Alert alert={alert} onClose={() => setAlert(null)} />}
      {usersError && <Alert alert={{ type: 'error', message: usersError }} onClose={() => {}} />}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading users..." />
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-muted-foreground mb-2">
              {searchTerm ? (
                <>
                  <Search className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">No users found</p>
                  <p className="text-sm">Try adjusting your search terms</p>
                </>
              ) : (
                <>
                  <UserPlus className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">No users yet</p>
                  <p className="text-sm">Get started by adding your first user</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <DataTable
            data={filteredUsers}
            columns={userColumns}
          />
        )}
      </div>

      {/* Summary */}
      {!loading && filteredUsers.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      )}
    </div>
  );
};

export default UserManagementView;