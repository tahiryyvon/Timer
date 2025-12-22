import { NextRequest, NextResponse } from 'next/server';
import { requireDeletePermission, canAccessTimeEntry } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    // Check if user has delete permissions (HR or MANAGER only)
    const { user, response } = await requireDeletePermission();
    
    if (response) {
      return response;
    }

    const { entryId } = await params;

    if (!entryId) {
      return NextResponse.json(
        { error: 'Time entry ID is required' },
        { status: 400 }
      );
    }

    // Check if the time entry exists and get details
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id: entryId },
      include: {
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } },
        intervals: true
      }
    });

    if (!timeEntry) {
      return NextResponse.json(
        { error: 'Time entry not found' },
        { status: 404 }
      );
    }

    // Check if user can access this time entry
    const canAccess = await canAccessTimeEntry(user!.id, entryId);
    
    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own time entries unless you are HR or Manager.' },
        { status: 403 }
      );
    }

    // Delete associated intervals first (they should cascade delete, but let's be explicit)
    await prisma.timeInterval.deleteMany({
      where: { timeEntryId: entryId }
    });

    // Delete the time entry
    await prisma.timeEntry.delete({
      where: { id: entryId }
    });

    return NextResponse.json({
      success: true,
      message: 'Time entry and all associated intervals have been deleted successfully',
      deletedEntry: {
        id: timeEntry.id,
        startTime: timeEntry.startTime,
        endTime: timeEntry.endTime,
        totalSeconds: timeEntry.totalSeconds,
        task: timeEntry.task.title,
        owner: timeEntry.user.name || timeEntry.user.email,
        intervalsDeleted: timeEntry.intervals.length
      }
    });

  } catch (error) {
    console.error('Error deleting time entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}