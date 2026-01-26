'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Clock, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditLogEntry {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  changes?: Record<string, any>;
  created_at: string;
}

interface AuditLogProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
}

export const AuditLog: React.FC<AuditLogProps> = ({
  entityType,
  entityId,
  limit = 10
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, [entityType, entityId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(showAll ? 100 : limit);

      if (entityType && entityId) {
        query = query
          .eq('entity_type', entityType)
          .eq('entity_id', entityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        setLogs([]);
      } else {
        setLogs(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return '✨';
    if (action.includes('update') || action.includes('edit')) return '✏️';
    if (action.includes('delete')) return '🗑️';
    if (action.includes('approve')) return '✅';
    if (action.includes('reject')) return '❌';
    if (action.includes('upload')) return '📤';
    if (action.includes('download')) return '📥';
    return '📝';
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'text-green-600';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-600';
    if (action.includes('delete')) return 'text-red-600';
    if (action.includes('approve')) return 'text-green-700';
    if (action.includes('reject')) return 'text-red-700';
    return 'text-gray-600';
  };

  const formatAction = (log: AuditLogEntry) => {
    const parts = [];
    parts.push(log.action);
    if (log.entity_name) {
      parts.push(`"${log.entity_name}"`);
    }
    return parts.join(' ');
  };

  if (!isExpanded) {
    return (
      <div className="mt-4 border-t border-gray-200 pt-3">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Clock className="w-3 h-3" />
          <span>Activity Log ({logs.length})</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-2 text-xs font-medium text-gray-900 hover:text-gray-700"
        >
          <Clock className="w-3 h-3" />
          <span>Activity Log ({logs.length})</span>
          <ChevronUp className="w-3 h-3" />
        </button>
        {logs.length > limit && !showAll && (
          <button
            onClick={() => {
              setShowAll(true);
              fetchAuditLogs();
            }}
            className="text-xs text-primary hover:text-primary/80"
          >
            View All →
          </button>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-2 max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-4">
            <FileText className="w-5 h-5 text-gray-300 mx-auto mb-1" />
            <p className="text-xs text-gray-500">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 p-2 bg-white rounded border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <span className="text-sm mt-0.5">{getActionIcon(log.action)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium ${getActionColor(log.action)}`}>
                      {formatAction(log)}
                    </span>
                    {log.entity_type && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {log.entity_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <User className="w-3 h-3" />
                    <span>{log.user_name || 'Unknown User'}</span>
                    <span>•</span>
                    <span title={new Date(log.created_at).toLocaleString()}>
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <details className="mt-1">
                      <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">
                        View changes
                      </summary>
                      <pre className="mt-1 text-[9px] bg-gray-50 p-1 rounded overflow-x-auto">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
