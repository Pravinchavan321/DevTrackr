import * as engineeringIntelligenceService from '../services/engineeringIntelligence.service.js';
import { sendSuccess } from '../utils/responseHelper.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getReleaseReadiness = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;
  const force = req.query.force === 'true';

  const data = await engineeringIntelligenceService.getReleaseReadiness(repoId, userId, { force });

  sendSuccess(res, data, 'Release readiness prediction fetched successfully');
});

export const getWorkloadHealth = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;
  const force = req.query.force === 'true';

  const data = await engineeringIntelligenceService.getWorkloadHealth(repoId, userId, { force });

  sendSuccess(res, data, 'Developer workload intelligence fetched successfully');
});

export const getSprintRetrospective = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;
  const { range, force } = req.query;

  const data = await engineeringIntelligenceService.getSprintRetrospective(repoId, userId, {
    range,
    force: force === 'true'
  });

  sendSuccess(res, data, 'Sprint retrospective generated successfully');
});
