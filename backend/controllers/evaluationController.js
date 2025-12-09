const Evaluation = require('../models/Evaluation');
const CheckpointSubmission = require('../models/CheckpointSubmission');
const Group = require('../models/Group');

/**
 * Calculate grade based on percentage
 */
const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
};

/**
 * Create evaluation
 * POST /api/evaluations
 */
exports.createEvaluation = async (req, res, next) => {
  try {
    const {
      checkpointSubmissionId,
      criteriaScores,
      feedback,
      strengths,
      improvements
    } = req.body;

    // Validate checkpoint submission
    const submission = await CheckpointSubmission.findById(checkpointSubmissionId)
      .populate('group');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Checkpoint submission not found'
      });
    }

    // Verify mentor is assigned to this group
    const group = submission.group;
    if (group.assignedMentor?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not the assigned mentor for this group'
      });
    }

    // Check if evaluation already exists
    const existingEvaluation = await Evaluation.findOne({
      checkpointSubmission: checkpointSubmissionId
    });

    if (existingEvaluation) {
      return res.status(400).json({
        success: false,
        message: 'Evaluation already exists for this submission. Use update endpoint instead.'
      });
    }

    // Calculate totals
    const totalMarks = criteriaScores.reduce((sum, c) => sum + c.score, 0);
    const maxMarks = criteriaScores.reduce((sum, c) => sum + c.maxScore, 0);
    const percentage = (totalMarks / maxMarks) * 100;
    const grade = calculateGrade(percentage);

    // Create evaluation
    const evaluation = await Evaluation.create({
      group: group._id,
      drive: submission.drive,
      checkpointSubmission: checkpointSubmissionId,
      checkpointIndex: submission.checkpointIndex,
      evaluatedBy: req.user.id,
      criteriaScores,
      totalMarks,
      maxMarks,
      percentage,
      grade,
      feedback,
      strengths,
      improvements,
      status: 'draft',
      isVisible: false
    });

    // Update submission status
    submission.status = 'under-evaluation';
    await submission.save();

    await evaluation.populate('group evaluatedBy checkpointSubmission');

    res.status(201).json({
      success: true,
      message: 'Evaluation created successfully',
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get evaluation by ID
 * GET /api/evaluations/:id
 */
exports.getEvaluation = async (req, res, next) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id)
      .populate('group', 'name projectTitle')
      .populate('drive', 'name')
      .populate('evaluatedBy', 'name email department')
      .populate('checkpointSubmission');

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Check visibility for students
    if (req.user.role === 'student' && !evaluation.isVisible) {
      return res.status(403).json({
        success: false,
        message: 'Evaluation is not yet published'
      });
    }

    res.status(200).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update evaluation
 * PUT /api/evaluations/:id
 */
exports.updateEvaluation = async (req, res, next) => {
  try {
    const {
      criteriaScores,
      feedback,
      strengths,
      improvements,
      status
    } = req.body;

    let evaluation = await Evaluation.findById(req.params.id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Verify mentor is the evaluator
    if (evaluation.evaluatedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this evaluation'
      });
    }

    // Update criteria scores and recalculate
    if (criteriaScores) {
      evaluation.criteriaScores = criteriaScores;
      evaluation.totalMarks = criteriaScores.reduce((sum, c) => sum + c.score, 0);
      evaluation.maxMarks = criteriaScores.reduce((sum, c) => sum + c.maxScore, 0);
      evaluation.percentage = (evaluation.totalMarks / evaluation.maxMarks) * 100;
      evaluation.grade = calculateGrade(evaluation.percentage);
    }

    if (feedback !== undefined) evaluation.feedback = feedback;
    if (strengths !== undefined) evaluation.strengths = strengths;
    if (improvements !== undefined) evaluation.improvements = improvements;
    if (status !== undefined) evaluation.status = status;

    evaluation.evaluatedAt = new Date();

    await evaluation.save();
    await evaluation.populate('group evaluatedBy checkpointSubmission');

    res.status(200).json({
      success: true,
      message: 'Evaluation updated successfully',
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Finalize evaluation (make visible to students)
 * PUT /api/evaluations/:id/finalize
 */
exports.finalizeEvaluation = async (req, res, next) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id)
      .populate('checkpointSubmission');

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Verify mentor is the evaluator
    if (evaluation.evaluatedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to finalize this evaluation'
      });
    }

    evaluation.status = 'finalized';
    evaluation.isVisible = true;
    await evaluation.save();

    // Update checkpoint submission status
    const submission = evaluation.checkpointSubmission;
    if (submission) {
      submission.status = 'evaluated';
      await submission.save();
    }

    res.status(200).json({
      success: true,
      message: 'Evaluation finalized and published to students',
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get evaluations for a group
 * GET /api/evaluations/group/:groupId
 */
exports.getGroupEvaluations = async (req, res, next) => {
  try {
    const filter = { group: req.params.groupId };

    // Students can only see visible evaluations
    if (req.user.role === 'student') {
      filter.isVisible = true;
    }

    const evaluations = await Evaluation.find(filter)
      .sort({ checkpointIndex: 1 })
      .populate('evaluatedBy', 'name email department')
      .populate('checkpointSubmission', 'title checkpointName');

    res.status(200).json({
      success: true,
      count: evaluations.length,
      data: evaluations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get evaluations for a checkpoint submission
 * GET /api/evaluations/checkpoint/:submissionId
 */
exports.getCheckpointEvaluation = async (req, res, next) => {
  try {
    const evaluation = await Evaluation.findOne({
      checkpointSubmission: req.params.submissionId
    })
      .populate('evaluatedBy', 'name email department')
      .populate('group', 'name projectTitle')
      .populate('checkpointSubmission');

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found for this submission'
      });
    }

    // Check visibility for students
    if (req.user.role === 'student' && !evaluation.isVisible) {
      return res.status(403).json({
        success: false,
        message: 'Evaluation is not yet published'
      });
    }

    res.status(200).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all evaluations for a drive
 * GET /api/evaluations/drive/:driveId
 */
exports.getDriveEvaluations = async (req, res, next) => {
  try {
    const { checkpointIndex } = req.query;

    const filter = { drive: req.params.driveId };
    if (checkpointIndex !== undefined) {
      filter.checkpointIndex = parseInt(checkpointIndex);
    }

    const evaluations = await Evaluation.find(filter)
      .sort({ checkpointIndex: 1, createdAt: -1 })
      .populate('group', 'name projectTitle')
      .populate('evaluatedBy', 'name email')
      .populate('checkpointSubmission', 'title checkpointName');

    res.status(200).json({
      success: true,
      count: evaluations.length,
      data: evaluations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get my evaluations (student view)
 * GET /api/evaluations/my-evaluations
 */
exports.getMyEvaluations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find user's group
    const group = await Group.findOne({
      $or: [
        { leader: userId },
        { 'members.student': userId, 'members.status': 'accepted' }
      ]
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any group'
      });
    }

    const evaluations = await Evaluation.find({
      group: group._id,
      isVisible: true
    })
      .sort({ checkpointIndex: 1 })
      .populate('evaluatedBy', 'name email department')
      .populate('checkpointSubmission', 'title checkpointName');

    res.status(200).json({
      success: true,
      count: evaluations.length,
      data: evaluations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete evaluation
 * DELETE /api/evaluations/:id
 */
exports.deleteEvaluation = async (req, res, next) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Only admin or the evaluator can delete
    if (evaluation.evaluatedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this evaluation'
      });
    }

    await evaluation.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Evaluation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
