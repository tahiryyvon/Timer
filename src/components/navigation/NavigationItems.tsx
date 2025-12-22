'use client';

import { useTranslations } from '@/components/providers/TranslationProvider';
import { HomeIcon, ClipboardDocumentListIcon, ClockIcon, UsersIcon } from '@heroicons/react/24/outline';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface NavigationItemsProps {
  userRole?: string;
}

export function useNavigationItems({ userRole }: NavigationItemsProps): NavigationItem[] {
  const t = useTranslations('navigation');

  const navigation: NavigationItem[] = [
    { name: t('dashboard'), href: '/dashboard', icon: HomeIcon },
    { name: t('tasks'), href: '/tasks', icon: ClipboardDocumentListIcon },
    { name: t('timeEntries'), href: '/time-entries', icon: ClockIcon },
  ];

  // Add Users management for HR and Manager roles
  if (userRole === 'HR' || userRole === 'MANAGER') {
    navigation.push({ name: t('users'), href: '/users', icon: UsersIcon });
  }

  return navigation;
}