import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MobileOptimizedTableProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    mobilePriority?: boolean;
    render?: (value: any, row: any) => React.ReactNode;
  }[];
  onRowClick?: (row: any) => void;
  className?: string;
}

const MobileOptimizedTable: React.FC<MobileOptimizedTableProps> = ({
  data,
  columns,
  onRowClick,
  className = ''
}) => {
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const mobileColumns = columns.filter(col => col.mobilePriority !== false);
  const desktopColumns = columns;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Mobile View - Card Layout */}
      <div className="block md:hidden">
        {data.map((row, index) => (
          <div
            key={index}
            className={`bg-white border border-gray-200 rounded-lg p-4 ${
              onRowClick ? 'cursor-pointer hover:shadow-md' : ''
            } transition-all duration-200`}
            onClick={() => onRowClick?.(row)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                {mobileColumns.slice(0, 2).map((col, colIndex) => (
                  <div key={col.key} className={colIndex === 0 ? 'font-medium text-gray-900' : 'text-sm text-gray-600'}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </div>
                ))}
              </div>
              {mobileColumns.length > 2 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRow(index);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {expandedRows.has(index) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            
            {expandedRows.has(index) && mobileColumns.length > 2 && (
              <div className="border-t border-gray-100 pt-3 space-y-2">
                {mobileColumns.slice(2).map((col) => (
                  <div key={col.key} className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">{col.label}:</span>
                    <span className="text-sm text-gray-900">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop View - Traditional Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {desktopColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr
                key={index}
                className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors duration-200`}
                onClick={() => onRowClick?.(row)}
              >
                {desktopColumns.map((col) => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MobileOptimizedTable;
