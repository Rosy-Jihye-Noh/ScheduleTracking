/**
 * Validation Middleware
 * Input validation for API requests
 */

import { Request, Response, NextFunction } from 'express';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate date format (ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate IMO number (7 digits)
 */
function isValidIMONumber(imo: string): boolean {
  return /^\d{7}$/.test(imo);
}

/**
 * Validate UN Location Code (5 characters: 2 letters + 3 alphanumeric)
 */
function isValidUNLocationCode(code: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{3}$/.test(code.toUpperCase());
}

/**
 * Validate date range
 */
function isValidDateRange(startDate?: string, endDate?: string): boolean {
  if (!startDate || !endDate) return true;
  return new Date(startDate) <= new Date(endDate);
}

/**
 * Validate limit parameter
 */
function isValidLimit(limit?: number): boolean {
  if (!limit) return true;
  return limit > 0 && limit <= 1000;
}

/**
 * Validate schedule query parameters
 */
export function validateScheduleQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: ValidationError[] = [];
  const query = req.query;

  // Validate vesselIMONumber
  if (query.vesselIMONumber) {
    const imo = query.vesselIMONumber as string;
    if (!isValidIMONumber(imo)) {
      errors.push({
        field: 'vesselIMONumber',
        message: 'IMO number must be 7 digits',
      });
    }
  }

  // Validate UNLocationCode
  if (query.UNLocationCode) {
    const code = query.UNLocationCode as string;
    if (!isValidUNLocationCode(code)) {
      errors.push({
        field: 'UNLocationCode',
        message: 'UN Location Code must be 5 characters (2 letters + 3 alphanumeric)',
      });
    }
  }

  // Validate startDate
  if (query.startDate) {
    const date = query.startDate as string;
    if (!isValidDate(date)) {
      errors.push({
        field: 'startDate',
        message: 'startDate must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)',
      });
    }
  }

  // Validate endDate
  if (query.endDate) {
    const date = query.endDate as string;
    if (!isValidDate(date)) {
      errors.push({
        field: 'endDate',
        message: 'endDate must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)',
      });
    }
  }

  // Validate date range
  if (query.startDate && query.endDate) {
    if (!isValidDateRange(query.startDate as string, query.endDate as string)) {
      errors.push({
        field: 'dateRange',
        message: 'startDate must be before or equal to endDate',
      });
    }
  }

  // Validate limit
  if (query.limit) {
    const limit = parseInt(query.limit as string, 10);
    if (isNaN(limit) || !isValidLimit(limit)) {
      errors.push({
        field: 'limit',
        message: 'limit must be a number between 1 and 1000',
      });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Invalid query parameters',
      errors: errors,
    });
    return;
  }

  next();
}

/**
 * Validate tracking query parameters
 */
export function validateTrackingQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: ValidationError[] = [];
  const query = req.query;

  // At least one reference must be provided
  const hasReference =
    query.carrierBookingReference ||
    query.transportDocumentReference ||
    query.equipmentReference ||
    query.transportCallID;

  if (!hasReference) {
    errors.push({
      field: 'reference',
      message:
        'At least one of the following must be provided: carrierBookingReference, transportDocumentReference, equipmentReference, or transportCallID',
    });
  }

  // Validate vesselIMONumber
  if (query.vesselIMONumber) {
    const imo = query.vesselIMONumber as string;
    if (!isValidIMONumber(imo)) {
      errors.push({
        field: 'vesselIMONumber',
        message: 'IMO number must be 7 digits',
      });
    }
  }

  // Validate UNLocationCode
  if (query.UNLocationCode) {
    const code = query.UNLocationCode as string;
    if (!isValidUNLocationCode(code)) {
      errors.push({
        field: 'UNLocationCode',
        message: 'UN Location Code must be 5 characters (2 letters + 3 alphanumeric)',
      });
    }
  }

  // Validate eventCreatedDateTime
  if (query.eventCreatedDateTime) {
    const date = query.eventCreatedDateTime as string;
    if (!isValidDate(date)) {
      errors.push({
        field: 'eventCreatedDateTime',
        message: 'eventCreatedDateTime must be in ISO 8601 format',
      });
    }
  }

  // Validate eventDateTime
  if (query.eventDateTime) {
    const date = query.eventDateTime as string;
    if (!isValidDate(date)) {
      errors.push({
        field: 'eventDateTime',
        message: 'eventDateTime must be in ISO 8601 format',
      });
    }
  }

  // Validate limit
  if (query.limit) {
    const limit = parseInt(query.limit as string, 10);
    if (isNaN(limit) || !isValidLimit(limit)) {
      errors.push({
        field: 'limit',
        message: 'limit must be a number between 1 and 1000',
      });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Invalid query parameters',
      errors: errors,
    });
    return;
  }

  next();
}

