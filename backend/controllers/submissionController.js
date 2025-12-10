const Submission = require('../models/Submission');
const Group = require('../models/Group');
const Drive = require('../models/Drive');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Submit or update submission (logbook, synopsis, report, ppt, etc.)
 */
exports.submitFile = async (req, res, next) => {
  try {
    const { groupId, driveId, submissionType, title, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    // Validate group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check user is part of group
    const isGroupMember = group.leader.toString() === req.user.id.toString() ||
      group.members.some(m => m.student.toString() === req.user.id.toString());

    if (!isGroupMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit for this group'
      });
    }

    // Resolve drive: prefer provided driveId, otherwise derive from group
    const resolvedDriveId = driveId || group.drive;
    if (!mongoose.Types.ObjectId.isValid(resolvedDriveId)) {
      return res.status(400).json({ success: false, message: 'Invalid drive ID' });
    }

    const drive = await Drive.findById(resolvedDriveId);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    // Find or create submission
    let submission = await Submission.findOne({
      group: groupId,
      drive: resolvedDriveId,
      submissionType
    });

    if (!submission) {
      submission = await Submission.create({
        group: groupId,
        drive: resolvedDriveId,
        submissionType,
        title,
        description,
        submittedBy: req.user.id,
        status: 'draft'
      });
    }

    // Handle file upload (file path from multer middleware)
    if (req.file) {
      const fileData = {
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        uploadedAt: new Date()
      };

      // Add to appropriate submission type
      submission[submissionType] = fileData;

      // Update status to submitted if file is uploaded
      submission.status = 'submitted';
      submission.submittedAt = new Date();
      submission.submittedBy = req.user.id;
    }

    // Update title and description if provided
    if (title) submission.title = title;
    if (description) submission.description = description;

    await submission.save();
    await submission.populate('submittedBy', 'name email batch');
    await submission.populate('reviewedBy', 'name email');

    res.status(201).json({
      success: true,
      message: `${submissionType} submission successful`,
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get submissions for a group
 */
exports.getSubmissions = async (req, res, next) => {
  try {
    let query = {};

    if (req.query.groupId) {
      query.group = req.query.groupId;
    }
    if (req.query.driveId) {
      query.drive = req.query.driveId;
    }
    if (req.query.submissionType) {
      query.submissionType = req.query.submissionType;
    }

    // Filter based on user role
    if (req.user.role === 'student') {
      // Students can only see their own group's submissions
      const groups = await Group.find({
        $or: [
          { leader: req.user.id },
          { 'members.student': req.user.id }
        ]
      }).select('_id');

      const groupIds = groups.map(g => g._id);
      query.group = { $in: groupIds };
    } else if (req.user.role === 'mentor') {
      // Mentors can see submissions from their assigned groups
      const groups = await Group.find({ assignedMentor: req.user.id }).select('_id');
      const groupIds = groups.map(g => g._id);
      query.group = { $in: groupIds };
    }

    const submissions = await Submission.find(query)
      .populate('group', 'name projectTitle')
      .populate('submittedBy', 'name email batch')
      .populate('reviewedBy', 'name email')
      .sort('-submittedAt');

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
 * Get a single submission
 */
exports.getSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('group', 'name projectTitle')
      .populate('submittedBy', 'name email batch')
      .populate('reviewedBy', 'name email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check authorization
    const group = await Group.findById(submission.group);
    const isGroupMember = group.leader.toString() === req.user.id.toString() ||
      group.members.some(m => m.student.toString() === req.user.id.toString());

    if (req.user.role === 'student' && !isGroupMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this submission'
      });
    }

    if (req.user.role === 'mentor' && group.assignedMentor.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this submission'
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
 * Review submission (mentor only)
 */
exports.reviewSubmission = async (req, res, next) => {
  try {
    const { status, feedback, remarks } = req.body;

    const submission = await Submission.findById(req.params.id).populate('group');
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check mentor authorization
    const group = await Group.findById(submission.group);
    if (group.assignedMentor.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only assigned mentor can review this submission'
      });
    }

    // Update submission
    submission.status = status;
    submission.feedback = feedback;
    submission.remarks = remarks;
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = new Date();

    // If revision requested, add to revisions array
    if (status === 'revision-requested') {
      submission.revisions.push({
        version: submission.version,
        submittedAt: submission.submittedAt,
        feedback: feedback,
        status: 'revision-requested',
        submittedBy: submission.submittedBy
      });
      submission.version++;
    }

    await submission.save();
    await submission.populate('reviewedBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Submission ${status}`,
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get submission stats for a drive
 */
exports.getSubmissionStats = async (req, res, next) => {
  try {
    const { driveId } = req.params;

    const drive = await Drive.findById(driveId);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    // Get all submission types and their status counts
    const stats = await Submission.aggregate([
      { $match: { drive: drive._id } },
      {
        $group: {
          _id: {
            submissionType: '$submissionType',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.submissionType': 1, '_id.status': 1 }
      }
    ]);

    // Count distinct groups that have submitted per submission type
    const groupCounts = await Submission.aggregate([
      { $match: { drive: drive._id } },
      {
        $group: {
          _id: {
            submissionType: '$submissionType',
            group: '$group'
          }
        }
      },
      {
        $group: {
          _id: '$_id.submissionType',
          groupsSubmitted: { $sum: 1 }
        }
      }
    ]);

    // Format stats by submission type
    const formattedStats = {};
    stats.forEach(stat => {
      if (!formattedStats[stat._id.submissionType]) {
        formattedStats[stat._id.submissionType] = {};
      }
      formattedStats[stat._id.submissionType][stat._id.status] = stat.count;
    });

    const formattedGroupCounts = {};
    groupCounts.forEach(item => {
      formattedGroupCounts[item._id] = item.groupsSubmitted;
    });

    // Get total groups for percentage calculation
    const totalGroups = await Group.countDocuments({ drive: driveId });

    res.status(200).json({
      success: true,
      data: {
        stats: formattedStats,
        groupsSubmitted: formattedGroupCounts,
        totalGroups,
        drive: {
          name: drive.name,
          currentStage: drive.currentStage
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Drive-wide submission progress (per group, per submission type)
 * Admin: all groups in drive; Mentor: only assigned groups
 */
exports.getDriveSubmissionProgress = async (req, res, next) => {
  try {
    const { driveId } = req.params;

    const drive = await Drive.findById(driveId);
    if (!drive) {
      return res.status(404).json({ success: false, message: 'Drive not found' });
    }

    const groupQuery = { drive: driveId };
    if (req.user.role === 'mentor') {
      groupQuery.assignedMentor = req.user.id;
    }

    const groups = await Group.find(groupQuery)
      .select('_id name projectTitle assignedMentor status');

    if (!groups.length) {
      return res.status(200).json({
        success: true,
        data: {
          drive: { id: drive.id, name: drive.name, currentStage: drive.currentStage },
          groups: [],
          summary: {}
        }
      });
    }

    const groupIds = groups.map(g => g._id);

    // Get latest submission per group per submissionType
    const submissions = await Submission.aggregate([
      { $match: { drive: drive._id, group: { $in: groupIds } } },
      { $sort: { submittedAt: -1, createdAt: -1 } },
      {
        $group: {
          _id: { group: '$group', submissionType: '$submissionType' },
          status: { $first: '$status' },
          submittedAt: { $first: '$submittedAt' },
          reviewedAt: { $first: '$reviewedAt' },
          version: { $first: '$version' },
          isLateSubmission: { $first: '$isLateSubmission' }
        }
      }
    ]);

    // Build per-group progress map
    const progressMap = {};
    groups.forEach(g => {
      progressMap[g._id.toString()] = {
        groupId: g._id,
        name: g.name,
        projectTitle: g.projectTitle,
        status: g.status,
        submissions: {}
      };
    });

    const summary = {};

    submissions.forEach(item => {
      const groupId = item._id.group.toString();
      const type = item._id.submissionType;

      if (!progressMap[groupId]) return;

      progressMap[groupId].submissions[type] = {
        status: item.status,
        submittedAt: item.submittedAt,
        reviewedAt: item.reviewedAt,
        version: item.version,
        isLateSubmission: item.isLateSubmission
      };

      // Build summary per submission type
      if (!summary[type]) {
        summary[type] = {
          groupsSubmitted: new Set(),
          statusCounts: {}
        };
      }
      summary[type].groupsSubmitted.add(groupId);
      summary[type].statusCounts[item.status] = (summary[type].statusCounts[item.status] || 0) + 1;
    });

    // Convert Set counts to numbers
    Object.keys(summary).forEach(type => {
      summary[type].groupsSubmitted = summary[type].groupsSubmitted.size;
    });

    res.status(200).json({
      success: true,
      data: {
        drive: { id: drive.id, name: drive.name, currentStage: drive.currentStage },
        groups: Object.values(progressMap),
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark submission as late
 */
exports.markLateSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { isLateSubmission: true },
      { new: true }
    ).populate('submittedBy', 'name email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Submission marked as late',
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete/Withdraw submission
 */
exports.deleteSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check authorization - only submitter or admin can delete
    if (submission.submittedBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this submission'
      });
    }

    // Only allow deletion if status is draft
    if (submission.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete draft submissions'
      });
    }

    await Submission.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
