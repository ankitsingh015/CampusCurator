const Notification = require('../models/Notification');
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
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};
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
    await Notification.insertMany(notifications);
    return notifications;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: Date.now() },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};
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
module.exports = {
  createNotification,
  createBulkNotifications,
  markAsRead,
  getUnreadCount
};
