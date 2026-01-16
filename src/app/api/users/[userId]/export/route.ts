import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Await the params since they're now a Promise in Next.js 15+
    const { userId } = await params;
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get current user with role
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to export (HR or Manager)
    if (!['HR', 'MANAGER'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only HR and Manager users can export time entries.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get target user information
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Fetch time entries with related task data
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: userId,
        ...(Object.keys(dateFilter).length > 0 && { startTime: dateFilter })
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            description: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    // Calculate totals
    const totalHours = timeEntries.reduce((sum, entry) => {
      if (entry.endTime) {
        const duration = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }
      return sum;
    }, 0);

    const exportData = {
      user: targetUser,
      timeEntries: timeEntries.map(entry => ({
        id: entry.id,
        taskTitle: entry.task?.title || 'No Task',
        taskDescription: entry.task?.description || '',
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.endTime 
          ? ((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60)).toFixed(2)
          : 'In Progress'
      })),
      summary: {
        totalEntries: timeEntries.length,
        totalHours: totalHours.toFixed(2),
        dateRange: {
          start: startDate || 'All time',
          end: endDate || 'All time'
        }
      }
    };

    if (format === 'json') {
      return NextResponse.json(exportData);
    }

    // Generate Excel file (default format)
    if (format === 'xlsx' || format === 'excel') {
      const workbook = XLSX.utils.book_new();

      // Create user info header
      const userInfo = [
        { 'Field': 'USER INFORMATION', 'Value': '' },
        { 'Field': 'Name:', 'Value': targetUser.name || 'N/A' },
        { 'Field': 'Email:', 'Value': targetUser.email },
        { 'Field': 'Role:', 'Value': targetUser.role },
        { 'Field': 'Export Date:', 'Value': new Date().toLocaleString() },
        { 'Field': 'Total Entries:', 'Value': exportData.summary.totalEntries.toString() },
        { 'Field': 'Total Hours:', 'Value': exportData.summary.totalHours },
        { 'Field': 'Date Range:', 'Value': `${exportData.summary.dateRange.start} to ${exportData.summary.dateRange.end}` },
        { 'Field': '', 'Value': '' },
        { 'Field': 'TIME ENTRIES', 'Value': '' }
      ];

      // Format time entries for Excel
      const timeEntriesForExcel = exportData.timeEntries.map(entry => ({
        'Task Title': entry.taskTitle,
        'Task Description': entry.taskDescription,
        'Start Time': new Date(entry.startTime).toLocaleString(),
        'End Time': entry.endTime ? new Date(entry.endTime).toLocaleString() : 'In Progress',
        'Duration (Hours)': entry.duration
      }));

      // Combine user info and time entries
      const sheetData = [...userInfo, ...timeEntriesForExcel];

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(sheetData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 20 }, // Field/Task Title
        { wch: 35 }, // Value/Task Description
        { wch: 20 }, // Start Time
        { wch: 20 }, // End Time
        { wch: 15 }  // Duration
      ];

      // Add the sheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, `${targetUser.name || 'User'} Time Entries`);

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="time-entries-${targetUser.name?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    }

    // Generate CSV for backward compatibility
    if (format === 'csv') {
      const csvHeaders = [
        'Entry ID',
        'Task Title',
        'Task Description',
        'Start Time',
        'End Time',
        'Duration (Hours)'
      ];

      const csvRows = exportData.timeEntries.map(entry => [
        entry.id,
        `"${entry.taskTitle}"`,
        `"${entry.taskDescription}"`,
        new Date(entry.startTime).toLocaleString(),
        entry.endTime ? new Date(entry.endTime).toLocaleString() : 'In Progress',
        entry.duration
      ]);

      const csvContent = [
        `# Time Entries Export for ${targetUser.name} (${targetUser.email})`,
        `# Role: ${targetUser.role}`,
        `# Export Date: ${new Date().toLocaleString()}`,
        `# Total Entries: ${exportData.summary.totalEntries}`,
        `# Total Hours: ${exportData.summary.totalHours}`,
        `# Date Range: ${exportData.summary.dateRange.start} to ${exportData.summary.dateRange.end}`,
        '',
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="time-entries-${targetUser.name?.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to export time entries', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}