import React, { useState } from 'react';
import { LoanBudgetItem } from '@/types/loan';
import { formatCurrency } from '@/lib/theme';
import { Edit2, Save, X, Plus, Upload } from 'lucide-react';

interface LoanBudgetTableProps {
  items: LoanBudgetItem[];
  isLocked: boolean;
  onSaveItem: (item: Partial<LoanBudgetItem>) => Promise<void>;
  onBulkCreate?: (items: Partial<LoanBudgetItem>[]) => Promise<void>;
}

interface NewBulkRow {
  category_name: string;
  original_budget: string;
}

export const LoanBudgetTable: React.FC<LoanBudgetTableProps> = ({ items, isLocked, onSaveItem, onBulkCreate }) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<LoanBudgetItem>>({});
  const [isAdding, setIsAdding] = useState(false);

  // Paste from Excel states
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState<NewBulkRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const startEdit = (item: LoanBudgetItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!editForm.category_name || (isAdding && !editForm.original_budget)) return;
    
    await onSaveItem(editForm);
    cancelEdit();
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
    return matchCount >= 1;
  };

  // Parse pasted text (tab or comma separated)
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
        parts = line.split(/\s{2,}/);
      }
      if (parts.length < 2) {
        parts = line.split(',');
      }

      // We only strictly need Category and Amount (2 columns)
      if (parts.length < 2) {
        // If single column, maybe just category with 0 amount?
        // Let's enforce at least 2 for now to avoid garbage
        // Or if amount is missing, assume 0
        parts = [line, '0'];
      }

      const categoryName = parts[0].trim();
      
      // Helper to clean amount
      const cleanAmount = (val: string | undefined): string => {
        if (!val) return '0';
        const cleaned = val.trim().replace(/[$,]/g, '');
        if (cleaned === '-' || cleaned === '' || cleaned === '—') return '0';
        const num = parseFloat(cleaned);
        if (isNaN(num)) return '0';
        return cleaned;
      };
      
      const originalAmount = cleanAmount(parts[1]);

      if (!categoryName) {
        const rowNum = skippedHeader ? i : i + 1;
        setParseError(`Row ${rowNum}: Missing category name`);
        return;
      }

      parsed.push({
        category_name: categoryName,
        original_budget: originalAmount
      });
    }

    setParsedRows(parsed);
  };

  const importParsedRows = async () => {
    if (parsedRows.length === 0) return;
    if (isLocked) {
      alert('Budget is locked. Cannot add new items with amounts.');
      return;
    }

    setBulkSaving(true);
    try {
      const itemsToCreate: Partial<LoanBudgetItem>[] = parsedRows.map(row => ({
        category_name: row.category_name,
        original_budget: parseFloat(row.original_budget) || 0
      }));

      if (onBulkCreate) {
        await onBulkCreate(itemsToCreate);
      } else {
        // Fallback loop
        for (const item of itemsToCreate) {
          await onSaveItem(item);
        }
      }

      setShowPasteModal(false);
      setPasteText('');
      setParsedRows([]);
    } catch (e) {
      console.error(e);
      alert('Failed to import items');
    } finally {
      setBulkSaving(false);
    }
  };

  const totals = items.reduce((acc, item) => ({
    original: acc.original + Number(item.original_budget),
    cos: acc.cos + Number(item.approved_change_orders),
    revised: acc.revised + Number(item.revised_budget),
    drawn: acc.drawn + Number(item.drawn_amount),
    remaining: acc.remaining + Number(item.remaining_amount)
  }), { original: 0, cos: 0, revised: 0, drawn: 0, remaining: 0 });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 className="font-bold text-gray-900">Budget Line Items</h3>
        <div className="flex gap-2">
          {!isAdding && !editingId && !isLocked && (
            <>
              <button 
                onClick={() => setShowPasteModal(true)}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200"
              >
                <Upload className="w-4 h-4" />
                Paste from Excel
              </button>
              <button 
                onClick={() => { setIsAdding(true); setEditForm({ original_budget: 0, approved_change_orders: 0 }); }}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 bg-primary/10 px-3 py-1.5 rounded-lg border border-blue-200"
              >
                <Plus className="w-4 h-4" />
                Add Line Item
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Original</th>
              <th className="px-4 py-3 text-right">COs</th>
              <th className="px-4 py-3 text-right">Revised</th>
              <th className="px-4 py-3 text-right">Drawn</th>
              <th className="px-4 py-3 text-right">Remaining</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                {editingId === item.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input 
                        className="w-full border rounded px-2 py-1"
                        value={editForm.category_name}
                        onChange={e => setEditForm({...editForm, category_name: e.target.value})}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {isLocked ? (
                        <span className="text-gray-400">{formatCurrency(editForm.original_budget || 0)}</span>
                      ) : (
                        <input 
                          type="number"
                          className="w-24 border rounded px-2 py-1 text-right"
                          value={editForm.original_budget}
                          onChange={e => setEditForm({...editForm, original_budget: Number(e.target.value)})}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="text-gray-400">{formatCurrency(editForm.approved_change_orders || 0)}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-400">
                      {/* Revised is computed */}
                      -
                    </td>
                    <td className="px-4 py-2 text-right text-gray-400">-</td>
                    <td className="px-4 py-2 text-right text-gray-400">-</td>
                    <td className="px-4 py-2 flex justify-center gap-2">
                      <button onClick={handleSave} className="text-green-600"><Save className="w-4 h-4" /></button>
                      <button onClick={cancelEdit} className="text-gray-500"><X className="w-4 h-4" /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.category_name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.original_budget)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.approved_change_orders)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.revised_budget)}</td>
                    <td className="px-4 py-3 text-right text-primary">{formatCurrency(item.drawn_amount)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(item.remaining_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-primary">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {isAdding && (
              <tr className="bg-primary/10">
                <td className="px-4 py-2">
                  <input 
                    placeholder="New Category"
                    className="w-full border rounded px-2 py-1"
                    value={editForm.category_name || ''}
                    onChange={e => setEditForm({...editForm, category_name: e.target.value})}
                    autoFocus
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input 
                    type="number"
                    className="w-24 border rounded px-2 py-1 text-right"
                    value={editForm.original_budget || 0}
                    onChange={e => setEditForm({...editForm, original_budget: Number(e.target.value)})}
                  />
                </td>
                <td colSpan={4}></td>
                <td className="px-4 py-2 flex justify-center gap-2">
                  <button onClick={handleSave} className="text-green-600"><Save className="w-4 h-4" /></button>
                  <button onClick={cancelEdit} className="text-gray-500"><X className="w-4 h-4" /></button>
                </td>
              </tr>
            )}

            {/* Totals Row */}
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-200">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totals.original)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totals.cos)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totals.revised)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totals.drawn)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totals.remaining)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-purple-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-purple-600" />
                  Paste from Excel
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Format: Category, Original Amount
                </p>
              </div>
              <button onClick={() => setShowPasteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <textarea
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); parsePastedText(e.target.value); }}
                placeholder={`Example:\nHard Costs\t450000\nSoft Costs\t25000`}
                className="w-full h-40 px-3 py-2 border rounded-lg font-mono text-sm"
                autoFocus
              />
              
              {parseError && <div className="bg-red-50 text-red-700 p-3 rounded">{parseError}</div>}
              
              {parsedRows.length > 0 && (
                <div className="border rounded max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-right">Original</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{row.category_name}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(parseFloat(row.original_budget))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowPasteModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button 
                onClick={importParsedRows}
                disabled={bulkSaving || parsedRows.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {bulkSaving ? 'Importing...' : `Import ${parsedRows.length} Items`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

