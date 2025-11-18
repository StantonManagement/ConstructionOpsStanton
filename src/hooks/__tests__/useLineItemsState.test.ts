import { renderHook, act } from '@testing-library/react';
import { useLineItemsState, LineItem } from '../useLineItemsState';

describe('useLineItemsState', () => {
  describe('Initial State', () => {
    it('should initialize with empty items array', () => {
      const { result } = renderHook(() => useLineItemsState());
      expect(result.current.items).toEqual([]);
    });

    it('should initialize with provided items', () => {
      const initialItems: LineItem[] = [
        {
          id: '1',
          itemNo: 1,
          description: 'Test Item',
          scheduledValue: '1000',
          fromPrevious: '0.00',
          thisPeriod: '0.00',
          materialStored: '0.00',
          percentGC: '0.00',
        },
      ];
      const { result } = renderHook(() => useLineItemsState(initialItems));
      expect(result.current.items).toEqual(initialItems);
    });

    it('should initialize 5 empty rows when requested', () => {
      const { result } = renderHook(() => useLineItemsState());
      
      act(() => {
        result.current.initializeEmptyRows(5);
      });

      expect(result.current.items).toHaveLength(5);
      expect(result.current.items[0].itemNo).toBe(1);
      expect(result.current.items[4].itemNo).toBe(5);
    });
  });

  describe('Auto-numbering', () => {
    it('should auto-increment Item No when adding items', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
      });
      
      act(() => {
        result.current.addItem();
      });
      
      act(() => {
        result.current.addItem();
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[0].itemNo).toBe(1);
      expect(result.current.items[1].itemNo).toBe(2);
      expect(result.current.items[2].itemNo).toBe(3);
    });

    it('should renumber items after deletion', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem(); // Item 1
        result.current.addItem(); // Item 2
        result.current.addItem(); // Item 3
        result.current.addItem(); // Item 4
      });

      const idToDelete = result.current.items[1].id; // Delete item 2

      act(() => {
        result.current.deleteItems([idToDelete]);
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[0].itemNo).toBe(1);
      expect(result.current.items[1].itemNo).toBe(2); // Was 3, now 2
      expect(result.current.items[2].itemNo).toBe(3); // Was 4, now 3
    });

    it('should renumber items after reordering', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
        result.current.addItem();
        result.current.addItem();
      });

      act(() => {
        result.current.reorderItem(2, 0); // Move last item to first
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[0].itemNo).toBe(1);
      expect(result.current.items[1].itemNo).toBe(2);
      expect(result.current.items[2].itemNo).toBe(3);
    });
  });

  describe('CRUD Operations', () => {
    it('should add a new item', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toMatchObject({
        itemNo: 1,
        description: '',
        scheduledValue: '',
        fromPrevious: '0.00',
        thisPeriod: '0.00',
        materialStored: '0.00',
        percentGC: '0.00',
      });
    });

    it('should update an item field', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
      });

      const itemId = result.current.items[0].id;

      act(() => {
        result.current.updateItem(itemId, 'description', 'New Description');
        result.current.updateItem(itemId, 'scheduledValue', '5000');
      });

      expect(result.current.items[0].description).toBe('New Description');
      expect(result.current.items[0].scheduledValue).toBe('5000');
    });

    it('should delete multiple items', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
        result.current.addItem();
        result.current.addItem();
        result.current.addItem();
      });

      const idsToDelete = [
        result.current.items[1].id,
        result.current.items[3].id,
      ];

      act(() => {
        result.current.deleteItems(idsToDelete);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].itemNo).toBe(1);
      expect(result.current.items[1].itemNo).toBe(2);
    });

    it('should reorder items correctly', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[0].id, 'description', 'First');
      });
      
      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[1].id, 'description', 'Second');
      });
      
      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[2].id, 'description', 'Third');
      });

      act(() => {
        result.current.reorderItem(0, 2); // Move first to last
      });

      expect(result.current.items[0].description).toBe('Second');
      expect(result.current.items[1].description).toBe('Third');
      expect(result.current.items[2].description).toBe('First');
    });
  });

  describe('Undo Functionality', () => {
    it('should undo an edit', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
      });

      let itemId = result.current.items[0].id;

      act(() => {
        result.current.updateItem(itemId, 'description', 'Original');
      });

      itemId = result.current.items[0].id; // Re-get ID after state update

      act(() => {
        result.current.updateItem(itemId, 'description', 'Changed');
      });

      expect(result.current.items[0].description).toBe('Changed');

      act(() => {
        result.current.undo();
      });

      expect(result.current.items[0].description).toBe('Original');
    });

    it('should undo a delete', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
        result.current.addItem();
        result.current.addItem();
      });

      expect(result.current.items).toHaveLength(3);

      const idToDelete = result.current.items[1].id;

      act(() => {
        result.current.deleteItems([idToDelete]);
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.undo();
      });

      expect(result.current.items).toHaveLength(3);
    });

    it('should undo a reorder', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[0].id, 'description', 'First');
      });
      
      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[1].id, 'description', 'Second');
      });

      act(() => {
        result.current.reorderItem(0, 1);
      });

      expect(result.current.items[0].description).toBe('Second');

      act(() => {
        result.current.undo();
      });

      expect(result.current.items[0].description).toBe('First');
    });

    it('should indicate when undo is available', () => {
      const { result } = renderHook(() => useLineItemsState());

      expect(result.current.canUndo).toBe(false);

      act(() => {
        result.current.addItem();
      });
      
      act(() => {
        result.current.updateItem(result.current.items[0].id, 'description', 'Test');
      });

      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('Computed Values', () => {
    it('should calculate total scheduled value', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[0].id, 'scheduledValue', '1000');
      });
      
      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[1].id, 'scheduledValue', '2500.50');
      });
      
      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[2].id, 'scheduledValue', '750.25');
      });

      expect(result.current.totalScheduledValue).toBeCloseTo(4250.75, 2);
    });

    it('should detect empty rows', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[0].id, 'description', 'Complete');
      });
      act(() => {
        result.current.updateItem(result.current.items[0].id, 'scheduledValue', '1000');
      });

      expect(result.current.hasEmptyRows).toBe(false);

      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[1].id, 'description', 'Partial');
        // scheduledValue is empty - this is a partial row
      });

      expect(result.current.hasEmptyRows).toBe(true);
    });

    it('should identify empty row IDs', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[0].id, 'description', 'Good');
      });
      act(() => {
        result.current.updateItem(result.current.items[0].id, 'scheduledValue', '1000');
      });
      
      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[1].id, 'description', 'Bad - no value');
      });
      
      act(() => {
        result.current.addItem();
      });
      act(() => {
        result.current.updateItem(result.current.items[2].id, 'scheduledValue', '500');
        // Bad - no description
      });

      expect(result.current.emptyRowIds).toHaveLength(2);
      expect(result.current.emptyRowIds).toContain(result.current.items[1].id);
      expect(result.current.emptyRowIds).toContain(result.current.items[2].id);
    });

    it('should filter items with data', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.initializeEmptyRows(5);
      });
      
      act(() => {
        result.current.updateItem(result.current.items[0].id, 'description', 'Has Data');
      });
      
      act(() => {
        result.current.updateItem(result.current.items[2].id, 'scheduledValue', '1000');
      });

      expect(result.current.itemsWithData).toHaveLength(2);
      expect(result.current.itemsWithData[0].description).toBe('Has Data');
      expect(result.current.itemsWithData[1].scheduledValue).toBe('1000');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values correctly', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
      });
      
      act(() => {
        result.current.updateItem(result.current.items[0].id, 'scheduledValue', '');
      });

      expect(result.current.totalScheduledValue).toBe(0);
    });

    it('should handle invalid number strings', () => {
      const { result } = renderHook(() => useLineItemsState());

      act(() => {
        result.current.addItem();
      });
      
      act(() => {
        result.current.updateItem(result.current.items[0].id, 'scheduledValue', 'abc');
      });

      expect(result.current.totalScheduledValue).toBe(0);
    });

    it('should handle setting all items at once', () => {
      const { result } = renderHook(() => useLineItemsState());

      const newItems: LineItem[] = [
        {
          id: 'a',
          itemNo: 5, // Wrong number
          description: 'Item 1',
          scheduledValue: '100',
          fromPrevious: '0',
          thisPeriod: '0',
          materialStored: '0',
          percentGC: '0',
        },
        {
          id: 'b',
          itemNo: 10, // Wrong number
          description: 'Item 2',
          scheduledValue: '200',
          fromPrevious: '0',
          thisPeriod: '0',
          materialStored: '0',
          percentGC: '0',
        },
      ];

      act(() => {
        result.current.setAllItems(newItems);
      });

      // Should renumber to 1 and 2
      expect(result.current.items[0].itemNo).toBe(1);
      expect(result.current.items[1].itemNo).toBe(2);
      expect(result.current.items[0].description).toBe('Item 1');
      expect(result.current.items[1].description).toBe('Item 2');
    });
  });
});

