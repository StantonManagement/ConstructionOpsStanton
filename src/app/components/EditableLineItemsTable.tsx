import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Trash2 } from 'lucide-react';
import { LineItem } from '@/hooks/useLineItemsState';

interface EditableLineItemsTableProps {
  items: LineItem[];
  contractAmount: number;
  onUpdate: (id: string, field: keyof Omit<LineItem, 'id' | 'itemNo'>, value: string) => void;
  onDelete: (ids: string[]) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAdd: () => void;
  isEditable: boolean;
  maxItems?: number;
  emptyRowIds: string[];
  onMaxItemsReached?: () => void;
}

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onSave: () => void;
  placeholder?: string;
  type?: 'text' | 'number';
  disabled?: boolean;
  isError?: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onChange,
  onNavigate,
  onSave,
  placeholder,
  type = 'text',
  disabled = false,
  isError = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    if (editValue !== value) {
      onChange(editValue);
      onSave();
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (editValue !== value) {
          onChange(editValue);
        }
        onSave();
        setIsEditing(false);
        onNavigate('down');
        break;
      case 'Tab':
        e.preventDefault();
        if (editValue !== value) {
          onChange(editValue);
        }
        onSave();
        setIsEditing(false);
        onNavigate(e.shiftKey ? 'left' : 'right');
        break;
      case 'Escape':
        e.preventDefault();
        setEditValue(value);
        setIsEditing(false);
        break;
      case 'ArrowUp':
        if (!isEditing) {
          e.preventDefault();
          onNavigate('up');
        }
        break;
      case 'ArrowDown':
        if (!isEditing) {
          e.preventDefault();
          onNavigate('down');
        }
        break;
    }
  };

  if (disabled) {
    return (
      <div className="px-3 py-2 text-sm text-gray-400 bg-gray-50">
        {value || placeholder}
      </div>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full px-3 py-2 text-sm border-2 border-blue-500 focus:outline-none ${
          isError ? 'bg-red-50' : 'bg-white'
        }`}
        placeholder={placeholder}
        step={type === 'number' ? '0.01' : undefined}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 min-h-[38px] ${
        isError ? 'bg-red-50 border border-red-300' : ''
      }`}
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
    </div>
  );
};

interface SortableRowProps {
  item: LineItem;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onUpdate: (field: keyof Omit<LineItem, 'id' | 'itemNo'>, value: string) => void;
  onDelete: () => void;
  onNavigate: (fromIndex: number, direction: 'up' | 'down' | 'left' | 'right') => void;
  isEditable: boolean;
  isError: boolean;
}

const SortableRow: React.FC<SortableRowProps> = ({
  item,
  index,
  isSelected,
  onToggleSelect,
  onUpdate,
  onDelete,
  onNavigate,
  isEditable,
  isError,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isEditable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={`border-b ${isError ? 'bg-red-50' : ''}`}>
      {isEditable && (
        <td className="px-2 py-1 text-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 cursor-pointer"
          />
        </td>
      )}
      {isEditable && (
        <td className="px-2 py-1 text-center cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="w-5 h-5 text-gray-400" />
        </td>
      )}
      <td className="px-3 py-1 text-center text-sm text-gray-500 bg-gray-50 font-medium">
        {item.itemNo}
      </td>
      <td className="border-l">
        <EditableCell
          value={item.description}
          onChange={(value) => onUpdate('description', value)}
          onNavigate={(dir) => onNavigate(index, dir)}
          onSave={() => {}}
          placeholder="Enter description..."
          disabled={!isEditable}
          isError={isError}
        />
      </td>
      <td className="border-l">
        <EditableCell
          value={item.scheduledValue}
          onChange={(value) => onUpdate('scheduledValue', value)}
          onNavigate={(dir) => onNavigate(index, dir)}
          onSave={() => {}}
          placeholder="0.00"
          type="number"
          disabled={!isEditable}
          isError={isError}
        />
      </td>
      <td className="border-l">
        <div className="px-3 py-2 text-sm text-gray-400 bg-gray-50">
          {item.fromPrevious}
        </div>
      </td>
      <td className="border-l">
        <div className="px-3 py-2 text-sm text-gray-400 bg-gray-50">
          {item.thisPeriod}
        </div>
      </td>
      <td className="border-l">
        <div className="px-3 py-2 text-sm text-gray-400 bg-gray-50">
          {item.materialStored}
        </div>
      </td>
      <td className="border-l">
        <div className="px-3 py-2 text-sm text-gray-400 bg-gray-50">
          {item.percentGC}
        </div>
      </td>
      {isEditable && (
        <td className="px-2 py-1 text-center border-l">
          <button
            onClick={onDelete}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete item"
          >
            <X className="w-4 h-4" />
          </button>
        </td>
      )}
    </tr>
  );
};

export const EditableLineItemsTable: React.FC<EditableLineItemsTableProps> = ({
  items,
  contractAmount,
  onUpdate,
  onDelete,
  onReorder,
  onAdd,
  isEditable,
  maxItems = 15,
  emptyRowIds,
  onMaxItemsReached,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onReorder(oldIndex, newIndex);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length > 0) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = () => {
    onDelete(selectedIds);
    setSelectedIds([]);
    setShowDeleteConfirm(false);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const handleNavigate = (fromIndex: number, direction: 'up' | 'down' | 'left' | 'right') => {
    // Navigation logic would focus on the next cell
    // For now, we'll handle simple up/down navigation
    if (direction === 'down' && fromIndex === items.length - 1) {
      // At last row, add new row if under max
      if (items.length < maxItems) {
        onAdd();
      } else if (onMaxItemsReached) {
        // Show max items message via callback
        onMaxItemsReached();
      }
    }
  };

  const totalScheduledValue = items.reduce((sum, item) => {
    return sum + (parseFloat(item.scheduledValue) || 0);
  }, 0);

  const isMatch = Math.abs(totalScheduledValue - contractAmount) < 0.01;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Running Total Display */}
      <div className={`text-base font-semibold ${isMatch ? 'text-green-600' : 'text-red-600'}`}>
        Total Scheduled Value: {formatCurrency(totalScheduledValue)} of {formatCurrency(contractAmount)} Contract Amount
      </div>

      {/* Bulk Actions */}
      {isEditable && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-900">
            {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  {isEditable && (
                    <th className="px-2 py-2 text-xs font-medium text-gray-600 border-b">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === items.length && items.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                  )}
                  {isEditable && (
                    <th className="px-2 py-2 text-xs font-medium text-gray-600 border-b">
                      {/* Drag handle column */}
                    </th>
                  )}
                  <th className="px-3 py-2 text-xs font-medium text-gray-600 text-center border-b">
                    Item No
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-600 text-left border-b border-l">
                    Description of Work
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-600 text-left border-b border-l">
                    Scheduled Value
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-600 text-left border-b border-l">
                    From Previous
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-600 text-left border-b border-l">
                    This Period
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-600 text-left border-b border-l">
                    Material Stored
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-600 text-left border-b border-l">
                    % G/C
                  </th>
                  {isEditable && (
                    <th className="px-2 py-2 text-xs font-medium text-gray-600 text-center border-b border-l">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((item, index) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      index={index}
                      isSelected={selectedIds.includes(item.id)}
                      onToggleSelect={() => handleToggleSelect(item.id)}
                      onUpdate={(field, value) => onUpdate(item.id, field, value)}
                      onDelete={() => onDelete([item.id])}
                      onNavigate={handleNavigate}
                      isEditable={isEditable}
                      isError={emptyRowIds.includes(item.id)}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>
      </div>

      {/* Empty state or add more button */}
      {isEditable && items.length < maxItems && (
        <button
          onClick={onAdd}
          className="w-full py-2 text-sm text-blue-600 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
        >
          + Add Line Item
        </button>
      )}

      {items.length >= maxItems && (
        <div className="text-sm text-gray-500 text-center">
          Maximum {maxItems} line items reached. Contact admin for more.
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--status-critical-bg)] flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-[var(--status-critical-icon)]" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Delete Line Items</h3>
            </div>
            <div className="bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] rounded-lg p-4 mb-4">
              <p className="text-[var(--status-critical-text)] font-medium">
                Are you sure you want to delete {selectedIds.length} line item{selectedIds.length !== 1 ? 's' : ''}?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg shadow-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
