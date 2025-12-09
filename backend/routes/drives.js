const express = require('express');
const {
  createDrive,
  getDrives,
  getDrive,
  updateDrive,
  deleteDrive,
  getDriveStats,
  uploadParticipants,
  getDriveProgress,
  progressStage,
  regressStage
} = require('../controllers/driveController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Stats and progress routes MUST come before /:id route to avoid conflicts
router
  .route('/:id/stats')
  .get(protect, authorize('admin', 'mentor'), getDriveStats);

router
  .route('/:id/progress')
  .get(protect, authorize('admin', 'mentor'), getDriveProgress);

router
  .route('/:id/progress-stage')
  .post(protect, authorize('admin'), progressStage);

router
  .route('/:id/regress-stage')
  .post(protect, authorize('admin'), regressStage);

// Upload participants (students/mentors) via CSV/Excel
router
  .route('/:id/upload-participants')
  .post(protect, authorize('admin'), upload.single('file'), uploadParticipants);

router
  .route('/')
  .get(protect, getDrives)
  .post(protect, authorize('admin'), createDrive);

// Dynamic /:id route comes LAST
router
  .route('/:id')
  .get(protect, getDrive)
  .put(protect, authorize('admin'), updateDrive)
  .delete(protect, authorize('admin'), deleteDrive);

module.exports = router;
