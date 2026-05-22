import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import authenticateToken from '../middleware/auth.middleware.js';

const router = Router();

// Route order: chart route must be registered before the paginated commits route
router.get('/repos/:repoId/commits/chart', authenticateToken, analyticsController.getCommitChart);
router.get('/repos/:repoId/commits', authenticateToken, analyticsController.getCommits);
router.get('/repos/:repoId/contributors', authenticateToken, analyticsController.getContributors);
router.get('/repos/:repoId/pullrequests', authenticateToken, analyticsController.getPullRequests);
router.get('/repos/:repoId/issues', authenticateToken, analyticsController.getIssues);
router.get('/repos/:repoId/velocity', authenticateToken, analyticsController.getVelocity);

export default router;
