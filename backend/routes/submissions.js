const express = require('express');
const {
  submitFile,
  getSubmissions,
  getSubmission,
  reviewSubmission,
  getSubmissionStats,
  getDriveSubmissionProgress,
  markLateSubmission,
  deleteSubmission
} = require('../controllers/submissionController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Get submission stats for a drive (admin/mentor)
router.get(
  '/stats/:driveId',
  protect,
  authorize('admin', 'mentor'),
  getSubmissionStats
);

// Per-group submission progress for a drive (admin/mentor)
router.get(
  '/progress/:driveId',
  protect,
  authorize('admin', 'mentor'),
  getDriveSubmissionProgress
);

// Get all submissions (filtered by role)
router.get(
  '/',
  protect,
  getSubmissions
);

// Submit a file (student/admin)
router.post(
  '/',
  protect,
  authorize('student', 'admin'),
  upload.single('file'),
  submitFile
);

// Get single submission
router.get(
  '/:id',
  protect,
  getSubmission
);

// Review submission (mentor only)
router.put(
  '/:id/review',
  protect,
  authorize('mentor', 'admin'),
  reviewSubmission
);

// Mark as late submission (admin only)
router.put(
  '/:id/mark-late',
  protect,
  authorize('admin'),
  markLateSubmission
);

// Delete/withdraw submission (student/admin)
router.delete(
  '/:id',
  protect,
  deleteSubmission
);

module.exports = router;
