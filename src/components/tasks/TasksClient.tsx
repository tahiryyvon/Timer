'use client';

import { useState } from 'react';
import { NewTaskModal, TaskData } from './NewTaskModal';

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
  }[];
}

interface TasksClientProps {
  user: {
    tasks: Task[];
  };
}

export default function TasksClient({ user }: TasksClientProps) {
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
              <p className="text-gray-600 mt-2">
                Manage your tasks and track time spent on each one.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {user.tasks.length} total tasks
              </div>
              <button 
                onClick={() => setIsNewTaskModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                + New Task
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{user.tasks.length}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Open Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Time</p>
                <p className="text-2xl font-bold text-gray-900">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Your Tasks</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {user.tasks.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                  <p className="text-gray-600 mb-4">Create your first task to get started with time tracking.</p>
                  <button 
                    onClick={() => setIsNewTaskModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Create First Task
                  </button>
                </div>
              </div>
            ) : (
              user.tasks.map((task: Task) => (
                <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Total time: {formatTime(getTotalTime(task))}</span>
                        <span>•</span>
                        <span>{task.timeEntries.length} session{task.timeEntries.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button className="text-blue-600 hover:text-blue-700 px-3 py-1 text-sm font-medium">
                        View
                      </button>
                      <button className="text-green-600 hover:text-green-700 px-3 py-1 text-sm font-medium">
                        Start Timer
                      </button>
                    </div>
                  </div>
                </div>
              ))
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
    </>
  );
}