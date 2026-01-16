'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/app/components/Navigation';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const pathname = usePathname();

  // Don't show navigation on auth pages
  const isAuthPage = pathname?.startsWith('/auth');

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-50">
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
