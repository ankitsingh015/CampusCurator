const Drive = require('../models/Drive');
const User = require('../models/User');
const Group = require('../models/Group');

exports.createDrive = async (req, res, next) => {
  try {
    const {
      participatingStudentEmails,
      mentorEmails,
      participatingStudents, // Support frontend format
      mentors, // Support frontend format
      ...driveData
    } = req.body;

    driveData.createdBy = req.user.id;

    // Handle student emails (support both formats)
    const studentEmails = participatingStudentEmails || participatingStudents;
    if (studentEmails && studentEmails.length > 0) {
      const existingStudents = await User.find({
        email: { $in: studentEmails },
        role: 'student'
      });
      
      const foundEmails = existingStudents.map(s => s.email);
      const notFoundEmails = studentEmails.filter(email => !foundEmails.includes(email));
      
      // Auto-create missing students
      if (notFoundEmails.length > 0) {
        console.log(`📝 Auto-creating ${notFoundEmails.length} new students...`);
        
        const newStudents = notFoundEmails.map(email => {
          // Extract details from email (e.g., 22bcs015@smvdu.ac.in)
          const entryNo = email.split('@')[0].toLowerCase();
          
          // Extract year (22 -> 2022, 23 -> 2023)
          const yearMatch = entryNo.match(/^(\d{2})/);
          const batch = yearMatch ? `20${yearMatch[1]}` : new Date().getFullYear().toString();
          
          // Extract department code (bcs -> Computer Science, bec -> Electronics, etc.)
          const deptMatch = entryNo.match(/\d{2}([a-z]+)/i);
          let department = 'Not Specified';
          if (deptMatch) {
            const deptCode = deptMatch[1].toLowerCase();
            const deptMap = {
              'bcs': 'Computer Science',
              'bec': 'Electronics',
              'bee': 'Electrical Engineering',
              'bme': 'Mechanical Engineering',
              'bce': 'Civil Engineering',
              'bit': 'Information Technology',
              'mcs': 'Computer Science',
              'mec': 'Electronics'
            };
            department = deptMap[deptCode] || 'Computer Science';
          }
          
          return {
            name: entryNo.toUpperCase(),
            email: email,
            password: 'student123', // Default password
            role: 'student',
            batch: batch,
            department: department,
            registrationNumber: entryNo.toUpperCase()
          };
        });
        
        try {
          const createdStudents = await User.insertMany(newStudents, { ordered: false });
          console.log(`✅ Created ${createdStudents.length} new students`);
          existingStudents.push(...createdStudents);
        } catch (err) {
          if (err.code === 11000) {
            // Some duplicates, fetch them
            const retryStudents = await User.find({
              email: { $in: notFoundEmails },
              role: 'student'
            });
            existingStudents.push(...retryStudents);
          } else {
            throw err;
          }
        }
      }
      
      driveData.participatingStudents = existingStudents.map(s => s._id);
    }

    // Handle mentor emails (support both formats)
    const mentorEmailsList = mentorEmails || mentors;
    if (mentorEmailsList && mentorEmailsList.length > 0) {
      const existingMentors = await User.find({
        email: { $in: mentorEmailsList },
        role: 'mentor'
      });
      
      const foundEmails = existingMentors.map(m => m.email);
      const notFoundEmails = mentorEmailsList.filter(email => !foundEmails.includes(email));
      
      // Auto-create missing mentors
      if (notFoundEmails.length > 0) {
        console.log(`📝 Auto-creating ${notFoundEmails.length} new mentors...`);
        
        const newMentors = notFoundEmails.map(email => {
          // Extract name from email (john.smith@smvdu.ac.in -> John Smith)
          const namePart = email.split('@')[0];
          const nameParts = namePart.split(/[._-]/);
          const formattedName = nameParts
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
          
          return {
            name: formattedName || email.split('@')[0],
            email: email,
            password: 'mentor123', // Default password
            role: 'mentor',
            department: 'Faculty', // Generic department for auto-created mentors
            phone: ''
          };
        });
        
        try {
          const createdMentors = await User.insertMany(newMentors, { ordered: false });
          console.log(`✅ Created ${createdMentors.length} new mentors`);
          existingMentors.push(...createdMentors);
        } catch (err) {
          if (err.code === 11000) {
            // Some duplicates, fetch them
            const retryMentors = await User.find({
              email: { $in: notFoundEmails },
              role: 'mentor'
            });
            existingMentors.push(...retryMentors);
          } else {
            throw err;
          }
        }
      }
      
      driveData.mentors = existingMentors.map(m => m._id);
    }

    const drive = await Drive.create(driveData);
    
    // Populate the response with user details
    const populatedDrive = await Drive.findById(drive._id)
      .populate('createdBy', 'name email')
      .populate('participatingStudents', 'name email batch')
      .populate('mentors', 'name email department');

    res.status(201).json({
      success: true,
      message: 'Drive created successfully with participants',
      data: populatedDrive
    });
  } catch (error) {
    next(error);
  }
};

exports.getDrives = async (req, res, next) => {
  try {
    let query;
    if (req.user.role === 'student') {
      query = Drive.find({
        $or: [
          { participatingBatches: req.user.batch },
          { participatingStudents: req.user.id }
        ],
        status: { $in: ['active', 'completed'] }
      });
    } else if (req.user.role === 'mentor') {
      query = Drive.find({
        mentors: req.user.id
      });
    } else {
      query = Drive.find();
    }
    const drives = await query
      .populate('createdBy', 'name email')
      .populate('mentors', 'name email department')
      .sort('-createdAt');
    res.status(200).json({
      success: true,
      count: drives.length,
      data: drives
    });
  } catch (error) {
    next(error);
  }
};
exports.getDrive = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('mentors', 'name email department')
      .populate('participatingStudents', 'name email batch');
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }
    res.status(200).json({
      success: true,
      data: drive
    });
  } catch (error) {
    next(error);
  }
};
exports.updateDrive = async (req, res, next) => {
  try {
    let drive = await Drive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }
    
    console.log('🔄 Updating drive:', req.params.id);
    console.log('📝 Update data:', req.body);
    console.log('📌 Current status:', drive.status);
    
    drive = await Drive.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    console.log('✅ Updated status:', drive.status);
    
    res.status(200).json({
      success: true,
      data: drive
    });
  } catch (error) {
    console.error('❌ Update drive error:', error);
    next(error);
  }
};
exports.deleteDrive = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }
    await drive.deleteOne();
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
exports.getDriveStats = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }
    const totalGroups = await Group.countDocuments({ drive: req.params.id });
    const groupsWithMentor = await Group.countDocuments({ 
      drive: req.params.id, 
      assignedMentor: { $exists: true } 
    });
    const activeGroups = await Group.countDocuments({ 
      drive: req.params.id, 
      status: 'active' 
    });
    const totalStudents = drive.participatingStudents.length;
    const studentsInGroups = await Group.aggregate([
      { $match: { drive: mongoose.Types.ObjectId(req.params.id) } },
      { $unwind: '$members' },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);
    res.status(200).json({
      success: true,
      data: {
        drive: {
          name: drive.name,
          status: drive.status,
          currentStage: drive.currentStage
        },
        groups: {
          total: totalGroups,
          withMentor: groupsWithMentor,
          active: activeGroups
        },
        students: {
          total: totalStudents,
          inGroups: studentsInGroups[0]?.count || 0,
          unregistered: totalStudents - (studentsInGroups[0]?.count || 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
exports.updateDriveStage = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }
    const { stage } = req.body;
    drive.currentStage = stage;
    await drive.save();
    res.status(200).json({
      success: true,
      data: drive
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadParticipants = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'students' or 'mentors'
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a CSV file'
      });
    }

    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    // Parse CSV file (simple implementation)
    const fs = require('fs');
    const csv = require('csv-parse/sync');
    
    const fileContent = fs.readFileSync(req.file.path);
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    const emails = records.map(record => record.email || record.Email).filter(Boolean);

    if (type === 'students') {
      // Add students to drive
      const students = await User.find({
        email: { $in: emails },
        role: 'student'
      });
      
      drive.participatingStudents = [...new Set([
        ...drive.participatingStudents,
        ...students.map(s => s._id)
      ])];
      
    } else if (type === 'mentors') {
      // Add mentors to drive
      const mentors = await User.find({
        email: { $in: emails },
        role: 'mentor'
      });
      
      drive.mentors = [...new Set([
        ...drive.mentors,
        ...mentors.map(m => m._id)
      ])];
    }

    await drive.save();

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    const updatedDrive = await Drive.findById(id)
      .populate('participatingStudents', 'name email batch')
      .populate('mentors', 'name email department');

    res.status(200).json({
      success: true,
      message: `${type} uploaded successfully`,
      data: updatedDrive
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Check if a stage can progress to the next stage
 * Returns true/false based on stage completion conditions
 */
const canProgressStage = async (drive, currentStage) => {
  try {
    const Group = require('../models/Group');
    const Synopsis = require('../models/Synopsis');
    const Submission = require('../models/Submission');
    const Evaluation = require('../models/Evaluation');
    const Result = require('../models/Result');

    switch (currentStage) {
      case 'group-formation':
        // All students must be in a group
        const totalStudents = drive.participatingStudents.length;
        const groupedStudents = await Group.aggregate([
          { $match: { drive: drive._id } },
          { $group: { _id: null, count: { $sum: { $size: '$members' } } } },
          { $project: { count: { $add: ['$count', totalStudents] } } }
        ]);
        return groupedStudents.length > 0 && groupedStudents[0].count >= totalStudents;

      case 'mentor-allotment':
        // All groups must have mentors assigned
        const unallottedGroups = await Group.countDocuments({
          drive: drive._id,
          assignedMentor: { $exists: false }
        });
        return unallottedGroups === 0;

      case 'synopsis':
        // All synopses must be approved
        const totalGroups = await Group.countDocuments({ drive: drive._id });
        const approvedSynopsis = await Synopsis.countDocuments({
          drive: drive._id,
          status: 'approved'
        });
        return approvedSynopsis === totalGroups;

      case 'checkpoints':
        // All required submissions must be received
        return true; // Manual trigger

      case 'result':
        // All evaluations must be completed
        return true; // Manual trigger

      default:
        return false;
    }
  } catch (error) {
    console.error('Error in canProgressStage:', error);
    return false;
  }
};

/**
 * Get drive stage progress and status
 */
exports.getDriveProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    const Group = require('../models/Group');
    const Synopsis = require('../models/Synopsis');
    const Submission = require('../models/Submission');
    const Evaluation = require('../models/Evaluation');
    const Result = require('../models/Result');

    // Get statistics for each stage
    const totalGroups = await Group.countDocuments({ drive: driveId });
    const groupsWithMentors = await Group.countDocuments({
      drive: driveId,
      assignedMentor: { $exists: true }
    });

    const synopsisStats = await Synopsis.aggregate([
      { $match: { drive: drive._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const submissionStats = await Submission.aggregate([
      { $match: { drive: drive._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const evaluationStats = await Evaluation.aggregate([
      { $match: { drive: drive._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const resultsPublished = await Result.countDocuments({
      drive: driveId,
      isPublished: true
    });

    res.status(200).json({
      success: true,
      data: {
        currentStage: drive.currentStage,
        stages: drive.stages,
        progress: {
          groupFormation: {
            total: totalGroups,
            completed: totalGroups
          },
          mentorAllotment: {
            total: totalGroups,
            completed: groupsWithMentors
          },
          synopsis: synopsisStats,
          submissions: submissionStats,
          evaluations: evaluationStats,
          results: {
            published: resultsPublished,
            total: totalGroups
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually progress drive to next stage
 */
exports.progressStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const drive = await Drive.findById(id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    // Define stage progression
    const stageProgression = {
      'group-formation': 'mentor-allotment',
      'mentor-allotment': 'synopsis',
      'synopsis': 'checkpoints',
      'checkpoints': 'result',
      'result': 'completed'
    };

    const currentStage = drive.currentStage;
    const nextStage = stageProgression[currentStage];

    if (!nextStage) {
      return res.status(400).json({
        success: false,
        message: 'Drive is already completed or cannot progress further'
      });
    }

    // Check if progression is allowed
    const canProgress = await canProgressStage(drive, currentStage);
    if (!canProgress && req.body.force !== true) {
      return res.status(400).json({
        success: false,
        message: `Cannot progress to ${nextStage}. Not all conditions met for current stage.`,
        currentStage,
        action: 'Use force: true in request body to override'
      });
    }

    // Update current stage
    drive.currentStage = nextStage;

    // Update stage status
    if (drive.stages[currentStage]) {
      drive.stages[currentStage].status = 'completed';
    }
    if (drive.stages[nextStage]) {
      drive.stages[nextStage].status = 'active';
    }

    await drive.save();

    res.status(200).json({
      success: true,
      message: `Drive progressed from ${currentStage} to ${nextStage}`,
      data: {
        previousStage: currentStage,
        currentStage: drive.currentStage,
        stages: drive.stages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Regress drive stage (go back to previous stage)
 */
exports.regressStage = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    const currentStage = drive.currentStage;
    
    // Define stage order
    const stageOrder = [
      'group-formation',
      'mentor-allotment',
      'synopsis',
      'checkpoints',
      'result',
      'completed'
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    
    if (currentIndex <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Already at the first stage. Cannot go back further.'
      });
    }

    const previousStage = stageOrder[currentIndex - 1];
    
    // Update drive stage
    drive.currentStage = previousStage;
    
    // Update stage statuses
    if (previousStage === 'group-formation') {
      drive.stages.groupFormation.status = 'active';
      drive.stages.mentorAllotment.status = 'not-started';
    } else if (previousStage === 'mentor-allotment') {
      drive.stages.mentorAllotment.status = 'active';
      drive.stages.synopsisSubmission.status = 'not-started';
    } else if (previousStage === 'synopsis') {
      drive.stages.synopsisSubmission.status = 'active';
      // Reset checkpoint statuses
      if (drive.stages.checkpoints && drive.stages.checkpoints.length > 0) {
        drive.stages.checkpoints.forEach(cp => cp.status = 'not-started');
      }
    } else if (previousStage === 'checkpoints') {
      if (drive.stages.checkpoints && drive.stages.checkpoints.length > 0) {
        drive.stages.checkpoints[0].status = 'active';
      }
      if (drive.stages.result) {
        drive.stages.result.status = 'not-started';
      }
    } else if (previousStage === 'result') {
      if (drive.stages.result) {
        drive.stages.result.status = 'active';
      }
    }

    await drive.save();

    res.status(200).json({
      success: true,
      message: `Drive regressed from ${currentStage} to ${previousStage}`,
      data: {
        previousStage: currentStage,
        currentStage: drive.currentStage,
        stages: drive.stages
      }
    });
  } catch (error) {
    console.error('Error in regressStage:', error);
    next(error);
  }
};

/**
 * Get drive statistics
 */
exports.getDriveStats = async (req, res, next) => {
  try {
    const { driveId } = req.params;

    const drive = await Drive.findById(driveId);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    const Group = require('../models/Group');
    const User = require('../models/User');

    const totalGroups = await Group.countDocuments({ drive: driveId });
    const totalStudents = drive.participatingStudents.length;
    const totalMentors = drive.mentors.length;
    
    const groupsByStatus = await Group.aggregate([
      { $match: { drive: drive._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Students per mentor
    const studentsPerMentor = await Group.aggregate([
      { $match: { drive: drive._id, assignedMentor: { $exists: true } } },
      { $group: { _id: '$assignedMentor', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        drive: {
          name: drive.name,
          status: drive.status,
          currentStage: drive.currentStage
        },
        statistics: {
          totalStudents,
          totalGroups,
          totalMentors,
          maxGroupSize: drive.maxGroupSize,
          maxGroupsPerMentor: drive.maxGroupsPerMentor,
          groupsByStatus,
          studentsPerMentor
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
