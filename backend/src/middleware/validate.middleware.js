import { validationResult } from 'express-validator';
import { sendError } from '../utils/responseHelper.js';

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return sendError(res, 'Validation failed', errorMessages, 422);
  }

  next();
};

export default validateRequest;
