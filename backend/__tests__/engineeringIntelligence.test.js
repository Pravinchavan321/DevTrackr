import request from 'supertest';
import { connectTestDb, disconnectTestDb, clearTestDb } from './helpers/testDb.js';
import User from '../src/models/User.model.js';
import Repository from '../src/models/Repository.model.js';
import Commit from '../src/models/Commit.model.js';
import PullRequest from '../src/models/PullRequest.model.js';
import Issue from '../src/models/Issue.model.js';
import { mockUser } from './helpers/mockData.js';

process.env.GEMINI_API_KEY = '';
process.env.GEMINI_API_KEYS = '';

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

describe('Engineering Intelligence API', () => {
  let token;
  let user;
  let repo;

  const dateDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };

  beforeEach(async () => {
    const registerResponse = await request(app).post('/api/auth/register').send(mockUser);
    token = registerResponse.body.data.accessToken;
    user = await User.findOne({ email: mockUser.email });

    repo = await Repository.create({
      userId: user._id,
      githubRepoId: 777001,
      name: 'intelligence-repo',
      fullName: 'pravin/intelligence-repo',
      description: 'Engineering intelligence test repo',
      isPrivate: false,
      defaultBranch: 'main',
      language: 'JavaScript'
    });
  });

  const seedRiskyRepoData = async () => {
    const commits = [];

    for (let i = 1; i <= 6; i += 1) {
      commits.push({
        repoId: repo._id,
        sha: `recent-pravin-${i}`,
        message: `feat: recent work ${i}`,
        author: { login: 'pravin', name: 'Pravin', email: 'pravin@test.com' },
        committedAt: dateDaysAgo(1),
        additions: 20,
        deletions: 4
      });
    }

    for (let i = 1; i <= 2; i += 1) {
      commits.push({
        repoId: repo._id,
        sha: `recent-jane-${i}`,
        message: `fix: support work ${i}`,
        author: { login: 'jane', name: 'Jane', email: 'jane@test.com' },
        committedAt: dateDaysAgo(2),
        additions: 8,
        deletions: 2
      });
    }

    for (let i = 1; i <= 12; i += 1) {
      commits.push({
        repoId: repo._id,
        sha: `previous-pravin-${i}`,
        message: `chore: previous work ${i}`,
        author: { login: 'pravin', name: 'Pravin', email: 'pravin@test.com' },
        committedAt: dateDaysAgo(10),
        additions: 5,
        deletions: 1
      });
    }

    await Commit.insertMany(commits);

    await PullRequest.insertMany([
      {
        repoId: repo._id,
        number: 1,
        title: 'Stale release PR',
        state: 'open',
        author: { login: 'pravin' },
        reviewers: ['jane'],
        merged: false,
        githubCreatedAt: dateDaysAgo(12),
        githubUpdatedAt: dateDaysAgo(1)
      },
      {
        repoId: repo._id,
        number: 2,
        title: 'Second stale PR',
        state: 'open',
        author: { login: 'pravin' },
        reviewers: [],
        merged: false,
        githubCreatedAt: dateDaysAgo(9),
        githubUpdatedAt: dateDaysAgo(1)
      },
      {
        repoId: repo._id,
        number: 3,
        title: 'Merged feature',
        state: 'closed',
        author: { login: 'jane' },
        reviewers: ['pravin'],
        merged: true,
        mergedAt: dateDaysAgo(2),
        closedAt: dateDaysAgo(2),
        githubCreatedAt: dateDaysAgo(4),
        githubUpdatedAt: dateDaysAgo(2)
      }
    ]);

    await Issue.insertMany([
      {
        repoId: repo._id,
        number: 101,
        title: 'Stale production issue',
        state: 'open',
        author: { login: 'jane' },
        assignees: [{ login: 'pravin' }],
        githubCreatedAt: dateDaysAgo(45),
        githubUpdatedAt: dateDaysAgo(3)
      },
      {
        repoId: repo._id,
        number: 102,
        title: 'Another stale issue',
        state: 'open',
        author: { login: 'pravin' },
        assignees: [{ login: 'pravin' }],
        githubCreatedAt: dateDaysAgo(40),
        githubUpdatedAt: dateDaysAgo(2)
      },
      {
        repoId: repo._id,
        number: 103,
        title: 'Closed sprint issue',
        state: 'closed',
        author: { login: 'jane' },
        closedAt: dateDaysAgo(1),
        githubCreatedAt: dateDaysAgo(5),
        githubUpdatedAt: dateDaysAgo(1)
      }
    ]);
  };

  test('release readiness returns bounded score, status, reasons, and recommendations', async () => {
    await seedRiskyRepoData();

    const res = await request(app)
      .get(`/api/engineering-intelligence/repos/${repo._id}/release-readiness`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.repoFullName).toBe('pravin/intelligence-repo');
    expect(data.score).toBeGreaterThanOrEqual(0);
    expect(data.score).toBeLessThanOrEqual(100);
    expect(['Ready', 'Moderate Risk', 'High Risk', 'Not Ready']).toContain(data.status);
    expect(data.riskFactors.length).toBeGreaterThan(0);
    expect(data.recommendations.length).toBeGreaterThan(0);
    expect(data.metrics.stalePrs).toBe(2);
    expect(data.metrics.staleIssues).toBe(2);
    expect(data.aiGenerated).toBe(false);
  });

  test('workload health detects single-person workload concentration', async () => {
    await seedRiskyRepoData();

    const res = await request(app)
      .get(`/api/engineering-intelligence/repos/${repo._id}/workload-health`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.status).toBe('High Risk');
    expect(data.topContributor.name).toBe('pravin');
    expect(data.topContributor.workloadShare).toBeGreaterThan(60);
    expect(data.contributors.length).toBeGreaterThan(1);
    expect(data.recommendations.length).toBeGreaterThan(0);
  });

  test('sprint retrospective returns safe fallback sections when AI is unavailable', async () => {
    await seedRiskyRepoData();

    const res = await request(app)
      .get(`/api/engineering-intelligence/repos/${repo._id}/sprint-retrospective?range=7d`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.range).toBe('7d');
    expect(data.summary).toEqual(expect.any(String));
    expect(data.whatWentWell.length).toBeGreaterThan(0);
    expect(data.whatWentWrong.length).toBeGreaterThan(0);
    expect(data.risks.length).toBeGreaterThan(0);
    expect(data.actionItems.length).toBeGreaterThan(0);
    expect(data.metrics.releaseReadinessScore).toBeGreaterThanOrEqual(0);
    expect(data.aiGenerated).toBe(false);
  });

  test('empty repository data does not crash engineering intelligence endpoints', async () => {
    const releaseRes = await request(app)
      .get(`/api/engineering-intelligence/repos/${repo._id}/release-readiness`)
      .set('Authorization', `Bearer ${token}`);

    const workloadRes = await request(app)
      .get(`/api/engineering-intelligence/repos/${repo._id}/workload-health`)
      .set('Authorization', `Bearer ${token}`);

    const retroRes = await request(app)
      .get(`/api/engineering-intelligence/repos/${repo._id}/sprint-retrospective`)
      .set('Authorization', `Bearer ${token}`);

    expect(releaseRes.status).toBe(200);
    expect(workloadRes.status).toBe(200);
    expect(retroRes.status).toBe(200);
    expect(releaseRes.body.data.score).toBeGreaterThanOrEqual(0);
    expect(workloadRes.body.data.status).toBe('Healthy');
    expect(retroRes.body.data.summary).toContain('Not enough recent repository activity');
  });
});
