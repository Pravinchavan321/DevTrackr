import * as insightService from '../services/insight.service.js';
import { sendSuccess } from '../utils/responseHelper.js';
import asyncHandler from '../utils/asyncHandler.js';

export const generateSprintSummary = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;
  const force = req.query.force;
  const { from, to } = req.body;

  const data = await insightService.generateSprintSummary(repoId, userId, { from, to, force });

  sendSuccess(res, data, 'Sprint summary generated successfully');
});

export const generateBottlenecks = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;
  const force = req.query.force;

  const data = await insightService.generateBottleneckAnalysis(repoId, userId, { force });

  sendSuccess(res, data, 'Bottleneck analysis generated successfully');
});

export const generateContributorAnalysis = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;
  const force = req.query.force;

  const data = await insightService.generateContributorAnalysis(repoId, userId, { force });

  sendSuccess(res, data, 'Contributor analysis generated successfully');
});

export const generateRecommendations = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;
  const force = req.query.force;

  const data = await insightService.generateRecommendations(repoId, userId, { force });

  sendSuccess(res, data, 'Prioritization recommendations generated successfully');
});

export const getInsights = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;

  const data = await insightService.getInsights(repoId, userId);

  sendSuccess(res, data, 'AI insights fetched successfully');
});
