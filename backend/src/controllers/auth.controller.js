import authService from '../services/auth.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';
import logger from '../config/logger.js';
import { getHttpOnlyCookieOptions } from '../utils/cookieOptions.js';

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const result = await authService.register(name, email, password);

  // Set httpOnly refresh token cookie
  res.cookie(
    'refreshToken',
    result.refreshToken,
    getHttpOnlyCookieOptions({ maxAge: REFRESH_TOKEN_MAX_AGE_MS })
  );

  sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.accessToken
    },
    'Registration successful',
    201
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  // Set httpOnly refresh token cookie
  res.cookie(
    'refreshToken',
    result.refreshToken,
    getHttpOnlyCookieOptions({ maxAge: REFRESH_TOKEN_MAX_AGE_MS })
  );

  sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.accessToken
    },
    'Login successful',
    200
  );
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return sendError(res, 'Refresh token not found', [], 401);
  }

  const result = await authService.refresh(refreshToken);

  sendSuccess(res, result, 'Token refreshed', 200);
});

export const logout = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await authService.logout(userId);

  // Clear refresh token cookie
  res.clearCookie('refreshToken', getHttpOnlyCookieOptions());

  sendSuccess(res, {}, 'Logout successful', 200);
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await authService.getCurrentUser(userId);

  sendSuccess(res, user, '', 200);
});
