'use client';

import { useState, useEffect } from 'react';
import { TimerStartControl } from '@/components/timer/TimerStartControl';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useTranslations } from '@/components/providers/TranslationProvider';

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

interface DashboardClientProps {
  user: {
    id: string;
    name: string | null;
    timeEntries: TimeEntry[];
  };
  activeTimeEntry: TimeEntry | undefined;
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
}

export default function DashboardClient({ 
  user, 
  activeTimeEntry, 
  dailyTotal, 
  weeklyTotal, 
  monthlyTotal 
}: DashboardClientProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const t = useTranslations('dashboard');

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleExportToExcel = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = '/api/export/excel';
      link.download = ''; // Filename will be set by the server
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="theme-card rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold theme-text-primary">
              {t('welcomeMessage').replace('{name}', user.name || 'User')}
            </h1>
            <p className="theme-text-secondary mt-2">
              {t('trackTimeMessage')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">
                  {activeTimeEntry ? t('currentTimer') : t('readyToStart')}
                </span>
              </div>
            </div>
            
            {/* Export Button */}
            <button
              onClick={handleExportToExcel}
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
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timer Section - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2">
          <div className="theme-card rounded-xl shadow-sm border p-8">
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-semibold theme-text-primary">{t('timeTracker')}</h2>
              <p className="theme-text-secondary">
                {t('startTrackingMessage')}
              </p>
              
              {/* Enhanced Timer Start Control */}
              <div className="w-full max-w-2xl mx-auto">
                <TimerStartControl />
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-6" style={{ borderColor: 'var(--card-border)' }}>
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{user.timeEntries.length}</div>
                    <div className="text-sm text-blue-700 font-medium">{t('totalSessions')}</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.floor(user.timeEntries.reduce((acc, entry) => acc + entry.totalSeconds, 0) / 3600)}{t('hours')}
                    </div>
                    <div className="text-sm text-green-700 font-medium">{t('totalHours')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="space-y-6">
          {/* Today's Hours */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">{t('todaysHours')}</p>
                <p className="text-2xl font-bold mt-1">{formatTime(dailyTotal)}</p>
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
                <p className="text-2xl font-bold mt-1">{formatTime(weeklyTotal)}</p>
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
                <p className="text-2xl font-bold mt-1">{formatTime(monthlyTotal)}</p>
              </div>
              <div className="bg-purple-400 bg-opacity-30 rounded-lg p-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="theme-card rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold theme-text-primary mb-4">{t('recentActivity')}</h3>
        {user.timeEntries && user.timeEntries.length > 0 ? (
          <div className="space-y-3">
            {user.timeEntries.slice(0, 5).map((entry: TimeEntry) => (
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
            <p className="text-gray-500 mb-4">{t('noTimeEntries')}</p>
            <div className="max-w-xs mx-auto">
              <TimerStartControl />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}