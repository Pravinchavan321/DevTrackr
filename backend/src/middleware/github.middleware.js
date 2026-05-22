import { sendError } from '../utils/responseHelper.js';
import User from '../models/User.model.js';

export const requireGithubConnected = async (req, res, next) => {
  try {
    // req.user is set by authenticateToken middleware
    if (!req.user || !req.user.githubConnected) {
      return sendError(res, 'Please connect GitHub first', [], 403);
    }

    // Fetch user with githubAccessToken selected
    const user = await User.findById(req.user._id).select('+githubAccessToken');
    if (!user || !user.githubConnected) {
      return sendError(res, 'Please connect GitHub first', [], 403);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
