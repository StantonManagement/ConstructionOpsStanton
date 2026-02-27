'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import ContractorDetailView from '@/app/components/ContractorDetailView';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import AppLayout from '@/app/components/AppLayout';
import { authFetch } from '@/lib/authFetch';
import { Contractor } from '@/lib/contractors/service';

interface Contract {
  id: number;
  project_id: number;
  subcontractor_id: number;
  contract_amount: number;
  original_contract_amount: number;
  paid_to_date: number;
  start_date?: string;
  end_date?: string;
  contract_status?: string;
  budget_item_id?: number | null;
}

function ContractorDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const contractorId = params?.contractorId as string;

  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!contractorId || !projectId) return;

      try {
        setIsLoading(true);

        // Fetch contractor
        const contractorResponse = await authFetch(`/api/contractors/${contractorId}`);
        if (!contractorResponse.ok) {
          throw new Error('Failed to fetch contractor');
        }
        const contractorData = await contractorResponse.json();
        setContractor(contractorData.contractor || contractorData);

        // Fetch contract for this contractor on this project
        const contractResponse = await authFetch(
          `/api/projects/${projectId}/contractors/${contractorId}/contract`
        );
        if (!contractResponse.ok) {
          throw new Error('Failed to fetch contract');
        }
        const contractData = await contractResponse.json();
        setContract(contractData.contract || contractData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load contractor details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [contractorId, projectId]);

  if (isLoading) {
    return <LoadingAnimation text="Loading contractor..." />;
  }

  if (error || !contractor || !contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-destructive mb-4">
            {error || 'Contractor or contract not found'}
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
      contract={contract}
      contractor={contractor}
      onBack={() => router.push(`/projects/${projectId}`)}
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
