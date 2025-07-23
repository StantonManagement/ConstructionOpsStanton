import React, { ReactNode, useEffect, useState } from 'react';
import { DollarSign, Users, Settings, Building, BarChart2, ShieldCheck, ChevronDown, Folder } from 'lucide-react';
import { Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';

type NavigationProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setSelectedProject: (project: Project | null) => void;
};

type NavButtonProps = {
  id: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
};

const NavButton: React.FC<NavButtonProps> = ({ id, activeTab, setActiveTab, icon, children, onClick }) => {
  const isActive = activeTab === id;
  
  return (
    <button 
      onClick={() => {
        setActiveTab(id);
        onClick?.();
      }}
      className={`
        flex items-center justify-center lg:justify-start py-3 px-3 lg:px-2 text-sm font-medium rounded-lg lg:rounded-none transition-colors
        ${isActive 
          ? 'bg-blue-50 text-blue-600 border-blue-500 lg:bg-transparent lg:border-b-2 lg:border-l-0 lg:border-r-0 lg:border-t-0' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 lg:hover:bg-transparent lg:hover:border-b-2 lg:hover:border-gray-300'
        }
        w-full lg:w-auto min-w-0
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="ml-2 truncate">{children}</span>
    </button>
  );
};

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, setSelectedProject }) => {
  const [role, setRole] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const getRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("uuid", session.user.id)
          .single();
        setRole(data?.role || null);
      }
    };
    getRole();
  }, []);

  const navigationItems = [
    { id: 'overview', icon: <Building className="w-4 h-4"/>, label: 'Overview' },
    { id: 'payment', icon: <DollarSign className="w-4 h-4"/>, label: 'Payments', onClick: () => setSelectedProject(null) },
    { id: 'subcontractors', icon: <Users className="w-4 h-4"/>, label: 'Subcontractors' },
    { id: 'compliance', icon: <ShieldCheck className="w-4 h-4"/>, label: 'Compliance' },
    { id: 'metrics', icon: <BarChart2 className="w-4 h-4"/>, label: 'Metrics' },
    { id: 'manage', icon: <Settings className="w-4 h-4"/>, label: 'Manage' },
  ];

  return (
    <div className="bg-white border-b sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile Navigation Toggle */}
        <div className="lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full flex items-center justify-between py-3 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <div className="flex items-center">
              {navigationItems.find(item => item.id === activeTab)?.icon}
              <span className="ml-2">{navigationItems.find(item => item.id === activeTab)?.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex lg:space-x-6 py-1">
          {navigationItems.map((item) => (
            <NavButton
              key={item.id}
              id={item.id}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              icon={item.icon}
              onClick={item.onClick}
            >
              {item.label}
            </NavButton>
          ))}
          {role === "admin" && (
            <button
              onClick={() => window.location.href = "/pm-dashboard"}
              className="flex items-center py-3 px-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300"
            >
              <Folder className="w-4 h-4" />
              <span className="ml-2">PM Dashboard</span>
            </button>
          )}
        </nav>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t bg-white">
            <nav className="py-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {navigationItems.map((item) => (
                  <NavButton
                    key={item.id}
                    id={item.id}
                    activeTab={activeTab}
                    setActiveTab={(tab) => {
                      setActiveTab(tab);
                      setIsMobileMenuOpen(false);
                      item.onClick?.();
                    }}
                    icon={item.icon}
                  >
                    {item.label}
                  </NavButton>
                ))}
                {role === "admin" && (
                  <button
                    onClick={() => {
                      window.location.href = "/pm-dashboard";
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center py-3 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors w-full min-w-0"
                  >
                    <Folder className="w-4 h-4 flex-shrink-0" />
                    <span className="ml-2 truncate">PM Dashboard</span>
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navigation;