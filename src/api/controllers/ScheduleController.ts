/**
 * Schedule Controller
 * Handles schedule API requests
 */

import { Request, Response } from 'express';
import { ScheduleQueryParams } from '@domain/models/schedule';
import { CarrierAdapterFactory } from '@adapters/factory/CarrierAdapterFactory';
import { getCarrierCodes } from '@api/middleware/carrierFilter';
import { Logger } from '@infrastructure/logger/Logger';

/**
 * Schedule Controller
 */
export class ScheduleController {
  private factory: CarrierAdapterFactory;

  constructor() {
    this.factory = CarrierAdapterFactory.getInstance();
  }

  /**
   * Get vessel schedules
   * GET /api/v1/schedules
   */
  async getSchedules(req: Request, res: Response): Promise<void> {
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
      const queryParams: ScheduleQueryParams & {
        // HMM PTP Schedule parameters
        fromLocationCode?: string;
        toLocationCode?: string;
        periodDate?: string;
        weekTerm?: string;
        receiveTermCode?: string;
        deliveryTermCode?: string;
        webSort?: string;
        webPriority?: string;
        // CMA CGM Route API parameters
        placeOfLoading?: string;
        placeOfDischarge?: string;
        unLocodePlaceOfLoading?: string;
        unLocodePlaceOfDischarge?: string;
        shippingCompany?: string;
        departureDate?: string;
        arrivalDate?: string;
        searchRange?: string;
        polVesselIMO?: string;
        polServiceCode?: string;
        maxTs?: string;
        numberOfTEU?: string;
        specificRoutings?: string | string[];
        useRoutingStatistics?: string | boolean;
        // CMA CGM Voyage API parameters
        voyageCode?: string;
        vesselIMO?: string;
        from?: string;
        to?: string;
        portCode?: string | string[];
        countryCode?: string | string[];
        shipcomp?: string | string[];
        searchType?: string;
        callId?: string | string[];
        dateType?: string;
        terminalCode?: string;
        sort?: string;
        // CMA CGM Proforma API parameters
        serviceCode?: string;
        lineCode?: string;
        zoneFromCode?: string;
        zoneToCode?: string;
        codeContains?: string;
        nameContains?: string;
        port?: string;
        terminal?: string;
        serviceType?: string;
        // Maersk Point-to-Point API parameters
        placeOfReceipt?: string;
        placeOfDelivery?: string;
        departureStartDate?: string;
        departureEndDate?: string;
        arrivalStartDate?: string;
        arrivalEndDate?: string;
        maxTranshipment?: number;
        receiptTypeAtOrigin?: string;
        deliveryTypeAtDestination?: string;
        cargoType?: string;
        ISOEquipmentCode?: string;
        stuffingWeight?: number;
        stuffingVolume?: number;
        // Maersk Port Schedule API parameters
        date?: string;
      } = {
        vesselIMONumber: req.query.vesselIMONumber as string | undefined,
        vesselName: req.query.vesselName as string | undefined,
        carrierServiceCode: req.query.carrierServiceCode as string | undefined,
        universalServiceReference: req.query.universalServiceReference as string | undefined,
        carrierVoyageNumber: req.query.carrierVoyageNumber as string | undefined,
        universalVoyageReference: req.query.universalVoyageReference as string | undefined,
        UNLocationCode: req.query.UNLocationCode as string | undefined,
        facilitySMDGCode: req.query.facilitySMDGCode as string | undefined,
        vesselOperatorCarrierCode: req.query.vesselOperatorCarrierCode as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        cursor: req.query.cursor as string | undefined,
        // HMM PTP Schedule specific parameters
        fromLocationCode: req.query.fromLocationCode as string | undefined,
        toLocationCode: req.query.toLocationCode as string | undefined,
        periodDate: req.query.periodDate as string | undefined,
        weekTerm: req.query.weekTerm as string | undefined,
        receiveTermCode: req.query.receiveTermCode as string | undefined,
        deliveryTermCode: req.query.deliveryTermCode as string | undefined,
        webSort: req.query.webSort as string | undefined,
        webPriority: req.query.webPriority as string | undefined,
        // CMA CGM Route API parameters
        placeOfLoading: req.query.placeOfLoading as string | undefined,
        placeOfDischarge: req.query.placeOfDischarge as string | undefined,
        unLocodePlaceOfLoading: req.query.unLocodePlaceOfLoading as string | undefined,
        unLocodePlaceOfDischarge: req.query.unLocodePlaceOfDischarge as string | undefined,
        shippingCompany: req.query.shippingCompany as string | undefined,
        departureDate: req.query.departureDate as string | undefined,
        arrivalDate: req.query.arrivalDate as string | undefined,
        searchRange: req.query.searchRange as string | undefined,
        polVesselIMO: req.query.polVesselIMO as string | undefined,
        polServiceCode: req.query.polServiceCode as string | undefined,
        maxTs: req.query.maxTs as string | undefined,
        numberOfTEU: req.query.numberOfTEU as string | undefined,
        specificRoutings: req.query.specificRoutings as string | string[] | undefined,
        useRoutingStatistics: req.query.useRoutingStatistics as string | boolean | undefined,
        // CMA CGM Voyage API parameters
        voyageCode: req.query.voyageCode as string | undefined,
        vesselIMO: req.query.vesselIMO as string | undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        portCode: req.query.portCode as string | string[] | undefined,
        countryCode: req.query.countryCode as string | string[] | undefined,
        shipcomp: req.query.shipcomp as string | string[] | undefined,
        searchType: req.query.searchType as string | undefined,
        callId: req.query.callId as string | string[] | undefined,
        dateType: req.query.dateType as string | undefined,
        terminalCode: req.query.terminalCode as string | undefined,
        sort: req.query.sort as string | undefined,
        // CMA CGM Proforma API parameters
        serviceCode: req.query.serviceCode as string | undefined,
        lineCode: req.query.lineCode as string | undefined,
        zoneFromCode: req.query.zoneFromCode as string | undefined,
        zoneToCode: req.query.zoneToCode as string | undefined,
        codeContains: req.query.codeContains as string | undefined,
        nameContains: req.query.nameContains as string | undefined,
        port: req.query.port as string | undefined,
        terminal: req.query.terminal as string | undefined,
        serviceType: req.query.serviceType as string | undefined,
        // Maersk Point-to-Point API parameters
        placeOfReceipt: req.query.placeOfReceipt as string | undefined,
        placeOfDelivery: req.query.placeOfDelivery as string | undefined,
        departureStartDate: req.query.departureStartDate as string | undefined,
        departureEndDate: req.query.departureEndDate as string | undefined,
        arrivalStartDate: req.query.arrivalStartDate as string | undefined,
        arrivalEndDate: req.query.arrivalEndDate as string | undefined,
        maxTranshipment: req.query.maxTranshipment ? parseInt(req.query.maxTranshipment as string, 10) : undefined,
        receiptTypeAtOrigin: req.query.receiptTypeAtOrigin as string | undefined,
        deliveryTypeAtDestination: req.query.deliveryTypeAtDestination as string | undefined,
        cargoType: req.query.cargoType as string | undefined,
        ISOEquipmentCode: req.query.ISOEquipmentCode as string | undefined,
        stuffingWeight: req.query.stuffingWeight ? parseInt(req.query.stuffingWeight as string, 10) : undefined,
        stuffingVolume: req.query.stuffingVolume ? parseInt(req.query.stuffingVolume as string, 10) : undefined,
        // Maersk Port Schedule API parameters
        date: req.query.date as string | undefined,
      };

      // Query all carriers in parallel
      const results = await Promise.allSettled(
        carrierCodes.map(async (carrierCode) => {
          const carrierStartTime = Date.now();
          try {
            const adapter = this.factory.getAdapter(carrierCode);
            Logger.debug(`Querying ${carrierCode} schedule API`, {
              carrier: carrierCode,
              params: queryParams,
            });
            const schedules = await adapter.getSchedule(queryParams);
            const duration = Date.now() - carrierStartTime;
            Logger.logCarrierCall(
              carrierCode,
              'schedule',
              'GET',
              true,
              duration
            );
            return {
              carrier: carrierCode,
              carrierName: adapter.getCarrierName(),
              success: true,
              schedules: schedules,
            };
          } catch (error: any) {
            const duration = Date.now() - carrierStartTime;
            Logger.logCarrierCall(
              carrierCode,
              'schedule',
              'GET',
              false,
              duration,
              error.message
            );
            Logger.error(`Failed to get schedule from ${carrierCode}`, {
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
      // Use 'any[]' to preserve additional fields from Proforma API
      const successfulResults: any[] = [];
      const errors: Array<{ carrier: string; error: string }> = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.success && data.schedules) {
            // Add carrier information to each schedule
            // Use spread operator to preserve all fields including additional Proforma API fields
            const schedulesWithCarrier = data.schedules.map((schedule: any) => ({
              ...schedule,
              carrier: data.carrier,
              carrierName: data.carrierName,
            }));
            successfulResults.push(...schedulesWithCarrier);
          } else {
            errors.push({
              carrier: data.carrier,
              error: data.error || 'No schedules returned',
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
      Logger.error('Schedule API error', {
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

