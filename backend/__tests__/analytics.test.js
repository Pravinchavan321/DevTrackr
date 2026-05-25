import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDb, disconnectTestDb, clearTestDb } from './helpers/testDb.js';
import User from '../src/models/User.model.js';
import Repository from '../src/models/Repository.model.js';
import Commit from '../src/models/Commit.model.js';
import PullRequest from '../src/models/PullRequest.model.js';
import Issue from '../src/models/Issue.model.js';
import { mockUser, mockUserTwo } from './helpers/mockData.js';

let app;

beforeAll(async () => {
  await connectTestDb();
  // Dynamic ESM import of the app after database connection setup
  const appModule = await import('../src/app.js');
  app = appModule.default;
});

afterEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

describe('Analytics API Engine', () => {
  let tokenA;
  let tokenB;
  let userA;
  let userB;
  let repoA;
  let repoB;

  beforeEach(async () => {
    // 1. Register and login User A
    const regResA = await request(app).post('/api/auth/register').send(mockUser);
    tokenA = regResA.body.data.accessToken;
    userA = await User.findOne({ email: mockUser.email });

    // 2. Register and login User B
    const regResB = await request(app).post('/api/auth/register').send(mockUserTwo);
    tokenB = regResB.body.data.accessToken;
    userB = await User.findOne({ email: mockUserTwo.email });

    // 3. Create a repository owned by User A
    repoA = await Repository.create({
      userId: userA._id,
      githubRepoId: 100001,
      name: 'repo-a',
      fullName: 'user-a/repo-a',
      description: 'Repository A description',
      isPrivate: false,
      defaultBranch: 'main',
      language: 'JavaScript',
      stars: 10,
      forks: 2,
      openIssuesCount: 3
    });

    // 4. Create a repository owned by User B
    repoB = await Repository.create({
      userId: userB._id,
      githubRepoId: 100002,
      name: 'repo-b',
      fullName: 'user-b/repo-b',
      description: 'Repository B description',
      isPrivate: true,
      defaultBranch: 'development',
      language: 'Python',
      stars: 5,
      forks: 1,
      openIssuesCount: 1
    });
  });

  const setupMockDataForRepoA = async () => {
    // Populate repoA with 15 commits
    // Earliest: 2026-05-20T10:00:00Z, Latest: 2026-05-22T08:00:00Z
    const commits = [];
    for (let i = 1; i <= 15; i++) {
      let committedAt;
      let login = '';
      let email = '';
      let name = '';
      let additions = 10;
      let deletions = 2;

      // Group commits by days to verify date aggregations (5 commits per day)
      if (i <= 5) {
        committedAt = new Date('2026-05-20T10:00:00Z');
      } else if (i <= 10) {
        committedAt = new Date('2026-05-21T12:00:00Z');
      } else {
        committedAt = new Date('2026-05-22T08:00:00Z');
      }

      // Group commits by author to match contributors stats: 10 pravin, 3 jane, 2 unknown
      if (i <= 10) {
        login = 'pravin';
        name = 'Pravin';
        if (i <= 5) {
          additions = 10;
          deletions = 2;
        } else {
          additions = 20;
          deletions = 5;
        }
      } else if (i <= 13) {
        email = 'jane@test.com';
        name = 'Jane';
        additions = 15;
        deletions = 3;
      } else {
        name = 'Unknown Author';
        additions = 15;
        deletions = 3;
      }

      commits.push({
        repoId: repoA._id,
        sha: `sha_commit_${i}_abcdef1234567890`,
        message: `Commit number ${i} message`,
        author: { login, email, name, avatarUrl: `https://avatars.com/u-${i}` },
        additions,
        deletions,
        filesChanged: 2,
        committedAt,
        url: `https://github.com/user-a/repo-a/commit/sha_commit_${i}`
      });
    }
    await Commit.insertMany(commits);

    // Populate repoA with 5 pull requests
    // PR 2 (merged: 12 hrs), PR 4 (merged: 10 hrs), PR 5 (closed, not merged), PR 1 & 3 (open)
    const pullRequests = [
      {
        repoId: repoA._id,
        number: 1,
        title: 'Pull Request 1',
        body: 'Description for PR 1',
        state: 'open',
        author: { login: 'pravin', avatarUrl: 'https://avatar/pravin' },
        reviewers: [],
        labels: ['feature'],
        additions: 100,
        deletions: 20,
        changedFiles: 5,
        merged: false,
        mergedAt: null,
        closedAt: null,
        githubCreatedAt: new Date('2026-05-20T10:00:00Z'),
        githubUpdatedAt: new Date('2026-05-20T10:00:00Z'),
        htmlUrl: 'https://github.com/pr/1'
      },
      {
        repoId: repoA._id,
        number: 2,
        title: 'Pull Request 2',
        body: 'Description for PR 2',
        state: 'closed',
        author: { login: 'jane', avatarUrl: 'https://avatar/jane' },
        reviewers: ['pravin'],
        labels: ['bugfix'],
        additions: 50,
        deletions: 5,
        changedFiles: 2,
        merged: true,
        mergedAt: new Date('2026-05-21T22:00:00Z'), // 12 hours difference
        closedAt: new Date('2026-05-21T22:00:00Z'),
        githubCreatedAt: new Date('2026-05-21T10:00:00Z'),
        githubUpdatedAt: new Date('2026-05-21T22:00:00Z'),
        htmlUrl: 'https://github.com/pr/2'
      },
      {
        repoId: repoA._id,
        number: 3,
        title: 'Pull Request 3',
        body: 'Description for PR 3',
        state: 'open',
        author: { login: 'pravin', avatarUrl: 'https://avatar/pravin' },
        reviewers: [],
        labels: [],
        additions: 30,
        deletions: 10,
        changedFiles: 1,
        merged: false,
        mergedAt: null,
        closedAt: null,
        githubCreatedAt: new Date('2026-05-22T09:00:00Z'),
        githubUpdatedAt: new Date('2026-05-22T09:00:00Z'),
        htmlUrl: 'https://github.com/pr/3'
      },
      {
        repoId: repoA._id,
        number: 4,
        title: 'Pull Request 4',
        body: 'Description for PR 4',
        state: 'closed',
        author: { login: 'pravin', avatarUrl: 'https://avatar/pravin' },
        reviewers: [],
        labels: ['refactor'],
        additions: 200,
        deletions: 50,
        changedFiles: 8,
        merged: true,
        mergedAt: new Date('2026-05-18T20:00:00Z'), // 10 hours difference
        closedAt: new Date('2026-05-18T20:00:00Z'),
        githubCreatedAt: new Date('2026-05-18T10:00:00Z'),
        githubUpdatedAt: new Date('2026-05-18T20:00:00Z'),
        htmlUrl: 'https://github.com/pr/4'
      },
      {
        repoId: repoA._id,
        number: 5,
        title: 'Pull Request 5',
        body: 'Description for PR 5',
        state: 'closed',
        author: { login: 'jane', avatarUrl: 'https://avatar/jane' },
        reviewers: [],
        labels: [],
        additions: 10,
        deletions: 1,
        changedFiles: 1,
        merged: false,
        mergedAt: null,
        closedAt: new Date('2026-05-19T18:00:00Z'),
        githubCreatedAt: new Date('2026-05-19T08:00:00Z'),
        githubUpdatedAt: new Date('2026-05-19T18:00:00Z'),
        htmlUrl: 'https://github.com/pr/5'
      }
    ];
    await PullRequest.insertMany(pullRequests);

    // Populate repoA with 5 issues (3 open, 2 closed)
    const issues = [
      {
        repoId: repoA._id,
        number: 101,
        title: 'Issue 101',
        body: 'Issue 101 body',
        state: 'open',
        author: { login: 'pravin' },
        githubCreatedAt: new Date('2026-05-20T11:00:00Z'),
        githubUpdatedAt: new Date('2026-05-20T11:00:00Z')
      },
      {
        repoId: repoA._id,
        number: 102,
        title: 'Issue 102',
        body: 'Issue 102 body',
        state: 'closed',
        author: { login: 'jane' },
        closedAt: new Date('2026-05-21T18:00:00Z'),
        githubCreatedAt: new Date('2026-05-21T09:00:00Z'),
        githubUpdatedAt: new Date('2026-05-21T18:00:00Z')
      },
      {
        repoId: repoA._id,
        number: 103,
        title: 'Issue 103',
        body: 'Issue 103 body',
        state: 'open',
        author: { login: 'pravin' },
        githubCreatedAt: new Date('2026-05-22T10:00:00Z'),
        githubUpdatedAt: new Date('2026-05-22T10:00:00Z')
      },
      {
        repoId: repoA._id,
        number: 104,
        title: 'Issue 104',
        body: 'Issue 104 body',
        state: 'open',
        author: { login: 'pravin' },
        githubCreatedAt: new Date('2026-05-22T11:00:00Z'),
        githubUpdatedAt: new Date('2026-05-22T11:00:00Z')
      },
      {
        repoId: repoA._id,
        number: 105,
        title: 'Issue 105',
        body: 'Issue 105 body',
        state: 'closed',
        author: { login: 'jane' },
        closedAt: new Date('2026-05-18T18:00:00Z'),
        githubCreatedAt: new Date('2026-05-18T08:00:00Z'),
        githubUpdatedAt: new Date('2026-05-18T18:00:00Z')
      }
    ];
    await Issue.insertMany(issues);
  };

  describe('Authorization and Access Controls', () => {
    test('1. Analytics route requires authentication and returns 401', async () => {
      const res = await request(app).get(`/api/analytics/repos/${repoA._id}/commits`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authorization token required');
    });

    test("2. Accessing another user's repository returns 403", async () => {
      // User A attempts to access Repo B owned by User B
      const res = await request(app)
        .get(`/api/analytics/repos/${repoB._id}/commits`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You are not authorized to access this repository');
    });

    test('3. Accessing non-existing repository returns 404', async () => {
      const randomObjectId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/analytics/repos/${randomObjectId}/commits`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Repository not found');
    });

    test('4. Invalid repoId format returns 400', async () => {
      const res = await request(app)
        .get('/api/analytics/repos/not-a-valid-object-id/commits')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid repository ID format');
    });
  });

  describe('Commits Analytics', () => {
    beforeEach(async () => {
      await setupMockDataForRepoA();
    });

    test('5. Paginated commits page 1 works', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/commits?page=1&limit=10`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.commits).toHaveLength(10);
      expect(res.body.data.total).toBe(15);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(10);
      expect(res.body.data.totalPages).toBe(2);
      expect(res.body.data.commits[0].sha).toContain('sha_commit_');
    });

    test('6. Paginated commits page 2 works', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/commits?page=2&limit=10`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.commits).toHaveLength(5);
      expect(res.body.data.total).toBe(15);
      expect(res.body.data.page).toBe(2);
      expect(res.body.data.totalPages).toBe(2);
    });

    test('7. Commit chart groupBy=day works', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/commits/chart?groupBy=day`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3); // 2026-05-20, 2026-05-21, 2026-05-22

      const day1 = res.body.data[0];
      expect(day1.date).toBe('2026-05-20');
      expect(day1.count).toBe(5);
      expect(day1.additions).toBe(50);
      expect(day1.deletions).toBe(10);

      const day2 = res.body.data[1];
      expect(day2.date).toBe('2026-05-21');
      expect(day2.count).toBe(5);
      expect(day2.additions).toBe(100);
      expect(day2.deletions).toBe(25);
    });

    test('8. Commit chart groupBy=week works', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/commits/chart?groupBy=week`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify the formatted date contains a "W" indicating week grouping
      expect(res.body.data[0].date).toMatch(/^\d{4}-W\d{2}$/);
    });

    test('9. Invalid groupBy returns 400', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/commits/chart?groupBy=month`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid groupBy parameter');
    });
  });

  describe('Contributors Analytics', () => {
    beforeEach(async () => {
      await setupMockDataForRepoA();
    });

    test('10. Contributors endpoint aggregates stats correctly', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/contributors`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3); // pravin, jane@test.com, Unknown Author

      // Verify the contributors are sorted by totalCommits descending
      expect(res.body.data[0].totalCommits).toBe(10); // pravin has 10 commits
      expect(res.body.data[0].login).toBe('pravin');

      const pravin = res.body.data.find(c => c.login === 'pravin');
      expect(pravin).toBeDefined();
      expect(pravin.name).toBe('Pravin');
      expect(pravin.additions).toBe(150);
      expect(pravin.deletions).toBe(35);

      const jane = res.body.data.find(c => c.login === 'jane@test.com');
      expect(jane).toBeDefined();
      expect(jane.name).toBe('Jane');
      expect(jane.additions).toBe(45);
      expect(jane.deletions).toBe(9);
    });
  });

  describe('Pull Requests Analytics', () => {
    beforeEach(async () => {
      await setupMockDataForRepoA();
    });

    test('11. Pull requests endpoint returns pagination and mergeTimeHours', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/pullrequests?page=1&limit=10`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pullRequests).toHaveLength(5);
      expect(res.body.data.total).toBe(5);

      // PR 2 was merged. Let's verify mergeTimeHours
      const pr2 = res.body.data.pullRequests.find(pr => pr.number === 2);
      expect(pr2.mergeTimeHours).toBe(12.00); // 12 hours difference

      // PR 4 was merged. Let's verify mergeTimeHours
      const pr4 = res.body.data.pullRequests.find(pr => pr.number === 4);
      expect(pr4.mergeTimeHours).toBe(10.00); // 10 hours difference

      // PR 1 is open. mergeTimeHours should be null
      const pr1 = res.body.data.pullRequests.find(pr => pr.number === 1);
      expect(pr1.mergeTimeHours).toBeNull();
    });

    test('12. Pull requests state filter works', async () => {
      const openRes = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/pullrequests?state=open`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(openRes.body.data.pullRequests).toHaveLength(2);
      expect(openRes.body.data.total).toBe(2);

      const closedRes = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/pullrequests?state=closed`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(closedRes.body.data.pullRequests).toHaveLength(3);
      expect(closedRes.body.data.total).toBe(3);
    });

    test('13. Invalid PR state filter returns 400', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/pullrequests?state=merged`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid state parameter');
    });
  });

  describe('Issues Analytics', () => {
    beforeEach(async () => {
      await setupMockDataForRepoA();
    });

    test('14. Issues endpoint returns pagination and open/closed summary', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/issues?page=1&limit=10`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.issues).toHaveLength(5);
      expect(res.body.data.total).toBe(5);
      expect(res.body.data.summary).toEqual({ open: 3, closed: 2 });
    });

    test('15. Issues state filter works', async () => {
      const openRes = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/issues?state=open`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(openRes.body.data.issues).toHaveLength(3);
      expect(openRes.body.data.summary).toEqual({ open: 3, closed: 2 });

      const closedRes = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/issues?state=closed`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(closedRes.body.data.issues).toHaveLength(2);
    });

    test('16. Invalid issue state filter returns 400', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/issues?state=deleted`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid state parameter');
    });
  });

  describe('Engineering Velocity Analytics', () => {
    test('17. Velocity endpoint returns correct metrics', async () => {
      await setupMockDataForRepoA();

      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/velocity`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const metrics = res.body.data;
      expect(metrics.totalCommits).toBe(15);
      expect(metrics.totalPRs).toBe(5);
      expect(metrics.mergedPRs).toBe(2);
      expect(metrics.prMergeRate).toBe(40); // 2/5 * 100
      expect(metrics.openIssues).toBe(3);
      expect(metrics.closedIssues).toBe(2);

      // avgMergeTimeHours = (12.00 + 10.00) / 2 = 11.00
      expect(metrics.avgMergeTimeHours).toBe(11.00);

      // commitsPerDay: earliest: 2026-05-20T10:00:00Z, latest: 2026-05-22T08:00:00Z
      // Difference in ms = 2 days - 2 hours = 46 hours.
      // 46 / 24 = 1.916 days -> diffDays < 1 is false. activeDays = Math.ceil(1.916) = 2 active days.
      // commitsPerDay = 15 / 2 = 7.50
      expect(metrics.commitsPerDay).toBe(7.50);
    });

    test('18. Velocity endpoint handles empty repo safely with zero values', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/velocity`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const metrics = res.body.data;
      expect(metrics.totalCommits).toBe(0);
      expect(metrics.totalPRs).toBe(0);
      expect(metrics.mergedPRs).toBe(0);
      expect(metrics.prMergeRate).toBe(0);
      expect(metrics.openIssues).toBe(0);
      expect(metrics.closedIssues).toBe(0);
      expect(metrics.avgMergeTimeHours).toBe(0);
      expect(metrics.commitsPerDay).toBe(0);
    });
  });

  describe('Repository Health and DORA Metrics', () => {
    test('19. Health endpoint returns risk score and first two DORA metrics', async () => {
      await setupMockDataForRepoA();

      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/health`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const health = res.body.data;
      expect(health.riskScore).toBeGreaterThanOrEqual(0);
      expect(health.riskScore).toBeLessThanOrEqual(100);
      expect(['Healthy', 'Warning', 'Critical']).toContain(health.status);
      expect(Array.isArray(health.factors)).toBe(true);
      expect(health.summary.totalCommits).toBe(15);
      expect(health.summary.totalPRs).toBe(5);
      expect(health.summary.prMergeRate).toBe(40);

      expect(health.dora.deploymentFrequency).toEqual(
        expect.objectContaining({
          unit: 'deployable changes/week',
          deployableChangesLast30Days: expect.any(Number),
          rating: expect.any(String)
        })
      );

      expect(health.dora.leadTimeForChanges).toEqual(
        expect.objectContaining({
          value: 11,
          unit: 'hours',
          valueDays: 0.46,
          sampleSize: 2,
          rating: 'elite'
        })
      );
    });

    test('20. Health endpoint handles empty repository safely', async () => {
      const res = await request(app)
        .get(`/api/analytics/repos/${repoA._id}/health`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const health = res.body.data;
      expect(health.riskScore).toBeGreaterThanOrEqual(0);
      expect(health.riskScore).toBeLessThanOrEqual(100);
      expect(health.status).toBe('Warning');
      expect(health.summary.totalCommits).toBe(0);
      expect(health.dora.deploymentFrequency.value).toBe(0);
      expect(health.dora.leadTimeForChanges.value).toBe(0);
      expect(health.dora.leadTimeForChanges.rating).toBe('unknown');
    });
  });
});
