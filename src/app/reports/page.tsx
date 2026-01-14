'use client';

import React from 'react';
import { BarChart3, AlertTriangle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
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
    <div className="min-h-screen bg-gray-50 pt-20 lg:pt-16 lg:ml-64">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
    </div>
  );
}
