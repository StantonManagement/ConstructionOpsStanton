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
   <button onClick={() => setActiveTab(id)} className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
      {icon} {children}
    </button>
);

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, setSelectedProject }) => {
  const [role, setRole] = useState<string | null>(null);

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
        <nav className="flex space-x-8">
          <NavButton id="overview" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Building className="w-4 h-4 mr-1"/>}>Overview</NavButton>
          <NavButton id="payment" activeTab={activeTab} setActiveTab={(tab: string) => { setActiveTab(tab); setSelectedProject(null); }} icon={<DollarSign className="w-4 h-4 mr-1"/>}>Payments</NavButton>
          <NavButton id="subcontractors" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Users className="w-4 h-4 mr-1"/>}>Subcontractors</NavButton>
          <NavButton id="compliance" activeTab={activeTab} setActiveTab={setActiveTab} icon={<ShieldCheck className="w-4 h-4 mr-1"/>}>Compliance</NavButton>
          <NavButton id="metrics" activeTab={activeTab} setActiveTab={setActiveTab} icon={<BarChart2 className="w-4 h-4 mr-1"/>}>Metrics</NavButton>
          <NavButton id="manage" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Settings className="w-4 h-4 mr-1"/>}>Manage</NavButton>
          {role === "admin" && (
            <button
              onClick={() => window.location.href = "/pm-dashboard"}
              className="flex items-center py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              🗂️ PM Dashboard
            </button>
          )}
        </nav>
      </div>
    </div>
  );
};

export default Navigation; 