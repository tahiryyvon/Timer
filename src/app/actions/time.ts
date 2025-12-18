'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function startTimer(userId: string, taskId?: string) {
  const activeTimeEntry = await prisma.timeEntry.findFirst({
    where: {
      userId,
      isActive: true,
    },
  });

  if (activeTimeEntry) {
    // Stop the current timer before starting a new one
    await stopTimer(userId, activeTimeEntry.id);
  }

  let finalTaskId: string = taskId || '';
  
  // If no taskId provided, create or find a default task
  if (!taskId) {
    let defaultTask = await prisma.task.findFirst({
      where: {
        userId,
        title: 'General Work'
      }
    });

    if (!defaultTask) {
      defaultTask = await prisma.task.create({
        data: {
          userId,
          title: 'General Work',
          description: 'Default task for time tracking',
          status: 'OPEN'
        }
      });
    }

    finalTaskId = defaultTask.id;
  }

  const timeEntry = await prisma.timeEntry.create({
    data: {
      userId,
      taskId: finalTaskId,
      startTime: new Date(),
      isActive: true,
      intervals: {
        create: {
          startTime: new Date(),
        },
      },
    },
  });

  revalidatePath('/dashboard');
  return timeEntry;
}

export async function pauseTimer(userId: string, timeEntryId: string) {
  const timeEntry = await prisma.timeEntry.findUnique({
    where: { id: timeEntryId },
    include: { intervals: true },
  });

  if (!timeEntry || !timeEntry.isActive) {
    throw new Error('No active timer to pause.');
  }

  const lastInterval = timeEntry.intervals.find((i: { endTime: Date | null }) => !i.endTime);

  if (lastInterval) {
    await prisma.timeInterval.update({
      where: { id: lastInterval.id },
      data: { endTime: new Date() },
    });
  }

  revalidatePath('/dashboard');
}

export async function resumeTimer(userId: string, timeEntryId: string) {
    const timeEntry = await prisma.timeEntry.findUnique({
        where: { id: timeEntryId },
        include: { intervals: true },
    });

    if (!timeEntry || !timeEntry.isActive) {
        throw new Error('No active timer to resume.');
    }

    const lastInterval = timeEntry.intervals.find((i: { endTime: Date | null }) => !i.endTime);
    if(lastInterval){
        throw new Error('Timer is already running.');
    }

    await prisma.timeInterval.create({
        data: {
            timeEntryId: timeEntryId,
            startTime: new Date(),
        },
    });

    revalidatePath('/dashboard');
}

export async function stopTimer(userId: string, timeEntryId: string) {
  const timeEntry = await prisma.timeEntry.findUnique({
    where: { id: timeEntryId },
    include: { intervals: true },
  });

  if (!timeEntry) {
    throw new Error('Time entry not found.');
  }

  const lastInterval = timeEntry.intervals.find((i: { endTime: Date | null }) => !i.endTime);
  let totalSeconds = 0;

  if (lastInterval) {
    await prisma.timeInterval.update({
      where: { id: lastInterval.id },
      data: { endTime: new Date() },
    });
  }
  
  const updatedTimeEntry = await prisma.timeEntry.findUnique({
    where: { id: timeEntryId },
    include: { intervals: true },
  });

  if(updatedTimeEntry){
    totalSeconds = updatedTimeEntry.intervals.reduce((acc: number, interval: { startTime: Date; endTime: Date | null; }) => {
        if (interval.endTime) {
          return acc + (interval.endTime.getTime() - interval.startTime.getTime()) / 1000;
        }
        return acc;
      }, 0);
  }


  await prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: {
      endTime: new Date(),
      isActive: false,
      totalSeconds: Math.round(totalSeconds),
    },
  });

  revalidatePath('/dashboard');
}

export async function getActiveTimeEntry(userId: string) {
  const activeTimeEntry = await prisma.timeEntry.findFirst({
    where: {
      userId,
      isActive: true,
      endTime: null,
    },
    include: {
      task: true,
    },
    orderBy: {
      startTime: 'desc',
    },
  });

  return activeTimeEntry;
}
