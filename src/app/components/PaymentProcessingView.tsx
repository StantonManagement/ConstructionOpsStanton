import React, { useEffect, useState } from 'react';
import { useData, Project } from '../context/DataContext';
import { supabase } from '@/lib/supabaseClient';

type PaymentProcessingViewProps = {
  setSelectedProject: (project: Project) => void;
};

type SMSConversation = {
  id: number;
  contractor: string;
  project: string;
  state: string;
  phone: string;
  updated: string;
};

type SupabaseSMSRow = {
  id: number;
  contractor_phone: string;
  conversation_state: string;
  updated_at: string;
  payment_applications: {
    id: number;
    project_id: number;
    contractor_id: number;
  }[];
};

const PaymentProcessingView: React.FC<PaymentProcessingViewProps> = ({ setSelectedProject }) => {
    const { projects, subcontractors } = useData();
    const [smsConversations, setSmsConversations] = useState<SMSConversation[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        supabase
            .from('payment_sms_conversations')
            .select('id,contractor_phone,conversation_state,updated_at,payment_applications(id,project_id,contractor_id)')
            .then(({ data }) => {
                if (!data) return setSmsConversations([]);
                const mapped = (data as SupabaseSMSRow[]).map((row) => {
                    const app = row.payment_applications?.[0];
                    const project = projects.find((p) => p.id === app?.project_id)?.name || '';
                    const contractor = subcontractors.find((s) => s.id === app?.contractor_id)?.name || row.contractor_phone;
                    return {
                        id: row.id,
                        contractor,
                        project,
                        state: row.conversation_state,
                        phone: row.contractor_phone,
                        updated: row.updated_at,
                    };
                });
                setSmsConversations(mapped);
                setLoading(false);
            });
    }, [projects, subcontractors]);

    const groupByState = (state: string) => smsConversations.filter((c) => c.state === state);

    return (
        <div className="space-y-6 text-gray-900">
            <div className="bg-white rounded-lg border shadow-sm p-4 text-gray-900">
                <h3 className="text-lg font-semibold">Create Payment Applications</h3>
                <p className="text-sm">Select a project to begin.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project: Project) => (
                        <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer text-gray-900" onClick={() => setSelectedProject(project)}>
                            <h4 className="font-semibold">{project.name}</h4>
                            <p className="text-sm">{project.client_name}</p>
                             <button className="mt-3 w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">Create Payment Apps</button>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border shadow-sm p-4 text-gray-900">
                    <h4 className="font-semibold mb-2">📱 SMS Awaiting Start</h4>
                    {loading ? <div>Loading...</div> : groupByState('awaiting_start').length === 0 ? <div className="text-gray-500">None</div> : (
                        <ul className="space-y-2">
                            {groupByState('awaiting_start').map((c) => (
                                <li key={c.id} className="border rounded p-2 flex flex-col">
                                    <span className="font-medium">{c.contractor}</span>
                                    <span className="text-xs text-gray-500">{c.project}</span>
                                    <span className="text-xs text-gray-400">{c.phone}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="bg-white rounded-lg border shadow-sm p-4 text-gray-900">
                    <h4 className="font-semibold mb-2">⏳ SMS In Progress</h4>
                    {loading ? <div>Loading...</div> : groupByState('in_progress').length === 0 ? <div className="text-gray-500">None</div> : (
                        <ul className="space-y-2">
                            {groupByState('in_progress').map((c) => (
                                <li key={c.id} className="border rounded p-2 flex flex-col">
                                    <span className="font-medium">{c.contractor}</span>
                                    <span className="text-xs text-gray-500">{c.project}</span>
                                    <span className="text-xs text-gray-400">{c.phone}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="bg-white rounded-lg border shadow-sm p-4 text-gray-900">
                    <h4 className="font-semibold mb-2">✅ SMS Completed</h4>
                    {loading ? <div>Loading...</div> : groupByState('completed').length === 0 ? <div className="text-gray-500">None</div> : (
                        <ul className="space-y-2">
                            {groupByState('completed').map((c) => (
                                <li key={c.id} className="border rounded p-2 flex flex-col">
                                    <span className="font-medium">{c.contractor}</span>
                                    <span className="text-xs text-gray-500">{c.project}</span>
                                    <span className="text-xs text-gray-400">{c.phone}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentProcessingView; 