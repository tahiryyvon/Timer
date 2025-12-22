'use client';

import { useState, useEffect, useMemo } from 'react';
import { startTimer, pauseTimer, resumeTimer, stopTimer, getActiveTimeEntry } from '@/app/actions/time';
import { useTranslations } from '@/components/providers/TranslationProvider';

interface TimeEntry {
    id: string;
    startTime: Date;
    endTime: Date | null;
    totalSeconds: number;
    isActive: boolean;
    userId: string;
    taskId: string;
    task?: {
      title: string;
      description: string | null;
    };
}

interface TimerButtonProps {
  activeTimeEntry: TimeEntry | null | undefined;
  userId: string;
}

export function TimerButton({ activeTimeEntry: initialActiveEntry, userId }: TimerButtonProps) {
  const t = useTranslations('timer');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [localTimer, setLocalTimer] = useState(0);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [activeTimeEntry, setActiveTimeEntry] = useState(initialActiveEntry);
  
  const isRunning = !!activeTimeEntry;
  const [isPaused, setIsPaused] = useState(false);
  
  // Update current time every second for real-time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Periodically fetch the latest active time entry from server
  useEffect(() => {
    const fetchActiveEntry = async () => {
      try {
        const latestActiveEntry = await getActiveTimeEntry(userId);
        setActiveTimeEntry(latestActiveEntry);
      } catch (error) {
        console.error('Failed to fetch active time entry:', error);
      }
    };

    // Fetch immediately, then every 10 seconds
    fetchActiveEntry();
    const interval = setInterval(fetchActiveEntry, 10000);
    return () => clearInterval(interval);
  }, [userId]);
  
  // Calculate timer value based on active entry or local timer
  const timer = useMemo(() => {
    if (activeTimeEntry) {
      return Math.floor((currentTime.getTime() - new Date(activeTimeEntry.startTime).getTime()) / 1000);
    }
    return localTimer;
  }, [activeTimeEntry, localTimer, currentTime]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && !isPaused && !activeTimeEntry) {
      // Only run local timer if no active entry from server
      interval = setInterval(() => {
        setLocalTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, isPaused, activeTimeEntry]);

  const handleStart = async () => {
    // Create a new task with the entered details or use default
    let taskId = undefined;
    
    if (taskTitle.trim()) {
      // If user entered task details, create a new task
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim() || null,
          userId: userId
        }),
      });
      
      if (response.ok) {
        const newTask = await response.json();
        taskId = newTask.id;
      }
    }
    
    // Start timer with the new task or let it use default
    await startTimer(userId, taskId);
    setIsPaused(false);
    
    // Clear the form after starting
    setTaskTitle('');
    setTaskDescription('');
    
    // Refresh active entry immediately
    const latestActiveEntry = await getActiveTimeEntry(userId);
    setActiveTimeEntry(latestActiveEntry);
  };

  const handlePause = async () => {
    if (activeTimeEntry) {
      await pauseTimer(userId, activeTimeEntry.id);
      setIsPaused(true);
    }
  };

  const handleResume = async () => {
    if (activeTimeEntry) {
      await resumeTimer(userId, activeTimeEntry.id);
      setIsPaused(false);
    }
  };

  const handleStop = async () => {
    if (activeTimeEntry) {
      await stopTimer(userId, activeTimeEntry.id);
      setIsPaused(false);
      setLocalTimer(0);
      
      // Refresh active entry immediately
      const latestActiveEntry = await getActiveTimeEntry(userId);
      setActiveTimeEntry(latestActiveEntry);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-6xl font-mono font-bold text-gray-800 mb-6 text-center">
        {formatTime(timer)}
      </div>
      
      {!isRunning ? (
        <div className="space-y-6">
          <div className="space-y-4 max-w-md mx-auto">
            <div>
              <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-700 mb-2">
                {t('taskTitle')}
              </label>
              <input
                id="taskTitle"
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={t('enterTaskTitlePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900 placeholder-gray-500"
              />
            </div>
            
            <div>
              <label htmlFor="taskDescription" className="block text-sm font-medium text-gray-700 mb-2">
                {t('taskDescription')}
              </label>
              <textarea
                id="taskDescription"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder={t('enterTaskDescriptionPlaceholder')}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical transition-colors text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>
          
          <div className="text-center">
            <button 
              onClick={handleStart} 
              className="inline-flex items-center justify-center px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('startTimer')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center space-x-4">
          {!isPaused ? (
            <button 
              onClick={handlePause} 
              className="inline-flex items-center justify-center px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pause
            </button>
          ) : (
            <button 
              onClick={handleResume} 
              className="inline-flex items-center justify-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Resume
            </button>
          )}
          <button 
            onClick={handleStop} 
            className="inline-flex items-center justify-center px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
            </svg>
            Stop
          </button>
        </div>
      )}
    </div>
  );
}