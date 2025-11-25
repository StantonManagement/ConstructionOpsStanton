import React from 'react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  header: string | React.ReactNode
  accessor: keyof T | ((row: T) => React.ReactNode)
  align?: 'left' | 'right' | 'center'
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  emptyMessage?: string
  className?: string
  onRowClick?: (row: T) => void
  footer?: React.ReactNode
}

/**
 * Clean, "Gray by default" table component for list views.
 * Enforces the design system's table styling.
 */
export function DataTable<T>({ 
  data, 
  columns, 
  emptyMessage = 'No data available',
  className,
  onRowClick,
  footer
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto rounded-md border border-border", className)}>
      <table className="min-w-full divide-y divide-border bg-card">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((column, idx) => (
              <th
                key={idx}
                scope="col"
                className={cn(
                  "px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider",
                  column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td 
                colSpan={columns.length} 
                className="px-6 py-8 text-center text-muted-foreground text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr 
                key={rowIdx} 
                className={cn(
                  "transition-colors hover:bg-muted/50",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column, colIdx) => {
                  const value = typeof column.accessor === 'function' 
                    ? column.accessor(row) 
                    : (row[column.accessor] as React.ReactNode)
                  
                  return (
                    <td
                      key={colIdx}
                      className={cn(
                        "px-6 py-4 text-sm text-foreground whitespace-nowrap",
                        column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left',
                        column.className
                      )}
                    >
                      {value}
                    </td>
                  )
                })}
              </tr>
                ))
              )}
            </tbody>
            {footer}
          </table>
        </div>
      )
    }

