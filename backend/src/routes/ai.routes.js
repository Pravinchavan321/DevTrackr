import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import authenticateToken from '../middleware/auth.middleware.js';

const router = Router();

router.post('/repos/:repoId/summarize', authenticateToken, aiController.generateSprintSummary);
router.post('/repos/:repoId/bottlenecks', authenticateToken, aiController.generateBottlenecks);
router.post('/repos/:repoId/contributors', authenticateToken, aiController.generateContributorAnalysis);
router.post('/repos/:repoId/recommendations', authenticateToken, aiController.generateRecommendations);
router.get('/repos/:repoId/insights', authenticateToken, aiController.getInsights);

export default router;
