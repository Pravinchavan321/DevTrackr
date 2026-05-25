import { Router } from 'express';
import * as githubController from '../controllers/github.controller.js';
import authenticateToken from '../middleware/auth.middleware.js';
import { requireGithubConnected } from '../middleware/github.middleware.js';

const router = Router();

// GET /api/github/connect
// Protected: Initiates the connection flow and redirects to GitHub
router.get('/connect', authenticateToken, githubController.connect);

// POST /api/github/webhook
// Public: GitHub signs this request using GITHUB_WEBHOOK_SECRET
router.post('/webhook', githubController.webhook);

// GET /api/github/callback
// Public: Handles callback from GitHub OAuth exchange
router.get('/callback', githubController.callback);

// GET /api/github/status
// Protected: Returns connection status
router.get('/status', authenticateToken, githubController.status);

// GET /api/github/repos
// Protected: Lists connected user's repositories
router.get('/repos', authenticateToken, requireGithubConnected, githubController.repos);

// GET /api/github/repos/:repoId/activity-status
// Protected: Lets the frontend cheaply detect webhook-driven data changes
router.get('/repos/:repoId/activity-status', authenticateToken, githubController.repositoryActivityStatus);

// POST /api/github/repos/:repoFullName/sync
// Protected: Syncs repository commits, PRs, and issues
router.post('/repos/:repoFullName/sync', authenticateToken, requireGithubConnected, githubController.syncRepository);

// DELETE /api/github/disconnect
// Protected: Resets GitHub connection fields
router.delete('/disconnect', authenticateToken, githubController.disconnect);

export default router;
