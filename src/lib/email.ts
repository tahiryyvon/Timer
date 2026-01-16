import nodemailer from 'nodemailer';

// Create transporter only if SMTP is configured
const createTransporter = async () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // For development: use Ethereal Email (temporary testing service)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 SMTP not configured, creating test account with Ethereal Email...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        console.log('📧 Test email account created:', testAccount.user);
        console.log('🌐 Preview emails at: https://ethereal.email');
        
        return nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } catch (error) {
        console.warn('Failed to create test account:', error);
        return null;
      }
    }
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: true, // Enable debug logging
    logger: true, // Log to console
  });
};

export async function sendPasswordResetEmail(email: string, token: string) {
  console.log('🔧 Email send attempt:', { to: email, token: token.substring(0, 8) + '...' });
  
  const transporter = await createTransporter();
  
  if (!transporter) {
    console.warn('❌ SMTP not configured, skipping email send');
    return { success: false, message: 'Email service not configured' };
  }
  
  console.log('✅ SMTP transporter created successfully');
  
  // Test the connection
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
  } catch (verifyError) {
    console.error('❌ SMTP connection verification failed:', verifyError);
    return { success: false, message: 'SMTP connection failed' };
  }
  
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  console.log('🔗 Reset URL:', resetUrl);
  
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Password Reset Request - Timer App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🔐 Password Reset Request</h2>
        <p>You have received this email because a password reset was requested for your Timer App account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;
                    font-weight: 500;">
            Reset Password
          </a>
        </div>
        <p><strong>This link will expire in 24 hours.</strong></p>
        <p>If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">Timer App - Time Tracking Made Simple</p>
      </div>
    `,
  };

  try {
    console.log('📧 Attempting to send email to:', email);
    console.log('📄 Email options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
    
    // If using Ethereal test account, log preview URL
    if (process.env.NODE_ENV === 'development' && info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('📧 Preview email:', previewUrl);
      }
    }
    
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: 'Failed to send email' };
  }
}