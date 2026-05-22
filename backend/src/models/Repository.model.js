import mongoose from 'mongoose';

const repositorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    githubRepoId: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      required: true,
      index: true
    },
    description: {
      type: String,
      default: ''
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    defaultBranch: {
      type: String,
      default: 'main'
    },
    language: {
      type: String,
      default: null
    },
    stars: {
      type: Number,
      default: 0
    },
    forks: {
      type: Number,
      default: 0
    },
    openIssuesCount: {
      type: Number,
      default: 0
    },
    htmlUrl: {
      type: String,
      default: ''
    },
    lastSyncedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index to guarantee uniqueness of repositories per user
repositorySchema.index({ userId: 1, githubRepoId: 1 }, { unique: true });

const Repository = mongoose.model('Repository', repositorySchema);

export default Repository;
