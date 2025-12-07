const Notification = require('../models/Notification');
const { createNotification, createBulkNotifications, markAsRead, getUnreadCount } = require('../utils/notifications');

/**
 * @desc    Get all notifications for current user
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query = { recipient: req.user.id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('relatedDrive', 'name')
      .populate('relatedGroup', 'name')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await markAsRead(req.params.id, req.user.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: Date.now() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete all read notifications
 * @route   DELETE /api/notifications/clear-read
 * @access  Private
 */
exports.clearReadNotifications = async (req, res, next) => {
  try {
    await Notification.deleteMany({
      recipient: req.user.id,
      isRead: true
    });

    res.status(200).json({
      success: true,
      message: 'Read notifications cleared successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create notification (admin/system use)
 * @route   POST /api/notifications
 * @access  Private/Admin
 */
exports.createNotification = async (req, res, next) => {
  try {
    const { recipient, recipients, type, title, message, relatedDrive, relatedGroup, actionUrl } = req.body;

    // Bulk notification creation
    if (recipients && Array.isArray(recipients)) {
      const notifications = await createBulkNotifications(recipients, {
        type,
        title,
        message,
        relatedDrive,
        relatedGroup,
        actionUrl
      });

      return res.status(201).json({
        success: true,
        message: `${notifications.length} notifications created`,
        count: notifications.length
      });
    }

    // Single notification creation
    const notification = await createNotification({
      recipient,
      type,
      title,
      message,
      relatedDrive,
      relatedGroup,
      actionUrl
    });

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};
