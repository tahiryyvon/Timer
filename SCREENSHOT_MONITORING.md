# Screenshot Monitoring Feature

## Overview
The screenshot monitoring system automatically captures employee screens at random intervals (2-10 minutes) during active work sessions to ensure productivity and provide accountability.

## Features

### 🔄 **Automatic Screenshot Capture**
- Random screenshots taken every 2-10 minutes during active timers
- Screenshots are automatically saved to the server
- No manual intervention required from employees

### 📱 **Screenshots Management Page**
- **Location**: `/screenshots` in the navigation menu
- **Access Control**: 
  - Employees: Can only view their own screenshots
  - HR/Managers: Can view all employees' screenshots with user filtering

### 🗑️ **Screenshot Deletion**
- **Employee Access**: Can delete their own screenshots
- **HR/Manager Access**: Can delete any screenshot
- **Important**: Deleting a screenshot also deletes the associated time entry

### 🔐 **Permission System**
- Uses Screen Capture API for screenshot capture
- Requires user permission (one-time browser permission)
- Permission requested automatically when timer starts
- Safe fallback if permission is denied

## Technical Implementation

### Database Schema
```sql
Screenshot {
  id          String      @id @default(cuid())
  filename    String      // Path to screenshot file on server
  capturedAt  DateTime    @default(now())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  timeEntryId String
  timeEntry   TimeEntry   @relation(fields: [timeEntryId], references: [id], onDelete: Cascade)
}
```

### API Endpoints
- `POST /api/screenshots/capture` - Capture and save screenshot
- `DELETE /api/screenshots/[id]` - Delete screenshot and associated time entry

### File Storage
- Screenshots saved to `/public/screenshots/` directory
- Filename format: `screenshot_{userId}_{timestamp}.png`
- Optimized PNG format with 80% quality for storage efficiency

## User Experience

### For Employees
1. **Timer Start**: Permission requested for screen sharing (one-time)
2. **During Work**: Screenshots captured automatically and silently
3. **Screenshots Page**: View their own captured screenshots
4. **Deletion**: Can delete their own screenshots (removes time entry too)

### For HR/Managers
1. **Full Access**: View all employee screenshots
2. **User Filter**: Filter screenshots by specific employees
3. **Management**: Delete any screenshot as needed
4. **Oversight**: Monitor employee activity through captured screenshots

## Privacy & Compliance

### What's Captured
- Screen content during active work sessions only
- Only when timer is running
- Random intervals to balance monitoring with privacy

### What's NOT Captured
- Audio or microphone input
- Screenshots when timer is stopped/paused
- Screenshots outside of work sessions
- Personal information beyond screen content

### Data Retention
- Screenshots are stored indefinitely until manually deleted
- Employees can delete their own screenshots
- HR/Managers have full deletion control
- File cleanup handled automatically when records are deleted

## Security Features

### Access Control
- Role-based screenshot visibility
- Employee data isolation (can only see own screenshots)
- Secure file upload and storage
- Permission validation on all operations

### Error Handling
- Graceful fallback when permissions denied
- Automatic retry logic for failed captures
- User-friendly error messages
- No system disruption if screenshot capture fails

## Translation Support
- Full multi-language support (English, French, German)
- Localized UI text and messages
- Consistent with application's translation system

## Future Enhancements
- Screenshot blur for privacy-sensitive content
- Configurable capture intervals per user/role
- Screenshot analytics and reporting
- Bulk operations for screenshot management
- Automatic cleanup based on age/storage limits