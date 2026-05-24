process.env.FRONTEND_URL = 'https://dev-trackr-frontend.vercel.app/';

const { default: app } = await import('../src/app.js');
const request = (await import('supertest')).default;

describe('CORS configuration', () => {
  test('allows configured frontend origins even when FRONTEND_URL has a trailing slash', async () => {
    const res = await request(app)
      .options('/api/auth/register')
      .set('Origin', 'https://dev-trackr-frontend.vercel.app')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://dev-trackr-frontend.vercel.app'
    );
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
