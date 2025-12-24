'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex items-center justify-center
        h-8 w-8 rounded-full
        bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
        border border-gray-200 dark:border-gray-600
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        group
        ${className}
      `}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun Icon */}
      <SunIcon 
        className={`
          absolute h-4 w-4 text-amber-500
          transition-all duration-300 ease-in-out
          ${isDark 
            ? 'opacity-0 scale-0 rotate-180' 
            : 'opacity-100 scale-100 rotate-0'
          }
        `}
      />
      
      {/* Moon Icon */}
      <MoonIcon 
        className={`
          absolute h-4 w-4 text-slate-600 dark:text-slate-300
          transition-all duration-300 ease-in-out
          ${isDark 
            ? 'opacity-100 scale-100 rotate-0' 
            : 'opacity-0 scale-0 -rotate-180'
          }
        `}
      />
      
      {/* Subtle pulse effect */}
      <div 
        className={`
          absolute inset-0 rounded-full
          ${isDark ? 'bg-blue-500' : 'bg-amber-500'}
          opacity-0 group-hover:opacity-10
          transition-opacity duration-200
        `}
      />
    </button>
  );
}