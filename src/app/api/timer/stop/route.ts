import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user by email first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find active time entry for the current user
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        endTime: null,
      },
    });

    if (!activeEntry) {
      return NextResponse.json({ error: 'No active timer found' }, { status: 404 });
    }

    // Stop the timer
    const now = new Date();
    const startTime = new Date(activeEntry.startTime);
    const totalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    const stoppedEntry = await prisma.timeEntry.update({
      where: { id: activeEntry.id },
      data: {
        endTime: now,
        totalSeconds,
        isActive: false,
      },
      include: {
        task: {
          select: {
            title: true,
          },
        },
      },
    });

    return NextResponse.json(stoppedEntry);

  } catch (error) {
    console.error('Timer stop error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}