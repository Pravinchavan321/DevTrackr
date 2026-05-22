import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, disconnectTestDb, clearTestDb } from './helpers/testDb.js';
import User from '../src/models/User.model.js';
import { mockUser, mockUserTwo } from './helpers/mockData.js';

beforeAll(async () => {
  await connectTestDb();
});

afterEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

describe('Auth Routes', () => {
  // =========== REGISTER TESTS ===========
  describe('POST /api/auth/register', () => {
    test('should register user with valid data (201)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(mockUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe(mockUser.email);
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    test('should reject duplicate email (409)', async () => {
      // First registration
      await request(app).post('/api/auth/register').send(mockUser);

      // Duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send(mockUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    test('should reject invalid email (422)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'not-an-email',
          password: 'Password@123'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    test('should reject weak password (422)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: '123' // Too weak
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    test('should reject missing name (422)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'Password@123'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    test('should reject password without uppercase (422)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'password@123' // No uppercase
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // =========== LOGIN TESTS ===========
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(mockUser);
    });

    test('should login with correct credentials (200)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: mockUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe(mockUser.email);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    test('should reject wrong password (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'WrongPassword@123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid/i);
    });

    test('should reject non-existent email (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: mockUser.password
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('should reject invalid email format (422)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: mockUser.password
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    test('should reject missing password (422)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // =========== GET ME TESTS ===========
  describe('GET /api/auth/me', () => {
    test('should return current user with valid token (200)', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(mockUser);

      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(mockUser.email);
      expect(res.body.data).not.toHaveProperty('password');
      expect(res.body.data).not.toHaveProperty('refreshToken');
    });

    test('should reject request without token (401)', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/required|unauthorized/i);
    });

    test('should reject invalid token (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('should reject malformed Authorization header (401)', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(mockUser);

      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `InvalidFormat ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========== REFRESH TOKEN TESTS ===========
  describe('POST /api/auth/refresh', () => {
    test('should return new access token (200)', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(mockUser);

      const cookies = regRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.accessToken).toBeTruthy();
    });

    test('should reject without refresh token (401)', async () => {
      const res = await request(app).post('/api/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('should reject invalid refresh token (401)', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=invalid.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========== LOGOUT TESTS ===========
  describe('POST /api/auth/logout', () => {
    test('should logout successfully and clear refresh token (200)', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(mockUser);

      const token = regRes.body.data.accessToken;
      const cookies = regRes.headers['set-cookie'];

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', cookies);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Verify refresh token is cleared in DB
      const user = await User.findOne({ email: mockUser.email }).select(
        '+refreshToken'
      );
      expect(user.refreshToken).toBeNull();

      // Second refresh should fail
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(refreshRes.status).toBe(401);
    });

    test('should reject logout without authentication (401)', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========== INTEGRATION TESTS ===========
  describe('Integration Tests', () => {
    test('should complete full auth flow: register -> get me -> logout -> refresh fails', async () => {
      // 1. Register
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(mockUser);

      expect(regRes.status).toBe(201);
      const accessToken = regRes.body.data.accessToken;
      const cookies = regRes.headers['set-cookie'];

      // 2. Get current user
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe(mockUser.email);

      // 3. Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookies);

      expect(logoutRes.status).toBe(200);

      // 4. Refresh should fail
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(refreshRes.status).toBe(401);
    });

    test('should allow multiple users to register and login independently', async () => {
      // Register user 1
      const reg1 = await request(app)
        .post('/api/auth/register')
        .send(mockUser);

      expect(reg1.status).toBe(201);
      const token1 = reg1.body.data.accessToken;

      // Register user 2
      const reg2 = await request(app)
        .post('/api/auth/register')
        .send(mockUserTwo);

      expect(reg2.status).toBe(201);
      const token2 = reg2.body.data.accessToken;

      // Get user 1 data
      const me1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token1}`);

      expect(me1.status).toBe(200);
      expect(me1.body.data.email).toBe(mockUser.email);

      // Get user 2 data
      const me2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token2}`);

      expect(me2.status).toBe(200);
      expect(me2.body.data.email).toBe(mockUserTwo.email);
    });
  });
});
