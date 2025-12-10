const mongoose = require('mongoose');
const evaluationSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  drive: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Drive',
    required: true
  },
  // Either checkpointSubmission or submission should be present
  checkpointSubmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CheckpointSubmission'
  },
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  },
  checkpointIndex: Number,
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  evaluatedAt: {
    type: Date,
    default: Date.now
  },
  criteriaScores: [{
    criteriaName: {
      type: String,
      required: true
    },
    maxScore: {
      type: Number,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    remarks: String
  }],
  totalMarks: {
    type: Number,
    required: true
  },
  maxMarks: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
  },
  feedback: {
    type: String,
    trim: true
  },
  strengths: {
    type: String,
    trim: true
  },
  improvements: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'finalized'],
    default: 'draft'
  },
  isVisible: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});
evaluationSchema.pre('save', function(next) {
  if (this.totalMarks && this.maxMarks) {
    this.percentage = (this.totalMarks / this.maxMarks) * 100;
  }
  next();
});
evaluationSchema.index({ group: 1, checkpointIndex: 1 });
evaluationSchema.index({ drive: 1 });
evaluationSchema.index({ evaluatedBy: 1 });
evaluationSchema.index({ submission: 1 });
module.exports = mongoose.model('Evaluation', evaluationSchema);
