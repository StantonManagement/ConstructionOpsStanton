import React, { useState, useEffect, useCallback } from 'react';
import { Clock, User, LogOut, Menu, X, Bell, Settings, Search, ChevronDown, DollarSign, FileText, AlertCircle, Building, Check } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProject } from '@/context/ProjectContext';

interface UserData {
  name: string;
  email: string;
  avatar_url: string;
  role: string;
}

interface Notification {
  id: number;
  user_id: number;
  type: 'payment' | 'contract' | 'project' | 'system' | 'alert' | 'reminder';
  title: string;
  message: string;
  data: any;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  source_table: string | null;
  source_id: number | null;
  action_url: string | null;
  // Computed properties for UI
  time?: string;
  unread?: boolean;
}

interface HeaderProps {
  onShowProfile: () => void;
  onLogout: () => void;
  userData: UserData | null;
  onSearch?: (query: string) => void;
  searchQuery?: string;
  // Deprecated props, kept for compatibility but ignored in favor of context
  selectedProjectId?: number | null;
  onProjectSelect?: (projectId: number | null) => void;
}

const Header: React.FC<HeaderProps> = ({ onShowProfile, onLogout, userData, onSearch, searchQuery = '', onProjectSelect }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects, selectedProject, setSelectedProjectId, isLoading: isLoadingProjects, error: projectError } = useProject();
  
  const [time, setTime] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const handleProjectSelect = (projectId: number | null) => {
    setIsProjectSelectorOpen(false);
    
    // Update Context
    setSelectedProjectId(projectId);

    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    if (projectId) {
      params.set('project', projectId.toString());
    } else {
      params.delete('project');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
    
    // Call parent callback if provided (for backward compatibility)
    if (onProjectSelect) {
      onProjectSelect(projectId);
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'bg-green-500';
      case 'planning':
        return 'bg-primary';
      case 'on_hold':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString([], { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!userData?.name) return; // Don't fetch if no user data
    
    setIsLoadingNotifications(true);
    try {
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user record to get the user ID
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('uuid', user.id)
        .single();

      if (!userRecord) return;

      // Fetch notifications from the notifications table
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userRecord.id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Transform notifications for UI
      const transformedNotifications: Notification[] = (notificationsData || []).map((notification: any) => ({
        ...notification,
        time: getTimeAgo(new Date(notification.created_at)),
        unread: !notification.read_at
      }));

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [userData]);

  // Helper function to get time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  };

  // Load notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAsRead = async (notificationId: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString(), unread: false } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (notification.unread) {
      await markAsRead(notification.id);
    }

    // Close notifications dropdown
    setIsNotificationsOpen(false);

    // Navigate based on action_url or notification type
    if (notification.action_url) {
      window.location.href = notification.action_url;
    } else {
      // Fallback navigation based on type and data
      switch (notification.type) {
        case 'payment':
          if (notification.source_id) {
            window.location.href = `/payments/${notification.source_id}/review`;
          }
          break;
        case 'contract':
          window.location.href = '/projects?subtab=contracts';
          break;
        case 'project':
          window.location.href = '/projects?subtab=projects';
          break;
        case 'alert':
        case 'system':
          console.log('System notification clicked:', notification);
          break;
        default:
          console.log('Unknown notification type:', notification.type);
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('uuid', user.id)
        .single();

      if (!userRecord) return;

      // Mark all unread notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userRecord.id)
        .is('read_at', null);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString(), unread: false }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'contract':
        return <FileText className="w-4 h-4 text-primary" />;
      case 'project':
        return <Building className="w-4 h-4 text-purple-600" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'reminder':
        return <Bell className="w-4 h-4 text-orange-600" />;
      case 'system':
        return <Settings className="w-4 h-4 text-gray-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setLocalSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(localSearchQuery);
    }
  };

  const currentProjectId = selectedProject?.id;

  return (
    <div className="bg-card shadow-sm border-b border-border fixed top-0 left-0 right-0 z-40 lg:left-64 transition-all duration-300 h-16">
      <div className="h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and Title - Hidden on desktop since sidebar has it */}
        <div className="flex items-center gap-3 flex-1 min-w-0 lg:hidden">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg" role="img" aria-label="Construction Operations Center Logo">
            <span className="text-white font-bold text-sm">COC</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">
              <span className="hidden sm:inline">Construction Operations</span>
              <span className="sm:hidden">COC</span>
          </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Stanton Management</p>
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          {/* Project Selector */}
          <div className="relative">
            <button
              onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors min-w-[180px] max-w-[220px] ${
                selectedProject 
                  ? 'bg-primary/5 border-primary/30 text-primary hover:bg-primary/10' 
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="Select project"
              aria-expanded={isProjectSelectorOpen}
              aria-haspopup="listbox"
            >
              {selectedProject ? (
                <>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getProjectStatusColor(selectedProject.status)}`} />
                  <span className="truncate font-medium">{selectedProject.name}</span>
                </>
              ) : (
                <>
                  <Building className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate">All Projects</span>
                </>
              )}
              <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-auto transition-transform ${isProjectSelectorOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Project Selector Dropdown */}
            {isProjectSelectorOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-80 overflow-y-auto" role="listbox">
                {/* All Projects Option */}
                <button
                  onClick={() => handleProjectSelect(null)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                    !currentProjectId ? 'bg-primary/5 text-primary' : 'text-gray-700'
                  }`}
                  role="option"
                  aria-selected={!currentProjectId}
                >
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">All Projects</span>
                  {!currentProjectId && <Check className="w-4 h-4 ml-auto text-primary" />}
                </button>

                {/* Divider */}
                {projects.length > 0 && <div className="border-t border-gray-100 my-1" />}

                {/* Loading State */}
                {isLoadingProjects && (
                  <div className="px-3 py-4 text-center text-gray-500 text-sm">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading projects...
                  </div>
                )}

                {/* Error State */}
                {projectError && (
                  <div className="px-3 py-4 text-center text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 mx-auto mb-2" />
                    <p>Failed to load projects</p>
                    <p className="text-xs mt-1 opacity-75">{projectError}</p>
                  </div>
                )}

                {/* Project List */}
                {!isLoadingProjects && !projectError && projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project.id)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                      currentProjectId === project.id ? 'bg-primary/5 text-primary' : 'text-gray-700'
                    }`}
                    role="option"
                    aria-selected={currentProjectId === project.id}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getProjectStatusColor(project.status)}`} />
                    <span className="truncate">{project.name}</span>
                    {currentProjectId === project.id && <Check className="w-4 h-4 ml-auto text-primary flex-shrink-0" />}
                  </button>
                ))}

                {/* Empty State */}
                {!isLoadingProjects && !projectError && projects.length === 0 && (
                  <div className="px-3 py-4 text-center text-gray-500 text-sm">
                    No active projects found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search projects, contracts..."
                value={localSearchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-10 py-2 w-64 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-primary bg-gray-50"
                aria-label="Search projects and contracts"
              />
              {localSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearchQuery('');
                    if (onSearch) onSearch('');
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Right Side - DateTime, Notifications, and User Menu */}
        <div className="hidden md:flex items-center gap-4">
          {/* DateTime Display */}
          <div className="flex flex-col items-end text-sm" role="status" aria-live="polite">
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
              <span className="font-medium">{time}</span>
            </div>
            <span className="text-xs text-gray-500">{date}</span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={isNotificationsOpen}
              aria-haspopup="true"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium" aria-label={`${unreadCount} unread notifications`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50" role="menu" aria-label="Notifications">
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          <div className="flex items-center gap-2">
                      {isLoadingNotifications && (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-label="Loading notifications"></div>
                      )}
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary hover:text-primary/80"
                          aria-label="Mark all notifications as read"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          notification.unread ? 'bg-primary/10' : ''
                        }`}
                        role="menuitem"
                        aria-label={`${notification.title}: ${notification.message}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            notification.unread ? 'bg-primary' : 'bg-gray-300'
                          }`} aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getNotificationIcon(notification.type)}
                              <p className={`text-sm font-medium ${
                                notification.unread ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </p>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
                            <p className="text-xs text-gray-500">{notification.time}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-500" role="status">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-label={`User menu for ${userData?.name || 'User'}`}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center overflow-hidden shadow-md">
              {userData?.avatar_url ? (
                <img 
                  src={userData.avatar_url} 
                  alt={`Profile picture for ${userData.name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
                <User className={`w-4 h-4 text-white ${userData?.avatar_url ? 'hidden' : ''}`} />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-gray-900">{userData?.name || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{userData?.role || 'User'}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50" role="menu" aria-label="User menu">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userData?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{userData?.email}</p>
                  <p className="text-xs text-primary font-medium mt-1">Version 0.01</p>
                </div>
                <div className="py-1">
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => {
                      onShowProfile();
                      setIsUserMenuOpen(false);
                    }}
                    role="menuitem"
                  >
                    <User className="w-4 h-4" />
                    Profile Settings
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4" />
                    Preferences
                  </button>
          </div>
                <div className="border-t border-gray-100 pt-1">
          <button
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    onClick={() => {
                      onLogout();
                      setIsUserMenuOpen(false);
                    }}
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
            </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button - Hidden since we have sidebar now */}
        <div className="md:hidden">
          <button
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Open mobile menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown - Simplified since we have sidebar */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white absolute top-16 left-0 right-0">
          <div className="py-4 space-y-4">
            {/* Mobile Search */}
            <div className="px-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={localSearchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-primary bg-gray-50"
                    aria-label="Search projects and contracts"
                  />
                  {localSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSearchQuery('');
                        if (onSearch) onSearch('');
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* Mobile DateTime */}
            <div className="flex items-center justify-center text-sm text-gray-600 px-4" role="status" aria-live="polite">
              <Clock className="w-4 h-4 mr-2" aria-hidden="true" />
              <span className="font-medium">{time}</span>
              <span className="mx-2">•</span>
              <span>{date}</span>
            </div>

            {/* Mobile Notifications */}
            <div className="px-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1" aria-label={`${unreadCount} unread notifications`}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${
                      notification.unread ? 'bg-primary/10 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                    aria-label={`${notification.title}: ${notification.message}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getNotificationIcon(notification.type)}
                      <p className={`text-sm font-medium ${
                        notification.unread ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
                    <p className="text-xs text-gray-500">{notification.time}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile User Section */}
            <div className="border-t border-gray-200 pt-4 px-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center overflow-hidden shadow-md">
                  {userData?.avatar_url ? (
                    <img 
                      src={userData.avatar_url} 
                      alt={`Profile picture for ${userData.name}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <User className={`w-6 h-6 text-white ${userData?.avatar_url ? 'hidden' : ''}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{userData?.name || 'User'}</p>
                  <p className="text-sm text-gray-500 capitalize">{userData?.role || 'User'}</p>
                  <p className="text-xs text-primary font-medium">Version 0.01</p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  className="w-full flex items-center gap-3 py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => {
                    onShowProfile();
                    setIsMenuOpen(false);
                  }}
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </button>
                <button
                  className="w-full flex items-center gap-3 py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Preferences
              </button>
              <button
                  className="w-full flex items-center gap-3 py-3 px-4 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                onClick={() => {
                  onLogout();
                  setIsMenuOpen(false);
                }}
              >
                <LogOut className="w-4 h-4" />
                  Sign Out
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(isUserMenuOpen || isMenuOpen || isNotificationsOpen || isProjectSelectorOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsMenuOpen(false);
            setIsNotificationsOpen(false);
            setIsProjectSelectorOpen(false);
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default Header;
