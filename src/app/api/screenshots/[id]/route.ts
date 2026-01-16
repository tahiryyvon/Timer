import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the screenshot to delete
    const screenshot = await prisma.screenshot.findUnique({
      where: { id },
      include: {
        user: true,
        timeEntry: true,
      },
    });

    if (!screenshot) {
      return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
    }

    // Check permissions: HR/Manager can delete any, employee can only delete their own
    const canDelete = currentUser.role === 'HR' || 
                     currentUser.role === 'MANAGER' || 
                     screenshot.userId === currentUser.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the screenshot file from the filesystem
    try {
      const filePath = join(process.cwd(), 'public', 'screenshots', screenshot.filename);
      await unlink(filePath);
    } catch (fileError) {
      console.error('Error deleting screenshot file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete the screenshot and its associated time entry
    // Using transaction to ensure both are deleted together
    await prisma.$transaction(async (tx) => {
      // Delete the screenshot first
      await tx.screenshot.delete({
        where: { id },
      });

      // Delete the associated time entry
      await tx.timeEntry.delete({
        where: { id: screenshot.timeEntryId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting screenshot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}