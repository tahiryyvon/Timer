import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/options';
import prisma from '@/lib/prisma';

// Helper function to verify password (handles both plain text and hashed)
async function verifyPassword(inputPassword: string, storedPassword: string): Promise<boolean> {
  // First try plain text comparison (for existing passwords)
  if (inputPassword === storedPassword) {
    return true;
  }
  
  // If bcrypt is available and password looks hashed, try bcrypt
  try {
    const bcrypt = await import('bcryptjs');
    // Check if password looks like a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    if (storedPassword.match(/^\$2[ayb]\$.{56}$/)) {
      return await bcrypt.compare(inputPassword, storedPassword);
    }
  } catch {
    // bcrypt not available or comparison failed
  }
  
  return false;
}

// Helper function to hash password
async function hashPassword(password: string): Promise<string> {
  try {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.hash(password, 12);
  } catch {
    // bcrypt not available, store as plain text (not recommended for production)
    console.warn('bcryptjs not available. Storing password as plain text.');
    return password;
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    // Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Find current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        password: true,
      },
    });

    if (!currentUser || !currentUser.password) {
      return NextResponse.json({ error: 'User not found or password not set' }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, currentUser.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        password: hashedNewPassword,
      },
    });

    return NextResponse.json({
      message: 'Password updated successfully',
    });

  } catch (error) {
    console.error('Password update error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}