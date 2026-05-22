import mongoose from 'mongoose';

const pullRequestSchema = new mongoose.Schema(
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
      index: true // e.g. "open", "closed" (mapped logic includes merged boolean)
    },
    author: {
      login: { type: String, default: '' },
      avatarUrl: { type: String, default: '' },
      htmlUrl: { type: String, default: '' }
    },
    reviewers: {
      type: [mongoose.Schema.Types.Mixed], // array of reviewer objects or strings
      default: []
    },
    labels: {
      type: [String],
      default: []
    },
    additions: {
      type: Number,
      default: 0
    },
    deletions: {
      type: Number,
      default: 0
    },
    changedFiles: {
      type: Number,
      default: 0
    },
    merged: {
      type: Boolean,
      default: false
    },
    mergedAt: {
      type: Date,
      default: null,
      index: true
    },
    closedAt: {
      type: Date,
      default: null
    },
    githubCreatedAt: {
      type: Date,
      required: true
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

// Compound index to guarantee uniqueness of pull requests per repository
pullRequestSchema.index({ repoId: 1, number: 1 }, { unique: true });

const PullRequest = mongoose.model('PullRequest', pullRequestSchema);

export default PullRequest;
