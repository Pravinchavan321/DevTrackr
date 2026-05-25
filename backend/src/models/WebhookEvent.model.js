import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    deliveryId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    event: {
      type: String,
      required: true,
      index: true
    },
    action: {
      type: String,
      default: ''
    },
    repoFullName: {
      type: String,
      default: '',
      index: true
    },
    repoGithubId: {
      type: Number,
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ['processing', 'processed', 'ignored', 'failed'],
      default: 'processing',
      index: true
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    error: {
      type: String,
      default: ''
    },
    receivedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);

export default WebhookEvent;
