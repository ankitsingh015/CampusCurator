const Drive = require('../models/Drive');
const User = require('../models/User');
const Group = require('../models/Group');

exports.createDrive = async (req, res, next) => {
  try {
    const {
      participatingStudentEmails,
      mentorEmails,
      ...driveData
    } = req.body;

    driveData.createdBy = req.user.id;

    // Convert student emails to ObjectIds if provided
    if (participatingStudentEmails && participatingStudentEmails.length > 0) {
      const students = await User.find({
        email: { $in: participatingStudentEmails },
        role: 'student'
      });
      
      if (students.length !== participatingStudentEmails.length) {
        const foundEmails = students.map(s => s.email);
        const notFound = participatingStudentEmails.filter(email => !foundEmails.includes(email));
        return res.status(400).json({
          success: false,
          message: `Students not found with emails: ${notFound.join(', ')}`
        });
      }
      
      driveData.participatingStudents = students.map(s => s._id);
    }

    // Convert mentor emails to ObjectIds if provided
    if (mentorEmails && mentorEmails.length > 0) {
      const mentors = await User.find({
        email: { $in: mentorEmails },
        role: 'mentor'
      });
      
      if (mentors.length !== mentorEmails.length) {
        const foundEmails = mentors.map(m => m.email);
        const notFound = mentorEmails.filter(email => !foundEmails.includes(email));
        return res.status(400).json({
          success: false,
          message: `Mentors not found with emails: ${notFound.join(', ')}`
        });
      }
      
      driveData.mentors = mentors.map(m => m._id);
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
    drive = await Drive.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    res.status(200).json({
      success: true,
      data: drive
    });
  } catch (error) {
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
