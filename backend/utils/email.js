const nodemailer = require('nodemailer');

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Send email function
 */
const sendEmail = async (options) => {
  try {
    // Check if email notifications are enabled
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
      console.log('Email notifications disabled. Skipping email to:', options.email);
      return;
    }

    const transporter = createTransporter();
    
    const message = {
      from: `${process.env.EMAIL_FROM_NAME || 'CampusCurator'} <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message
    };

    const info = await transporter.sendMail(message);
    console.log('Email sent successfully to:', options.email);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    // Don't throw error - email failure shouldn't break the application
    return null;
  }
};

/**
 * Get base email template
 */
const getBaseTemplate = (content) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #666;
          font-size: 12px;
        }
        .info-box {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 15px;
          margin: 15px 0;
        }
        .warning-box {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 15px 0;
        }
        .success-box {
          background: #d4edda;
          border-left: 4px solid #28a745;
          padding: 15px;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎓 CampusCurator</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>This is an automated message from CampusCurator.</p>
        <p>Please do not reply to this email.</p>
        <p>&copy; 2024 CampusCurator. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Email Templates
 */
const emailTemplates = {
  
  welcome: (name) => ({
    subject: 'Welcome to CampusCurator! 🎉',
    message: `Hello ${name},\n\nWelcome to CampusCurator! Your account has been created successfully.\n\nYou can now participate in project drives, form groups, and collaborate with your peers.\n\nBest regards,\nCampusCurator Team`,
    html: getBaseTemplate(`
      <h2>Welcome, ${name}! 🎉</h2>
      <p>Your account has been created successfully.</p>
      <div class="success-box">
        <p>You can now:</p>
        <ul>
          <li>✓ View active project drives</li>
          <li>✓ Create or join student groups</li>
          <li>✓ Submit project work</li>
          <li>✓ Track your progress</li>
        </ul>
      </div>
      <p>Get started by exploring available project drives!</p>
      <a href="${process.env.FRONTEND_URL}/drives" class="button">View Drives</a>
    `)
  }),

  driveCreated: (driveName, academicYear, deadline, driveId) => ({
    subject: `New Project Drive: ${driveName}`,
    message: `A new project drive "${driveName}" for ${academicYear} has been created.\n\nGroup Formation Deadline: ${deadline}\n\nLog in to create or join a group.`,
    html: getBaseTemplate(`
      <h2>New Project Drive Created! 📚</h2>
      <div class="info-box">
        <p><strong>Drive Name:</strong> ${driveName}</p>
        <p><strong>Academic Year:</strong> ${academicYear}</p>
        <p><strong>Group Formation Deadline:</strong> ${deadline}</p>
      </div>
      <p>Form your project group now to get started!</p>
      <a href="${process.env.FRONTEND_URL}/drives/${driveId}" class="button">View Drive Details</a>
    `)
  }),

  groupInvitation: (groupName, invitationCode, leaderName) => ({
    subject: `Group Invitation: ${groupName}`,
    message: `${leaderName} has invited you to join group "${groupName}".\n\nInvitation Code: ${invitationCode}\n\nUse this code to join the group.`,
    html: getBaseTemplate(`
      <h2>You're Invited to Join a Group! 👥</h2>
      <p>${leaderName} has invited you to join their project group.</p>
      <div class="info-box">
        <p><strong>Group Name:</strong> ${groupName}</p>
        <p><strong>Invitation Code:</strong> <span style="font-size: 24px; font-weight: bold; color: #667eea;">${invitationCode}</span></p>
      </div>
      <p>Use this code to join the group through the platform.</p>
      <a href="${process.env.FRONTEND_URL}/groups/join" class="button">Join Group</a>
    `)
  }),

  memberJoined: (groupName, memberName) => ({
    subject: `New Member Joined: ${groupName}`,
    message: `${memberName} has joined your group "${groupName}".`,
    html: getBaseTemplate(`
      <h2>New Team Member! 🎉</h2>
      <div class="success-box">
        <p><strong>${memberName}</strong> has joined your group <strong>${groupName}</strong>.</p>
      </div>
      <p>Your team is growing! Collaborate and build something amazing together.</p>
    `)
  }),

  mentorAssigned: (groupName, mentorName, mentorEmail, groupId) => ({
    subject: `Mentor Assigned: ${mentorName}`,
    message: `Your group "${groupName}" has been assigned ${mentorName} (${mentorEmail}) as your mentor.\n\nYou can now submit your project synopsis for approval.`,
    html: getBaseTemplate(`
      <h2>Mentor Assigned! 👨‍🏫</h2>
      <div class="success-box">
        <p>Your group <strong>${groupName}</strong> has been assigned a mentor!</p>
        <p><strong>Mentor:</strong> ${mentorName}</p>
        <p><strong>Email:</strong> ${mentorEmail}</p>
      </div>
      <p>You can now proceed to submit your project synopsis for review and approval.</p>
      <a href="${process.env.FRONTEND_URL}/groups/${groupId}" class="button">View Group Details</a>
    `)
  }),

  synopsisSubmitted: (groupName, projectTitle) => ({
    subject: `Synopsis Submitted: ${groupName}`,
    message: `Synopsis for project "${projectTitle}" has been submitted by group ${groupName}.\n\nPlease review and provide feedback.`,
    html: getBaseTemplate(`
      <h2>New Synopsis Submission 📄</h2>
      <div class="info-box">
        <p><strong>Group:</strong> ${groupName}</p>
        <p><strong>Project Title:</strong> ${projectTitle}</p>
      </div>
      <p>A new synopsis is awaiting your review. Please provide timely feedback to help students progress.</p>
      <a href="${process.env.FRONTEND_URL}/mentor/reviews" class="button">Review Synopsis</a>
    `)
  }),

  synopsisApproved: (groupName, projectTitle, groupId) => ({
    subject: `Synopsis Approved! ✅`,
    message: `Congratulations! Your project synopsis "${projectTitle}" has been approved by your mentor.\n\nYou can now proceed with project development.`,
    html: getBaseTemplate(`
      <h2>Synopsis Approved! ✅</h2>
      <div class="success-box">
        <p>Great news! Your project synopsis has been approved.</p>
        <p><strong>Project:</strong> ${projectTitle}</p>
        <p><strong>Group:</strong> ${groupName}</p>
      </div>
      <p>You can now proceed with project development and prepare for checkpoint submissions.</p>
      <a href="${process.env.FRONTEND_URL}/groups/${groupId}" class="button">View Group</a>
    `)
  }),

  synopsisRejected: (groupName, projectTitle, feedback) => ({
    subject: `Synopsis Revision Required`,
    message: `Your project synopsis "${projectTitle}" requires revision.\n\nFeedback: ${feedback}\n\nPlease review the feedback and resubmit.`,
    html: getBaseTemplate(`
      <h2>Synopsis Revision Required 📝</h2>
      <div class="warning-box">
        <p>Your synopsis for <strong>${projectTitle}</strong> needs revision.</p>
        <p><strong>Feedback:</strong></p>
        <p>${feedback}</p>
      </div>
      <p>Please address the mentor's feedback and resubmit your synopsis for approval.</p>
    `)
  }),

  checkpointReminder: (checkpointName, deadline, daysLeft) => ({
    subject: `Reminder: ${checkpointName} Due Soon!`,
    message: `Reminder: ${checkpointName} submission deadline is ${deadline} (${daysLeft} days left).\n\nPlease submit your work before the deadline.`,
    html: getBaseTemplate(`
      <h2>Checkpoint Deadline Reminder ⏰</h2>
      <div class="warning-box">
        <p><strong>Checkpoint:</strong> ${checkpointName}</p>
        <p><strong>Deadline:</strong> ${deadline}</p>
        <p><strong>Time Remaining:</strong> ${daysLeft} days</p>
      </div>
      <p>Don't miss the deadline! Submit your work on time to avoid penalties.</p>
      <a href="${process.env.FRONTEND_URL}/students/submit" class="button">Submit Now</a>
    `)
  }),

  evaluationPublished: (checkpointName, grade, percentage, groupId) => ({
    subject: `Evaluation Published: ${checkpointName}`,
    message: `Your evaluation for ${checkpointName} has been published.\n\nGrade: ${grade}\nPercentage: ${percentage}%\n\nCheck the platform for detailed feedback.`,
    html: getBaseTemplate(`
      <h2>Evaluation Published! 📊</h2>
      <div class="info-box">
        <p><strong>Checkpoint:</strong> ${checkpointName}</p>
        <p><strong>Grade:</strong> <span style="font-size: 20px; font-weight: bold; color: #667eea;">${grade}</span></p>
        <p><strong>Percentage:</strong> ${percentage}%</p>
      </div>
      <p>View detailed feedback and scores from your mentor.</p>
      <a href="${process.env.FRONTEND_URL}/groups/${groupId}/evaluations" class="button">View Evaluation</a>
    `)
  }),

  resultPublished: (driveName, finalGrade, result, driveId) => ({
    subject: `Final Results Published: ${driveName}`,
    message: `Final results for ${driveName} have been published.\n\nGrade: ${finalGrade}\nResult: ${result}\n\nCheck the platform for complete details.`,
    html: getBaseTemplate(`
      <h2>Final Results Published! 🎓</h2>
      <div class="${result === 'pass' || result === 'distinction' ? 'success-box' : 'warning-box'}">
        <p><strong>Drive:</strong> ${driveName}</p>
        <p><strong>Final Grade:</strong> <span style="font-size: 24px; font-weight: bold;">${finalGrade}</span></p>
        <p><strong>Result:</strong> <span style="text-transform: uppercase;">${result}</span></p>
      </div>
      <p>View your complete result breakdown including all checkpoint scores.</p>
      <a href="${process.env.FRONTEND_URL}/results/${driveId}" class="button">View Complete Results</a>
    `)
  }),

  deadlineExtended: (stageName, newDeadline) => ({
    subject: `Deadline Extended: ${stageName}`,
    message: `The deadline for ${stageName} has been extended to ${newDeadline}.`,
    html: getBaseTemplate(`
      <h2>Deadline Extended 📅</h2>
      <div class="info-box">
        <p>Good news! The deadline has been extended.</p>
        <p><strong>Stage:</strong> ${stageName}</p>
        <p><strong>New Deadline:</strong> ${newDeadline}</p>
      </div>
      <p>You now have more time to complete your submission. Use it wisely!</p>
    `)
  })
};

module.exports = {
  sendEmail,
  emailTemplates,
  getBaseTemplate
};

