'use client';

import React, { useState } from 'react';
import {
  Building,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  ListChecks,
  FileText,
  Banknote,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Image,
  Shield,
  Clipboard,
  FileSignature,
} from 'lucide-react';

type SubTab = 'summary' | 'contractors' | 'budget' | 'payments' | 'schedule' | 'locations' | 'punchlists' | 'documents' | 'loan' | 'cashflow' | 'photos' | 'warranties' | 'daily-logs' | 'change-orders';

interface MenuItem {
  id: SubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface ProjectRightSidebarProps {
  activeTab: SubTab;
  onTabChange: (tab: SubTab) => void;
}

const menuItems: MenuItem[] = [
  { id: 'summary', label: 'Summary', icon: Building },
  { id: 'contractors', label: 'Contractors', icon: Users },
  { id: 'budget', label: 'Budget', icon: TrendingUp },
  { id: 'payments', label: 'Payments', icon: DollarSign },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'locations', label: 'Locations', icon: Building },
  { id: 'punchlists', label: 'Punch Lists', icon: ListChecks },
  { id: 'documents', label: 'Documents', icon: FileText },
];

const financialItems: MenuItem[] = [
  { id: 'loan', label: 'Loan', icon: Banknote },
  { id: 'cashflow', label: 'Cash Flow', icon: TrendingUp },
];

const moreItems: MenuItem[] = [
  { id: 'photos', label: 'Photos', icon: Image, badge: 'Soon' },
  { id: 'warranties', label: 'Warranties', icon: Shield },
  { id: 'daily-logs', label: 'Daily Logs', icon: Clipboard, badge: 'Soon' },
  { id: 'change-orders', label: 'Change Orders', icon: FileSignature, badge: 'Soon' },
];

export default function ProjectRightSidebar({ activeTab, onTabChange }: ProjectRightSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFinancial, setShowFinancial] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const handleItemClick = (id: SubTab) => {
    onTabChange(id);
    // Auto-collapse on mobile after selection
    if (window.innerWidth < 1024) {
      setIsExpanded(false);
    }
  };

  const handleFinancialClick = () => {
    if (isExpanded) {
      setShowFinancial(!showFinancial);
      setShowMore(false);
    } else {
      setIsExpanded(true);
      setShowFinancial(true);
      setShowMore(false);
    }
  };

  const handleMoreClick = () => {
    if (isExpanded) {
      setShowMore(!showMore);
      setShowFinancial(false);
    } else {
      setIsExpanded(true);
      setShowMore(true);
      setShowFinancial(false);
    }
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full bg-card border-l border-border z-40 transition-all duration-300 ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-3 top-20 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg hover:bg-primary/90 transition-colors"
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isExpanded ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Sidebar Content */}
      <div className="flex flex-col h-full pt-20 pb-4 overflow-y-auto">
        {/* Main Menu Items */}
        <div className="flex-1 space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isExpanded && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </button>
            );
          })}

          {/* Financial Section */}
          <div className="pt-2">
            <button
              onClick={handleFinancialClick}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${
                showFinancial && isExpanded
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              title={!isExpanded ? 'Financial' : undefined}
            >
              <Banknote className="w-5 h-5 flex-shrink-0" />
              {isExpanded && (
                <>
                  <span className="text-sm font-medium truncate flex-1 text-left">Financial</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      showFinancial ? 'rotate-180' : ''
                    }`}
                  />
                </>
              )}
              {/* Pulsing indicator dot when collapsed */}
              {!isExpanded && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              )}
            </button>

            {/* Financial Submenu */}
            {isExpanded && (
              <div
                className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-200 ${
                  showFinancial ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                {financialItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* More Section */}
          <div className="pt-1">
            <button
              onClick={handleMoreClick}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${
                showMore && isExpanded
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              title={!isExpanded ? 'More' : undefined}
            >
              <MoreHorizontal className="w-5 h-5 flex-shrink-0" />
              {isExpanded && (
                <>
                  <span className="text-sm font-medium truncate flex-1 text-left">More</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      showMore ? 'rotate-180' : ''
                    }`}
                  />
                </>
              )}
              {/* Pulsing indicator dot when collapsed */}
              {!isExpanded && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              )}
            </button>

            {/* More Submenu */}
            {isExpanded && (
              <div
                className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-200 ${
                  showMore ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      }`}
                      disabled={!!item.badge}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
