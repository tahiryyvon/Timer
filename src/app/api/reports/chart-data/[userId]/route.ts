import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Await params in Next.js 16
    const { userId } = await params;
    console.log('Chart data API called for userId:', userId);
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      console.log('No session found in chart data API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Processing chart data request for user:', userId);

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the last 30 days of time entries for charts
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Daily activity data (last 14 days for better readability)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: userId,
        startTime: {
          gte: fourteenDaysAgo,
        },
      },
      include: {
        task: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Group by date for daily activity chart
    const dailyActivity = [];
    const dateMap = new Map();

    // Initialize the last 14 days
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      dateMap.set(dateString, {
        date: dateString,
        hours: 0,
        sessions: 0,
      });
    }

    // Aggregate data by date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    timeEntries.forEach((entry: any) => {
      const dateString = entry.startTime.toISOString().split('T')[0];
      if (dateMap.has(dateString)) {
        const dayData = dateMap.get(dateString);
        dayData.hours += entry.totalSeconds / 3600;
        dayData.sessions += 1;
      }
    });

    dailyActivity.push(...Array.from(dateMap.values()));

    // Task distribution data (last 30 days)
    const taskData = await prisma.timeEntry.findMany({
      where: {
        userId: userId,
        startTime: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        task: true,
      },
    });

    // Group by task for pie chart
    const taskDistribution = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    taskData.forEach((entry: any) => {
      const taskTitle = entry.task.title;
      if (taskDistribution.has(taskTitle)) {
        taskDistribution.set(taskTitle, taskDistribution.get(taskTitle) + entry.totalSeconds);
      } else {
        taskDistribution.set(taskTitle, entry.totalSeconds);
      }
    });

    const taskChartData = Array.from(taskDistribution.entries())
      .map(([task, seconds]) => ({
        task,
        hours: seconds / 3600,
        percentage: 0, // Will be calculated below
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10); // Top 10 tasks

    // Calculate percentages
    const totalHours = taskChartData.reduce((sum, item) => sum + item.hours, 0);
    taskChartData.forEach(item => {
      item.percentage = totalHours > 0 ? (item.hours / totalHours) * 100 : 0;
    });

    // Weekly comparison (current week vs last week)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);

    const currentWeekEntries = await prisma.timeEntry.findMany({
      where: {
        userId: userId,
        startTime: {
          gte: startOfWeek,
        },
      },
    });

    const lastWeekEntries = await prisma.timeEntry.findMany({
      where: {
        userId: userId,
        startTime: {
          gte: startOfLastWeek,
          lt: startOfWeek,
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentWeekHours = currentWeekEntries.reduce((sum: number, entry: any) => sum + entry.totalSeconds, 0) / 3600;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastWeekHours = lastWeekEntries.reduce((sum: number, entry: any) => sum + entry.totalSeconds, 0) / 3600;

    const weeklyComparison = [
      { week: 'Last Week', hours: lastWeekHours },
      { week: 'This Week', hours: currentWeekHours },
    ];

    const result = {
      dailyActivity,
      taskDistribution: taskChartData,
      weeklyComparison,
      summary: {
        totalHours: totalHours,
        totalSessions: taskData.length,
        averageDailyHours: totalHours / 14,
      }
    };

    console.log('Chart data API returning:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in chart data API:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}