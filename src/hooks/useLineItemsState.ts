import { useState, useCallback, useMemo } from 'react';

// Generate unique IDs for React keys
const generateId = () => crypto.randomUUID();

export interface LineItem {
  id: string; // UUID for React keys
  itemNo: number;
  description: string;
  scheduledValue: string;
  fromPrevious: string;
  thisPeriod: string;
  materialStored: string;
  percentGC: string;
}

interface LastAction {
  type: 'edit' | 'delete' | 'reorder';
  data: any;
}

export function useLineItemsState(initialItems: LineItem[] = []) {
  const [items, setItems] = useState<LineItem[]>(initialItems);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);

  // Generate 5 empty rows for initial state
  const generateEmptyRows = useCallback((count: number, startItemNo: number = 1): LineItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: generateId(),
      itemNo: startItemNo + i,
      description: '',
      scheduledValue: '',
      fromPrevious: '0.00',
      thisPeriod: '0.00',
      materialStored: '0.00',
      percentGC: '0.00',
    }));
  }, []);

  // Auto-renumber items sequentially from 1
  const renumberItems = useCallback((itemsList: LineItem[]): LineItem[] => {
    return itemsList.map((item, idx) => ({
      ...item,
      itemNo: idx + 1,
    }));
  }, []);

  // Fill gaps in item numbers
  const fillGaps = useCallback((itemsList: LineItem[]): LineItem[] => {
    if (itemsList.length === 0) return itemsList;

    const maxItemNo = Math.max(...itemsList.map(i => i.itemNo));
    const filled: LineItem[] = [];

    for (let i = 1; i <= maxItemNo; i++) {
      const existing = itemsList.find(item => item.itemNo === i);
      if (existing) {
        filled.push(existing);
      } else {
        // Create empty row for gap
        filled.push({
          id: generateId(),
          itemNo: i,
          description: '',
          scheduledValue: '',
          fromPrevious: '0.00',
          thisPeriod: '0.00',
          materialStored: '0.00',
          percentGC: '0.00',
        });
      }
    }

    return filled;
  }, []);

  // Add a new item
  const addItem = useCallback(() => {
    const nextItemNo = items.length > 0 ? Math.max(...items.map(i => i.itemNo)) + 1 : 1;
    const newItem: LineItem = {
      id: generateId(),
      itemNo: nextItemNo,
      description: '',
      scheduledValue: '',
      fromPrevious: '0.00',
      thisPeriod: '0.00',
      materialStored: '0.00',
      percentGC: '0.00',
    };
    
    setItems(prev => [...prev, newItem]);
  }, [items]);

  // Update a specific field of an item
  const updateItem = useCallback((id: string, field: keyof Omit<LineItem, 'id' | 'itemNo'>, value: any) => {
    setItems(prev => {
      const oldItems = [...prev];
      const updated = prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      );
      
      // Store for undo
      setLastAction({
        type: 'edit',
        data: { items: oldItems },
      });
      
      return updated;
    });
  }, []);

  // Delete items by IDs
  const deleteItems = useCallback((ids: string[]) => {
    setItems(prev => {
      // Store for undo
      setLastAction({
        type: 'delete',
        data: { items: [...prev] },
      });
      
      const filtered = prev.filter(item => !ids.includes(item.id));
      return renumberItems(filtered);
    });
  }, [renumberItems]);

  // Reorder an item
  const reorderItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prev => {
      // Store for undo
      setLastAction({
        type: 'reorder',
        data: { items: [...prev] },
      });
      
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      
      return renumberItems(result);
    });
  }, [renumberItems]);

  // Undo last action
  const undo = useCallback(() => {
    if (!lastAction) return;

    switch (lastAction.type) {
      case 'edit':
      case 'delete':
      case 'reorder':
        setItems(lastAction.data.items);
        break;
    }
    
    setLastAction(null);
  }, [lastAction]);

  // Set all items at once (for initial load or CSV import)
  const setAllItems = useCallback((newItems: LineItem[]) => {
    setItems(renumberItems(newItems));
  }, [renumberItems]);

  // Initialize with empty rows if items is empty
  const initializeEmptyRows = useCallback((count: number = 5) => {
    if (items.length === 0) {
      setItems(generateEmptyRows(count));
    }
  }, [items.length, generateEmptyRows]);

  // Computed values
  const totalScheduledValue = useMemo(() => {
    return items.reduce((sum, item) => {
      const value = parseFloat(item.scheduledValue) || 0;
      return sum + value;
    }, 0);
  }, [items]);

  const hasEmptyRows = useMemo(() => {
    return items.some(item => {
      const hasData = item.description.trim() !== '' || item.scheduledValue.trim() !== '';
      const isPartial = (item.description.trim() === '' && item.scheduledValue.trim() !== '') ||
                       (item.description.trim() !== '' && item.scheduledValue.trim() === '');
      return isPartial;
    });
  }, [items]);

  const emptyRowIds = useMemo(() => {
    return items
      .filter(item => {
        const isPartial = (item.description.trim() === '' && item.scheduledValue.trim() !== '') ||
                         (item.description.trim() !== '' && item.scheduledValue.trim() === '');
        return isPartial;
      })
      .map(item => item.id);
  }, [items]);

  // Get items with data (not completely empty)
  const itemsWithData = useMemo(() => {
    return items.filter(item => item.description.trim() !== '' || item.scheduledValue.trim() !== '');
  }, [items]);

  const canUndo = lastAction !== null;

  return {
    items,
    addItem,
    updateItem,
    deleteItems,
    reorderItem,
    undo,
    setAllItems,
    initializeEmptyRows,
    totalScheduledValue,
    hasEmptyRows,
    emptyRowIds,
    itemsWithData,
    canUndo,
  };
}

