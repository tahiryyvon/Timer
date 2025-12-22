import { NextRequest, NextResponse } from 'next/server';
import { requireDeletePermission } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    // Check if user has permission to manage users (HR or MANAGER only)
    const { response } = await requireDeletePermission();
    
    if (response) {
      return response;
    }

    const { id, name, email, role } = await request.json();

    if (!id || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['EMPLOYEE', 'MANAGER', 'HR'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be EMPLOYEE, MANAGER, or HR' },
        { status: 400 }
      );
    }

    // Check if the email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && existingUser.id !== id) {
      return NextResponse.json(
        { error: 'Email is already taken by another user' },
        { status: 400 }
      );
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name || null,
        email,
        role: role as 'EMPLOYEE' | 'MANAGER' | 'HR'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}