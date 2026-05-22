import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';

export const signAccessToken = (userId) => {
  try {
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
    );
    return token;
  } catch (error) {
    logger.error('Error signing access token', { error: error.message });
    throw error;
  }
};

export const signRefreshToken = (userId) => {
  try {
    const token = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
    return token;
  } catch (error) {
    logger.error('Error signing refresh token', { error: error.message });
    throw error;
  }
};

export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    logger.debug('Error verifying access token', { error: error.message });
    throw error;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    return decoded;
  } catch (error) {
    logger.debug('Error verifying refresh token', { error: error.message });
    throw error;
  }
};
