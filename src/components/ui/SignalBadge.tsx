import React from 'react'
import { SystemStatus } from '@/lib/theme'

interface SignalBadgeProps {
  status: SystemStatus
  children: React.ReactNode
  size?: 'sm' | 'md'
  className?: string
}

/**
 * strict implementation of the design system badge.
 * ONLY use this when you have a 'critical' | 'warning' | 'success' | 'neutral' status.
 */
export function SignalBadge({ status, children, size = 'sm', className = '' }: SignalBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  }
  
  const statusClasses = {
    // Critical: Red background, red text (Signal: STOP/DANGER)
    critical: 'bg-red-50 text-status-critical border-red-200 border dark:bg-red-900/20 dark:border-red-800',
    // Warning: Amber background, amber text (Signal: CAUTION)
    warning: 'bg-amber-50 text-status-warning border-amber-200 border dark:bg-amber-900/20 dark:border-amber-800',
    // Success: Emerald background, emerald text (Signal: GOOD)
    success: 'bg-emerald-50 text-status-success border-emerald-200 border dark:bg-emerald-900/20 dark:border-emerald-800',
    // Neutral: Gray background, gray text (Signal: NONE)
    neutral: 'bg-gray-50 text-status-neutral border-gray-200 border dark:bg-gray-900/20 dark:border-gray-800',
  }
  
  return (
    <span className={`inline-flex items-center font-medium rounded ${sizeClasses[size]} ${statusClasses[status]} ${className}`}>
      {children}
    </span>
  )
}




