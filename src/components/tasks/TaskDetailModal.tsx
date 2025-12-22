'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useTranslations } from '@/components/providers/TranslationProvider';
import { 
  ClockIcon, 
  CalendarIcon, 
  PlayIcon, 
  PauseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface TimeEntry {
  id: string;
  totalSeconds: number;
  startTime: Date;
  endTime: Date | null;
  createdAt: Date;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  timeEntries: TimeEntry[];
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string | null;
  onStartTimer?: (taskId: string) => void;
}

export function TaskDetailModal({ isOpen, onClose, taskId, onStartTimer }: TaskDetailModalProps) {
  const t = useTranslations('timer');
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for running timers
  useEffect(() => {
    if (!isOpen || !task) return;
    
    const hasActiveTimer = task.timeEntries.some(entry => entry.endTime === null);
    if (!hasActiveTimer) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, task]);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetail();
    }
    
    async function fetchTaskDetail() {
      if (!taskId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch task details');
        }
        
        const data = await response.json();
        setTask({
          ...data.task,
          createdAt: new Date(data.task.createdAt),
          updatedAt: new Date(data.task.updatedAt),
          timeEntries: data.task.timeEntries.map((entry: {
            id: string;
            totalSeconds: number;
            startTime: string;
            endTime: string | null;
            createdAt: string;
          }) => ({
            ...entry,
            startTime: new Date(entry.startTime),
            endTime: entry.endTime ? new Date(entry.endTime) : null,
            createdAt: new Date(entry.createdAt)
          }))
        });
      } catch (error) {
        console.error('Error fetching task details:', error);
        setError('Failed to load task details');
      } finally {
        setLoading(false);
      }
    }
  }, [isOpen, taskId]);

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDuration = (startTime: Date, endTime: Date | null) => {
    if (!endTime) {
      // Calculate current running time
      const currentDuration = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
      return `Running: ${formatTime(currentDuration)}`;
    }
    
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);
    return formatTime(durationSeconds);
  };

  const getCurrentRunningTime = (startTime: Date) => {
    const currentDuration = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    return currentDuration;
  };

  const getTotalTimeIncludingCurrent = () => {
    if (!task) return 0;
    
    let total = 0;
    task.timeEntries.forEach(entry => {
      if (entry.endTime === null) {
        // Add current running time for active entries
        total += entry.totalSeconds + getCurrentRunningTime(entry.startTime);
      } else {
        total += entry.totalSeconds;
      }
    });
    
    return total;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'OPEN':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'OPEN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleStartTimer = () => {
    if (task && onStartTimer) {
      onStartTimer(task.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task Details">
      <div className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading task details...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {task && !loading && !error && (
          <>
            {/* Task Header */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h2>
                  {task.description && (
                    <p className="text-gray-600 text-sm leading-relaxed">{task.description}</p>
                  )}
                </div>
                <div className="ml-4 flex items-center space-x-3">
                  <div className={`flex items-center px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(task.status)}`}>
                    {getStatusIcon(task.status)}
                    <span className="ml-2">{task.status}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ClockIcon className="h-6 w-6 text-blue-600 mr-3" />
                  <div>
                    <p className="text-blue-800 text-sm font-medium">{t('totalTime')}</p>
                    <p className="text-blue-900 text-xl font-bold">{formatTime(getTotalTimeIncludingCurrent())}</p>
                    {task.timeEntries.some(entry => entry.endTime === null) && (
                      <p className="text-blue-600 text-xs animate-pulse">● Currently running</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <PlayIcon className="h-6 w-6 text-green-600 mr-3" />
                  <div>
                    <p className="text-green-800 text-sm font-medium">{t('sessions')}</p>
                    <p className="text-green-900 text-xl font-bold">{task.timeEntries.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-6 w-6 text-purple-600 mr-3" />
                  <div>
                    <p className="text-purple-800 text-sm font-medium">{t('created')}</p>
                    <p className="text-purple-900 text-sm font-bold">{task.createdAt.toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Timer Section - Show if timer is running */}
            {task.timeEntries.some(entry => entry.endTime === null) && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-100 rounded-full p-3">
                      <PlayIcon className="h-8 w-8 text-green-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-900">{t('timerCurrentlyRunning')}</h3>
                      <p className="text-green-700 text-sm">
                        Started: {task.timeEntries.find(entry => entry.endTime === null)?.startTime.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-900">
                      {formatTime(getCurrentRunningTime(task.timeEntries.find(entry => entry.endTime === null)!.startTime))}
                    </p>
                    <p className="text-green-600 text-sm">{t('currentSession')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Time Entries */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('timeSessions')}</h3>
              {task.timeEntries.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">{t('noTimeEntriesYet')}</p>
                  <p className="text-gray-500 text-sm">{t('startTimerToBeginTracking')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {task.timeEntries
                    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                    .map((entry) => (
                      <div 
                        key={entry.id} 
                        className={`border rounded-lg p-4 hover:shadow-sm transition-shadow ${
                          entry.endTime === null 
                            ? 'bg-green-50 border-green-200 shadow-sm' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {entry.endTime ? (
                              <PauseIcon className="h-5 w-5 text-gray-400" />
                            ) : (
                              <div className="relative">
                                <PlayIcon className="h-5 w-5 text-green-500" />
                                <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-ping"></div>
                              </div>
                            )}
                            <div>
                              <p className={`text-sm font-medium ${entry.endTime === null ? 'text-green-900' : 'text-gray-900'}`}>
                                {entry.startTime.toLocaleDateString()} at {entry.startTime.toLocaleTimeString()}
                              </p>
                              <p className={`text-xs ${entry.endTime === null ? 'text-green-600' : 'text-gray-500'}`}>
                                {entry.endTime 
                                  ? `Ended at ${entry.endTime.toLocaleTimeString()}`
                                  : 'Currently running ●'
                                }
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${entry.endTime === null ? 'text-green-900' : 'text-gray-900'}`}>
                              {formatDuration(entry.startTime, entry.endTime)}
                            </p>
                            <p className={`text-xs ${entry.endTime === null ? 'text-green-600' : 'text-gray-500'}`}>
                              {formatTime(entry.totalSeconds)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
              {task.status === 'OPEN' && 
               onStartTimer && 
               !task.timeEntries.some(entry => entry.endTime === null) && (
                <button
                  onClick={handleStartTimer}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  {t('startTimer')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}