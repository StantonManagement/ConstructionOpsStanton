'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import LoadingAnimation from '../components/LoadingAnimation';
import AppLayout from '../components/AppLayout';
import PageContainer from '../components/PageContainer';
import {
  Hammer,
  Wrench,
  HardHat,
  Building,
  Package,
  Truck,
  FileText,
  Users,
  Calendar,
  DollarSign,
  Camera,
  MessageSquare,
  Bell,
  Settings,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Info,
  XCircle
} from 'lucide-react';

export default function ComponentsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingAnimation fullScreen />;
  }

  if (!user) {
    return <LoadingAnimation fullScreen />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<LoadingAnimation text="Loading components..." />}>
        <PageContainer>
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Component Showcase</h1>
            <p className="text-muted-foreground mb-8">
              UI components and design patterns used throughout the application
            </p>

            {/* Icons Grid */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Icons</h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <Hammer className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">Hammer</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Wrench className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">Wrench</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <HardHat className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">HardHat</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Building className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">Building</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">Package</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Truck className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">Truck</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">FileText</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">Users</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Calendar className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">Calendar</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <DollarSign className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">DollarSign</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">Camera</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <MessageSquare className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">Message</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Bell className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">Bell</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Settings className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">Settings</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <BarChart3 className="w-8 h-8 text-foreground" />
                    <span className="text-xs text-muted-foreground">BarChart</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Buttons */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Buttons</h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex flex-wrap gap-4">
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                    Primary
                  </button>
                  <button className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80">
                    Secondary
                  </button>
                  <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90">
                    Destructive
                  </button>
                  <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted">
                    Outline
                  </button>
                  <button className="px-4 py-2 text-primary hover:underline">
                    Ghost
                  </button>
                </div>
              </div>
            </section>

            {/* Status Badges */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Status Badges</h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Success
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <Info className="w-4 h-4" />
                    Info
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Warning
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                    <XCircle className="w-4 h-4" />
                    Error
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    Inactive
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    In Progress
                  </div>
                </div>
              </div>
            </section>

            {/* Cards */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Cards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Building className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-semibold text-foreground">Project Card</h3>
                      <p className="text-sm text-muted-foreground">Example project</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">
                    This is a sample project card showing how content looks with the current theme.
                  </p>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
                      View
                    </button>
                    <button className="flex-1 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm">
                      Edit
                    </button>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Truck className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-foreground">Truck Card</h3>
                      <p className="text-sm text-muted-foreground">Truck #1</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">31 Park</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Package className="w-8 h-8 text-orange-600" />
                    <div>
                      <h3 className="font-semibold text-foreground">Inventory Card</h3>
                      <p className="text-sm text-muted-foreground">Tools & Equipment</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-medium">25 items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-yellow-600 text-xs">Low stock warning</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Forms */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Form Elements</h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Text Input
                    </label>
                    <input
                      type="text"
                      placeholder="Enter text..."
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Select Dropdown
                    </label>
                    <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground">
                      <option>Option 1</option>
                      <option>Option 2</option>
                      <option>Option 3</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Textarea
                    </label>
                    <textarea
                      placeholder="Enter description..."
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="text-sm font-medium text-foreground">Checkbox Option</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="radio-example" className="w-4 h-4" />
                      <span className="text-sm font-medium text-foreground">Radio Option</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {/* Loading States */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Loading States</h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Spinner</p>
                  </div>
                  <div className="text-center">
                    <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-2/3 animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Progress Bar</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </PageContainer>
      </Suspense>
    </AppLayout>
  );
}
