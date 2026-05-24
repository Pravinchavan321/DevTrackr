const isProduction = () => process.env.NODE_ENV === 'production';

export const getHttpOnlyCookieOptions = (overrides = {}) => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  ...overrides
});
