'use client';

import { useState, useEffect } from 'react';
import { DocumentArrowDownIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useTranslations } from '@/components/providers/TranslationProvider';

interface TimeEntry {
  id: string;
  startTime: Date;
  endTime: Date | null;
  totalSeconds: number;
  isActive: boolean;
  task: {
    id: string;
    title: string;
    description: string | null;
  };
}

interface TimeEntriesClientProps {
  user: {
    id: string;
    role: string;
    timeEntries: TimeEntry[];
  };
}

export default function TimeEntriesClient({ user }: TimeEntriesClientProps) {
  const t = useTranslations('timeEntries');
  const [isExporting, setIsExporting] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDeletingEntry, setIsDeletingEntry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const canDeleteResources = () => {
    return user.role === 'HR' || user.role === 'MANAGER';
  };

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDate = (date: Date) => {
    if (!isClient) return ''; // Return empty string during SSR
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: Date) => {
    if (!isClient) return ''; // Return empty string during SSR
    return new Date(date).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTotalTimeToday = () => {
    const today = new Date().toDateString();
    return user.timeEntries
      .filter((entry: TimeEntry) => new Date(entry.startTime).toDateString() === today)
      .reduce((total: number, entry: TimeEntry) => total + entry.totalSeconds, 0);
  };

  const getTotalTimeThisWeek = () => {
    const today = new Date();
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    return user.timeEntries
      .filter((entry: TimeEntry) => new Date(entry.startTime) >= weekStart)
      .reduce((total: number, entry: TimeEntry) => total + entry.totalSeconds, 0);
  };

  // Filter time entries based on search query
  const filteredTimeEntries = user.timeEntries.filter((entry: TimeEntry) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    
    // Text-based search
    const textMatch = entry.task.title.toLowerCase().includes(query) ||
      (entry.task.description && entry.task.description.toLowerCase().includes(query));
    
    if (textMatch) return true;
    
    // Time-based search
    const startTime = new Date(entry.startTime);
    const endTime = entry.endTime ? new Date(entry.endTime) : null;
    const duration = endTime ? (endTime.getTime() - startTime.getTime()) / (1000 * 60) : 0; // in minutes
    
    // Parse time queries (e.g., "2h", "30min", ">1h", "<45min")
    const timeMatch = (() => {
      const timePattern = /^([><!]?)(\d+(?:\.\d+)?)(h|hours?|m|min|minutes?)$/i;
      
      const match = query.match(timePattern);
      if (!match) return false;
      
      const operator = match[1] || '=';
      const value = parseFloat(match[2]);
      const unit = match[3].toLowerCase();
      
      // Convert to minutes
      let targetMinutes: number;
      if (unit.startsWith('h')) {
        targetMinutes = value * 60;
      } else {
        targetMinutes = value;
      }
      
      // Apply operator
      switch (operator) {
        case '>':
          return duration > targetMinutes;
        case '<':
          return duration < targetMinutes;
        case '!':
          return Math.abs(duration - targetMinutes) > 5; // 5-minute tolerance
        case '=':
        default:
          return Math.abs(duration - targetMinutes) <= 5; // 5-minute tolerance
      }
    })();
    
    if (timeMatch) return true;
    
    // Date-based search
    const dateMatch = (() => {
      const today = new Date();
      const entryDate = new Date(startTime);
      
      // Normalize dates to compare only date parts
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
      
      if (query === 'today') {
        return entryDateOnly.getTime() === todayDate.getTime();
      }
      
      if (query === 'yesterday') {
        const yesterday = new Date(todayDate);
        yesterday.setDate(yesterday.getDate() - 1);
        return entryDateOnly.getTime() === yesterday.getTime();
      }
      
      if (query === 'this week') {
        const weekStart = new Date(todayDate);
        const dayOfWeek = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - dayOfWeek);
        
        return entryDateOnly.getTime() >= weekStart.getTime() && 
               entryDateOnly.getTime() <= todayDate.getTime();
      }
      
      return false;
    })();
    
    return dateMatch;
  });

  const groupFilteredEntriesByDate = () => {
    const groups: { [key: string]: TimeEntry[] } = {};
    filteredTimeEntries.forEach((entry: TimeEntry) => {
      const dateKey = new Date(entry.startTime).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    return groups;
  };

  const handleExportToExcel = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      const url = `/api/export/excel${queryString ? '?' + queryString : ''}`;
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = url;
      link.download = ''; // Filename will be set by the server
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Close date filter after export
      setShowDateFilter(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('failedToExport'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteTimeEntry = async (entryId: string, taskTitle: string, startTime: Date) => {
    if (!canDeleteResources()) {
      alert(t('noPermissionDeleteEntry'));
      return;
    }

    const formattedStartTime = new Date(startTime).toLocaleString();
    const confirmed = confirm(
      `${t('deleteTimeEntryConfirm')}\n\n${t('task')}: ${taskTitle}\n${t('startTime')}: ${formattedStartTime}\n\n${t('deleteUndoWarning')}`
    );

    if (!confirmed) return;

    setIsDeletingEntry(entryId);

    try {
      const response = await fetch(`/api/time-entries/${entryId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete time entry');
      }

      alert(`${t('timeEntryDeleted')} "${taskTitle}" ${t('deletedSuccessfully')}`);
      
      // Refresh the page to show updated time entries list
      window.location.reload();
      
    } catch (error) {
      console.error('Error deleting time entry:', error);
      alert(t('failedToDeleteEntry'));
    } finally {
      setIsDeletingEntry(null);
    }
  };

  const groupedEntries = groupFilteredEntriesByDate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="theme-card rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold theme-text-primary">{t('timeTracking')}</h1>
            <p className="theme-text-secondary mt-2">
              {t('viewTimeEntries')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm theme-text-secondary">
              {searchQuery ? (
                <>
                  {filteredTimeEntries.length} of {user.timeEntries.length} {t('totalEntries')}
                </>
              ) : (
                <>
                  {user.timeEntries.length} {t('totalEntries')}
                </>
              )}
            </div>
            
            {/* Export Button with Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                <span>{t('exportToExcel')}</span>
              </button>

              {/* Date Filter Dropdown */}
              {showDateFilter && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowDateFilter(false)}
                  ></div>
                  <div className="absolute right-0 top-full mt-2 w-80 theme-modal rounded-xl shadow-2xl z-20 p-4" style={{ border: '1px solid var(--card-border)' }}>
                    <h3 className="text-lg font-semibold theme-text-primary mb-4">{t('exportOptions')}</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium theme-text-secondary mb-2">
                          <CalendarIcon className="h-4 w-4 inline mr-2" />
                          {t('dateRange')}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full px-3 py-2 theme-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 theme-text-primary"
                              placeholder={t('startTime')}
                            />
                          </div>
                          <div>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full px-3 py-2 theme-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 theme-text-primary"
                              placeholder={t('endTime')}
                            />
                          </div>
                        </div>
                        <p className="text-xs theme-text-secondary mt-1">
                          {t('leaveEmptyExport')}
                        </p>
                      </div>
                      
                      <div className="flex space-x-3 pt-2">
                        <button
                          onClick={handleExportToExcel}
                          disabled={isExporting}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {isExporting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              <span>{t('exporting')}</span>
                            </>
                          ) : (
                            <>
                              <DocumentArrowDownIcon className="h-4 w-4" />
                              <span>{t('downloadExcel')}</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setShowDateFilter(false)}
                          className="px-4 py-2 theme-input theme-text-primary rounded-lg font-medium theme-hover transition-colors"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="theme-card rounded-xl shadow-sm p-4" style={{ border: '1px solid var(--card-border)' }}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 theme-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchTimeEntriesPlaceholder')}
            className="w-full pl-10 pr-10 py-3 theme-input rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 theme-text-primary placeholder:theme-text-secondary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center theme-text-secondary hover:theme-text-primary transition-colors"
              title={t('clearSearch')}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="theme-card rounded-xl shadow-sm p-6" style={{ border: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="theme-text-secondary text-sm font-medium">{t('today')}</p>
              <p className="text-2xl font-bold theme-text-primary">{formatDuration(getTotalTimeToday())}</p>
            </div>
            <div className="bg-blue-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="theme-card rounded-xl shadow-sm p-6" style={{ border: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="theme-text-secondary text-sm font-medium">{t('thisWeek')}</p>
              <p className="text-2xl font-bold theme-text-primary">{formatDuration(getTotalTimeThisWeek())}</p>
            </div>
            <div className="bg-green-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="theme-card rounded-xl shadow-sm p-6" style={{ border: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="theme-text-secondary text-sm font-medium">{t('totalEntriesToday')}</p>
              <p className="text-2xl font-bold theme-text-primary">{user.timeEntries.length}</p>
            </div>
            <div className="bg-purple-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="theme-card rounded-xl shadow-sm p-6" style={{ border: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="theme-text-secondary text-sm font-medium">{t('totalTime')}</p>
              <p className="text-2xl font-bold theme-text-primary">
                {formatDuration(user.timeEntries.reduce((total: number, entry: TimeEntry) => total + entry.totalSeconds, 0))}
              </p>
            </div>
            <div className="bg-orange-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Time Entries List */}
      <div className="theme-card rounded-xl shadow-sm border">
        <div className="p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <h2 className="text-xl font-semibold theme-text-primary">{t('recentTimeEntries')}</h2>
        </div>
        
        <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
          {Object.entries(groupedEntries).map(([dateString, entries]) => (
            <div key={dateString} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold theme-text-primary">{formatDate(new Date(dateString))}</h3>
                <span className="text-sm theme-text-secondary">
                  {formatDuration(entries.reduce((total: number, entry: TimeEntry) => total + entry.totalSeconds, 0))}
                </span>
              </div>
              
              <div className="space-y-3">
                {entries.map((entry: TimeEntry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 rounded-lg theme-hover transition-colors" style={{ backgroundColor: 'var(--hover-bg)' }}>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <h4 className="font-medium theme-text-primary">{entry.task.title}</h4>
                          {entry.task.description && (
                            <p className="text-sm theme-text-secondary">{entry.task.description}</p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center space-x-2 text-sm theme-text-secondary">
                            <span>{formatDateTime(new Date(entry.startTime))}</span>
                            <span>—</span>
                            <span>
                              {entry.endTime ? formatDateTime(new Date(entry.endTime)) : t('active')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm theme-text-primary">{formatTime(entry.totalSeconds)}</span>
                            {entry.isActive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {t('active')}
                              </span>
                            )}
                            {canDeleteResources() && (
                              <button 
                                onClick={() => handleDeleteTimeEntry(entry.id, entry.task.title, entry.startTime)}
                                disabled={isDeletingEntry === entry.id}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 hover:border-red-300 transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete time entry (HR/Manager only)"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                {isDeletingEntry === entry.id ? '...' : ''}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {user.timeEntries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
            <div className="theme-text-primary font-medium mb-2">{t('noTimeEntriesYet')}</div>
            <div className="text-sm theme-text-secondary">{t('startTrackingMessage')}</div>
          </div>
        ) : Object.keys(groupedEntries).length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="theme-text-primary font-medium mb-2">{t('noSearchResults')}</div>
            <div className="text-sm theme-text-secondary mb-4">Try adjusting your search criteria</div>
            <button 
              onClick={() => setSearchQuery('')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {t('clearSearch')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}