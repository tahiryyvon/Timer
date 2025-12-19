'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { TimerStartControl } from '@/components/timer/TimerStartControl';
import { ProfileDropdown } from '@/components/profile/ProfileDropdown';
import { useLoading } from '@/components/providers/LoadingProvider';
import { NavigationLoading, PageLoading } from '@/components/ui/LoadingSpinner';

interface LayoutProps {
  children: React.ReactNode;
  user?: {
    name?: string;
    email?: string;
    role?: string;
  };
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Task List', href: '/tasks', icon: ClipboardDocumentListIcon },
  { name: 'Time List', href: '/time-entries', icon: ClockIcon },
];

export default function AppLayout({ children, user }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, setIsLoading } = useLoading();

  const handleNavigation = (href: string, itemName: string) => {
    if (pathname === href) return; // Don't navigate to current page
    
    setIsLoading(true, itemName);
    router.push(href);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Global Page Loading Overlay */}
      {isLoading && <PageLoading />}
      
      {/* Mobile sidebar */}
      <div 
        className={`fixed inset-0 flex z-40 md:hidden transition-opacity duration-300 ease-linear ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div 
          className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent navigation={navigation} pathname={pathname} user={user} onNavigate={handleNavigation} isLoading={isLoading} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent navigation={navigation} pathname={pathname} user={user} onNavigate={handleNavigation} isLoading={isLoading} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow border-b border-gray-200">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900 md:hidden">
                Time Tracker
              </h1>
            </div>
            
            {/* Timer Start Control - Center, Compact for Header */}
            <div className="hidden md:flex">
              <div className="max-w-md">
                <TimerStartControl compact={true} />
              </div>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  Welcome back!
                </span>
                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">U</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50">
          {/* Mobile Timer Start Control */}
          <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
            <TimerStartControl />
          </div>
          
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ navigation, pathname, user, onNavigate, isLoading }: { 
  navigation: NavigationItem[], 
  pathname: string,
  user?: {
    name?: string;
    email?: string;
    role?: string;
  };
  onNavigate: (href: string, name: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-blue-600">
        <ClockIcon className="h-8 w-8 text-white mr-3" />
        <h1 className="text-xl font-bold text-white">TimeTracker</h1>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <div key={item.name} className="relative">
                <button
                  onClick={() => onNavigate(item.href, item.name)}
                  className={`group flex items-center px-2 py-3 text-sm font-medium rounded-lg transition-colors duration-200 w-full text-left ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                  {isActive && (
                    <ChevronRightIcon className="ml-auto h-4 w-4 text-blue-500" />
                  )}
                </button>
                <NavigationLoading isActive={isActive && isLoading} />
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer with Profile Dropdown */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <ProfileDropdown 
          userName={user?.name || user?.email || "User"} 
          userRole={user?.role || "Employee"} 
        />
      </div>
    </div>
  );
}