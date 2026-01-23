import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { SignalBadge } from '@/components/ui/SignalBadge'
import { SystemStatus } from '@/lib/theme'
import { cn } from '@/lib/utils'

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  subtitle?: string
  status?: SystemStatus
  statusLabel?: string
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

/**
 * Summary Card Pattern from the Design System.
 * Enforces "No Shadow, Border Only" style for dashboard metrics.
 * 
 * @example
 * <MetricCard 
 *   title="Total Budget" 
 *   value="$50,000" 
 *   status="critical" 
 *   statusLabel="Over Budget" 
 * />
 */
export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  status = 'neutral', 
  statusLabel,
  className,
  padding = 'md',
  ...props
}: MetricCardProps) {
  
  // Map padding prop to Tailwind classes
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <Card
      className={cn(
        "border-border shadow-none bg-card transition-colors max-w-full overflow-hidden",
        props.onClick && "cursor-pointer hover:bg-accent/50",
        className
      )}
      {...props}
    >
      <div className={cn("flex flex-col h-full", paddingClasses[padding])}>
        <div className="flex justify-between items-start w-full mb-2 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          {status !== 'neutral' && statusLabel && (
            <SignalBadge status={status} className="flex-shrink-0">{statusLabel}</SignalBadge>
          )}
        </div>

        <div className="mt-auto min-w-0">
          <p className={cn(
            "text-lg sm:text-2xl font-semibold tracking-tight truncate",
            status === 'critical' ? 'text-status-critical' : 'text-foreground'
          )}>
            {value}
          </p>

          {subtitle && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
