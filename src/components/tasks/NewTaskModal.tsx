'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { 
  PlayIcon,
  BookmarkIcon 
} from '@heroicons/react/24/outline';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: TaskData) => Promise<void>;
  onSaveAndStart: (taskData: TaskData) => Promise<void>;
}

export interface TaskData {
  title: string;
  description: string;
}

export function NewTaskModal({ isOpen, onClose, onSave, onSaveAndStart }: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setIsLoading(false);
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onSave({ title: title.trim(), description: description.trim() });
      handleClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndStart = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onSaveAndStart({ title: title.trim(), description: description.trim() });
      handleClose();
    } catch (error) {
      console.error('Failed to save and start task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = title.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Task">
      <div className="space-y-6">
        {/* Task Title */}
        <div>
          <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-2">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={isLoading}
          />
        </div>

        {/* Task Description */}
        <div>
          <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description (optional)..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical transition-colors"
            disabled={isLoading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!isFormValid || isLoading}
            className="flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BookmarkIcon className="h-5 w-5 mr-2" />
            {isLoading ? 'Saving...' : 'Save Task'}
          </button>

          {/* Save and Start Button */}
          <button
            onClick={handleSaveAndStart}
            disabled={!isFormValid || isLoading}
            className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <PlayIcon className="h-5 w-5 mr-2" />
            {isLoading ? 'Starting...' : 'Save & Start Now'}
          </button>
        </div>

        {/* Info message about stopping current timer */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 mt-0.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>Note:</strong> Starting this task will automatically stop any currently running timer.
            </span>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}