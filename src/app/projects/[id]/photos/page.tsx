'use client';

import React from 'react';
import Header from '@/app/components/Header';
import Navigation from '@/app/components/Navigation';
import PhotoGalleryView from '@/app/components/PhotoGalleryView';
import { useProject } from '@/app/context/ProjectContext';
import { useRouter } from 'next/navigation';

export default function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use() or await (Next.js 15)
  // Since this is a client component, we should treat params as promise in props or use useParams
  // But type definition says Promise.
  // We'll use React.use() if we were using it, or just await in an async component (server), but this is "use client"
  // Actually, for "use client" components in Next.js 15, we can use `useParams()` hook.
  
  const { id } = React.use(params);
  const projectId = parseInt(id, 10);
  
  const router = useRouter();
  const { setSelectedProjectId } = useProject();

  React.useEffect(() => {
    if (!isNaN(projectId)) {
      setSelectedProjectId(projectId);
    }
  }, [projectId, setSelectedProjectId]);

  // We need to handle activeTab/setActiveTab for Navigation to work visually
  // In a real app with sub-routes, Navigation would determine active state from URL.
  // Our Navigation component checks `activeTab` prop.
  // We can pass `projects` as activeTab, but `subtab=photos` via URL.
  
  // Handlers for Navigation props (mostly to support legacy prop requirement)
  const handleTabChange = (tab: string) => {
    // If navigating away from photos, we might need to route
    if (tab === 'overview') router.push('/?tab=overview');
    else if (tab === 'projects') router.push('/?tab=projects');
    // ... etc ... 
    // This implies Navigation needs to support routing or we pass a handler that routes.
    // Our Navigation component handles routing if `href` is present on items.
    // But expanding project section items call `setActiveTab` then replace URL.
    
    // Ideally, Navigation component should handle routing itself or we provide a smarter handler.
    // For now, simple redirect back to main dashboard with tab param.
    if (tab !== 'projects') {
       router.push(`/?tab=${tab}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header 
        onShowProfile={() => {}} 
        onLogout={() => {}} 
        userData={null}
        onSearch={() => {}}
      />
      <Navigation 
        activeTab="projects" 
        setActiveTab={handleTabChange}
      />
      
      <main className="lg:ml-64 transition-all duration-300 pt-20 lg:pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Project Photos</h1>
          </div>
          <PhotoGalleryView initialProjectId={projectId} />
        </div>
      </main>
    </div>
  );
}


