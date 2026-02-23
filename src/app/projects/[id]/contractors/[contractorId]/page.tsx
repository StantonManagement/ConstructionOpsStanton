'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import ContractorDetailView from '@/app/components/ContractorDetailView';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import AppLayout from '@/app/components/AppLayout';
import { authFetch } from '@/lib/authFetch';

interface Contractor {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  trade?: string;
  status?: string;
  [key: string]: any;
}

function ContractorDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const contractorId = params?.contractorId as string;

  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContractor = async () => {
      if (!contractorId) return;

      try {
        setIsLoading(true);
        const response = await authFetch(`/api/contractors/${contractorId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch contractor');
        }

        const data = await response.json();
        setContractor(data);
      } catch (err) {
        console.error('Error fetching contractor:', err);
        setError('Failed to load contractor');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContractor();
  }, [contractorId]);

  if (isLoading) {
    return <LoadingAnimation text="Loading contractor..." />;
  }

  if (error || !contractor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-destructive mb-4">
            {error || 'Contractor not found'}
          </h2>
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Back to Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <ContractorDetailView
      contractor={contractor}
      projectId={parseInt(projectId)}
      onBack={() => router.push(`/projects/${projectId}`)}
      onEdit={(updatedContractor) => {
        setContractor(updatedContractor);
      }}
      onDelete={() => {
        router.push(`/projects/${projectId}`);
      }}
    />
  );
}

export default function ContractorDetailPage() {
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
      <Suspense fallback={<LoadingAnimation text="Loading contractor..." />}>
        <ContractorDetailContent />
      </Suspense>
    </AppLayout>
  );
}
