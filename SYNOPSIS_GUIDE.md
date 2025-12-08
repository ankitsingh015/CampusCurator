# Synopsis Submission & Review - Implementation Guide

Complete guide for the synopsis submission and review workflow in CampusCurator.

---

## 📋 Overview

The synopsis submission workflow allows student groups to submit their project proposals for mentor review and approval. This is a critical step before proceeding to project development and checkpoint evaluations.

### Workflow Stages
```
Group Formation → Mentor Assignment → Synopsis Submission → Review → Approval/Revision → Project Development
```

---

## 🎯 Key Features

### For Students
- ✅ Submit project synopsis with detailed information
- ✅ Upload supporting documents (up to 5 files)
- ✅ Resubmit after revision requests
- ✅ Track version history
- ✅ Receive real-time notifications on review status

### For Mentors
- ✅ Review submitted synopses
- ✅ Approve, reject, or request revisions
- ✅ Provide detailed feedback
- ✅ View all assigned group synopses
- ✅ Track submission history

### For Admins
- ✅ View all synopses across drives
- ✅ Override reviews if needed
- ✅ Delete synopses
- ✅ Monitor submission statistics

---

## 📊 Synopsis Data Structure

```javascript
{
  group: ObjectId,              // Reference to group
  drive: ObjectId,              // Reference to drive
  title: String,                // Project title (required)
  abstract: String,             // Project abstract (required)
  objectives: String,           // Project objectives
  methodology: String,          // Approach/methodology
  expectedOutcome: String,      // Expected results
  technologies: [String],       // Tech stack
  documents: [{                 // Uploaded files
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    uploadedAt: Date
  }],
  submittedBy: ObjectId,        // User who submitted
  submittedAt: Date,            // Submission timestamp
  version: Number,              // Version number (increments)
  status: String,               // Current status
  reviewedBy: ObjectId,         // Mentor who reviewed
  reviewedAt: Date,             // Review timestamp
  feedback: String,             // Mentor's feedback
  revisions: [{                 // Version history
    version: Number,
    submittedAt: Date,
    feedback: String,
    status: String
  }]
}
```

### Status Values
- `draft` - Initial state (not submitted)
- `submitted` - Submitted and awaiting review
- `under-review` - Being reviewed by mentor
- `approved` - Approved by mentor ✅
- `rejected` - Rejected by mentor ❌
- `revision-requested` - Needs changes 📝

---

## 🔌 API Endpoints

### 1. Submit Synopsis

**POST** `/api/synopsis`

**Access:** Private/Student

**Request:**
```javascript
// Multipart form-data
{
  groupId: "group-id-here",
  title: "AI-Based Traffic Prediction System",
  abstract: "This project aims to...",
  objectives: "1. Develop ML model...",
  methodology: "We will use...",
  expectedOutcome: "Expected to achieve...",
  technologies: ["Python", "TensorFlow", "React"],
  documents: [File, File] // Up to 5 files
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Synopsis submitted successfully",
  "data": {
    "_id": "synopsis-id",
    "group": { "_id": "...", "name": "AI Team" },
    "title": "AI-Based Traffic Prediction System",
    "abstract": "...",
    "status": "submitted",
    "version": 1,
    "submittedBy": { "name": "John Doe", "email": "..." },
    "submittedAt": "2024-01-15T10:30:00Z",
    "documents": [...]
  }
}
```

**Business Rules:**
- User must be group leader or member
- Group must have assigned mentor
- Creates new synopsis or updates existing one
- Increments version on resubmission
- Stores previous version in revisions array
- Sends notification to mentor

---

### 2. Get Synopsis by ID

**GET** `/api/synopsis/:id`

**Access:** Private (Group members, assigned mentor, admin)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "_id": "synopsis-id",
    "group": {
      "name": "AI Team",
      "leader": "...",
      "members": [...]
    },
    "title": "AI-Based Traffic Prediction System",
    "status": "submitted",
    "submittedBy": { "name": "John Doe" },
    "reviewedBy": null,
    "feedback": null,
    "version": 1,
    "revisions": []
  }
}
```

---

### 3. Get Group Synopsis

**GET** `/api/synopsis/group/:groupId`

**Access:** Private (Group members, assigned mentor, admin)

**Response:**
```javascript
{
  "success": true,
  "data": {
    // Synopsis object
  }
}
```

**Use Case:** Students checking their group's synopsis status

---

### 4. Get All Synopses

**GET** `/api/synopsis`

**Access:** Private/Mentor/Admin

**Query Parameters:**
- `status` - Filter by status (submitted, approved, etc.)
- `drive` - Filter by drive ID

**Response:**
```javascript
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "...",
      "group": { "name": "..." },
      "title": "...",
      "status": "submitted",
      "submittedAt": "..."
    },
    // ... more synopses
  ]
}
```

**Notes:**
- Mentors only see synopses for their assigned groups
- Admins see all synopses

---

### 5. Review Synopsis

**PUT** `/api/synopsis/:id/review`

**Access:** Private/Mentor/Admin

**Request:**
```javascript
{
  "status": "approved", // or "rejected" or "revision-requested"
  "feedback": "Great work! The methodology is well-defined."
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Synopsis approved",
  "data": {
    "_id": "synopsis-id",
    "status": "approved",
    "feedback": "Great work!...",
    "reviewedBy": { "name": "Dr. Smith" },
    "reviewedAt": "2024-01-16T14:30:00Z"
  }
}
```

**Business Rules:**
- Only assigned mentor can review
- Admin can override
- Feedback required for rejection/revision
- Status must be submitted or under-review
- Sends notification to all group members

---

### 6. Update Synopsis (Resubmission)

**PUT** `/api/synopsis/:id`

**Access:** Private/Student

**Request:**
```javascript
// Multipart form-data
{
  title: "Updated title",
  abstract: "Updated abstract...",
  objectives: "Updated objectives...",
  // ... other fields
  documents: [File] // New files (replaces old)
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Synopsis updated and resubmitted for review",
  "data": {
    // Updated synopsis with incremented version
    "version": 2,
    "status": "submitted",
    "revisions": [
      {
        "version": 1,
        "status": "revision-requested",
        "feedback": "..."
      }
    ]
  }
}
```

**Business Rules:**
- Only works when status is `revision-requested` or `draft`
- Increments version number
- Stores old version in revisions
- Resets review status

---

### 7. Delete Synopsis

**DELETE** `/api/synopsis/:id`

**Access:** Private/Admin

**Response:**
```javascript
{
  "success": true,
  "message": "Synopsis deleted successfully"
}
```

---

## 💡 Usage Examples

### Example 1: Student Submits Synopsis

```javascript
// Frontend code
const formData = new FormData();
formData.append('groupId', groupId);
formData.append('title', 'AI Traffic Prediction');
formData.append('abstract', 'This project...');
formData.append('objectives', '1. Build ML model...');
formData.append('methodology', 'Using Python and TensorFlow...');
formData.append('expectedOutcome', 'Achieve 85% accuracy...');
formData.append('technologies', JSON.stringify(['Python', 'TensorFlow', 'React']));

// Add files
files.forEach(file => {
  formData.append('documents', file);
});

const response = await fetch('/api/synopsis', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
console.log(data.message); // "Synopsis submitted successfully"
```

**What Happens:**
1. Synopsis created/updated in database
2. Notification sent to assigned mentor (in-app + email)
3. Version incremented if resubmission
4. Previous version stored in revisions
5. Status set to "submitted"

---

### Example 2: Mentor Reviews Synopsis

```javascript
// Approve
await fetch(`/api/synopsis/${synopsisId}/review`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'approved',
    feedback: 'Excellent proposal! Your methodology is well-structured.'
  })
});

// Request Revision
await fetch(`/api/synopsis/${synopsisId}/review`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: 'revision-requested',
    feedback: 'Please clarify the expected outcomes and add more details to the methodology section.'
  })
});
```

**What Happens:**
1. Synopsis status updated
2. Feedback saved
3. Review timestamp recorded
4. Notifications sent to all group members (in-app + email)
5. Email includes review status and feedback

---

### Example 3: Student Resubmits After Revision

```javascript
// Check current status
const synopsis = await fetch(`/api/synopsis/group/${groupId}`);
const data = await synopsis.json();

if (data.data.status === 'revision-requested') {
  // Prepare resubmission
  const formData = new FormData();
  formData.append('title', updatedTitle);
  formData.append('abstract', updatedAbstract);
  formData.append('methodology', improvedMethodology);
  // ... other fields

  // Resubmit
  await fetch(`/api/synopsis/${data.data._id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
}
```

**What Happens:**
1. Old version moved to revisions array
2. Version number incremented
3. Status reset to "submitted"
4. Mentor review fields cleared
5. Mentor notified of resubmission

---

## 🔄 Complete Workflow

### Scenario: Student Group Submits and Gets Approval

**Day 1: Submission**
```
1. Student logs in
2. Navigates to their group page
3. Clicks "Submit Synopsis"
4. Fills in project details
5. Uploads 2 PDF documents
6. Clicks "Submit"
   → Synopsis saved with status "submitted"
   → Mentor receives notification + email
```

**Day 2: Mentor Review**
```
7. Mentor logs in
8. Sees notification about new synopsis
9. Reviews synopsis details and documents
10. Provides feedback
11. Requests revision for unclear methodology
   → Status changed to "revision-requested"
   → Students receive notification + email with feedback
```

**Day 3: Resubmission**
```
12. Student sees "Revision Requested" status
13. Reads mentor's feedback
14. Updates methodology section
15. Resubmits synopsis
   → Version incremented to 2
   → Old version stored in revisions
   → Status reset to "submitted"
   → Mentor notified of resubmission
```

**Day 4: Approval**
```
16. Mentor reviews updated synopsis
17. Approves the synopsis
   → Status changed to "approved"
   → Students receive approval notification
   → Group can now proceed to checkpoints
```

---

## 📧 Notifications

### Email Templates Used

1. **Synopsis Submitted** (to Mentor)
   - Subject: "New Synopsis Submission: [Group Name]"
   - Body: Group details, project title, link to review

2. **Synopsis Approved** (to Students)
   - Subject: "Synopsis Approved! ✅"
   - Body: Congratulations message, next steps

3. **Synopsis Revision Required** (to Students)
   - Subject: "Synopsis Revision Required"
   - Body: Feedback from mentor, instructions to resubmit

4. **Synopsis Rejected** (to Students)
   - Subject: "Synopsis Review Result"
   - Body: Explanation, feedback, next steps

### In-App Notifications
All notifications appear in real-time via Socket.io:
- Bell icon badge updates
- Toast notifications
- Notification panel updates

---

## 🛡️ Security & Validation

### Authorization Checks
- ✅ Students can only submit for their own groups
- ✅ Mentors can only review synopses for assigned groups
- ✅ Only group members can view their synopsis
- ✅ Admins have full access

### Data Validation
- ✅ Title and abstract are required
- ✅ Group must exist
- ✅ Group must have assigned mentor
- ✅ User must be group member
- ✅ File types validated (PDF, DOC, PPT, ZIP, images, videos)
- ✅ File size limited (10MB default)
- ✅ Maximum 5 files per submission

### Business Rules
- ✅ Cannot submit without assigned mentor
- ✅ Cannot review if not assigned mentor
- ✅ Feedback required for rejection/revision
- ✅ Can only update when revision-requested or draft
- ✅ Version history maintained

---

## 🧪 Testing

### Test Scenario 1: First Submission

```bash
# 1. Create group and assign mentor (prerequisite)

# 2. Submit synopsis
curl -X POST http://localhost:5000/api/synopsis \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -F "groupId=${GROUP_ID}" \
  -F "title=AI Traffic System" \
  -F "abstract=This project uses ML..." \
  -F "objectives=Build accurate model..." \
  -F "methodology=Python, TensorFlow..." \
  -F "expectedOutcome=85% accuracy..." \
  -F "technologies=Python" \
  -F "technologies=TensorFlow" \
  -F "documents=@synopsis.pdf"

# Expected: 201 Created, synopsis object returned
```

### Test Scenario 2: Mentor Review

```bash
# 1. Get synopsis ID from submission

# 2. Approve synopsis
curl -X PUT http://localhost:5000/api/synopsis/${SYNOPSIS_ID}/review \
  -H "Authorization: Bearer ${MENTOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "feedback": "Great work! Approved."
  }'

# Expected: 200 OK, updated synopsis with approval
```

### Test Scenario 3: Revision & Resubmission

```bash
# 1. Mentor requests revision
curl -X PUT http://localhost:5000/api/synopsis/${SYNOPSIS_ID}/review \
  -H "Authorization: Bearer ${MENTOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "revision-requested",
    "feedback": "Please add more details to methodology."
  }'

# 2. Student resubmits
curl -X PUT http://localhost:5000/api/synopsis/${SYNOPSIS_ID} \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -F "methodology=Updated methodology with more details..." \
  -F "documents=@updated_synopsis.pdf"

# Expected: Version incremented, old version in revisions
```

---

## 📊 Database Queries

### Get Pending Synopses for Mentor

```javascript
const Synopsis = require('./models/Synopsis');
const Group = require('./models/Group');

// Find all groups assigned to mentor
const groups = await Group.find({ assignedMentor: mentorId });
const groupIds = groups.map(g => g._id);

// Find pending synopses
const pending = await Synopsis.find({
  group: { $in: groupIds },
  status: 'submitted'
}).populate('group', 'name').sort('-submittedAt');
```

### Get Synopsis with Version History

```javascript
const synopsis = await Synopsis.findById(synopsisId)
  .populate('group', 'name leader members')
  .populate('submittedBy', 'name email')
  .populate('reviewedBy', 'name email');

console.log(`Current version: ${synopsis.version}`);
console.log(`Previous versions: ${synopsis.revisions.length}`);
```

---

## 🚀 Integration with Other Workflows

### After Synopsis Approval
Once synopsis is approved:
1. Group status can be updated to "active"
2. Students can proceed to checkpoint submissions
3. Mentor can start monitoring progress
4. Admin can track overall drive progress

### Integration Points

```javascript
// In groupController.js - check synopsis status
const canSubmitCheckpoint = async (groupId) => {
  const synopsis = await Synopsis.findOne({ 
    group: groupId,
    status: 'approved'
  });
  return !!synopsis;
};

// In driveController.js - get drive statistics
const getDriveStats = async (driveId) => {
  const totalSynopses = await Synopsis.countDocuments({ drive: driveId });
  const approvedSynopses = await Synopsis.countDocuments({ 
    drive: driveId,
    status: 'approved'
  });
  
  return {
    totalSynopses,
    approvedSynopses,
    approvalRate: (approvedSynopses / totalSynopses * 100).toFixed(2)
  };
};
```

---

## 🔧 Configuration

### Environment Variables

Already configured in `.env.example`:
```bash
# File Upload
MAX_FILE_SIZE=10485760  # 10MB

# Email Notifications
ENABLE_EMAIL_NOTIFICATIONS=true
```

### File Upload Settings

In `middleware/upload.js`:
- Allowed types: PDF, DOC, DOCX, PPT, PPTX, ZIP, RAR, images, videos
- Max files: 5 per submission
- Storage: `uploads/synopsis/` directory
- Naming: `documents-{timestamp}-{random}.{ext}`

---

## 📈 Best Practices

### For Students
1. **Complete All Fields**: Provide detailed information in all sections
2. **Clear Abstract**: Write a concise 200-300 word abstract
3. **Specific Objectives**: List measurable objectives
4. **Detailed Methodology**: Explain your approach step-by-step
5. **Upload Documentation**: Include relevant research papers or references
6. **Respond to Feedback**: Address all points raised by mentor

### For Mentors
1. **Timely Reviews**: Review within 2-3 days of submission
2. **Constructive Feedback**: Provide specific, actionable feedback
3. **Clear Instructions**: If requesting revision, explain exactly what needs to change
4. **Encourage Innovation**: Support creative approaches
5. **Track Progress**: Monitor resubmissions and improvements

### For Admins
1. **Set Clear Deadlines**: Define synopsis submission deadline
2. **Monitor Submissions**: Track submission and approval rates
3. **Support Mentors**: Ensure mentors are reviewing on time
4. **Resolve Conflicts**: Mediate if needed

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** File upload fails
- **Solution:** Check file type and size limits, ensure uploads directory exists

**Issue:** "Group must have assigned mentor"
- **Solution:** Assign mentor to group before allowing synopsis submission

**Issue:** Cannot resubmit after revision
- **Solution:** Ensure status is "revision-requested", check authorization

**Issue:** Mentor cannot review
- **Solution:** Verify mentor is assigned to the group

**Issue:** Notifications not sent
- **Solution:** Check email configuration in .env, verify Socket.io connection

---

*Last Updated: 2024-01-15*
*Implementation Status: ✅ Complete*
*Controller: backend/controllers/synopsisController.js*
*Routes: backend/routes/synopsis.js*
