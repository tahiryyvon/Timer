'use client';

import { useState, useEffect } from 'react';
import { NewTaskModal, TaskData } from './NewTaskModal';
import { TaskDetailModal } from './TaskDetailModal';
import { useTranslations } from '@/components/providers/TranslationProvider';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  userId: string;
  timeEntries: {
    id: string;
    totalSeconds: number;
    endTime: Date | null;
  }[];
}

interface TasksClientProps {
  user: {
    id: string;
    role: string;
    tasks: Task[];
  };
}

export default function TasksClient({ user }: TasksClientProps) {
  const t = useTranslations('tasks');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState<string | null>(null);
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
    return `${hours}h ${minutes}m`;
  };

  const getTotalTime = (task: Task) => {
    return task.timeEntries.reduce((total, entry) => total + entry.totalSeconds, 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter tasks based on search query
  const filteredTasks = user.tasks.filter((task) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Basic text search
    const textMatch = (
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query))
    );
    
    // Time-based search
    const totalSeconds = getTotalTime(task);
    const totalMinutes = totalSeconds / 60;
    
    // Parse time queries (e.g., "2h", "30min", ">1h", "<45min")
    const timeMatch = (() => {
      // Match patterns like "2h", "30min", "1h30m", etc.
      const timePattern = /^([><!]?)(\d+(?:\.\d+)?)(h|hours?|m|min|minutes?)$/i;
      
      const match = query.match(timePattern);
      if (!match) return false;
      
      const operator = match[1] || '=';
      const value = parseFloat(match[2]);
      const unit = match[3].toLowerCase();
      
      // Convert to minutes for comparison
      const searchMinutes = unit.startsWith('h') ? value * 60 : value;
      
      switch (operator) {
        case '>':
          return totalMinutes > searchMinutes;
        case '<':
          return totalMinutes < searchMinutes;
        case '!':
          return Math.abs(totalMinutes - searchMinutes) > 5; // 5-minute tolerance
        default:
          return Math.abs(totalMinutes - searchMinutes) <= 5; // 5-minute tolerance for exact match
      }
    })();
    
    return textMatch || timeMatch;
  });

  const handleSaveTask = async (taskData: TaskData) => {
    // Prevent double submissions
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error('Failed to save task');
      }

      // Refresh the page to show the new task
      window.location.reload();
    } catch (error) {
      console.error('Error saving task:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndStartTask = async (taskData: TaskData) => {
    // Prevent double submissions
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      // First, create the task
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error('Failed to save task');
      }

      const newTask = await response.json();

      // Start timer for the new task (this will automatically stop any active timer)
      const timerResponse = await fetch('/api/timer/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: newTask.id }),
      });

      if (!timerResponse.ok) {
        throw new Error('Failed to start timer');
      }

      // Refresh the page to show the new task and started timer
      window.location.reload();
    } catch (error) {
      console.error('Error saving and starting task:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTaskDetailModalOpen(true);
  };

  const handleStartTimerFromModal = async (taskId: string) => {
    try {
      const response = await fetch('/api/timer/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start timer');
      }

      // Refresh the page to show the updated timer state
      window.location.reload();
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const handleStartTimerFromList = async (taskId: string) => {
    try {
      const response = await fetch('/api/timer/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start timer');
      }

      // Refresh the page to show the updated timer state
      window.location.reload();
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!canDeleteResources()) {
      alert(t('noPermissionToDelete'));
      return;
    }

    const confirmed = confirm(
      `${t('deleteTaskConfirmationStart')} "${taskTitle}"?\n\n${t('deleteTaskConfirmationWarning')}`
    );

    if (!confirmed) return;

    setIsDeletingTask(taskId);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete task');
      }

      alert(`${t('taskDeletedSuccessfullyStart')} "${taskTitle}" ${t('taskDeletedSuccessfullyEnd')} ${result.deletedTask.timeEntriesDeleted} ${t('timeEntries')}.`);
      
      // Refresh the page to show updated task list
      window.location.reload();
      
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(t('failedToDeleteTaskMessage'));
    } finally {
      setIsDeletingTask(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="theme-card rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold theme-text-primary">{t('taskManagement')}</h1>
              <p className="theme-text-secondary mt-2">
                {t('manageYourTasks')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm theme-text-secondary">
                {user.tasks.length} {t('totalTasksCount')}
              </div>
              <button 
                onClick={() => setIsNewTaskModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                + {t('newTask')}
              </button>
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
              placeholder={t('searchTasksPlaceholder')}
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
                <p className="theme-text-secondary text-sm font-medium">{t('totalTasks')}</p>
                <p className="text-2xl font-bold theme-text-primary">{user.tasks.length}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="theme-card rounded-xl shadow-sm p-6" style={{ border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="theme-text-secondary text-sm font-medium">{t('openTasks')}</p>
                <p className="text-2xl font-bold theme-text-primary">
                  {user.tasks.filter((task: Task) => task.status === 'OPEN').length}
                </p>
              </div>
              <div className="bg-yellow-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="theme-card rounded-xl shadow-sm p-6" style={{ border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="theme-text-secondary text-sm font-medium">{t('completed')}</p>
                <p className="text-2xl font-bold theme-text-primary">
                  {user.tasks.filter((task: Task) => task.status === 'COMPLETED').length}
                </p>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="theme-card rounded-xl shadow-sm p-6" style={{ border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="theme-text-secondary text-sm font-medium">{t('totalTime')}</p>
                <p className="text-2xl font-bold theme-text-primary">
                  {formatTime(user.tasks.reduce((total: number, task: Task) => total + getTotalTime(task), 0))}
                </p>
              </div>
              <div className="bg-purple-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="theme-card rounded-xl shadow-sm border">
          <div className="p-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <h2 className="text-xl font-semibold theme-text-primary">{t('yourTasks')}</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
            {user.tasks.length === 0 ? (
              <div className="p-8 text-center">
                <div className="rounded-lg p-8 max-w-md mx-auto" style={{ backgroundColor: 'var(--hover-bg)' }}>
                  <svg className="w-16 h-16 theme-text-secondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-medium theme-text-primary mb-2">{t('noTasksYet')}</h3>
                  <p className="text-gray-600 mb-4">{t('createFirstTaskDesc')}</p>
                  <button 
                    onClick={() => setIsNewTaskModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {t('createFirstTask')}
                  </button>
                </div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-8 text-center">
                <div className="rounded-lg p-8 max-w-md mx-auto" style={{ backgroundColor: 'var(--hover-bg)' }}>
                  <svg className="w-16 h-16 theme-text-secondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium theme-text-primary mb-2">{t('noSearchResults')}</h3>
                  <p className="theme-text-secondary mb-4">Try adjusting your search criteria</p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {t('clearSearch')}
                  </button>
                </div>
              </div>
            ) : (
              filteredTasks.map((task: Task) => {
                const hasRunningTimer = task.timeEntries.some(entry => entry.endTime === null);
                return (
                  <div 
                    key={task.id} 
                    className={`p-6 transition-colors ${
                      hasRunningTimer 
                        ? 'bg-green-50 border-l-4 border-green-500 hover:bg-green-100' 
                        : 'theme-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {hasRunningTimer && (
                            <div className="flex items-center mr-2">
                              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                              <span className="text-xs text-green-700 font-medium">{t('running')}</span>
                            </div>
                          )}
                          <h3 className={`font-medium ${hasRunningTimer ? 'text-green-900' : 'theme-text-primary'}`}>
                            {task.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                        {task.description && (
                          <p className={`text-sm mb-2 ${hasRunningTimer ? 'text-green-700' : 'theme-text-secondary'}`}>
                            {task.description}
                          </p>
                        )}
                        <div className={`flex items-center space-x-4 text-sm ${hasRunningTimer ? 'text-green-600' : 'theme-text-secondary'}`}>
                <span>{t('created')} {isClient ? new Date(task.createdAt).toLocaleDateString() : ''}</span>
                <span>•</span>
                <span>{t('totalTimeLabel')}: {formatTime(getTotalTime(task))}</span>
                <span>•</span>
                <span>{task.timeEntries.length} {task.timeEntries.length !== 1 ? t('sessions') : t('session')}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <button 
                        onClick={() => handleViewTask(task.id)}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {t('view')}
                      </button>
                      {!task.timeEntries.some(entry => entry.endTime === null) && (
                        <button 
                          onClick={() => handleStartTimerFromList(task.id)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-green-500 focus:ring-offset-1 shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('startTimer')}
                        </button>
                      )}
                      {canDeleteResources() && (
                        <button 
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          disabled={isDeletingTask === task.id}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {isDeletingTask === task.id ? t('deleting') : t('deleteTask')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* New Task Modal */}
      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onSave={handleSaveTask}
        onSaveAndStart={handleSaveAndStartTask}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={() => setIsTaskDetailModalOpen(false)}
        taskId={selectedTaskId}
        onStartTimer={handleStartTimerFromModal}
      />
    </>
  );
}