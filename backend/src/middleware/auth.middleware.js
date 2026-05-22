import { verifyAccessToken } from '../utils/tokenHelper.js';
import { sendError } from '../utils/responseHelper.js';
import logger from '../config/logger.js';
import User from '../models/User.model.js';

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authorization token required', [], 401);
    }

    const token = authHeader.substring(7);

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select('-password -refreshToken -githubAccessToken');

    if (!user) {
      return sendError(res, 'User not found', [], 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      logger.debug('Invalid or expired token', { error: error.message });
      return sendError(res, 'Invalid or expired token', [], 401);
    }

    logger.error('Authentication error', { error: error.message });
    sendError(res, 'Authentication failed', [], 500);
  }
};

export default authenticateToken;
