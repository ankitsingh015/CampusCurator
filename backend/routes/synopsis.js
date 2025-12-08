const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  submitSynopsis,
  getSynopsis,
  getGroupSynopsis,
  getAllSynopses,
  reviewSynopsis,
  updateSynopsis,
  deleteSynopsis
} = require('../controllers/synopsisController');

const router = express.Router();

// Get all synopses (for mentor/admin)
router.get('/', protect, authorize('mentor', 'admin'), getAllSynopses);

// Submit synopsis (create or update)
router.post(
  '/',
  protect,
  authorize('student'),
  upload.array('documents', 5),
  submitSynopsis
);

// Get synopsis for a specific group
router.get('/group/:groupId', protect, getGroupSynopsis);

// Get specific synopsis by ID
router.get('/:id', protect, getSynopsis);

// Review synopsis (mentor only)
router.put('/:id/review', protect, authorize('mentor', 'admin'), reviewSynopsis);

// Update synopsis (for resubmission)
router.put(
  '/:id',
  protect,
  authorize('student'),
  upload.array('documents', 5),
  updateSynopsis
);

// Delete synopsis (admin only)
router.delete('/:id', protect, authorize('admin'), deleteSynopsis);

module.exports = router;
