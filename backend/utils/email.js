const nodemailer = require('nodemailer');
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    const message = {
      from: `${process.env.EMAIL_FROM_NAME || 'CampusCurator'} <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html
    };
    await transporter.sendMail(message);
    console.log('Email sent successfully to:', options.email);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to CampusCurator',
    message: `Hello ${name},\n\nWelcome to CampusCurator! Your account has been created successfully.`,
    html: `<h1>Welcome to CampusCurator</h1><p>Hello ${name},</p><p>Your account has been created successfully.</p>`
  }),
  driveCreated: (driveName, deadline) => ({
    subject: `New Project Drive: ${driveName}`,
    message: `A new project drive "${driveName}" has been created. Deadline: ${deadline}`,
    html: `<h1>New Project Drive</h1><p>A new project drive <strong>${driveName}</strong> has been created.</p><p>Deadline: ${deadline}</p>`
  }),
  groupInvitation: (groupName, invitationCode) => ({
    subject: `Group Invitation: ${groupName}`,
    message: `You've been invited to join group "${groupName}". Use invitation code: ${invitationCode}`,
    html: `<h1>Group Invitation</h1><p>You've been invited to join <strong>${groupName}</strong></p><p>Invitation Code: <strong>${invitationCode}</strong></p>`
  }),
  mentorAssigned: (groupName, mentorName) => ({
    subject: `Mentor Assigned to ${groupName}`,
    message: `Your group "${groupName}" has been assigned mentor: ${mentorName}`,
    html: `<h1>Mentor Assigned</h1><p>Your group <strong>${groupName}</strong> has been assigned mentor <strong>${mentorName}</strong></p>`
  }),
  synopsisApproved: (groupName) => ({
    subject: `Synopsis Approved for ${groupName}`,
    message: `Your project synopsis has been approved by your mentor!`,
    html: `<h1>Synopsis Approved!</h1><p>Your project synopsis for <strong>${groupName}</strong> has been approved.</p>`
  }),
  checkpointReminder: (checkpointName, deadline) => ({
    subject: `Checkpoint Reminder: ${checkpointName}`,
    message: `Reminder: ${checkpointName} submission deadline is ${deadline}`,
    html: `<h1>Checkpoint Reminder</h1><p><strong>${checkpointName}</strong> submission deadline: ${deadline}</p>`
  }),
  resultPublished: (groupName, result) => ({
    subject: `Results Published for ${groupName}`,
    message: `Final results have been published for ${groupName}. Result: ${result}`,
    html: `<h1>Results Published</h1><p>Final results for <strong>${groupName}</strong> have been published.</p><p>Result: <strong>${result}</strong></p>`
  })
};
module.exports = {
  sendEmail,
  emailTemplates
};
