'use client';

import { useState } from 'react';
import { DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from '@/components/providers/TranslationProvider';

interface ExportModalProps {
  isVisible: boolean;
  onClose: () => void;
  onExport: (startDate?: string, endDate?: string, format?: 'xlsx' | 'pdf') => Promise<void>;
  title?: string;
}

export function ExportModal({ 
  isVisible, 
  onClose, 
  onExport,
  title = 'Export Data'
}: ExportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'all' | 'dateRange'>('all');
  const [format, setFormat] = useState<'xlsx' | 'pdf'>('xlsx');
  const t = useTranslations('dashboard');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportType === 'dateRange') {
        await onExport(startDate, endDate, format);
      } else {
        await onExport(undefined, undefined, format);
      }
      
      // Show success message
      alert('✅ Export completed successfully!');
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      
      // Check if it's a "no data" error
      if (error instanceof Error && error.message.includes('No data found')) {
        alert(`ℹ️ ${error.message}\n\nYou can still open the downloaded file to see the "No Data" message.`);
        onClose(); // Close modal even for "no data" case since file was still downloaded
      } else {
        alert('❌ Export failed. Please try again or check your network connection.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setStartDate('');
      setEndDate('');
      setExportType('all');
      setFormat('xlsx');
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700">Export Format</label>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={(e) => setFormat(e.target.value as 'xlsx' | 'pdf')}
                  disabled={isExporting}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Excel (.xlsx)</div>
                  <div className="text-xs text-gray-500">Export as Excel spreadsheet</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={(e) => setFormat(e.target.value as 'xlsx' | 'pdf')}
                  disabled={isExporting}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">PDF (.pdf)</div>
                  <div className="text-xs text-gray-500">Export as PDF document</div>
                </div>
              </label>
            </div>
          </div>

          {/* Export Type Selection */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700">Export Options</label>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="exportType"
                  value="all"
                  checked={exportType === 'all'}
                  onChange={(e) => setExportType(e.target.value as 'all' | 'dateRange')}
                  disabled={isExporting}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Export All Data</div>
                  <div className="text-xs text-gray-500">Export all available records</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="exportType"
                  value="dateRange"
                  checked={exportType === 'dateRange'}
                  onChange={(e) => setExportType(e.target.value as 'all' | 'dateRange')}
                  disabled={isExporting}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Export by Date Range</div>
                  <div className="text-xs text-gray-500">Export data within a specific date range</div>
                </div>
              </label>
            </div>
          </div>

          {/* Date Range Inputs */}
          {exportType === 'dateRange' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('startDate')}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isExporting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('endDate')}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isExporting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* Export Status */}
          {isExporting && (
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-sm font-medium text-blue-700">
                Preparing your export...
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleExport}
            disabled={isExporting || (exportType === 'dateRange' && (!startDate || !endDate))}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="h-4 w-4" />
                <span>Export to {format === 'xlsx' ? 'Excel' : 'PDF'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}