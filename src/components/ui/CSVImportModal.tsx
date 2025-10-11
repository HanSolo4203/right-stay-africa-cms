'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle, X, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  skipped: number;
  duplicates?: number;
  total?: number;
  message?: string;
}

interface CSVAnalysis {
  totalHeaders: number;
  headers: string[];
  detectedMappings: Array<{ field: string; csvColumn: string; required: boolean }>;
  missingMappings: Array<{ field: string; required: boolean; suggestions: string[] }>;
  missingRequiredFields: Array<{ field: string; required: boolean; suggestions: string[] }>;
  sampleData: { [key: string]: string };
  rowCount: number;
}

export default function CSVImportModal({ open, onOpenChange, onImportComplete }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [analysis, setAnalysis] = useState<CSVAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a valid CSV file');
        return;
      }
      setFile(selectedFile);
      setResult(null);
      
      // Analyze CSV automatically
      await analyzeCSV(selectedFile);
    }
  };

  const analyzeCSV = async (fileToAnalyze: File) => {
    setAnalyzing(true);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', fileToAnalyze);

      const response = await fetch('/api/bookings/analyze-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
        
        // Show warnings if missing required fields
        if (data.analysis.missingRequiredFields.length > 0) {
          toast.error(`Missing required columns: ${data.analysis.missingRequiredFields.map((f: { field: string }) => f.field).join(', ')}`);
        } else {
          toast.success(`CSV analyzed: ${data.analysis.rowCount} rows detected`);
        }
      } else {
        toast.error('Failed to analyze CSV structure');
      }
    } catch (error) {
      console.error('Error analyzing CSV:', error);
      toast.error('Failed to analyze CSV file');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(30);

      const response = await fetch('/api/bookings/import', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      const data = await response.json();

      setProgress(100);

      if (data.success) {
        setResult({
          success: true,
          imported: data.imported || 0,
          errors: data.errors || [],
          skipped: data.skipped || 0,
          duplicates: data.duplicates || 0,
          total: data.total || 0,
          message: data.message,
        });
        
        const duplicateMsg = data.duplicates ? ` (${data.duplicates} duplicates skipped)` : '';
        toast.success(`Successfully imported ${data.imported} new bookings${duplicateMsg}`);
        
        // Wait a moment then close and refresh
        setTimeout(() => {
          onImportComplete();
          handleClose();
        }, 2000);
      } else {
        setResult({
          success: false,
          imported: 0,
          errors: [data.error || 'Unknown error occurred'],
          skipped: 0,
        });
        toast.error(data.error || 'Failed to import CSV');
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setResult({
        success: false,
        imported: 0,
        errors: ['Failed to upload file. Please try again.'],
        skipped: 0,
      });
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setProgress(0);
    setResult(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/booking-import-template.csv';
    link.download = 'booking-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template downloaded');
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Bookings from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file containing booking data. The file should include columns for property ID, guest details, dates, and financial information.
          </DialogDescription>
        </DialogHeader>

        {/* Download Template Button */}
        <div className="flex justify-end -mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-3 w-3 mr-1" />
            Download Template
          </Button>
        </div>

        <div className="space-y-4 py-4">
          {/* File Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                {file ? 'Change File' : 'Select CSV File'}
              </Button>
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024).toFixed(2)} KB)
                  </span>
                  {analyzing && <span className="text-xs text-blue-600">Analyzing...</span>}
                </div>
                {!uploading && !analyzing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* CSV Analysis Results */}
          {analysis && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-md">
                <h4 className="font-medium text-sm mb-2">CSV Analysis</h4>
                <div className="text-xs space-y-1">
                  <p>• Total Rows: {analysis.rowCount}</p>
                  <p>• Total Columns: {analysis.totalHeaders}</p>
                  <p>• Detected Fields: {analysis.detectedMappings.length}</p>
                </div>
              </div>

              {analysis.detectedMappings.length > 0 && (
                <div className="p-3 bg-green-50 rounded-md">
                  <h4 className="font-medium text-sm text-green-800 mb-2">✓ Detected Columns</h4>
                  <div className="text-xs space-y-1">
                    {analysis.detectedMappings.map((mapping, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-gray-600">{mapping.field}:</span>
                        <code className="bg-white px-2 py-0.5 rounded text-green-700">{mapping.csvColumn}</code>
                        {mapping.required && <span className="text-xs text-green-600">(required)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.missingRequiredFields.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Missing Required Fields:</strong>
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      {analysis.missingRequiredFields.map((missing, idx) => (
                        <li key={idx}>
                          <strong>{missing.field}</strong> - Expected column names: {missing.suggestions.slice(0, 3).join(', ')}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2">Please update your CSV column names or edit the mapping configuration.</p>
                  </AlertDescription>
                </Alert>
              )}

              {analysis.missingMappings.filter(m => !m.required).length > 0 && (
                <details className="p-3 bg-yellow-50 rounded-md cursor-pointer">
                  <summary className="font-medium text-sm text-yellow-800">
                    ⚠ Optional Fields Not Detected ({analysis.missingMappings.filter(m => !m.required).length})
                  </summary>
                  <div className="text-xs space-y-1 mt-2">
                    {analysis.missingMappings.filter(m => !m.required).map((missing, idx) => (
                      <div key={idx} className="text-gray-600">
                        • {missing.field} (optional)
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Expected Format Info */}
          <Alert>
            <AlertDescription className="text-xs">
              <strong>Required CSV Columns:</strong>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li><code>property_id</code> or <code>uplisting_id</code> - Property identifier</li>
                <li><code>guest_name</code> - Guest information</li>
                <li><code>check_in_date</code>, <code>check_out_date</code> - Dates (YYYY-MM-DD)</li>
                <li><code>accommodation_total</code> - Base accommodation cost</li>
              </ul>
              <strong className="block mt-2">Optional Columns:</strong>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li><code>booking_reference</code> - Auto-generated if missing (for Uplisting/Direct)</li>
                <li><code>channel_name</code> - Airbnb, Booking.com, Uplisting, Direct, etc.</li>
                <li><code>cleaning_fee</code>, <code>commission_tax</code>, etc. - Financial details</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Label>Upload Progress</Label>
              <Progress value={progress} />
              <p className="text-xs text-gray-500 text-center">
                {progress < 30 && 'Uploading file...'}
                {progress >= 30 && progress < 70 && 'Processing bookings...'}
                {progress >= 70 && 'Finalizing import...'}
              </p>
            </div>
          )}

          {/* Import Results */}
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    {result.success ? (
                      <div className="space-y-2">
                        <p className="font-medium">Import Successful!</p>
                        <div className="text-sm space-y-1">
                          {result.total && result.total > 0 && (
                            <p className="text-gray-600">📊 Total CSV rows: {result.total}</p>
                          )}
                          <p className="text-green-600">✓ New bookings imported: {result.imported}</p>
                          {result.duplicates !== undefined && result.duplicates > 0 && (
                            <p className="text-blue-600">🔄 Duplicates skipped: {result.duplicates}</p>
                          )}
                          {result.skipped > 0 && (
                            <p className="text-yellow-600">⚠ Invalid rows: {result.skipped}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-medium">Import Failed</p>
                        <div className="text-sm space-y-1">
                          {result.errors.map((error, index) => (
                            <p key={index}>• {error}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            {result?.success ? 'Close' : 'Cancel'}
          </Button>
          {!result?.success && (
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading || (analysis?.missingRequiredFields.length ?? 0) > 0}
          >
            {uploading ? 'Importing...' : 'Import Bookings'}
          </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

