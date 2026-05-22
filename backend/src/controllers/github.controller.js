import * as githubService from '../services/github.service.js';
import * as syncService from '../services/sync.service.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

/**
 * Initiates the GitHub connection flow by generating redirect URL and setting state cookie
 */
export const connect = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { url, state } = githubService.generateGitHubAuthUrl(userId);

  // Store the state token in an httpOnly secure cookie
  res.cookie('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  // Redirect to GitHub OAuth Page
  res.redirect(url);
});

/**
 * GitHub OAuth Callback endpoint
 */
export const callback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  const cookieState = req.cookies.github_oauth_state;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    logger.warn('GitHub callback called without authorization code');
    return res.redirect(`${frontendUrl}/settings?github=error`);
  }

  if (!state || !cookieState || state !== cookieState) {
    logger.warn('GitHub callback CSRF state validation failed', {
      statePresent: !!state,
      cookiePresent: !!cookieState,
      match: state === cookieState
    });
    return res.redirect(`${frontendUrl}/settings?github=error`);
  }

  try {
    await githubService.handleGitHubCallback(code, state, cookieState);

    // Clear state cookie
    res.clearCookie('github_oauth_state');

    // Redirect to frontend settings with success
    res.redirect(`${frontendUrl}/settings?github=connected`);
  } catch (error) {
    logger.error('GitHub authentication callback error', { error: error.message });
    res.clearCookie('github_oauth_state');
    res.redirect(`${frontendUrl}/settings?github=error`);
  }
});

/**
 * Checks connection status of GitHub for logged-in user
 */
export const status = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const statusInfo = await githubService.getGitHubStatus(userId);
  sendSuccess(res, statusInfo, 'GitHub connection status retrieved');
});

/**
 * Lists user's repositories
 */
export const repos = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const repositories = await githubService.getUserRepos(userId);
  sendSuccess(res, repositories, 'Repositories retrieved successfully');
});

/**
 * Disconnects user's GitHub connection
 */
export const disconnect = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  await githubService.disconnectGitHub(userId);
  sendSuccess(res, {}, 'GitHub account disconnected successfully');
});

/**
 * Syncs repository commits, PRs, and issues
 */
export const syncRepository = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const repoFullName = decodeURIComponent(req.params.repoFullName);

  const result = await syncService.syncRepository(userId, repoFullName);
  sendSuccess(res, result, 'Repository synced successfully');
});

