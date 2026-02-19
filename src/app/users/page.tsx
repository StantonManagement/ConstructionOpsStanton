'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, Search, MoreVertical,
  Edit2, Trash2, ShieldCheck, Shield, Clock,
  CheckCircle, XCircle, Loader2, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import InviteUserModal from '@/components/users/InviteUserModal';
import EditUserModal from '@/components/users/EditUserModal';
import DeleteUserDialog from '@/components/users/DeleteUserDialog';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';

interface UserRecord {
  id: string;
  email: string;
  role: string | null;
  status: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  staff: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; style: string }> = {
  active: {
    label: 'Active',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    style: 'text-green-700 dark:text-green-400',
  },
  inactive: {
    label: 'Inactive',
    icon: <XCircle className="w-3.5 h-3.5" />,
    style: 'text-red-600 dark:text-red-400',
  },
  pending: {
    label: 'Pending',
    icon: <Clock className="w-3.5 h-3.5" />,
    style: 'text-yellow-600 dark:text-yellow-400',
  },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(user: UserRecord) {
  if (user.first_name || user.last_name) {
    return `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase();
  }
  return (user.email?.[0] || 'U').toUpperCase();
}

function getDisplayName(user: UserRecord) {
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  return null;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modals
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);

  // Check admin access
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth'); return; }

      const { data: roleData } = await supabase
        .from('user_role')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (roleData?.role !== 'admin') {
        router.push('/');
        return;
      }
      setIsAdmin(true);
    };
    checkAccess();
  }, [router]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      const timer = setTimeout(fetchUsers, 300);
      return () => clearTimeout(timer);
    }
  }, [isAdmin, fetchUsers]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  if (!isAdmin && !loading) return null;

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    active: users.filter((u) => u.status === 'active').length,
    pending: users.filter((u) => u.status === 'pending').length,
  };

  return (
    <AppLayout>
      <PageContainer>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Users className="w-7 h-7 text-primary" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage user accounts, roles, and access</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Invite User
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users', value: stats.total, icon: <Users className="w-5 h-5 text-blue-500" />, color: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Admins', value: stats.admins, icon: <ShieldCheck className="w-5 h-5 text-purple-500" />, color: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Active', value: stats.active, icon: <CheckCircle className="w-5 h-5 text-green-500" />, color: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Pending', value: stats.pending, icon: <Clock className="w-5 h-5 text-yellow-500" />, color: 'bg-yellow-50 dark:bg-yellow-900/20' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-4 border border-border`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl mb-4">
          <div className="flex items-center gap-3 p-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-foreground font-medium">No users found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || roleFilter || statusFilter ? 'Try adjusting your filters' : 'Invite your first user to get started'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-t border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Joined</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Last Login</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const statusCfg = STATUS_CONFIG[u.status] || STATUS_CONFIG.active;
                  const displayName = getDisplayName(u);
                  return (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors group">
                      {/* User cell */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                            {getInitials(u)}
                          </div>
                          <div>
                            {displayName && (
                              <div className="text-sm font-medium text-foreground">{displayName}</div>
                            )}
                            <div className={`text-sm ${displayName ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role cell */}
                      <td className="px-4 py-3">
                        {u.role ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${ROLE_STYLES[u.role] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                            {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No role</span>
                        )}
                      </td>

                      {/* Status cell */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${statusCfg.style}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Joined cell */}
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Last login cell */}
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(u.last_sign_in_at)}
                      </td>

                      {/* Actions cell */}
                      <td className="px-4 py-3">
                        <div className="relative flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === u.id ? null : u.id);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === u.id && (
                            <div
                              className="absolute right-0 top-8 w-40 bg-card border border-border rounded-lg shadow-lg z-20 py-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => { setEditUser(u); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                              >
                                <Edit2 className="w-4 h-4" /> Edit User
                              </button>
                              <button
                                onClick={() => { setDeleteUser(u); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" /> Delete User
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Footer count */}
          {!loading && users.length > 0 && (
            <div className="px-4 py-3 border-t border-border text-sm text-muted-foreground">
              Showing {users.length} user{users.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <InviteUserModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        onSuccess={() => { setShowInvite(false); fetchUsers(); }}
      />
      <EditUserModal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        onSuccess={fetchUsers}
        user={editUser}
      />
      <DeleteUserDialog
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onSuccess={fetchUsers}
        user={deleteUser}
      />
      </PageContainer>
    </AppLayout>
  );
}
