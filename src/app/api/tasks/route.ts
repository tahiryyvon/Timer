import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { title, description, userId } = await request.json();

    // Basic validation
    if (!title || !userId) {
      return NextResponse.json(
        { error: 'Title and userId are required' },
        { status: 400 }
      );
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        userId,
        status: 'OPEN',
      },
    });

    return NextResponse.json(task, { status: 201 });

  } catch (error) {
    console.error('Task creation error:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}