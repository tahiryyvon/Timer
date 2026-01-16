import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ReportsClient } from '@/components/reports';
import AppLayout from '@/components/layout/AppLayout';
import { ClientProviders } from '@/components/providers/ClientProviders';

async function getReportsData(userId: string) {
  // Get user with recent time entries for basic stats
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      timeEntries: {
        take: 5,
        orderBy: { startTime: 'desc' },
        include: {
          task: true
        }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Calculate time totals for summary cards
  const now = new Date();
  
  // Today's total
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  const todayEntries = await prisma.timeEntry.findMany({
    where: {
      userId: userId,
      startTime: {
        gte: startOfDay
      }
    }
  });
  
  const dailyTotal = todayEntries.reduce((sum, entry) => sum + entry.totalSeconds, 0);

  // This week's total
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const weekEntries = await prisma.timeEntry.findMany({
    where: {
      userId: userId,
      startTime: {
        gte: startOfWeek
      }
    }
  });
  
  const weeklyTotal = weekEntries.reduce((sum, entry) => sum + entry.totalSeconds, 0);

  // This month's total
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const monthEntries = await prisma.timeEntry.findMany({
    where: {
      userId: userId,
      startTime: {
        gte: startOfMonth
      }
    }
  });
  
  const monthlyTotal = monthEntries.reduce((sum, entry) => sum + entry.totalSeconds, 0);

  return {
    user,
    dailyTotal,
    weeklyTotal,
    monthlyTotal,
  };
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  // Get current user from database
  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!currentUser) {
    redirect('/auth/signin');
  }

  // Restrict access to HR and MANAGER roles only
  if (currentUser.role !== 'HR' && currentUser.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  // Get all users for the dropdown
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Get initial reports data for the current user
  const reportsData = await getReportsData(currentUser.id);

  return (
    <ClientProviders>
      <AppLayout user={{ name: currentUser.name || undefined, email: currentUser.email, role: currentUser.role || undefined }}>
        <ReportsClient 
          currentUser={currentUser}
          allUsers={allUsers}
          initialReportsData={{
            user: reportsData.user,
            dailyTotal: reportsData.dailyTotal,
            weeklyTotal: reportsData.weeklyTotal,
            monthlyTotal: reportsData.monthlyTotal,
          }}
        />
      </AppLayout>
    </ClientProviders>
  );
}