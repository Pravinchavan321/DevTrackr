import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDb, disconnectTestDb, clearTestDb } from './helpers/testDb.js';
import User from '../src/models/User.model.js';
import Repository from '../src/models/Repository.model.js';
import Commit from '../src/models/Commit.model.js';
import PullRequest from '../src/models/PullRequest.model.js';
import Issue from '../src/models/Issue.model.js';
import AIInsight from '../src/models/AIInsight.model.js';
import { mockUser, mockUserTwo } from './helpers/mockData.js';

let app;

beforeAll(async () => {
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

/**
 * Supertest binary PDF response parser.
 * Collects response body as a Buffer so we can inspect PDF magic bytes.
 */
const binaryParser = (res, callback) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

describe('PDF Export API', () => {
  let tokenA;
  let tokenB;
  let userA;
  let userB;
  let repoA;

  beforeEach(async () => {
    // Register User A
    const regResA = await request(app).post('/api/auth/register').send(mockUser);
    tokenA = regResA.body.data.accessToken;
    userA = await User.findOne({ email: mockUser.email });

    // Register User B
    const regResB = await request(app).post('/api/auth/register').send(mockUserTwo);
    tokenB = regResB.body.data.accessToken;
    userB = await User.findOne({ email: mockUserTwo.email });

    // Create a repository owned by User A
    repoA = await Repository.create({
      userId: userA._id,
      githubRepoId: 200001,
      name: 'export-test-repo',
      fullName: 'user-a/export-test-repo',
      description: 'Repository for PDF export testing',
      isPrivate: false,
      defaultBranch: 'main',
      language: 'JavaScript',
      stars: 42,
      forks: 7,
      openIssuesCount: 3
    });
  });

  /**
   * Populates repoA with commits, PRs, issues, and AI insights for full PDF testing.
   */
  const populateFullData = async () => {
    // Insert 5 commits
    const commits = [];
    for (let i = 1; i <= 5; i++) {
      commits.push({
        repoId: repoA._id,
        sha: `export_sha_${i}_abcdef1234567890`,
        message: `feat: implement feature ${i} for export test`,
        author: {
          login: i <= 3 ? 'pravin' : 'jane',
          name: i <= 3 ? 'Pravin' : 'Jane',
          email: i <= 3 ? 'pravin@test.com' : 'jane@test.com',
          avatarUrl: `https://avatars.com/u-${i}`
        },
        additions: 30 + i * 5,
        deletions: 5 + i,
        filesChanged: 2 + i,
        committedAt: new Date(`2026-05-${String(15 + i).padStart(2, '0')}T10:00:00Z`),
        url: `https://github.com/user-a/export-test-repo/commit/export_sha_${i}`
      });
    }
    await Commit.insertMany(commits);

    // Insert 3 pull requests
    const pullRequests = [
      {
        repoId: repoA._id,
        number: 1,
        title: 'Add authentication module',
        body: 'PR body 1',
        state: 'closed',
        author: { login: 'pravin', avatarUrl: 'https://avatar/pravin' },
        reviewers: [],
        labels: ['feature'],
        additions: 100,
        deletions: 20,
        changedFiles: 5,
        merged: true,
        mergedAt: new Date('2026-05-17T22:00:00Z'),
        closedAt: new Date('2026-05-17T22:00:00Z'),
        githubCreatedAt: new Date('2026-05-16T10:00:00Z'),
        githubUpdatedAt: new Date('2026-05-17T22:00:00Z'),
        htmlUrl: 'https://github.com/pr/1'
      },
      {
        repoId: repoA._id,
        number: 2,
        title: 'Fix database connection issue',
        body: 'PR body 2',
        state: 'open',
        author: { login: 'jane', avatarUrl: 'https://avatar/jane' },
        reviewers: [],
        labels: ['bugfix'],
        additions: 30,
        deletions: 5,
        changedFiles: 2,
        merged: false,
        mergedAt: null,
        closedAt: null,
        githubCreatedAt: new Date('2026-05-18T09:00:00Z'),
        githubUpdatedAt: new Date('2026-05-18T09:00:00Z'),
        htmlUrl: 'https://github.com/pr/2'
      },
      {
        repoId: repoA._id,
        number: 3,
        title: 'Refactor API routes',
        body: 'PR body 3',
        state: 'closed',
        author: { login: 'pravin', avatarUrl: 'https://avatar/pravin' },
        reviewers: [],
        labels: [],
        additions: 50,
        deletions: 10,
        changedFiles: 3,
        merged: false,
        mergedAt: null,
        closedAt: new Date('2026-05-19T18:00:00Z'),
        githubCreatedAt: new Date('2026-05-19T08:00:00Z'),
        githubUpdatedAt: new Date('2026-05-19T18:00:00Z'),
        htmlUrl: 'https://github.com/pr/3'
      }
    ];
    await PullRequest.insertMany(pullRequests);

    // Insert 3 issues
    const issues = [
      {
        repoId: repoA._id,
        number: 101,
        title: 'Login page crashes on mobile',
        body: 'Issue 101 body',
        state: 'open',
        author: { login: 'pravin' },
        githubCreatedAt: new Date('2026-05-16T11:00:00Z'),
        githubUpdatedAt: new Date('2026-05-16T11:00:00Z')
      },
      {
        repoId: repoA._id,
        number: 102,
        title: 'Add dark mode support',
        body: 'Issue 102 body',
        state: 'closed',
        author: { login: 'jane' },
        closedAt: new Date('2026-05-18T18:00:00Z'),
        githubCreatedAt: new Date('2026-05-17T09:00:00Z'),
        githubUpdatedAt: new Date('2026-05-18T18:00:00Z')
      },
      {
        repoId: repoA._id,
        number: 103,
        title: 'Improve error handling',
        body: 'Issue 103 body',
        state: 'open',
        author: { login: 'pravin' },
        githubCreatedAt: new Date('2026-05-19T10:00:00Z'),
        githubUpdatedAt: new Date('2026-05-19T10:00:00Z')
      }
    ];
    await Issue.insertMany(issues);

    // Insert cached AI insights
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const aiInsights = [
      {
        repoId: repoA._id,
        userId: userA._id,
        type: 'sprint_summary',
        period: { from: new Date('2026-05-01'), to: new Date('2026-05-20') },
        content: 'Good sprint progress with strong velocity.',
        parsedData: {
          summary: 'Strong sprint with multiple features delivered.',
          velocity: 'high',
          highlights: ['Authentication module shipped', 'Bug fixes completed'],
          concerns: ['Test coverage needs improvement'],
          sprintScore: 8
        },
        model: 'gemini-1.5-flash',
        tokensUsed: 500,
        generatedAt: now,
        expiresAt
      },
      {
        repoId: repoA._id,
        userId: userA._id,
        type: 'bottleneck',
        period: { from: new Date('2026-05-01'), to: new Date('2026-05-20') },
        content: 'Minor bottlenecks detected.',
        parsedData: {
          bottlenecks: [
            {
              type: 'code_review',
              severity: 'medium',
              description: 'PRs waiting for review longer than average',
              suggestion: 'Add more reviewers to the rotation'
            }
          ],
          riskLevel: 'medium',
          topRecommendation: 'Implement automatic PR assignment'
        },
        model: 'gemini-1.5-flash',
        tokensUsed: 400,
        generatedAt: now,
        expiresAt
      },
      {
        repoId: repoA._id,
        userId: userA._id,
        type: 'recommendations',
        period: { from: new Date('2026-05-01'), to: new Date('2026-05-20') },
        content: 'Prioritize test coverage.',
        parsedData: {
          recommendations: [
            {
              title: 'Increase test coverage',
              priority: 'high',
              reason: 'Current coverage is below 60%',
              action: 'Write unit tests for critical paths'
            },
            {
              title: 'Refactor auth module',
              priority: 'medium',
              reason: 'Growing complexity',
              action: 'Extract helper functions'
            }
          ],
          nextBestAction: 'Write unit tests for auth service'
        },
        model: 'gemini-1.5-flash',
        tokensUsed: 350,
        generatedAt: now,
        expiresAt
      }
    ];
    await AIInsight.insertMany(aiInsights);
  };

  // ─── Test 1: Authentication required ───
  describe('Authentication and Authorization', () => {
    test('1. PDF export requires authentication and returns 401', async () => {
      const res = await request(app).get(`/api/export/repos/${repoA._id}/pdf`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('2. Invalid repoId format returns 400', async () => {
      const res = await request(app)
        .get('/api/export/repos/not-a-valid-id/pdf')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid repository ID format');
    });

    test('3. Non-existing repo returns 404', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/export/repos/${fakeId}/pdf`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Repository not found');
    });

    test("4. Another user's repo returns 403", async () => {
      const res = await request(app)
        .get(`/api/export/repos/${repoA._id}/pdf`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You are not authorized to access this repository');
    });
  });

  // ─── Test 5-8: PDF response validation ───
  describe('PDF Generation', () => {
    test('5. PDF export returns 200 with Content-Type application/pdf', async () => {
      const res = await request(app)
        .get(`/api/export/repos/${repoA._id}/pdf`)
        .set('Authorization', `Bearer ${tokenA}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    test('6. PDF export returns Content-Disposition attachment header', async () => {
      const res = await request(app)
        .get(`/api/export/repos/${repoA._id}/pdf`)
        .set('Authorization', `Bearer ${tokenA}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('devtrackr-report-export-test-repo.pdf');
    });

    test('7. PDF export works with full data (commits, PRs, issues, AI insights)', async () => {
      await populateFullData();

      const res = await request(app)
        .get(`/api/export/repos/${repoA._id}/pdf`)
        .set('Authorization', `Bearer ${tokenA}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');

      // Verify PDF magic bytes (%PDF)
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.slice(0, 4).toString()).toBe('%PDF');
    });

    test('8. PDF export works when repository has no commits/PRs/issues/AI insights (empty repo)', async () => {
      const res = await request(app)
        .get(`/api/export/repos/${repoA._id}/pdf`)
        .set('Authorization', `Bearer ${tokenA}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');

      // Verify PDF magic bytes even with empty data
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.slice(0, 4).toString()).toBe('%PDF');
    });
  });

  // ─── Test 9-10: No external API calls ───
  describe('No External API Calls', () => {
    test('9. PDF export does not call Gemini API', async () => {
      await populateFullData();

      // If Gemini were called, it would fail because there is no GEMINI_API_KEY in test env.
      // A successful 200 response proves no Gemini call was made.
      const res = await request(app)
        .get(`/api/export/repos/${repoA._id}/pdf`)
        .set('Authorization', `Bearer ${tokenA}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    test('10. PDF export does not call GitHub API', async () => {
      await populateFullData();

      // If GitHub API were called, it would fail because there is no valid GitHub token in test env.
      // A successful 200 response proves no GitHub API call was made.
      const res = await request(app)
        .get(`/api/export/repos/${repoA._id}/pdf`)
        .set('Authorization', `Bearer ${tokenA}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });
});
