"use client";

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
  DollarSign, Settings, Building, BarChart2, Home, Menu, X, 
  FileText, GitBranch, Clipboard, HardHat, ChevronRight,
  ListChecks, Image, FolderOpen, Calendar, CreditCard, Wallet, Users,
  LayoutDashboard, MapPin, Copy, AlertTriangle, Hammer
} from 'lucide-react';
import { Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { useProject } from '../context/ProjectContext';
import NavSection from '@/components/layout/NavSection';

type NavigationProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  // Kept for compatibility but we prefer context
  setSelectedProject?: (project: Project | null) => void;
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
  badge?: number;
  isActive?: boolean;
  onMobileClick?: () => void;
};

const NavButton: React.FC<NavButtonProps> = ({ id, activeTab, setActiveTab, icon, children, href, badge, isActive, onClick, onMobileClick }) => {
  const router = useRouter();
  const active = isActive !== undefined ? isActive : activeTab === id;
  
  return (
    <button
      onClick={() => {
        if (onMobileClick) {
          onMobileClick();
        }

        if (onClick) {
          onClick();
          return;
        }
        
        setActiveTab(id);
        if (href) {
          router.push(href);
        } else {
          const params = new URLSearchParams(window.location.search);
          params.set('tab', id);
          router.replace(`/?${params.toString()}`, { scroll: false });
        }
      }}
      className={`
        w-full flex items-center px-4 py-3 md:py-2 text-sm font-medium rounded-lg transition-colors duration-200 mb-1
        ${active 
          ? 'bg-primary/10 text-primary border-r-2 border-primary' 
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }
      `}
    >
      <span className="flex-shrink-0">
        {icon}
      </span>
      <span className="ml-3 truncate flex-1 text-left">{children}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto bg-orange-500 text-white text-xs font-medium rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
};

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedProject, selectedProjectId } = useProject();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [notificationCounts, setNotificationCounts] = useState<Record<string, number>>({});
  const [isProjectExpanded, setIsProjectExpanded] = useState(false);
  const [isRenovationsExpanded, setIsRenovationsExpanded] = useState(true);
  
  const currentSubTab = searchParams.get('subtab');
  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.delete('returnTo');
  const returnTo = `${pathname || '/'}${returnToParams.toString() ? `?${returnToParams.toString()}` : ''}`;

  useEffect(() => {
    if (selectedProjectId) {
      queueMicrotask(() => setIsProjectExpanded(true));
    }
  }, [selectedProjectId]);

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
          
          if (!error && data) {
            setUserRole(data.role);
          } else {
            setUserRole('staff');
          }
        }
      } catch (error) {
        console.error('Error in getRole:', error);
        setUserRole('staff');
      }
    };
    getRole();
  }, []);

  const fetchNotificationCounts = async () => {
    try {
      const { data: paymentData } = await supabase
        .from('payment_applications')
        .select('id')
        .eq('status', 'pending');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: dailyLogsData } = await supabase
        .from('daily_log_requests')
        .select('id')
        .or(`request_status.eq.sent,created_at.gte.${today.toISOString()}`);

      const newCounts: Record<string, number> = {
        payment: Array.isArray(paymentData) ? paymentData.length : 0,
        'daily-logs': Array.isArray(dailyLogsData) ? dailyLogsData.length : 0
      };

      setNotificationCounts(newCounts);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  };

  useEffect(() => {
    const run = () => {
      void fetchNotificationCounts();
    };

    queueMicrotask(run);
    const interval = setInterval(run, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleProjectNav = (subtab: string) => {
    if (!selectedProjectId) return;
    
    // Set active tab to projects (which renders the ProjectDetailView)
    setActiveTab('projects');
    
    // Update URL with project ID and specific subtab
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'projects');
    params.set('project', selectedProjectId.toString());
    params.set('subtab', subtab);
    
    router.replace(`/?${params.toString()}`, { scroll: false });
    setIsMobileMenuOpen(false);
  };

  const isProjectActive = activeTab === 'projects' && !!selectedProjectId;

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

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
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Navigation sidebar */}
      <nav className={`
        fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out z-40
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col bg-white
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Building className="w-8 h-8 text-primary" />
            <h1 className="ml-3 text-xl font-bold text-gray-900">Construction Ops</h1>
          </div>
          {selectedProject ? (
             <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
               <p className="text-xs font-medium text-blue-800 mb-1">SELECTED PROJECT</p>
               <p className="text-sm font-bold text-primary truncate" title={selectedProject.name}>{selectedProject.name}</p>
             </div>
          ) : (
             <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
               <p className="text-xs text-gray-500 text-center">No project selected</p>
             </div>
          )}
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NavButton
            id="overview"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<Home className="w-5 h-5"/>}
            href="/?tab=overview"
            onMobileClick={closeMobileMenu}
          >
            Overview
          </NavButton>

          <NavButton
            id="projects"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<Building className="w-5 h-5"/>}
            href="/?tab=projects"
            isActive={activeTab === 'projects' && !selectedProjectId}
            onMobileClick={closeMobileMenu}
          >
            All Projects
          </NavButton>

          {/* Collapsible Project Section */}
          <div className="mt-4 mb-2">
            <NavSection
              title="Current Project"
              icon={<FolderOpen className="w-5 h-5" />}
              isExpanded={isProjectExpanded}
              onToggle={() => setIsProjectExpanded(!isProjectExpanded)}
              disabled={!selectedProjectId}
              isActive={isProjectActive}
            >
              {!selectedProjectId && isProjectExpanded && (
                <div className="px-4 py-2 text-xs text-gray-500 italic">
                  Select a project to view details
                </div>
              )}
              
              <NavButton
                id="project-details"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClick={() => handleProjectNav('summary')}
                icon={<Building className="w-4 h-4"/>}
                isActive={isProjectActive && currentSubTab === 'summary'}
                onMobileClick={closeMobileMenu}
              >
                Summary
              </NavButton>
              <NavButton
                id="project-contractors"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClick={() => handleProjectNav('contractors')}
                icon={<Users className="w-4 h-4"/>}
                isActive={isProjectActive && (currentSubTab === 'contractors' || !currentSubTab)}
                onMobileClick={closeMobileMenu}
              >
                Contractors
              </NavButton>
              <NavButton
                id="project-budget"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClick={() => handleProjectNav('budget')}
                icon={<BarChart2 className="w-4 h-4"/>}
                isActive={isProjectActive && currentSubTab === 'budget'}
                onMobileClick={closeMobileMenu}
              >
                Budget
              </NavButton>

              <NavButton
                id="project-blocking-report"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClick={() => {
                  if (!selectedProjectId) return;
                  router.push(`/reports/blocking?project_id=${selectedProjectId}&returnTo=${encodeURIComponent(returnTo)}`);
                }}
                icon={<AlertTriangle className="w-4 h-4"/>}
                isActive={pathname?.startsWith('/reports/blocking')}
                onMobileClick={closeMobileMenu}
              >
                Blocking Report
              </NavButton>

              <NavButton
                id="project-trade-report"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClick={() => {
                  if (!selectedProjectId) return;
                  router.push(`/reports/trade?project_id=${selectedProjectId}&returnTo=${encodeURIComponent(returnTo)}`);
                }}
                icon={<BarChart2 className="w-4 h-4"/>}
                isActive={pathname?.startsWith('/reports/trade')}
                onMobileClick={closeMobileMenu}
              >
                Trade Report
              </NavButton>
              <NavButton
                id="project-schedule"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClick={() => handleProjectNav('schedule')}
                icon={<Calendar className="w-4 h-4"/>}
                isActive={isProjectActive && currentSubTab === 'schedule'}
                onMobileClick={closeMobileMenu}
              >
                Schedule
              </NavButton>
              <NavButton
                id="project-loan"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClick={() => handleProjectNav('loan')}
                icon={<Wallet className="w-4 h-4"/>}
                isActive={isProjectActive && currentSubTab === 'loan'}
                onMobileClick={closeMobileMenu}
              >
                Loan Draw
              </NavButton>
              <NavButton
                id="project-cashflow"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClick={() => handleProjectNav('cashflow')}
                icon={<CreditCard className="w-4 h-4"/>}
                isActive={isProjectActive && currentSubTab === 'cashflow'}
                onMobileClick={closeMobileMenu}
              >
                Cash Flow
              </NavButton>
              <NavButton
                id="project-punchlists"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClick={() => handleProjectNav('punchlists')}
                icon={<ListChecks className="w-4 h-4"/>}
                isActive={isProjectActive && currentSubTab === 'punchlists'}
                onMobileClick={closeMobileMenu}
              >
                Punch Lists
              </NavButton>
              <NavButton
                id="project-photos"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClick={() => {
                  if (selectedProjectId) {
                    router.push(`/projects/${selectedProjectId}/photos`);
                  }
                }}
                icon={<Image className="w-4 h-4"/>}
                isActive={pathname?.includes('/photos')}
                onMobileClick={closeMobileMenu}
              >
                Photos
              </NavButton>
              <NavButton
                id="project-documents"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClick={() => handleProjectNav('documents')}
                icon={<FileText className="w-4 h-4"/>}
                isActive={isProjectActive && currentSubTab === 'documents'}
                onMobileClick={closeMobileMenu}
              >
                Documents
              </NavButton>
            </NavSection>
          </div>

          <div className="pt-2 border-t border-gray-100 mt-2">
            {userRole && ['admin', 'pm', 'staff'].includes(userRole.toLowerCase()) && (
              <NavButton
                id="daily-logs"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                icon={<Clipboard className="w-5 h-5"/>}
                href="/?tab=daily-logs"
                badge={notificationCounts['daily-logs']}
                onMobileClick={closeMobileMenu}
              >
                Daily Logs
              </NavButton>
            )}
            
            <NavButton
              id="payments"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              icon={<DollarSign className="w-5 h-5"/>}
              href="/?tab=payments"
              badge={notificationCounts['payment']}
              onMobileClick={closeMobileMenu}
            >
              Payments
            </NavButton>

            <NavButton
              id="contractors"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              icon={<HardHat className="w-5 h-5"/>}
              href="/?tab=contractors"
              onMobileClick={closeMobileMenu}
            >
              Contractors
            </NavButton>

            {userRole && ['admin', 'pm'].includes(userRole.toLowerCase()) && (
              <>
                <NavButton
                  id="change-orders"
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  icon={<GitBranch className="w-5 h-5"/>}
                  href="/?tab=change-orders"
                  onMobileClick={closeMobileMenu}
                >
                  Change Orders
                </NavButton>
                <NavButton
                  id="templates"
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  icon={<Clipboard className="w-5 h-5"/>}
                  href="/?tab=templates"
                  onMobileClick={closeMobileMenu}
                >
                  Templates
                </NavButton>
                <NavButton
                  id="budget"
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  icon={<BarChart2 className="w-5 h-5"/>}
                  href="/?tab=budget"
                  onMobileClick={closeMobileMenu}
                >
                  Budget Dashboard
                </NavButton>
              </>
            )}

            <NavButton
              id="settings"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              icon={<Settings className="w-5 h-5"/>}
              href="/?tab=settings"
              onMobileClick={closeMobileMenu}
            >
              Settings
            </NavButton>
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
                <p className="text-xs text-gray-500 capitalize">{userRole || 'Loading...'}</p>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
