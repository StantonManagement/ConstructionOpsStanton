'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Edit2, Trash2, Save, X, Plus, Upload, List } from 'lucide-react';
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

interface NewBulkRow {
  category_name: string;
  original_amount: string;
  revised_amount: string;
  actual_spend: string;
  committed_costs: string;
}

// Type for data passed to callbacks (without the null id)
type BudgetRowUpdate = Omit<Partial<BudgetRow>, 'id'> & { id?: number };

interface ExcelBudgetTableProps {
  data: BudgetRow[];
  onUpdate: (id: number, updates: BudgetRowUpdate) => Promise<void>;
  onCreate: (newRow: BudgetRowUpdate) => Promise<void>;
  onBulkCreate?: (items: BudgetRowUpdate[]) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isLoading?: boolean;
}

interface CellPosition {
  rowIndex: number;
  colKey: string;
}

type EditableField = 'original_amount' | 'revised_amount' | 'actual_spend' | 'committed_costs';

const EDITABLE_COLUMNS: EditableField[] = ['original_amount', 'revised_amount', 'actual_spend', 'committed_costs'];

const EMPTY_BULK_ROW: NewBulkRow = {
  category_name: '',
  original_amount: '',
  revised_amount: '',
  actual_spend: '',
  committed_costs: ''
};

export const ExcelBudgetTable: React.FC<ExcelBudgetTableProps> = ({
  data,
  onUpdate,
  onCreate,
  onBulkCreate,
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
  
  // Bulk add states
  const [bulkAddMode, setBulkAddMode] = useState(false);
  const [bulkRows, setBulkRows] = useState<NewBulkRow[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  
  // Paste from Excel states
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState<NewBulkRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  
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
    // Base budget uses revised when it's a positive number, otherwise falls back to original
    const original = typeof row.original_amount === 'number' ? row.original_amount : 0;
    const revised = typeof row.revised_amount === 'number' ? row.revised_amount : 0;
    const baseBudget = revised > 0 ? revised : original;

    const actual = row.actual_spend ?? 0;
    const committed = row.committed_costs ?? 0;
    const remaining = baseBudget - actual - committed;
    const percent_spent = baseBudget > 0 ? (actual / baseBudget) * 100 : 0;

    let budget_status = 'On Track';
    const ratio = baseBudget > 0 ? (actual + committed) / baseBudget : 0;
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
    const parsed = parseFloat(value);
    // Ensure value is non-negative (database has CHECK constraint >= 0)
    const numValue = isNaN(parsed) ? 0 : Math.max(0, parsed);
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
    if (!row || row.id === null || row.id === undefined) return;

    const rowId = row.id; // TypeScript now knows this is number
    const cellKey = getCellKey(rowIndex, colKey);
    if (!modifiedCells.has(cellKey)) return;

    setSavingCells(prev => new Set([...prev, cellKey]));

    try {
      const updates: BudgetRowUpdate = {
        [colKey]: row[colKey]
      };

      await onUpdate(rowId, updates);
      
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

  // Add new row (single)
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
      // Create the object without the null id property
      const rowToCreate: BudgetRowUpdate = {
        category_name: newRow.category_name,
        original_amount: newRow.original_amount,
        revised_amount: newRow.revised_amount,
        actual_spend: newRow.actual_spend,
        committed_costs: newRow.committed_costs
      };
      await onCreate(rowToCreate);
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

  // ===== BULK ADD FUNCTIONS =====
  
  // Start bulk add mode with 5 empty rows
  const startBulkAdd = (rowCount: number = 5) => {
    const emptyRows = Array(rowCount).fill(null).map(() => ({ ...EMPTY_BULK_ROW }));
    setBulkRows(emptyRows);
    setBulkAddMode(true);
    setNewRow(null); // Close single add if open
  };

  // Update a bulk row field
  const updateBulkRow = (index: number, field: keyof NewBulkRow, value: string) => {
    setBulkRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add more empty rows to bulk add
  const addMoreBulkRows = (count: number = 5) => {
    const moreRows = Array(count).fill(null).map(() => ({ ...EMPTY_BULK_ROW }));
    setBulkRows(prev => [...prev, ...moreRows]);
  };

  // Save all bulk rows
  const saveBulkRows = async () => {
    // Filter out empty rows
    const validRows = bulkRows.filter(row => 
      row.category_name.trim() && row.original_amount.trim()
    );

    if (validRows.length === 0) {
      alert('Please fill in at least one row with a category name and original amount');
      return;
    }

    // Validate amounts
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const originalAmt = parseFloat(row.original_amount);
      if (isNaN(originalAmt) || originalAmt < 0) {
        alert(`Row ${i + 1} (${row.category_name}): Invalid original amount`);
        return;
      }
    }

    setBulkSaving(true);
    try {
      // Helper to safely parse numbers, returning fallback for NaN
      const safeParseFloat = (val: string, fallback: number): number => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? fallback : parsed;
      };
      
      const itemsToCreate: BudgetRowUpdate[] = validRows.map(row => {
        const originalAmt = safeParseFloat(row.original_amount, 0);
        return {
          category_name: row.category_name.trim(),
          original_amount: originalAmt,
          revised_amount: row.revised_amount ? safeParseFloat(row.revised_amount, originalAmt) : originalAmt,
          actual_spend: row.actual_spend ? safeParseFloat(row.actual_spend, 0) : 0,
          committed_costs: row.committed_costs ? safeParseFloat(row.committed_costs, 0) : 0
        };
      });

      if (onBulkCreate) {
        await onBulkCreate(itemsToCreate);
      } else {
        // Fallback: create one by one
        for (const item of itemsToCreate) {
          await onCreate(item);
        }
      }

      setBulkAddMode(false);
      setBulkRows([]);
    } catch (error: any) {
      console.error('Error bulk creating rows:', error);
      const errorMsg = error?.message || 'Unknown error';
      alert(`Failed to create budget items: ${errorMsg}`);
    } finally {
      setBulkSaving(false);
    }
  };

  // Cancel bulk add
  const cancelBulkAdd = () => {
    if (bulkRows.some(r => r.category_name.trim() || r.original_amount.trim())) {
      if (!confirm('Discard all entered data?')) return;
    }
    setBulkAddMode(false);
    setBulkRows([]);
  };

  // ===== PASTE FROM EXCEL FUNCTIONS =====
  
  // Check if a line looks like a header row
  const isHeaderRow = (line: string): boolean => {
    const headerKeywords = [
      'category', 'trade', 'item', 'description', 'name',
      'original', 'revised', 'updated', 'budget', 'amount',
      'actual', 'spent', 'spend', 'committed', 'remaining',
      'uw budget', 'uw', 'cost'
    ];
    const lowerLine = line.toLowerCase();
    // If the line contains 2+ header keywords, it's likely a header
    const matchCount = headerKeywords.filter(kw => lowerLine.includes(kw)).length;
    return matchCount >= 2;
  };

  // Parse pasted text (tab or comma separated, handles spaces too)
  const parsePastedText = (text: string) => {
    setParseError(null);
    
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.trim().split('\n');
    const parsed: NewBulkRow[] = [];
    let skippedHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip header row if detected
      if (i === 0 && isHeaderRow(line)) {
        skippedHeader = true;
        continue;
      }

      // Try tab-separated first, then multiple spaces, then comma
      let parts = line.split('\t');
      if (parts.length < 2) {
        // Try splitting by 2+ spaces (common when copying from Excel with space alignment)
        parts = line.split(/\s{2,}/);
      }
      if (parts.length < 2) {
        parts = line.split(',');
      }

      if (parts.length < 2) {
        const rowNum = skippedHeader ? i : i + 1;
        setParseError(`Row ${rowNum}: Could not parse. Expected "Category<tab>Amount" or "Category,Amount"`);
        return;
      }

      const categoryName = parts[0].trim();
      
      // Helper to clean and parse amount values
      // Handles: "$1,000", "1000", "$-", "-", "", empty cells
      const cleanAmount = (val: string | undefined): string => {
        if (!val) return '0';
        const cleaned = val.trim().replace(/[$,]/g, '');
        // Handle "-" or empty as zero
        if (cleaned === '-' || cleaned === '' || cleaned === '—' || cleaned === '0') return '0';
        // If it's not a valid number, return 0
        const num = parseFloat(cleaned);
        if (isNaN(num)) return '0';
        return cleaned;
      };
      
      const originalAmount = cleanAmount(parts[1]);
      const revisedAmount = cleanAmount(parts[2]);
      const actualSpend = cleanAmount(parts[3]);
      const committedCosts = cleanAmount(parts[4]);

      if (!categoryName) {
        const rowNum = skippedHeader ? i : i + 1;
        setParseError(`Row ${rowNum}: Missing category name`);
        return;
      }

      const parsedAmount = parseFloat(originalAmount);
      if (isNaN(parsedAmount)) {
        const rowNum = skippedHeader ? i : i + 1;
        setParseError(`Row ${rowNum} (${categoryName}): Invalid amount "${parts[1]?.trim()}"`);
        return;
      }

      parsed.push({
        category_name: categoryName,
        original_amount: originalAmount,
        revised_amount: revisedAmount,
        actual_spend: actualSpend,
        committed_costs: committedCosts
      });
    }

    setParsedRows(parsed);
  };

  // Handle paste text change
  const handlePasteChange = (text: string) => {
    setPasteText(text);
    parsePastedText(text);
  };

  // Import parsed rows
  const importParsedRows = async () => {
    if (parsedRows.length === 0) {
      alert('No valid rows to import');
      return;
    }

    setBulkSaving(true);
    try {
      // Helper to safely parse numbers, returning fallback for NaN
      const safeParseFloat = (val: string, fallback: number): number => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? fallback : parsed;
      };
      
      const itemsToCreate: BudgetRowUpdate[] = parsedRows.map(row => {
        const originalAmt = safeParseFloat(row.original_amount, 0);
        return {
          category_name: row.category_name.trim(),
          original_amount: originalAmt,
          revised_amount: row.revised_amount ? safeParseFloat(row.revised_amount, originalAmt) : originalAmt,
          actual_spend: row.actual_spend ? safeParseFloat(row.actual_spend, 0) : 0,
          committed_costs: row.committed_costs ? safeParseFloat(row.committed_costs, 0) : 0
        };
      });

      if (onBulkCreate) {
        await onBulkCreate(itemsToCreate);
      } else {
        for (const item of itemsToCreate) {
          await onCreate(item);
        }
      }

      setShowPasteModal(false);
      setPasteText('');
      setParsedRows([]);
    } catch (error: any) {
      console.error('Error importing rows:', error);
      const errorMsg = error?.message || 'Unknown error';
      alert(`Failed to import budget items: ${errorMsg}`);
    } finally {
      setBulkSaving(false);
    }
  };

  // Close paste modal
  const closePasteModal = () => {
    setShowPasteModal(false);
    setPasteText('');
    setParsedRows([]);
    setParseError(null);
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
    const value = row[colKey];

    // Show formatted currency when not in edit mode
    if (!editMode) {
      return (
        <td className="px-4 py-2 border-b border-border">
          <div className={`text-right tabular-nums ${isLocked ? 'text-muted-foreground' : ''}`}>
            {formatCurrency(value, true)}
          </div>
        </td>
      );
    }

    return (
      <td className="px-4 py-2 text-right border-b border-border">
        <input
          ref={(el) => { cellRefs.current[cellKey] = el; }}
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => handleCellChange(rowIndex, colKey, e.target.value)}
          onBlur={() => handleBlur(rowIndex, colKey)}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, colKey)}
          onFocus={() => setFocusedCell({ rowIndex, colKey })}
          disabled={isLocked}
          className={`
            w-full px-2 py-1 text-right rounded
            ${!isLocked ? 'bg-background border border-input focus:ring-2 focus:ring-primary' : 'bg-gray-100 cursor-not-allowed'}
            ${isModified ? 'bg-yellow-50 border-yellow-300' : ''}
            ${isSaving ? 'opacity-50' : ''}
          `}
          readOnly={isLocked}
        />
      </td>
    );
  };

  return (
    <div ref={tableRef} className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex gap-2">
          {!bulkAddMode && !newRow && (
            <>
              <button
                onClick={addNewRow}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Line
              </button>
              <button
                onClick={() => startBulkAdd(5)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <List className="w-4 h-4" />
                Quick Add (5 Rows)
              </button>
              <button
                onClick={() => setShowPasteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Paste from Excel
              </button>
            </>
          )}
        </div>
        
        <div className="flex gap-2">
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
          
          {editMode && (
            <button
              onClick={discardAllChanges}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Discard All Changes
            </button>
          )}
        </div>
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
                <td className="px-4 py-2 border-b border-border">
                  <div className={`text-right tabular-nums font-medium ${(row.remaining_amount || 0) < 0 ? 'text-status-critical' : 'text-status-success'}`}>
                    {formatCurrency(row.remaining_amount || 0, true)}
                  </div>
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <div className="text-right tabular-nums">
                    {formatPercent(row.percent_spent || 0)}
                  </div>
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

            {/* New Row (single) */}
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
                    min="0"
                    value={newRow.original_amount || ''}
                    onChange={(e) => setNewRow({ ...newRow, original_amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2 py-1 text-right border border-input rounded focus:ring-2 focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newRow.revised_amount || ''}
                    onChange={(e) => setNewRow({ ...newRow, revised_amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2 py-1 text-right border border-input rounded focus:ring-2 focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newRow.actual_spend || ''}
                    onChange={(e) => setNewRow({ ...newRow, actual_spend: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2 py-1 text-right border border-input rounded focus:ring-2 focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newRow.committed_costs || ''}
                    onChange={(e) => setNewRow({ ...newRow, committed_costs: Math.max(0, parseFloat(e.target.value) || 0) })}
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

            {/* Totals Row */}
            {localData.length > 0 && !bulkAddMode && (
              (() => {
                const totals = localData.reduce((acc, row) => {
                  acc.original += Number(row.original_amount) || 0;
                  acc.revised += Number(row.revised_amount) || 0;
                  acc.actual += Number(row.actual_spend) || 0;
                  acc.committed += Number(row.committed_costs) || 0;
                  acc.remaining += Number(row.remaining_amount) || 0;
                  return acc;
                }, { original: 0, revised: 0, actual: 0, committed: 0, remaining: 0 });
                
                // Weighted average: total actual / total revised * 100
                const weightedPercentSpent = totals.revised > 0 
                  ? (totals.actual / totals.revised) * 100 
                  : 0;
                
                return (
                  <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                    <td className="px-4 py-3 border-b border-border text-foreground">
                      TOTALS
                    </td>
                    <td className="px-4 py-3 border-b border-border text-right tabular-nums">
                      {formatCurrency(totals.original, true)}
                    </td>
                    <td className="px-4 py-3 border-b border-border text-right tabular-nums">
                      {formatCurrency(totals.revised, true)}
                    </td>
                    <td className="px-4 py-3 border-b border-border text-right tabular-nums">
                      {formatCurrency(totals.actual, true)}
                    </td>
                    <td className="px-4 py-3 border-b border-border text-right tabular-nums">
                      {formatCurrency(totals.committed, true)}
                    </td>
                    <td className={`px-4 py-3 border-b border-border text-right tabular-nums ${totals.remaining < 0 ? 'text-status-critical' : 'text-status-success'}`}>
                      {formatCurrency(totals.remaining, true)}
                    </td>
                    <td className="px-4 py-3 border-b border-border text-right tabular-nums">
                      {formatPercent(weightedPercentSpent)}
                    </td>
                    <td className="px-4 py-3 border-b border-border"></td>
                    <td className="px-4 py-3 border-b border-border"></td>
                  </tr>
                );
              })()
            )}

            {/* Bulk Add Rows */}
            {bulkAddMode && bulkRows.map((row, index) => (
              <tr key={`bulk-${index}`} className="bg-emerald-50 border-l-4 border-l-emerald-500">
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="text"
                    value={row.category_name}
                    onChange={(e) => updateBulkRow(index, 'category_name', e.target.value)}
                    placeholder={`Category ${index + 1}...`}
                    className="w-full px-2 py-1 border border-input rounded focus:ring-2 focus:ring-emerald-500"
                    autoFocus={index === 0}
                  />
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.original_amount}
                    onChange={(e) => updateBulkRow(index, 'original_amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2 py-1 text-right border border-input rounded focus:ring-2 focus:ring-emerald-500"
                  />
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.revised_amount}
                    onChange={(e) => updateBulkRow(index, 'revised_amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2 py-1 text-right border border-input rounded focus:ring-2 focus:ring-emerald-500"
                  />
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.actual_spend}
                    onChange={(e) => updateBulkRow(index, 'actual_spend', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2 py-1 text-right border border-input rounded focus:ring-2 focus:ring-emerald-500"
                  />
                </td>
                <td className="px-4 py-2 border-b border-border">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.committed_costs}
                    onChange={(e) => updateBulkRow(index, 'committed_costs', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2 py-1 text-right border border-input rounded focus:ring-2 focus:ring-emerald-500"
                  />
                </td>
                <td className="px-4 py-2 border-b border-border text-muted-foreground text-center">-</td>
                <td className="px-4 py-2 border-b border-border text-muted-foreground text-center">-</td>
                <td className="px-4 py-2 border-b border-border text-muted-foreground text-center">-</td>
                <td className="px-4 py-2 border-b border-border text-muted-foreground text-center text-xs">New</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Add Controls */}
      {bulkAddMode && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-emerald-700">
              <strong>{bulkRows.filter(r => r.category_name.trim()).length}</strong> of {bulkRows.length} rows filled
            </span>
            <button
              onClick={() => addMoreBulkRows(5)}
              className="text-sm text-emerald-600 hover:text-emerald-800 underline"
            >
              + Add 5 more rows
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={cancelBulkAdd}
              disabled={bulkSaving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={saveBulkRows}
              disabled={bulkSaving || !bulkRows.some(r => r.category_name.trim() && r.original_amount.trim())}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {bulkSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save All
                </>
              )}
            </button>
          </div>
        </div>
      )}

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

      {/* Paste from Excel Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-purple-600" />
                    Paste from Excel
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Copy rows from Excel and paste below. Format: Category, Original Amount (tab or comma separated)
                  </p>
                </div>
                <button
                  onClick={closePasteModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {/* Paste Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste your data here:
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => handlePasteChange(e.target.value)}
                  placeholder={`Example:\nDumpster\t1000\nDemo / Cleanup\t6000\t1500\nFloor Prep\t8538\t1200`}
                  className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Columns: Category (required), Original Amount (required), Revised Amount, Actual Spend, Committed Costs
                </p>
              </div>

              {/* Parse Error */}
              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <strong>Error:</strong> {parseError}
                </div>
              )}

              {/* Preview */}
              {parsedRows.length > 0 && !parseError && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview ({parsedRows.length} items):
                  </label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Category</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Original</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Revised</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Actual</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Committed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedRows.map((row, i) => {
                          const formatAmount = (val: string) => {
                            const num = parseFloat(val || '0');
                            if (num === 0) return '-';
                            return num.toLocaleString('en-US', { 
                              style: 'currency', 
                              currency: 'USD',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            });
                          };
                          return (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{row.category_name}</td>
                              <td className="px-3 py-2 text-right">{formatAmount(row.original_amount)}</td>
                              <td className="px-3 py-2 text-right text-gray-500">{formatAmount(row.revised_amount)}</td>
                              <td className="px-3 py-2 text-right text-gray-500">{formatAmount(row.actual_spend)}</td>
                              <td className="px-3 py-2 text-right text-gray-500">{formatAmount(row.committed_costs)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={closePasteModal}
                disabled={bulkSaving}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={importParsedRows}
                disabled={bulkSaving || parsedRows.length === 0 || !!parseError}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {bulkSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Import {parsedRows.length} Items
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

