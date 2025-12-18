import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
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

    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify the task belongs to the user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: user.id,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if there's already an active timer
    const activeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        endTime: null,
      },
    });

    // Stop any existing active timer first
    if (activeEntry) {
      const now = new Date();
      const startTime = new Date(activeEntry.startTime);
      const totalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

      await prisma.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          endTime: now,
          totalSeconds,
          isActive: false,
        },
      });
    }

    // Start new timer for the specified task
    const newTimeEntry = await prisma.timeEntry.create({
      data: {
        taskId,
        userId: user.id,
        startTime: new Date(),
        isActive: true,
        totalSeconds: 0,
      },
      include: {
        task: {
          select: {
            title: true,
          },
        },
      },
    });

    return NextResponse.json(newTimeEntry, { status: 201 });

  } catch (error) {
    console.error('Timer start error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}