import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
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
    if (!['HR', 'MANAGER'].includes(currentUser.role as string)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only HR and Manager users can export time entries.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Fetch all users with their time entries
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        timeEntries: {
          where: {
            ...(Object.keys(dateFilter).length > 0 && { startTime: dateFilter })
          },
          include: {
            task: {
              select: {
                title: true,
                description: true
              }
            }
          },
          orderBy: {
            startTime: 'desc'
          }
        }
      }
    });

    console.log(`Found ${users.length} users for export`);

    // Check if no users found
    if (users.length === 0) {
      console.log('No users found for export');
      
      if (format === 'json') {
        return NextResponse.json({ 
          users: [], 
          exportDate: new Date().toISOString(),
          message: 'No users found'
        });
      }

      // Create empty Excel with message
      const workbook = XLSX.utils.book_new();
      const emptyData = [{
        'Message': 'No users found',
        'Details': 'No users match your export criteria',
        'Export Date': new Date().toLocaleString()
      }];

      const worksheet = XLSX.utils.json_to_sheet(emptyData);
      worksheet['!cols'] = [
        { wch: 25 }, // Message
        { wch: 40 }, // Details  
        { wch: 20 }  // Export Date
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'No Data');

      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx' 
      });

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="users_export_no_data.xlsx"',
          'Cache-Control': 'no-cache',
        },
      });
    }

    if (format === 'json') {
      return NextResponse.json({ users, exportDate: new Date().toISOString() });
    }

    // Generate Excel workbook with one sheet per user
    if (format === 'excel' || format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      let totalHours = 0;
      let totalEntries = 0;

      // First pass to calculate totals
      users.forEach(user => {
        user.timeEntries.forEach(entry => {
          if (entry.endTime) {
            const duration = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
            totalHours += duration;
          }
          totalEntries++;
        });
      });

      // Create summary sheet first
      const summaryData = [
        { 'Metric': 'EXPORT SUMMARY', 'Value': '', 'Details': '' },
        { 'Metric': 'Export Date:', 'Value': new Date().toLocaleString(), 'Details': '' },
        { 'Metric': 'Total Users:', 'Value': users.length.toString(), 'Details': '' },
        { 'Metric': 'Total Entries:', 'Value': totalEntries.toString(), 'Details': '' },
        { 'Metric': 'Total Hours:', 'Value': totalHours.toFixed(2), 'Details': '' },
        { 'Metric': 'Date Range:', 'Value': `${startDate || 'All time'} to ${endDate || 'All time'}`, 'Details': '' },
        { 'Metric': '', 'Value': '', 'Details': '' },
        { 'Metric': 'USER BREAKDOWN', 'Value': '', 'Details': '' },
        ...users.map(user => {
          const userHours = user.timeEntries.reduce((sum, entry) => {
            if (entry.endTime) {
              const duration = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
              return sum + duration;
            }
            return sum;
          }, 0);
          return {
            'Metric': user.name || user.email,
            'Value': `${user.timeEntries.length} entries`,
            'Details': `${userHours.toFixed(2)} hours`
          };
        })
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [
        { wch: 25 }, // Metric
        { wch: 20 }, // Value
        { wch: 20 }  // Details
      ];

      // Add summary sheet first
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

      // Create a sheet for each user
      const usedSheetNames = new Set(['Summary']); // Track used names to avoid duplicates
      
      users.forEach((user) => {
        const userTimeEntries = user.timeEntries.map(entry => {
          const duration = entry.endTime 
            ? ((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60))
            : 0;

          return {
            'Task Title': entry.task?.title || 'No Task',
            'Task Description': entry.task?.description || '',
            'Start Time': new Date(entry.startTime).toLocaleString(),
            'End Time': entry.endTime ? new Date(entry.endTime).toLocaleString() : 'In Progress',
            'Duration (Hours)': entry.endTime ? duration.toFixed(2) : 'In Progress'
          };
        });

        // Calculate user totals
        const userTotalHours = user.timeEntries.reduce((sum, entry) => {
          if (entry.endTime) {
            const duration = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
            return sum + duration;
          }
          return sum;
        }, 0);

        // Create user info header with better structure
        const userInfo = [
          { 'Task Title': `${user.name || user.email.split('@')[0]} - TIME ENTRIES`, 'Task Description': '', 'Start Time': '', 'End Time': '', 'Duration (Hours)': '' },
          { 'Task Title': '', 'Task Description': '', 'Start Time': '', 'End Time': '', 'Duration (Hours)': '' },
          { 'Task Title': 'USER INFO:', 'Task Description': '', 'Start Time': '', 'End Time': '', 'Duration (Hours)': '' },
          { 'Task Title': 'Name: ' + (user.name || 'N/A'), 'Task Description': '', 'Start Time': '', 'End Time': '', 'Duration (Hours)': '' },
          { 'Task Title': 'Email: ' + user.email, 'Task Description': '', 'Start Time': '', 'End Time': '', 'Duration (Hours)': '' },
          { 'Task Title': 'Role: ' + user.role, 'Task Description': '', 'Start Time': '', 'End Time': '', 'Duration (Hours)': '' },
          { 'Task Title': 'Total Entries: ' + user.timeEntries.length.toString(), 'Task Description': '', 'Start Time': '', 'End Time': '', 'Duration (Hours)': '' },
          { 'Task Title': 'Total Hours: ' + userTotalHours.toFixed(2), 'Task Description': '', 'Start Time': '', 'End Time': '', 'Duration (Hours)': '' },
          { 'Task Title': '', 'Task Description': '', 'Start Time': '', 'End Time': '', 'Duration (Hours)': '' },
          { 'Task Title': '--- TIME ENTRIES ---', 'Task Description': '', 'Start Time': '', 'End Time': '', 'Duration (Hours)': '' }
        ];

        // Combine user info and time entries
        const sheetData = [...userInfo, ...userTimeEntries];

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(sheetData);

        // Set column widths
        worksheet['!cols'] = [
          { wch: 30 }, // Task Title
          { wch: 35 }, // Task Description
          { wch: 20 }, // Start Time
          { wch: 20 }, // End Time
          { wch: 15 }  // Duration
        ];

        // Create safe sheet name (Excel limit: 31 chars, no special characters)
        const baseSheetName = (user.name || user.email.split('@')[0])
          .replace(/[\\\/\?\*\[\]:]/g, '_') // Remove invalid Excel sheet name characters
          .substring(0, 28); // Leave room for potential suffix

        // Ensure unique sheet name
        let sheetName = baseSheetName;
        let counter = 1;
        while (usedSheetNames.has(sheetName)) {
          const suffix = `_${counter}`;
          sheetName = baseSheetName.substring(0, 31 - suffix.length) + suffix;
          counter++;
        }
        usedSheetNames.add(sheetName);

        // Add the sheet to workbook with safe, unique name
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="all-users-time-entries-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    }

    // Fallback to CSV for backward compatibility
    if (format === 'csv') {
      const csvHeaders = [
        'User Name',
        'User Email',
        'User Role',
        'Task Title',
        'Task Description',
        'Start Time',
        'End Time',
        'Duration (Hours)'
      ];

      const csvRows: string[] = [];
      let totalHours = 0;
      let totalEntries = 0;

      users.forEach(user => {
        user.timeEntries.forEach(entry => {
          const duration = entry.endTime 
            ? ((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60))
            : 0;
          
          if (entry.endTime) {
            totalHours += duration;
          }
          totalEntries++;

          csvRows.push([
            `"${user.name || ''}"`,
            `"${user.email}"`,
            user.role,
            `"${entry.task?.title || 'No Task'}"`,
            `"${entry.task?.description || ''}"`,
            new Date(entry.startTime).toLocaleString(),
            entry.endTime ? new Date(entry.endTime).toLocaleString() : 'In Progress',
            entry.endTime ? duration.toFixed(2) : 'In Progress'
          ].join(','));
        });
      });

      const csvContent = [
        '# All Users Time Entries Export',
        `# Export Date: ${new Date().toLocaleString()}`,
        `# Total Users: ${users.length}`,
        `# Total Entries: ${totalEntries}`,
        `# Total Hours: ${totalHours.toFixed(2)}`,
        `# Date Range: ${startDate || 'All time'} to ${endDate || 'All time'}`,
        '',
        csvHeaders.join(','),
        ...csvRows
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="all-users-time-entries-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });

  } catch (error) {
    console.error('Export all error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to export all time entries', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}