import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the authenticated user by email
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // Check if the user has HR or MANAGER role
    if (currentUser.role !== 'HR' && currentUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - HR or Manager role required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    console.log('All users PDF export requested');
    console.log('Date range:', { startDate, endDate });

    // Build where clause for date filtering
    const whereClause: {
      startTime?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (startDate || endDate) {
      whereClause.startTime = {};
      if (startDate) {
        whereClause.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.startTime.lte = new Date(endDate);
      }
    }

    // Get all users and their time entries
    const users = await prisma.user.findMany({
      include: {
        timeEntries: {
          where: whereClause,
          include: {
            task: true,
          },
          orderBy: {
            startTime: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`Found ${users.length} users`);

    // Filter users to only include those with time entries (if date filtering applied)
    const usersWithTimeEntries = users.filter(user => 
      !startDate && !endDate ? true : user.timeEntries.length > 0
    );

    // Check if no data found
    if (usersWithTimeEntries.length === 0) {
      console.log('No users with time entries found for the specified criteria');
      
      // Create PDF with "No Data" message
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('All Users Time Entries Report', 20, 30);
      
      // Add date range if provided
      if (startDate && endDate) {
        doc.setFontSize(12);
        doc.text(`Date Range: ${startDate} to ${endDate}`, 20, 45);
      }
      
      // Add "No Data" message
      doc.setFontSize(14);
      doc.text('No data found for the selected criteria.', 20, 70);
      doc.setFontSize(10);
      doc.text('Try adjusting your date range or check if there are any time entries.', 20, 85);
      
      const pdfBuffer = doc.output('arraybuffer');
      
      // Generate filename
      let filename = `all_users_time_entries`;
      if (startDate && endDate) {
        filename += `_${startDate}_to_${endDate}`;
      }
      filename += '_no_data.pdf';
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Create PDF with data
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('All Users Time Entries Report', 20, 30);
    
    // Add date range if provided
    if (startDate && endDate) {
      doc.setFontSize(12);
      doc.text(`Date Range: ${startDate} to ${endDate}`, 20, 45);
    }
    
    // Calculate totals
    const totalEntries = usersWithTimeEntries.reduce((sum, user) => sum + user.timeEntries.length, 0);
    const totalDuration = usersWithTimeEntries.reduce((sum, user) => 
      sum + user.timeEntries.reduce((userSum: number, entry) => userSum + entry.totalSeconds, 0), 0
    );
    const totalHours = Math.floor(totalDuration / 3600);
    const totalMinutes = Math.floor((totalDuration % 3600) / 60);
    
    doc.setFontSize(12);
    doc.text(`Total Users: ${usersWithTimeEntries.length}`, 20, startDate && endDate ? 60 : 45);
    doc.text(`Total Entries: ${totalEntries}`, 20, startDate && endDate ? 75 : 60);
    doc.text(`Total Time: ${totalHours}h ${totalMinutes}m`, 20, startDate && endDate ? 90 : 75);

    // Prepare table data - flatten all entries with user information
    const tableData: string[][] = [];
    
    for (const user of usersWithTimeEntries) {
      for (const entry of user.timeEntries) {
        const hours = Math.floor(entry.totalSeconds / 3600);
        const minutes = Math.floor((entry.totalSeconds % 3600) / 60);
        const seconds = entry.totalSeconds % 60;
        
        tableData.push([
          user.name || user.email || 'Unknown User',
          new Date(entry.startTime).toLocaleDateString(),
          entry.task?.title || 'No Task',
          entry.task?.description || '',
          `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        ]);
      }
    }

    // Create table
    autoTable(doc, {
      startY: startDate && endDate ? 100 : 85,
      head: [['User', 'Date', 'Task', 'Description', 'Duration']],
      body: tableData,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 70 },
        4: { cellWidth: 20 },
      },
    });

    const pdfBuffer = doc.output('arraybuffer');
    
    // Generate filename
    let filename = `all_users_time_entries`;
    if (startDate && endDate) {
      filename += `_${startDate}_to_${endDate}`;
    }
    filename += '.pdf';

    console.log('All users PDF export completed successfully');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('All users PDF export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}