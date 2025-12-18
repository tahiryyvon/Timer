import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

export async function GET() {
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
      include: {
        task: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return NextResponse.json({ activeEntry });
  } catch (error) {
    console.error('Failed to fetch active time entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active time entry' },
      { status: 500 }
    );
  }
}