'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { BarChart3, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';

function ReportsContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!user) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const reports = [
    {
      id: 'blocking',
      title: 'Blocking Items',
      description: 'View all blocking tasks and issues across projects',
      icon: AlertTriangle,
      href: '/reports/blocking',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      id: 'trade',
      title: 'Trade Report',
      description: 'Analyze work by trade and contractor',
      icon: TrendingUp,
      href: '/reports/trade',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <AppLayout>
      <div className="p-4 sm:p-6">
        <div className="mb-3">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Reports
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View analytics and reports across your projects
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Link
                key={report.id}
                href={report.href}
                className="bg-white rounded-lg border border-border p-4 hover:shadow-md hover:border-primary/50 transition-all"
              >
                <div className={`w-10 h-10 rounded-lg ${report.bgColor} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${report.color}`} />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {report.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {report.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    }>
      <ReportsContent />
    </Suspense>
  );
}
