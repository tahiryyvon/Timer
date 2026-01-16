import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/options';
import prisma from '@/lib/prisma';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    // Check if the user has HR or MANAGER role to export other users' data
    if (currentUser.role !== 'HR' && currentUser.role !== 'MANAGER' && currentUser.id !== params.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'xlsx';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Only handle PDF format in this route
    if (format !== 'pdf') {
      return NextResponse.json({ error: 'This route only handles PDF format' }, { status: 400 });
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build where clause for date filtering
    const whereClause: {
      userId: string;
      startTime?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      userId: params.userId,
    };

    if (startDate || endDate) {
      whereClause.startTime = {};
      if (startDate) {
        whereClause.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.startTime.lte = new Date(endDate);
      }
    }

    // Get time entries with task information
    const timeEntries = await prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        task: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    console.log(`Found ${timeEntries.length} time entries for user ${targetUser.name}`);

    // Check if no data found
    if (timeEntries.length === 0) {
      console.log('No time entries found for the specified criteria');
      
      // Create PDF with "No Data" message
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text(`Time Entries Report - ${targetUser.name || targetUser.email}`, 20, 30);
      
      // Add date range if provided
      if (startDate && endDate) {
        doc.setFontSize(12);
        doc.text(`Date Range: ${startDate} to ${endDate}`, 20, 45);
      }
      
      // Add "No Data" message
      doc.setFontSize(14);
      doc.text('No data found for the selected criteria.', 20, 70);
      doc.setFontSize(10);
      doc.text('Try adjusting your date range or check if this user has any time entries.', 20, 85);
      
      const pdfBuffer = doc.output('arraybuffer');
      
      // Generate filename
      const sanitizedUserName = (targetUser.name || targetUser.email || 'user').replace(/[^a-zA-Z0-9]/g, '_');
      let filename = `time_entries_${sanitizedUserName}`;
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
    doc.text(`Time Entries Report - ${targetUser.name || targetUser.email}`, 20, 30);
    
    // Add date range if provided
    if (startDate && endDate) {
      doc.setFontSize(12);
      doc.text(`Date Range: ${startDate} to ${endDate}`, 20, 45);
    }
    
    // Add summary
    const totalDuration = timeEntries.reduce((sum: number, entry) => sum + entry.totalSeconds, 0);
    const totalHours = Math.floor(totalDuration / 3600);
    const totalMinutes = Math.floor((totalDuration % 3600) / 60);
    
    doc.setFontSize(12);
    doc.text(`Total Entries: ${timeEntries.length}`, 20, startDate && endDate ? 60 : 45);
    doc.text(`Total Time: ${totalHours}h ${totalMinutes}m`, 20, startDate && endDate ? 75 : 60);

    // Prepare table data
    const tableData = timeEntries.map((entry) => {
      const hours = Math.floor(entry.totalSeconds / 3600);
      const minutes = Math.floor((entry.totalSeconds % 3600) / 60);
      const seconds = entry.totalSeconds % 60;
      
      return [
        new Date(entry.startTime).toLocaleDateString(),
        entry.task?.title || 'No Task',
        entry.task?.description || '',
        entry.task?.status || '',
        `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      ];
    });

    // Create table
    autoTable(doc, {
      startY: startDate && endDate ? 85 : 70,
      head: [['Date', 'Task', 'Description', 'Status', 'Duration']],
      body: tableData,
      theme: 'striped',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 35 },
        2: { cellWidth: 65 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
      },
    });

    const pdfBuffer = doc.output('arraybuffer');
    
    // Generate filename
    const sanitizedUserName = (targetUser.name || targetUser.email || 'user').replace(/[^a-zA-Z0-9]/g, '_');
    let filename = `time_entries_${sanitizedUserName}`;
    if (startDate && endDate) {
      filename += `_${startDate}_to_${endDate}`;
    }
    filename += '.pdf';

    console.log('PDF export completed successfully');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}