const CheckpointSubmission = require('../models/CheckpointSubmission');
const Group = require('../models/Group');
const Drive = require('../models/Drive');
const fs = require('fs');
const path = require('path');

/**
 * Submit checkpoint
 * POST /api/checkpoints
 */
exports.submitCheckpoint = async (req, res, next) => {
  try {
    const { groupId, checkpointIndex, title, description } = req.body;

    // Validate group
    const group = await Group.findById(groupId).populate('drive');
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Validate user is member or leader of group
    const userId = req.user.id;
    const isLeader = group.leader.toString() === userId;
    const isMember = group.members.some(m => m.student.toString() === userId);

    if (!isLeader && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to submit for this group'
      });
    }

    const drive = group.drive;

    // Get checkpoint name from drive config
    const checkpoint = drive.stages?.find(s => s.name === 'checkpoints');
    const checkpointName = checkpoint?.checkpoints?.[checkpointIndex]?.name || `Checkpoint ${checkpointIndex + 1}`;

    // Check if submission already exists
    let submission = await CheckpointSubmission.findOne({
      group: groupId,
      checkpointIndex: checkpointIndex
    });

    // Process uploaded files
    const files = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        files.push({
          fileName: file.originalname,
          fileUrl: file.path,
          fileType: file.mimetype.includes('pdf') ? 'report' : 
                   file.mimetype.includes('zip') ? 'code' :
                   file.mimetype.includes('ppt') || file.mimetype.includes('presentation') ? 'presentation' :
                   file.mimetype.includes('video') ? 'video' : 'other',
          fileSize: file.size,
          uploadedAt: new Date()
        });
      });
    }

    if (submission) {
      // Update existing submission
      submission.title = title;
      submission.description = description;
      submission.files = [...submission.files, ...files];
      submission.submittedBy = userId;
      submission.submittedAt = new Date();
      submission.status = 'submitted';
      await submission.save();
    } else {
      // Create new submission
      submission = await CheckpointSubmission.create({
        group: groupId,
        drive: drive._id,
        checkpointIndex: checkpointIndex,
        checkpointName: checkpointName,
        title,
        description,
        files,
        submittedBy: userId,
        status: 'submitted'
      });
    }

    await submission.populate('group submittedBy');

    res.status(201).json({
      success: true,
      message: 'Checkpoint submitted successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get checkpoint submission by ID
 * GET /api/checkpoints/:id
 */
exports.getCheckpoint = async (req, res, next) => {
  try {
    const submission = await CheckpointSubmission.findById(req.params.id)
      .populate('group', 'name projectTitle')
      .populate('drive', 'name')
      .populate('submittedBy', 'name email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Checkpoint submission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all checkpoint submissions for a group
 * GET /api/checkpoints/group/:groupId
 */
exports.getGroupCheckpoints = async (req, res, next) => {
  try {
    const submissions = await CheckpointSubmission.find({ group: req.params.groupId })
      .sort({ checkpointIndex: 1 })
      .populate('submittedBy', 'name email');

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all checkpoint submissions for a drive
 * GET /api/checkpoints/drive/:driveId
 */
exports.getDriveCheckpoints = async (req, res, next) => {
  try {
    const { checkpointIndex } = req.query;

    const filter = { drive: req.params.driveId };
    if (checkpointIndex !== undefined) {
      filter.checkpointIndex = parseInt(checkpointIndex);
    }

    const submissions = await CheckpointSubmission.find(filter)
      .sort({ checkpointIndex: 1, submittedAt: -1 })
      .populate('group', 'name projectTitle')
      .populate('submittedBy', 'name email');

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update checkpoint submission
 * PUT /api/checkpoints/:id
 */
exports.updateCheckpoint = async (req, res, next) => {
  try {
    const { title, description, status } = req.body;

    let submission = await CheckpointSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Checkpoint submission not found'
      });
    }

    // Update fields
    if (title) submission.title = title;
    if (description) submission.description = description;
    if (status) submission.status = status;

    // Add new files if uploaded
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: file.path,
        fileType: file.mimetype.includes('pdf') ? 'report' : 
                 file.mimetype.includes('zip') ? 'code' :
                 file.mimetype.includes('ppt') ? 'presentation' : 'other',
        fileSize: file.size,
        uploadedAt: new Date()
      }));
      submission.files = [...submission.files, ...newFiles];
    }

    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Checkpoint updated successfully',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete checkpoint submission
 * DELETE /api/checkpoints/:id
 */
exports.deleteCheckpoint = async (req, res, next) => {
  try {
    const submission = await CheckpointSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Checkpoint submission not found'
      });
    }

    // Delete associated files
    submission.files.forEach(file => {
      const filePath = path.resolve(file.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await submission.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Checkpoint submission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get my group's checkpoints (student view)
 * GET /api/checkpoints/my-submissions
 */
exports.getMyCheckpoints = async (req, res, next) => {
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

    const submissions = await CheckpointSubmission.find({ group: group._id })
      .sort({ checkpointIndex: 1 })
      .populate('submittedBy', 'name email');

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    next(error);
  }
};
