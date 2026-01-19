'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { BarChart3, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';

export default function ReportsPage() {
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
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View analytics and reports across your projects
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Link
                key={report.id}
                href={report.href}
                className="bg-white rounded-lg border border-border p-6 hover:shadow-lg transition-shadow duration-200"
              >
                <div className={`w-12 h-12 rounded-lg ${report.bgColor} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${report.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {report.title}
                </h3>
                <p className="text-sm text-muted-foreground">
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
