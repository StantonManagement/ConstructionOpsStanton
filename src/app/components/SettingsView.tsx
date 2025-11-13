'use client';

import React, { useState, useEffect } from 'react';
import { Users, Building2, Plug, Settings as SettingsIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import UserManagementView from './UserManagementView';
import { useAuth } from '@/providers/AuthProvider';

type SettingsTab = 'users' | 'company' | 'integrations' | 'preferences';

// Sub-tab Navigation Component
function SettingsTabNavigation({ activeTab, onTabChange, userRole }: { activeTab: SettingsTab; onTabChange: (tab: SettingsTab) => void; userRole?: string }) {
  const allTabs = [
    { id: 'users' as const, label: 'Users', icon: Users, roles: ['admin'] },
    { id: 'company' as const, label: 'Company', icon: Building2, roles: ['admin', 'pm', 'staff'] },
    { id: 'integrations' as const, label: 'Integrations', icon: Plug, roles: ['admin'] },
    { id: 'preferences' as const, label: 'Preferences', icon: SettingsIcon, roles: ['admin', 'pm', 'staff'] }
  ];

  // Filter tabs based on user role
  const tabs = allTabs.filter(tab => !tab.roles || tab.roles.includes(userRole || ''));

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// Company Settings Tab
function CompanySettingsTab() {
  const [companySettings, setCompanySettings] = useState({
    company_name: '',
    address: '',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalSettings, setOriginalSettings] = useState(companySettings);
  
  useEffect(() => {
    loadCompanySettings();
  }, []);
  
  const loadCompanySettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/company');
      if (!res.ok) {
        throw new Error('Failed to load company settings');
      }
      const settings = await res.json();
      setCompanySettings(settings);
      setOriginalSettings(settings);
    } catch (error) {
      console.error('Error loading company settings:', error);
      // If API fails, try localStorage as fallback
      try {
        const saved = localStorage.getItem('company_settings');
        if (saved) {
          const settings = JSON.parse(saved);
          setCompanySettings(settings);
          setOriginalSettings(settings);
        }
      } catch (e) {
        console.error('localStorage fallback also failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companySettings),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save company settings');
      }
      
      const savedSettings = await res.json();
      setOriginalSettings(savedSettings);
      
      // Also save to localStorage as backup
      localStorage.setItem('company_settings', JSON.stringify(savedSettings));
      
      alert('Company settings saved successfully!');
    } catch (error) {
      console.error('Error saving company settings:', error);
      alert(error instanceof Error ? error.message : 'Failed to save company settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const hasChanges = JSON.stringify(companySettings) !== JSON.stringify(originalSettings);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading settings...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              value={companySettings.company_name}
              onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              type="text"
              value={companySettings.address}
              onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter company address"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={companySettings.phone}
                onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={companySettings.email}
                onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email address"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
            </p>
            <div className="flex gap-3">
              {hasChanges && (
                <button
                  onClick={() => {
                    setCompanySettings(originalSettings);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Integrations Tab (Placeholder)
function IntegrationsTab() {
  const integrations = [
    { name: 'Twilio SMS', icon: '📱', description: 'Send SMS notifications to contractors', status: 'configured' },
    { name: 'AWS S3', icon: '☁️', description: 'Store documents and files securely', status: 'configured' },
    { name: 'DocuSign', icon: '📝', description: 'Electronic signature integration', status: 'available' },
    { name: 'QuickBooks', icon: '💼', description: 'Accounting and invoicing', status: 'available' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Integrations</h3>
        <p className="text-sm text-gray-600 mb-6">Connect your favorite tools and services</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <div key={integration.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                    {integration.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{integration.name}</h4>
                    <p className="text-xs text-gray-500">{integration.description}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                {integration.status === 'configured' ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Configured
                  </span>
                ) : (
                  <button
                    disabled
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 italic">Coming soon - Additional integrations and configuration options will be available in a future update.</p>
        </div>
      </div>
    </div>
  );
}

// Preferences Tab
function PreferencesTab() {
  const [preferences, setPreferences] = useState({
    emailNotifications: false,
    smsNotifications: false,
    darkMode: false,
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadPreferences();
  }, []);
  
  const loadPreferences = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/preferences');
      if (!res.ok) {
        throw new Error('Failed to load preferences');
      }
      const prefs = await res.json();
      setPreferences(prefs);
      
      // Apply dark mode based on loaded preferences
      if (prefs.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      // If API fails, try localStorage as fallback
      try {
        const saved = localStorage.getItem('user_preferences');
        if (saved) {
          const prefs = JSON.parse(saved);
          setPreferences(prefs);
          if (prefs.darkMode) {
            document.documentElement.classList.add('dark');
          }
        }
      } catch (e) {
        console.error('localStorage fallback also failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggle = async (key: keyof typeof preferences) => {
    const newPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPreferences);
    
    // Apply dark mode immediately if toggled
    if (key === 'darkMode') {
      if (newPreferences.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    try {
      const res = await fetch('/api/settings/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences),
      });
      
      if (!res.ok) {
        throw new Error('Failed to save preferences');
      }
      
      // Also save to localStorage as backup
      localStorage.setItem('user_preferences', JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Revert on error
      setPreferences(preferences);
      if (key === 'darkMode') {
        if (preferences.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading preferences...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive email updates for payment applications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={preferences.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">SMS Notifications</p>
              <p className="text-sm text-gray-500">Receive SMS alerts for urgent updates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={preferences.smsNotifications}
                onChange={() => handleToggle('smsNotifications')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Dark Mode</p>
              <p className="text-sm text-gray-500">Use dark theme for the interface</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={preferences.darkMode}
                onChange={() => handleToggle('darkMode')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="pt-4">
            <p className="text-sm text-gray-500">
              Preferences are saved automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main SettingsView Component
const SettingsView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = useAuth();
  
  // Default tab based on role
  const getDefaultTab = (): SettingsTab => {
    if (role === 'admin') return 'users';
    return 'company'; // Default for non-admin users
  };
  
  const [activeTab, setActiveTab] = useState<SettingsTab>(getDefaultTab());

  // URL-based tab management
  useEffect(() => {
    const subtabFromUrl = searchParams.get('subtab') as SettingsTab;
    if (subtabFromUrl && ['users', 'company', 'integrations', 'preferences'].includes(subtabFromUrl)) {
      // Check if user has access to this tab
      if (subtabFromUrl === 'users' && role !== 'admin') {
        setActiveTab(getDefaultTab());
      } else if (subtabFromUrl === 'integrations' && role !== 'admin') {
        setActiveTab(getDefaultTab());
      } else {
        setActiveTab(subtabFromUrl);
      }
    } else if (!subtabFromUrl) {
      setActiveTab(getDefaultTab());
    }
  }, [searchParams, role]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    // Update URL with subtab parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set('subtab', tab);
    router.replace(`/?tab=settings&${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and application settings</p>
      </div>

      {/* Tab Navigation */}
      <SettingsTabNavigation activeTab={activeTab} onTabChange={handleTabChange} userRole={role || undefined} />

      {/* Tab Content */}
      <div>
        {activeTab === 'users' && <UserManagementView />}
        {activeTab === 'company' && <CompanySettingsTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
      </div>
    </div>
  );
};

export default SettingsView;

