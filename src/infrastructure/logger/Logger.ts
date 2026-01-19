/**
 * Logger
 * Structured logging using Winston
 */

import winston from 'winston';

/**
 * Logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'schedule-tracking' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
          }
          return msg;
        })
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json(),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json(),
    }),
  ],
});

// Create logs directory if it doesn't exist
import * as fs from 'fs';
import * as path from 'path';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Logger utility class
 */
export class Logger {
  /**
   * Log info message
   */
  static info(message: string, meta?: Record<string, any>): void {
    logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  static warn(message: string, meta?: Record<string, any>): void {
    logger.warn(message, meta);
  }

  /**
   * Log error message
   */
  static error(message: string, error?: Error | Record<string, any>): void {
    if (error instanceof Error) {
      logger.error(message, { error: error.message, stack: error.stack });
    } else {
      logger.error(message, error);
    }
  }

  /**
   * Log debug message
   */
  static debug(message: string, meta?: Record<string, any>): void {
    logger.debug(message, meta);
  }

  /**
   * Log API request
   */
  static logRequest(
    method: string,
    path: string,
    query?: Record<string, any>,
    carrier?: string
  ): void {
    logger.info('API Request', {
      method,
      path,
      query,
      carrier,
    });
  }

  /**
   * Log API response
   */
  static logResponse(
    method: string,
    path: string,
    statusCode: number,
    duration?: number,
    carrier?: string
  ): void {
    logger.info('API Response', {
      method,
      path,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
      carrier,
    });
  }

  /**
   * Log carrier API call
   */
  static logCarrierCall(
    carrier: string,
    endpoint: string,
    method: string,
    success: boolean,
    duration?: number,
    error?: string
  ): void {
    const level = success ? 'info' : 'error';
    logger[level]('Carrier API Call', {
      carrier,
      endpoint,
      method,
      success,
      duration: duration ? `${duration}ms` : undefined,
      error,
    });
  }
}

export default logger;

