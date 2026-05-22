import { Router } from 'express';
import * as exportController from '../controllers/export.controller.js';
import authenticateToken from '../middleware/auth.middleware.js';

const router = Router();

router.get('/repos/:repoId/pdf', authenticateToken, exportController.downloadRepositoryPdf);

export default router;
