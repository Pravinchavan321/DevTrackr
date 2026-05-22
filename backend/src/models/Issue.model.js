import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema(
  {
    repoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
      index: true
    },
    number: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      default: ''
    },
    body: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      required: true,
      index: true // e.g. "open", "closed"
    },
    author: {
      login: { type: String, default: '' },
      avatarUrl: { type: String, default: '' },
      htmlUrl: { type: String, default: '' }
    },
    assignees: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    labels: {
      type: [String],
      default: []
    },
    closedAt: {
      type: Date,
      default: null
    },
    githubCreatedAt: {
      type: Date,
      required: true,
      index: true
    },
    githubUpdatedAt: {
      type: Date,
      required: true
    },
    htmlUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index to guarantee uniqueness of issues per repository
issueSchema.index({ repoId: 1, number: 1 }, { unique: true });

const Issue = mongoose.model('Issue', issueSchema);

export default Issue;
