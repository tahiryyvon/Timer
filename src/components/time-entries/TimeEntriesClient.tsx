'use client';

import { useState } from 'react';
import { DocumentArrowDownIcon, CalendarIcon } from '@heroicons/react/24/outline';

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
  const [isExporting, setIsExporting] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDeletingEntry, setIsDeletingEntry] = useState<string | null>(null);

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
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: Date) => {
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

  const groupEntriesByDate = () => {
    const groups: { [key: string]: TimeEntry[] } = {};
    user.timeEntries.forEach((entry: TimeEntry) => {
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
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteTimeEntry = async (entryId: string, taskTitle: string, startTime: Date) => {
    if (!canDeleteResources()) {
      alert('You do not have permission to delete time entries. Only HR and Managers can delete time entries.');
      return;
    }

    const formattedStartTime = new Date(startTime).toLocaleString();
    const confirmed = confirm(
      `Are you sure you want to delete this time entry?\n\nTask: ${taskTitle}\nStart Time: ${formattedStartTime}\n\nThis action cannot be undone.`
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

      alert(`Time entry for "${taskTitle}" has been deleted successfully.`);
      
      // Refresh the page to show updated time entries list
      window.location.reload();
      
    } catch (error) {
      console.error('Error deleting time entry:', error);
      alert('Failed to delete time entry. Please try again.');
    } finally {
      setIsDeletingEntry(null);
    }
  };

  const groupedEntries = groupEntriesByDate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Time Tracking</h1>
            <p className="text-gray-600 mt-2">
              View all your time entries and track your productivity.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {user.timeEntries.length} total entries
            </div>
            
            {/* Export Button with Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                <span>Export to Excel</span>
              </button>

              {/* Date Filter Dropdown */}
              {showDateFilter && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowDateFilter(false)}
                  ></div>
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-20 p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <CalendarIcon className="h-4 w-4 inline mr-2" />
                          Date Range (Optional)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                              placeholder="Start date"
                            />
                          </div>
                          <div>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                              placeholder="End date"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Leave empty to export all time entries
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
                              <span>Exporting...</span>
                            </>
                          ) : (
                            <>
                              <DocumentArrowDownIcon className="h-4 w-4" />
                              <span>Download Excel</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setShowDateFilter(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          Cancel
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Today</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(getTotalTimeToday())}</p>
            </div>
            <div className="bg-blue-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(getTotalTimeThisWeek())}</p>
            </div>
            <div className="bg-green-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{user.timeEntries.length}</p>
            </div>
            <div className="bg-purple-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Time</p>
              <p className="text-2xl font-bold text-gray-900">
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Recent Time Entries</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {Object.entries(groupedEntries).map(([dateString, entries]) => (
            <div key={dateString} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{formatDate(new Date(dateString))}</h3>
                <span className="text-sm text-gray-500">
                  {formatDuration(entries.reduce((total: number, entry: TimeEntry) => total + entry.totalSeconds, 0))}
                </span>
              </div>
              
              <div className="space-y-3">
                {entries.map((entry: TimeEntry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{entry.task.title}</h4>
                          {entry.task.description && (
                            <p className="text-sm text-gray-600">{entry.task.description}</p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{formatDateTime(new Date(entry.startTime))}</span>
                            <span>—</span>
                            <span>
                              {entry.endTime ? formatDateTime(new Date(entry.endTime)) : 'Active'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm text-gray-700">{formatTime(entry.totalSeconds)}</span>
                            {entry.isActive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
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
        
        {user.timeEntries.length === 0 && (
          <div className="p-12 text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
            <div className="text-gray-900 font-medium mb-2">No time entries yet</div>
            <div className="text-sm text-gray-500">Start tracking your time to see entries here</div>
          </div>
        )}
      </div>
    </div>
  );
}