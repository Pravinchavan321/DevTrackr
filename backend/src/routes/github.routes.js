import { Router } from 'express';
import * as githubController from '../controllers/github.controller.js';
import authenticateToken from '../middleware/auth.middleware.js';
import { requireGithubConnected } from '../middleware/github.middleware.js';

const router = Router();

// GET /api/github/connect
// Protected: Initiates the connection flow and redirects to GitHub
router.get('/connect', authenticateToken, githubController.connect);

// GET /api/github/callback
// Public: Handles callback from GitHub OAuth exchange
router.get('/callback', githubController.callback);

// GET /api/github/status
// Protected: Returns connection status
router.get('/status', authenticateToken, githubController.status);

// GET /api/github/repos
// Protected: Lists connected user's repositories
router.get('/repos', authenticateToken, requireGithubConnected, githubController.repos);

// DELETE /api/github/disconnect
// Protected: Resets GitHub connection fields
router.delete('/disconnect', authenticateToken, githubController.disconnect);

export default router;
