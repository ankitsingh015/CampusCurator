const express = require('express');
const {
  createGroup,
  getGroups,
  getGroup,
  updateGroupInfo,
  joinGroup,
  manageMemberRequest,
  removeMember,
  deleteGroup,
  allotMentor,
  unassignMentor,
  autoAllotMentors,
  autoGroupRemainingStudents,
  getRemainingStudents,
  leaveGroup
} = require('../controllers/groupController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
router
  .route('/')
  .get(protect, getGroups)
  .post(protect, authorize('student'), createGroup);
router.post('/join', protect, authorize('student'), joinGroup);
router.post(
  '/auto-allot/:driveId',
  protect,
  authorize('admin'),
  autoAllotMentors
);
router.post(
  '/auto-group/:driveId',
  protect,
  authorize('admin'),
  autoGroupRemainingStudents
);
router.get(
  '/remaining/:driveId',
  protect,
  authorize('admin', 'mentor'),
  getRemainingStudents
);
router
  .route('/:id')
  .get(protect, getGroup)
  .put(protect, authorize('student'), updateGroupInfo)
  .delete(protect, deleteGroup);
router.post('/:id/leave', protect, authorize('student'), leaveGroup);
router
  .route('/:id/members/:memberId')
  .put(protect, authorize('student'), manageMemberRequest)
  .delete(protect, authorize('student'), removeMember);
router
  .route('/:id/mentor')
  .put(protect, authorize('admin'), allotMentor)
  .delete(protect, authorize('admin'), unassignMentor);
module.exports = router;
