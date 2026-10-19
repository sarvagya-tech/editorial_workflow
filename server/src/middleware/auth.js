import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from './errorHandler.js';

/**
 * Middleware: Verifies Bearer JWT token and attaches user payload to req.user.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required. Please provide a valid Bearer token.', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload; // { id, email, name, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session token has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid authentication token.', 401));
  }
}

/**
 * Middleware: Enforces that req.user has one of the allowed roles.
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Permission denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}.`,
          403
        )
      );
    }

    next();
  };
}

export const requireEditor = requireRole(['EDITOR']);
export const requireWriter = requireRole(['WRITER']);
export const requireAnyRole = requireRole(['EDITOR', 'WRITER']);
