'use client';

import { useState, useEffect } from 'react';
import { DocumentArrowDownIcon, ChevronDownIcon, UserIcon } from '@heroicons/react/24/outline';
// import { useTranslations } from '@/components/providers/TranslationProvider';
import { useTranslations } from '@/components/providers/TranslationProvider';
import { ExportModal } from '@/components/common/ExportModal';
import { ReportsCharts } from '@/components/reports/ReportsCharts';

interface TimeEntry {
    id: string;
    startTime: Date;
    endTime: Date | null;
    totalSeconds: number;
    isActive: boolean;
    userId: string;
    taskId: string;
    task: Task;
}

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: Date;
    userId: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  timeEntries?: TimeEntry[];
}

interface ReportsData {
  user: {
    id: string;
    name: string | null;
    timeEntries: TimeEntry[];
  };
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
}

interface ReportsClientProps {
  currentUser: User;
  allUsers: User[];
  initialReportsData: ReportsData;
}

export function ReportsClient({ currentUser, allUsers, initialReportsData }: ReportsClientProps) {
  const [isClient, setIsClient] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);
  const [reportsData, setReportsData] = useState<ReportsData>(initialReportsData);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const t = useTranslations('reports');

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch reports data when user selection changes
  useEffect(() => {
    if (selectedUserId === currentUser.id) {
      setReportsData(initialReportsData);
      return;
    }

    const fetchUserReportsData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/reports/user/${selectedUserId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user reports data');
        }

        const data = await response.json();
        setReportsData(data);
      } catch (error) {
        console.error('Error fetching user reports data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserReportsData();
  }, [selectedUserId, currentUser.id, initialReportsData]);

  const selectedUser = allUsers.find(user => user.id === selectedUserId) || currentUser;

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleExportToExcel = async (startDate?: string, endDate?: string, format: 'xlsx' | 'pdf' = 'xlsx') => {
    if (isExporting) return;
    
    console.log('Starting export with date range:', { startDate, endDate, format });
    setIsExporting(true);
    try {
      // Build query parameters for date range
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      
      // Use user-specific export endpoints
      const endpoint = format === 'pdf' ? 'export-pdf' : 'export';
      const url = `/api/users/${selectedUserId}/${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching URL:', url);
      
      // Fetch the file with proper authentication
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the blob from response
      const blob = await response.blob();
      console.log('Blob size:', blob.size);
      
      // Check if the response is very small (might indicate no data)
      if (blob.size < 1000) {
        console.log('Small file size detected - might be empty data');
      }
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = format === 'pdf' ? `${selectedUser.name || 'user'}-time-entries.pdf` : `${selectedUser.name || 'user'}-time-entries.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      console.log('Download filename:', filename);

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('Export completed successfully');
      
      // Check if filename indicates no data and show appropriate message
      if (filename.includes('_no_data')) {
        throw new Error('No data found for the selected date range. The exported file contains a "No Data" message.');
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      // Re-throw the error so the modal can handle it appropriately
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with User Selection */}
      <div className="theme-card rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-3xl font-bold theme-text-primary">
                {t('title')}
              </h1>
              <p className="theme-text-secondary mt-2">
                {t('subtitle')}
              </p>
            </div>
            
            {/* User Selection Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
              >
                <UserIcon className="h-5 w-5 text-gray-400" />
                <span className="flex-1 text-left text-gray-900 font-medium">
                  {selectedUser.name || selectedUser.email}
                </span>
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {allUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                        selectedUserId === user.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-600" />
                        <div>
                          <div className="font-medium">{user.name || t('noName')}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            disabled={isExporting}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>{t('exporting')}</span>
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="h-4 w-4" />
                <span>{t('exportData')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="theme-card rounded-xl shadow-sm border p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Hours */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">{t('todaysHours')}</p>
                  <p className="text-2xl font-bold mt-1">{formatTime(reportsData.dailyTotal)}</p>
                </div>
                <div className="bg-blue-400 bg-opacity-30 rounded-lg p-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Weekly Hours */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">{t('thisWeek')}</p>
                  <p className="text-2xl font-bold mt-1">{formatTime(reportsData.weeklyTotal)}</p>
                </div>
                <div className="bg-green-400 bg-opacity-30 rounded-lg p-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Monthly Hours */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">{t('thisMonth')}</p>
                  <p className="text-2xl font-bold mt-1">{formatTime(reportsData.monthlyTotal)}</p>
                </div>
                <div className="bg-purple-400 bg-opacity-30 rounded-lg p-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold theme-text-primary">{t('analyticsAndInsights')}</h2>
              <div className="text-sm theme-text-secondary">
                {t('showingDataFor')} {selectedUser.name || selectedUser.email}
              </div>
            </div>
            
            <ReportsCharts userId={selectedUserId} />
          </div>

          {/* Recent Activity */}
          <div className="theme-card rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4">{t('recentActivity')}</h3>
            {reportsData.user.timeEntries && reportsData.user.timeEntries.length > 0 ? (
              <div className="space-y-3">
                {reportsData.user.timeEntries.slice(0, 5).map((entry: TimeEntry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 rounded-lg transition-colors" style={{ backgroundColor: 'var(--hover-bg)' }}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${entry.isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`}></div>
                      <div>
                        <p className="font-medium theme-text-primary">{entry.task.title}</p>
                        <p className="text-sm theme-text-secondary">{isClient ? new Date(entry.startTime).toLocaleDateString() : ''}</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium theme-text-secondary">
                      {formatTime(entry.totalSeconds)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">{t('noTimeEntries')}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Export Modal */}
      <ExportModal
        isVisible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportToExcel}
        title={t('exportUserData')}
      />

      {/* Click outside dropdown to close */}
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </div>
  );
}