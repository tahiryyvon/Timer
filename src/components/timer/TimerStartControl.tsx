'use client';

import { useState, useEffect, useMemo } from 'react';
import { ClockIcon, PlayIcon, PlusIcon } from '@heroicons/react/24/outline';
import { NewTaskModal, TaskData } from '../tasks/NewTaskModal';

interface TimeEntry {
  id: string;
  startTime: Date;
  task: {
    title: string;
  };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

interface TimerStartControlProps {
  compact?: boolean;
}

export function TimerStartControl({ compact = false }: TimerStartControlProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [startingTimer, setStartingTimer] = useState(false);

  // Fetch active time entry and tasks
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active entry
        const activeResponse = await fetch('/api/time-entries/active');
        if (activeResponse.ok) {
          const activeData = await activeResponse.json();
          if (activeData.activeEntry) {
            setActiveEntry({
              ...activeData.activeEntry,
              startTime: new Date(activeData.activeEntry.startTime)
            });
          } else {
            setActiveEntry(null);
          }
        }

        // Fetch available tasks
        const tasksResponse = await fetch('/api/tasks');
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setTasks(tasksData.tasks || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
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

  const startTimerForTask = async (taskId: string) => {
    // Prevent double-clicks and rapid successive calls
    if (startingTimer) {
      console.log('Timer start already in progress, ignoring duplicate request');
      return;
    }
    
    console.log('Starting timer for task:', taskId);
    setStartingTimer(true);
    try {
      const response = await fetch('/api/timer/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': `timer-start-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify({ taskId }),
      });

      if (response.ok) {
        console.log('Timer started successfully for task:', taskId);
        // Refresh data to show new active timer
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('Timer start failed:', errorData);
        throw new Error(`Failed to start timer: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error starting timer:', error);
    } finally {
      setStartingTimer(false);
      setShowTaskSelector(false);
    }
  };

  const stopCurrentTimer = async () => {
    setStartingTimer(true);
    try {
      const response = await fetch('/api/timer/stop', {
        method: 'POST',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        throw new Error('Failed to stop timer');
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    } finally {
      setStartingTimer(false);
    }
  };

  const handleCreateAndStartTask = async (taskData: TaskData) => {
    // Prevent double submissions
    if (startingTimer) return;
    
    try {
      setStartingTimer(true);
      
      // Create task
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) throw new Error('Failed to save task');
      const newTask = await response.json();

      // Start timer immediately
      await startTimerForTask(newTask.id);
    } catch (error) {
      console.error('Error creating and starting task:', error);
      throw error;
    } finally {
      setStartingTimer(false);
    }
  };

  const handleSaveTaskOnly = async (taskData: TaskData) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) throw new Error('Failed to save task');
      
      // Refresh to show new task in selector
      window.location.reload();
    } catch (error) {
      console.error('Error saving task:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
        <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
        <span className="font-mono text-lg text-gray-400">--:--:--</span>
      </div>
    );
  }

  // If timer is active, show current timer with stop option
  if (activeEntry) {
    if (compact) {
      // Compact version for header
      return (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg px-4 py-2 border border-green-200 shadow-sm">
          <div className="flex items-center space-x-3">
            {/* Active Status Indicator */}
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 text-xs font-semibold">ACTIVE</span>
            </div>
            
            {/* Timer Display */}
            <div className="bg-white rounded px-2 py-1 border border-green-200">
              <ClockIcon className="h-4 w-4 text-green-600 inline mr-1" />
              <span className="font-mono text-sm font-bold text-green-800">
                {formatTime(elapsedTime)}
              </span>
            </div>
            
            {/* Task Title */}
            <span className="text-green-800 text-sm font-medium truncate max-w-24">
              {activeEntry.task.title}
            </span>

            {/* Compact Stop Button */}
            <button
              onClick={stopCurrentTimer}
              disabled={startingTimer}
              className="px-2 py-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs rounded font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 flex items-center space-x-1"
            >
              {startingTimer ? (
                <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6h12v12H6z" />
                  </svg>
                  <span>Stop</span>
                </>
              )}
            </button>
          </div>
        </div>
      );
    }

    // Full version for main content
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl px-6 py-4 border border-green-200 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {/* Active Status Indicator */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
              <span className="text-green-700 text-sm font-semibold">ACTIVE</span>
            </div>
            
            {/* Timer Display */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <div className="bg-white rounded-lg px-3 py-2 border border-green-200 shadow-sm">
                <ClockIcon className="h-5 w-5 text-green-600 inline mr-2" />
                <span className="font-mono text-xl font-bold text-green-800">
                  {formatTime(elapsedTime)}
                </span>
              </div>
            </div>
            
            {/* Task Title */}
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="h-5 border-l-2 border-green-300 flex-shrink-0"></div>
              <span className="text-green-800 font-semibold truncate">
                {activeEntry.task.title}
              </span>
            </div>
          </div>

          {/* Enhanced Stop Button */}
          <button
            onClick={stopCurrentTimer}
            disabled={startingTimer}
            className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 flex-shrink-0"
          >
            {startingTimer ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Stopping...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6h12v12H6z" />
                </svg>
                <span>Stop Timer</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // If no active timer, show start options
  if (compact) {
    // Compact version for header
    return (
      <>
        <div className="relative">
          <div className="flex items-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-4 py-2 border border-gray-200">
            <div className="flex items-center mr-3">
              <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
              <span className="font-mono text-sm text-gray-400">00:00:00</span>
            </div>
            
            {/* Compact Start Timer Button */}
            <button
              onClick={() => setShowTaskSelector(!showTaskSelector)}
              disabled={startingTimer}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded text-sm shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              <span>Start</span>
            </button>
          </div>

          {/* Task Selector Dropdown - Compact */}
          {showTaskSelector && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowTaskSelector(false)}
              ></div>
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Select a task to start</h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="ml-2 text-sm text-gray-500">Loading...</span>
                      </div>
                    ) : tasks.length === 0 ? (
                      <p className="text-sm text-gray-500 py-2">No available tasks</p>
                    ) : (
                      tasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => startTimerForTask(task.id)}
                          disabled={startingTimer}
                          className="w-full text-left px-3 py-2 text-sm rounded hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 disabled:opacity-50"
                        >
                          <div className="font-medium text-gray-900">{task.title}</div>
                        </button>
                      ))
                    )}
                  </div>
                  
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={() => {
                        setShowTaskSelector(false);
                        setShowNewTaskModal(true);
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors duration-150"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      <span>New Task</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {showNewTaskModal && (
          <NewTaskModal
            isOpen={showNewTaskModal}
            onClose={() => setShowNewTaskModal(false)}
            onSave={handleSaveTaskOnly}
            onSaveAndStart={handleCreateAndStartTask}
          />
        )}
      </>
    );
  }

  // Full version for main content
  return (
    <>
      <div className="relative">
        <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-6 py-4 border border-gray-200">
          <div className="flex items-center">
            <ClockIcon className="h-6 w-6 text-gray-400 mr-3" />
            <div>
              <span className="font-mono text-xl text-gray-400">00:00:00</span>
              <div className="text-sm text-gray-500">No active timer</div>
            </div>
          </div>
          
          {/* Enhanced Start Timer Button */}
          <button
            onClick={() => setShowTaskSelector(!showTaskSelector)}
            disabled={startingTimer}
            className="relative flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none group"
          >
            <PlayIcon className="h-5 w-5 mr-3 group-hover:animate-pulse" />
            <span className="text-lg">Start Timer</span>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-200"></div>
          </button>
        </div>

        {/* Task Selector Dropdown */}
        {showTaskSelector && (
          <>
            {/* Backdrop - Click outside to close */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowTaskSelector(false)}
            />
            
            {/* Dropdown Content - Aligned to the right of button */}
            <div className="absolute top-full right-0 mt-3 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-80 overflow-hidden">
              {/* Create New Task Option */}
              <button
                onClick={() => {
                  setShowNewTaskModal(true);
                  setShowTaskSelector(false);
                }}
                className="w-full flex items-center px-6 py-4 hover:bg-blue-50 text-left border-b border-gray-100 transition-colors group"
              >
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors">
                  <PlusIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Create New Task</div>
                  <div className="text-sm text-gray-500">Start working on something new</div>
                </div>
              </button>

              {/* Existing Tasks */}
              {tasks.length > 0 ? (
                <>
                  <div className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                    Select Existing Task
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => startTimerForTask(task.id)}
                        disabled={startingTimer}
                        className="w-full flex items-center px-6 py-4 hover:bg-gray-50 text-left disabled:opacity-50 transition-colors group relative"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-500 truncate mt-1">
                              {task.description}
                            </div>
                          )}
                          <div className="flex items-center mt-2">
                            <div className={`text-xs px-3 py-1 rounded-full font-medium ${
                              task.status === 'COMPLETED' 
                                ? 'bg-green-100 text-green-800' 
                                : task.status === 'OPEN'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status}
                            </div>
                          </div>
                        </div>
                        
                        {startingTimer ? (
                          <div className="ml-4 flex items-center justify-center w-6 h-6">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        ) : (
                          <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayIcon className="h-5 w-5 text-blue-500" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="px-6 py-8 text-center">
                  <div className="mb-4">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">📋</span>
                    </div>
                  </div>
                  <div className="text-gray-900 font-medium mb-2">No tasks available</div>
                  <div className="text-sm text-gray-500">Create your first task above to get started</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* New Task Modal */}
      <NewTaskModal
        isOpen={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        onSave={handleSaveTaskOnly}
        onSaveAndStart={handleCreateAndStartTask}
      />
    </>
  );
}