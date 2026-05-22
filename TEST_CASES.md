# DevTrackr — Test Cases
## Complete Test Reference (Jest + Supertest + Vitest)

---

## ⚙️ Test Setup

```js
// backend/__tests__/helpers/testDb.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

const connect = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

module.exports = { connect, disconnect };
```

```js
// backend/__tests__/helpers/mockData.js
const mockUser = {
  name: 'Pravin Dev',
  email: 'pravin@test.com',
  password: 'Password@123'
};

const mockRepo = {
  githubRepoId: 123456,
  name: 'devtrackr',
  fullName: 'pravin/devtrackr',
  description: 'Test repo',
  isPrivate: false,
  defaultBranch: 'main',
  language: 'JavaScript',
  stars: 10,
  forks: 2,
  openIssuesCount: 5
};

const mockCommit = {
  sha: 'abc123def456',
  message: 'feat: add user authentication',
  author: { name: 'Pravin', email: 'pravin@test.com', login: 'pravin' },
  additions: 50,
  deletions: 10,
  filesChanged: 3,
  committedAt: new Date('2024-01-15T10:00:00Z')
};

module.exports = { mockUser, mockRepo, mockCommit };
```

---

## 🔐 1. Auth Tests (`auth.test.js`)

### TC-AUTH-001: Register with valid data → 201 Created
```js
test('POST /api/auth/register - success', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Pravin Dev', email: 'pravin@test.com', password: 'Password@123' });

  expect(res.status).toBe(201);
  expect(res.body.success).toBe(true);
  expect(res.body.data).toHaveProperty('accessToken');
  expect(res.body.data).not.toHaveProperty('password');
  expect(res.body.data.user.email).toBe('pravin@test.com');
});
```

### TC-AUTH-002: Register with duplicate email → 409 Conflict
```js
test('POST /api/auth/register - duplicate email', async () => {
  await request(app).post('/api/auth/register').send(mockUser);
  const res = await request(app).post('/api/auth/register').send(mockUser);

  expect(res.status).toBe(409);
  expect(res.body.success).toBe(false);
  expect(res.body.message).toMatch(/already exists/i);
});
```

### TC-AUTH-003: Register with invalid email → 422 Unprocessable
```js
test('POST /api/auth/register - invalid email', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test', email: 'not-an-email', password: 'Password@123' });

  expect(res.status).toBe(422);
  expect(res.body.errors.length).toBeGreaterThan(0);
});
```

### TC-AUTH-004: Register with weak password → 422
```js
test('POST /api/auth/register - weak password', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test', email: 'test@test.com', password: '123' });

  expect(res.status).toBe(422);
});
```

### TC-AUTH-005: Login with correct credentials → 200 + tokens
```js
test('POST /api/auth/login - success', async () => {
  await request(app).post('/api/auth/register').send(mockUser);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: mockUser.email, password: mockUser.password });

  expect(res.status).toBe(200);
  expect(res.body.data).toHaveProperty('accessToken');
  expect(res.headers['set-cookie']).toBeDefined(); // httpOnly refresh cookie
});
```

### TC-AUTH-006: Login with wrong password → 401
```js
test('POST /api/auth/login - wrong password', async () => {
  await request(app).post('/api/auth/register').send(mockUser);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: mockUser.email, password: 'WrongPassword' });

  expect(res.status).toBe(401);
  expect(res.body.success).toBe(false);
});
```

### TC-AUTH-007: Login with non-existent email → 401
```js
test('POST /api/auth/login - non-existent user', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nobody@test.com', password: 'Password@123' });

  expect(res.status).toBe(401);
});
```

### TC-AUTH-008: GET /me with valid token → 200
```js
test('GET /api/auth/me - authorized', async () => {
  const reg = await request(app).post('/api/auth/register').send(mockUser);
  const token = reg.body.data.accessToken;

  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.data.email).toBe(mockUser.email);
  expect(res.body.data).not.toHaveProperty('password');
});
```

### TC-AUTH-009: GET /me without token → 401
```js
test('GET /api/auth/me - no token', async () => {
  const res = await request(app).get('/api/auth/me');
  expect(res.status).toBe(401);
});
```

### TC-AUTH-010: GET /me with expired/invalid token → 401
```js
test('GET /api/auth/me - invalid token', async () => {
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', 'Bearer invalid.token.here');

  expect(res.status).toBe(401);
});
```

### TC-AUTH-011: Refresh token → new access token
```js
test('POST /api/auth/refresh - success', async () => {
  const reg = await request(app).post('/api/auth/register').send(mockUser);
  const cookies = reg.headers['set-cookie'];

  const res = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', cookies);

  expect(res.status).toBe(200);
  expect(res.body.data).toHaveProperty('accessToken');
});
```

### TC-AUTH-012: Logout invalidates refresh token
```js
test('POST /api/auth/logout - clears refresh token', async () => {
  const reg = await request(app).post('/api/auth/register').send(mockUser);
  const token = reg.body.data.accessToken;
  const cookies = reg.headers['set-cookie'];

  await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`)
    .set('Cookie', cookies);

  // Second refresh should now fail
  const res = await request(app)
    .post('/api/auth/refresh')
    .set('Cookie', cookies);

  expect(res.status).toBe(401);
});
```

---

## 🐙 2. GitHub Tests (`github.test.js`)

### TC-GH-001: GET /github/status without GitHub connected → false
```js
test('GET /api/github/status - not connected', async () => {
  const { token } = await registerAndGetToken();
  const res = await request(app)
    .get('/api/github/status')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.data.connected).toBe(false);
});
```

### TC-GH-002: GET /github/repos without GitHub connected → 403
```js
test('GET /api/github/repos - github not connected', async () => {
  const { token } = await registerAndGetToken();
  const res = await request(app)
    .get('/api/github/repos')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(403);
  expect(res.body.message).toMatch(/connect github/i);
});
```

### TC-GH-003: Sync endpoint requires auth
```js
test('POST /api/github/repos/:repoName/sync - no auth', async () => {
  const res = await request(app)
    .post('/api/github/repos/pravin%2Fdevtrackr/sync');

  expect(res.status).toBe(401);
});
```

### TC-GH-004: GitHub callback with invalid/missing code → 400
```js
test('GET /api/github/callback - missing code', async () => {
  const res = await request(app).get('/api/github/callback');
  expect(res.status).toBe(400);
});
```

### TC-GH-005: GitHub token encrypted before saving (unit test)
```js
// Unit test for encryptionHelper.js
const { encrypt, decrypt } = require('../../utils/encryptionHelper');

test('Encryption round-trip', () => {
  const original = 'ghp_secret_github_token';
  const encrypted = encrypt(original);

  expect(encrypted).not.toBe(original);
  expect(decrypt(encrypted)).toBe(original);
});
```

### TC-GH-006: Disconnect GitHub resets user fields
```js
test('DELETE /api/github/disconnect - clears github data', async () => {
  const { token, userId } = await registerAndGetToken();
  // Manually set githubConnected = true in DB for test
  await User.findByIdAndUpdate(userId, {
    githubConnected: true,
    githubId: '12345',
    githubUsername: 'pravin'
  });

  const res = await request(app)
    .delete('/api/github/disconnect')
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  const user = await User.findById(userId);
  expect(user.githubConnected).toBe(false);
  expect(user.githubAccessToken).toBeUndefined();
});
```

---

## 📊 3. Analytics Tests (`analytics.test.js`)

### TC-AN-001: GET commits returns paginated results
```js
test('GET /api/analytics/repos/:repoId/commits - paginated', async () => {
  const { token, repoId } = await setupRepoWithCommits(15);

  const res = await request(app)
    .get(`/api/analytics/repos/${repoId}/commits?page=1&limit=10`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.data.commits).toHaveLength(10);
  expect(res.body.data.total).toBe(15);
  expect(res.body.data.page).toBe(1);
});
```

### TC-AN-002: GET commits page 2
```js
test('GET /api/analytics/repos/:repoId/commits - page 2', async () => {
  const { token, repoId } = await setupRepoWithCommits(15);

  const res = await request(app)
    .get(`/api/analytics/repos/${repoId}/commits?page=2&limit=10`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.body.data.commits).toHaveLength(5);
  expect(res.body.data.page).toBe(2);
});
```

### TC-AN-003: Commit chart groups by day
```js
test('GET /api/analytics/repos/:repoId/commits/chart - grouped by day', async () => {
  const { token, repoId } = await setupRepoWithCommits(5);

  const res = await request(app)
    .get(`/api/analytics/repos/${repoId}/commits/chart?groupBy=day`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.data)).toBe(true);
  expect(res.body.data[0]).toHaveProperty('date');
  expect(res.body.data[0]).toHaveProperty('count');
});
```

### TC-AN-004: Contributors endpoint returns per-author stats
```js
test('GET /api/analytics/repos/:repoId/contributors', async () => {
  const { token, repoId } = await setupRepoWithCommits(10);

  const res = await request(app)
    .get(`/api/analytics/repos/${repoId}/contributors`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.data[0]).toHaveProperty('login');
  expect(res.body.data[0]).toHaveProperty('totalCommits');
  expect(res.body.data[0]).toHaveProperty('additions');
  expect(res.body.data[0]).toHaveProperty('deletions');
});
```

### TC-AN-005: Analytics for repo not belonging to user → 403
```js
test('GET /api/analytics/repos/:repoId/commits - wrong user', async () => {
  const { repoId } = await setupRepoWithCommits(5);
  const { token: otherToken } = await registerAndGetToken('other@test.com');

  const res = await request(app)
    .get(`/api/analytics/repos/${repoId}/commits`)
    .set('Authorization', `Bearer ${otherToken}`);

  expect(res.status).toBe(403);
});
```

### TC-AN-006: Analytics for non-existent repo → 404
```js
test('GET /api/analytics/repos/:repoId/commits - not found', async () => {
  const { token } = await registerAndGetToken();
  const fakeId = new mongoose.Types.ObjectId();

  const res = await request(app)
    .get(`/api/analytics/repos/${fakeId}/commits`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(404);
});
```

### TC-AN-007: Velocity endpoint returns correct metrics
```js
test('GET /api/analytics/repos/:repoId/velocity', async () => {
  const { token, repoId } = await setupRepoWithPRs(5);

  const res = await request(app)
    .get(`/api/analytics/repos/${repoId}/velocity`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.data).toHaveProperty('avgMergeTimeHours');
  expect(res.body.data).toHaveProperty('commitsPerDay');
  expect(res.body.data).toHaveProperty('prMergeRate');
});
```

---

## 🤖 4. AI / Gemini Tests (`ai.test.js`)

### TC-AI-001: Generate sprint summary — success (mocked Gemini)
```js
jest.mock('../../services/gemini.service', () => ({
  generateSprintSummary: jest.fn().mockResolvedValue({
    summary: 'Good sprint progress',
    velocity: 'high',
    highlights: ['Feature A merged', 'Bug B fixed'],
    concerns: [],
    sprintScore: 8
  })
}));

test('POST /api/ai/repos/:repoId/summarize - success', async () => {
  const { token, repoId } = await setupRepoWithCommits(10);

  const res = await request(app)
    .post(`/api/ai/repos/${repoId}/summarize`)
    .send({ from: '2024-01-01', to: '2024-01-31' })
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.data).toHaveProperty('summary');
  expect(res.body.data.sprintScore).toBeGreaterThanOrEqual(1);
});
```

### TC-AI-002: Insight served from cache within 24h
```js
test('POST /api/ai/repos/:repoId/summarize - returns cached within 24h', async () => {
  const geminiSpy = jest.spyOn(geminiService, 'generateSprintSummary');
  const { token, repoId } = await setupRepoWithCommits(5);

  // First call
  await request(app)
    .post(`/api/ai/repos/${repoId}/summarize`)
    .send({ from: '2024-01-01', to: '2024-01-31' })
    .set('Authorization', `Bearer ${token}`);

  // Second call within 24h
  await request(app)
    .post(`/api/ai/repos/${repoId}/summarize`)
    .send({ from: '2024-01-01', to: '2024-01-31' })
    .set('Authorization', `Bearer ${token}`);

  // Gemini only called once
  expect(geminiSpy).toHaveBeenCalledTimes(1);
});
```

### TC-AI-003: Force regeneration bypasses cache
```js
test('POST /api/ai/repos/:repoId/summarize?force=true - bypasses cache', async () => {
  const geminiSpy = jest.spyOn(geminiService, 'generateSprintSummary');
  const { token, repoId } = await setupRepoWithCommits(5);

  await request(app)
    .post(`/api/ai/repos/${repoId}/summarize`)
    .send({ from: '2024-01-01', to: '2024-01-31' })
    .set('Authorization', `Bearer ${token}`);

  await request(app)
    .post(`/api/ai/repos/${repoId}/summarize?force=true`)
    .send({ from: '2024-01-01', to: '2024-01-31' })
    .set('Authorization', `Bearer ${token}`);

  expect(geminiSpy).toHaveBeenCalledTimes(2);
});
```

### TC-AI-004: Bottleneck detection returns severity levels
```js
test('POST /api/ai/repos/:repoId/bottlenecks', async () => {
  const { token, repoId } = await setupRepoWithPRs(3);

  const res = await request(app)
    .post(`/api/ai/repos/${repoId}/bottlenecks`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.data.bottlenecks)).toBe(true);
  expect(res.body.data).toHaveProperty('riskLevel');
  expect(['high', 'medium', 'low']).toContain(res.body.data.riskLevel);
});
```

### TC-AI-005: Gemini returns invalid JSON → graceful fallback
```js
jest.mock('../../services/gemini.service', () => ({
  generateSprintSummary: jest.fn().mockRejectedValue(new Error('Invalid JSON from Gemini'))
}));

test('POST /api/ai/repos/:repoId/summarize - Gemini failure → 500 with message', async () => {
  const { token, repoId } = await setupRepoWithCommits(5);

  const res = await request(app)
    .post(`/api/ai/repos/${repoId}/summarize`)
    .send({ from: '2024-01-01', to: '2024-01-31' })
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(500);
  expect(res.body.success).toBe(false);
  expect(res.body.message).toMatch(/insight generation failed/i);
});
```

### TC-AI-006: GET /insights returns all cached insights for repo
```js
test('GET /api/ai/repos/:repoId/insights', async () => {
  const { token, repoId } = await setupInsights(repoId, ['sprint_summary', 'bottleneck']);

  const res = await request(app)
    .get(`/api/ai/repos/${repoId}/insights`)
    .set('Authorization', `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.data.length).toBe(2);
});
```

---

## 📄 5. Export Tests (`export.test.js`)

### TC-EX-001: PDF export returns binary stream
```js
test('GET /api/export/repos/:repoId/pdf - returns PDF', async () => {
  const { token, repoId } = await setupRepoWithCommits(5);

  const res = await request(app)
    .get(`/api/export/repos/${repoId}/pdf`)
    .set('Authorization', `Bearer ${token}`)
    .buffer(true)
    .parse((res, callback) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });

  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toContain('application/pdf');
  expect(res.body.slice(0, 4).toString()).toBe('%PDF'); // PDF magic bytes
});
```

### TC-EX-002: PDF export without auth → 401
```js
test('GET /api/export/repos/:repoId/pdf - no auth', async () => {
  const res = await request(app).get('/api/export/repos/fakeid/pdf');
  expect(res.status).toBe(401);
});
```

---

## ⚛️ 6. Frontend Component Tests (Vitest + React Testing Library)

### TC-FE-001: LoginForm renders and validates
```jsx
// __tests__/LoginForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '../components/auth/LoginForm';

test('LoginForm shows validation error for empty email', async () => {
  render(<LoginForm />);
  fireEvent.click(screen.getByText(/login/i));
  await waitFor(() => {
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });
});

test('LoginForm shows error for invalid email format', async () => {
  render(<LoginForm />);
  fireEvent.change(screen.getByPlaceholderText(/email/i), {
    target: { value: 'notanemail' }
  });
  fireEvent.click(screen.getByText(/login/i));
  await waitFor(() => {
    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });
});
```

### TC-FE-002: CommitBarChart renders with data
```jsx
import { render, screen } from '@testing-library/react';
import CommitBarChart from '../components/charts/CommitBarChart';

const mockData = [
  { date: '2024-01-01', count: 5 },
  { date: '2024-01-02', count: 3 },
];

test('CommitBarChart renders without crashing', () => {
  render(<CommitBarChart data={mockData} />);
  expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
});

test('CommitBarChart shows empty state with no data', () => {
  render(<CommitBarChart data={[]} />);
  expect(screen.getByText(/no commit data/i)).toBeInTheDocument();
});
```

### TC-FE-003: InsightCard renders AI content
```jsx
import { render, screen } from '@testing-library/react';
import InsightCard from '../components/insights/InsightCard';

const mockInsight = {
  type: 'sprint_summary',
  content: 'Good sprint progress this week.',
  generatedAt: new Date().toISOString()
};

test('InsightCard renders insight content', () => {
  render(<InsightCard insight={mockInsight} />);
  expect(screen.getByText(/good sprint progress/i)).toBeInTheDocument();
});

test('InsightCard shows type badge', () => {
  render(<InsightCard insight={mockInsight} />);
  expect(screen.getByText(/sprint summary/i)).toBeInTheDocument();
});
```

### TC-FE-004: PrivateRoute redirects unauthenticated users
```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivateRoute from '../components/layout/PrivateRoute';

test('PrivateRoute redirects to /login when not authenticated', () => {
  // Mock Zustand store: isAuthenticated = false
  jest.mock('../store/authStore', () => ({ useAuthStore: () => ({ isAuthenticated: false }) }));

  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <PrivateRoute>
        <div>Dashboard</div>
      </PrivateRoute>
    </MemoryRouter>
  );

  expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
});
```

### TC-FE-005: StatsCard displays metric correctly
```jsx
test('StatsCard renders value and label', () => {
  render(<StatsCard label="Total Commits" value={142} trend="+12%" />);
  expect(screen.getByText('142')).toBeInTheDocument();
  expect(screen.getByText('Total Commits')).toBeInTheDocument();
  expect(screen.getByText('+12%')).toBeInTheDocument();
});
```

---

## 🔧 7. Utility Unit Tests

### TC-UT-001: promptBuilder generates valid Gemini prompt
```js
const { buildSprintSummaryPrompt } = require('../../utils/promptBuilder');

test('Sprint prompt includes repo name and date range', () => {
  const prompt = buildSprintSummaryPrompt({
    repoName: 'devtrackr',
    fromDate: '2024-01-01',
    toDate: '2024-01-31',
    totalCommits: 42,
    commitMessages: ['feat: login', 'fix: bug']
  });

  expect(prompt).toContain('devtrackr');
  expect(prompt).toContain('2024-01-01');
  expect(prompt).toContain('42');
  expect(prompt).toContain('JSON');
});
```

### TC-UT-002: githubDataMapper maps commit correctly
```js
const { mapCommit } = require('../../utils/githubDataMapper');

test('mapCommit transforms GitHub API response to schema', () => {
  const raw = {
    sha: 'abc123',
    commit: {
      message: 'feat: add feature',
      author: { name: 'Pravin', email: 'p@test.com', date: '2024-01-15T10:00:00Z' }
    },
    author: { login: 'pravin', avatar_url: 'https://github.com/avatar' },
    stats: { additions: 20, deletions: 5 },
    files: [{ filename: 'index.js' }]
  };

  const mapped = mapCommit(raw, 'repoId123');
  expect(mapped.sha).toBe('abc123');
  expect(mapped.message).toBe('feat: add feature');
  expect(mapped.additions).toBe(20);
  expect(mapped.author.login).toBe('pravin');
  expect(mapped.filesChanged).toBe(1);
});
```

### TC-UT-003: dateHelpers format correctly
```js
const { formatRelative, formatDateRange } = require('../../utils/dateHelpers');

test('formatRelative returns "2 hours ago"', () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  expect(formatRelative(twoHoursAgo)).toMatch(/2 hours ago/i);
});
```

---

## 🚀 Running Tests

```bash
# Backend — all tests
cd backend && npm test

# Backend — single file
cd backend && npx jest __tests__/auth.test.js --verbose

# Backend — watch mode
cd backend && npx jest --watch

# Frontend — all tests
cd frontend && npx vitest run

# Coverage report
cd backend && npx jest --coverage
```

---

## 📊 Coverage Targets

| Module             | Target |
|--------------------|--------|
| auth.controller    | 90%    |
| auth.service       | 90%    |
| github.service     | 80%    |
| analytics.service  | 80%    |
| gemini.service     | 70%    |
| export.service     | 70%    |
| Frontend components| 60%    |
