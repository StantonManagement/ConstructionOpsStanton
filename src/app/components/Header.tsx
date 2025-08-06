import React, { useState, useEffect, useCallback } from 'react';
import { Clock, User, LogOut, Menu, X, Bell, Settings, Search, ChevronDown, DollarSign, FileText, AlertCircle, Building } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

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
}

const Header: React.FC<HeaderProps> = ({ onShowProfile, onLogout, userData, onSearch, searchQuery = '' }) => {
  const [time, setTime] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

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

  // Helper function to get time value for sorting
  const getTimeValue = (timeStr: string): number => {
    if (timeStr === 'Just now') return 0;
    if (timeStr.includes('m ago')) return parseInt(timeStr) * 60;
    if (timeStr.includes('h ago')) return parseInt(timeStr) * 3600;
    if (timeStr.includes('d ago')) return parseInt(timeStr) * 86400;
    if (timeStr.includes('mo ago')) return parseInt(timeStr) * 2592000;
    return 0;
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
          window.location.href = '/?tab=manage&subtab=contracts';
          break;
        case 'project':
          window.location.href = '/?tab=manage&subtab=projects';
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
        return <FileText className="w-4 h-4 text-blue-600" />;
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

  return (
    <div className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-bold text-sm">COC</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                <span className="hidden sm:inline">Construction Operations</span>
                <span className="sm:hidden">COC</span>
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">Stanton Management</p>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Search projects, contracts..."
                  value={localSearchQuery}
                  onChange={handleSearchChange}
                  className="pl-10 pr-10 py-2 w-64 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                />
                {localSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSearchQuery('');
                      if (onSearch) onSearch('');
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>
            </div>

            {/* DateTime Display */}
            <div className="flex flex-col items-end text-sm">
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                <span className="font-medium">{time}</span>
              </div>
              <span className="text-xs text-gray-500">{date}</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {isLoadingNotifications && (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-800"
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
                            notification.unread ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              notification.unread ? 'bg-blue-500' : 'bg-gray-300'
                            }`} />
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
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
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
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center overflow-hidden shadow-md">
                  {userData?.avatar_url ? (
                    <img 
                      src={userData.avatar_url} 
                      alt="Profile" 
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
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userData?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{userData?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => {
                        onShowProfile();
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <User className="w-4 h-4" />
                      Profile Settings
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
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
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="py-4 space-y-4">
              {/* Mobile Search */}
              <div className="px-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={localSearchQuery}
                      onChange={handleSearchChange}
                      className="w-full pl-10 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                    {localSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocalSearchQuery('');
                          if (onSearch) onSearch('');
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </form>
                </div>
              </div>

              {/* Mobile DateTime */}
              <div className="flex items-center justify-center text-sm text-gray-600 px-4">
                <Clock className="w-4 h-4 mr-2" />
                <span className="font-medium">{time}</span>
                <span className="mx-2">•</span>
                <span>{date}</span>
              </div>

              {/* Mobile Notifications */}
              <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notifications.slice(0, 3).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border ${
                        notification.unread ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      }`}
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
                        alt="Profile" 
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
      </div>

      {/* Click outside to close dropdowns */}
      {(isUserMenuOpen || isMenuOpen || isNotificationsOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsMenuOpen(false);
            setIsNotificationsOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Header;