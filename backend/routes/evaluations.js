const express = require('express');
const {
  createEvaluation,
  getEvaluation,
  updateEvaluation,
  finalizeEvaluation,
  getGroupEvaluations,
  getCheckpointEvaluation,
  getDriveEvaluations,
  getMyEvaluations,
  deleteEvaluation
} = require('../controllers/evaluationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Create evaluation (mentor)
router.post('/', protect, authorize('mentor', 'admin'), createEvaluation);

// My evaluations (student)
router.get('/my-evaluations', protect, authorize('student'), getMyEvaluations);

// Group evaluations
router.get('/group/:groupId', protect, authorize('student', 'mentor', 'admin'), getGroupEvaluations);

// Checkpoint submission evaluation
router.get('/checkpoint/:submissionId', protect, authorize('student', 'mentor', 'admin'), getCheckpointEvaluation);

// Drive evaluations
router.get('/drive/:driveId', protect, authorize('mentor', 'admin'), getDriveEvaluations);

// Single evaluation
router.get('/:id', protect, authorize('student', 'mentor', 'admin'), getEvaluation);
router.put('/:id', protect, authorize('mentor', 'admin'), updateEvaluation);
router.put('/:id/finalize', protect, authorize('mentor', 'admin'), finalizeEvaluation);
router.delete('/:id', protect, authorize('mentor', 'admin'), deleteEvaluation);

module.exports = router;
