const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';

const { default: app } = await import('../src/app.js');
const request = (await import('supertest')).default;

describe('Production proxy configuration', () => {
  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('trusts Render proxy headers so auth rate limiting can identify clients', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({});

    expect(app.get('trust proxy')).toBe(1);
    expect(res.status).toBe(422);
  });
});
