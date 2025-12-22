import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import { requireDeletePermission, canAccessTask } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get task with time entries
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: user.id
      },
      include: {
        timeEntries: {
          orderBy: {
            startTime: 'desc'
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task
    });

  } catch (error) {
    console.error('Error fetching task details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // Check if user has delete permissions (HR or MANAGER only)
    const { user, response } = await requireDeletePermission();
    
    if (response) {
      return response;
    }

    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Check if the task exists and if user can access it
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        timeEntries: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if user can access this task
    const canAccess = await canAccessTask(user!.id, taskId);
    
    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own tasks unless you are HR or Manager.' },
        { status: 403 }
      );
    }

    // Delete all associated time entries first (due to foreign key constraints)
    await prisma.timeEntry.deleteMany({
      where: { taskId: taskId }
    });

    // Delete the task
    await prisma.task.delete({
      where: { id: taskId }
    });

    return NextResponse.json({
      success: true,
      message: 'Task and all associated time entries have been deleted successfully',
      deletedTask: {
        id: task.id,
        title: task.title,
        owner: task.user.name || task.user.email,
        timeEntriesDeleted: task.timeEntries.length
      }
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}