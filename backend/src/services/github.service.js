import jwt from 'jsonwebtoken';
import { Octokit } from '@octokit/rest';
import User from '../models/User.model.js';
import { encrypt, decrypt } from '../utils/encryptionHelper.js';
import logger from '../config/logger.js';
import Repository from '../models/Repository.model.js';

const isPlaceholderValue = (value) => {
  if (!value) {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();
  return (
    normalized.startsWith('<') ||
    normalized.includes('paste_') ||
    normalized.includes('your_') ||
    normalized.includes('change_me')
  );
};

const assertGitHubOAuthConfig = ({ includeSecret = false } = {}) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;

  if (isPlaceholderValue(clientId) || isPlaceholderValue(redirectUri) || (includeSecret && isPlaceholderValue(clientSecret))) {
    const error = new Error('GitHub OAuth is not configured. Add a real GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env, then restart Docker.');
    error.statusCode = 500;
    throw error;
  }

  return { clientId, clientSecret, redirectUri };
};

/**
 * Generates the GitHub OAuth authorization URL and a secure JWT state
 * @param {string} userId - The authenticated user's ID
 * @returns {object} { url, state }
 */
export const generateGitHubAuthUrl = async (userId) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is missing');
  }

  const { clientId, redirectUri } = assertGitHubOAuthConfig();

  // Create a secure state with user identification and a secure nonce
  const nonce = Math.random().toString(36).substring(2, 15);
  const state = jwt.sign({ userId, nonce }, jwtSecret, { expiresIn: '15m' });

  const scope = 'repo read:user user:email';
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}&state=${state}&prompt=select_account`;

  await User.findByIdAndUpdate(userId, {
    githubOAuthState: state,
    githubOAuthStateExpiresAt: expiresAt
  });

  return { url, state };
};

/**
 * Exchanges the authorization code for an access token
 * @param {string} code - The code from GitHub OAuth callback
 * @returns {Promise<string>} The access token
 */
export const exchangeCodeForToken = async (code) => {
  const { clientId, clientSecret, redirectUri } = assertGitHubOAuthConfig({ includeSecret: true });

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
};

/**
 * Fetches the authenticated GitHub user profile
 * @param {string} accessToken - GitHub access token
 * @returns {Promise<object>} The profile data
 */
export const fetchGitHubUser = async (accessToken) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data } = await octokit.rest.users.getAuthenticated();
  return data;
};

/**
 * Validates state, exchanges code, and connects GitHub user
 * @param {string} code - Auth code
 * @param {string} state - Returned state
 * @param {string} cookieState - Cookie state
 * @returns {Promise<object>} The updated user document
 */
export const handleGitHubCallback = async (code, state, cookieState) => {
  if (!code) {
    throw new Error('Authorization code is missing');
  }
  if (!state) {
    throw new Error('State parameter is missing');
  }
  if (cookieState && state !== cookieState) {
    throw new Error('CSRF State validation failed');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is missing');
  }

  let decoded;
  try {
    decoded = jwt.verify(state, jwtSecret);
  } catch (error) {
    throw new Error('Invalid or expired state parameter');
  }

  const { userId } = decoded;
  if (!userId) {
    throw new Error('Invalid state payload');
  }

  const user = await User.findById(userId).select(
    '+githubAccessToken +githubOAuthState +githubOAuthStateExpiresAt'
  );
  if (!user) {
    throw new Error('User not found');
  }
  if (!user.githubOAuthState || user.githubOAuthState !== state) {
    throw new Error('Invalid or expired OAuth state');
  }
  if (!user.githubOAuthStateExpiresAt || user.githubOAuthStateExpiresAt < new Date()) {
    throw new Error('Expired OAuth state');
  }

  // 1. Exchange code for access token
  const accessToken = await exchangeCodeForToken(code);

  // 2. Fetch authenticated GitHub profile
  const githubUser = await fetchGitHubUser(accessToken);

  // 3. Encrypt access token
  const encryptedToken = encrypt(accessToken);

  user.githubConnected = true;
  user.githubId = String(githubUser.id);
  user.githubUsername = githubUser.login;
  user.githubAccessToken = encryptedToken;
  user.githubOAuthState = undefined;
  user.githubOAuthStateExpiresAt = undefined;

  await user.save();

  logger.info('GitHub account connected successfully', { userId, githubUsername: githubUser.login });

  return user;
};

/**
 * Gets the GitHub connection status of the user
 * @param {string} userId
 * @returns {Promise<object>} status
 */
export const getGitHubStatus = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new Error('User not found');
  }

  return {
    connected: user.githubConnected || false,
    username: user.githubUsername || null
  };
};

/**
 * Fetches user repositories from GitHub API
 * @param {string} userId
 * @returns {Promise<Array>} List of repositories
 */
export const getUserRepos = async (userId) => {
  const user = await User.findById(userId).select('+githubAccessToken');
  if (!user || !user.githubConnected || !user.githubAccessToken) {
    throw new Error('GitHub is not connected for this user');
  }

  const decryptedToken = decrypt(user.githubAccessToken);
  const octokit = new Octokit({ auth: decryptedToken });

  // List authenticated user's repositories (public + private)
  const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100
  });

  // Fetch synced repositories to map their database _id
  const syncedRepos = await Repository.find({ userId }).lean();
  const syncedMap = new Map(syncedRepos.map((r) => [r.githubRepoId, r._id]));

  return repos.map((repo) => ({
    _id: syncedMap.get(repo.id) || null,
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description || null,
    private: repo.private || false,
    defaultBranch: repo.default_branch || 'main',
    language: repo.language || null,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    openIssuesCount: repo.open_issues_count || 0,
    htmlUrl: repo.html_url,
    updatedAt: repo.updated_at
  }));
};

/**
 * Disconnects GitHub connection and resets all fields
 * @param {string} userId
 * @returns {Promise<object>} Status response
 */
export const disconnectGitHub = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.githubConnected = false;
  user.githubAccessToken = undefined;
  user.githubId = undefined;
  user.githubUsername = undefined;

  await user.save();

  logger.info('GitHub account disconnected successfully', { userId });

  return { success: true };
};
