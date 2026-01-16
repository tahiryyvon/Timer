import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('🧪 TEST EMAIL - Starting email test for:', email);

    // Send a test email
    const result = await sendPasswordResetEmail(email, 'test-token-123456789');
    
    console.log('🧪 TEST EMAIL - Result:', result);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test email sent successfully! Check your email inbox (including spam folder) and server console for details.' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: `Email failed: ${result.message}` 
      });
    }
  } catch (error) {
    console.error('🧪 TEST EMAIL - Error:', error);
    return NextResponse.json({ 
      error: `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}