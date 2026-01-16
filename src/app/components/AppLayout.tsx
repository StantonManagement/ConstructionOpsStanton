'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import { Building } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const pathname = usePathname();

  // Show simple header on auth pages
  const isAuthPage = pathname?.startsWith('/auth');

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Simple header for auth pages */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-primary" />
              <h1 className="ml-3 text-xl font-bold text-gray-900">Construction Ops</h1>
            </div>
          </div>
        </header>
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 lg:ml-64">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
