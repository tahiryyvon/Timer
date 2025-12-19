# Profile Settings Setup Instructions

## Installation Required

To complete the profile settings functionality, you need to install bcryptjs:

```bash
npm install bcryptjs @types/bcryptjs
```

**Note:** If you encounter PowerShell execution policy issues, you can either:
1. Run the command in Command Prompt (cmd) instead of PowerShell
2. Or set the execution policy: `Set-ExecutionPolicy RemoteSigned` (run PowerShell as Administrator)

## Features Implemented

✅ **Profile Settings Page** (`/profile`)
- Complete profile management interface
- Edit name and email
- View current role
- Modern, responsive design

✅ **Profile Update API** (`/api/profile`)
- GET: Fetch current user profile
- PUT: Update user profile (name, email)
- Email validation and duplicate checking
- Full error handling

✅ **Password Change API** (`/api/profile/password`)
- Secure password updating
- Current password verification
- Password strength validation
- Uses bcrypt for secure hashing

✅ **Navigation Integration**
- Profile settings link in the user dropdown menu
- Click on your name in the sidebar → "Profile Settings"

## How to Access

1. Click on your name/avatar in the sidebar (bottom left)
2. Select "Profile Settings" from the dropdown
3. Update your information and save changes

## Security Features

- Session-based authentication required
- Current password verification for password changes
- Email uniqueness validation
- Input sanitization and validation
- Secure password hashing with bcrypt

## What You Can Do

- **Update Name**: Change your display name
- **Update Email**: Change your email address (with duplicate checking)
- **Change Password**: Securely update your password
- **View Role**: See your current role (HR/Employee)

Once you install bcryptjs, the profile settings will be fully functional!