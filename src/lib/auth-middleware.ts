import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

/**
 * Get authenticated user with role information
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true }
  });

  return user ? {
    id: user.id,
    email: user.email,
    role: user.role
  } : null;
}

/**
 * Check if user has permission to delete resources
 */
export function canDeleteResources(role: Role): boolean {
  return role === 'HR' || role === 'MANAGER';
}

/**
 * Middleware to check authentication
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  return { user, response: null };
}

/**
 * Middleware to check delete permissions (HR or MANAGER only)
 */
export async function requireDeletePermission() {
  const { user, response } = await requireAuth();
  
  if (response) return { user: null, response };
  
  if (!canDeleteResources(user!.role)) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Insufficient permissions. Only HR and Manager roles can delete resources.' },
        { status: 403 }
      )
    };
  }

  return { user, response: null };
}

/**
 * Check if user can access/modify a specific task
 */
export async function canAccessTask(userId: string, taskId: string, requireOwnership = false): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) return false;

  // HR and MANAGER can access any task
  if (user.role === 'HR' || user.role === 'MANAGER') {
    return true;
  }

  // If ownership is required, check if user owns the task
  if (requireOwnership) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: userId }
    });
    return !!task;
  }

  return true;
}

/**
 * Check if user can access/modify a specific time entry
 */
export async function canAccessTimeEntry(userId: string, timeEntryId: string, requireOwnership = false): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (!user) return false;

  // HR and MANAGER can access any time entry
  if (user.role === 'HR' || user.role === 'MANAGER') {
    return true;
  }

  // If ownership is required, check if user owns the time entry
  if (requireOwnership) {
    const timeEntry = await prisma.timeEntry.findFirst({
      where: { id: timeEntryId, userId: userId }
    });
    return !!timeEntry;
  }

  return true;
}