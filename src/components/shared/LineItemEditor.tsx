import React, { useRef } from 'react';
import Papa from 'papaparse';

export type LineItem = {
  itemNo: string;
  description: string;
  scheduledValue: string;
  fromPrevious: string;
  thisPeriod: string;
  materialStored: string;
  percentGC: string;
};

type Props = {
  lineItems: LineItem[];
  setLineItems: (items: LineItem[]) => void;
};

const headers = [
  'item no',
  'description of work',
  'scheduled value',
  'from previous application',
  'this period',
  'material presently stored',
  '%G/C',
];

const LineItemEditor: React.FC<Props> = ({ lineItems, setLineItems }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (idx: number, field: keyof LineItem, value: string) => {
    const updated = [...lineItems];
    updated[idx][field] = value;
    setLineItems(updated);
  };

  const handleAddRow = () => {
    setLineItems([
      ...lineItems,
      {
        itemNo: '',
        description: '',
        scheduledValue: '',
        fromPrevious: '',
        thisPeriod: '',
        materialStored: '',
        percentGC: '',
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    const updated = [...lineItems];
    updated.splice(idx, 1);
    setLineItems(updated);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: LineItem[] = (results.data as any[]).map((row) => ({
          itemNo: row['item no'] || '',
          description: row['description of work'] || '',
          scheduledValue: row['scheduled value'] || '',
          fromPrevious: row['from previous application'] || '',
          thisPeriod: row['this period'] || '',
          materialStored: row['material presently stored'] || '',
          percentGC: row['%G/C'] || '',
        }));
        setLineItems(parsed);
      },
    });
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleAddRow}
        >
          + Add Line Item
        </button>
        <button
          type="button"
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={() => fileInputRef.current?.click()}
        >
          Import CSV
        </button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleCSVImport}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1">Item No</th>
              <th className="border px-2 py-1">Description of Work</th>
              <th className="border px-2 py-1">Scheduled Value</th>
              <th className="border px-2 py-1">From Previous Application</th>
              <th className="border px-2 py-1">This Period</th>
              <th className="border px-2 py-1">Material Presently Stored</th>
              <th className="border px-2 py-1">%G/C</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr key={idx}>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    value={item.itemNo}
                    onChange={(e) => handleInputChange(idx, 'itemNo', e.target.value)}
                    className="w-20 border rounded px-1"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleInputChange(idx, 'description', e.target.value)}
                    className="w-40 border rounded px-1"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    value={item.scheduledValue}
                    onChange={(e) => handleInputChange(idx, 'scheduledValue', e.target.value)}
                    className="w-24 border rounded px-1"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    value={item.fromPrevious}
                    onChange={(e) => handleInputChange(idx, 'fromPrevious', e.target.value)}
                    className="w-24 border rounded px-1"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    value={item.thisPeriod}
                    onChange={(e) => handleInputChange(idx, 'thisPeriod', e.target.value)}
                    className="w-24 border rounded px-1"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    value={item.materialStored}
                    onChange={(e) => handleInputChange(idx, 'materialStored', e.target.value)}
                    className="w-24 border rounded px-1"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    value={item.percentGC}
                    onChange={(e) => handleInputChange(idx, 'percentGC', e.target.value)}
                    className="w-16 border rounded px-1"
                  />
                </td>
                <td className="border px-2 py-1 text-center">
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => handleRemoveRow(idx)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {lineItems.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-black-500 py-2">No line items. Add or import to begin.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LineItemEditor; 