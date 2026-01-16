'use client';

import { useState } from 'react';
import { useTranslations } from '@/components/providers/TranslationProvider';
import { ExportModal } from '@/components/common/ExportModal';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  _count: {
    tasks: number;
    timeEntries: number;
  };
}

interface UserManagementClientProps {
  currentUser: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  users: User[];
}

interface EditingUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function UserManagementClient({ currentUser, users }: UserManagementClientProps) {
  const t = useTranslations('users');
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportingUserId, setExportingUserId] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentExportType, setCurrentExportType] = useState<'user' | 'all' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  const canManageUsers = () => {
    return currentUser.role === 'HR' || currentUser.role === 'MANAGER';
  };

  const canResetPasswords = () => {
    return currentUser.role === 'HR' || currentUser.role === 'MANAGER';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'HR':
        return 'bg-purple-100 text-purple-800';
      case 'MANAGER':
        return 'bg-green-100 text-green-800';
      case 'EMPLOYEE':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'HR':
        return 'HR';
      case 'MANAGER':
        return 'Manager';
      case 'EMPLOYEE':
        return 'Employee';
      default:
        return role;
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser({
      id: user.id,
      name: user.name || '',
      email: user.email,
      role: user.role
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setIsUpdating(editingUser.id);

    try {
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingUser.id,
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating user:', error);
      alert(t('failedToUpdateUser'));
    } finally {
      setIsUpdating(null);
      setEditingUser(null);
    }
  };

  const handleExportTimeEntries = async (userId: string, userName: string | null, format: 'xlsx' | 'csv' | 'json' | 'pdf' = 'xlsx', dateParams = { startDate: '', endDate: '' }) => {
    setExportingUserId(userId);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('format', format);
      if (dateParams.startDate) params.append('startDate', dateParams.startDate);
      if (dateParams.endDate) params.append('endDate', dateParams.endDate);
      
      // Use different endpoint for PDF
      const endpoint = format === 'pdf' 
        ? `/api/users/${userId}/export-pdf?${params.toString()}`
        : `/api/users/${userId}/export?${params.toString()}`;
      
      const response = await fetch(endpoint, {
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export time entries');
      }

      if (format === 'xlsx' || format === 'pdf') {
        // Handle Excel/PDF download
        const blob = await response.blob();
        
        // Get filename from response headers
        const contentDisposition = response.headers.get('content-disposition');
        const fileExtension = format === 'pdf' ? 'pdf' : 'xlsx';
        let filename = `time-entries-${userName?.replace(/[^a-zA-Z0-9]/g, '-') || 'user'}-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Check if filename indicates no data
        if (filename.includes('_no_data')) {
          throw new Error('No data found for the selected user and date range. The exported file contains a "No Data" message.');
        }
        
      } else if (format === 'csv') {
        // Handle CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `time-entries-${userName?.replace(/[^a-zA-Z0-9]/g, '-') || 'user'}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle JSON response
        const data = await response.json();
        console.log('Export data:', data);
        // You could open in a new window or display in a modal
      }
    } catch (error) {
      console.error('Error exporting time entries:', error);
      alert(t('failedToExportTimeEntries'));
    } finally {
      setExportingUserId(null);
    }
  };

  const handleExportAllUsers = async (format: 'xlsx' | 'csv' | 'json' | 'pdf' = 'xlsx', dateParams = { startDate: '', endDate: '' }) => {
    setExportingAll(true);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (format !== 'pdf') params.append('format', format); // PDF endpoint doesn't need format param
      if (dateParams.startDate) params.append('startDate', dateParams.startDate);
      if (dateParams.endDate) params.append('endDate', dateParams.endDate);
      
      // Use different endpoint for PDF
      const endpoint = format === 'pdf' 
        ? `/api/users/export-pdf?${params.toString()}`
        : `/api/users/export?${params.toString()}`;
      
      const response = await fetch(endpoint, {
        credentials: 'include', // Include cookies for authentication
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export all users time entries');
      }

      if (format === 'xlsx' || format === 'pdf') {
        // Handle Excel/PDF download
        const blob = await response.blob();
        
        // Get filename from response headers
        const contentDisposition = response.headers.get('content-disposition');
        const fileExtension = format === 'pdf' ? 'pdf' : 'xlsx';
        let filename = `all-users-time-entries-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Check if filename indicates no data
        if (filename.includes('_no_data')) {
          throw new Error('No data found for the selected criteria. The exported file contains a "No Data" message.');
        }
        
      } else if (format === 'csv') {
        // Handle CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `all-users-time-entries-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle JSON response
        const data = await response.json();
        console.log('Export data:', data);
      }
    } catch (error) {
      console.error('Error exporting all users time entries:', error);
      alert(t('failedToExportAllUsers'));
    } finally {
      setExportingAll(false);
    }
  };

  // Export handlers
  const handleUserExportClick = (userId: string, userName: string | null) => {
    setCurrentUserId(userId);
    setCurrentUserName(userName);
    setCurrentExportType('user');
    setShowExportModal(true);
  };

  const handleAllUsersExportClick = () => {
    setCurrentExportType('all');
    setShowExportModal(true);
  };

  const handleModalExport = async (startDate?: string, endDate?: string, format: 'xlsx' | 'pdf' = 'xlsx') => {
    const dateParams = { startDate: startDate || '', endDate: endDate || '' };
    
    try {
      if (currentExportType === 'user' && currentUserId) {
        await handleExportTimeEntries(currentUserId, currentUserName, format, dateParams);
      } else if (currentExportType === 'all') {
        await handleExportAllUsers(format, dateParams);
      }
    } catch (error) {
      // Re-throw the error so the modal can handle it
      throw error;
    } finally {
      // Reset state
      setCurrentExportType(null);
      setCurrentUserId(null);
      setCurrentUserName(null);
    }
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    if (!confirm(`Send password reset link to ${userEmail}?`)) return;
    
    setResetPasswordLoading(userId);
    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('✅ Password reset link sent successfully!');
      } else {
        alert(`❌ ${data.error || 'Failed to send reset link'}`);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      alert('❌ Error sending reset link');
    } finally {
      setResetPasswordLoading(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManageUsers()) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.924-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">{t('accessDenied')}</h3>
            <p className="text-red-700">{t('noPermissionMessage')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('userManagement')}</h1>
            <p className="text-gray-600 mt-2">
              {t('manageUserAccounts')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleAllUsersExportClick()}
              disabled={exportingAll}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 border border-transparent rounded-lg shadow-sm hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-pink-600 transition-all duration-200 transform hover:scale-105 disabled:transform-none"
            >
              {exportingAll ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('generatingExcel')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t('exportAllUsers')}
                </>
              )}
            </button>
            <div className="text-sm text-gray-500">
              {users.length} {t('totalUsers')}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6">
          <div className="relative">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="theme-card rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: 'var(--card-border)' }}>
            <thead style={{ backgroundColor: 'var(--hover-bg)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                  {t('user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                  {t('role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                  {t('activity')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="theme-card divide-y" style={{ borderColor: 'var(--card-border)' }}>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="theme-hover transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {(user.name || user.email)[0].toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium theme-text-primary">
                          {user.name || t('unnamedUser')}
                        </div>
                        <div className="text-sm theme-text-secondary">
                          {user.email}
                        </div>
                        {user.id === currentUser.id && (
                          <div className="text-xs text-blue-600 font-medium">
                            {t('you')}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm theme-text-secondary">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {user._count.tasks} {t('tasks')}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {user._count.timeEntries} {t('entries')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-lg shadow-sm hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleUserExportClick(user.id, user.name)}
                        disabled={exportingUserId === user.id}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 border border-transparent rounded-lg shadow-sm hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-600 disabled:hover:to-emerald-600 transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                      >
                        {exportingUserId === user.id ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('exporting')}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {t('exportExcel')}
                          </>
                        )}
                      </button>
                      {canResetPasswords() && (
                        <button
                          onClick={() => handleResetPassword(user.id, user.email)}
                          disabled={resetPasswordLoading === user.id}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 border border-transparent rounded-lg shadow-sm hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-orange-600 disabled:hover:to-red-600 transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                        >
                          {resetPasswordLoading === user.id ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sending...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v-2L4.257 10.257a6 6 0 017.743-7.743L15 7zm-6 6l6.707-6.707" />
                              </svg>
                              Reset Password
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noUsersFound')}</h3>
            <p className="text-gray-600">{t('adjustSearchCriteria')}</p>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('editUser')}</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('fullNamePlaceholder')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('emailPlaceholder')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="EMPLOYEE">{t('employee')}</option>
                  <option value="MANAGER">{t('manager')}</option>
                  <option value="HR">{t('hr')}</option>
                </select>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveUser}
                disabled={isUpdating === editingUser.id}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 border border-transparent rounded-lg shadow-sm hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-600 disabled:hover:to-emerald-600 transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                {isUpdating === editingUser.id ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('saveChanges')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isVisible={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setCurrentExportType(null);
          setCurrentUserId(null);
          setCurrentUserName(null);
        }}
        onExport={handleModalExport}
        title={currentExportType === 'all' ? t('exportAllUsers') : t('exportUserData')}
      />
    </div>
  );
}