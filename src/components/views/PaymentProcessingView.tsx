import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useData, Project } from '@/app/context/DataContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const PaymentProcessingView: React.FC = () => {
  const { state } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [paymentApplications, setPaymentApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPaymentApplications = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_applications')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      setPaymentApplications(data || []);
    } catch (error) {
      console.error('Error fetching payment applications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      const project = state.projects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        fetchPaymentApplications(projectId);
      }
    }
  }, [projectId, state.projects, fetchPaymentApplications]);

  const handleBackToProjects = () => {
    router.push('/');
  };

  if (!selectedProject) {
    return (
      <div className="p-6">
        <button
          onClick={handleBackToProjects}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
        <div className="text-center py-12">
          <p className="text-gray-500">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToProjects}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Payment Processing - {selectedProject.name}
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading payment applications...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Payment Applications</h3>
          </div>
          {paymentApplications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No payment applications found for this project</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {paymentApplications.map((app) => (
                <div key={app.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Application #{app.application_number}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Period ending: {app.period_ending}
                      </p>
                      <p className="text-sm text-gray-600">
                        Amount: ${app.total_amount?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        app.status === 'approved' ? 'bg-green-100 text-green-800' :
                        app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentProcessingView;