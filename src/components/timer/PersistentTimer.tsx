'use client';

import { useState, useEffect, useMemo } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';
import { useTranslations } from '@/components/providers/TranslationProvider';

interface TimeEntry {
  id: string;
  startTime: Date;
  task: {
    title: string;
  };
}

export function PersistentTimer() {
  const t = useTranslations('timer');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch active time entry
  useEffect(() => {
    const fetchActiveEntry = async () => {
      try {
        const response = await fetch('/api/time-entries/active');
        if (response.ok) {
          const data = await response.json();
          if (data.activeEntry) {
            setActiveEntry({
              ...data.activeEntry,
              startTime: new Date(data.activeEntry.startTime)
            });
          } else {
            setActiveEntry(null);
          }
        } else {
          console.error('Failed to fetch active entry:', response.status, response.statusText);
          setActiveEntry(null);
        }
      } catch (error) {
        console.error('Failed to fetch active entry:', error);
        setActiveEntry(null);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveEntry();
    // Poll every 10 seconds for updates instead of 30 seconds for better responsiveness
    const interval = setInterval(fetchActiveEntry, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate elapsed time
  const elapsedTime = useMemo(() => {
    if (activeEntry) {
      return Math.floor((currentTime.getTime() - activeEntry.startTime.getTime()) / 1000);
    }
    return 0;
  }, [activeEntry, currentTime]);

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
        <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
        <span className="font-mono text-lg text-gray-400">--:--:--</span>
      </div>
    );
  }

  if (!activeEntry) {
    return (
      <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
        <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
        <span className="font-mono text-lg text-gray-400">00:00:00</span>
        <span className="text-sm text-gray-500 ml-2">{t('noActiveTimer')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-4 py-2 border border-blue-200">
      <div className="flex items-center space-x-3">
        {/* Active Status Indicator */}
        <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
        
        {/* Timer Display */}
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-5 w-5 text-blue-600" />
          <span className="font-mono text-lg font-semibold text-gray-900">
            {formatTime(elapsedTime)}
          </span>
        </div>
        
        {/* Task Title */}
        <div className="h-4 border-l border-gray-300"></div>
        <span className="text-sm font-medium text-gray-700 truncate max-w-32">
          {activeEntry.task.title}
        </span>
      </div>
    </div>
  );
}