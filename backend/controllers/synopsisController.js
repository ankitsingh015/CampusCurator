const Synopsis = require('../models/Synopsis');
const Group = require('../models/Group');
const User = require('../models/User');
const path = require('path');
const { notifySynopsisReviewed } = require('../utils/notifications');

/**
 * @desc    Submit synopsis for a group
 * @route   POST /api/synopsis
 * @access  Private/Student
 */
exports.submitSynopsis = async (req, res, next) => {
  try {
    const { groupId, title, abstract, objectives, methodology, expectedOutcome, technologies } = req.body;

    // Verify group exists and user is part of it
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is leader or member of the group
    const isLeader = group.leader.toString() === req.user.id;
    const isMember = group.members.some(m => m.student.toString() === req.user.id);

    if (!isLeader && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to submit synopsis for this group'
      });
    }

    // Check if group has assigned mentor
    if (!group.assignedMentor) {
      return res.status(400).json({
        success: false,
        message: 'Group must have an assigned mentor before submitting synopsis'
      });
    }

    // Handle file uploads
    const documents = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        documents.push({
          fileName: file.originalname,
          fileUrl: `/uploads/${path.basename(file.path)}`,
          fileSize: file.size
        });
      });
    }

    // Check if synopsis already exists for this group
    let synopsis = await Synopsis.findOne({ group: groupId });

    if (synopsis) {
      // Store current version in revisions before updating
      synopsis.revisions.push({
        version: synopsis.version,
        submittedAt: synopsis.submittedAt,
        feedback: synopsis.feedback,
        status: synopsis.status
      });

      // Update synopsis with new data
      synopsis.version += 1;
      synopsis.title = title;
      synopsis.abstract = abstract;
      synopsis.objectives = objectives || synopsis.objectives;
      synopsis.methodology = methodology || synopsis.methodology;
      synopsis.expectedOutcome = expectedOutcome || synopsis.expectedOutcome;
      synopsis.technologies = technologies || synopsis.technologies;
      synopsis.documents = documents.length > 0 ? documents : synopsis.documents;
      synopsis.submittedBy = req.user.id;
      synopsis.submittedAt = Date.now();
      synopsis.status = 'submitted';
      synopsis.reviewedBy = undefined;
      synopsis.reviewedAt = undefined;
      synopsis.feedback = undefined;

      await synopsis.save();
    } else {
      // Create new synopsis
      synopsis = await Synopsis.create({
        group: groupId,
        drive: group.drive,
        title,
        abstract,
        objectives,
        methodology,
        expectedOutcome,
        technologies,
        documents,
        submittedBy: req.user.id,
        status: 'submitted'
      });
    }

    // Populate the response
    await synopsis.populate('group', 'name');
    await synopsis.populate('submittedBy', 'name email');

    // Notify mentor about new synopsis submission
    if (group.assignedMentor) {
      const { createNotificationWithEmail } = require('../utils/notifications');
      const { emailTemplates, sendEmail } = require('../utils/email');
      
      const mentor = await User.findById(group.assignedMentor);
      
      // Create in-app notification
      await createNotificationWithEmail({
        recipient: group.assignedMentor,
        type: 'synopsis-submitted',
        title: 'New Synopsis Submission',
        message: `Group "${group.name}" has submitted their project synopsis "${title}" for review.`,
        relatedGroup: groupId,
        actionUrl: `/mentor/reviews`
      }, true); // Send email

      // Send detailed email to mentor
      const template = emailTemplates.synopsisSubmitted(group.name, title);
      await sendEmail({
        email: mentor.email,
        subject: template.subject,
        message: template.message,
        html: template.html
      }).catch(err => console.error('Email failed:', err));
    }

    res.status(201).json({
      success: true,
      message: synopsis.version > 1 ? 'Synopsis updated successfully' : 'Synopsis submitted successfully',
      data: synopsis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get synopsis by ID
 * @route   GET /api/synopsis/:id
 * @access  Private
 */
exports.getSynopsis = async (req, res, next) => {
  try {
    const synopsis = await Synopsis.findById(req.params.id)
      .populate('group', 'name leader members assignedMentor')
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name email');

    if (!synopsis) {
      return res.status(404).json({
        success: false,
        message: 'Synopsis not found'
      });
    }

    // Check authorization
    const group = await Group.findById(synopsis.group._id);
    const isGroupMember = group.leader.toString() === req.user.id || 
                          group.members.some(m => m.student.toString() === req.user.id);
    const isMentor = group.assignedMentor && group.assignedMentor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isGroupMember && !isMentor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this synopsis'
      });
    }

    res.status(200).json({
      success: true,
      data: synopsis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get synopsis for a group
 * @route   GET /api/synopsis/group/:groupId
 * @access  Private
 */
exports.getGroupSynopsis = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check authorization
    const isGroupMember = group.leader.toString() === req.user.id || 
                          group.members.some(m => m.student.toString() === req.user.id);
    const isMentor = group.assignedMentor && group.assignedMentor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isGroupMember && !isMentor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this synopsis'
      });
    }

    const synopsis = await Synopsis.findOne({ group: groupId })
      .populate('group', 'name leader members assignedMentor')
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name email');

    if (!synopsis) {
      return res.status(404).json({
        success: false,
        message: 'Synopsis not found for this group'
      });
    }

    res.status(200).json({
      success: true,
      data: synopsis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all synopses (for mentor/admin)
 * @route   GET /api/synopsis
 * @access  Private/Mentor/Admin
 */
exports.getAllSynopses = async (req, res, next) => {
  try {
    const { status, drive } = req.query;
    let query = {};

    // Mentors can only see synopses for their assigned groups
    if (req.user.role === 'mentor') {
      const groups = await Group.find({ assignedMentor: req.user.id });
      const groupIds = groups.map(g => g._id);
      query.group = { $in: groupIds };
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by drive if provided
    if (drive) {
      query.drive = drive;
    }

    const synopses = await Synopsis.find(query)
      .populate('group', 'name leader members')
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .sort('-submittedAt');

    res.status(200).json({
      success: true,
      count: synopses.length,
      data: synopses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Review synopsis (approve/reject/request revision)
 * @route   PUT /api/synopsis/:id/review
 * @access  Private/Mentor
 */
exports.reviewSynopsis = async (req, res, next) => {
  try {
    const { status, feedback } = req.body;

    // Validate status
    const validStatuses = ['approved', 'rejected', 'revision-requested'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or revision-requested'
      });
    }

    // Feedback is required for rejection or revision request
    if ((status === 'rejected' || status === 'revision-requested') && !feedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback is required when rejecting or requesting revision'
      });
    }

    const synopsis = await Synopsis.findById(req.params.id)
      .populate('group', 'name leader members assignedMentor');

    if (!synopsis) {
      return res.status(404).json({
        success: false,
        message: 'Synopsis not found'
      });
    }

    // Check if user is the assigned mentor
    if (synopsis.group.assignedMentor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned mentor can review this synopsis'
      });
    }

    // Check if synopsis is in a reviewable state
    if (!['submitted', 'under-review'].includes(synopsis.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot review synopsis with status: ${synopsis.status}`
      });
    }

    // Update synopsis
    synopsis.status = status;
    synopsis.feedback = feedback;
    synopsis.reviewedBy = req.user.id;
    synopsis.reviewedAt = Date.now();

    await synopsis.save();
    await synopsis.populate('reviewedBy', 'name email');

    // Get all group members for notification
    const group = await Group.findById(synopsis.group._id).populate('leader members.student');
    const studentIds = [group.leader._id, ...group.members.map(m => m.student._id)];

    // Notify students about review
    await notifySynopsisReviewed(
      synopsis.group._id,
      synopsis.group.name,
      studentIds,
      status,
      feedback || 'No feedback provided',
      true // Send email
    );

    res.status(200).json({
      success: true,
      message: `Synopsis ${status}`,
      data: synopsis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update synopsis (for resubmission after revision request)
 * @route   PUT /api/synopsis/:id
 * @access  Private/Student
 */
exports.updateSynopsis = async (req, res, next) => {
  try {
    const { title, abstract, objectives, methodology, expectedOutcome, technologies } = req.body;

    const synopsis = await Synopsis.findById(req.params.id).populate('group');

    if (!synopsis) {
      return res.status(404).json({
        success: false,
        message: 'Synopsis not found'
      });
    }

    // Check if user is part of the group
    const group = synopsis.group;
    const isLeader = group.leader.toString() === req.user.id;
    const isMember = group.members.some(m => m.student.toString() === req.user.id);

    if (!isLeader && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this synopsis'
      });
    }

    // Can only update if status is revision-requested or draft
    if (!['revision-requested', 'draft'].includes(synopsis.status)) {
      return res.status(400).json({
        success: false,
        message: 'Synopsis can only be updated when revision is requested or in draft status'
      });
    }

    // Store current version in revisions
    synopsis.revisions.push({
      version: synopsis.version,
      submittedAt: synopsis.submittedAt,
      feedback: synopsis.feedback,
      status: synopsis.status
    });

    // Update fields
    synopsis.version += 1;
    synopsis.title = title || synopsis.title;
    synopsis.abstract = abstract || synopsis.abstract;
    synopsis.objectives = objectives || synopsis.objectives;
    synopsis.methodology = methodology || synopsis.methodology;
    synopsis.expectedOutcome = expectedOutcome || synopsis.expectedOutcome;
    synopsis.technologies = technologies || synopsis.technologies;
    synopsis.submittedBy = req.user.id;
    synopsis.submittedAt = Date.now();
    synopsis.status = 'submitted';
    synopsis.reviewedBy = undefined;
    synopsis.reviewedAt = undefined;
    synopsis.feedback = undefined;

    // Handle new file uploads
    if (req.files && req.files.length > 0) {
      const documents = [];
      req.files.forEach(file => {
        documents.push({
          fileName: file.originalname,
          fileUrl: `/uploads/${path.basename(file.path)}`,
          fileSize: file.size
        });
      });
      synopsis.documents = documents;
    }

    await synopsis.save();
    await synopsis.populate('submittedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Synopsis updated and resubmitted for review',
      data: synopsis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete synopsis
 * @route   DELETE /api/synopsis/:id
 * @access  Private/Admin
 */
exports.deleteSynopsis = async (req, res, next) => {
  try {
    const synopsis = await Synopsis.findById(req.params.id);

    if (!synopsis) {
      return res.status(404).json({
        success: false,
        message: 'Synopsis not found'
      });
    }

    await synopsis.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Synopsis deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
