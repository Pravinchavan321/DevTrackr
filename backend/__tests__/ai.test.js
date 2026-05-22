import { jest } from '@jest/globals';

// 1. Mock @google/generative-ai BEFORE importing other modules
let mockGenerateContent = jest.fn();
jest.unstable_mockModule('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockImplementation(() => {
          return {
            generateContent: mockGenerateContent
          };
        })
      };
    })
  };
});

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GEMINI_MODEL = 'gemini-1.5-flash';

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
  jest.clearAllMocks();
});

afterAll(async () => {
  await disconnectTestDb();
});

describe('Gemini AI Integration Endpoints', () => {
  let tokenA;
  let tokenB;
  let userA;
  let userB;
  let repoA;
  let repoB;

  beforeEach(async () => {
    // Register and login User A
    const regResA = await request(app).post('/api/auth/register').send(mockUser);
    tokenA = regResA.body.data.accessToken;
    userA = await User.findOne({ email: mockUser.email });

    // Register and login User B
    const regResB = await request(app).post('/api/auth/register').send(mockUserTwo);
    tokenB = regResB.body.data.accessToken;
    userB = await User.findOne({ email: mockUserTwo.email });

    // Repository owned by User A
    repoA = await Repository.create({
      userId: userA._id,
      githubRepoId: 111111,
      name: 'devtrackr-repo-a',
      fullName: 'pravin/devtrackr-repo-a',
      description: 'User A repo',
      isPrivate: false,
      defaultBranch: 'main',
      language: 'JavaScript',
      stars: 5,
      forks: 1,
      openIssuesCount: 2
    });

    // Repository owned by User B
    repoB = await Repository.create({
      userId: userB._id,
      githubRepoId: 222222,
      name: 'devtrackr-repo-b',
      fullName: 'jane/devtrackr-repo-b',
      description: 'User B repo',
      isPrivate: true,
      defaultBranch: 'main',
      language: 'Python',
      stars: 1,
      forks: 0,
      openIssuesCount: 0
    });
  });

  const populateRepoData = async (repoId) => {
    // 3 commits
    await Commit.create([
      {
        repoId,
        sha: 'sha111',
        message: 'feat: setup backend server',
        author: { name: 'Pravin', login: 'pravin', email: 'pravin@test.com' },
        additions: 100,
        deletions: 10,
        committedAt: new Date('2026-05-20T10:00:00Z')
      },
      {
        repoId,
        sha: 'sha222',
        message: 'fix: auth payload validation error',
        author: { name: 'Pravin', login: 'pravin', email: 'pravin@test.com' },
        additions: 10,
        deletions: 2,
        committedAt: new Date('2026-05-21T12:00:00Z')
      },
      {
        repoId,
        sha: 'sha333',
        message: 'docs: update instruction manuals',
        author: { name: 'Jane', login: 'jane', email: 'jane@test.com' },
        additions: 5,
        deletions: 0,
        committedAt: new Date('2026-05-22T08:00:00Z')
      }
    ]);

    // 1 Pull Request merged, 1 stale open
    const now = new Date();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    await PullRequest.create([
      {
        repoId,
        githubPrId: 9001,
        number: 1,
        title: 'Initial setup',
        state: 'closed',
        author: { login: 'pravin' },
        githubCreatedAt: tenDaysAgo,
        githubUpdatedAt: now,
        mergedAt: eightDaysAgo
      },
      {
        repoId,
        githubPrId: 9002,
        number: 2,
        title: 'Work in progress stale feature',
        state: 'open',
        author: { login: 'pravin' },
        githubCreatedAt: tenDaysAgo,
        githubUpdatedAt: now,
        mergedAt: null
      }
    ]);

    // 1 open stale issue
    const fortyDaysAgo = new Date();
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
    await Issue.create({
      repoId,
      githubIssueId: 8001,
      number: 1,
      title: 'Stale bug reported by user',
      state: 'open',
      author: { login: 'pravin' },
      githubCreatedAt: fortyDaysAgo,
      githubUpdatedAt: now
    });
  };

  describe('Route Authorization and Ownership Verification', () => {
    // Test 1: AI route requires authentication and returns 401
    it('should return 401 if request is unauthenticated', async () => {
      const res = await request(app)
        .post(`/api/ai/repos/${repoA._id}/summarize`)
        .send();
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // Test 2: Invalid repoId format returns 400
    it('should return 400 if repoId is invalid ObjectId format', async () => {
      const res = await request(app)
        .post('/api/ai/repos/invalid-id/summarize')
        .set('Authorization', `Bearer ${tokenA}`)
        .send();
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid repository ID');
    });

    // Test 3: Non-existing repo returns 404
    it('should return 404 if repo does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/ai/repos/${fakeId}/summarize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Repository not found');
    });

    // Test 4: Another user's repo returns 403
    it('should return 403 if repository belongs to another user', async () => {
      const res = await request(app)
        .post(`/api/ai/repos/${repoB._id}/summarize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You are not authorized to access this repository');
    });
  });

  describe('Sprint Summary Insights', () => {
    // Test 5: Sprint summary success with mocked Gemini
    it('should successfully generate and return sprint summary', async () => {
      await populateRepoData(repoA._id);

      const mockResponse = {
        summary: 'Pravin and Jane completed initial server setup and bug fixing.',
        velocity: 'high due to rapid delivery and testing',
        highlights: ['Server setup', 'Instructions updated'],
        concerns: ['Stale issues list'],
        sprintScore: 9
      };

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(mockResponse) }
      });

      const res = await request(app)
        .post(`/api/ai/repos/${repoA._id}/summarize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          from: '2026-05-19',
          to: '2026-05-23'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cached).toBe(false);
      expect(res.body.data.parsedData.summary).toBe(mockResponse.summary);
      expect(res.body.data.parsedData.sprintScore).toBe(9);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    // Test 6: Sprint summary cache works within 24 hours
    it('should return cached sprint summary within 24 hours', async () => {
      await populateRepoData(repoA._id);

      const mockResponse = {
        summary: 'Pravin and Jane completed initial server setup.',
        velocity: 'high',
        highlights: ['Server setup'],
        concerns: ['Stale issues'],
        sprintScore: 9
      };

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(mockResponse) }
      });

      // Call 1: should call Gemini
      const res1 = await request(app)
        .post(`/api/ai/repos/${repoA._id}/summarize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          from: '2026-05-19',
          to: '2026-05-23'
        });
      expect(res1.body.data.cached).toBe(false);

      // Call 2: should be cached
      const res2 = await request(app)
        .post(`/api/ai/repos/${repoA._id}/summarize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          from: '2026-05-19',
          to: '2026-05-23'
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.cached).toBe(true);
      expect(res2.body.data.parsedData.summary).toBe(mockResponse.summary);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // Still 1
    });

    // Test 7: force=true bypasses cache and regenerates
    it('should bypass cache when force=true is supplied', async () => {
      await populateRepoData(repoA._id);

      const mockResponse1 = {
        summary: 'Sprint summary first run.',
        velocity: 'medium',
        highlights: ['Run 1'],
        concerns: [],
        sprintScore: 7
      };

      const mockResponse2 = {
        summary: 'Sprint summary second run bypassed.',
        velocity: 'high',
        highlights: ['Run 2'],
        concerns: [],
        sprintScore: 8
      };

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(mockResponse1) }
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(mockResponse2) }
        });

      // First call (populates cache)
      await request(app)
        .post(`/api/ai/repos/${repoA._id}/summarize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ from: '2026-05-19', to: '2026-05-23' });

      // Second call with force=true (should call Gemini again)
      const res = await request(app)
        .post(`/api/ai/repos/${repoA._id}/summarize?force=true`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ from: '2026-05-19', to: '2026-05-23' });

      expect(res.status).toBe(200);
      expect(res.body.data.cached).toBe(false);
      expect(res.body.data.parsedData.summary).toBe(mockResponse2.summary);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    // Test 14: Invalid date range for summarize returns 400
    it('should return 400 if from date is after to date', async () => {
      const res = await request(app)
        .post(`/api/ai/repos/${repoA._id}/summarize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          from: '2026-05-25',
          to: '2026-05-20'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('from date cannot be after to date');
    });
  });

  describe('Bottleneck Detection', () => {
    // Test 8: Bottleneck analysis returns severity structure
    it('should successfully detect and return bottlenecks structure', async () => {
      await populateRepoData(repoA._id);

      const mockResponse = {
        bottlenecks: [
          {
            type: 'Stale Issues',
            severity: 'high',
            description: 'Stale open issues exceed threshold.',
            suggestion: 'Setup auto-close stale issue actions.'
          }
        ],
        riskLevel: 'high',
        topRecommendation: 'Speed up resolution of stale items.'
      };

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(mockResponse) }
      });

      const res = await request(app)
        .post(`/api/ai/repos/${repoA._id}/bottlenecks`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parsedData.riskLevel).toBe('high');
      expect(res.body.data.parsedData.bottlenecks[0].severity).toBe('high');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Contributor Analysis', () => {
    // Test 9: Contributor analysis returns team health structure
    it('should successfully generate and return contributor health structure', async () => {
      await populateRepoData(repoA._id);

      const mockResponse = {
        activeContributors: 2,
        inactiveContributors: [],
        busContributors: ['pravin'],
        teamHealthScore: 7,
        insights: ['Pravin handles majority of code edits representing a bus risk.']
      };

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(mockResponse) }
      });

      const res = await request(app)
        .post(`/api/ai/repos/${repoA._id}/contributors`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parsedData.teamHealthScore).toBe(7);
      expect(res.body.data.parsedData.busContributors).toContain('pravin');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Recommendations', () => {
    // Test 10: Recommendations return recommendation list structure
    it('should successfully return recommendations list structure', async () => {
      await populateRepoData(repoA._id);

      const mockResponse = {
        recommendations: [
          {
            priority: 'high',
            title: 'Close Stale PRs',
            reason: 'One stale PR has been open over 7 days.',
            action: 'Review and close PR #2.'
          }
        ],
        nextBestAction: 'Review PR #2 immediately.'
      };

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(mockResponse) }
      });

      const res = await request(app)
        .post(`/api/ai/repos/${repoA._id}/recommendations`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parsedData.recommendations[0].priority).toBe('high');
      expect(res.body.data.parsedData.nextBestAction).toBe(mockResponse.nextBestAction);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Gemini Failures and Retries', () => {
    // Test 11: Gemini invalid JSON retries once
    it('should retry once if Gemini returns invalid JSON initially', async () => {
      await populateRepoData(repoA._id);

      const validResponse = {
        summary: 'Clean sprint summary after retry.',
        velocity: 'low',
        highlights: ['Retry works'],
        concerns: [],
        sprintScore: 6
      };

      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => 'Invalid JSON string that causes parser error' }
        })
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify(validResponse) }
        });

      const res = await request(app)
        .post(`/api/ai/repos/${repoA._id}/summarize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ from: '2026-05-19', to: '2026-05-23' });

      expect(res.status).toBe(200);
      expect(res.body.data.parsedData.summary).toBe(validResponse.summary);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    // Test 12: Gemini API failure returns safe fallback response
    it('should return safe fallback response if Gemini fails completely', async () => {
      await populateRepoData(repoA._id);

      mockGenerateContent
        .mockRejectedValueOnce(new Error('API quota exceeded'))
        .mockRejectedValueOnce(new Error('API quota exceeded'));

      const res = await request(app)
        .post(`/api/ai/repos/${repoA._id}/summarize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ from: '2026-05-19', to: '2026-05-23' });

      expect(res.status).toBe(200);
      expect(res.body.data.parsedData.sprintScore).toBe(0);
      expect(res.body.data.parsedData.summary).toBe('AI summary is temporarily unavailable.');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET Insights', () => {
    // Test 13: GET /api/ai/repos/:repoId/insights returns cached insights
    it('should fetch all currently cached insights for a repository', async () => {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 10); // 10 hours from now
      await AIInsight.create([
        {
          repoId: repoA._id,
          userId: userA._id,
          type: 'sprint_summary',
          parsedData: { summary: 'Sprint 1 summary' },
          expiresAt
        },
        {
          repoId: repoA._id,
          userId: userA._id,
          type: 'bottleneck',
          parsedData: { riskLevel: 'low' },
          expiresAt
        }
      ]);

      const res = await request(app)
        .get(`/api/ai/repos/${repoA._id}/insights`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].type).toBe('bottleneck');
      expect(res.body.data[1].type).toBe('sprint_summary');
    });
  });

  describe('Robustness with Missing Repository Data', () => {
    // Test 15: Missing repository data does not crash AI generation
    it('should gracefully handle repositories with no commits, Issues, or PRs', async () => {
      // repoA starts with no commits, PRs or Issues in DB.
      const mockResponse = {
        summary: 'No activities found in this repository.',
        velocity: 'unknown',
        highlights: [],
        concerns: ['No records registered.'],
        sprintScore: 1
      };

      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(mockResponse) }
      });

      const res = await request(app)
        .post(`/api/ai/repos/${repoA._id}/summarize`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          from: '2026-05-19',
          to: '2026-05-23'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parsedData.sprintScore).toBe(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });
});
