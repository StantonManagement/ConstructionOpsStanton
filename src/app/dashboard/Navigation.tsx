import React, { ReactNode, useEffect, useState } from 'react';
import { DollarSign, Users, Settings, Building, BarChart2, ShieldCheck, ChevronDown, Folder, Home, Menu, X, FileText } from 'lucide-react';
import { Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';

type NavigationProps = {
  activeView: string;
  onViewChange: (view: string) => void;
  setSelectedProject?: (project: Project | null) => void;
  selectedProject?: Project | null;
};

type NavButtonProps = {
  id: string;
  activeView: string;
  onViewChange: (view: string) => void;
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
};

const NavButton: React.FC<NavButtonProps> = ({ id, activeView, onViewChange, icon, children }) => {
  const isActive = activeView === id;
  
  return (
    <button
      onClick={() => {
        onViewChange(id);
      }}
      className={`
        w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
        ${isActive 
          ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
const Breadcrumb: React.FC<{ activeView: string; selectedProject?: Project | null }> = ({ activeView, selectedProject }) => {
  const getViewLabel = (view: string) => {
    const labels: Record<string, string> = {
      overview: 'Overview',
      payment: 'Payments',
      subcontractors: 'Subcontractors',
      compliance: 'Compliance',
      metrics: 'Metrics',
      manage: 'Manage'
    };
    return labels[view] || view;
  };

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
      <Home className="w-4 h-4" />
      <span>/</span>
      <span className="text-gray-900 font-medium">{getViewLabel(activeView)}</span>
      {selectedProject && (
        <>
          <span>/</span>
          <span className="text-gray-900 font-medium">{selectedProject.name}</span>
        </>
      )}
    </div>
  );
};

const Navigation: React.FC<NavigationProps> = ({ activeView, onViewChange, setSelectedProject, selectedProject }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [notificationCounts, setNotificationCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const getRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("uuid", session.user.id)
            .single();
          
          if (error) {
            console.error('Error fetching user role:', error);
          } else {
            setUserRole(data?.role || null);
          }
        }
      } catch (error) {
        console.error('Error in getRole:', error);
      }
    };
    getRole();
  }, []);

  // Fetch notification counts for badges with better error handling
  const fetchNotificationCounts = async () => {
    try {
      const results = await Promise.allSettled([
        supabase.from('payment_applications').select('id').eq('status', 'pending'),
        supabase.from('subcontractors').select('id').eq('status', 'pending'),
        supabase.from('compliance_checks').select('id').eq('status', 'pending')
      ]);

      const newCounts: Record<string, number> = {};

      // Payment applications count
      if (results[0].status === 'fulfilled') {
        const paymentsResult = results[0];
        if (paymentsResult.value.data) {
          newCounts.payment = Array.isArray(paymentsResult.value.data) ? paymentsResult.value.data.length : 0;
        }
      }

      // Subcontractors count
      if (results[1].status === 'fulfilled') {
        const subcontractorsResult = results[1];
        if (subcontractorsResult.value.data) {
          newCounts.subcontractors = Array.isArray(subcontractorsResult.value.data) ? subcontractorsResult.value.data.length : 0;
        }
      }

      // Compliance count
      if (results[2].status === 'fulfilled') {
        const complianceResult = results[2];
        if (complianceResult.value.data) {
          newCounts.compliance = Array.isArray(complianceResult.value.data) ? complianceResult.value.data.length : 0;
        }
      }

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
      label: 'Overview'
    },
    {
      id: 'projects',
      icon: <Building className="w-5 h-5"/>,
      label: 'Projects'
    },
    {
      id: 'payment-applications',
      icon: <DollarSign className="w-5 h-5"/>,
      label: 'Payments Apps'
    },
    
   
    {
      id: 'subcontractors',
      icon: <Users className="w-5 h-5"/>,
      label: 'Contractors'
    },
    {
      id: 'daily-logs',
      icon: <FileText className="w-5 h-5"/>,
      label: 'Daily Logs'
    },
    // {
    //   id: 'compliance',
    //   icon: <ShieldCheck className="w-5 h-5"/>,
    //   label: 'Compliance'
    // },
    {
      id: 'metrics',
      icon: <BarChart2 className="w-5 h-5"/>,
      label: 'Reports'
    },
    {
      id: 'manage',
      icon: <Settings className="w-5 h-5"/>,
      label: 'Manage'
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
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-50
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
              {navigationItems.map((item) => (
                <NavButton
                  key={item.id}
                  id={item.id}
                  activeView={activeView}
                  onViewChange={(view) => {
                    onViewChange(view);
                    setIsMobileMenuOpen(false);
                  }}
                  icon={item.icon}
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

      
    </>
  );
};

export default Navigation;