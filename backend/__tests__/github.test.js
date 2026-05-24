import { jest } from '@jest/globals';

// 1. Establish ESM Mock of @octokit/rest BEFORE other imports
jest.unstable_mockModule('@octokit/rest', () => {
  const mockOctokitInstance = {
    rest: {
      users: {
        getAuthenticated: jest.fn().mockResolvedValue({
          data: {
            id: 123456,
            login: 'mock-github-user'
          }
        })
      },
      repos: {
        listForAuthenticatedUser: jest.fn().mockResolvedValue({
          data: [
            {
              id: 987654,
              name: 'test-repo',
              full_name: 'mock-github-user/test-repo',
              description: 'My test repo',
              private: false,
              default_branch: 'main',
              language: 'JavaScript',
              stargazers_count: 5,
              forks_count: 1,
              open_issues_count: 2,
              html_url: 'https://github.com/mock-github-user/test-repo',
              updated_at: '2026-05-22T00:00:00Z'
            }
          ]
        })
      }
    }
  };

  return {
    Octokit: jest.fn().mockImplementation(() => mockOctokitInstance)
  };
});

// 2. Import standard modules
import request from 'supertest';
import { connectTestDb, disconnectTestDb, clearTestDb } from './helpers/testDb.js';
import User from '../src/models/User.model.js';
import { mockUser } from './helpers/mockData.js';
import * as encryptionHelper from '../src/utils/encryptionHelper.js';

let app;

beforeAll(async () => {
  process.env.GITHUB_CLIENT_ID = 'test_github_client_id_123';
  process.env.GITHUB_CLIENT_SECRET = 'test_github_client_secret_456';
  process.env.GITHUB_REDIRECT_URI = 'http://localhost:5000/api/github/callback';
  process.env.FRONTEND_URL = 'http://localhost:5173';

  await connectTestDb();
  // Dynamically import app so it uses the mocked module
  const appModule = await import('../src/app.js');
  app = appModule.default;
});

afterEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

describe('GitHub Integration & OAuth Routes', () => {
  // Test Encryption Helper
  describe('Encryption Helper', () => {
    test('5. encryptionHelper encrypt/decrypt round trip', () => {
      const originalToken = 'gho_1234567890abcdefghijklmnopqrstuvwxyz';
      const encrypted = encryptionHelper.encrypt(originalToken);
      const decrypted = encryptionHelper.decrypt(encrypted);

      expect(decrypted).toBe(originalToken);
    });

    test('6. encryptionHelper encrypted value is not equal to original token', () => {
      const originalToken = 'gho_1234567890abcdefghijklmnopqrstuvwxyz';
      const encrypted = encryptionHelper.encrypt(originalToken);

      expect(encrypted).not.toBe(originalToken);
      expect(encrypted).toBeTruthy();
    });

    test('encryptionHelper throws clear error if ENCRYPTION_SECRET is missing', () => {
      const originalSecret = process.env.ENCRYPTION_SECRET;
      delete process.env.ENCRYPTION_SECRET;

      expect(() => {
        encryptionHelper.encrypt('test');
      }).toThrow(/ENCRYPTION_SECRET environment variable is missing/);

      process.env.ENCRYPTION_SECRET = originalSecret;
    });
  });

  // Test Authentication Requirements
  describe('Authentication Requirements', () => {
    test('2. GET /api/github/status requires auth', async () => {
      const res = await request(app).get('/api/github/status');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('9. GET /api/github/connect requires auth', async () => {
      const res = await request(app).get('/api/github/connect');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // Test Connect Route
  describe('GET /api/github/connect', () => {
    test('10. GET /api/github/connect returns redirect to github.com when authenticated', async () => {
      // Register & Login to get token
      const regRes = await request(app).post('/api/auth/register').send(mockUser);
      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/github/connect')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(302); // Found redirect
      expect(res.headers.location).toContain('github.com/login/oauth/authorize');
      expect(res.headers.location).toContain('client_id=');
      expect(res.headers.location).toContain('state=');
      expect(res.headers['set-cookie']).toBeDefined(); // Cookie containing state should be set
    });

    test('sets production OAuth state cookie for cross-site frontend requests', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const regRes = await request(app).post('/api/auth/register').send(mockUser);
        const token = regRes.body.data.accessToken;

        const res = await request(app)
          .get('/api/github/connect')
          .set('Authorization', `Bearer ${token}`);

        const stateCookie = res.headers['set-cookie'].find((cookie) =>
          cookie.startsWith('github_oauth_state=')
        );

        expect(stateCookie).toContain('HttpOnly');
        expect(stateCookie).toContain('Secure');
        expect(stateCookie).toContain('SameSite=None');
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  // Test Callback Route
  describe('GET /api/github/callback', () => {
    test('7. GET /api/github/callback without code returns 400 or redirects with error', async () => {
      const res = await request(app).get('/api/github/callback');
      
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('settings?github=error');
    });

    test('8. GET /api/github/callback with invalid/missing state returns 400 or redirects with error', async () => {
      const res = await request(app)
        .get('/api/github/callback')
        .query({ code: 'mock-code', state: 'invalid-state' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('settings?github=error');
    });

    test('GET /api/github/callback exchanges code and successfully connects user', async () => {
      // 1. Register & Login user
      const regRes = await request(app).post('/api/auth/register').send(mockUser);
      const token = regRes.body.data.accessToken;

      // 2. Start connection flow to get state cookie
      const connectRes = await request(app)
        .get('/api/github/connect')
        .set('Authorization', `Bearer ${token}`);

      const stateCookie = connectRes.headers['set-cookie'][0];
      
      // Extract state parameter from the redirect location
      const redirectUrl = connectRes.headers.location;
      const stateParam = new URL(redirectUrl).searchParams.get('state');

      // Mock only global fetch for OAuth exchange
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'mock-github-access-token' })
      });

      try {
        // 3. Fire callback with correct state and state cookie
        const callbackRes = await request(app)
          .get('/api/github/callback')
          .query({ code: 'valid-code', state: stateParam })
          .set('Cookie', stateCookie);

        expect(callbackRes.status).toBe(302);
        expect(callbackRes.headers.location).toContain('settings?github=connected');

        // Verify fields were updated in DB
        const dbUser = await User.findOne({ email: mockUser.email }).select('+githubAccessToken');
        expect(dbUser.githubConnected).toBe(true);
        expect(dbUser.githubUsername).toBe('mock-github-user');
        expect(dbUser.githubId).toBe('123456');
        expect(dbUser.githubAccessToken).toBeDefined();

        const decrypted = encryptionHelper.decrypt(dbUser.githubAccessToken);
        expect(decrypted).toBe('mock-github-access-token');
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('GET /api/github/callback succeeds when browser does not return the state cookie', async () => {
      // 1. Register & Login user
      const regRes = await request(app).post('/api/auth/register').send(mockUser);
      const token = regRes.body.data.accessToken;

      // 2. Start connection flow to persist server-side OAuth state
      const connectRes = await request(app)
        .get('/api/github/connect')
        .set('Authorization', `Bearer ${token}`);

      const redirectUrl = connectRes.headers.location;
      const stateParam = new URL(redirectUrl).searchParams.get('state');

      // Mock only global fetch for OAuth exchange
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'mock-github-access-token' })
      });

      try {
        // 3. Fire callback without Cookie header to simulate blocked third-party cookies
        const callbackRes = await request(app)
          .get('/api/github/callback')
          .query({ code: 'valid-code', state: stateParam });

        expect(callbackRes.status).toBe(302);
        expect(callbackRes.headers.location).toContain('settings?github=connected');

        const dbUser = await User.findOne({ email: mockUser.email }).select(
          '+githubAccessToken +githubOAuthState +githubOAuthStateExpiresAt'
        );
        expect(dbUser.githubConnected).toBe(true);
        expect(dbUser.githubOAuthState).toBeUndefined();
        expect(dbUser.githubOAuthStateExpiresAt).toBeUndefined();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // Test Status Route
  describe('GET /api/github/status', () => {
    test('1. GET /api/github/status without GitHub connected returns connected false', async () => {
      const regRes = await request(app).post('/api/auth/register').send(mockUser);
      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/github/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.connected).toBe(false);
      expect(res.body.data.username).toBeNull();
    });

    test('GET /api/github/status with connected GitHub returns connected true and username', async () => {
      const regRes = await request(app).post('/api/auth/register').send(mockUser);
      const token = regRes.body.data.accessToken;

      // Manually set github status to connected
      const user = await User.findOne({ email: mockUser.email });
      user.githubConnected = true;
      user.githubUsername = 'test-connected-user';
      user.githubId = '654321';
      user.githubAccessToken = encryptionHelper.encrypt('dummy-token');
      await user.save();

      const res = await request(app)
        .get('/api/github/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.connected).toBe(true);
      expect(res.body.data.username).toBe('test-connected-user');
    });
  });

  // Test Repos Route
  describe('GET /api/github/repos', () => {
    test('3. GET /api/github/repos without GitHub connected returns 403', async () => {
      const regRes = await request(app).post('/api/auth/register').send(mockUser);
      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/github/repos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please connect GitHub first');
    });

    test('GET /api/github/repos with GitHub connected returns repository list', async () => {
      const regRes = await request(app).post('/api/auth/register').send(mockUser);
      const token = regRes.body.data.accessToken;

      // Connect user manually
      const user = await User.findOne({ email: mockUser.email });
      user.githubConnected = true;
      user.githubUsername = 'mock-github-user';
      user.githubId = '123456';
      user.githubAccessToken = encryptionHelper.encrypt('mock-github-access-token');
      await user.save();

      const res = await request(app)
        .get('/api/github/repos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('name', 'test-repo');
      expect(res.body.data[0]).toHaveProperty('fullName', 'mock-github-user/test-repo');
      expect(res.body.data[0]).toHaveProperty('private', false);
      expect(res.body.data[0]).toHaveProperty('stars', 5);
    });
  });

  // Test Disconnect Route
  describe('DELETE /api/github/disconnect', () => {
    test('4. DELETE /api/github/disconnect clears GitHub fields', async () => {
      const regRes = await request(app).post('/api/auth/register').send(mockUser);
      const token = regRes.body.data.accessToken;

      // Connect user manually
      const user = await User.findOne({ email: mockUser.email });
      user.githubConnected = true;
      user.githubUsername = 'mock-github-user';
      user.githubId = '123456';
      user.githubAccessToken = encryptionHelper.encrypt('mock-github-access-token');
      await user.save();

      // Fire disconnect request
      const res = await request(app)
        .delete('/api/github/disconnect')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify fields cleared in database
      const dbUser = await User.findOne({ email: mockUser.email }).select('+githubAccessToken');
      expect(dbUser.githubConnected).toBe(false);
      expect(dbUser.githubUsername).toBeUndefined();
      expect(dbUser.githubId).toBeUndefined();
      expect(dbUser.githubAccessToken).toBeUndefined();
    });
  });
});
