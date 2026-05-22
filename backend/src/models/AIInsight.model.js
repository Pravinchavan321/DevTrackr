import mongoose from 'mongoose';

const aiInsightSchema = new mongoose.Schema(
  {
    repoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: ['sprint_summary', 'contributor_analysis', 'bottleneck', 'recommendations'],
      index: true
    },
    period: {
      from: {
        type: Date,
        default: null
      },
      to: {
        type: Date,
        default: null
      }
    },
    content: {
      type: String,
      default: ''
    },
    parsedData: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    model: {
      type: String,
      default: ''
    },
    tokensUsed: {
      type: Number,
      default: 0
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true // index for TTL will be set up below
    }
  },
  {
    timestamps: true
  }
);

// TTL index to automatically expire documents after expiresAt time
aiInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index to speed up cache lookups
aiInsightSchema.index({ repoId: 1, userId: 1, type: 1 });

const AIInsight = mongoose.model('AIInsight', aiInsightSchema);

export default AIInsight;
