import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authFetch } from '@/lib/authFetch';

export interface AIAnalysisResult {
  confidence: number;
  is_clear: boolean;
  shows_correct_work: boolean;
  appears_complete: boolean;
  assessment: string;
  recommendation: 'approve' | 'review' | 'retake';
}

export function useAnalyzePhoto() {
  return useMutation({
    mutationFn: async ({ image_base64, task_id }: { image_base64: string; task_id: string }) => {
      const res = await authFetch('/api/ai/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64, task_id }),
      });
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to analyze photo');
      }
      
      return (await res.json()).data as AIAnalysisResult;
    },
  });
}
