const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  createNotification
} = require('../controllers/notificationController');

const router = express.Router();

// Get all notifications for current user
router.get('/', protect, getNotifications);

// Get unread notification count
router.get('/unread-count', protect, getUnreadCount);

// Mark all notifications as read
router.put('/read-all', protect, markAllAsRead);

// Mark specific notification as read
router.put('/:id/read', protect, markNotificationAsRead);

// Delete specific notification
router.delete('/:id', protect, deleteNotification);

// Clear all read notifications
router.delete('/clear-read', protect, clearReadNotifications);

// Create notification (admin only)
router.post('/', protect, authorize('admin'), createNotification);

module.exports = router;
