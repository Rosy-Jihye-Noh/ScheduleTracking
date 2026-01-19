/**
 * Tracking Controller
 * Handles tracking API requests
 */

import { Request, Response } from 'express';
import { TrackingQueryParams, TrackingEvent } from '@domain/models/tracking';
import { CarrierAdapterFactory } from '@adapters/factory/CarrierAdapterFactory';
import { getCarrierCodes } from '@api/middleware/carrierFilter';
import { Logger } from '@infrastructure/logger/Logger';

/**
 * Tracking Controller
 */
export class TrackingController {
  private factory: CarrierAdapterFactory;

  constructor() {
    this.factory = CarrierAdapterFactory.getInstance();
  }

  /**
   * Get tracking events
   * GET /api/v1/tracking
   */
  async getTracking(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    try {
      const carrier = (req.query.carrier as string) || 'all';
      const carrierCodes = getCarrierCodes(carrier);

      Logger.logRequest(req.method, req.path, req.query, carrier);

      if (carrierCodes.length === 0) {
        res.status(400).json({
          error: 'No carriers available',
          message: 'No carriers are configured or available',
        });
        return;
      }

      // Build query parameters
      const queryParams: TrackingQueryParams = {
        eventType: req.query.eventType
          ? (req.query.eventType as string).split(',').map((e) => e.trim().toUpperCase() as any)
          : undefined,
        shipmentEventTypeCode: req.query.shipmentEventTypeCode
          ? (req.query.shipmentEventTypeCode as string).split(',').map((e) => e.trim().toUpperCase() as any)
          : undefined,
        transportEventTypeCode: req.query.transportEventTypeCode
          ? (req.query.transportEventTypeCode as string).split(',').map((e) => e.trim().toUpperCase() as any)
          : undefined,
        equipmentEventTypeCode: req.query.equipmentEventTypeCode
          ? (req.query.equipmentEventTypeCode as string).split(',').map((e) => e.trim().toUpperCase() as any)
          : undefined,
        documentTypeCode: req.query.documentTypeCode
          ? (req.query.documentTypeCode as string).split(',').map((e) => e.trim().toUpperCase() as any)
          : undefined,
        carrierBookingReference: req.query.carrierBookingReference as string | undefined,
        transportDocumentReference: req.query.transportDocumentReference as string | undefined,
        equipmentReference: req.query.equipmentReference as string | undefined,
        transportCallID: req.query.transportCallID as string | undefined,
        vesselIMONumber: req.query.vesselIMONumber as string | undefined,
        exportVoyageNumber: req.query.exportVoyageNumber as string | undefined,
        carrierServiceCode: req.query.carrierServiceCode as string | undefined,
        UNLocationCode: req.query.UNLocationCode as string | undefined,
        eventCreatedDateTime: req.query.eventCreatedDateTime as string | undefined,
        eventDateTime: req.query.eventDateTime as string | undefined,
        behalfOf: req.query.behalfOf as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        cursor: req.query.cursor as string | undefined,
      };

      // Query all carriers in parallel
      const results = await Promise.allSettled(
        carrierCodes.map(async (carrierCode) => {
          const carrierStartTime = Date.now();
          try {
            const adapter = this.factory.getAdapter(carrierCode);
            Logger.debug(`Querying ${carrierCode} tracking API`, {
              carrier: carrierCode,
              params: queryParams,
            });
            const events = await adapter.getTracking(queryParams);
            const duration = Date.now() - carrierStartTime;
            Logger.logCarrierCall(
              carrierCode,
              'tracking',
              'GET',
              true,
              duration
            );
            return {
              carrier: carrierCode,
              carrierName: adapter.getCarrierName(),
              success: true,
              events: events,
            };
          } catch (error: any) {
            const duration = Date.now() - carrierStartTime;
            Logger.logCarrierCall(
              carrierCode,
              'tracking',
              'GET',
              false,
              duration,
              error.message
            );
            Logger.error(`Failed to get tracking from ${carrierCode}`, {
              carrier: carrierCode,
              error: error.message,
              stack: error.stack,
            });
            return {
              carrier: carrierCode,
              success: false,
              error: error.message || 'Unknown error',
            };
          }
        })
      );

      // Process results
      const successfulResults: TrackingEvent[] = [];
      const errors: Array<{ carrier: string; error: string }> = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.success && data.events) {
            // Ensure events is an array
            const eventsArray = Array.isArray(data.events) ? data.events : [];
            // Add carrier information to each event
            const eventsWithCarrier = eventsArray.map((event) => ({
              ...event,
              carrier: data.carrier,
              carrierName: data.carrierName,
            }));
            successfulResults.push(...eventsWithCarrier);
          } else {
            errors.push({
              carrier: data.carrier,
              error: data.error || 'No events returned',
            });
          }
        } else {
          // Promise rejected
          errors.push({
            carrier: 'unknown',
            error: result.reason?.message || 'Unknown error',
          });
        }
      }

      // Return response
      const duration = Date.now() - startTime;
      if (successfulResults.length === 0 && errors.length > 0) {
        Logger.logResponse(req.method, req.path, 503, duration, carrier);
        res.status(503).json({
          error: 'All carriers failed',
          message: 'All carrier queries failed',
          errors: errors,
        });
        return;
      }

      Logger.logResponse(req.method, req.path, 200, duration, carrier);
      res.status(200).json({
        success: true,
        data: successfulResults,
        meta: {
          total: successfulResults.length,
          carriersQueried: carrierCodes.length,
          carriersSucceeded: carrierCodes.length - errors.length,
          carriersFailed: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      Logger.error('Tracking API error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        query: req.query,
      });
      Logger.logResponse(req.method, req.path, 500, duration);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      });
    }
  }
}

