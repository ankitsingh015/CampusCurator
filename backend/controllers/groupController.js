const Group = require('../models/Group');
const Drive = require('../models/Drive');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
// Update group metadata (project title/description, mentor preferences) by leader
exports.updateGroupInfo = async (req, res, next) => {
  try {
    const { projectTitle, projectDescription, mentorIds } = req.body;

    const group = await Group.findById(req.params.id).populate('drive', 'mentors status currentStage');
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.leader.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group leader can update details' });
    }

    const incomingMentorIds = Array.isArray(mentorIds) ? mentorIds.filter(Boolean).map(id => id.toString()) : [];

    if (group.assignedMentor && incomingMentorIds.length && group.assignedMentor.toString() !== incomingMentorIds[0]) {
      return res.status(400).json({ success: false, message: 'Mentor already assigned; cannot change selection' });
    }

    if (typeof projectTitle === 'string') {
      group.projectTitle = projectTitle.trim();
    }
    if (typeof projectDescription === 'string') {
      group.projectDescription = projectDescription.trim();
    }

    if (incomingMentorIds.length) {
      if (incomingMentorIds.length > 3) {
        return res.status(400).json({ success: false, message: 'You can select up to 3 mentor preferences' });
      }
      // ensure uniqueness while preserving order
      const seen = new Set();
      const orderedUnique = incomingMentorIds.filter(id => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      const allowedMentors = (group.drive?.mentors || []).map(m => m.toString());
      const invalid = orderedUnique.filter(id => !allowedMentors.includes(id));
      if (invalid.length) {
        return res.status(400).json({ success: false, message: 'Selected mentor is not part of this drive' });
      }

      group.mentorPreferences = orderedUnique.map((id, idx) => ({ mentor: id, rank: idx + 1 }));
    }

    // Track when student last updated details/preferences
    group.preferenceUpdatedAt = Date.now();

    await group.save();
    await group.populate('leader', 'name email batch');
    await group.populate('members.student', 'name email batch');
    await group.populate('assignedMentor', 'name email department');
    await group.populate({
      path: 'drive',
      select: 'name status currentStage mentors',
      populate: { path: 'mentors', select: 'name email department' }
    });

    return res.status(200).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};
exports.createGroup = async (req, res, next) => {
  try {
    const { name, drive, maxMembers, mentorPreferences } = req.body;
    const driveDoc = await Drive.findById(drive);
    
    console.log('🎯 Creating group for drive:', drive);
    console.log('📊 Drive found:', driveDoc ? 'YES' : 'NO');
    console.log('📌 Drive status:', driveDoc?.status);
    console.log('✅ Is active?:', driveDoc?.status === 'active');
    
    if (!driveDoc || driveDoc.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Drive is not active or does not exist'
      });
    }
    // Check if student already in ANY group for this drive (not across all drives)
    const existingGroup = await Group.findOne({
      drive,
      $or: [
        { leader: req.user.id },
        { 'members.student': req.user.id }
      ]
    });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'You are already part of a group in this drive.'
      });
    }
    const invitationCode = uuidv4().substring(0, 8).toUpperCase();
    const group = await Group.create({
      name,
      drive,
      leader: req.user.id,
      maxMembers: Math.min(maxMembers, driveDoc.maxGroupSize),
      invitationCode,
      mentorPreferences
    });
    await group.populate('leader', 'name email batch');
    res.status(201).json({
      success: true,
      data: group
    });
  } catch (error) {
    next(error);
  }
};
exports.getGroups = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.drive) {
      query.drive = req.query.drive;
    }
    if (req.user.role === 'student') {
      query.$or = [
        { leader: req.user.id },
        { 'members.student': req.user.id }
      ];
    } else if (req.user.role === 'mentor') {
      query.assignedMentor = req.user.id;
    }
    const groups = await Group.find(query)
      .populate('leader', 'name email batch')
      .populate('members.student', 'name email batch')
      .populate('assignedMentor', 'name email department')
      .populate('drive', 'name status currentStage')
      .sort('-createdAt');
    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    next(error);
  }
};
exports.getGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('leader', 'name email batch')
      .populate('members.student', 'name email batch')
      .populate('assignedMentor', 'name email department')
      .populate({
        path: 'drive',
        select: 'name status currentStage mentors',
        populate: { path: 'mentors', select: 'name email department' }
      })
      .populate('mentorPreferences.mentor', 'name email department');
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    next(error);
  }
};
exports.joinGroup = async (req, res, next) => {
  try {
    const { invitationCode } = req.body;
    const group = await Group.findOne({ invitationCode });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation code'
      });
    }
    if (group.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Group is locked and cannot accept new members'
      });
    }
    // Check if student already in ANY group for this drive (not across all drives)
    const existingGroup = await Group.findOne({
      drive: group.drive,
      $or: [
        { leader: req.user.id },
        { 'members.student': req.user.id }
      ]
    });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'You are already part of a group in this drive.'
      });
    }
    const isMember = group.members.some(
      m => m.student.toString() === req.user.id.toString()
    );
    const isLeader = group.leader.toString() === req.user.id.toString();
    if (isMember || isLeader) {
      return res.status(400).json({
        success: false,
        message: 'You are already part of this group'
      });
    }
    const acceptedMembers = group.members.filter(m => m.status === 'accepted').length;
    if (acceptedMembers + 1 >= group.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Group is full'
      });
    }
    group.members.push({
      student: req.user.id,
      status: 'pending'
    });
    await group.save();
    await group.populate('members.student', 'name email batch');
    res.status(200).json({
      success: true,
      data: group,
      message: 'Join request sent to group leader'
    });
  } catch (error) {
    next(error);
  }
};
exports.manageMemberRequest = async (req, res, next) => {
  try {
    const { action } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    if (group.leader.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only group leader can manage member requests'
      });
    }
    const member = group.members.id(req.params.memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    if (action === 'accept') {
      member.status = 'accepted';
    } else if (action === 'reject') {
      member.status = 'rejected';
      member.remove();
    }
    await group.save();
    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    next(error);
  }
};
exports.removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    if (group.leader.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only group leader can remove members'
      });
    }
    if (group.assignedMentor) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove members after mentor allotment'
      });
    }
    const member = group.members.id(req.params.memberId);
    if (member) {
      member.remove();
      await group.save();
    }
    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    next(error);
  }
};

// Allow a student to leave a group they are part of (leader or member)
exports.leaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isLeader = group.leader.toString() === req.user.id.toString();
    const member = group.members.find(m => m.student.toString() === req.user.id.toString());

    if (!isLeader && !member) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this group'
      });
    }

    if (group.assignedMentor) {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave a group after mentor allotment'
      });
    }

    // Leader leaving: either promote another member or delete the group if empty
    if (isLeader) {
      if (group.members.length === 0) {
        await group.deleteOne();
        return res.status(200).json({
          success: true,
          message: 'Group deleted as the leader left and no members remained'
        });
      }

      // Promote the first accepted member (or first pending if none accepted)
      const nextLeader = group.members.find(m => m.status === 'accepted') || group.members[0];
      group.leader = nextLeader.student;
      // Remove the promoted member from members list
      group.members = group.members.filter(m => m.student.toString() !== nextLeader.student.toString());
      await group.save();
      return res.status(200).json({
        success: true,
        message: 'You left the group. Another member was promoted to leader.',
        data: group
      });
    }

    // Regular member leaving
    group.members = group.members.filter(m => m.student.toString() !== req.user.id.toString());
    await group.save();
    return res.status(200).json({
      success: true,
      message: 'You have left the group',
      data: group
    });
  } catch (error) {
    next(error);
  }
};
exports.deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    if (
      req.user.role !== 'admin' &&
      group.leader.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this group'
      });
    }
    if (group.assignedMentor && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete group after mentor allotment'
      });
    }
    await group.deleteOne();
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
exports.allotMentor = async (req, res, next) => {
  try {
    const { mentorId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    const mentor = await User.findOne({ _id: mentorId, role: 'mentor' });
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }
    const drive = await Drive.findById(group.drive);
    const mentorGroupCount = await Group.countDocuments({
      drive: group.drive,
      assignedMentor: mentorId
    });
    if (mentorGroupCount >= drive.maxGroupsPerMentor) {
      return res.status(400).json({
        success: false,
        message: 'Mentor has reached maximum group limit'
      });
    }
    group.assignedMentor = mentorId;
    group.mentorAllottedAt = Date.now();
    group.mentorAllottedBy = req.user.id;
    group.status = 'mentor-assigned';
    await group.save();
    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    next(error);
  }
};
exports.unassignMentor = async (req, res, next) => {
  try {
    console.log('🔄 Unassigning mentor from group:', req.params.id);
    
    const group = await Group.findById(req.params.id);
    if (!group) {
      console.log('❌ Group not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    console.log('📊 Current group status:', {
      name: group.name,
      assignedMentor: group.assignedMentor,
      status: group.status
    });

    if (!group.assignedMentor) {
      console.log('⚠️ No mentor assigned to this group');
      return res.status(400).json({
        success: false,
        message: 'No mentor assigned to this group'
      });
    }

    group.assignedMentor = null;
    group.mentorAllottedAt = null;
    group.mentorAllottedBy = null;
    group.status = 'formed';
    await group.save();

    console.log('✅ Mentor unassigned successfully');

    res.status(200).json({
      success: true,
      message: 'Mentor unassigned successfully',
      data: group
    });
  } catch (error) {
    console.error('❌ Error unassigning mentor:', error);
    next(error);
  }
};

exports.autoAllotMentors = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.driveId);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    // Fetch all groups without assigned mentors, sorted by createdAt (timestamp-based)
    const groups = await Group.find({
      drive: req.params.driveId,
      assignedMentor: { $exists: false }
    })
      .populate('mentorPreferences.mentor')
      .sort({ createdAt: 1 }); // Sort by earliest first (timestamp-based fair allotment)

    // Initialize mentor capacity tracking
    const mentorCapacity = {};
    for (const mentor of drive.mentors) {
      const currentGroups = await Group.countDocuments({
        drive: req.params.driveId,
        assignedMentor: mentor
      });
      mentorCapacity[mentor.toString()] = drive.maxGroupsPerMentor - currentGroups;
    }

    let allottedCount = 0;
    const failedGroups = [];

    // Process groups in timestamp order (earliest first)
    for (const group of groups) {
      let allotted = false;

      // Check mentor preferences in order (1st, 2nd, 3rd choice)
      if (group.mentorPreferences && group.mentorPreferences.length > 0) {
        const sortedPrefs = group.mentorPreferences.sort((a, b) => a.rank - b.rank);
        
        for (const pref of sortedPrefs) {
          const mentorId = pref.mentor._id.toString();
          
          // Check if mentor has capacity
          if (mentorCapacity[mentorId] > 0) {
            group.assignedMentor = pref.mentor._id;
            group.mentorAllottedAt = new Date();
            group.mentorAllottedBy = req.user.id;
            group.status = 'mentor-assigned';
            mentorCapacity[mentorId]--;
            allottedCount++;
            allotted = true;
            await group.save();
            break;
          }
        }
      }

      // If no preferred mentor available, assign to any mentor with capacity
      if (!allotted) {
        for (const [mentorId, capacity] of Object.entries(mentorCapacity)) {
          if (capacity > 0) {
            group.assignedMentor = mentorId;
            group.mentorAllottedAt = new Date();
            group.mentorAllottedBy = req.user.id;
            group.status = 'mentor-assigned';
            mentorCapacity[mentorId]--;
            allottedCount++;
            allotted = true;
            await group.save();
            break;
          }
        }
      }

      // Track failed allocations for admin manual assignment
      if (!allotted) {
        failedGroups.push({
          groupId: group._id,
          groupName: group.name,
          preferences: group.mentorPreferences.map(p => p.mentor.name)
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `${allottedCount} groups allotted mentors successfully (timestamp-based, first-come-first-served)`,
      allottedCount,
      failedGroups,
      failedCount: failedGroups.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-group remaining students
 * Finds all students not in any group and groups them automatically
 */
exports.autoGroupRemainingStudents = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    
    const drive = await Drive.findById(driveId).populate('participatingStudents');
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    // Find all students already in groups
    const studentsInGroups = await Group.aggregate([
      { $match: { drive: drive._id } },
      { $unwind: '$members' },
      { $group: { _id: null, students: { $push: '$members.student' } } }
    ]);

    const groupedStudentIds = new Set();
    if (studentsInGroups.length > 0) {
      studentsInGroups[0].students.forEach(id => {
        groupedStudentIds.add(id.toString());
      });
    }

    // Also add group leaders
    const groupLeaders = await Group.find({ drive: driveId }, { leader: 1 });
    groupLeaders.forEach(group => {
      groupedStudentIds.add(group.leader.toString());
    });

    // Find remaining students
    const remainingStudents = drive.participatingStudents.filter(
      student => !groupedStudentIds.has(student._id.toString())
    );

    if (remainingStudents.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All students are already grouped',
        groupsCreated: 0,
        remainingStudents: []
      });
    }

    // Create groups with remaining students
    const groupsCreated = [];
    const groupSize = drive.maxGroupSize;
    let currentGroupStudents = [];

    for (let i = 0; i < remainingStudents.length; i++) {
      currentGroupStudents.push(remainingStudents[i]._id);

      // Create group when full or at end of list
      if (currentGroupStudents.length === groupSize || i === remainingStudents.length - 1) {
        const invitationCode = uuidv4().substring(0, 8).toUpperCase();
        
        const newGroup = await Group.create({
          name: `Auto-Group-${Date.now()}`,
          drive: driveId,
          leader: currentGroupStudents[0],
          maxMembers: groupSize,
          invitationCode,
          members: currentGroupStudents.slice(1).map(studentId => ({
            student: studentId,
            status: 'accepted'
          })),
          status: 'formed',
          mentorPreferences: [] // Will need manual assignment or later preference entry
        });

        await newGroup.populate('leader', 'name email batch');
        await newGroup.populate('members.student', 'name email batch');

        groupsCreated.push({
          groupId: newGroup._id,
          groupName: newGroup.name,
          memberCount: currentGroupStudents.length
        });

        currentGroupStudents = [];
      }
    }

    res.status(201).json({
      success: true,
      message: `${groupsCreated.length} auto-groups created for remaining students`,
      groupsCreated,
      totalStudentsGrouped: remainingStudents.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get remaining (ungrouped) students for a drive
 */
exports.getRemainingStudents = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    
    const drive = await Drive.findById(driveId).populate('participatingStudents', 'name email batch registrationNumber');
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Drive not found'
      });
    }

    // Find all students already in groups
    const studentsInGroups = await Group.aggregate([
      { $match: { drive: drive._id } },
      { $unwind: '$members' },
      { $group: { _id: null, students: { $push: '$members.student' } } }
    ]);

    const groupedStudentIds = new Set();
    if (studentsInGroups.length > 0) {
      studentsInGroups[0].students.forEach(id => {
        groupedStudentIds.add(id.toString());
      });
    }

    // Also add group leaders
    const groupLeaders = await Group.find({ drive: driveId }, { leader: 1 });
    groupLeaders.forEach(group => {
      groupedStudentIds.add(group.leader.toString());
    });

    // Get remaining students
    const remainingStudents = drive.participatingStudents.filter(
      student => !groupedStudentIds.has(student._id.toString())
    );

    res.status(200).json({
      success: true,
      count: remainingStudents.length,
      data: remainingStudents
    });
  } catch (error) {
    next(error);
  }
};

