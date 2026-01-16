import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  console.log('=== EXPORT API CALLED ===');
  try {
    console.log('Export excel endpoint called');
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'EXISTS' : 'NULL');
    console.log('User email:', session?.user?.email || 'NO EMAIL');

    if (!session?.user?.email) {
      console.log('No session or email found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters for filtering
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build where clause for date filtering
    const whereClause: {
      userId: string;
      startTime?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      userId: user.id,
    };

    if (startDate || endDate) {
      whereClause.startTime = {};
      if (startDate) {
        whereClause.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.startTime.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    // Fetch time entries with task information
    const timeEntries = await prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        task: {
          select: {
            title: true,
            description: true,
            status: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    console.log(`Found ${timeEntries.length} time entries for export`);

    // Check if no data found
    if (timeEntries.length === 0) {
      console.log('No time entries found for the specified criteria');
      
      // Create an empty Excel file with headers and a "No Data" message
      const emptyData = [{
        'Task Title': 'No data found',
        'Task Description': 'No time entries match your filter criteria',
        'Task Status': '-',
        'Start Time': '-',
        'End Time': '-',
        'Duration': '-',
        'Duration (Hours)': '-',
        'Date': '-',
        'Status': '-',
      }];

      // Create workbook and worksheet with the "no data" message
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(emptyData);

      // Set column widths
      const columnWidths = [
        { wch: 25 }, // Task Title
        { wch: 40 }, // Task Description
        { wch: 12 }, // Task Status
        { wch: 20 }, // Start Time
        { wch: 20 }, // End Time
        { wch: 10 }, // Duration
        { wch: 15 }, // Duration (Hours)
        { wch: 12 }, // Date
        { wch: 12 }, // Status
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries');

      // Generate filename with date range
      let filename = `time-entries`;
      if (startDate && endDate) {
        filename += `_${startDate}_to_${endDate}`;
      } else if (startDate) {
        filename += `_from_${startDate}`;
      } else if (endDate) {
        filename += `_until_${endDate}`;
      } else {
        filename += `_${new Date().toISOString().split('T')[0]}`;
      }
      filename += '_no_data.xlsx';

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx' 
      });

      // Return Excel file with no data message
      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Format data for Excel (only if we have data)
    const excelData = timeEntries.map((entry) => {
      const formatTime = (timeInSeconds: number) => {
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = timeInSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };

      return {
        'Task Title': entry.task.title,
        'Task Description': entry.task.description || '',
        'Task Status': entry.task.status,
        'Start Time': entry.startTime.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
        'End Time': entry.endTime 
          ? entry.endTime.toLocaleString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
          : 'Active',
        'Duration': formatTime(entry.totalSeconds),
        'Duration (Hours)': (entry.totalSeconds / 3600).toFixed(2),
        'Date': entry.startTime.toLocaleDateString('en-US'),
        'Status': entry.isActive ? 'Active' : 'Completed',
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Task Title
      { wch: 40 }, // Task Description
      { wch: 12 }, // Task Status
      { wch: 20 }, // Start Time
      { wch: 20 }, // End Time
      { wch: 10 }, // Duration
      { wch: 15 }, // Duration (Hours)
      { wch: 12 }, // Date
      { wch: 12 }, // Status
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries');

    // Generate filename with date range
    let filename = `time-entries`;
    if (startDate && endDate) {
      filename += `_${startDate}_to_${endDate}`;
    } else if (startDate) {
      filename += `_from_${startDate}`;
    } else if (endDate) {
      filename += `_until_${endDate}`;
    } else {
      filename += `_${new Date().toISOString().split('T')[0]}`;
    }
    filename += '.xlsx';

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}