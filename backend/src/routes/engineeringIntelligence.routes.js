import { Router } from 'express';
import * as engineeringIntelligenceController from '../controllers/engineeringIntelligence.controller.js';
import authenticateToken from '../middleware/auth.middleware.js';

const router = Router();

router.get('/repos/:repoId/release-readiness', authenticateToken, engineeringIntelligenceController.getReleaseReadiness);
router.get('/repos/:repoId/workload-health', authenticateToken, engineeringIntelligenceController.getWorkloadHealth);
router.get('/repos/:repoId/sprint-retrospective', authenticateToken, engineeringIntelligenceController.getSprintRetrospective);

export default router;
