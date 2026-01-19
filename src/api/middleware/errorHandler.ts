/**
 * Error Handler Middleware
 * Centralized error handling for API
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@infrastructure/logger/Logger';

export interface ApiError extends Error {
  statusCode?: number;
  status?: string;
}

/**
 * Error handler middleware
 */
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  // Log error
  Logger.error('API Error', {
    statusCode,
    status,
    message: err.message,
    path: req.path,
    method: req.method,
    query: req.query,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      status: status,
      statusCode: statusCode,
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      status: 'not found',
      statusCode: 404,
      message: `Route ${req.originalUrl} not found`,
    },
  });
}

