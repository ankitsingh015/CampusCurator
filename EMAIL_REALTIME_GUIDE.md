# Email Notifications & Real-Time Updates - Implementation Guide

This document explains how the email notification and real-time update systems work in CampusCurator.

---

## 📧 Email Notification System

### Overview
The email system sends automated notifications to users for important events like drive creation, mentor assignments, synopsis reviews, evaluations, and results.

### Technology Stack
- **nodemailer** - Email sending library
- **SMTP** - Email protocol (Gmail, SendGrid, or custom SMTP server)

### Configuration

#### Environment Variables (.env)
```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM_NAME=CampusCurator
ENABLE_EMAIL_NOTIFICATIONS=true
```

#### Gmail Setup (Recommended for Development)
1. Enable 2-Factor Authentication on your Gmail account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate an "App Password" for "Mail"
4. Use this password in `EMAIL_PASSWORD`

#### Production Email Providers
For production, consider:
- **SendGrid** - 100 free emails/day
- **Mailgun** - 5,000 free emails/month
- **Amazon SES** - Pay per use
- **Custom SMTP** - Your organization's email server

---

## 🔔 In-App Notification System

### Database Model
Notifications are stored in MongoDB with the following schema:

```javascript
{
  recipient: ObjectId,        // User who receives notification
  type: String,              // Type of notification
  title: String,             // Notification title
  message: String,           // Notification message
  relatedDrive: ObjectId,    // Related drive (optional)
  relatedGroup: ObjectId,    // Related group (optional)
  actionUrl: String,         // Link to relevant page
  isRead: Boolean,           // Read status
  readAt: Date,              // When marked as read
  createdAt: Date            // Auto-expires after 30 days
}
```

### Notification Types
- `drive-created` - New project drive created
- `group-invitation` - Invited to join a group
- `member-joined` - New member joined your group
- `mentor-assigned` - Mentor assigned to group
- `synopsis-submitted` - Synopsis submitted (for mentors)
- `synopsis-reviewed` - Synopsis reviewed (for students)
- `checkpoint-reminder` - Upcoming deadline reminder
- `evaluation-published` - Evaluation results available
- `result-published` - Final results published
- `deadline-reminder` - General deadline reminder
- `general` - General notifications

---

## ⚡ Real-Time Updates (Socket.io)

### Overview
Socket.io enables instant notification delivery without page refresh.

### How It Works

#### Server-Side
```javascript
// When a notification is created
const notification = await createNotification(data);
// Automatically emits to user via Socket.io
emitToUser(userId, 'notification', notification);
```

#### Client-Side (React/Next.js)
```javascript
import { io } from 'socket.io-client';

// Connect to Socket.io server
const socket = io('http://localhost:5000');

// Join user's personal room
socket.emit('join', userId);

// Listen for notifications
socket.on('notification', (notification) => {
  // Show toast/alert
  toast.success(notification.title);
  // Update notification count
  setNotificationCount(prev => prev + 1);
});

// Listen for read updates
socket.on('notification-read', ({ notificationId }) => {
  // Update UI
  markNotificationAsRead(notificationId);
});
```

### Events

#### Client → Server
- `join` - Join user's personal notification room
- `disconnect` - Client disconnected

#### Server → Client
- `notification` - New notification received
- `notification-read` - Notification marked as read

---

## 📋 API Endpoints

### Get Notifications
```http
GET /api/notifications
Query Parameters:
  - page: Page number (default: 1)
  - limit: Items per page (default: 20)
  - unreadOnly: Show only unread (default: false)

Response:
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 3,
  "data": [...]
}
```

### Get Unread Count
```http
GET /api/notifications/unread-count

Response:
{
  "success": true,
  "count": 5
}
```

### Mark as Read
```http
PUT /api/notifications/:id/read

Response:
{
  "success": true,
  "data": { notification object }
}
```

### Mark All as Read
```http
PUT /api/notifications/read-all

Response:
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### Delete Notification
```http
DELETE /api/notifications/:id

Response:
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

### Clear Read Notifications
```http
DELETE /api/notifications/clear-read

Response:
{
  "success": true,
  "message": "Read notifications cleared successfully"
}
```

### Create Notification (Admin)
```http
POST /api/notifications
Body:
{
  "recipient": "userId" or "recipients": ["userId1", "userId2"],
  "type": "general",
  "title": "Notification Title",
  "message": "Notification message",
  "actionUrl": "/path/to/action"
}

Response:
{
  "success": true,
  "data": { notification object }
}
```

---

## 🔨 Usage Examples

### Example 1: Send Drive Creation Notification

```javascript
const { notifyDriveCreated } = require('../utils/notifications');

// In driveController.js - after creating drive
const drive = await Drive.create(driveData);

// Send notifications to all participating students
await notifyDriveCreated(
  drive._id,                    // Drive ID
  drive.name,                   // Drive name
  drive.participatingStudents,  // Array of student IDs
  true                          // Send email notifications
);
```

### Example 2: Send Mentor Assignment Notification

```javascript
const { notifyMentorAssigned } = require('../utils/notifications');

// In groupController.js - after assigning mentor
await notifyMentorAssigned(
  group._id,                    // Group ID
  group.name,                   // Group name
  group.members.map(m => m.student), // Student IDs
  mentor.name,                  // Mentor name
  true                          // Send email
);
```

### Example 3: Send Synopsis Review Notification

```javascript
const { notifySynopsisReviewed } = require('../utils/notifications');

// In synopsisController.js - after review
await notifySynopsisReviewed(
  synopsis.group,               // Group ID
  group.name,                   // Group name
  group.members.map(m => m.student), // Student IDs
  'approved',                   // Status: approved/rejected/revision-requested
  'Great work! Keep it up.',   // Feedback
  true                          // Send email
);
```

### Example 4: Send Deadline Reminder

```javascript
const { notifyDeadlineReminder } = require('../utils/notifications');

// In a scheduled job (cron)
const studentsWithPendingSubmissions = [...]; // Array of user IDs

await notifyDeadlineReminder(
  studentsWithPendingSubmissions,
  'Checkpoint Submission Reminder',
  'Mid-sem evaluation is due in 2 days. Please submit your work.',
  '/students/submit',
  true                          // Send email
);
```

---

## 📧 Email Template System

### Available Templates

All email templates are defined in `backend/utils/email.js`:

1. **welcome** - New user registration
2. **driveCreated** - New drive created
3. **groupInvitation** - Invitation to join group
4. **memberJoined** - Member joined group
5. **mentorAssigned** - Mentor assigned
6. **synopsisSubmitted** - Synopsis submitted (for mentors)
7. **synopsisApproved** - Synopsis approved
8. **synopsisRejected** - Synopsis needs revision
9. **checkpointReminder** - Checkpoint deadline reminder
10. **evaluationPublished** - Evaluation results available
11. **resultPublished** - Final results published
12. **deadlineExtended** - Deadline extension notice

### Template Structure

```javascript
emailTemplates.templateName = (params) => ({
  subject: 'Email Subject',
  message: 'Plain text message',
  html: getBaseTemplate(`
    <h2>Title</h2>
    <div class="info-box">
      <p>Information here</p>
    </div>
    <a href="..." class="button">Action Button</a>
  `)
});
```

### CSS Classes for Templates
- `.info-box` - Blue information box
- `.warning-box` - Yellow warning box
- `.success-box` - Green success box
- `.button` - Call-to-action button

---

## 🔄 Integration with Workflow

### Drive Created
```javascript
// controllers/driveController.js
exports.createDrive = async (req, res) => {
  const drive = await Drive.create(driveData);
  
  // Send notifications
  await notifyDriveCreated(
    drive._id,
    drive.name,
    drive.participatingStudents,
    true
  );
  
  res.status(201).json({ success: true, data: drive });
};
```

### Group Created
```javascript
// controllers/groupController.js
exports.createGroup = async (req, res) => {
  const group = await Group.create(groupData);
  
  // Notification sent when members join (not on creation)
  res.status(201).json({ success: true, data: group });
};
```

### Mentor Assigned
```javascript
// controllers/groupController.js
exports.assignMentor = async (req, res) => {
  const group = await Group.findByIdAndUpdate(...);
  const mentor = await User.findById(mentorId);
  
  // Notify students
  await notifyMentorAssigned(
    group._id,
    group.name,
    group.members.map(m => m.student),
    mentor.name,
    true
  );
  
  res.status(200).json({ success: true, data: group });
};
```

---

## 🛠️ Testing

### Test Email Sending (Development)

1. Create a test route:
```javascript
// routes/test.js
router.get('/test-email', async (req, res) => {
  const { sendEmail, emailTemplates } = require('../utils/email');
  
  const template = emailTemplates.welcome('Test User');
  
  await sendEmail({
    email: 'test@example.com',
    subject: template.subject,
    message: template.message,
    html: template.html
  });
  
  res.json({ success: true, message: 'Test email sent' });
});
```

2. Visit: `http://localhost:5000/api/test/test-email`

### Test Socket.io Connection

```javascript
// Simple HTML client
<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io('http://localhost:5000');
  
  socket.emit('join', 'user-id-here');
  
  socket.on('notification', (data) => {
    console.log('Notification received:', data);
  });
</script>
```

---

## 📊 Monitoring & Debugging

### Email Logs
All email operations are logged:
```
Email sent successfully to: user@example.com
Email sending failed: Error message
```

### Socket.io Logs
```
New client connected: socket-id
User user-123 joined their room
Client disconnected: socket-id
```

### Disable Notifications (Development)
```bash
# .env
ENABLE_EMAIL_NOTIFICATIONS=false
```
This keeps in-app and real-time notifications but disables email sending.

---

## 🚀 Production Deployment

### Checklist
- [ ] Configure production SMTP server (SendGrid, Mailgun, SES)
- [ ] Set proper `EMAIL_FROM_NAME` for your organization
- [ ] Enable SSL/TLS for email sending
- [ ] Configure Socket.io for production (clustering, Redis adapter)
- [ ] Set `FRONTEND_URL` to production domain
- [ ] Test email deliverability
- [ ] Monitor email bounce rates
- [ ] Set up email analytics

### Socket.io Production Setup

For multiple server instances, use Redis adapter:

```javascript
// config/socket.js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

---

## 📈 Future Enhancements

### Planned Features
- [ ] SMS notifications (Twilio integration)
- [ ] Push notifications (mobile apps)
- [ ] Notification preferences per user
- [ ] Digest emails (daily/weekly summary)
- [ ] Rich notifications with images
- [ ] Notification templates in database
- [ ] A/B testing for email templates
- [ ] Notification analytics dashboard

---

## 🐛 Troubleshooting

### Email Not Sending
1. Check `.env` configuration
2. Verify SMTP credentials
3. Check Gmail "Less secure apps" or App Passwords
4. Review console logs for error messages
5. Test with different email provider

### Socket.io Not Connecting
1. Check CORS configuration
2. Verify server is running with Socket.io initialized
3. Check frontend Socket.io client version matches server
4. Review browser console for connection errors
5. Test with simple HTML client first

### Notifications Not Appearing
1. Check database for notification records
2. Verify user ID is correct
3. Check Socket.io room joining
4. Review notification creation logic
5. Check frontend notification handling

---

*Last Updated: 2025-12-07*
*Implementation Status: ✅ Complete*
