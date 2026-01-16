'use client';

import { CalendarIcon } from '@heroicons/react/24/outline';
import { useTranslations } from '@/components/providers/TranslationProvider';

interface DateRangeFilterProps {
  isVisible: boolean;
  onToggle: () => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onExport: () => void;
  onCancel: () => void;
  isExporting: boolean;
  exportLabel?: string;
}

export function DateRangeFilter({
  isVisible,
  onToggle,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onExport,
  onCancel,
  isExporting,
  exportLabel = 'Export'
}: DateRangeFilterProps) {
  const t = useTranslations('timeEntries');

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        disabled={isExporting}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium theme-text-primary theme-bg-primary hover:theme-bg-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <CalendarIcon className="h-5 w-5 mr-2" />
        {exportLabel}
      </button>
    );
  }

  return (
    <div className="theme-bg-primary border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-lg font-medium theme-text-primary mb-4">{t('exportOptions')}</h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium theme-text-primary mb-1">
              {t('startDate')}:
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="block w-full theme-input rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium theme-text-primary mb-1">
              {t('endDate')}:
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="block w-full theme-input rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
        
        <p className="text-sm theme-text-secondary">
          {t('leaveEmptyExport')}
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium theme-text-secondary border border-gray-300 rounded-md hover:theme-bg-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => {
              console.log('DateRangeFilter export button clicked');
              onExport();
            }}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('exporting')}
              </>
            ) : (
              exportLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}