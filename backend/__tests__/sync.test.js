import { jest } from '@jest/globals';

// 1. Establish ESM Mock of @octokit/rest BEFORE other imports
const mockGet = jest.fn();
const mockListCommits = jest.fn();
const mockGetCommit = jest.fn();
const mockListPulls = jest.fn();
const mockListIssues = jest.fn();

jest.unstable_mockModule('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => ({
      rest: {
        repos: {
          get: mockGet,
          listCommits: mockListCommits,
          getCommit: mockGetCommit
        },
        pulls: {
          list: mockListPulls
        },
        issues: {
          listForRepo: mockListIssues
        }
      }
    }))
  };
});

// 2. Import standard modules
import request from 'supertest';
import { connectTestDb, disconnectTestDb, clearTestDb } from './helpers/testDb.js';
import User from '../src/models/User.model.js';
import Repository from '../src/models/Repository.model.js';
import Commit from '../src/models/Commit.model.js';
import PullRequest from '../src/models/PullRequest.model.js';
import Issue from '../src/models/Issue.model.js';
import { mockUser } from './helpers/mockData.js';
import * as encryptionHelper from '../src/utils/encryptionHelper.js';

let app;

// Base Mock Data
const dummyRepo = {
  id: 11111,
  name: 'test-sync-repo',
  full_name: 'test-owner/test-sync-repo',
  description: 'Sync repository description',
  private: false,
  default_branch: 'main',
  language: 'JavaScript',
  stargazers_count: 10,
  forks_count: 3,
  open_issues_count: 5,
  html_url: 'https://github.com/test-owner/test-sync-repo'
};

const dummyCommits = [
  {
    sha: 'sha1234567890abcdef',
    commit: {
      message: 'Initial commit',
      author: {
        name: 'Author Name',
        email: 'author@test.com',
        date: '2026-05-22T08:00:00Z'
      }
    },
    author: {
      login: 'author-github',
      avatar_url: 'https://avatars.com/author'
    },
    html_url: 'https://github.com/test-owner/test-sync-repo/commit/sha1234567890abcdef'
  }
];

const dummyCommitDetails = {
  sha: 'sha1234567890abcdef',
  stats: {
    additions: 50,
    deletions: 10
  },
  files: [
    { filename: 'app.js' },
    { filename: 'package.json' }
  ]
};

const dummyPullRequests = [
  {
    number: 42,
    title: 'Feature implementation',
    body: 'Implements feature X',
    state: 'open',
    user: {
      login: 'pr-author',
      avatar_url: 'https://avatars.com/pr-author',
      html_url: 'https://github.com/pr-author'
    },
    requested_reviewers: [
      { login: 'reviewer-1', avatar_url: 'https://avatars.com/rev1' }
    ],
    labels: [{ name: 'enhancement' }],
    additions: 120,
    deletions: 30,
    changed_files: 4,
    merged: false,
    merged_at: null,
    closed_at: null,
    created_at: '2026-05-22T08:10:00Z',
    updated_at: '2026-05-22T08:12:00Z',
    html_url: 'https://github.com/test-owner/test-sync-repo/pull/42'
  }
];

const dummyIssues = [
  {
    number: 12,
    title: 'Bug report X',
    body: 'Something is broken',
    state: 'open',
    user: {
      login: 'issue-author',
      avatar_url: 'https://avatars.com/issue-author',
      html_url: 'https://github.com/issue-author'
    },
    assignees: [
      { login: 'assignee-1', avatar_url: 'https://avatars.com/ass1' }
    ],
    labels: [{ name: 'bug' }],
    closed_at: null,
    created_at: '2026-05-22T08:05:00Z',
    updated_at: '2026-05-22T08:06:00Z',
    html_url: 'https://github.com/test-owner/test-sync-repo/issues/12',
    pull_request: null
  },
  {
    number: 42,
    title: 'Feature implementation',
    body: 'Implements feature X',
    state: 'open',
    user: {
      login: 'pr-author',
      avatar_url: 'https://avatars.com/pr-author',
      html_url: 'https://github.com/pr-author'
    },
    pull_request: {} // Represents a Pull Request returned by the Issues API
  }
];

beforeAll(async () => {
  await connectTestDb();
  const appModule = await import('../src/app.js');
  app = appModule.default;
});

afterEach(async () => {
  await clearTestDb();
  jest.clearAllMocks();
});

afterAll(async () => {
  await disconnectTestDb();
});

describe('GitHub Data Sync Engine Routes', () => {
  let token;
  let user;

  beforeEach(async () => {
    // 1. Register and login the mock user
    const regRes = await request(app).post('/api/auth/register').send(mockUser);
    token = regRes.body.data.accessToken;

    user = await User.findOne({ email: mockUser.email });
  });

  describe('Authentication and Pre-requisite Checks', () => {
    test('1. POST /api/github/repos/:repoFullName/sync requires auth', async () => {
      const res = await request(app).post('/api/github/repos/test-owner%2Ftest-sync-repo/sync');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('2. POST /api/github/repos/:repoFullName/sync requires GitHub connected', async () => {
      const res = await request(app)
        .post('/api/github/repos/test-owner%2Ftest-sync-repo/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please connect GitHub first');
    });

    test('3. POST /api/github/repos/:repoFullName/sync rejects invalid repoFullName formats', async () => {
      // Connect GitHub manually
      user.githubConnected = true;
      user.githubUsername = 'test-owner';
      user.githubId = '112233';
      user.githubAccessToken = encryptionHelper.encrypt('mock-token');
      await user.save();

      const invalidRepos = ['single-part', 'three/parts/invalid', '   ', 'owner/'];
      for (const repo of invalidRepos) {
        const encoded = encodeURIComponent(repo);
        const res = await request(app)
          .post(`/api/github/repos/${encoded}/sync`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Invalid repository full name');
      }
    });
  });

  describe('Successful Data Sync Flow', () => {
    beforeEach(async () => {
      // Setup connected user
      user.githubConnected = true;
      user.githubUsername = 'test-owner';
      user.githubId = '112233';
      user.githubAccessToken = encryptionHelper.encrypt('mock-token');
      await user.save();

      // Mock default successful API responses
      mockGet.mockResolvedValue({
        data: dummyRepo,
        headers: { 'x-ratelimit-remaining': '5000' }
      });
      mockListCommits.mockResolvedValue({
        data: dummyCommits,
        headers: { 'x-ratelimit-remaining': '4999' }
      });
      mockGetCommit.mockResolvedValue({
        data: dummyCommitDetails,
        headers: { 'x-ratelimit-remaining': '4998' }
      });
      mockListPulls.mockResolvedValue({
        data: dummyPullRequests,
        headers: { 'x-ratelimit-remaining': '4997' }
      });
      mockListIssues.mockResolvedValue({
        data: dummyIssues,
        headers: { 'x-ratelimit-remaining': '4996' }
      });
    });

    test('4. Full sync saves repo metadata, commits, PRs, and filtered issues', async () => {
      const res = await request(app)
        .post('/api/github/repos/test-owner%2Ftest-sync-repo/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.repository.name).toBe('test-sync-repo');
      expect(res.body.data.summary.commitsSynced).toBe(1);
      expect(res.body.data.summary.pullRequestsSynced).toBe(1);
      expect(res.body.data.summary.issuesSynced).toBe(1); // One real issue, one PR filtered out

      // Verify DB Persistence
      const dbRepo = await Repository.findOne({ githubRepoId: 11111 });
      expect(dbRepo).toBeTruthy();
      expect(dbRepo.fullName).toBe('test-owner/test-sync-repo');
      expect(dbRepo.lastSyncedAt).toBeTruthy();

      const dbCommit = await Commit.findOne({ repoId: dbRepo._id });
      expect(dbCommit).toBeTruthy();
      expect(dbCommit.sha).toBe('sha1234567890abcdef');
      expect(dbCommit.additions).toBe(50);
      expect(dbCommit.deletions).toBe(10);
      expect(dbCommit.filesChanged).toBe(2);

      const dbPR = await PullRequest.findOne({ repoId: dbRepo._id });
      expect(dbPR).toBeTruthy();
      expect(dbPR.number).toBe(42);
      expect(dbPR.state).toBe('open');

      const dbIssue = await Issue.findOne({ repoId: dbRepo._id });
      expect(dbIssue).toBeTruthy();
      expect(dbIssue.number).toBe(12); // Number 12 is the real issue
      
      // Verify PR was filtered out of Issue collection
      const prIssue = await Issue.findOne({ repoId: dbRepo._id, number: 42 });
      expect(prIssue).toBeNull();
    });

    test('5. Repeated sync uses upsert and avoids duplicating records', async () => {
      // Sync once
      await request(app)
        .post('/api/github/repos/test-owner%2Ftest-sync-repo/sync')
        .set('Authorization', `Bearer ${token}`);

      // Sync again
      const res = await request(app)
        .post('/api/github/repos/test-owner%2Ftest-sync-repo/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Verify only single records exist in DB
      const repoCount = await Repository.countDocuments({ githubRepoId: 11111 });
      expect(repoCount).toBe(1);

      const dbRepo = await Repository.findOne({ githubRepoId: 11111 });
      const commitCount = await Commit.countDocuments({ repoId: dbRepo._id });
      expect(commitCount).toBe(1);

      const prCount = await PullRequest.countDocuments({ repoId: dbRepo._id });
      expect(prCount).toBe(1);

      const issueCount = await Issue.countDocuments({ repoId: dbRepo._id });
      expect(issueCount).toBe(1);
    });

    test('6. Graceful failure on individual commit details call continues sync', async () => {
      // Mock getCommit rejection (e.g. rate limit, api error for one commit)
      mockGetCommit.mockRejectedValue(new Error('Rate limit or not found for commit stats'));

      const res = await request(app)
        .post('/api/github/repos/test-owner%2Ftest-sync-repo/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.commitsSynced).toBe(1);

      // Verify the commit was still saved with fallback statistics
      const dbRepo = await Repository.findOne({ githubRepoId: 11111 });
      const dbCommit = await Commit.findOne({ repoId: dbRepo._id });
      expect(dbCommit).toBeTruthy();
      expect(dbCommit.sha).toBe('sha1234567890abcdef');
      expect(dbCommit.additions).toBe(0); // Fallback defaults
      expect(dbCommit.deletions).toBe(0);
      expect(dbCommit.filesChanged).toBe(0);
    });

    test('7. Incremental sync sends "since" parameter based on lastSyncedAt', async () => {
      // Mock an existing synced repository in database with a past sync date
      const pastSyncDate = new Date('2026-05-21T12:00:00Z');
      const dbRepo = await Repository.create({
        userId: user._id,
        githubRepoId: 11111,
        name: 'test-sync-repo',
        fullName: 'test-owner/test-sync-repo',
        lastSyncedAt: pastSyncDate
      });

      const res = await request(app)
        .post('/api/github/repos/test-owner%2Ftest-sync-repo/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Verify listCommits was called with since parameter
      expect(mockListCommits).toHaveBeenCalledWith(
        expect.objectContaining({
          since: pastSyncDate.toISOString()
        })
      );
    });

    test('8. Rate limit warning is returned if remaining rate limit is low', async () => {
      // Set rate limit to 50 (< 100)
      mockGet.mockResolvedValue({
        data: dummyRepo,
        headers: { 'x-ratelimit-remaining': '50' }
      });

      const res = await request(app)
        .post('/api/github/repos/test-owner%2Ftest-sync-repo/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.warning).toContain('GitHub API rate limit is low. Remaining requests: 50');
    });

    test('9. Sync returns 404 error if repository is not found on GitHub', async () => {
      const apiError = new Error('Not Found');
      apiError.status = 404;
      mockGet.mockRejectedValue(apiError);

      const res = await request(app)
        .post('/api/github/repos/test-owner%2Ftest-sync-repo/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('GitHub repository not found');
    });
  });
});
