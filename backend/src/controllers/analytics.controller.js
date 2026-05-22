import * as analyticsService from '../services/analytics.service.js';
import { sendSuccess } from '../utils/responseHelper.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getCommits = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;
  const query = req.query;

  const data = await analyticsService.getCommits(repoId, userId, query);

  sendSuccess(res, data, 'Commits fetched successfully');
});

export const getCommitChart = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;
  const query = req.query;

  const data = await analyticsService.getCommitChart(repoId, userId, query);

  sendSuccess(res, data, 'Commit chart data fetched successfully');
});

export const getContributors = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;

  const data = await analyticsService.getContributors(repoId, userId);

  sendSuccess(res, data, 'Contributor statistics fetched successfully');
});

export const getPullRequests = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;
  const query = req.query;

  const data = await analyticsService.getPullRequests(repoId, userId, query);

  sendSuccess(res, data, 'Pull requests fetched successfully');
});

export const getIssues = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;
  const query = req.query;

  const data = await analyticsService.getIssues(repoId, userId, query);

  sendSuccess(res, data, 'Issues fetched successfully');
});

export const getVelocity = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;

  const data = await analyticsService.getVelocity(repoId, userId);

  sendSuccess(res, data, 'Velocity metrics fetched successfully');
});
