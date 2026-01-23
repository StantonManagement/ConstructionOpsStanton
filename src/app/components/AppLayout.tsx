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
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      {!isAuthPage && <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />}
      <main className={`flex-1 min-w-0 ${!isAuthPage ? 'lg:ml-64' : ''}`}>
        {children}
      </main>
    </div>
  );
}
