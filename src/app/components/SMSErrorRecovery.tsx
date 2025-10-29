import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, MessageSquare, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface SMSErrorRecoveryProps {
  paymentAppId: number;
  contractorPhone: string;
  onRecoverySuccess?: () => void;
  onManualOverride?: () => void;
}

const SMSErrorRecovery: React.FC<SMSErrorRecoveryProps> = ({
  paymentAppId,
  contractorPhone,
  onRecoverySuccess,
  onManualOverride
}) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'attempting' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const maxRetries = 3;

  const attemptRecovery = async () => {
    if (retryCount >= maxRetries) {
      setRecoveryStatus('failed');
      setErrorMessage('Maximum retry attempts reached. Please contact support.');
      return;
    }

    setIsRecovering(true);
    setRecoveryStatus('attempting');
    setErrorMessage('');

    try {
      // Reset SMS conversation state
      const { error: resetError } = await supabase
        .from('payment_sms_conversations')
        .update({
          conversation_state: 'awaiting_start',
          current_question_index: 0,
          responses: '[]',
          timeout_count: 0,
          escalated_to_dean: false
        })
        .eq('payment_app_id', paymentAppId);

      if (resetError) {
        throw new Error('Failed to reset SMS conversation');
      }

      // Trigger new SMS
      const response = await fetch('/api/sms/start-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentAppId,
          contractorPhone
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to restart SMS conversation');
      }

      setRetryCount(prev => prev + 1);
      setRecoveryStatus('success');
      onRecoverySuccess?.();

    } catch (error) {
      console.error('SMS Recovery failed:', error);
      setRecoveryStatus('failed');
      setErrorMessage(error instanceof Error ? error.message : 'Recovery failed');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleManualOverride = () => {
    onManualOverride?.();
  };

  const getStatusIcon = () => {
    switch (recoveryStatus) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <MessageSquare className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (recoveryStatus) {
      case 'success':
        return 'SMS conversation restarted successfully';
      case 'failed':
        return 'Failed to restart SMS conversation';
      case 'attempting':
        return 'Attempting to restart SMS conversation...';
      default:
        return 'SMS conversation failed. Attempt recovery?';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        {getStatusIcon()}
        
        <div className="flex-1">
          <h4 className="font-medium text-foreground mb-1">
            SMS Recovery
          </h4>
          
          <p className="text-sm text-muted-foreground mb-3">
            {getStatusMessage()}
          </p>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {recoveryStatus === 'idle' && (
            <div className="space-y-2">
              <button
                onClick={attemptRecovery}
                disabled={isRecovering}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRecovering ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                {isRecovering ? 'Attempting Recovery...' : 'Attempt Recovery'}
              </button>
              
              <button
                onClick={handleManualOverride}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Manual Override
              </button>
            </div>
          )}

          {recoveryStatus === 'failed' && (
            <div className="space-y-2">
              <button
                onClick={attemptRecovery}
                disabled={retryCount >= maxRetries}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry ({maxRetries - retryCount} attempts left)
              </button>
              
              <button
                onClick={handleManualOverride}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Manual Override
              </button>
            </div>
          )}

          {recoveryStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-700">
                SMS conversation has been restarted. The contractor should receive a new message shortly.
              </p>
            </div>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            <p>Contractor Phone: {contractorPhone}</p>
            <p>Payment App ID: #{paymentAppId}</p>
            {retryCount > 0 && (
              <p>Retry Attempts: {retryCount}/{maxRetries}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMSErrorRecovery;
