import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import AppLayout from '@/components/layout/AppLayout';
import { TimerButton } from '@/components/timer/TimerButton';

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

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user.name}! 👋
              </h1>
              <p className="text-gray-600 mt-2">
                Track your time efficiently and stay productive.
              </p>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">
                  {activeTimeEntry ? 'Timer Running' : 'Ready to Start'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timer Section - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Time Tracker</h2>
                <TimerButton activeTimeEntry={activeTimeEntry} userId={user.id} />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="space-y-6">
            {/* Today's Hours */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Today&apos;s Hours</p>
                  <p className="text-2xl font-bold mt-1">{formatTime(dailyTotal)}</p>
                </div>
                <div className="bg-blue-400 bg-opacity-30 rounded-lg p-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Weekly Hours */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">This Week</p>
                  <p className="text-2xl font-bold mt-1">{formatTime(weeklyTotal)}</p>
                </div>
                <div className="bg-green-400 bg-opacity-30 rounded-lg p-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Monthly Hours */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">This Month</p>
                  <p className="text-2xl font-bold mt-1">{formatTime(monthlyTotal)}</p>
                </div>
                <div className="bg-purple-400 bg-opacity-30 rounded-lg p-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
          {user.timeEntries && user.timeEntries.length > 0 ? (
            <div className="space-y-3">
              {user.timeEntries.slice(0, 5).map((entry: TimeEntry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${entry.isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{entry.task.title}</p>
                      <p className="text-sm text-gray-500">{new Date(entry.startTime).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    {formatTime(entry.totalSeconds)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No time entries yet. Start your first timer!</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}