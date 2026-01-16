import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params in Next.js 16
    const { userId } = await params;

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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

    return NextResponse.json({
      user,
      dailyTotal,
      weeklyTotal,
      monthlyTotal,
    });

  } catch (error) {
    console.error('Error fetching user reports data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}