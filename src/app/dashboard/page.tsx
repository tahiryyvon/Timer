import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import AppLayout from '@/components/layout/AppLayout';
import DashboardClient from '@/components/dashboard/DashboardClient';

interface TimeEntry {
  id: string;
  startTime: Date;
  endTime: Date | null;
  totalSeconds: number;
  isActive: boolean;
  userId: string;
  taskId: string;
  task: Task;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  userId: string;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      timeEntries: {
        include: {
          task: true,
        },
        orderBy: {
          startTime: 'desc',
        },
      },
    },
  });

  if (!user) {
    return <div>User not found.</div>;
  }

  const activeTimeEntry = user.timeEntries.find((entry: TimeEntry) => entry.isActive);

  const dailyTotal = user.timeEntries
    .filter((entry: TimeEntry) => new Date(entry.startTime).toDateString() === new Date().toDateString())
    .reduce((acc: number, entry: TimeEntry) => acc + entry.totalSeconds, 0);

  const weeklyTotal = user.timeEntries
    .filter((entry: TimeEntry) => {
      const entryDate = new Date(entry.startTime);
      const today = new Date();
      const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      return entryDate >= firstDayOfWeek;
    })
    .reduce((acc: number, entry: TimeEntry) => acc + entry.totalSeconds, 0);

  const monthlyTotal = user.timeEntries
    .filter((entry: TimeEntry) => new Date(entry.startTime).getMonth() === new Date().getMonth())
    .reduce((acc: number, entry: TimeEntry) => acc + entry.totalSeconds, 0);

  return (
    <AppLayout user={{ name: user.name || undefined, email: user.email, role: user.role || undefined }}>
      <DashboardClient
        user={user}
        activeTimeEntry={activeTimeEntry}
        dailyTotal={dailyTotal}
        weeklyTotal={weeklyTotal}
        monthlyTotal={monthlyTotal}
      />
    </AppLayout>
  );
}
