import React, { ReactNode, useEffect, useState } from 'react';
import { DollarSign, Users, Settings, Building, BarChart2, ShieldCheck } from 'lucide-react';
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
};

const NavButton: React.FC<NavButtonProps> = ({ id, activeTab, setActiveTab, icon, children }) => (
  <button 
    onClick={() => setActiveTab(id)} 
    className={`flex items-center py-3 px-2 text-sm font-medium ${activeTab === id ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'}`}
  >
    {icon} <span className="ml-2">{children}</span>
  </button>
);

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

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>

          {/* Navigation */}
          <nav className={`${
            isMobileMenuOpen ? 'block' : 'hidden'
          } lg:flex lg:space-x-6 w-full lg:w-auto`}>
            <div className="lg:flex lg:items-center lg:space-x-6">
              <NavButton id="overview" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Building className="w-4 h-4"/>}>Overview</NavButton>
              <NavButton id="payment" activeTab={activeTab} setActiveTab={(tab: string) => { setActiveTab(tab); setSelectedProject(null); }} icon={<DollarSign className="w-4 h-4"/>}>Payments</NavButton>
              <NavButton id="subcontractors" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Users className="w-4 h-4"/>}>Subcontractors</NavButton>
              <NavButton id="compliance" activeTab={activeTab} setActiveTab={setActiveTab} icon={<ShieldCheck className="w-4 h-4"/>}>Compliance</NavButton>
              <NavButton id="metrics" activeTab={activeTab} setActiveTab={setActiveTab} icon={<BarChart2 className="w-4 h-4"/>}>Metrics</NavButton>
              <NavButton id="manage" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Settings className="w-4 h-4"/>}>Manage</NavButton>
              {role === "admin" && (
                <button
                  onClick={() => window.location.href = "/pm-dashboard"}
                  className="flex items-center py-3 px-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300 w-full lg:w-auto"
                >
                  🗂️ PM Dashboard
                </button>
              )}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Navigation;