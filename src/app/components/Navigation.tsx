"use client";

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  DollarSign, Settings, BarChart2, Menu, X,
  HardHat, Building,
  CreditCard, Wallet,
  LayoutDashboard, Box, Copy, AlertTriangle, Folder, BarChart3, LogOut, FileText, Users
} from 'lucide-react';
import { Project } from '@/context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { useProject } from '@/context/ProjectContext';
import { CollapsibleNavItem } from '@/components/CollapsibleNavItem';
import { ThemeToggle } from '@/components/ThemeToggle';

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
        
        if (href) {
          router.push(href);
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
  
  const currentSubTab = searchParams.get('subtab');
  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.delete('returnTo');
  const returnTo = `${pathname || '/'}${returnToParams.toString() ? `?${returnToParams.toString()}` : ''}`;


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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-20 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-card rounded-lg shadow-lg border border-border"
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Navigation sidebar */}
      <nav className={`
        fixed top-0 left-0 h-full w-64 border-r border-border transform transition-transform duration-300 ease-in-out z-40
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col bg-card
      `}>
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center">
            <Building className="w-8 h-8 text-primary" />
            <h1 className="ml-3 text-xl font-bold text-foreground">Construction Ops</h1>
          </div>
          {/* Portfolio Filter - TODO: Implement dropdown */}
          <div className="mt-4">
            <select className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All Portfolios</option>
              <option value="90-park-portfolio">90 Park Portfolio</option>
              <option value="north-end-portfolio">North End Portfolio</option>
              <option value="park-portfolio">Park Portfolio</option>
              <option value="south-end-portfolio">South End Portfolio</option>
            </select>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NavButton
            id="dashboard"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<LayoutDashboard className="w-5 h-5"/>}
            href="/"
            isActive={pathname === '/' || pathname === '/dashboard'}
            onMobileClick={closeMobileMenu}
          >
            Dashboard
          </NavButton>

          {/* Divider */}
          <div className="my-2 border-t border-border" />

          <div onClick={closeMobileMenu}>
            <CollapsibleNavItem
              icon={<Folder className="w-5 h-5"/>}
              label="Projects"
              href="/projects"
              type="projects"
            />
          </div>

          <div onClick={closeMobileMenu}>
            <CollapsibleNavItem
              icon={<Box className="w-5 h-5"/>}
              label="Components"
              href="/components"
              type="components"
            />
          </div>

          <div onClick={closeMobileMenu}>
            <CollapsibleNavItem
              icon={<HardHat className="w-5 h-5"/>}
              label="Contractors"
              href="/contractors"
              type="contractors"
            />
          </div>

          <NavButton
            id="bid-rounds"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<Users className="w-5 h-5"/>}
            href="/bid-rounds"
            isActive={pathname?.startsWith('/bid-rounds') || pathname?.startsWith('/bids')}
            onMobileClick={closeMobileMenu}
          >
            Bid Management
          </NavButton>

          {/* Divider */}
          <div className="my-2 border-t border-border" />

          <NavButton
            id="payments"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<CreditCard className="w-5 h-5"/>}
            href="/payments"
            isActive={pathname === '/payments'}
            badge={notificationCounts['payment']}
            onMobileClick={closeMobileMenu}
          >
            Payments
          </NavButton>

          <NavButton
            id="draws"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<Wallet className="w-5 h-5"/>}
            href="/renovations/draws"
            isActive={pathname?.startsWith('/renovations/draws')}
            onMobileClick={closeMobileMenu}
          >
            Draws
          </NavButton>

          <NavButton
            id="cash-position"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<BarChart2 className="w-5 h-5"/>}
            href="/cash-position"
            isActive={pathname?.startsWith('/cash-position')}
            onMobileClick={closeMobileMenu}
          >
            Cash Position
          </NavButton>

          <NavButton
            id="portfolios"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<Folder className="w-5 h-5"/>}
            href="/portfolios"
            isActive={pathname?.startsWith('/portfolios')}
            onMobileClick={closeMobileMenu}
          >
            Portfolios
          </NavButton>

          {/* Divider */}
          <div className="my-2 border-t border-border" />

          <NavButton
            id="blocking"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<AlertTriangle className="w-5 h-5"/>}
            href="/renovations/blocking"
            isActive={pathname?.startsWith('/renovations/blocking')}
            onMobileClick={closeMobileMenu}
          >
            Blocking
          </NavButton>

          <NavButton
            id="templates"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<Copy className="w-5 h-5"/>}
            href="/renovations/templates"
            isActive={pathname?.startsWith('/renovations/templates')}
            onMobileClick={closeMobileMenu}
          >
            Templates
          </NavButton>

          <NavButton
            id="reports"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<BarChart3 className="w-5 h-5"/>}
            href="/reports"
            isActive={pathname?.startsWith('/reports') && !pathname?.startsWith('/reports/blocking')}
            onMobileClick={closeMobileMenu}
          >
            Reports
          </NavButton>

          {/* Divider */}
          <div className="my-2 border-t border-border" />

          <NavButton
            id="settings"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            icon={<Settings className="w-5 h-5"/>}
            href="/settings"
            isActive={pathname === '/settings'}
            onMobileClick={closeMobileMenu}
          >
            Settings
          </NavButton>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          {/* Theme Toggle */}
          <div className="flex justify-center">
            <ThemeToggle />
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground">
                  {userRole ? userRole.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">User</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole || 'Loading...'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors duration-200"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
