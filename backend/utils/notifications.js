const Notification = require('../models/Notification');
const { emitToUser, emitToUsers } = require('../config/socket');
const { sendEmail, emailTemplates } = require('./email');
const User = require('../models/User');

/**
 * Create notification in database and emit real-time event
 */
const createNotification = async (data) => {
  try {
    const notification = await Notification.create({
      recipient: data.recipient,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedDrive: data.relatedDrive,
      relatedGroup: data.relatedGroup,
      actionUrl: data.actionUrl
    });

    // Emit real-time notification
    emitToUser(data.recipient, 'notification', notification);

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create bulk notifications and emit real-time events
 */
const createBulkNotifications = async (recipients, data) => {
  try {
    const notifications = recipients.map(recipient => ({
      recipient,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedDrive: data.relatedDrive,
      relatedGroup: data.relatedGroup,
      actionUrl: data.actionUrl
    }));
    
    const created = await Notification.insertMany(notifications);

    // Emit real-time notifications to all recipients
    emitToUsers(recipients, 'notification', {
      type: data.type,
      title: data.title,
      message: data.message
    });

    return created;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};

/**
 * Create notification with email option
 */
const createNotificationWithEmail = async (data, sendEmailNotification = false) => {
  try {
    // Create in-app notification
    const notification = await createNotification(data);

    // Send email if requested
    if (sendEmailNotification) {
      const user = await User.findById(data.recipient);
      if (user && user.email) {
        await sendEmail({
          email: user.email,
          subject: data.title,
          message: data.message,
          html: `<h2>${data.title}</h2><p>${data.message}</p>${data.actionUrl ? `<p><a href="${data.actionUrl}">View Details</a></p>` : ''}`
        });
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification with email:', error);
    throw error;
  }
};

/**
 * Create bulk notifications with email option
 */
const createBulkNotificationsWithEmail = async (recipients, data, sendEmailNotification = false) => {
  try {
    // Create in-app notifications
    const notifications = await createBulkNotifications(recipients, data);

    // Send emails if requested
    if (sendEmailNotification) {
      const users = await User.find({ _id: { $in: recipients } });
      const emailPromises = users.map(user => 
        sendEmail({
          email: user.email,
          subject: data.title,
          message: data.message,
          html: `<h2>${data.title}</h2><p>${data.message}</p>${data.actionUrl ? `<p><a href="${data.actionUrl}">View Details</a></p>` : ''}`
        }).catch(err => console.error(`Failed to send email to ${user.email}:`, err))
      );
      
      await Promise.allSettled(emailPromises);
    }

    return notifications;
  } catch (error) {
    console.error('Error creating bulk notifications with email:', error);
    throw error;
  }
};

/**
 * Mark notification as read and emit update
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: Date.now() },
      { new: true }
    );

    if (notification) {
      // Emit update to user
      emitToUser(userId, 'notification-read', { notificationId });
    }

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

/**
 * Notify about drive creation
 */
const notifyDriveCreated = async (driveId, driveName, participants, sendEmail = true) => {
  const data = {
    type: 'drive-created',
    title: 'New Project Drive Created',
    message: `A new project drive "${driveName}" has been created. You can now form groups and participate.`,
    relatedDrive: driveId,
    actionUrl: `/drives/${driveId}`
  };

  return createBulkNotificationsWithEmail(participants, data, sendEmail);
};

/**
 * Notify about mentor assignment
 */
const notifyMentorAssigned = async (groupId, groupName, studentIds, mentorName, sendEmail = true) => {
  const data = {
    type: 'mentor-assigned',
    title: 'Mentor Assigned',
    message: `Your group "${groupName}" has been assigned ${mentorName} as your mentor.`,
    relatedGroup: groupId,
    actionUrl: `/groups/${groupId}`
  };

  return createBulkNotificationsWithEmail(studentIds, data, sendEmail);
};

/**
 * Notify about synopsis review
 */
const notifySynopsisReviewed = async (groupId, groupName, studentIds, status, feedback, sendEmail = true) => {
  const statusMessages = {
    approved: 'Your project synopsis has been approved!',
    rejected: 'Your project synopsis has been rejected. Please review the feedback.',
    'revision-requested': 'Your mentor has requested revisions to your synopsis.'
  };

  const data = {
    type: 'synopsis-reviewed',
    title: 'Synopsis Reviewed',
    message: statusMessages[status] || 'Your synopsis has been reviewed.',
    relatedGroup: groupId,
    actionUrl: `/groups/${groupId}/synopsis`
  };

  return createBulkNotificationsWithEmail(studentIds, data, sendEmail);
};

/**
 * Notify about evaluation published
 */
const notifyEvaluationPublished = async (groupId, groupName, studentIds, checkpointName, sendEmail = true) => {
  const data = {
    type: 'evaluation-published',
    title: 'Evaluation Published',
    message: `Your evaluation for "${checkpointName}" has been published. Check your feedback and scores.`,
    relatedGroup: groupId,
    actionUrl: `/groups/${groupId}/evaluations`
  };

  return createBulkNotificationsWithEmail(studentIds, data, sendEmail);
};

/**
 * Notify about result publication
 */
const notifyResultPublished = async (driveId, driveName, studentIds, sendEmail = true) => {
  const data = {
    type: 'result-published',
    title: 'Results Published',
    message: `Final results for "${driveName}" have been published. Check your results now!`,
    relatedDrive: driveId,
    actionUrl: `/results/${driveId}`
  };

  return createBulkNotificationsWithEmail(studentIds, data, sendEmail);
};

/**
 * Notify about deadline reminder
 */
const notifyDeadlineReminder = async (recipients, title, message, actionUrl, sendEmail = true) => {
  const data = {
    type: 'deadline-reminder',
    title,
    message,
    actionUrl
  };

  return createBulkNotificationsWithEmail(recipients, data, sendEmail);
};

module.exports = {
  createNotification,
  createBulkNotifications,
  createNotificationWithEmail,
  createBulkNotificationsWithEmail,
  markAsRead,
  getUnreadCount,
  // Helper functions for specific events
  notifyDriveCreated,
  notifyMentorAssigned,
  notifySynopsisReviewed,
  notifyEvaluationPublished,
  notifyResultPublished,
  notifyDeadlineReminder
};

