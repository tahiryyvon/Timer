import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
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

    // Check if user has an active time entry
    const activeTimeEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: currentUser.id,
        isActive: true,
      },
    });

    if (!activeTimeEntry) {
      return NextResponse.json({ error: 'No active timer found' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('screenshot') as File;

    if (!file) {
      return NextResponse.json({ error: 'No screenshot file provided' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `screenshot_${currentUser.id}_${timestamp}.png`;
    
    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file to public/screenshots directory
    const filePath = join(process.cwd(), 'public', 'screenshots', filename);
    await writeFile(filePath, buffer);

    // Save screenshot record to database
    const screenshot = await prisma.screenshot.create({
      data: {
        filename,
        userId: currentUser.id,
        timeEntryId: activeTimeEntry.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      screenshot: {
        id: screenshot.id,
        filename: screenshot.filename,
        capturedAt: screenshot.capturedAt,
      }
    });
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}