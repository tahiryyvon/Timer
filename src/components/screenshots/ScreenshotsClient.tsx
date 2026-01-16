'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CameraIcon, TrashIcon, UserIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useTranslations } from '@/components/providers/TranslationProvider';

interface User {
  id: string;
  name: string | null;
  email: string;
  role?: string;
}

interface Task {
  id: string;
  title: string;
}

interface TimeEntry {
  id: string;
  startTime: Date;
  endTime: Date | null;
  isActive: boolean;
  task: Task;
}

interface Screenshot {
  id: string;
  filename: string;
  capturedAt: Date;
  user: User;
  timeEntry: TimeEntry;
}

interface ScreenshotsClientProps {
  currentUser: User;
  screenshots: Screenshot[];
  allUsers: User[];
}

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  screenshotId: string;
  isDeleting: boolean;
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteConfirmationProps) {
  const t = useTranslations('screenshots');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('confirmDeleteTitle')}
        </h3>
        <p className="text-gray-600 mb-6">
          {t('confirmDelete')}
        </p>
        <div className="flex space-x-3 justify-end">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScreenshotsClient({ currentUser, screenshots: initialScreenshots, allUsers }: ScreenshotsClientProps) {
  const t = useTranslations('screenshots');
  const [screenshots, setScreenshots] = useState<Screenshot[]>(initialScreenshots);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, screenshotId: '', isDeleting: false });

  // Filter screenshots based on selected user
  const filteredScreenshots = selectedUserId === 'all' 
    ? screenshots 
    : screenshots.filter(screenshot => screenshot.user.id === selectedUserId);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const handleDeleteScreenshot = async (screenshotId: string) => {
    setDeleteModal({ isOpen: true, screenshotId, isDeleting: false });
  };

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    
    try {
      const response = await fetch(`/api/screenshots/${deleteModal.screenshotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete screenshot');
      }

      // Remove screenshot from local state
      setScreenshots(prev => prev.filter(s => s.id !== deleteModal.screenshotId));
      setDeleteModal({ isOpen: false, screenshotId: '', isDeleting: false });
      
      // Show success message (you can add toast notification here)
      console.log(t('screenshotDeleted'));
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      // Show error message (you can add toast notification here)
      alert(t('screenshotDeleteError'));
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const canDeleteScreenshot = (screenshot: Screenshot) => {
    // HR and Manager can delete any screenshot, employees can only delete their own
    return currentUser.role === 'HR' || 
           currentUser.role === 'MANAGER' || 
           screenshot.user.id === currentUser.id;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold theme-text-primary">
            {t('title')}
          </h1>
          <p className="theme-text-secondary mt-2">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* User Filter - Only show for HR/Manager */}
      {(currentUser.role === 'HR' || currentUser.role === 'MANAGER') && (
        <div className="theme-card rounded-xl shadow-sm border p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium theme-text-secondary">
              {t('filterByUser')}:
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">{t('allUsers')}</option>
              {allUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Screenshots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredScreenshots.length > 0 ? (
          filteredScreenshots.map((screenshot) => (
            <div key={screenshot.id} className="theme-card rounded-xl shadow-sm border overflow-hidden">
              {/* Screenshot Image */}
              <div className="aspect-video bg-gray-100 relative">
                <Image
                  src={`/screenshots/${screenshot.filename}`}
                  alt="Screenshot"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-screenshot.svg';
                  }}
                />
                {canDeleteScreenshot(screenshot) && (
                  <button
                    onClick={() => handleDeleteScreenshot(screenshot.id)}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    title={t('deleteScreenshot')}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Screenshot Details */}
              <div className="p-4 space-y-3">
                {/* User Info - Only show for HR/Manager */}
                {(currentUser.role === 'HR' || currentUser.role === 'MANAGER') && (
                  <div className="flex items-center space-x-2 text-sm">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="theme-text-secondary">
                      {t('user')}: {screenshot.user.name || screenshot.user.email}
                    </span>
                  </div>
                )}

                {/* Task Info */}
                <div className="flex items-center space-x-2 text-sm">
                  <CameraIcon className="h-4 w-4 text-gray-400" />
                  <span className="theme-text-secondary">
                    {t('task')}: {screenshot.timeEntry.task.title}
                  </span>
                </div>

                {/* Capture Time */}
                <div className="flex items-center space-x-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <span className="theme-text-secondary">
                    {t('capturedAt')}: {formatDate(screenshot.capturedAt)}
                  </span>
                </div>

                {/* Time Entry Status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    screenshot.timeEntry.isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-sm theme-text-secondary">
                    {screenshot.timeEntry.isActive ? 'Active Timer' : 'Completed'}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <CameraIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium theme-text-primary mb-2">
              {t('noScreenshots')}
            </h3>
            <p className="theme-text-secondary">
              Screenshots will appear here when the monitoring system captures them during active work sessions.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, screenshotId: '', isDeleting: false })}
        onConfirm={confirmDelete}
        screenshotId={deleteModal.screenshotId}
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  );
}