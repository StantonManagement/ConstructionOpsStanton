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
  const isAuthPage = pathname === '/auth';

  return (
    <div className="flex min-h-screen bg-gray-50">
      {!isAuthPage && <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />}
      <main className={`flex-1 ${!isAuthPage ? 'lg:ml-64' : ''}`}>
        <div className={!isAuthPage ? 'max-w-7xl mx-auto' : ''}>
          {children}
        </div>
      </main>
    </div>
  );
}
