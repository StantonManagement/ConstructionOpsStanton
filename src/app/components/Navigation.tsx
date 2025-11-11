"use client";

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Users, Settings, Building, BarChart2, ShieldCheck, ChevronDown, Folder, Home, Menu, X, FileText, UserCog } from 'lucide-react';
import { Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';

type NavigationProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setSelectedProject: (project: Project | null) => void;
  selectedProject?: Project | null;
};

type NavButtonProps = {
  id: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  roles?: string[];
  href?: string;
};

const NavButton: React.FC<NavButtonProps> = ({ id, activeTab, setActiveTab, icon, children, href }) => {
  const isActive = activeTab === id;
  const router = useRouter();
  
  return (
    <button
      onClick={() => {
        setActiveTab(id);
        if (href) {
          // For main dashboard tabs with href, use router.push
          router.push(href);
        } else {
          // For main dashboard tabs without href (like user-management), update URL parameters
          const params = new URLSearchParams(window.location.search);
          params.set('tab', id);
          router.replace(`/?${params.toString()}`, { scroll: false });
        }
      }}
      className={`
        w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
        ${isActive 
          ? 'bg-primary/10 text-primary border-r-2 border-primary' 
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }
      `}
    >
      <span className="flex-shrink-0">
        {icon}
      </span>
      <span className="ml-3 truncate">{children}</span>
    </button>
  );
};

// Breadcrumb component for main content area
const Breadcrumb: React.FC<{ activeTab: string; selectedProject?: Project | null }> = ({ activeTab, selectedProject }) => {
  const getTabLabel = (tab: string) => {
    const labels: Record<string, string> = {
      overview: 'Overview',
      payment: 'Payments',
      subcontractors: 'Subcontractors',
      compliance: 'Compliance',
      metrics: 'Metrics',
      manage: 'Manage'
    };
    return labels[tab] || tab;
  };

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
      <Home className="w-4 h-4" />
      <span>/</span>
      <span className="text-gray-900 font-medium">{getTabLabel(activeTab)}</span>
      {selectedProject && (
        <>
          <span>/</span>
          <span className="text-gray-900 font-medium">{selectedProject.name}</span>
        </>
      )}
    </div>
  );
};

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, setSelectedProject, selectedProject }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [notificationCounts, setNotificationCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const getRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await supabase
            .from("user_role")
            .select("role")
            .eq("user_id", session.user.id)
            .single();
          
          // Handle role: default to 'staff' if no role found (expected) or error
          // Only log actual errors (not "no rows found" which is PGRST116)
          if (error) {
            // PGRST116 is "no rows found" - expected when user has no role entry yet
            if (error.code !== 'PGRST116') {
              console.error('Error fetching user role:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
              });
            }
            // Default to 'staff' when no role found or on error
            setUserRole('staff');
          } else {
            setUserRole(data?.role || 'staff');
          }
        }
      } catch (error) {
        console.error('Error in getRole:', error);
        // Default to 'staff' on unexpected errors
        setUserRole('staff');
      }
    };
    getRole();
  }, []);

  // Fetch notification counts for badges with better error handling
  const fetchNotificationCounts = async () => {
    try {
      // Only fetch payment applications count for now
      const { data: paymentData } = await supabase
        .from('payment_applications')
        .select('id')
        .eq('status', 'pending');

      const newCounts: Record<string, number> = {
        payment: Array.isArray(paymentData) ? paymentData.length : 0
      };

      setNotificationCounts(newCounts);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  };

  useEffect(() => {
    fetchNotificationCounts();
  }, []);

  const navigationItems = [
    {
      id: 'overview',
      icon: <Home className="w-5 h-5"/>,
      label: 'Overview',
      href: '/?tab=overview'
    },
    {
      id: 'projects',
      icon: <Building className="w-5 h-5"/>,
      label: 'Projects',
      href: '/?tab=projects'
    },
    // {
    //   id: 'payment',
    //   icon: <DollarSign className="w-5 h-5"/>,
    //   label: 'Payments',
    //   href: '/?tab=payment'
    // },
    {
      id: 'payment-applications',
      icon: <DollarSign className="w-5 h-5"/>,
      label: 'Payments Apps',
      href: '/?tab=payment-applications'
    },
    {
      id: 'subcontractors',
      icon: <Users className="w-5 h-5"/>,
      label: 'Contractors',
      href: '/?tab=subcontractors'
    },
    {
      id: 'daily-logs',
      icon: <FileText className="w-5 h-5"/>,
      label: 'Daily Logs',
      href: '/?tab=daily-logs'
    },
    // {
    //   id: 'compliance',
    //   icon: <ShieldCheck className="w-5 h-5"/>,
    //   label: 'Compliance',
    //   href: '/?tab=compliance'
    // },
    {
      id: 'metrics',
      icon: <BarChart2 className="w-5 h-5"/>,
      label: 'Reports',
      href: '/?tab=metrics'
    },
    {
      id: 'contracts',
      icon: <Settings className="w-5 h-5"/>,
      label: 'Contracts',
      href: '/?tab=contracts'
    },
    {
      id: 'user-management',
      icon: <UserCog className="w-5 h-5"/>,
      label: 'User Management',
      roles: ['admin', 'pm']
    }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-20 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white rounded-lg shadow-lg border border-gray-200"
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0  bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Navigation sidebar */}
      <nav className={`
        fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out z-40
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-blue-600" />
              <h1 className="ml-3 text-xl font-bold text-gray-900">Construction Ops Stanton</h1>
            </div>
            {selectedProject && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Selected Project</p>
                <p className="text-sm text-blue-700 truncate">{selectedProject.name}</p>
              </div>
            )}
          </div>

          {/* Navigation items */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-2 px-4">
              {navigationItems
                .filter(item => !item.roles || (userRole && item.roles.map(r => r.toLowerCase()).includes(userRole.toLowerCase())))
                .map((item) => (
                <NavButton
                  key={item.id}
                  id={item.id}
                  activeTab={activeTab}
                  setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setIsMobileMenuOpen(false);
                  }}
                  icon={item.icon}
                  href={item.href}
                >
                  {item.label}
                </NavButton>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {userRole ? userRole.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">User</p>
                  <p className="text-xs text-gray-500">{userRole || 'Loading...'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className={`
        transition-all duration-300
        ${isMobileMenuOpen ? 'lg:ml-64' : 'lg:ml-64'}
      `}>
        {/* Breadcrumb moved to individual page components if needed */}
      </div>
    </>
  );
};

export default Navigation;