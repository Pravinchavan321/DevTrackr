import crypto from 'node:crypto';
import request from 'supertest';
import { connectTestDb, disconnectTestDb, clearTestDb } from './helpers/testDb.js';
import User from '../src/models/User.model.js';
import Repository from '../src/models/Repository.model.js';
import Commit from '../src/models/Commit.model.js';
import PullRequest from '../src/models/PullRequest.model.js';
import WebhookEvent from '../src/models/WebhookEvent.model.js';
import { mockUser } from './helpers/mockData.js';

let app;

const WEBHOOK_SECRET = 'test_webhook_secret_123';

const signPayload = (payloadText) => `sha256=${crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payloadText)
  .digest('hex')}`;

const sendWebhook = ({ event, deliveryId, payload, signature }) => {
  const payloadText = JSON.stringify(payload);

  return request(app)
    .post('/api/github/webhook')
    .set('Content-Type', 'application/json')
    .set('x-github-event', event)
    .set('x-github-delivery', deliveryId)
    .set('x-hub-signature-256', signature || signPayload(payloadText))
    .send(payloadText);
};

const createUserAndRepo = async () => {
  const regRes = await request(app).post('/api/auth/register').send(mockUser);
  const token = regRes.body.data.accessToken;
  const user = await User.findOne({ email: mockUser.email });

  const repo = await Repository.create({
    userId: user._id,
    githubRepoId: 4444,
    name: 'webhook-repo',
    fullName: 'pravin/webhook-repo',
    description: 'Webhook test repo',
    isPrivate: false,
    defaultBranch: 'main',
    language: 'JavaScript',
    stars: 1,
    forks: 0,
    openIssuesCount: 0,
    htmlUrl: 'https://github.com/pravin/webhook-repo'
  });

  return { token, user, repo };
};

const repositoryPayload = {
  id: 4444,
  name: 'webhook-repo',
  full_name: 'pravin/webhook-repo',
  description: 'Webhook test repo',
  private: false,
  default_branch: 'main',
  language: 'JavaScript',
  stargazers_count: 1,
  forks_count: 0,
  open_issues_count: 0,
  html_url: 'https://github.com/pravin/webhook-repo'
};

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.ENCRYPTION_SECRET = '12345678901234567890123456789012';
  process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.FRONTEND_URL = 'http://localhost:5173';

  await connectTestDb();
  const appModule = await import('../src/app.js');
  app = appModule.default;
});

afterEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

describe('GitHub Webhook Route', () => {
  test('rejects webhook requests with an invalid signature', async () => {
    await createUserAndRepo();

    const res = await sendWebhook({
      event: 'push',
      deliveryId: 'invalid-signature-delivery',
      payload: { repository: repositoryPayload, commits: [] },
      signature: 'sha256=invalid'
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(await WebhookEvent.countDocuments()).toBe(0);
  });

  test('processes push events idempotently and updates repository activity status', async () => {
    const { token, repo } = await createUserAndRepo();

    const payload = {
      repository: repositoryPayload,
      pusher: {
        name: 'Pravin',
        email: 'pravin@test.com'
      },
      sender: {
        login: 'pravinchavan321',
        avatar_url: 'https://github.com/avatar.png'
      },
      commits: [
        {
          id: 'sha_webhook_123',
          message: 'feat: add webhook support',
          timestamp: '2026-05-25T09:00:00Z',
          url: 'https://github.com/pravin/webhook-repo/commit/sha_webhook_123',
          added: ['backend/src/services/webhook.service.js'],
          removed: [],
          modified: ['backend/src/routes/github.routes.js'],
          author: {
            name: 'Pravin',
            email: 'pravin@test.com',
            username: 'pravinchavan321'
          }
        }
      ]
    };

    const firstRes = await sendWebhook({
      event: 'push',
      deliveryId: 'push-delivery-1',
      payload
    });

    expect(firstRes.status).toBe(202);
    expect(firstRes.body.success).toBe(true);
    expect(firstRes.body.data.status).toBe('processed');

    const commit = await Commit.findOne({ repoId: repo._id, sha: 'sha_webhook_123' }).lean();
    expect(commit).toBeTruthy();
    expect(commit.message).toBe('feat: add webhook support');
    expect(commit.filesChanged).toBe(2);

    const repoAfterPush = await Repository.findById(repo._id).lean();
    expect(repoAfterPush.lastWebhookEventAt).toBeTruthy();
    expect(repoAfterPush.webhookEventCount).toBe(1);

    const duplicateRes = await sendWebhook({
      event: 'push',
      deliveryId: 'push-delivery-1',
      payload
    });

    expect(duplicateRes.status).toBe(202);
    expect(duplicateRes.body.data.duplicate).toBe(true);
    expect(await Commit.countDocuments({ repoId: repo._id })).toBe(1);
    expect(await WebhookEvent.countDocuments({ deliveryId: 'push-delivery-1' })).toBe(1);

    const statusRes = await request(app)
      .get(`/api/github/repos/${repo._id}/activity-status`)
      .set('Authorization', `Bearer ${token}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.webhookEventCount).toBe(1);
    expect(statusRes.body.data.lastWebhookEventAt).toBeTruthy();
  });

  test('updates pull request state from pull_request webhook events', async () => {
    const { repo } = await createUserAndRepo();

    const payload = {
      action: 'closed',
      repository: repositoryPayload,
      pull_request: {
        number: 7,
        title: 'Add production webhook flow',
        body: 'Webhook feature PR',
        state: 'closed',
        user: {
          login: 'pravinchavan321',
          avatar_url: 'https://github.com/avatar.png',
          html_url: 'https://github.com/pravinchavan321'
        },
        requested_reviewers: [],
        labels: [{ name: 'enhancement' }],
        additions: 120,
        deletions: 10,
        changed_files: 4,
        merged: true,
        merged_at: '2026-05-25T10:00:00Z',
        closed_at: '2026-05-25T10:00:00Z',
        created_at: '2026-05-24T10:00:00Z',
        updated_at: '2026-05-25T10:00:00Z',
        html_url: 'https://github.com/pravin/webhook-repo/pull/7'
      }
    };

    const res = await sendWebhook({
      event: 'pull_request',
      deliveryId: 'pr-delivery-1',
      payload
    });

    expect(res.status).toBe(202);
    expect(res.body.data.status).toBe('processed');

    const pr = await PullRequest.findOne({ repoId: repo._id, number: 7 }).lean();
    expect(pr).toBeTruthy();
    expect(pr.state).toBe('closed');
    expect(pr.merged).toBe(true);
    expect(pr.mergedAt.toISOString()).toBe('2026-05-25T10:00:00.000Z');
  });
});
