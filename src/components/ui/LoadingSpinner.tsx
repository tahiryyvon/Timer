'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}></div>
  );
}

interface PageLoadingProps {
  route?: string | null;
}

export function PageLoading({ route }: PageLoadingProps) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <div className="relative">
          <LoadingSpinner size="lg" />
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-blue-300 opacity-30"></div>
        </div>
        <div className="text-center">
          <div className="text-gray-900 font-semibold text-lg mb-2">
            {route ? `Loading ${route}...` : 'Loading...'}
          </div>
          <div className="text-gray-500 text-sm">
            Please wait a moment
          </div>
        </div>
      </div>
    </div>
  );
}

export function NavigationLoading({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 bg-opacity-95 rounded-lg flex items-center justify-center backdrop-blur-sm">
      <div className="flex items-center space-x-2">
        <LoadingSpinner size="sm" />
        <span className="text-blue-700 text-sm font-medium">Loading...</span>
      </div>
    </div>
  );
}