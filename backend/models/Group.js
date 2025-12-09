const mongoose = require('mongoose');
const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a group name'],
    trim: true
  },
  drive: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Drive',
    required: true
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  invitationCode: {
    type: String,
    unique: true,
    required: true
  },
  maxMembers: {
    type: Number,
    required: true
  },
  mentorPreferences: [{
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rank: {
      type: Number,
      required: true
    }
  }],
  assignedMentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mentorAllottedAt: Date,
  mentorAllottedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['forming', 'formed', 'mentor-assigned', 'active', 'completed', 'disbanded'],
    default: 'forming'
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  projectTitle: {
    type: String,
    trim: true
  },
  projectDescription: {
    type: String,
    trim: true
  },
  preferenceUpdatedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});
groupSchema.index({ drive: 1, status: 1 });
groupSchema.index({ leader: 1 });
groupSchema.index({ 'members.student': 1 });
groupSchema.index({ assignedMentor: 1 });
groupSchema.index({ invitationCode: 1 });
groupSchema.virtual('acceptedMembersCount').get(function() {
  return this.members.filter(m => m.status === 'accepted').length + 1;
});
module.exports = mongoose.model('Group', groupSchema);
