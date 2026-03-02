'use client';

import React, { useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { useModal } from '@/context/ModalContext';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Trash2 } from 'lucide-react';
import PageContainer from './PageContainer';

const DataImportTool: React.FC = () => {
  const { showToast } = useModal();
  const [projectsCsvData, setProjectsCsvData] = useState<Record<string, string>[] | null>(null);
  const [contractorsCsvData, setContractorsCsvData] = useState<Record<string, string>[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Parse CSV data
  const parseCSV = (csvText: string): Record<string, string>[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    const data: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let currentValue = '';
      let insideQuotes = false;

      for (let char of lines[i]) {
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());

      if (values.length === headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index].replace(/^"|"$/g, '');
        });
        data.push(row);
      }
    }

    return data;
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'projects' | 'contractors') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const parsedData = parseCSV(csvText);

      if (type === 'projects') {
        setProjectsCsvData(parsedData);
        showToast({ message: `Loaded ${parsedData.length} projects from CSV`, type: 'success' });
      } else {
        setContractorsCsvData(parsedData);
        showToast({ message: `Loaded ${parsedData.length} contractors from CSV`, type: 'success' });
      }
    };
    reader.readAsText(file);
  };

  // Import projects
  const importProjects = async () => {
    if (!projectsCsvData) return;

    setImporting(true);
    try {
      const response = await authFetch('/api/import/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects: projectsCsvData,
          replaceExisting,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.errors?.join(', ') || 'Import failed');
      }

      const result = await response.json();
      showToast({ message: `Successfully imported ${result.imported} projects!`, type: 'success' });
      setProjectsCsvData(null);
    } catch (error) {
      console.error('Import error:', error);
      showToast({
        message: error instanceof Error ? error.message : 'Failed to import projects',
        type: 'error',
      });
    } finally {
      setImporting(false);
    }
  };

  // Import contractors
  const importContractors = async () => {
    if (!contractorsCsvData) return;

    setImporting(true);
    try {
      const response = await authFetch('/api/import/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractors: contractorsCsvData,
          replaceExisting,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.errors?.join(', ') || 'Import failed');
      }

      const result = await response.json();
      showToast({ message: `Successfully imported ${result.imported} contractors!`, type: 'success' });
      setContractorsCsvData(null);
    } catch (error) {
      console.error('Import error:', error);
      showToast({
        message: error instanceof Error ? error.message : 'Failed to import contractors',
        type: 'error',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Data Import Tool</h1>
          <p className="text-muted-foreground">
            Import your real project and contractor data from CSV files
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Before You Start
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-900">
            <li>Download the template CSV files from the <code className="bg-blue-100 px-2 py-1 rounded">data-import</code> folder</li>
            <li>Fill in your real project and contractor information</li>
            <li>Save the completed CSV files</li>
            <li>Upload them below to import</li>
            <li>Review the preview before confirming</li>
          </ol>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <a
              href="/data-import/IMPORT_INSTRUCTIONS.md"
              target="_blank"
              className="text-sm text-blue-700 hover:text-blue-900 underline flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View detailed import instructions
            </a>
          </div>
        </div>

        {/* Replace Existing Option */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="w-5 h-5"
            />
            <div>
              <div className="font-semibold text-yellow-900">Replace all existing data</div>
              <div className="text-sm text-yellow-800">
                WARNING: This will delete all current projects/contractors before importing.
                Use this for a fresh start.
              </div>
            </div>
          </label>
        </div>

        {/* Projects Import */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Projects
          </h2>

          {!projectsCsvData ? (
            <div>
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-all">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">Click to upload projects CSV</p>
                  <p className="text-sm text-muted-foreground">or drag and drop</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e, 'projects')}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{projectsCsvData.length} projects loaded</span>
                </div>
                <button
                  onClick={() => setProjectsCsvData(null)}
                  className="text-sm text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>

              {/* Preview */}
              <div className="bg-muted rounded-lg p-4 mb-4 max-h-60 overflow-auto">
                <h3 className="text-sm font-semibold text-foreground mb-2">Preview:</h3>
                <div className="text-xs space-y-1">
                  {projectsCsvData.slice(0, 5).map((proj, i) => (
                    <div key={i} className="text-muted-foreground">
                      {i + 1}. {proj.project_name} - {proj.client_name} (${proj.budget})
                    </div>
                  ))}
                  {projectsCsvData.length > 5 && (
                    <div className="text-muted-foreground italic">
                      ... and {projectsCsvData.length - 5} more
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={importProjects}
                disabled={importing}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Import {projectsCsvData.length} Projects
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Contractors Import */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Contractors
          </h2>

          {!contractorsCsvData ? (
            <div>
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-all">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">Click to upload contractors CSV</p>
                  <p className="text-sm text-muted-foreground">or drag and drop</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e, 'contractors')}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{contractorsCsvData.length} contractors loaded</span>
                </div>
                <button
                  onClick={() => setContractorsCsvData(null)}
                  className="text-sm text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>

              {/* Preview */}
              <div className="bg-muted rounded-lg p-4 mb-4 max-h-60 overflow-auto">
                <h3 className="text-sm font-semibold text-foreground mb-2">Preview:</h3>
                <div className="text-xs space-y-1">
                  {contractorsCsvData.slice(0, 5).map((contractor, i) => (
                    <div key={i} className="text-muted-foreground">
                      {i + 1}. {contractor.contractor_name} - {contractor.trade} ({contractor.phone})
                    </div>
                  ))}
                  {contractorsCsvData.length > 5 && (
                    <div className="text-muted-foreground italic">
                      ... and {contractorsCsvData.length - 5} more
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={importContractors}
                disabled={importing}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Import {contractorsCsvData.length} Contractors
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default DataImportTool;
