'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface TabDropdownItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

interface TabDropdownProps {
  label: string;
  items: TabDropdownItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabDropdown({ label, items, activeTab, onTabChange }: TabDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = items.some(item => item.id === activeTab);
  const activeItem = items.find(item => item.id === activeTab);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1 transition-colors whitespace-nowrap ${
          isActive
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
        }`}
        type="button"
      >
        {activeItem ? activeItem.label : label}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] z-50">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                  activeTab === item.id ? 'bg-blue-50 text-primary font-medium' : 'text-gray-700'
                }`}
                type="button"
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {item.badge && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
