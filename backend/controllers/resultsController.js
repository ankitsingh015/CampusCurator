const Evaluation = require('../models/Evaluation');
const Group = require('../models/Group');

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

// GET /api/results
// Returns published evaluation summary for the student's group (or mentor/admin scope)
exports.getResults = async (req, res, next) => {
  try {
    const role = req.user.role;
    let groupIds = [];

    if (role === 'student') {
      const myGroup = await Group.findOne({
        $or: [
          { leader: req.user.id },
          { 'members.student': req.user.id, 'members.status': 'accepted' }
        ]
      }).populate('drive', 'name');

      // Fallback: derive group from student's submissions if membership isn't accepted yet
      if (!myGroup) {
        const fallbackGroup = await Group.findOne({ 'members.student': req.user.id }).populate('drive', 'name');
        if (!fallbackGroup) return res.status(200).json({ success: true, data: [] });
        groupIds = [fallbackGroup._id];
      } else {
        groupIds = [myGroup._id];
      }
    } else if (role === 'mentor') {
      const groups = await Group.find({ assignedMentor: req.user.id }).populate('drive', 'name');
      groupIds = groups.map(g => g._id);
      if (!groupIds.length) return res.status(200).json({ success: true, data: [] });
    } else {
      // admin: no restriction
      groupIds = [];
    }

    const evalFilter = {};
    if (role === 'student') {
      // Show published or finalized evaluations to students
      evalFilter.$or = [{ isVisible: true }, { status: 'finalized' }];
    }
    if (groupIds.length) {
      evalFilter.group = { $in: groupIds };
    }

    const evaluations = await Evaluation.find(evalFilter)
      .populate('group', 'name drive')
      .populate('drive', 'name')
      .populate('submission', 'submissionType title');

    if (!evaluations.length) return res.status(200).json({ success: true, data: [] });

    // Group evaluations by group id
    const grouped = evaluations.reduce((acc, ev) => {
      const gId = ev.group?._id?.toString() || ev.group?.toString();
      if (!gId) return acc;
      if (!acc[gId]) {
        acc[gId] = {
          _id: gId,
          groupName: ev.group?.name || 'Group',
          driveName: ev.drive?.name || 'Drive',
          grade: null,
          status: 'published',
          logbook_marks: 0,
          synopsis_marks: 0,
          report_marks: 0,
          ppt_marks: 0,
          midsem_marks: 0,
          endsem_marks: 0,
          final_marks: 0,
          _maxTotal: 0,
          feedback: ev.feedback || ''
        };
      }

      const bucket = acc[gId];
      const type = ev.submission?.submissionType;
      const marks = ev.totalMarks || 0;
      const max = ev.maxMarks || 0;

      if (type === 'logbook') bucket.logbook_marks = marks;
      if (type === 'synopsis') bucket.synopsis_marks = marks;
      if (type === 'report') bucket.report_marks = marks;
      if (type === 'ppt') bucket.ppt_marks = marks;
      // optionally map midsem/endsem if submission types exist
      if (type === 'midsem') bucket.midsem_marks = marks;
      if (type === 'endsem') bucket.endsem_marks = marks;

      bucket.final_marks += marks;
      bucket._maxTotal += max;
      // keep latest feedback if present
      if (ev.feedback) bucket.feedback = ev.feedback;
      return acc;
    }, {});

    const resultPayload = Object.values(grouped).map(item => {
      const pct = item._maxTotal ? (item.final_marks / item._maxTotal) * 100 : 0;
      return {
        ...item,
        grade: calculateGrade(pct)
      };
    });

    return res.status(200).json({ success: true, data: resultPayload });
  } catch (error) {
    next(error);
  }
};
