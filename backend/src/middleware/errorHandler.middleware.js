import logger from '../config/logger.js';
import { sendError } from '../utils/responseHelper.js';

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Error occurred', {
    statusCode,
    message,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return sendError(res, 'Validation failed', errors, 422);
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return sendError(res, 'Invalid ID format', [], 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, `${field} already exists`, [], 409);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', [], 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', [], 401);
  }

  sendError(res, message, [], statusCode);
};

export default errorHandler;
