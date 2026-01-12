# Password Reset Feature Setup

This document explains how to complete the setup for the password reset feature.

## 🚀 What was implemented:

1. **Reset Password Button**: Added to the user management page, visible only to HR and Manager roles
2. **Email Service**: Sends secure password reset links to users
3. **Reset Password Page**: Allows users to set a new password using the token from the email
4. **API Routes**: 
   - `/api/users/reset-password` - Generates and sends reset tokens
   - `/api/auth/reset-password` - Processes password reset with token validation
5. **Database Schema**: Added `resetToken` and `resetTokenExpiry` fields to User model

## 📋 Setup Steps:

### 1. Install Required Packages
Run these commands in your terminal (you may need to adjust PowerShell execution policy):
```bash
npm install nodemailer @types/nodemailer bcryptjs @types/bcryptjs
```

### 2. Update Database Schema
```bash
npx prisma db push
```

### 3. Configure Email Settings
Add these variables to your `.env.local` file:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Timer App <your-email@gmail.com>"
```

### 4. Gmail Setup (if using Gmail)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: Google Account → Security → 2-Step Verification → App passwords
3. Use the generated app password as `SMTP_PASS`

## 🔧 Alternative Email Providers:

### Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

### SendGrid:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

## 🎯 How it works:

1. **HR/Manager** clicks "Reset Password" button next to a user
2. System generates a secure token valid for 24 hours
3. Email with reset link is sent to the user
4. User clicks the link and enters a new password
5. Password is securely hashed and stored
6. Reset token is invalidated

## 🔐 Security Features:

- Tokens expire after 24 hours
- Tokens are cryptographically secure (32 random bytes)
- Passwords are hashed with bcrypt
- Only HR and Manager roles can initiate resets
- One-time use tokens (invalidated after successful reset)

## 🐛 Troubleshooting:

- **PowerShell execution policy**: Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- **Email not sending**: Check SMTP credentials and firewall settings
- **Token expired**: Generate a new reset link
- **Permission denied**: Ensure user has HR or Manager role

## 📱 UI Features:

- Loading states with spinners
- Confirmation dialogs before sending reset emails
- Success/error notifications
- Responsive design
- Role-based button visibility
- Professional email templates