import mongoose from 'mongoose';

const commitSchema = new mongoose.Schema(
  {
    repoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
      index: true
    },
    sha: {
      type: String,
      required: true
    },
    message: {
      type: String,
      default: ''
    },
    author: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      login: { type: String, default: '' }, // GitHub username
      avatarUrl: { type: String, default: '' }
    },
    additions: {
      type: Number,
      default: 0
    },
    deletions: {
      type: Number,
      default: 0
    },
    filesChanged: {
      type: Number,
      default: 0
    },
    committedAt: {
      type: Date,
      required: true,
      index: true
    },
    url: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index to guarantee uniqueness of commits per repository
commitSchema.index({ repoId: 1, sha: 1 }, { unique: true });

const Commit = mongoose.model('Commit', commitSchema);

export default Commit;
