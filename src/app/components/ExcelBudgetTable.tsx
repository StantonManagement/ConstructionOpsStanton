'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Edit2, Trash2, Save, X, Plus } from 'lucide-react';
import { formatCurrency, formatPercent, getBudgetStatus } from '@/lib/theme';
import { SignalBadge } from '@/components/ui/SignalBadge';

// Types
interface BudgetRow {
  id: number | null; // null for new rows
  category_name: string;
  description?: string | null;
  original_amount: number;
  revised_amount: number;
  actual_spend: number;
  committed_costs: number;
  remaining_amount?: number;
  percent_spent?: number;
  budget_status?: string;
  linked_contract_total?: number; // For locked committed costs
  display_order?: number;
  notes?: string | null;
}

interface ExcelBudgetTableProps {
  data: BudgetRow[];
  onUpdate: (id: number, updates: Partial<BudgetRow>) => Promise<void>;
  onCreate: (newRow: Partial<BudgetRow>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isLoading?: boolean;
}

interface CellPosition {
  rowIndex: number;
  colKey: string;
}

type EditableField = 'original_amount' | 'revised_amount' | 'actual_spend' | 'committed_costs';

const EDITABLE_COLUMNS: EditableField[] = ['original_amount', 'revised_amount', 'actual_spend', 'committed_costs'];

export const ExcelBudgetTable: React.FC<ExcelBudgetTableProps> = ({
  data,
  onUpdate,
  onCreate,
  onDelete,
  isLoading = false
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [localData, setLocalData] = useState<BudgetRow[]>(data);
  const [modifiedCells, setModifiedCells] = useState<Set<string>>(new Set());
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null);
  const [newRow, setNewRow] = useState<Partial<BudgetRow> | null>(null);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [originalValues, setOriginalValues] = useState<Map<string, number>>(new Map());
  
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const tableRef = useRef<HTMLDivElement>(null);

  // Sync local data with props
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Helper to get cell key
  const getCellKey = (rowIndex: number, colKey: string) => `${rowIndex}-${colKey}`;

  // Helper to calculate derived values
  const calculateDerivedValues = (row: Partial<BudgetRow>): Partial<BudgetRow> => {
    const revised = row.revised_amount ?? row.original_amount ?? 0;
    const actual = row.actual_spend ?? 0;
    const committed = row.committed_costs ?? 0;
    const remaining = revised - actual - committed;
    const percent_spent = revised > 0 ? (actual / revised) * 100 : 0;

    let budget_status = 'On Track';
    const ratio = revised > 0 ? (actual + committed) / revised : 0;
    if (ratio >= 1.05) budget_status = 'Over Budget';
    else if (ratio >= 1.0) budget_status = 'Critical';
    else if (ratio >= 0.9) budget_status = 'Warning';

    return {
      ...row,
      remaining_amount: remaining,
      percent_spent: percent_spent,
      budget_status
    };
  };

  // Handle cell value change
  const handleCellChange = (rowIndex: number, colKey: EditableField, value: string) => {
    const numValue = parseFloat(value) || 0;
    const cellKey = getCellKey(rowIndex, colKey);
    
    // Store original value on first edit
    if (!originalValues.has(cellKey)) {
      const currentValue = localData[rowIndex][colKey];
      setOriginalValues(prev => new Map(prev).set(cellKey, currentValue));
    }
    
    setLocalData(prev => {
      const newData = [...prev];
      const updatedRow = {
        ...newData[rowIndex],
        [colKey]: numValue
      };
      newData[rowIndex] = calculateDerivedValues(updatedRow) as BudgetRow;
      return newData;
    });

    setModifiedCells(prev => new Set([...prev, cellKey]));
  };

  // Save cell changes
  const saveCellChanges = async (rowIndex: number, colKey: EditableField) => {
    const row = localData[rowIndex];
    if (!row || !row.id) return;

    const cellKey = getCellKey(rowIndex, colKey);
    if (!modifiedCells.has(cellKey)) return;

    setSavingCells(prev => new Set([...prev, cellKey]));

    try {
      const updates: Partial<BudgetRow> = {
        [colKey]: row[colKey]
      };

      await onUpdate(row.id, updates);
      
      setModifiedCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
      
      // Remove from original values since it's now saved
      setOriginalValues(prev => {
        const newMap = new Map(prev);
        newMap.delete(cellKey);
        return newMap;
      });
    } catch (error) {
      console.error('Error saving cell:', error);
      // Revert on error
      setLocalData(data);
    } finally {
      setSavingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIndex: number, colKey: string) => {
    const colIndex = EDITABLE_COLUMNS.indexOf(colKey as EditableField);
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          const newPos = { rowIndex: rowIndex - 1, colKey };
          setFocusedCell(newPos);
          const cellKey = getCellKey(rowIndex - 1, colKey);
          cellRefs.current[cellKey]?.focus();
        }
        break;
        
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        if (rowIndex < localData.length - 1) {
          const newPos = { rowIndex: rowIndex + 1, colKey };
          setFocusedCell(newPos);
          const cellKey = getCellKey(rowIndex + 1, colKey);
          cellRefs.current[cellKey]?.focus();
        } else if (newRow) {
          // Focus on new row
          const cellKey = getCellKey(localData.length, colKey);
          cellRefs.current[cellKey]?.focus();
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        if (colIndex > 0) {
          const newColKey = EDITABLE_COLUMNS[colIndex - 1];
          const newPos = { rowIndex, colKey: newColKey };
          setFocusedCell(newPos);
          const cellKey = getCellKey(rowIndex, newColKey);
          cellRefs.current[cellKey]?.focus();
        }
        break;
        
      case 'ArrowRight':
      case 'Tab':
        e.preventDefault();
        if (colIndex < EDITABLE_COLUMNS.length - 1) {
          const newColKey = EDITABLE_COLUMNS[colIndex + 1];
          const newPos = { rowIndex, colKey: newColKey };
          setFocusedCell(newPos);
          const cellKey = getCellKey(rowIndex, newColKey);
          cellRefs.current[cellKey]?.focus();
        } else if (rowIndex < localData.length - 1) {
          // Move to first column of next row
          const newColKey = EDITABLE_COLUMNS[0];
          const newPos = { rowIndex: rowIndex + 1, colKey: newColKey };
          setFocusedCell(newPos);
          const cellKey = getCellKey(rowIndex + 1, newColKey);
          cellRefs.current[cellKey]?.focus();
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        const cellKey = getCellKey(rowIndex, colKey);
        const originalValue = originalValues.get(cellKey);
        
        if (originalValue !== undefined) {
          // Revert to original value
          setLocalData(prev => {
            const newData = [...prev];
            const revertedRow = {
              ...newData[rowIndex],
              [colKey]: originalValue
            };
            newData[rowIndex] = calculateDerivedValues(revertedRow) as BudgetRow;
            return newData;
          });
          
          // Clear modified flag
          setModifiedCells(prev => {
            const newSet = new Set(prev);
            newSet.delete(cellKey);
            return newSet;
          });
          
          // Remove from original values
          setOriginalValues(prev => {
            const newMap = new Map(prev);
            newMap.delete(cellKey);
            return newMap;
          });
        }
        break;
    }
  }, [localData, data, newRow]);

  // Handle blur - save changes
  const handleBlur = (rowIndex: number, colKey: EditableField) => {
    if (editMode) {
      saveCellChanges(rowIndex, colKey);
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (editMode) {
      // Exiting edit mode - clear tracking
      setModifiedCells(new Set());
      setOriginalValues(new Map());
    }
  };
  
  // Discard all changes
  const discardAllChanges = () => {
    if (modifiedCells.size > 0) {
      if (confirm(`Discard ${modifiedCells.size} unsaved change(s)?`)) {
        setLocalData(data); // Reset to original props
        setModifiedCells(new Set()); // Clear all modifications
        setOriginalValues(new Map()); // Clear original values
        setEditMode(false); // Exit edit mode
      }
    } else {
      setEditMode(false); // Just exit if no changes
    }
  };

  // Add new row
  const addNewRow = () => {
    setNewRow({
      category_name: '',
      original_amount: 0,
      revised_amount: 0,
      actual_spend: 0,
      committed_costs: 0
    });
  };

  // Save new row
  const saveNewRow = async () => {
    if (!newRow || !newRow.category_name) {
      alert('Please enter a category name');
      return;
    }

    if (!newRow.original_amount || newRow.original_amount <= 0) {
      alert('Please enter a valid original amount (must be greater than 0)');
      return;
    }

    try {
      await onCreate(newRow);
      setNewRow(null);
    } catch (error) {
      console.error('Error creating row:', error);
      alert('Failed to create budget item');
    }
  };

  // Cancel new row
  const cancelNewRow = () => {
    setNewRow(null);
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    const row = localData.find(r => r.id === id);
    if (!row) return;

    if (confirm(`Delete ${row.category_name}? This cannot be undone.`)) {
      try {
        await onDelete(id);
      } catch (error) {
        console.error('Error deleting row:', error);
        alert('Failed to delete budget item');
      }
    }
  };

  // Render editable cell
  const renderEditableCell = (row: BudgetRow, rowIndex: number, colKey: EditableField) => {
    const cellKey = getCellKey(rowIndex, colKey);
    const isModified = modifiedCells.has(cellKey);
    const isSaving = savingCells.has(cellKey);
    const isLocked = colKey === 'committed_costs' && row.linked_contract_total !== undefined;

    return (
      <td className="px-4 py-2 text-right border-b border-border">
        <input
          ref={(el) => { cellRefs.current[cellKey] = el; }}
          type="number"
          step="0.01"
          value={row[colKey]}
          onChange={(e) => handleCellChange(rowIndex, colKey, e.target.value)}
          onBlur={() => handleBlur(rowIndex, colKey)}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, colKey)}
          onFocus={() => setFocusedCell({ rowIndex, colKey })}
          disabled={!editMode || isLocked}
          className={`
            w-full px-2 py-1 text-right rounded
            ${editMode && !isLocked ? 'bg-background border border-input focus:ring-2 focus:ring-primary' : 'bg-transparent border-transparent'}
            ${isModified ? 'bg-yellow-50 border-yellow-300' : ''}
            ${isSaving ? 'opacity-50' : ''}
            ${isLocked ? 'bg-gray-100 cursor-not-allowed' : ''}
          `}
          readOnly={!editMode || isLocked}
        />
      </td>
    );
  };

  return (
    <div ref={tableRef} className="space-y-4">
      {/* Controls */}
      <div className="flex justify-end gap-2">
        <button
          onClick={toggleEditMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            editMode 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {editMode ? (
            <>
              <Save className="w-4 h-4" />
              Save & Exit Edit Mode
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" />
              Edit All
            </>
          )}
        </button>
        
        {editMode && modifiedCells.size > 0 && (
          <button
            onClick={discardAllChanges}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <X className="w-4 h-4" />
            Discard All Changes
          </button>
        )}
        
        {!newRow && (
          <button
            onClick={addNewRow}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Line Item
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Category</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground border-b border-border">Original</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground border-b border-border">Revised</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground border-b border-border">Actual</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground border-b border-border">Committed</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-foreground border-b border-border">Remaining</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">% Spent</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">Status</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {localData.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="hover:bg-accent/50 transition-colors">
                <td className="px-4 py-2 border-b border-border">
                  <div className="font-medium text-foreground">{row.category_name}</div>
                  {row.description && (
                    <div className="text-xs text-muted-foreground">{row.description}</div>
                  )}
                </td>
                {renderEditableCell(row, rowIndex, 'original_amount')}
                {renderEditableCell(row, rowIndex, 'revised_amount')}
                {renderEditableCell(row, rowIndex, 'actual_spend')}
                {renderEditableCell(row, rowIndex, 'committed_costs')}
                <td className="px-4 py-2 text-right border-b border-border">
                  <span className={`font-medium ${(row.remaining_amount || 0) < 0 ? 'text-status-critical' : 'text-status-success'}`}>
                    {formatCurrency(row.remaining_amount || 0)}
                  </span>
                </td>
                <td className="px-4 py-2 text-center border-b border-border">
                  {formatPercent(row.percent_spent || 0)}
                </td>
                <td className="px-4 py-2 text-center border-b border-border">
                  {row.budget_status && row.budget_status !== 'On Track' && (
                    <SignalBadge status={
                      row.budget_status === 'Over Budget' || row.budget_status === 'Critical' 
                        ? 'critical' 
                        : row.budget_status === 'Warning' 
                        ? 'warning' 
                        : 'neutral'
                    }>
                      {row.budget_status}
                    </SignalBadge>
                  )}
                </td>
                <td className="px-4 py-2 text-center border-b border-border">
                  <button
                    onClick={() => row.id && handleDelete(row.id)}
                    className="text-muted-foreground hover:text-status-critical transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}

            {/* New Row */}
            {newRow && (
              <tr className="bg-blue-50 border-2 border-blue-300">
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="text"
                    value={newRow.category_name || ''}
                    onChange={(e) => setNewRow({ ...newRow, category_name: e.target.value })}
                    placeholder="Category name..."
                    className="w-full px-2 py-1 border border-input rounded focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="number"
                    step="0.01"
                    value={newRow.original_amount || ''}
                    onChange={(e) => setNewRow({ ...newRow, original_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-right border border-input rounded focus:ring-2 focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="number"
                    step="0.01"
                    value={newRow.revised_amount || ''}
                    onChange={(e) => setNewRow({ ...newRow, revised_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-right border border-input rounded focus:ring-2 focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="number"
                    step="0.01"
                    value={newRow.actual_spend || ''}
                    onChange={(e) => setNewRow({ ...newRow, actual_spend: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-right border border-input rounded focus:ring-2 focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="number"
                    step="0.01"
                    value={newRow.committed_costs || ''}
                    onChange={(e) => setNewRow({ ...newRow, committed_costs: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-right border border-input rounded focus:ring-2 focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-2 border-b border-border"></td>
                <td className="px-4 py-2 border-b border-border"></td>
                <td className="px-4 py-2 border-b border-border"></td>
                <td className="px-4 py-2 text-center border-b border-border">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={saveNewRow}
                      className="text-green-600 hover:text-green-700 transition-colors"
                      title="Save"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelNewRow}
                      className="text-red-600 hover:text-red-700 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {localData.length === 0 && !newRow && (
        <div className="text-center py-8 text-muted-foreground">
          No budget items yet. Click "Add Line Item" to get started.
        </div>
      )}

      {editMode && (
        <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded p-3">
          <strong>Edit Mode Active:</strong> Use arrow keys to navigate. Tab to move forward. Enter to move down. Escape to cancel changes.
        </div>
      )}
    </div>
  );
};

