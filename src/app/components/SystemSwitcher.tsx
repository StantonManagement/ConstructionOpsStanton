'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { SYSTEM_CONFIGS } from '@/lib/auth';

const SystemSwitcher: React.FC = () => {
  const { user, availableSystems, currentSystem, switchSystem } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  if (!user || availableSystems.length <= 1) {
    return null;
  }

  const currentSystemConfig = SYSTEM_CONFIGS[currentSystem || 'construction'];

  const handleSystemSwitch = async (systemId: string) => {
    const result = await switchSystem(systemId);
    if (result.success) {
      const systemConfig = SYSTEM_CONFIGS[systemId];
      router.push(systemConfig.base_url);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        <div className="w-2 h-2 bg-primary rounded-full"></div>
        <span>{currentSystemConfig?.display_name || 'System'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-card rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {availableSystems.map((system) => (
              <button
                key={system.id}
                onClick={() => handleSystemSwitch(system.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${
                  currentSystem === system.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    currentSystem === system.id ? 'bg-primary' : 'bg-muted'
                  }`}></div>
                  <div>
                    <div className="font-medium">{system.display_name}</div>
                    <div className="text-xs text-muted-foreground">{system.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSwitcher;
