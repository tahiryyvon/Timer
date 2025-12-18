import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    console.log('🌱 Seeding production database...');

    // Create a test user for production
    const user = await prisma.user.upsert({
      where: { email: 'admin@timer.com' },
      update: {},
      create: {
        email: 'admin@timer.com',
        name: 'Admin User',
        password: 'admin123', // Change this password
        role: 'HR'
      },
    });

    console.log('✅ Created user:', user.email);

    // Create a default task
    const task = await prisma.task.upsert({
      where: { id: 'default-task' },
      update: {},
      create: {
        id: 'default-task',
        title: 'General Work',
        description: 'Default task for time tracking',
        status: 'OPEN',
        userId: user.id
      }
    });

    console.log('✅ Created default task:', task.title);

    return NextResponse.json({ 
      success: true, 
      user: { email: user.email, name: user.name },
      task: { title: task.title }
    });

  } catch (error) {
    console.error('Database seeding error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed database' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}